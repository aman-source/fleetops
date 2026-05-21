import { eq, and, isNull, lt, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { journeys, journeyPassengers, journeyWaypoints, journeyApprovals } from '../../infra/db/schema/journeys.js';
import { checkJobOnJourneyClose } from '../jobs/jobs.service.js';
import { checkSegmentsOnJourneyClose } from '../logistics/logistics.service.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { NotFoundError, ConflictError, GateError, BadRequestError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { evaluateAllGates, type AllGatesResult } from './gates.js';
import { redis } from '../../infra/redis/client.js';
import type { CreateJourneyInput, UpdateJourneyInput } from './journey.schema.js';
import { triggerWorkflow } from '../workflows/executor.js';
import { getDirectionsRoute, getMapMatchedTrail } from '../../shared/mapbox.js';
import { telemetryLogs } from '../../infra/db/schema/index.js';

// Journey number counter — initialized from DB max on first use to survive restarts
let journeyCounter = 0;
let journeyCounterInitialized = false;

async function generateJourneyNo(): Promise<string> {
  if (!journeyCounterInitialized) {
    const [row] = await db.select({ maxNo: sql<string>`MAX(journey_no)` }).from(journeys);
    if (row?.maxNo) {
      const numeric = parseInt(row.maxNo.split('-')[2] ?? '4000', 10);
      journeyCounter = isNaN(numeric) ? 4000 : numeric;
    } else {
      journeyCounter = 4000;
    }
    journeyCounterInitialized = true;
  }
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
    journeyNo: await generateJourneyNo(),
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

  const riskLevel = gateResult.riskLevel ?? 'L';
  const riskScore = gateResult.riskScore ?? 0;

  // Build approval chain: submitter (auto) → journey_mgr → hse (if REVIEW/H) → gm (if H)
  const hasHSEReview = gateResult.gates.some((g) => g.gateNumber === 6 && g.status === 'REVIEW')
    || riskLevel === 'H';

  const approvalSteps: Array<{ journeyId: string; step: string; userId?: string; decision: string; decidedAt?: Date }> = [
    { journeyId, step: 'submitter', userId, decision: 'approved', decidedAt: new Date() },
    { journeyId, step: 'journey_mgr', decision: 'pending' },
    ...(hasHSEReview ? [{ journeyId, step: 'hse', decision: 'pending' }] : []),
    ...(riskLevel === 'H' ? [{ journeyId, step: 'gm', decision: 'pending' }] : []),
  ];

  await db.insert(journeyApprovals).values(approvalSteps);

  const [updated] = await db.update(journeys).set({
    status: 'pending_approval',
    riskLevel,
    riskScore: String(riskScore),
    updatedAt: new Date(),
  }).where(eq(journeys.id, journeyId)).returning();

  // Fire workflow if configured (non-blocking — failure doesn't block submit)
  triggerWorkflow(tenantId, 'JM-APPROVAL', 'journey', updated.id, {
    journeyId: updated.id,
    riskLevel,
    riskScore,
    submittedBy: userId,
  }).catch(() => {});

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

  // Map role → approval step name
  const roleToStep: Record<string, string> = {
    journey_manager: 'journey_mgr',
    hse: 'hse',
    gm: 'gm',
    admin: 'journey_mgr', // admin can approve any step
  };
  const step = roleToStep[userRole];

  // Find next pending step this user can approve
  const allPending = await db.select().from(journeyApprovals)
    .where(and(eq(journeyApprovals.journeyId, journeyId), eq(journeyApprovals.decision, 'pending')))
    .orderBy(journeyApprovals.createdAt);

  const matchingStep = allPending.find(s => s.step === step) ?? (userRole === 'admin' ? allPending[0] : null);

  if (!matchingStep) {
    throw new ConflictError(`No pending approval step for role '${userRole}' on this journey`);
  }

  // Mark step as approved
  await db.update(journeyApprovals).set({
    userId, decision: 'approved', decidedAt: new Date(),
  }).where(eq(journeyApprovals.id, matchingStep.id));

  // Check if all approval steps are done
  const remainingPending = await db.select().from(journeyApprovals)
    .where(and(eq(journeyApprovals.journeyId, journeyId), eq(journeyApprovals.decision, 'pending')));

  if (remainingPending.length === 0) {
    // All approved — journey is approved
    const [updated] = await db.update(journeys).set({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(journeys.id, journeyId)).returning();

    await redis.publish('journey:approved', JSON.stringify({ journeyId, approvedBy: userId }));

    // Generate route corridor from waypoints (async — errors logged, never thrown)
    generateRouteCorridor(journeyId, 500).catch(() => {});
    generateDirectionsRoute(journeyId).catch((_err: unknown) => {});

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

  // Check for incomplete jobs or unclosed loading segments
  const [hasJobExceptions, hasSegmentExceptions] = await Promise.all([
    checkJobOnJourneyClose(journeyId).catch(() => false),
    checkSegmentsOnJourneyClose(journeyId).catch(() => false),
  ]);
  const finalStatus = (hasJobExceptions || hasSegmentExceptions) ? 'closed_with_exceptions' : 'closed';

  const [updated] = await db.update(journeys).set({
    status: finalStatus,
    actualArrival: new Date(),
    closedBy: userId,
    closedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(journeys.id, journeyId)).returning();

  // Fire-and-forget map matching cleanup
  queueMapMatchingJob(journeyId, journey.vehicleId, journey.actualDeparture ?? null, new Date()).catch(() => {});

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
 * Get approval chain for a journey.
 */
export async function getApprovals(tenantId: string, journeyId: string) {
  await getJourney(tenantId, journeyId);
  return db.select().from(journeyApprovals)
    .where(eq(journeyApprovals.journeyId, journeyId))
    .orderBy(journeyApprovals.createdAt);
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

/**
 * After a journey closes, fetch its GPS telemetry, run through Mapbox Map Matching API,
 * and store the clean road-snapped trail in journeys.snapped_trail.
 * Called fire-and-forget — errors are silently discarded.
 */
async function queueMapMatchingJob(
  journeyId: string,
  vehicleId: string,
  from: Date | null,
  to: Date,
): Promise<void> {
  if (!from) return;

  const rows = await db
    .select({ lat: telemetryLogs.lat, lon: telemetryLogs.lon })
    .from(telemetryLogs)
    .where(and(
      eq(telemetryLogs.vehicleId, vehicleId),
      gte(telemetryLogs.recordedAt, from),
      lte(telemetryLogs.recordedAt, to),
    ))
    .orderBy(telemetryLogs.recordedAt)
    .limit(100);

  const pts = rows
    .filter(r => r.lat && r.lon)
    .map(r => ({ lat: Number(r.lat), lon: Number(r.lon) }));

  if (pts.length < 2) return;

  const snapped = await getMapMatchedTrail(pts);
  if (!snapped) return;

  await db
    .update(journeys)
    .set({ snappedTrail: { type: 'LineString', coordinates: snapped } as unknown as null })
    .where(eq(journeys.id, journeyId));
}

/**
 * Generate route corridor polygon by buffering waypoint linestring.
 * Stored in journey_route_corridors. Called async after journey approval.
 */
async function generateRouteCorridor(journeyId: string, bufferMeters: number = 500) {
  const waypoints = await db.select({
    lat: journeyWaypoints.lat,
    lon: journeyWaypoints.lon,
    sequence: journeyWaypoints.sequence,
  }).from(journeyWaypoints)
    .where(eq(journeyWaypoints.journeyId, journeyId))
    .orderBy(journeyWaypoints.sequence);

  // Need at least 2 waypoints to form a linestring
  if (waypoints.length < 2) return;

  // Delete any existing corridor for this journey
  await db.execute(sql`DELETE FROM journey_route_corridors WHERE journey_id = ${journeyId}`);

  // Build WKT linestring from ordered waypoints
  const pointsWkt = waypoints.map(wp => `${Number(wp.lon)} ${Number(wp.lat)}`).join(', ');

  await db.execute(sql`
    INSERT INTO journey_route_corridors (journey_id, corridor, buffer_meters)
    VALUES (
      ${journeyId},
      ST_Buffer(
        ST_SetSRID(ST_GeomFromText(${'LINESTRING(' + pointsWkt + ')'}), 4326)::GEOGRAPHY,
        ${bufferMeters}
      )::GEOMETRY,
      ${bufferMeters}
    )
  `);
}

/**
 * Fetch road-snapped route from Mapbox Directions API and store in journeys.directions_route.
 * Called async after journey approval — errors are logged, never thrown.
 */
async function generateDirectionsRoute(journeyId: string): Promise<void> {
  const wps = await db
    .select({ lat: journeyWaypoints.lat, lon: journeyWaypoints.lon })
    .from(journeyWaypoints)
    .where(eq(journeyWaypoints.journeyId, journeyId))
    .orderBy(journeyWaypoints.sequence);

  if (wps.length < 2) return;

  const route = await getDirectionsRoute(
    wps.map(w => ({ lat: Number(w.lat), lon: Number(w.lon) })),
    'driving-traffic',
  );

  if (!route) return;

  await db
    .update(journeys)
    .set({ directionsRoute: route.geometry as unknown as null })
    .where(eq(journeys.id, journeyId));
}
