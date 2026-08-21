import { Webhook } from 'svix';
import { decrypt, encrypt } from './crypto.js';
import { query } from './db.js';
import { getSettings } from './settings.js';
import { cleanupExpiredMail } from './mailboxes.js';

function extractAddress(value) {
  const match = String(value || '').toLowerCase().match(/<([^<>]+@[^<>]+)>/);
  return (match?.[1] || String(value || '')).trim().toLowerCase();
}

function addressList(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function plainTextFrom(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function retrieveReceivedEmail(emailId) {
  const settings = await getSettings({ reveal: true });
  if (!settings.resend_api_key) throw new Error('API key Resend belum dikonfigurasi.');
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${settings.resend_api_key}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Gagal mengambil email masuk dari Resend (${response.status}).`);
  return data;
}

export async function handleResendInbound(rawBody, headers) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    const error = new Error('RESEND_WEBHOOK_SECRET belum dikonfigurasi.');
    error.status = 503;
    throw error;
  }
  let event;
  try {
    event = new Webhook(secret).verify(rawBody.toString('utf8'), {
      'svix-id': headers.id,
      'svix-timestamp': headers.timestamp,
      'svix-signature': headers.signature,
    });
  } catch {
    const error = new Error('Signature webhook Resend tidak valid.');
    error.status = 401;
    throw error;
  }
  if (event.type !== 'email.received') return { ignored: true };
  if (!event.data?.email_id) {
    const error = new Error('Webhook Resend tidak memiliki email_id.');
    error.status = 400;
    throw error;
  }

  const webhookId = String(headers.id || '');
  const reserved = await query(
    `INSERT INTO processed_email_webhooks(webhook_id) VALUES($1)
     ON CONFLICT DO NOTHING RETURNING webhook_id`,
    [webhookId],
  );
  if (!reserved.rowCount) return { duplicate: true };

  try {
    const email = await retrieveReceivedEmail(event.data?.email_id);
    const recipients = [
      ...addressList(email.to), ...addressList(email.cc), ...addressList(email.bcc),
    ].map(extractAddress);
    const mailboxResult = await query(
      `SELECT m.id,m.address FROM customer_mailboxes m
        WHERE lower(m.address)=ANY($1::text[])
          AND m.password_hash IS NOT NULL
          AND m.disabled_at IS NULL
        LIMIT 1`,
      [recipients],
    );
    const mailbox = mailboxResult.rows[0];
    if (!mailbox) return { ignored: true };

    const body = String(email.text || plainTextFrom(email.html) || '(Email tidak memiliki isi teks)').slice(0, 200_000);
    await cleanupExpiredMail();
    await query(
      `INSERT INTO inbound_email_messages(
         mailbox_id,resend_email_id,webhook_id,sender_encrypted,subject_encrypted,
         body_encrypted,received_at,expires_at
       ) VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($7::timestamptz,now())+interval '60 days')
       ON CONFLICT (resend_email_id) DO NOTHING`,
      [
        mailbox.id,
        email.id,
        webhookId,
        encrypt(String(email.from || 'Pengirim tidak diketahui').slice(0, 500)),
        encrypt(String(email.subject || '(Tanpa subjek)').slice(0, 1000)),
        encrypt(body),
        email.created_at || new Date().toISOString(),
      ],
    );
    return { received: true };
  } catch (error) {
    await query('DELETE FROM processed_email_webhooks WHERE webhook_id=$1', [webhookId]);
    throw error;
  }
}

export async function customerInbox(mailboxId) {
  await cleanupExpiredMail();
  const result = await query(
    `SELECT id,sender_encrypted,subject_encrypted,body_encrypted,received_at,expires_at
       FROM inbound_email_messages
      WHERE mailbox_id=$1 AND expires_at > now()
      ORDER BY received_at DESC
      LIMIT 200`,
    [mailboxId],
  );
  return result.rows.map((message) => ({
    id: message.id,
    sender: decrypt(message.sender_encrypted),
    subject: decrypt(message.subject_encrypted),
    body: decrypt(message.body_encrypted),
    received_at: message.received_at,
    expires_at: message.expires_at,
  }));
}
