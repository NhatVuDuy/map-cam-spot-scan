import pg from "pg";
import { config } from "./index.js";

const { Pool } = pg;

let pool = null;
let dbAvailable = false;

export async function initDatabase() {
  if (!config.database.url) {
    console.warn("[database] DATABASE_URL not set — PostGIS source unavailable");
    return;
  }

  try {
    pool = new Pool({
      connectionString: config.database.url,
      min: config.database.poolMin,
      max: config.database.poolMax,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();

    dbAvailable = true;
    console.log("[database] Connected to PostGIS");
  } catch (err) {
    console.warn("[database] Could not connect to PostGIS:", err.message);
    console.warn("[database] PostGIS source will be unavailable — other sources still work");
    pool = null;
    dbAvailable = false;
  }
}

export function getPool() {
  return pool;
}

export function isDbAvailable() {
  return dbAvailable;
}

export async function checkDbHealth() {
  if (!pool || !dbAvailable) return false;
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}
