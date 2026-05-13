import { eq, and, isNull, lt, gte, lte, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { journeys, journeyPassengers, journeyWaypoints, journeyApprovals } from '../../infra/db/schema/journeys.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { NotFoundError, ConflictError, GateError, BadRequestError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { evaluateAllGates, type AllGatesResult } from './gates.js';
import type { CreateJourneyInput, UpdateJourneyInput } from './journey.schema.js';

// Journey number counter — in production use a Postgres sequence
let journeyCounter = 4000;

function generateJourneyNo(): string {
  journeyCounter++;
  const year = new Date().getFullYear().toString().slice(-2);
  return `JM-${year}-${String(journeyCounter).padStart(5, '0')}`;
}

export async function listJourneys(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; vehicleId?: string;
  driverId?: string; from?: string; to?: string;
}) {
  const conditions = [eq(journeys.orgId, tenantId), isNull(journeys.deletedAt)];

  if (query.status) conditions.push(eq(journeys.status, query.status));
  if (query.vehicleId) conditions.push(eq(journeys.vehicleId, query.vehicleId));
  if (query.driverId) conditions.push(eq(journeys.driverId, query.driverId));
  if (query.from) conditions.push(gte(journeys.plannedDeparture, new Date(query.from)));
  if (query.to) conditions.push(lte(journeys.plannedDeparture, new Date(query.to)));
  if (query.cursor) conditions.push(lt(journeys.id, query.cursor));

  const rows = await db
    .select()
    .from(journeys)
    .where(and(...conditions))
    .orderBy(desc(journeys.plannedDeparture))
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getJourney(tenantId: string, journeyId: string) {
  const rows = await db.select().from(journeys)
    .where(and(eq(journeys.id, journeyId), eq(journeys.orgId, tenantId), isNull(journeys.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Journey', journeyId);
  return rows[0];
}

export async function createJourney(tenantId: string, userId: string, input: CreateJourneyInput) {
  // Snapshot vehicle status at creation
  const vRows = await db.select({ status: vehicles.status })
    .from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1);

  if (!vRows[0]) throw new NotFoundError('Vehicle', input.vehicleId);

  const vehicleStatus = vRows[0].status;
  if (vehicleStatus !== 'available' && vehicleStatus !== 'conditional') {
    throw new ConflictError(`Vehicle status '${vehicleStatus}' — must be 'available' or 'conditional' to create journey`);
  }

  const [journey] = await db.insert(journeys).values({
    journeyNo: generateJourneyNo(),
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    purpose: input.purpose,
    plannedDeparture: new Date(input.plannedDeparture),
    plannedArrival: new Date(input.plannedArrival),
    emergencyContact: input.emergencyContact,
    vehicleStatusSnapshot: vehicleStatus,
    orgId: tenantId,
    createdBy: userId,
  }).returning();

  // Insert waypoints
  if (input.waypoints?.length) {
    await db.insert(journeyWaypoints).values(
      input.waypoints.map((wp) => ({
        journeyId: journey.id,
        sequence: wp.sequence,
        name: wp.name,
        lat: String(wp.lat),
        lon: String(wp.lon),
        plannedArrival: wp.plannedArrival ? new Date(wp.plannedArrival) : null,
      })),
    );
  }

  // Insert passengers
  if (input.passengers?.length) {
    await db.insert(journeyPassengers).values(
      input.passengers.map((pax) => ({
        journeyId: journey.id,
        passengerName: pax.passengerName,
        employeeId: pax.employeeId,
        department: pax.department,
        pickupPoint: pax.pickupPoint,
      })),
    );
  }

  return journey;
}

export async function updateJourney(tenantId: string, journeyId: string, input: UpdateJourneyInput) {
  const existing = await getJourney(tenantId, journeyId);

  if (existing.status !== 'draft') {
    throw new ConflictError(`Cannot update journey in '${existing.status}' status — must be 'draft'`);
  }

  const [updated] = await db.update(journeys).set({
    ...input,
    plannedDeparture: input.plannedDeparture ? new Date(input.plannedDeparture) : undefined,
    plannedArrival: input.plannedArrival ? new Date(input.plannedArrival) : undefined,
    updatedAt: new Date(),
  }).where(eq(journeys.id, existing.id)).returning();

  return updated;
}

/**
 * Evaluate all 6 Go/No-Go gates for a journey.
 */
export async function evaluateGates(tenantId: string, journeyId: string): Promise<AllGatesResult> {
  const journey = await getJourney(tenantId, journeyId);

  return evaluateAllGates({
    vehicleId: journey.vehicleId,
    driverId: journey.driverId,
    journeyId: journey.id,
    plannedDeparture: journey.plannedDeparture,
    plannedArrival: journey.plannedArrival,
    orgId: tenantId,
  });
}

/**
 * Submit journey for approval — SERVER RE-VALIDATES ALL GATES.
 */
export async function submitJourney(tenantId: string, journeyId: string, userId: string) {
  const journey = await getJourney(tenantId, journeyId);

  if (journey.status !== 'draft') {
    throw new ConflictError(`Cannot submit journey in '${journey.status}' status — must be 'draft'`);
  }

  // RE-VALIDATE ALL GATES SERVER-SIDE — this is THE safety check
  const gateResult = await evaluateAllGates({
    vehicleId: journey.vehicleId,
    driverId: journey.driverId,
    journeyId: journey.id,
    plannedDeparture: journey.plannedDeparture,
    plannedArrival: journey.plannedArrival,
    orgId: tenantId,
  });

  if (!gateResult.canSubmit) {
    const blockedGates = gateResult.gates
      .filter((g) => g.status === 'BLOCK')
      .map((g) => g.gate);

    throw new GateError('Journey cannot be submitted — gates blocked', {
      blockedGates,
      gates: gateResult.gates,
    });
  }

  // Create approval chain
  const hasHSEReview = gateResult.gates.some(
    (g) => g.gateNumber === 6 && g.status === 'REVIEW',
  );

  await db.insert(journeyApprovals).values([
    { journeyId, step: 'submitter', userId, decision: 'approved', decidedAt: new Date() },
    { journeyId, step: 'journey_mgr', decision: 'pending' },
    ...(hasHSEReview ? [{ journeyId, step: 'hse' as const, decision: 'pending' as const }] : []),
  ]);

  // Compute risk
  const hseGate = gateResult.gates.find((g) => g.gateNumber === 6);
  const riskCheck = hseGate?.checks.find((c) => c.name === 'Risk assessment');
  const riskLevel = riskCheck?.message.match(/Risk level: ([LMH])/)?.[1] ?? 'L';

  const [updated] = await db.update(journeys).set({
    status: 'pending_approval',
    riskLevel,
    updatedAt: new Date(),
  }).where(eq(journeys.id, journeyId)).returning();

  return { journey: updated, gates: gateResult };
}

/**
 * Approve journey — by journey manager or HSE.
 */
export async function approveJourney(tenantId: string, journeyId: string, userId: string, userRole: string) {
  const journey = await getJourney(tenantId, journeyId);

  if (journey.status !== 'pending_approval') {
    throw new ConflictError(`Cannot approve journey in '${journey.status}' status`);
  }

  // Find pending approval step for this role
  const step = userRole === 'hse' ? 'hse' : 'journey_mgr';
  const approvalRows = await db.select().from(journeyApprovals)
    .where(and(eq(journeyApprovals.journeyId, journeyId), eq(journeyApprovals.step, step), eq(journeyApprovals.decision, 'pending')));

  if (!approvalRows[0]) {
    throw new ConflictError(`No pending ${step} approval for this journey`);
  }

  // Mark step as approved
  await db.update(journeyApprovals).set({
    userId, decision: 'approved', decidedAt: new Date(),
  }).where(eq(journeyApprovals.id, approvalRows[0].id));

  // Check if all approval steps are done
  const pendingSteps = await db.select().from(journeyApprovals)
    .where(and(eq(journeyApprovals.journeyId, journeyId), eq(journeyApprovals.decision, 'pending')));

  if (pendingSteps.length === 0) {
    // All approved — journey is approved
    const [updated] = await db.update(journeys).set({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(journeys.id, journeyId)).returning();

    return updated;
  }

  return journey;
}

/**
 * Reject journey.
 */
export async function rejectJourney(tenantId: string, journeyId: string, userId: string, reason: string) {
  const journey = await getJourney(tenantId, journeyId);

  if (journey.status !== 'pending_approval') {
    throw new ConflictError(`Cannot reject journey in '${journey.status}' status`);
  }

  const [updated] = await db.update(journeys).set({
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date(),
  }).where(eq(journeys.id, journeyId)).returning();

  // Mark all pending approvals as rejected
  await db.update(journeyApprovals).set({
    userId, decision: 'rejected', reason, decidedAt: new Date(),
  }).where(and(eq(journeyApprovals.journeyId, journeyId), eq(journeyApprovals.decision, 'pending')));

  return updated;
}

/**
 * Activate journey — driver starts the trip.
 */
export async function activateJourney(tenantId: string, journeyId: string) {
  const journey = await getJourney(tenantId, journeyId);

  if (journey.status !== 'approved') {
    throw new ConflictError(`Cannot activate journey in '${journey.status}' status — must be 'approved'`);
  }

  const [updated] = await db.update(journeys).set({
    status: 'active',
    actualDeparture: new Date(),
    updatedAt: new Date(),
  }).where(eq(journeys.id, journeyId)).returning();

  return updated;
}

/**
 * Close journey — trip completed.
 */
export async function closeJourney(tenantId: string, journeyId: string, userId: string) {
  const journey = await getJourney(tenantId, journeyId);

  const closableStatuses = ['active', 'delayed', 'deviated', 'completed'];
  if (!closableStatuses.includes(journey.status)) {
    throw new ConflictError(`Cannot close journey in '${journey.status}' status`);
  }

  const [updated] = await db.update(journeys).set({
    status: 'closed',
    actualArrival: new Date(),
    closedBy: userId,
    closedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(journeys.id, journeyId)).returning();

  return updated;
}

/**
 * Add passenger to journey manifest.
 */
export async function addPassenger(tenantId: string, journeyId: string, input: {
  passengerName: string; passengerId?: string; employeeId?: string; department?: string; pickupPoint?: string;
}) {
  const journey = await getJourney(tenantId, journeyId);

  if (journey.status !== 'draft' && journey.status !== 'approved') {
    throw new ConflictError(`Cannot add passenger to journey in '${journey.status}' status`);
  }

  // Check headcount
  const existingPax = await db.select({ id: journeyPassengers.id })
    .from(journeyPassengers).where(eq(journeyPassengers.journeyId, journeyId));

  const vRows = await db.select({ seatCount: vehicles.seatCount })
    .from(vehicles).where(eq(vehicles.id, journey.vehicleId)).limit(1);

  const seatCount = vRows[0]?.seatCount ?? 0;
  if (existingPax.length + 2 > seatCount) { // +2 = new passenger + driver
    throw new GateError('Headcount exceeds vehicle capacity', {
      passengers: existingPax.length + 1,
      seatCount,
    });
  }

  const [pax] = await db.insert(journeyPassengers).values({
    journeyId,
    passengerName: input.passengerName,
    passengerId: input.passengerId,
    employeeId: input.employeeId,
    department: input.department,
    pickupPoint: input.pickupPoint,
  }).returning();

  return pax;
}

/**
 * Remove passenger from journey manifest.
 */
export async function removePassenger(tenantId: string, journeyId: string, passengerId: string) {
  await getJourney(tenantId, journeyId); // verify access

  await db.delete(journeyPassengers).where(
    and(eq(journeyPassengers.id, passengerId), eq(journeyPassengers.journeyId, journeyId)),
  );
}

/**
 * Get journey passengers.
 */
export async function getPassengers(tenantId: string, journeyId: string) {
  await getJourney(tenantId, journeyId);

  return db.select().from(journeyPassengers)
    .where(eq(journeyPassengers.journeyId, journeyId));
}
