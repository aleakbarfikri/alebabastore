import bcrypt from 'bcryptjs';
import { decrypt, encrypt } from './crypto.js';
import { pool, query } from './db.js';
import { sendEmail } from './email.js';
import { generateCustomerPassword, randomMailboxLocalPart } from './mailbox-utils.js';

const DEFAULT_CODE_LENGTH = 6;
const MAILBOX_PASSWORD_HASH_ROUNDS = 10;

export function inboundEmailDomain() {
  return String(process.env.INBOUND_EMAIL_DOMAIN || '').trim().toLowerCase().replace(/^@/, '');
}

export async function createMailboxBatch({ count, codeLength }) {
  const domain = inboundEmailDomain();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    const error = new Error('INBOUND_EMAIL_DOMAIN belum dikonfigurasi dengan domain yang valid.');
    error.status = 503;
    throw error;
  }
  const requestedCount = Number(count);
  const requestedLength = Number(codeLength || DEFAULT_CODE_LENGTH);
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 100) {
    const error = new Error('Jumlah mailbox harus antara 1 sampai 100.');
    error.status = 400;
    throw error;
  }
  if (!Number.isInteger(requestedLength) || requestedLength < 4 || requestedLength > 6) {
    const error = new Error('Panjang kode email harus 4 sampai 6 karakter.');
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  const created = [];
  try {
    await client.query('BEGIN');
    for (let index = 0; index < requestedCount; index += 1) {
      let inserted;
      for (let attempt = 0; attempt < 20 && !inserted; attempt += 1) {
        const localPart = randomMailboxLocalPart(requestedLength);
        const address = `${localPart}@${domain}`;
        const password = generateCustomerPassword();
        const passwordHash = await bcrypt.hash(password, MAILBOX_PASSWORD_HASH_ROUNDS);
        const result = await client.query(
          `INSERT INTO customer_mailboxes(local_part,domain,address,password_hash,pending_password)
           VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING
           RETURNING id,address,local_part,domain,created_at`,
          [localPart, domain, address, passwordHash, encrypt(password)],
        );
        inserted = result.rows[0] ? { ...result.rows[0], password } : undefined;
      }
      if (!inserted) throw new Error('Gagal membuat alamat unik. Silakan coba kembali.');
      created.push(inserted);
    }
    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listMailboxes() {
  const result = await query(
    `SELECT m.id,m.address,m.local_part,m.domain,m.buyer_email,m.activated_at,m.disabled_at,
            (m.password_hash IS NOT NULL) password_configured,
            m.created_at,g.id game_account_id,g.account_code,g.title,g.game_name,g.sold,
            COUNT(i.id)::int message_count
       FROM customer_mailboxes m
       LEFT JOIN game_accounts g ON g.mailbox_id=m.id
       LEFT JOIN inbound_email_messages i ON i.mailbox_id=m.id AND i.expires_at > now()
      GROUP BY m.id,g.id
      ORDER BY m.created_at DESC
      LIMIT 500`,
  );
  return result.rows.map((row) => ({
    ...row,
    status: row.disabled_at ? 'disabled' : row.activated_at ? 'active' : row.game_account_id ? 'assigned' : 'available',
  }));
}

export async function generateMailboxPasswordForAdmin(mailboxId) {
  const mailboxResult = await query(
    `SELECT m.id,m.address,m.activated_at,m.disabled_at,g.sold
       FROM customer_mailboxes m
       LEFT JOIN game_accounts g ON g.mailbox_id=m.id
      WHERE m.id=$1`,
    [mailboxId],
  );
  const mailbox = mailboxResult.rows[0];
  if (!mailbox) {
    const error = new Error('Mailbox tidak ditemukan.');
    error.status = 404;
    throw error;
  }
  if (mailbox.activated_at || mailbox.disabled_at || mailbox.sold) {
    const error = new Error('Password mailbox customer aktif harus direset dan dikirim ke email pribadinya.');
    error.status = 409;
    throw error;
  }

  const password = generateCustomerPassword();
  const passwordHash = await bcrypt.hash(password, MAILBOX_PASSWORD_HASH_ROUNDS);
  await query('DELETE FROM customer_sessions WHERE mailbox_id=$1', [mailbox.id]);
  await query(
    `UPDATE customer_mailboxes
        SET password_hash=$2,pending_password=$3,updated_at=now()
      WHERE id=$1`,
    [mailbox.id, passwordHash, encrypt(password)],
  );
  return { id: mailbox.id, address: mailbox.address, password };
}

export async function prepareMailboxDelivery(mailboxId, buyerEmail, { reset = false } = {}) {
  if (!mailboxId) return null;
  const result = await query('SELECT * FROM customer_mailboxes WHERE id=$1', [mailboxId]);
  const mailbox = result.rows[0];
  if (!mailbox) return null;

  let password = mailbox.pending_password ? decrypt(mailbox.pending_password) : '';
  if (!password && reset) {
    password = generateCustomerPassword();
    const passwordHash = await bcrypt.hash(password, 12);
    await query('DELETE FROM customer_sessions WHERE mailbox_id=$1', [mailbox.id]);
    await query(
      `UPDATE customer_mailboxes
          SET password_hash=$2,pending_password=$3,buyer_email=$4,
              activated_at=now(),disabled_at=NULL,updated_at=now()
        WHERE id=$1`,
      [mailbox.id, passwordHash, encrypt(password), String(buyerEmail).trim().toLowerCase()],
    );
  } else if (!password) {
    const error = new Error('Password inbox belum disiapkan. Buat password dari dashboard admin sebelum menjual akun.');
    error.status = 409;
    throw error;
  } else {
    await query(
      `UPDATE customer_mailboxes
          SET buyer_email=$2,activated_at=COALESCE(activated_at,now()),
              disabled_at=NULL,updated_at=now()
        WHERE id=$1`,
      [mailbox.id, String(buyerEmail).trim().toLowerCase()],
    );
  }
  return { id: mailbox.id, address: mailbox.address, password };
}

export async function markMailboxPasswordDelivered(mailboxId) {
  if (mailboxId) {
    await query('UPDATE customer_mailboxes SET pending_password=NULL,updated_at=now() WHERE id=$1', [mailboxId]);
  }
}

export async function resetMailboxPassword(mailboxId, publicBaseUrl) {
  const mailboxResult = await query(
    `SELECT m.id,m.address,m.buyer_email,m.password_hash,m.pending_password,
            g.account_code,g.title,g.game_name
       FROM customer_mailboxes m JOIN game_accounts g ON g.mailbox_id=m.id
      WHERE m.id=$1 AND m.activated_at IS NOT NULL AND m.disabled_at IS NULL`,
    [mailboxId],
  );
  const mailbox = mailboxResult.rows[0];
  if (!mailbox?.buyer_email) {
    const error = new Error('Mailbox belum aktif atau belum memiliki email pribadi customer.');
    error.status = 409;
    throw error;
  }
  const credentials = await prepareMailboxDelivery(mailbox.id, mailbox.buyer_email, { reset: true });
  try {
    await sendEmail({
      to: mailbox.buyer_email,
      subject: `Password inbox baru — ${mailbox.account_code}`,
      text: `Password inbox AlebabaStore Anda telah direset.\n\nEmail: ${mailbox.address}\nPassword: ${credentials.password}\nLogin: ${publicBaseUrl}/login\n\nJangan berikan kredensial ini kepada siapa pun.`,
      html: `<h2>Password inbox baru</h2><p>Email: <strong>${mailbox.address}</strong><br>Password: <strong>${credentials.password}</strong></p><p><a href="${publicBaseUrl}/login">Login ke AlebabaStore</a></p><p>Jangan berikan kredensial ini kepada siapa pun.</p>`,
      idempotencyKey: `mailbox-reset-${mailbox.id}-${Date.now()}`,
    });
  } catch (error) {
    await query(
      `UPDATE customer_mailboxes SET password_hash=$2,pending_password=$3,updated_at=now() WHERE id=$1`,
      [mailbox.id, mailbox.password_hash, mailbox.pending_password],
    );
    throw error;
  }
  await markMailboxPasswordDelivered(mailbox.id);
  return { ok: true };
}

export async function setMailboxDisabled(mailboxId, disabled) {
  const result = await query(
    `UPDATE customer_mailboxes
        SET disabled_at=CASE WHEN $2 THEN now() ELSE NULL END,updated_at=now()
      WHERE id=$1 RETURNING id,address,disabled_at`,
    [mailboxId, Boolean(disabled)],
  );
  if (!result.rowCount) {
    const error = new Error('Mailbox tidak ditemukan.');
    error.status = 404;
    throw error;
  }
  if (disabled) await query('DELETE FROM customer_sessions WHERE mailbox_id=$1', [mailboxId]);
  return result.rows[0];
}

export async function cleanupExpiredMail() {
  const deleted = await query('DELETE FROM inbound_email_messages WHERE expires_at <= now() RETURNING id');
  await query("DELETE FROM processed_email_webhooks WHERE created_at <= now() - interval '60 days'");
  await query('DELETE FROM customer_sessions WHERE expires_at <= now()');
  return deleted.rowCount;
}
