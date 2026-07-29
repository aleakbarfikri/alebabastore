import { DatabaseSync } from 'node:sqlite';
import { initDatabase, pool } from './db.js';

const legacyPath = process.env.LEGACY_POCKETBASE_DB_PATH;
if (!legacyPath) throw new Error('LEGACY_POCKETBASE_DB_PATH wajib menunjuk ke backup data.db PocketBase.');

const legacy = new DatabaseSync(legacyPath, { readOnly: true });
const idMap = new Map();

try {
  await initDatabase();
  const accounts = legacy.prepare('SELECT * FROM game_accounts ORDER BY created').all();
  for (const account of accounts) {
    const result = await pool.query(
      `INSERT INTO game_accounts
       (account_code,title,game_name,level,rank,description,price,townhall_level,sold,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT(account_code) DO UPDATE SET
       title=EXCLUDED.title,game_name=EXCLUDED.game_name,level=EXCLUDED.level,rank=EXCLUDED.rank,
       description=EXCLUDED.description,price=EXCLUDED.price,townhall_level=EXCLUDED.townhall_level,
       sold=EXCLUDED.sold,updated_at=EXCLUDED.updated_at
       RETURNING id`,
      [
        account.account_code || `LEGACY-${account.id}`, account.title || null, account.game_name,
        Number(account.level), account.rank || '', account.description, Number(account.price),
        account.townhall_level ? Number(account.townhall_level) : null, Boolean(account.sold),
        account.created, account.updated,
      ],
    );
    idMap.set(account.id, result.rows[0].id);
  }

  const hasReviews = legacy.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='reviews'",
  ).get();
  if (hasReviews) {
    const reviews = legacy.prepare('SELECT * FROM reviews ORDER BY created').all();
    for (const review of reviews) {
      const accountId = idMap.get(review.gameAccountId);
      if (!accountId) continue;
      await pool.query(
        `INSERT INTO reviews(game_account_id,rating,comment,customer_name,created_at)
         SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (
           SELECT 1 FROM reviews WHERE game_account_id=$1 AND comment=$3 AND created_at=$5
         )`,
        [accountId, Number(review.rating), review.comment, review.customerName || 'Anonymous', review.created],
      );
    }
  }

  console.info(`Migrasi selesai: ${accounts.length} akun. Gambar dan inquiry lama tidak diimpor karena format penyimpanannya berbeda.`);
} finally {
  legacy.close();
  await pool.end();
}
