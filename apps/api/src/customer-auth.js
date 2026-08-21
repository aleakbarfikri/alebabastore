import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { sha256 } from './crypto.js';

export const CUSTOMER_SESSION_COOKIE = 'alebaba_customer_session';
const SESSION_DAYS = 7;
const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5s5T0bOY.w8fb80yg8pG5wyJi6uYxkK';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };
}

export async function loginCustomer(email, password, res) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const result = await query(
    `SELECT m.id,m.address,m.password_hash,g.account_code,g.title,g.game_name
       FROM customer_mailboxes m
       LEFT JOIN game_accounts g ON g.mailbox_id=m.id
      WHERE lower(m.address)=$1
        AND m.disabled_at IS NULL
        AND m.password_hash IS NOT NULL
      LIMIT 1`,
    [normalizedEmail],
  );
  const mailbox = result.rows[0];
  const matches = await bcrypt.compare(String(password || ''), mailbox?.password_hash || DUMMY_PASSWORD_HASH);
  if (!mailbox || !matches) {
    const error = new Error('Email atau password salah.');
    error.status = 401;
    throw error;
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query('DELETE FROM customer_sessions WHERE expires_at <= now()');
  await query(
    'INSERT INTO customer_sessions(mailbox_id,token_hash,expires_at) VALUES($1,$2,$3)',
    [mailbox.id, sha256(token), expiresAt],
  );
  res.cookie(CUSTOMER_SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
  return customerView(mailbox);
}

function customerView(row) {
  return {
    id: row.id,
    email: row.address,
    role: 'customer',
    account_code: row.account_code,
    account_title: row.title || row.game_name,
  };
}

export async function currentCustomer(req) {
  const token = req.cookies?.[CUSTOMER_SESSION_COOKIE];
  if (!token) return null;
  const result = await query(
    `SELECT m.id,m.address,g.account_code,g.title,g.game_name
       FROM customer_sessions s
       JOIN customer_mailboxes m ON m.id=s.mailbox_id
       LEFT JOIN game_accounts g ON g.mailbox_id=m.id
      WHERE s.token_hash=$1 AND s.expires_at > now()
        AND m.disabled_at IS NULL AND m.password_hash IS NOT NULL`,
    [sha256(token)],
  );
  return result.rows[0] ? customerView(result.rows[0]) : null;
}

export async function requireCustomer(req, res, next) {
  try {
    const customer = await currentCustomer(req);
    if (!customer) return res.status(401).json({ error: 'Sesi customer tidak valid atau sudah berakhir.' });
    req.customer = customer;
    next();
  } catch (error) {
    next(error);
  }
}

export async function revokeCustomerSession(req, res) {
  const token = req.cookies?.[CUSTOMER_SESSION_COOKIE];
  if (token) await query('DELETE FROM customer_sessions WHERE token_hash=$1', [sha256(token)]);
  res.clearCookie(CUSTOMER_SESSION_COOKIE, cookieOptions());
}
