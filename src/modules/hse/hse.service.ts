import { eq, and, isNull, lt, desc, asc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { incidents, incidentSteps, driverScores } from '../../infra/db/schema/hse.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { drivers } from '../../infra/db/schema/drivers.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { redis } from '../../infra/redis/client.js';

// Default panic response playbook — 6 steps
const PANIC_PLAYBOOK = [
  'Confirm incident — verify panic is not accidental',
  'Establish communication with driver',
  'Assess situation — injuries, vehicle status, location',
  'Dispatch response — ambulance, recovery, HSE team',
  'Notify stakeholders — project manager, client, authorities',
  'Secure scene — evidence preservation, witness statements',
];

// ═══════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════

export async function listIncidents(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; vehicleId?: string;
  driverId?: string; tier?: number;
}) {
  const conditions = [eq(incidents.orgId, tenantId), isNull(incidents.deletedAt)];

  if (query.status) conditions.push(eq(incidents.status, query.status));
  if (query.vehicleId) conditions.push(eq(incidents.vehicleId, query.vehicleId));
  if (query.driverId) conditions.push(eq(incidents.driverId, query.driverId));
  if (query.tier) conditions.push(eq(incidents.tier, query.tier));
  if (query.cursor) conditions.push(lt(incidents.id, query.cursor));

  const rows = await db.select().from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.startedAt))
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getIncident(tenantId: string, incidentId: string) {
  const rows = await db.select().from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.orgId, tenantId), isNull(incidents.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Incident', incidentId);
  return rows[0];
}

/**
 * Create incident from panic event — called from MQTT panic handler.
 */
export async function createPanicIncident(data: {
  eventId: string;
  vehicleId: string;
  driverId?: string;
  journeyId?: string;
  lat: number;
  lon: number;
  situation?: string;
  orgId: string;
}) {
  const [incident] = await db.insert(incidents).values({
    eventId: data.eventId,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    journeyId: data.journeyId,
    tier: 1,
    status: 'active',
    situation: data.situation ?? 'Panic button activated',
    lat: String(data.lat),
    lon: String(data.lon),
    orgId: data.orgId,
  }).returning();

  // Create playbook steps
  await db.insert(incidentSteps).values(
    PANIC_PLAYBOOK.map((desc, i) => ({
      incidentId: incident.id,
      stepNumber: i + 1,
      description: desc,
      status: i === 0 ? 'active' : 'pending',
    })),
  );

  // HSE hold on vehicle
  await db.update(vehicles).set({ status: 'hse_hold', updatedAt: new Date() })
    .where(eq(vehicles.id, data.vehicleId));

  // Publish to critical channel
  await redis.publish('events:severity:critical', JSON.stringify({
    type: 'incident_created',
    incident,
  }));

  return incident;
}

/**
 * Complete a playbook step.
 */
export async function completeStep(tenantId: string, incidentId: string, stepNumber: number, userId: string) {
  const incident = await getIncident(tenantId, incidentId);

  if (incident.status === 'closed') {
    throw new ConflictError('Incident already closed');
  }

  // Find step
  const stepRows = await db.select().from(incidentSteps)
    .where(and(eq(incidentSteps.incidentId, incidentId), eq(incidentSteps.stepNumber, stepNumber)))
    .limit(1);

  if (!stepRows[0]) throw new NotFoundError('Step', String(stepNumber));

  const step = stepRows[0];
  if (step.status === 'done') throw new ConflictError('Step already completed');

  // Complete step
  await db.update(incidentSteps).set({
    status: 'done',
    completedBy: userId,
    completedAt: new Date(),
  }).where(eq(incidentSteps.id, step.id));

  // Activate next step
  const nextStepRows = await db.select().from(incidentSteps)
    .where(and(
      eq(incidentSteps.incidentId, incidentId),
      eq(incidentSteps.stepNumber, stepNumber + 1),
    )).limit(1);

  if (nextStepRows[0]) {
    await db.update(incidentSteps).set({ status: 'active' })
      .where(eq(incidentSteps.id, nextStepRows[0].id));
  }

  // Update incident status to responding
  if (incident.status === 'active') {
    await db.update(incidents).set({ status: 'responding' })
      .where(eq(incidents.id, incidentId));
  }

  return { step: { ...step, status: 'done' }, nextStep: nextStepRows[0] ?? null };
}

/**
 * Escalate incident to next tier.
 */
