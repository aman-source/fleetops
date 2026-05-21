/**
 * Data Retention Service
 *
 * Enforces retention policies on high-volume tables.
 * Runs as a scheduled cron job (daily at 02:00 UTC).
 *
 * Policies:
 *   - telemetry_logs: keep 90 days (high-volume MQTT data)
 *   - events: keep 365 days
 *   - audit_logs: keep 730 days (2 years)
 *   - notification_deliveries: keep 180 days
 *   - reports (failed/non-downloadable): keep 30 days
 *
 * NEVER deletes safety records:
 *   - incidents, incidentSteps, driverScores — no delete
 *   - journeys, journeyApprovals — no delete
 *   - workOrders, workOrderParts — no delete
 */

import { sql } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import type { FastifyBaseLogger } from 'fastify';

interface RetentionPolicy {
  table: string;
  timestampColumn: string;
  retentionDays: number;
  description: string;
}

const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    table: 'telemetry_logs',
    timestampColumn: 'recorded_at',
    retentionDays: 90,
    description: 'MQTT telemetry data',
  },
  {
    table: 'events',
    timestampColumn: 'recorded_at',
    retentionDays: 365,
    description: 'Fleet events',
  },
  {
    table: 'audit_logs',
    timestampColumn: 'created_at',
    retentionDays: 730,
    description: 'Audit trail',
  },
  {
    table: 'notification_deliveries',
    timestampColumn: 'sent_at',
    retentionDays: 180,
    description: 'Notification delivery records',
  },
  {
    table: 'reports',
    timestampColumn: 'created_at',
    retentionDays: 30,
    description: 'Failed/expired report records',
    // Only purge non-ready reports to save storage
  },
];

export async function runRetentionPolicies(logger?: FastifyBaseLogger): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const policy of RETENTION_POLICIES) {
    const cutoff = new Date(Date.now() - policy.retentionDays * 86400000);

    try {
      // Use raw SQL for delete with CTEs for performance
      const whereClause = policy.table === 'reports'
        ? `${policy.timestampColumn} < '${cutoff.toISOString()}' AND status IN ('failed', 'pending')`
        : `${policy.timestampColumn} < '${cutoff.toISOString()}'`;

      const result = await db.execute(
        sql.raw(`DELETE FROM ${policy.table} WHERE ${whereClause}`)
      );

      const deleted = (result as { rowCount?: number }).rowCount ?? 0;
      results[policy.table] = deleted;
      logger?.info({ table: policy.table, deleted, retentionDays: policy.retentionDays }, 'Retention policy applied');
    } catch (err) {
      logger?.error({ err, table: policy.table }, 'Retention policy failed');
      results[policy.table] = -1;
    }
  }

  return results;
}

/**
 * Schedule the retention job via setInterval (daily at next ~02:00 UTC).
 * Returns the interval handle for cleanup.
 */
export function scheduleRetentionJob(logger?: FastifyBaseLogger): NodeJS.Timeout {
  const DAILY_MS = 24 * 60 * 60 * 1000;

  // Calculate ms until next 02:00 UTC
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setUTCHours(2, 0, 0, 0);
  if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  const initialDelay = nextRun.getTime() - now.getTime();

  logger?.info({ nextRun: nextRun.toISOString() }, 'Retention job scheduled');

  const run = async () => {
    logger?.info('Running retention policies...');
    const results = await runRetentionPolicies(logger).catch((err) => {
      logger?.error({ err }, 'Retention run failed');
      return {};
    });
    logger?.info({ results }, 'Retention complete');
  };

  // First run at next 02:00 UTC, then every 24h
  const handle = setTimeout(async () => {
    await run();
    setInterval(run, DAILY_MS);
  }, initialDelay);

  return handle;
}
