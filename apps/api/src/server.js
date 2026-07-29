import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import bcrypt from 'bcryptjs';
import { initDatabase, pool, query } from './db.js';
import {
  SESSION_COOKIE, beginTwoFactorChallenge, bootstrapAdmin, completeTwoFactorChallenge,
  currentAdmin, regenerateRecoveryCodes, requireAdmin, revokeSession,
} from './auth.js';
import { decrypt, encrypt, sha256 } from './crypto.js';
import { sendEmail } from './email.js';
import { getSettings, publicSettings, updateSettings } from './settings.js';
import { fulfillOrder } from './fulfillment.js';
import { pakasirPaymentUrl, pakasirTransactionDetail } from './pakasir.js';
import { temanqris, verifyWebhook } from './temanqris.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|heic|heif)$/i.test(file.mimetype)),
});
const port = Number(process.env.PORT || 8080);
const vercelHostname = process.env.VERCEL_ENV === 'production'
  ? (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL)
  : process.env.VERCEL_URL;
const vercelUrl = vercelHostname ? `https://${vercelHostname}` : '';
const configuredBaseUrl = process.env.VERCEL_ENV === 'preview' ? '' : process.env.PUBLIC_BASE_URL;
const publicBaseUrl = String(configuredBaseUrl || vercelUrl || `http://localhost:${port}`).replace(/\/$/, '');
const PROVIDER_STATUSES = new Set(['pending', 'awaiting_confirmation', 'paid', 'expired', 'cancelled']);

async function syncOrderFromProvider(orderId, { force = false } = {}) {
  const localResult = await query(
    `SELECT order_id,status,payment_provider,amount,provider_checked_at,fulfilled_at
       FROM orders WHERE order_id=$1`,
    [orderId],
  );
  const localOrder = localResult.rows[0];
  if (!localOrder) {
    const error = new Error('Order tidak ditemukan.');
    error.status = 404;
    throw error;
  }
  if (localOrder.payment_provider === 'pakasir') {
    const checkedRecently = localOrder.provider_checked_at
      && Date.now() - new Date(localOrder.provider_checked_at).getTime() < 15 * 60_000;
    if (!force && (checkedRecently || localOrder.status !== 'pending')) {
      if (localOrder.status === 'paid' && !localOrder.fulfilled_at) {
        fulfillOrder(orderId).catch((error) => console.error('[fulfillment]', orderId, error.message));
      }
      return localOrder;
    }
    const { data, transaction } = await pakasirTransactionDetail({
      orderId,
      amount: localOrder.amount,
    });
    const pakasirStatus = String(transaction.status || '').toLowerCase();
    const nextStatus = pakasirStatus === 'completed'
      ? 'paid'
      : ['expired', 'cancelled'].includes(pakasirStatus)
        ? pakasirStatus
        : localOrder.status;
    const updated = await query(
      `UPDATE orders SET
         status=CASE WHEN status='paid' THEN status ELSE $2 END,
         paid_at=CASE WHEN $2='paid' THEN COALESCE(paid_at,$3::timestamptz,now()) ELSE paid_at END,
         provider_payload=$4,provider_checked_at=now(),updated_at=now()
       WHERE order_id=$1
       RETURNING order_id,status,paid_at,fulfilled_at,created_at,provider_checked_at`,
      [orderId, nextStatus, transaction.completed_at || null, data],
    );
    if (updated.rows[0]?.status === 'paid' && !updated.rows[0]?.fulfilled_at) {
      fulfillOrder(orderId).catch((error) => console.error('[fulfillment]', orderId, error.message));
    }
    return updated.rows[0];
  }

  const checkedRecently = localOrder.provider_checked_at
    && Date.now() - new Date(localOrder.provider_checked_at).getTime() < 15 * 60_000;
  if (!force && (checkedRecently || localOrder.status !== 'pending')) {
    if (localOrder.status === 'paid' && !localOrder.fulfilled_at) {
      fulfillOrder(orderId).catch((error) => console.error('[fulfillment]', orderId, error.message));
    }
    return localOrder;
  }

  const result = await temanqris(`/orders/${encodeURIComponent(orderId)}`);
  const providerOrder = result.order || result.data || result;
  const providerStatus = String(providerOrder.status || '').toLowerCase();
  const nextStatus = PROVIDER_STATUSES.has(providerStatus) ? providerStatus : localOrder.status;
  const updated = await query(
    `UPDATE orders
        SET status=CASE WHEN status='paid' THEN status ELSE $2 END,
            paid_at=CASE
              WHEN status='paid' THEN paid_at
              WHEN $2='paid' THEN COALESCE($3::timestamptz, now())
              ELSE paid_at
            END,
            provider_payload=$4,
            provider_checked_at=now(),
            updated_at=now()
      WHERE order_id=$1
      RETURNING order_id,status,paid_at,fulfilled_at,created_at,provider_checked_at`,
    [orderId, nextStatus, providerOrder.paid_at || null, result],
  );

  if (updated.rows[0]?.status === 'paid' && !updated.rows[0]?.fulfilled_at) {
    fulfillOrder(orderId).catch((error) => console.error('[fulfillment]', orderId, error.message));
  }
  return updated.rows[0];
}

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: [
        "'self'", 'data:', 'blob:',
        'https://horizons-cdn.hostinger.com',
        'https://images.unsplash.com',
      ],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cookieParser());