export async function escalateIncident(tenantId: string, incidentId: string) {
  const incident = await getIncident(tenantId, incidentId);

  if (incident.status === 'closed') throw new ConflictError('Incident already closed');
  if (incident.tier >= 3) throw new ConflictError('Already at maximum tier');

  const newTier = incident.tier + 1;

  const [updated] = await db.update(incidents).set({
    tier: newTier,
    status: 'escalated',
  }).where(eq(incidents.id, incidentId)).returning();

  // Publish escalation to critical channel
  await redis.publish('events:severity:critical', JSON.stringify({
    type: 'incident_escalated',
    incidentId,
    tier: newTier,
  }));

  // TODO Phase 9: Fan-out notifications to Tier 2/3 contacts

  return updated;
}

/**
 * Close incident with report.
 */
export async function closeIncident(tenantId: string, incidentId: string, userId: string, closureReport: string) {
  const incident = await getIncident(tenantId, incidentId);

  if (incident.status === 'closed') throw new ConflictError('Incident already closed');

  const [updated] = await db.update(incidents).set({
    status: 'closed',
    closedBy: userId,
    closedAt: new Date(),
    closureReport,
  }).where(eq(incidents.id, incidentId)).returning();

  // Release HSE hold on vehicle if still held
  if (incident.vehicleId) {
    const vRows = await db.select({ status: vehicles.status })
      .from(vehicles).where(eq(vehicles.id, incident.vehicleId)).limit(1);

    if (vRows[0]?.status === 'hse_hold') {
      // Revert to under_maintenance — needs maintenance review before release
      await db.update(vehicles).set({ status: 'under_maintenance', updatedAt: new Date() })
        .where(eq(vehicles.id, incident.vehicleId));
    }
  }

  return updated;
}

/**
 * Get playbook steps for incident.
 */
export async function getSteps(tenantId: string, incidentId: string) {
  await getIncident(tenantId, incidentId);

  return db.select().from(incidentSteps)
    .where(eq(incidentSteps.incidentId, incidentId))
    .orderBy(asc(incidentSteps.stepNumber));
}

// ═══════════════════════════════════════════
// DRIVER SCORES
// ═══════════════════════════════════════════

export async function listDriverScores(tenantId: string, query: {
  cursor?: string; limit: number; period?: string;
  sortBy?: string; sortOrder?: string;
}) {
  const conditions = [eq(driverScores.orgId, tenantId)];

  if (query.period) conditions.push(eq(driverScores.period, query.period));
  if (query.cursor) conditions.push(lt(driverScores.id, query.cursor));

  const orderCol = query.sortBy === 'overspeedCount' ? driverScores.overspeedCount
    : query.sortBy === 'incidentCount' ? driverScores.incidentCount
    : driverScores.totalScore;

  const orderDir = query.sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);

  const rows = await db.select().from(driverScores)
    .where(and(...conditions))
    .orderBy(orderDir)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

/**
 * Increment driver event count — called from event classifier.
 */
export async function incrementDriverEvent(
  driverId: string,
  orgId: string,
  eventType: 'overspeed' | 'harsh_braking' | 'harsh_accel' | 'idle' | 'incident',
) {
  const period = new Date().toISOString().slice(0, 7); // '2026-05'

  // Upsert score record
  const existing = await db.select().from(driverScores)
    .where(and(eq(driverScores.driverId, driverId), eq(driverScores.period, period)))
    .limit(1);

  if (existing[0]) {
    const field = eventType === 'overspeed' ? 'overspeedCount'
      : eventType === 'harsh_braking' ? 'harshBrakingCount'
      : eventType === 'harsh_accel' ? 'harshAccelCount'
      : eventType === 'idle' ? 'idleCount'
      : 'incidentCount';

    const currentValue = existing[0][field] as number;
    await db.update(driverScores).set({
      [field]: currentValue + 1,
      totalScore: String(computeScore({ ...existing[0], [field]: currentValue + 1 })),
      updatedAt: new Date(),
    }).where(eq(driverScores.id, existing[0].id));
  } else {
    const initial = {
      driverId,
      period,
      orgId,
      overspeedCount: eventType === 'overspeed' ? 1 : 0,
      harshBrakingCount: eventType === 'harsh_braking' ? 1 : 0,
      harshAccelCount: eventType === 'harsh_accel' ? 1 : 0,
      idleCount: eventType === 'idle' ? 1 : 0,
      incidentCount: eventType === 'incident' ? 1 : 0,
    };
    await db.insert(driverScores).values({
      ...initial,
      totalScore: String(computeScore(initial)),
      complianceScore: '100',
    });
  }
}

function computeScore(counts: {
  overspeedCount: number; harshBrakingCount: number; harshAccelCount: number;
  idleCount: number; incidentCount: number;
}): number {
  // Start at 100, deduct per event
  let score = 100;
  score -= counts.overspeedCount * 3;
  score -= counts.harshBrakingCount * 2;
  score -= counts.harshAccelCount * 1;
  score -= counts.idleCount * 0.5;
  score -= counts.incidentCount * 10;
  return Math.max(0, Math.min(100, score));
}
