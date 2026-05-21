/**
 * Read-only DB helpers for test assertions.
 * Tests MUST NOT write directly to DB unless explicitly required.
 *
 * Connects to postgres-test on port 5433.
 */
import pg from 'pg';

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://fleetops:fleetops_secret@localhost:5433/fleetops_test';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 5 });
  }
  return pool;
}

async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query(sql, params);
  return res.rows as T[];
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function getVehicleStatus(plateOrId: string): Promise<string> {
  const rows = await query<{ status: string }>(
    `SELECT status FROM vehicles WHERE id::text = $1 OR plate_no = $1 LIMIT 1`,
    [plateOrId],
  );
  if (!rows.length) throw new Error(`Vehicle not found: ${plateOrId}`);
  return rows[0].status;
}

export async function getJourneyStatus(id: string): Promise<string> {
  const rows = await query<{ status: string }>(
    `SELECT status FROM journeys WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!rows.length) throw new Error(`Journey not found: ${id}`);
  return rows[0].status;
}

export async function getIncidentBy(eventId: string): Promise<Record<string, unknown> | null> {
  const rows = await query(
    `SELECT * FROM incidents WHERE event_id = $1 LIMIT 1`,
    [eventId],
  );
  return rows[0] ?? null;
}

export async function getAuditLogs(filter: {
  entityType?: string;
  entityId?: string;
  userId?: string;
}): Promise<Record<string, unknown>[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filter.entityType) {
    conditions.push(`entity_type = $${i++}`);
    params.push(filter.entityType);
  }
  if (filter.entityId) {
    conditions.push(`entity_id = $${i++}`);
    params.push(filter.entityId);
  }
  if (filter.userId) {
    conditions.push(`user_id = $${i++}`);
    params.push(filter.userId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(`SELECT * FROM audit_logs ${where} ORDER BY timestamp ASC`, params);
}

export async function getWorkOrders(filter: {
  vehicleId?: string;
  status?: string;
}): Promise<Record<string, unknown>[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filter.vehicleId) {
    conditions.push(`vehicle_id = $${i++}`);
    params.push(filter.vehicleId);
  }
  if (filter.status) {
    conditions.push(`status = $${i++}`);
    params.push(filter.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(`SELECT * FROM work_orders ${where} ORDER BY created_at DESC`, params);
}

export async function getEvents(filter: {
  type?: string;
  vehicleId?: string;
  severity?: string;
}): Promise<Record<string, unknown>[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filter.type) {
    conditions.push(`event_type = $${i++}`);
    params.push(filter.type);
  }
  if (filter.vehicleId) {
    conditions.push(`vehicle_id = $${i++}`);
    params.push(filter.vehicleId);
  }
  if (filter.severity) {
    conditions.push(`severity = $${i++}`);
    params.push(filter.severity);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(`SELECT * FROM events ${where} ORDER BY created_at DESC`, params);
}

export async function getIncidentSteps(incidentId: string): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT * FROM incident_steps WHERE incident_id = $1 ORDER BY step_number ASC`,
    [incidentId],
  );
}

export async function getJourneyApprovals(journeyId: string): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT * FROM journey_approvals WHERE journey_id = $1 ORDER BY step ASC`,
    [journeyId],
  );
}

export async function getBoardingEvents(journeyId: string): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT * FROM boarding_events WHERE journey_id = $1 ORDER BY boarded_at ASC`,
    [journeyId],
  );
}

export async function getTripScore(journeyId: string): Promise<Record<string, unknown> | null> {
  const rows = await query(
    `SELECT * FROM trip_scores WHERE journey_id = $1 LIMIT 1`,
    [journeyId],
  );
  return rows[0] ?? null;
}

export async function rawQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return query<T>(sql, params);
}
