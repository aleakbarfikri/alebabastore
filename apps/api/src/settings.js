import { query } from './db.js';
import { decrypt, encrypt } from './crypto.js';

const SECRET_FIELDS = ['temanqris_api_key', 'temanqris_webhook_secret', 'smtp_user', 'smtp_password'];

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
    temanqris_api_key_configured: Boolean(settings.temanqris_api_key),
    temanqris_webhook_secret_configured: Boolean(settings.temanqris_webhook_secret),
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
  await query(
    `UPDATE app_settings SET
       temanqris_api_key=$1, temanqris_webhook_secret=$2, smtp_host=$3, smtp_port=$4,
       smtp_secure=$5, smtp_user=$6, smtp_password=$7, smtp_from=$8, updated_at=now()
     WHERE id=1`,
    [
      value('temanqris_api_key'), value('temanqris_webhook_secret'), value('smtp_host'),
      Number(value('smtp_port') || 587), Boolean(value('smtp_secure')), value('smtp_user'),
      value('smtp_password'), value('smtp_from'),
    ],
  );
  return publicSettings(await getSettings());
}
