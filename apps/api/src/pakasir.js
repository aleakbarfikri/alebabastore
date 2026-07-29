import { decrypt } from './crypto.js';
import { getSettings } from './settings.js';

const BASE_URL = 'https://app.pakasir.com';

async function config() {
  const settings = await getSettings();
  const project = String(settings.pakasir_project_slug || '').trim().toLowerCase();
  const apiKey = decrypt(settings.pakasir_api_key);
  if (!project || !apiKey) {
    throw new Error('Project slug dan API key Pakasir belum diatur di dashboard admin.');
  }
  return { project, apiKey };
}

export async function pakasirPaymentUrl({ orderId, amount, redirectUrl }) {
  const { project } = await config();
  const url = new URL(`/pay/${encodeURIComponent(project)}/${Number(amount)}`, BASE_URL);
  url.searchParams.set('order_id', orderId);
  url.searchParams.set('qris_only', '1');
  url.searchParams.set('redirect', redirectUrl);
  return { project, paymentUrl: url.toString() };
}

export async function pakasirTransactionDetail({ orderId, amount }) {
  const { project, apiKey } = await config();
  const url = new URL('/api/transactiondetail', BASE_URL);
  url.searchParams.set('project', project);
  url.searchParams.set('amount', String(Number(amount)));
  url.searchParams.set('order_id', orderId);
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.transaction) {
    throw new Error(data.message || data.error || `Pakasir gagal (${response.status}).`);
  }
  const transaction = data.transaction;
  if (
    transaction.order_id !== orderId
    || transaction.project !== project
    || Number(transaction.amount) !== Number(amount)
  ) {
    throw new Error('Detail transaksi Pakasir tidak cocok dengan order.');
  }
  return { data, transaction };
}
