import { query } from './db.js';
import { decrypt, encrypt } from './crypto.js';

const SECRET_FIELDS = [
  'temanqris_api_key', 'temanqris_webhook_secret', 'pakasir_api_key',
  'resend_api_key', 'smtp_user', 'smtp_password',
];

export async function getSettings({ reveal = false } = {}) {
  const result = await query('SELECT * FROM app_settings WHERE id = 1');
  const settings = result.rows[0] || {};
  if (reveal) {
    for (const field of SECRET_FIELDS) settings[field] = decrypt(settings[field]);
  }
  return settings;
}

export function publicSettings(settings) {
  return {
    payment_provider: settings.payment_provider || 'temanqris',
    temanqris_api_key_configured: Boolean(settings.temanqris_api_key),
    temanqris_webhook_secret_configured: Boolean(settings.temanqris_webhook_secret),
    pakasir_project_slug: settings.pakasir_project_slug || '',
    pakasir_api_key_configured: Boolean(settings.pakasir_api_key),
    resend_api_key_configured: Boolean(settings.resend_api_key),
    email_from: settings.email_from || '',
    smtp_host: settings.smtp_host || '',
    smtp_port: settings.smtp_port || 587,
    smtp_secure: Boolean(settings.smtp_secure),
    smtp_user_configured: Boolean(settings.smtp_user),
    smtp_password_configured: Boolean(settings.smtp_password),
    smtp_from: settings.smtp_from || '',
  };
}

export async function updateSettings(input) {
  const current = await getSettings();
  const value = (field) => {
    if (SECRET_FIELDS.includes(field)) {
      if (input[field] === undefined || input[field] === '') return current[field];
      return encrypt(input[field]);
    }
    return input[field] === undefined ? current[field] : input[field];
  };
  const paymentProvider = ['temanqris', 'pakasir'].includes(value('payment_provider'))
    ? value('payment_provider')
    : 'temanqris';
  const pakasirProjectSlug = String(value('pakasir_project_slug') || '').trim().toLowerCase();
  const pakasirApiKey = value('pakasir_api_key');
  if (paymentProvider === 'pakasir' && (!pakasirProjectSlug || !pakasirApiKey)) {
    const error = new Error('Project slug dan API key Pakasir wajib diisi sebelum Pakasir diaktifkan.');
    error.status = 400;
    throw error;
  }
  await query(
    `UPDATE app_settings SET
       payment_provider=$1, temanqris_api_key=$2, temanqris_webhook_secret=$3,
       pakasir_project_slug=$4, pakasir_api_key=$5, resend_api_key=$6, email_from=$7,
       smtp_host=$8, smtp_port=$9, smtp_secure=$10, smtp_user=$11,
       smtp_password=$12, smtp_from=$13, updated_at=now()
    WHERE id=1`,
    [
      paymentProvider,
      value('temanqris_api_key'), value('temanqris_webhook_secret'),
      pakasirProjectSlug, pakasirApiKey,
      value('resend_api_key'), String(value('email_from') || '').trim(),
      value('smtp_host'), Number(value('smtp_port') || 587), Boolean(value('smtp_secure')),
      value('smtp_user'), value('smtp_password'), value('smtp_from'),
    ],
  );
  return publicSettings(await getSettings());
}
