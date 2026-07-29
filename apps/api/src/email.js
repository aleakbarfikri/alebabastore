import { getSettings } from './settings.js';

export async function sendEmail({ to, subject, text, html, idempotencyKey }) {
  const settings = await getSettings({ reveal: true });
  if (!settings.resend_api_key || !settings.email_from) {
    const error = new Error('Konfigurasi Resend belum lengkap.');
    error.status = 503;
    throw error;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${settings.resend_api_key}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AlebabaStore/1.0',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ from: settings.email_from, to, subject, text, html }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || `Resend gagal (${response.status}).`);
  }
  return response.json().catch(() => ({}));
}
