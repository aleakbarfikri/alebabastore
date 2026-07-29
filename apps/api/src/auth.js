import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { decrypt, encrypt, sha256 } from './crypto.js';
import { generateTotpSecret, totpUri, verifyTotp } from './totp.js';

export const SESSION_COOKIE = 'alebaba_admin_session';
export const TWO_FACTOR_COOKIE = 'alebaba_admin_2fa';
const SESSION_DAYS = 7;
const TWO_FACTOR_CHALLENGE_MINUTES = 5;

function secureCookieOptions(path = '/') {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path,
  };
}

export async function bootstrapAdmin() {
  const username = process.env.ADMIN_USERNAME || 'alebabastore';
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const resetVersion = String(process.env.ADMIN_PASSWORD_RESET_VERSION || '').trim();
  const existing = await query(
    'SELECT id,password_reset_version,totp_secret FROM admins WHERE lower(username)=lower($1)',
    [username],
  );

  if (existing.rowCount) {
    const admin = existing.rows[0];
    if (!admin.totp_secret) {
      await query('DELETE FROM admin_sessions WHERE admin_id=$1', [admin.id]);
    }
    if (!resetVersion || admin.password_reset_version === resetVersion) return;
    if (!password || password.length < 8) {
      throw new Error('ADMIN_INITIAL_PASSWORD minimal 8 karakter diperlukan untuk reset admin.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE admins
          SET username=$2, password_hash=$3, password_reset_version=$4,
              totp_secret=NULL, totp_enabled_at=NULL, updated_at=now()
        WHERE id=$1`,
      [admin.id, username, passwordHash, resetVersion],
    );
    await query('DELETE FROM admin_sessions WHERE admin_id=$1', [admin.id]);
    console.info(`[bootstrap] Password admin "${username}" berhasil direset untuk versi ${resetVersion}.`);
    return;
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_INITIAL_PASSWORD minimal 8 karakter diperlukan untuk membuat admin pertama.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    'INSERT INTO admins (username, password_hash, password_reset_version) VALUES ($1, $2, $3)',
    [username, passwordHash, resetVersion || null],
  );
  console.info(`[bootstrap] Admin "${username}" berhasil dibuat dari environment variable.`);
}

export async function createSession(adminId, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query(
    'INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [adminId, sha256(token), expiresAt],
  );
  res.cookie(SESSION_COOKIE, token, {
    ...secureCookieOptions(),
    expires: expiresAt,
  });
}

export function beginTwoFactorChallenge(admin, res) {
  const setupSecret = admin.totp_secret ? null : generateTotpSecret();
  const expiresAt = Date.now() + TWO_FACTOR_CHALLENGE_MINUTES * 60_000;
  const challenge = encrypt(JSON.stringify({
    admin_id: admin.id,
    expires_at: expiresAt,
    setup_secret: setupSecret,
  }));
  res.cookie(TWO_FACTOR_COOKIE, challenge, {
    ...secureCookieOptions('/api/auth'),
    maxAge: TWO_FACTOR_CHALLENGE_MINUTES * 60_000,
  });
  return {
    requires_two_factor: true,
    setup_required: Boolean(setupSecret),
    setup_secret: setupSecret || undefined,
    otpauth_uri: setupSecret ? totpUri({ secret: setupSecret, username: admin.username }) : undefined,
  };
}

export async function completeTwoFactorChallenge(req, res, code) {
  const token = req.cookies?.[TWO_FACTOR_COOKIE];
  let challenge;
  try {
    challenge = JSON.parse(decrypt(token));
  } catch {
    const error = new Error('Sesi verifikasi 2FA tidak valid atau sudah berakhir.');
    error.status = 401;
    throw error;
  }
  if (!challenge.admin_id || Number(challenge.expires_at) < Date.now()) {
    const error = new Error('Sesi verifikasi 2FA sudah berakhir. Silakan login kembali.');
    error.status = 401;
    throw error;
  }
  const result = await query(
    'SELECT id,username,role,totp_secret FROM admins WHERE id=$1',
    [challenge.admin_id],
  );
  const admin = result.rows[0];
  if (!admin) {
    const error = new Error('Admin tidak ditemukan.');
    error.status = 401;
    throw error;
  }
  const secret = challenge.setup_secret || decrypt(admin.totp_secret);
  if (!secret || !verifyTotp(secret, code)) {
    const error = new Error('Kode autentikasi tidak valid.');
    error.status = 401;
    throw error;
  }
  if (challenge.setup_secret) {
    await query(
      'UPDATE admins SET totp_secret=$2,totp_enabled_at=now(),updated_at=now() WHERE id=$1',
      [admin.id, encrypt(challenge.setup_secret)],
    );
  }
  res.clearCookie(TWO_FACTOR_COOKIE, secureCookieOptions('/api/auth'));
  await createSession(admin.id, res);
  return { id: admin.id, username: admin.username, role: admin.role };
}

export async function currentAdmin(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const result = await query(
    `SELECT a.id, a.username, a.role
       FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return result.rows[0] || null;
}

export async function requireAdmin(req, res, next) {
  try {
    const admin = await currentAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Sesi admin tidak valid atau sudah berakhir.' });
    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}

export async function revokeSession(req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await query('DELETE FROM admin_sessions WHERE token_hash = $1', [sha256(token)]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(TWO_FACTOR_COOKIE, secureCookieOptions('/api/auth'));
}
