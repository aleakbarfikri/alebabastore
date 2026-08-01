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

export async function pakasirCreateTransaction({ orderId, amount }) {
  const { project, apiKey } = await config();
  const response = await fetch(new URL('/api/transactioncreate/qris', BASE_URL), {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project,
      order_id: orderId,
      amount: Number(amount),
      api_key: apiKey,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.payment) {
    const error = new Error(data.message || data.error || `Pembuatan transaksi Pakasir gagal (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  const payment = data.payment;
  if (
    payment.order_id !== orderId
    || payment.project !== project
    || Number(payment.amount) !== Number(amount)
    || String(payment.payment_method || '').toLowerCase() !== 'qris'
    || !payment.payment_number
    || !payment.expired_at
  ) {
    throw new Error('Detail QRIS dari Pakasir tidak valid atau tidak cocok dengan order.');
  }
  const expiresAt = new Date(payment.expired_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new Error('Waktu kedaluwarsa QRIS dari Pakasir tidak valid.');
  }
  return { data, payment };
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
    const error = new Error(data.message || data.error || `Pakasir gagal (${response.status}).`);
    error.status = response.status;
    throw error;
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

export async function pakasirCancelTransaction({ orderId, amount }) {
  const { project, apiKey } = await config();
  const response = await fetch(new URL('/api/transactioncancel', BASE_URL), {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project,
      order_id: orderId,
      amount: Number(amount),
      api_key: apiKey,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Pembatalan Pakasir gagal (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  const returnedOrderId = data.transaction?.order_id || data.payment?.order_id || data.order_id;
  const returnedProject = data.transaction?.project || data.payment?.project || data.project;
  if ((returnedOrderId && returnedOrderId !== orderId) || (returnedProject && returnedProject !== project)) {
    throw new Error('Respons pembatalan Pakasir tidak cocok dengan order.');
  }
  return data;
}