// Raw body is mandatory for HMAC verification and must be registered before express.json().
app.post('/api/webhooks/temanqris', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res, next) => {
  try {
    if (!(await verifyWebhook(req.body, req.get('X-TemanQRIS-Signature')))) {
      return res.status(401).json({ error: 'Signature webhook tidak valid.' });
    }
    const payload = JSON.parse(req.body.toString('utf8'));
    const orderId = payload?.data?.order_id || payload?.order_id;
    if (!orderId) return res.status(400).json({ error: 'order_id tidak tersedia.' });

    if (payload.event === 'payment.awaiting_confirmation') {
      await query(
        `UPDATE orders SET status='awaiting_confirmation', provider_payload=$2, updated_at=now()
          WHERE order_id=$1 AND status <> 'paid'`,
        [orderId, payload],
      );
    } else if (payload.event === 'payment.confirmed') {
      await query(
        `UPDATE orders SET status='paid', paid_at=COALESCE(paid_at, now()), provider_payload=$2, updated_at=now()
          WHERE order_id=$1`,
        [orderId, payload],
      );
      // Acknowledge quickly; fulfillment is idempotent and records any delivery error.
      res.json({ received: true });
      fulfillOrder(orderId).catch((error) => console.error('[fulfillment]', orderId, error.message));
      return;
    }
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.post('/api/webhooks/pakasir', async (req, res, next) => {
  try {
    const orderId = String(req.body?.order_id || '');
    if (!orderId) return res.status(400).json({ error: 'order_id tidak tersedia.' });
    const result = await query(
      `SELECT order_id,amount,status,payment_provider,fulfilled_at FROM orders WHERE order_id=$1`,
      [orderId],
    );
    const order = result.rows[0];
    if (!order || order.payment_provider !== 'pakasir') {
      return res.status(404).json({ error: 'Order Pakasir tidak ditemukan.' });
    }
    if (order.status === 'paid') {
      res.json({ success: true });
      if (!order.fulfilled_at) {
        fulfillOrder(orderId).catch((error) => console.error('[fulfillment]', orderId, error.message));
      }
      return;
    }

    const { data, transaction } = await pakasirTransactionDetail({
      orderId,
      amount: order.amount,
    });
    const pakasirStatus = String(transaction.status || '').toLowerCase();
    const paymentMethod = String(transaction.payment_method || '').toLowerCase();
    if (pakasirStatus !== 'completed' || paymentMethod !== 'qris') {
      return res.status(202).json({ success: true, status: pakasirStatus });
    }
    await query(
      `UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,$2::timestamptz,now()),
       provider_payload=$3,provider_checked_at=now(),updated_at=now() WHERE order_id=$1`,
      [orderId, transaction.completed_at || null, data],
    );
    res.json({ success: true });
    fulfillOrder(orderId).catch((error) => console.error('[fulfillment]', orderId, error.message));
  } catch (error) {
    next(error);
  }
});

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('Origin');
  const allowed = new Set([
    new URL(publicBaseUrl).origin,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
  for (const hostname of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (hostname) allowed.add(`https://${hostname}`);
  }
  if (origin && !allowed.has(origin)) return res.status(403).json({ error: 'Origin request tidak diizinkan.' });
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: true, legacyHeaders: false });
const adminConfirmationLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
const publicWriteLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function accountView(row, admin = false) {
  return {
    id: row.id,
    account_code: row.account_code,
    title: row.title,
    game_name: row.game_name,
    level: row.level,
    rank: row.rank,
    description: row.description,
    price: Number(row.price),
    townhall_level: row.townhall_level,
    sold: row.sold,
    images: row.image_ids || [],
    credentials_configured: admin ? Boolean(row.delivery_credentials) : undefined,
    created: row.created_at,
    updated: row.updated_at,
  };
}

async function fetchAccounts({ id, gameName, admin = false } = {}) {
  const params = [];
  const where = ['g.archived_at IS NULL'];
  if (id) { params.push(id); where.push(`g.id=$${params.length}`); }
  if (gameName) { params.push(gameName); where.push(`g.game_name=$${params.length}`); }
  if (!admin) {
    where.push('g.sold=false');
    where.push(`NOT EXISTS (
      SELECT 1 FROM orders o
       WHERE o.game_account_id=g.id
         AND (
           o.status='paid'
           OR (
             o.status IN ('pending','awaiting_confirmation')
             AND o.created_at > now() - interval '48 hours'
           )
         )
    )`);
  }
  const result = await query(
    `SELECT g.*, COALESCE(array_agg(i.id ORDER BY i.sort_order) FILTER (WHERE i.id IS NOT NULL), '{}') image_ids
       FROM game_accounts g LEFT JOIN account_images i ON i.account_id=g.id
      WHERE ${where.join(' AND ')}
      GROUP BY g.id ORDER BY g.created_at DESC`,
    params,
  );
  return result.rows.map((row) => accountView(row, admin));
}

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true, database: 'alebabastore' });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const result = await query('SELECT * FROM admins WHERE lower(username)=lower($1)', [username]);
  const admin = result.rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }
  await query('DELETE FROM admin_sessions WHERE expires_at <= now()');
  res.json(beginTwoFactorChallenge(admin, res));
});

