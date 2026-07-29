import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { sha256 } from './crypto.js';

export const SESSION_COOKIE = 'alebaba_admin_session';
const SESSION_DAYS = 7;

export async function bootstrapAdmin() {
  const username = process.env.ADMIN_USERNAME || 'alebabastore';
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const existing = await query('SELECT id FROM admins WHERE username = $1', [username]);
  if (existing.rowCount) return;
  if (!password || password.length < 8) {
    throw new Error('ADMIN_INITIAL_PASSWORD minimal 8 karakter diperlukan untuk membuat admin pertama.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, passwordHash]);
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
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
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
}
