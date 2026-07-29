import { initDatabase, pool } from './db.js';
import { bootstrapAdmin } from './auth.js';

try {
  await initDatabase();
  await bootstrapAdmin();
  console.info('Database AlebabaStore siap.');
} finally {
  await pool.end();
}
