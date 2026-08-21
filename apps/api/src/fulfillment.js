import { pool, query } from './db.js';
import { decrypt } from './crypto.js';
import { sendEmail } from './email.js';
import { markMailboxPasswordDelivered, prepareMailboxDelivery } from './mailboxes.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

export async function fulfillOrder(orderId, { forceResend = false } = {}) {
  const client = await pool.connect();
  let order;
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT o.*, g.title, g.game_name, g.account_code, g.delivery_credentials, g.mailbox_id
         FROM orders o JOIN game_accounts g ON g.id=o.game_account_id
        WHERE o.order_id=$1 FOR UPDATE OF o,g`,
      [orderId],
    );
    order = locked.rows[0];
    if (!order) throw new Error('Order tidak ditemukan.');
    if (order.status !== 'paid') {
      const error = new Error('Kredensial hanya dapat dikirim setelah pembayaran berstatus paid.');
      error.status = 409;
      throw error;
    }
    if (order.fulfilled_at) {
      await client.query('COMMIT');
      return { alreadyFulfilled: true };
    }
    const fulfillmentInProgress = order.fulfillment_started_at
      && Date.now() - new Date(order.fulfillment_started_at).getTime() < 10 * 60_000;
    if (fulfillmentInProgress) {
      await client.query('COMMIT');
      return { alreadyProcessing: true };
    }
    const otherDelivery = await client.query(
      `SELECT order_id FROM orders
        WHERE game_account_id=$1 AND id<>$2
          AND (fulfilled_at IS NOT NULL OR fulfillment_started_at IS NOT NULL)
        LIMIT 1`,
      [order.game_account_id, order.id],
    );
    if (otherDelivery.rowCount) {
      const error = new Error(
        `Pengiriman diblokir: akun telah dialokasikan ke order ${otherDelivery.rows[0].order_id}.`,
      );
      error.status = 409;
      throw error;
    }
    if (!order.delivery_credentials) throw new Error('Kredensial produk belum diisi oleh admin.');
    await client.query(
      'UPDATE orders SET fulfillment_started_at=now(),updated_at=now() WHERE id=$1',
      [order.id],
    );
    await client.query('UPDATE game_accounts SET sold=true, updated_at=now() WHERE id=$1', [order.game_account_id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  try {
    const credentials = JSON.parse(decrypt(order.delivery_credentials));
    const mailbox = await prepareMailboxDelivery(order.mailbox_id, order.buyer_email, { reset: forceResend });
    const baseUrl = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const loginUrl = `${baseUrl}/login`;
    const backupCodes = Array.isArray(credentials.backup_codes) ? credentials.backup_codes : [];
    const codes = backupCodes.map((code) => `<li><code>${escapeHtml(code)}</code></li>`).join('');
    await sendEmail({
      to: order.buyer_email,
      subject: `Detail akun ${order.title || order.game_name} — ${order.account_code}`,
      text: [
        `Terima kasih, ${order.buyer_name}. Pembayaran Anda telah dikonfirmasi.`,
        `Produk: ${order.title || order.game_name}`,
        `Kode akun: ${order.account_code}`,
        `Email akun: ${credentials.email}`,
        `Password akun: ${credentials.password}`,
        ...(mailbox ? [
          '',
          'AKSES INBOX OTP ALEBABASTORE',
          `Email inbox: ${mailbox.address}`,
          `Password inbox: ${mailbox.password}`,
          `Login inbox: ${loginUrl}`,
        ] : []),
        ...(backupCodes.length ? [
          'Kode pemulihan akun:',
          ...backupCodes.map((code, i) => `${i + 1}. ${code}`),
        ] : []),
        'Simpan detail akun ini di tempat yang aman.',
      ].join('\n'),
      html: `
        <h2>Pembayaran berhasil</h2>
        <p>Terima kasih, ${escapeHtml(order.buyer_name)}. Berikut detail produk Anda.</p>
        <p><strong>Produk:</strong> ${escapeHtml(order.title || order.game_name)}<br>
        <strong>Kode akun:</strong> ${escapeHtml(order.account_code)}<br>
        <strong>Email akun:</strong> ${escapeHtml(credentials.email)}<br>
        <strong>Password akun:</strong> ${escapeHtml(credentials.password)}</p>
        ${mailbox ? `<h3>Akses inbox OTP AlebabaStore</h3>
        <p><strong>Email inbox:</strong> ${escapeHtml(mailbox.address)}<br>
        <strong>Password inbox:</strong> ${escapeHtml(mailbox.password)}<br>
        <strong>Login:</strong> <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>
        <p>Password inbox hanya dapat direset oleh admin AlebabaStore.</p>` : ''}
        ${backupCodes.length ? `<p><strong>Kode pemulihan akun:</strong></p><ol>${codes}</ol>` : ''}
        <p>Simpan detail akun ini di tempat yang aman.</p>`,
      idempotencyKey: forceResend
        ? `alebabastore-${orderId}-resend-${Date.now()}`
        : `alebabastore-${orderId}`,
    });
    await query(
      `UPDATE orders SET fulfilled_at=now(),fulfillment_started_at=NULL,
       delivery_error=NULL,updated_at=now() WHERE id=$1`,
      [order.id],
    );
    await markMailboxPasswordDelivered(mailbox?.id);
    return { delivered: true, provider: 'resend' };
  } catch (error) {
    await query(
      `UPDATE orders SET fulfillment_started_at=NULL,delivery_error=$2,updated_at=now() WHERE id=$1`,
      [order.id, String(error.message).slice(0, 1000)],
    );
    throw error;
  }
}
