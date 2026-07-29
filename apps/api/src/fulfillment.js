import nodemailer from 'nodemailer';
import { pool, query } from './db.js';
import { decrypt } from './crypto.js';
import { getSettings } from './settings.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

export async function fulfillOrder(orderId) {
  const client = await pool.connect();
  let order;
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT o.*, g.title, g.game_name, g.account_code, g.delivery_credentials
         FROM orders o JOIN game_accounts g ON g.id=o.game_account_id
        WHERE o.order_id=$1 FOR UPDATE OF o`,
      [orderId],
    );
    order = locked.rows[0];
    if (!order) throw new Error('Order tidak ditemukan.');
    if (order.fulfilled_at) {
      await client.query('COMMIT');
      return { alreadyFulfilled: true };
    }
    if (!order.delivery_credentials) throw new Error('Kredensial produk belum diisi oleh admin.');
    await client.query(
      `UPDATE orders SET status='paid', paid_at=COALESCE(paid_at, now()), updated_at=now() WHERE id=$1`,
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
    const settings = await getSettings({ reveal: true });
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password || !settings.smtp_from) {
      throw new Error('Konfigurasi SMTP belum lengkap.');
    }
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: Number(settings.smtp_port || 587),
      secure: Boolean(settings.smtp_secure),
      auth: { user: settings.smtp_user, pass: settings.smtp_password },
    });
    const codes = credentials.backup_codes.map((code) => `<li><code>${escapeHtml(code)}</code></li>`).join('');
    await transporter.sendMail({
      from: settings.smtp_from,
      to: order.buyer_email,
      subject: `Detail akun ${order.title || order.game_name} — ${order.account_code}`,
      text: [
        `Terima kasih, ${order.buyer_name}. Pembayaran Anda telah dikonfirmasi.`,
        `Produk: ${order.title || order.game_name}`,
        `Kode akun: ${order.account_code}`,
        `Email akun: ${credentials.email}`,
        `Password akun: ${credentials.password}`,
        '8 kode cadangan Gmail:',
        ...credentials.backup_codes.map((code, i) => `${i + 1}. ${code}`),
        'Segera login, ganti password, dan buat ulang kode cadangan demi keamanan.',
      ].join('\n'),
      html: `
        <h2>Pembayaran berhasil</h2>
        <p>Terima kasih, ${escapeHtml(order.buyer_name)}. Berikut detail produk Anda.</p>
        <p><strong>Produk:</strong> ${escapeHtml(order.title || order.game_name)}<br>
        <strong>Kode akun:</strong> ${escapeHtml(order.account_code)}<br>
        <strong>Email akun:</strong> ${escapeHtml(credentials.email)}<br>
        <strong>Password akun:</strong> ${escapeHtml(credentials.password)}</p>
        <p><strong>8 kode cadangan Gmail:</strong></p><ol>${codes}</ol>
        <p>Segera login, ganti password, dan buat ulang kode cadangan demi keamanan.</p>`,
    });
    await query(
      `UPDATE orders SET fulfilled_at=now(), delivery_error=NULL, updated_at=now() WHERE id=$1`,
      [order.id],
    );
    return { delivered: true };
  } catch (error) {
    await query(
      `UPDATE orders SET delivery_error=$2, updated_at=now() WHERE id=$1`,
      [order.id, String(error.message).slice(0, 1000)],
    );
    throw error;
  }
}
