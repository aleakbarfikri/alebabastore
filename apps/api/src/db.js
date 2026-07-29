import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { Pool } = pg;

if (!process.env.DATABASE_URL_ALEBABASTORE) {
  throw new Error('DATABASE_URL_ALEBABASTORE wajib diisi dengan connection string database Neon khusus AlebabaStore.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL_ALEBABASTORE,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
});

export async function initDatabase() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const schema = await readFile(path.join(here, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

export async function query(text, params) {
  return pool.query(text, params);
}