app.post('/api/auth/verify-2fa', loginLimiter, async (req, res) => {
  res.json(await completeTwoFactorChallenge(req, res, req.body.code));
});

app.get('/api/auth/me', async (req, res) => {
  const admin = await currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Belum login.' });
  res.json({ user: admin });
});

app.post('/api/auth/logout', async (req, res) => {
  await revokeSession(req, res);
  res.json({ ok: true });
});

app.post('/api/auth/change-password', requireAdmin, loginLimiter, async (req, res) => {
  const currentPassword = String(req.body.current_password || '');
  const newPassword = String(req.body.new_password || '');
  if (newPassword.length < 10) return res.status(400).json({ error: 'Password baru minimal 10 karakter.' });
  const result = await query('SELECT password_hash FROM admins WHERE id=$1', [req.admin.id]);
  if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
    return res.status(400).json({ error: 'Password lama salah.' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE admins SET password_hash=$2, updated_at=now() WHERE id=$1', [req.admin.id, hash]);
  await query('DELETE FROM admin_sessions WHERE admin_id=$1', [req.admin.id]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.post('/api/auth/recovery-codes', requireAdmin, loginLimiter, async (req, res) => {
  const recoveryCodes = await regenerateRecoveryCodes(
    req.admin.id,
    req.body.current_password,
    req.body.totp_code,
  );
  res.json({ recovery_codes: recoveryCodes });
});

app.get('/api/accounts', async (req, res) => {
  const admin = Boolean(await currentAdmin(req));
  res.json(await fetchAccounts({ gameName: req.query.game_name, admin }));
});

app.get('/api/accounts/:id', async (req, res) => {
  const admin = Boolean(await currentAdmin(req));
  const accounts = await fetchAccounts({ id: req.params.id, admin });
  if (!accounts[0]) return res.status(404).json({ error: 'Akun tidak ditemukan.' });
  res.json(accounts[0]);
});

app.get('/api/images/:id', async (req, res) => {
  const thumb = req.query.thumb === '1';
  const result = await query(
    `SELECT ${thumb ? 'thumbnail_data' : 'image_data'} data, mime_type FROM account_images WHERE id=$1`,
    [req.params.id],
  );
  if (!result.rowCount) return res.status(404).end();
  res.set({ 'Content-Type': result.rows[0].mime_type, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(result.rows[0].data);
});

async function compressedImage(buffer) {
  const source = sharp(buffer, { failOn: 'warning', limitInputPixels: 40_000_000 }).rotate();
  const image = await source.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 }).toBuffer({ resolveWithObject: true });
  const thumbnail = await source.clone().resize({ width: 500, height: 500, fit: 'cover', withoutEnlargement: true })
    .webp({ quality: 76, effort: 4 }).toBuffer();
  return { image, thumbnail };
}

function deliveryCredentials(body, required) {
  const email = String(body.credential_email || '').trim();
  const password = String(body.credential_password || '');
  const backupCodes = String(body.backup_codes || '').split(/[\n,]+/).map((v) => v.trim()).filter(Boolean);
  if (!email && !password && !backupCodes.length && !required) return null;
  if (!validEmail(email) || !password || backupCodes.length !== 8) {
    const error = new Error('Email akun, password, dan tepat 8 kode cadangan Gmail wajib diisi.');
    error.status = 400;
    throw error;
  }
  return encrypt(JSON.stringify({ email, password, backup_codes: backupCodes }));
}

async function saveImages(client, accountId, files, replace = false) {
  if (!files?.length) return;
  if (replace) await client.query('DELETE FROM account_images WHERE account_id=$1', [accountId]);
  for (let index = 0; index < files.length; index += 1) {
    const { image, thumbnail } = await compressedImage(files[index].buffer);
    await client.query(
      `INSERT INTO account_images
       (account_id, image_data, thumbnail_data, mime_type, width, height, sort_order)
       VALUES ($1,$2,$3,'image/webp',$4,$5,$6)`,
      [accountId, image.data, thumbnail, image.info.width, image.info.height, index],
    );
  }
}

app.post('/api/accounts', requireAdmin, upload.array('images', 10), async (req, res) => {
  const credentials = deliveryCredentials(req.body, true);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO game_accounts
       (account_code,title,game_name,level,rank,description,price,townhall_level,delivery_credentials)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        String(req.body.account_code || `ACC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`),
        req.body.title || null, req.body.game_name, Number(req.body.level), req.body.rank || '',
        req.body.description, Number(req.body.price), req.body.townhall_level ? Number(req.body.townhall_level) : null,
        credentials,
      ],
    );
    await saveImages(client, inserted.rows[0].id, req.files);
    await client.query('COMMIT');
    res.status(201).json((await fetchAccounts({ id: inserted.rows[0].id, admin: true }))[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.post(
  '/api/admin/accounts/:id/status',
  requireAdmin,
  adminConfirmationLimiter,
  async (req, res) => {
    const password = String(req.body.password || '');
    const sold = req.body.sold;
    if (!password || typeof sold !== 'boolean') {
      return res.status(400).json({ error: 'Password admin dan status akun wajib diisi.' });
    }

    const adminResult = await query('SELECT password_hash FROM admins WHERE id=$1', [req.admin.id]);
    const passwordMatches = adminResult.rowCount
      && await bcrypt.compare(password, adminResult.rows[0].password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Password admin salah.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const accountResult = await client.query(
        `SELECT id,sold FROM game_accounts
          WHERE id=$1 AND archived_at IS NULL
          FOR UPDATE`,
        [req.params.id],
      );
      const account = accountResult.rows[0];
      if (!account) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Akun tidak ditemukan.' });
      }

      if (!sold && account.sold) {
        const paidOrder = await client.query(
          `SELECT 1 FROM orders
            WHERE game_account_id=$1 AND status='paid'
            LIMIT 1`,
          [req.params.id],
        );
        if (paidOrder.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'Akun telah memiliki pembayaran lunas dan tidak dapat diaktifkan kembali.',
          });
        }
      }

      if (sold && !account.sold) {
        const activeOrder = await client.query(
          `SELECT 1 FROM orders
            WHERE game_account_id=$1
              AND status IN ('pending','awaiting_confirmation')
              AND created_at > now() - interval '48 hours'
            LIMIT 1`,
          [req.params.id],
        );
        if (activeOrder.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'Akun sedang dipesan dan menunggu pembayaran. Status tidak dapat diubah.',
          });
        }
      }

      await client.query(
        'UPDATE game_accounts SET sold=$2,updated_at=now() WHERE id=$1',
        [req.params.id, sold],
      );
      await client.query('COMMIT');
      return res.json((await fetchAccounts({ id: req.params.id, admin: true }))[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
);

app.patch('/api/accounts/:id', requireAdmin, upload.array('images', 10), async (req, res) => {
  const current = await query('SELECT * FROM game_accounts WHERE id=$1', [req.params.id]);
  if (!current.rowCount) return res.status(404).json({ error: 'Akun tidak ditemukan.' });
  const row = current.rows[0];
  const requestedSold = req.body.sold === undefined ? row.sold : String(req.body.sold) === 'true';
  if (req.body.sold !== undefined && requestedSold !== row.sold) {
    return res.status(400).json({
      error: 'Perubahan status harus dikonfirmasi dengan password admin.',
    });
  }
  const credentials = deliveryCredentials(req.body, false) || row.delivery_credentials;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE game_accounts SET title=$2,game_name=$3,level=$4,rank=$5,description=$6,price=$7,
       townhall_level=$8,delivery_credentials=$9,sold=$10,updated_at=now() WHERE id=$1`,
      [
        req.params.id, req.body.title === undefined ? row.title : (req.body.title || null), req.body.game_name || row.game_name,
        Number(req.body.level || row.level), req.body.rank ?? row.rank, req.body.description ?? row.description,
        Number(req.body.price ?? row.price),
        req.body.townhall_level === undefined ? row.townhall_level : (req.body.townhall_level ? Number(req.body.townhall_level) : null),
        credentials, row.sold,
      ],
    );
    await saveImages(client, req.params.id, req.files, true);
    await client.query('COMMIT');
    res.json((await fetchAccounts({ id: req.params.id, admin: true }))[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.delete('/api/accounts/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query(
      'SELECT id FROM game_accounts WHERE id=$1 AND archived_at IS NULL FOR UPDATE',
      [req.params.id],
    );
    if (!account.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    }

    const transactions = await client.query(
      'SELECT 1 FROM orders WHERE game_account_id=$1 LIMIT 1',
      [req.params.id],
    );
    if (transactions.rowCount) {
      await client.query(
        'UPDATE game_accounts SET sold=true,archived_at=now(),updated_at=now() WHERE id=$1',
        [req.params.id],
      );
      await client.query('COMMIT');
      return res.json({ archived: true });
    }

    await client.query('DELETE FROM game_accounts WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    return res.json({ archived: false });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.get('/api/accounts/:id/reviews', async (req, res) => {
  const order = req.query.sort === 'highest' ? 'rating DESC, created_at DESC' : 'created_at DESC';
  const result = await query(
    `SELECT id, rating, comment, customer_name "customerName", created_at created
       FROM reviews WHERE game_account_id=$1 ORDER BY ${order} LIMIT 100`,
    [req.params.id],
  );
  res.json(result.rows);
});

app.post('/api/accounts/:id/reviews', publicWriteLimiter, async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  if (rating < 1 || rating > 5 || comment.length < 10 || comment.length > 2000) {
    return res.status(400).json({ error: 'Rating atau komentar tidak valid.' });
  }
  const result = await query(
    `INSERT INTO reviews(game_account_id,rating,comment,customer_name)
     VALUES ($1,$2,$3,$4) RETURNING id,rating,comment,customer_name "customerName",created_at created`,
    [req.params.id, rating, comment, String(req.body.customerName || 'Anonymous').slice(0, 120)],
  );
  res.status(201).json(result.rows[0]);
});

app.delete('/api/reviews/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

app.post('/api/checkout/email-verification', emailVerificationLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ error: 'Alamat email tidak valid.' });

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await query(
    `DELETE FROM email_verifications
      WHERE email=$1 AND used_at IS NULL AND (expires_at <= now() OR verified_at IS NULL)`,
    [email],
  );
  const inserted = await query(
    `INSERT INTO email_verifications(email,code_hash,expires_at)
     VALUES($1,$2,$3) RETURNING id`,
    [email, codeHash, expiresAt],
  );
  const verificationId = inserted.rows[0].id;
  try {
    await sendEmail({
      to: email,
      subject: 'Kode verifikasi email AlebabaStore',
      text: `Kode verifikasi Anda: ${code}\n\nKode ini berlaku 10 menit. Jangan berikan kode ini kepada siapa pun.`,
      html: `<h2>Verifikasi email Anda</h2><p>Masukkan kode berikut untuk melanjutkan checkout:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Kode berlaku 10 menit. Jangan berikan kode ini kepada siapa pun.</p>`,
      idempotencyKey: `alebabastore-email-verification-${verificationId}`,
    });
  } catch (error) {
    await query('DELETE FROM email_verifications WHERE id=$1', [verificationId]);
    throw error;
  }
  res.status(201).json({ verification_id: verificationId, expires_in: 600 });
});

app.post('/api/checkout/email-verification/confirm', emailVerificationLimiter, async (req, res) => {
  const verificationId = String(req.body.verification_id || '');
  const code = String(req.body.code || '').replace(/\s/g, '');
  if (!verificationId || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Kode verifikasi 6 digit wajib diisi.' });
  }
  const result = await query(
    `SELECT id,code_hash,attempts,expires_at,verified_at,used_at
       FROM email_verifications WHERE id=$1`,
    [verificationId],
  );
  const verification = result.rows[0];
  if (!verification || verification.used_at || new Date(verification.expires_at) <= new Date()) {
    return res.status(400).json({ error: 'Kode verifikasi tidak valid atau sudah kedaluwarsa.' });
  }
  if (verification.attempts >= 5) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Minta kode baru.' });
  }
  if (!(await bcrypt.compare(code, verification.code_hash))) {
    await query('UPDATE email_verifications SET attempts=attempts+1 WHERE id=$1', [verificationId]);
    return res.status(400).json({ error: 'Kode verifikasi salah.' });
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const updated = await query(
    `UPDATE email_verifications
        SET token_hash=$2,verified_at=now(),expires_at=now()+interval '30 minutes'
      WHERE id=$1 AND used_at IS NULL AND attempts < 5
      RETURNING id`,
    [verificationId, sha256(token)],
  );
  if (!updated.rowCount) return res.status(409).json({ error: 'Verifikasi email tidak dapat digunakan.' });
  res.json({ verification_token: token, expires_in: 1800 });
});

app.post('/api/checkout', publicWriteLimiter, async (req, res) => {
  const buyerEmail = String(req.body.buyer_email || '').trim().toLowerCase();
  const buyerName = String(req.body.buyer_name || '').trim();
  if (!validEmail(buyerEmail) || !buyerName || !req.body.game_account_id) {
    return res.status(400).json({ error: 'Nama, email aktif, dan akun yang dibeli wajib diisi.' });
  }
  const orderId = `ALB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`.slice(0, 30);
  const paymentSettings = await getSettings();
  const paymentProvider = paymentSettings.payment_provider === 'pakasir' ? 'pakasir' : 'temanqris';
  const client = await pool.connect();
  let account;
  let insertedId;
  let verificationRecordId;
  try {
    await client.query('BEGIN');
    const verification = await client.query(
      `SELECT id FROM email_verifications
        WHERE token_hash=$1 AND email=$2 AND verified_at IS NOT NULL
          AND used_at IS NULL AND expires_at > now()
        FOR UPDATE`,
      [sha256(String(req.body.email_verification_token || '')), buyerEmail],
    );
    if (!verification.rowCount) {
      const error = new Error('Email pembeli belum diverifikasi atau verifikasinya sudah kedaluwarsa.');
      error.status = 403;
      throw error;
    }
    verificationRecordId = verification.rows[0].id;
    const accountResult = await client.query(
      'SELECT * FROM game_accounts WHERE id=$1 AND sold=false AND archived_at IS NULL FOR UPDATE',
      [req.body.game_account_id],
    );
    account = accountResult.rows[0];
    if (!account) {
      const error = new Error('Akun sudah terjual atau tidak tersedia.');
      error.status = 409;
      throw error;
    }
    if (!account.delivery_credentials) {
      const error = new Error('Akun belum siap untuk pengiriman otomatis.');
      error.status = 409;
      throw error;
    }
    const reserved = await client.query(
      `SELECT status FROM orders WHERE game_account_id=$1
        AND (
          status='paid'
          OR (
            status IN ('pending','awaiting_confirmation')
            AND created_at > now() - interval '48 hours'
          )
        )
        ORDER BY (status='paid') DESC
        LIMIT 1`,
      [account.id],
    );
    if (reserved.rowCount) {
      const error = new Error(
        reserved.rows[0].status === 'paid'
          ? 'Akun sudah terjual atau tidak tersedia.'
          : 'Akun sedang dipesan pembeli lain. Coba lagi nanti.',
      );
      error.status = 409;
      throw error;
    }
    const inserted = await client.query(
      `INSERT INTO orders(order_id,game_account_id,buyer_name,buyer_email,buyer_phone,amount,payment_provider)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [orderId, account.id, buyerName, buyerEmail, String(req.body.buyer_phone || '').trim(), account.price, paymentProvider],
    );
    insertedId = inserted.rows[0].id;
    await client.query(
      'UPDATE email_verifications SET used_at=now() WHERE id=$1',
      [verification.rows[0].id],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  try {
    if (paymentProvider === 'pakasir') {
      const payment = await pakasirPaymentUrl({
        orderId,
        amount: account.price,
        redirectUrl: `${publicBaseUrl}/payment-status?order_id=${encodeURIComponent(orderId)}`,
      });
      await query(
        `UPDATE orders SET payment_url=$2,provider_payload=$3,updated_at=now() WHERE id=$1`,
        [insertedId, payment.paymentUrl, { project: payment.project }],
      );
      return res.status(201).json({ order_id: orderId, payment_url: payment.paymentUrl });
    }
    const result = await temanqris('/payment-link', {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(account.price),
        description: `AlebabaStore ${account.account_code}`,
        order_id: orderId,
        webhook_url: `${publicBaseUrl}/api/webhooks/temanqris`,
        callback_url: `${publicBaseUrl}/payment-status?order_id=${encodeURIComponent(orderId)}`,
      }),
    });
    const link = result.payment_link;
    const paymentUrl = new URL(link.url, 'https://temanqris.com').toString();
    await query(
      `UPDATE orders SET payment_link_code=$2,payment_url=$3,provider_payload=$4,updated_at=now() WHERE id=$1`,
      [insertedId, link.link_code, paymentUrl, result],
    );
    res.status(201).json({ order_id: orderId, payment_url: paymentUrl, expires_at: link.expires_at });
  } catch (error) {
    await query('DELETE FROM orders WHERE id=$1', [insertedId]);
    if (verificationRecordId) {
      await query(
        'UPDATE email_verifications SET used_at=NULL WHERE id=$1',
        [verificationRecordId],
      );
    }
    throw error;
  }
});

app.get('/api/orders/:orderId/status', async (req, res) => {
  try {
    await syncOrderFromProvider(req.params.orderId);
  } catch (error) {
    if (error.status === 404) throw error;
    console.error('[payment-sync]', req.params.orderId, error.message);
  }
  const result = await query(
    `SELECT order_id,status,paid_at,fulfilled_at,created_at FROM orders WHERE order_id=$1`,
    [req.params.orderId],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Order tidak ditemukan.' });
  res.json(result.rows[0]);
});

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  const result = await query(
    `SELECT o.*,g.account_code,g.title,g.game_name FROM orders o
      JOIN game_accounts g ON g.id=o.game_account_id ORDER BY o.created_at DESC LIMIT 200`,
  );
  res.json(result.rows);
});

app.post('/api/admin/orders/:orderId/verify', requireAdmin, async (req, res) => {
  const order = await query('SELECT payment_provider FROM orders WHERE order_id=$1', [req.params.orderId]);
  if (order.rows[0]?.payment_provider === 'pakasir') {
    return res.status(400).json({ error: 'Pembayaran Pakasir dikonfirmasi otomatis dari status transaksi.' });
  }
  const result = await temanqris(`/orders/${encodeURIComponent(req.params.orderId)}/verify`, {
    method: 'POST',
    body: JSON.stringify({ payer_name: req.body.payer_name || req.admin.username, payer_note: 'Verified via AlebabaStore admin' }),
  });
  await query(`UPDATE orders SET status='paid',paid_at=now(),provider_payload=$2,updated_at=now() WHERE order_id=$1`, [req.params.orderId, result]);
  await fulfillOrder(req.params.orderId);
  res.json({ ok: true });
});

app.post('/api/admin/orders/:orderId/sync', requireAdmin, async (req, res) => {
  const order = await syncOrderFromProvider(req.params.orderId, { force: true });
  res.json(order);
});

app.post('/api/admin/orders/:orderId/resend', requireAdmin, async (req, res) => {
  await query('UPDATE orders SET fulfilled_at=NULL,delivery_error=NULL WHERE order_id=$1 AND status=$2', [req.params.orderId, 'paid']);
  const result = await fulfillOrder(req.params.orderId, { forceResend: true });
  res.json(result);
});

app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  res.json(publicSettings(await getSettings()));
});

app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
  res.json(await updateSettings(req.body));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === '23505') return res.status(409).json({ error: 'Data unik sudah digunakan.' });
  if (error.code === '23503') return res.status(409).json({ error: 'Data masih digunakan oleh transaksi lain.' });
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  const status = Number(error.status) || 500;
  res.status(status).json({
    error: status < 500 || process.env.NODE_ENV !== 'production'
      ? error.message
      : 'Terjadi kesalahan pada server.',
  });
});

if (!process.env.VERCEL) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(here, '../../../dist/apps/web');
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const ready = initDatabase().then(bootstrapAdmin);
await ready;

if (!process.env.VERCEL) {
  app.listen(port, () => console.info(`AlebabaStore API listening on :${port}`));

  async function shutdown() {
    await pool.end();
    process.exit(0);
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
