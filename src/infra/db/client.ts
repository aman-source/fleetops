import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../../env.js';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool);

export async function checkDbHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
