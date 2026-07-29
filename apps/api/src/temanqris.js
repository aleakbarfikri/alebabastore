import crypto from 'node:crypto';
import { decrypt, safeEqual } from './crypto.js';
import { getSettings } from './settings.js';

const BASE_URL = 'https://temanqris.com/api/qris';

export async function temanqris(path, options = {}) {
  const settings = await getSettings();
  const apiKey = decrypt(settings.temanqris_api_key);
  if (!apiKey) throw new Error('API key TemanQRIS belum diatur di dashboard admin.');
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    signal: AbortSignal.timeout(15_000),
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || data.error || `TemanQRIS gagal (${response.status}).`);
  }
  return data;
}

export async function verifyWebhook(rawBody, signature) {
  const settings = await getSettings();
  const secret = decrypt(settings.temanqris_webhook_secret);
  if (!secret) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(expected, signature);
}
