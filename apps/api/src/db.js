import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { Pool } = pg;

const isVercelPreview = process.env.VERCEL_ENV === 'preview';
const databaseUrl = isVercelPreview
  ? process.env.DATABASE_URL_ALEBABASTORE_PREVIEW
  : (process.env.DATABASE_URL_ALEBABASTORE || process.env.DATABASE_URL);

if (!databaseUrl) {
  throw new Error(
    isVercelPreview
      ? 'DATABASE_URL_ALEBABASTORE_PREVIEW wajib diisi dengan database Neon khusus Preview.'
      : 'DATABASE_URL_ALEBABASTORE atau DATABASE_URL wajib diisi dengan database Neon khusus AlebabaStore.',
  );
}

const connectionUrl = new URL(databaseUrl);
if (process.env.NODE_ENV === 'production') {
  // pg treats sslmode from the URL as an override for the explicit TLS options.
  connectionUrl.searchParams.delete('sslmode');
}

export const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
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
