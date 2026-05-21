/**
 * Programmatic seed runner + reset for E2E tests.
 * Uses the test API endpoint to trigger seed scripts server-side.
 */
import { request } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://fleetops:fleetops_secret@localhost:5433/fleetops_test';

/** Run the full seed suite (db:seed + db:seed-fleet + db:seed-ops). */
export async function fullSeed(): Promise<void> {
  const env = {
    ...process.env,
    DATABASE_URL: TEST_DB_URL,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-min-16-chars',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-16',
    MINIO_ACCESS_KEY: 'fleetops_minio',
    MINIO_SECRET_KEY: 'fleetops_minio_secret',
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: '9003',
    MINIO_BUCKET: 'fleetops-test',
    MINIO_USE_SSL: 'false',
    REDIS_URL: 'redis://localhost:6380',
    MQTT_URL: 'mqtt://localhost:1884',
    LOG_LEVEL: 'warn',
  };

  await execAsync('pnpm db:seed', { env });
  await execAsync('pnpm db:seed-fleet', { env });
  await execAsync('pnpm db:seed-ops', { env });
}

/**
 * Truncate all tables (except migrations) and re-run full seed.
 * Use sparingly — only when a spec truly needs clean state.
 */
export async function reset(): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  // Hit the test-only reset endpoint which truncates + re-seeds
  const res = await ctx.post('/api/v1/test/reset-seed', {
    headers: { 'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-reset' },
  });

  await ctx.dispose();

  if (!res.ok()) {
    // Fallback: run seeds directly
    await fullSeed();
  }
}

/** Scoped clean for one tenant org. */
export async function resetTenant(orgId: string): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  const res = await ctx.post('/api/v1/test/reset-tenant', {
    headers: { 'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-reset' },
    data: { orgId },
  });

  await ctx.dispose();

  if (!res.ok()) {
    throw new Error(`resetTenant(${orgId}) failed: ${res.status()}`);
  }
}
