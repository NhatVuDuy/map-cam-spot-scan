import pg from 'pg';
import { config } from './index.js';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    if (!config.db.url) return null;
    pool = new Pool({
      connectionString: config.db.url,
      min: config.db.poolMin,
      max: config.db.poolMax,
    });
    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

export async function checkDbConnection() {
  const p = getPool();
  if (!p) return false;
  try {
    const client = await p.connect();
    client.release();
    return true;
  } catch {
    return false;
  }
}
