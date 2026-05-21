import { eq, and, lt, lte, gte, desc, count, sql, isNull, max } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { passengerRequests, requestPools, boardingEvents, transportEntitlements } from '../../infra/db/schema/passenger.js';
import { journeyPassengers, journeys } from '../../infra/db/schema/journeys.js';
import { users } from '../../infra/db/schema/users.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { events as eventsTable } from '../../infra/db/schema/events.js';
import { NotFoundError, ConflictError, GateError } from '../../shared/errors.js';
import { getDirectionsMatrix } from '../../shared/mapbox.js';
import { paginationMeta } from '../../shared/pagination.js';
import { redis } from '../../infra/redis/client.js';
import { getQueue } from '../../infra/queue/bull.js';
import type { CreateRequestInput } from './passenger.schema.js';

let requestCounter = 0;
let requestCounterInitialized = false;

async function generateRequestNo(): Promise<string> {
  if (!requestCounterInitialized) {
    const [row] = await db.select({ maxNo: sql<string>`MAX(request_no)` }).from(passengerRequests);
    if (row?.maxNo) {
      const parts = row.maxNo.split('-');
      const numeric = parseInt(parts[2] ?? '1000', 10);
      requestCounter = isNaN(numeric) ? 1000 : numeric;
    } else {
      requestCounter = 1000;
    }
    requestCounterInitialized = true;
  }
  requestCounter++;
  return `PR-${new Date().getFullYear().toString().slice(-2)}-${String(requestCounter).padStart(5, '0')}`;
}

// ═══════════════════════════════════════════
// REQUESTS
// ═══════════════════════════════════════════

export async function listRequests(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; userId?: string;
}) {
  const conditions = [eq(passengerRequests.orgId, tenantId)];

  if (query.status) conditions.push(eq(passengerRequests.status, query.status));
  if (query.userId) conditions.push(eq(passengerRequests.userId, query.userId));
  if (query.cursor) conditions.push(lt(passengerRequests.id, query.cursor));

  const rows = await db.select().from(passengerRequests)
    .where(and(...conditions))
    .orderBy(desc(passengerRequests.requestedTime))
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getRequest(tenantId: string, requestId: string) {
  const rows = await db.select().from(passengerRequests)
    .where(and(eq(passengerRequests.id, requestId), eq(passengerRequests.orgId, tenantId)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Passenger Request', requestId);
  return rows[0];
}

export async function createRequest(tenantId: string, userId: string, input: CreateRequestInput) {
  // Entitlement check — must have active entitlement covering the requested time
  const requestedDate = new Date(input.requestedTime);
  const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][requestedDate.getDay()];

  const entitlementRows = await db.select({ id: transportEntitlements.id, allowedDays: transportEntitlements.allowedDays })
    .from(transportEntitlements)
    .where(and(
      eq(transportEntitlements.userId, userId),
      eq(transportEntitlements.orgId, tenantId),
      eq(transportEntitlements.status, 'active'),
      lte(transportEntitlements.validityStart, requestedDate),
      gte(transportEntitlements.validityEnd, requestedDate),
    ));

  if (entitlementRows.length > 0) {
    // Check allowed days if specified
    const validEntitlement = entitlementRows.find(e => {
      if (!e.allowedDays || e.allowedDays.length === 0) return true;
      return e.allowedDays.includes(dayName);
    });
    if (!validEntitlement) {
      throw Object.assign(new Error('No valid transport entitlement for this day/time'), {
        statusCode: 422,
        code: 'ENTITLEMENT_INVALID',
      });
    }
  }
  // If no entitlements exist at all, allow (open org with no entitlement restriction)

  const [request] = await db.insert(passengerRequests).values({
    requestNo: await generateRequestNo(),
    userId,
    ...input,
    requestedTime: new Date(input.requestedTime),
    status: 'approved', // auto-approve — JM manually reviews via pool assignment
    orgId: tenantId,
  }).returning();

  return request;
}

export async function updateRequest(tenantId: string, requestId: string, userId: string, input: Partial<CreateRequestInput>) {
  const existing = await getRequest(tenantId, requestId);

  if (existing.userId !== userId) throw new ConflictError('Can only update own requests');
  if (existing.status !== 'pending') throw new ConflictError(`Cannot update request in '${existing.status}' status`);

  const [updated] = await db.update(passengerRequests).set({
    ...input,
    requestedTime: input.requestedTime ? new Date(input.requestedTime) : undefined,
    updatedAt: new Date(),
  }).where(eq(passengerRequests.id, requestId)).returning();

  return updated;
}

export async function cancelRequest(tenantId: string, requestId: string, userId: string) {
  const existing = await getRequest(tenantId, requestId);

  if (existing.userId !== userId) throw new ConflictError('Can only cancel own requests');
  if (existing.status !== 'pending') throw new ConflictError(`Cannot cancel request in '${existing.status}' status`);

  await db.update(passengerRequests).set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(passengerRequests.id, requestId));
}

// ═══════════════════════════════════════════
// POOLS
// ═══════════════════════════════════════════

export async function listPools(tenantId: string) {
  return db.select().from(requestPools)
    .where(eq(requestPools.orgId, tenantId))
    .orderBy(desc(requestPools.createdAt));
}

export async function createPool(tenantId: string, plannerId: string, input: {
  requestIds: string[]; shiftTime?: string; pickupArea?: string; dropArea?: string;
}) {
  const [pool] = await db.insert(requestPools).values({
    plannerId,
    shiftTime: input.shiftTime ? new Date(input.shiftTime) : null,
    pickupArea: input.pickupArea,
    dropArea: input.dropArea,
    requestCount: String(input.requestIds.length),
    capacityNeeded: String(input.requestIds.length),
    orgId: tenantId,
  }).returning();

  // Link requests to pool
  for (const reqId of input.requestIds) {
    await db.update(passengerRequests).set({
      poolId: pool.id,
      status: 'pooled',
      updatedAt: new Date(),
    }).where(eq(passengerRequests.id, reqId));
  }

  return pool;
}

export async function assignPool(tenantId: string, poolId: string, input: {
  vehicleId: string; driverId: string;
}) {
  const rows = await db.select().from(requestPools)
    .where(and(eq(requestPools.id, poolId), eq(requestPools.orgId, tenantId)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Pool', poolId);

  const [updated] = await db.update(requestPools).set({
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    status: 'assigned',
    updatedAt: new Date(),
  }).where(eq(requestPools.id, poolId)).returning();

  // Update requests status
  await db.update(passengerRequests).set({ status: 'assigned', updatedAt: new Date() })
    .where(eq(passengerRequests.poolId, poolId));

  return updated;
}

// ═══════════════════════════════════════════
// BOARDING
// ═══════════════════════════════════════════

export async function recordBoarding(tenantId: string, journeyId: string, input: {
  passengerId?: string; method: string; lat?: number; lon?: number; exceptionNote?: string;
}) {
  // Fetch journey + vehicle for capacity check
  const journeyRows = await db.select({
    id: journeys.id,
    vehicleId: journeys.vehicleId,
    orgId: journeys.orgId,
  }).from(journeys).where(and(eq(journeys.id, journeyId), eq(journeys.orgId, tenantId))).limit(1);

  if (!journeyRows[0]) throw new NotFoundError('Journey', journeyId);
  const journey = journeyRows[0];

  // Fetch vehicle seat count
  const vehicleRows = await db.select({ seatCount: vehicles.seatCount })
    .from(vehicles).where(eq(vehicles.id, journey.vehicleId)).limit(1);
  const seatCount = vehicleRows[0]?.seatCount ?? 14;

  // Build manifest: approved passengers on this journey
  const manifestRows = await db.select({
    id: journeyPassengers.id,
    passengerId: journeyPassengers.passengerId,
    employeeId: journeyPassengers.employeeId,
    passengerName: journeyPassengers.passengerName,
  }).from(journeyPassengers).where(eq(journeyPassengers.journeyId, journeyId));

  const manifestByPassengerId = new Map(
    manifestRows.filter(r => r.passengerId).map(r => [r.passengerId!, r])
  );
  const manifestByEmployeeId = new Map(
    manifestRows.filter(r => r.employeeId).map(r => [r.employeeId!, r])
  );

  // Validate based on method
  let validationResult: string;
  let exceptionNote: string | undefined = input.exceptionNote;
  let resolvedPassengerId: string | undefined = input.passengerId;

  switch (input.method) {
    case 'nfc':
    case 'qr': {
      // NFC/QR tap supplies passengerId — UUID, email, or employee ref
      if (!input.passengerId) {
        validationResult = 'exception';
        exceptionNote = `${input.method.toUpperCase()} scan yielded no passenger ID`;
      } else {
        // Resolve passengerId: try as UUID first, then email lookup
        const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.passengerId);
        let resolvedId = input.passengerId;

        if (!isUuidFormat) {
          // Treat as email — look up user UUID
          const userRows = await db.select({ id: users.id }).from(users)
            .where(eq(users.email, input.passengerId)).limit(1);
          if (userRows[0]) {
            resolvedId = userRows[0].id;
            resolvedPassengerId = resolvedId;
          } else {
            // Unknown passenger — not a valid email/ID in the system
            validationResult = 'exception';
            exceptionNote = 'Passenger not found in system';
            resolvedPassengerId = undefined; // cannot insert non-UUID into passengerId column
            break;
          }
        }

        if (manifestByPassengerId.has(resolvedId)) {
          validationResult = 'valid';
          resolvedPassengerId = resolvedId;
        } else if (manifestRows.length === 0) {
          // No formal manifest — check if passenger has an approved request for this org
          const requestRows = await db.select({ id: passengerRequests.id })
            .from(passengerRequests)
            .where(and(
              eq(passengerRequests.userId, resolvedId),
              eq(passengerRequests.orgId, tenantId),
              sql`${passengerRequests.status} IN ('approved', 'pooled', 'assigned')`,
            )).limit(1);

          if (requestRows[0]) {
            validationResult = 'valid';
            resolvedPassengerId = resolvedId;
          } else {
            validationResult = 'exception';
            exceptionNote = 'No approved transport request for this passenger';
          }
        } else {
          validationResult = 'not_on_manifest';
          exceptionNote = 'Passenger not on manifest';
        }
      }
      break;
    }
    case 'employee_id': {
      // Lookup by employee ID string on manifest
      if (!input.passengerId) {
        validationResult = 'exception';
        exceptionNote = 'Employee ID not provided';
      } else {
        // passengerId field carries the employeeId string for this method
        const manifestEntry = manifestByEmployeeId.get(input.passengerId)
          ?? manifestByPassengerId.get(input.passengerId);
        if (!manifestEntry) {
          validationResult = 'not_on_manifest';
          exceptionNote = 'Employee ID not on manifest';
        } else {
          validationResult = 'valid';
          resolvedPassengerId = manifestEntry.passengerId ?? undefined;
        }
      }
      break;
    }
    case 'manual': {
      if (!input.passengerId) {
        validationResult = 'exception';
        exceptionNote = 'Manual override requires passenger ID';
      } else if (!manifestByPassengerId.has(input.passengerId)) {
        validationResult = 'exception';
        exceptionNote = 'Manual override without manifest entry';
      } else {
        validationResult = 'valid';
      }
      break;
    }
    default: {
      validationResult = 'exception';
      exceptionNote = `Unknown boarding method: ${input.method}`;
    }
  }

  // Count current valid boardings for this journey
  const boardingCountRows = await db.select({ cnt: count() })
    .from(boardingEvents)
    .where(and(
      eq(boardingEvents.journeyId, journeyId),
      eq(boardingEvents.validationResult, 'valid'),
    ));
  const currentValidBoardings = Number(boardingCountRows[0]?.cnt ?? 0);

  // Capacity check — 1 seat reserved for driver
  const availableSeats = seatCount - 1;
  if (validationResult === 'valid' && currentValidBoardings >= availableSeats) {
    const overCapacityPayload = JSON.stringify({
      type: 'capacity_exceeded',
      journeyId,
      vehicleId: journey.vehicleId,
      seatCount,
      currentBoardings: currentValidBoardings,
    });
    await redis.publish('events:severity:critical', overCapacityPayload);
    await db.insert(eventsTable).values({
      vehicleId: journey.vehicleId,
      journeyId,
      eventType: 'capacity_exceeded',
      severity: 'critical',
      lat: String(input.lat ?? 0),
      lon: String(input.lon ?? 0),
      details: { seatCount, currentBoardings: currentValidBoardings },
      recordedAt: new Date(),
      orgId: tenantId,
    });
    throw new GateError(`Vehicle at capacity: ${availableSeats} passenger seats, ${currentValidBoardings} already boarded`);
  }

  // Insert boarding event
  const [event] = await db.insert(boardingEvents).values({
    journeyId,
    passengerId: resolvedPassengerId,
    method: input.method,
    validationResult,
    lat: input.lat != null ? String(input.lat) : null,
    lon: input.lon != null ? String(input.lon) : null,
    exceptionFlag: validationResult !== 'valid' ? 'true' : 'false',
    exceptionNote,
  }).returning();

  // Headcount reconciliation — only check after a valid boarding
  if (validationResult === 'valid') {
    const newValidCount = currentValidBoardings + 1;
    const manifestCount = manifestRows.length;
    if (newValidCount > manifestCount) {
      const mismatchPayload = JSON.stringify({
        type: 'headcount_mismatch',
        journeyId,
        manifestCount,
        actualBoardings: newValidCount,
      });
      await redis.publish('events:severity:critical', mismatchPayload);
      await db.insert(eventsTable).values({
        vehicleId: journey.vehicleId,
        journeyId,
        eventType: 'headcount_mismatch',
        severity: 'warning',
        lat: String(input.lat ?? 0),
        lon: String(input.lon ?? 0),
        details: { manifestCount, actualBoardings: newValidCount },
        recordedAt: new Date(),
        orgId: tenantId,
      });
    }
  }

  return event;
}

// ═══════════════════════════════════════════
// AUTO-POOL ENGINE
// ═══════════════════════════════════════════

const DEFAULT_POOL_CAPACITY = 14; // passengers (assumes 15-seat vehicle, 1 driver)
const SHIFT_BUCKET_MINUTES = 15;

function shiftBucket(dt: Date): string {
  const rounded = Math.floor(dt.getMinutes() / SHIFT_BUCKET_MINUTES) * SHIFT_BUCKET_MINUTES;
  return `${dt.toISOString().slice(0, 10)}T${String(dt.getHours()).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`;
}

/**
 * Auto-pool approved requests that are not yet pooled.
 * Groups by (pickupArea, dropArea, shiftBucket) then bin-packs using First Fit Decreasing.
 * Returns created pool IDs.
 */
export async function autoPool(orgId: string): Promise<Array<{ id: string; requests: Array<{ id: string }> }>> {
  // Fetch approved, un-pooled requests
  const requests = await db.select().from(passengerRequests)
    .where(and(
      eq(passengerRequests.orgId, orgId),
      eq(passengerRequests.status, 'approved'),
      isNull(passengerRequests.poolId),
    ))
    .orderBy(passengerRequests.requestedTime);

  if (requests.length === 0) return [];

  // Group by (pickupArea, dropArea, shiftBucket)
  const groups = new Map<string, typeof requests>();
  for (const req of requests) {
    const bucket = shiftBucket(req.requestedTime);
    const pickupKey = (req as Record<string, unknown>)['pickupLat'] != null && (req as Record<string, unknown>)['pickupLon'] != null
      ? `${Math.round(Number((req as Record<string, unknown>)['pickupLat']) * 100) / 100},${Math.round(Number((req as Record<string, unknown>)['pickupLon']) * 100) / 100}`
      : (req.pickupName ?? '');
    const dropKey = (req as Record<string, unknown>)['dropLat'] != null && (req as Record<string, unknown>)['dropLon'] != null
      ? `${Math.round(Number((req as Record<string, unknown>)['dropLat']) * 100) / 100},${Math.round(Number((req as Record<string, unknown>)['dropLon']) * 100) / 100}`
      : (req.dropName ?? '');
    const key = `${pickupKey}|${dropKey}|${bucket}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(req);
  }

  // Merge groups within 15-min road travel time using Directions matrix
  if (groups.size > 1 && groups.size <= 25) {
    const groupKeys = [...groups.keys()];
    const groupReps = groupKeys.map(k => {
      const first = groups.get(k)![0];
      return {
        lat: Number((first as Record<string, unknown>)['pickupLat']) || 0,
        lon: Number((first as Record<string, unknown>)['pickupLon']) || 0,
      };
    });
    const hasCoords = groupReps.every(r => r.lat !== 0 && r.lon !== 0);
    if (hasCoords) {
      const matrix = await getDirectionsMatrix(groupReps, groupReps).catch(() => null);
      if (matrix) {
        for (let i = 0; i < groupKeys.length; i++) {
          for (let j = i + 1; j < groupKeys.length; j++) {
            const travelTime = matrix[i]?.[j] ?? Infinity;
            if (travelTime < 900) { // 15 minutes
              const targetKey = groupKeys[i];
              const srcKey = groupKeys[j];
              if (groups.has(srcKey) && groups.has(targetKey)) {
                groups.get(targetKey)!.push(...groups.get(srcKey)!);
                groups.delete(srcKey);
              }
            }
          }
        }
      }
    }
  }

  const createdPools: Array<{ id: string; requests: Array<{ id: string }> }> = [];
  // Track which requests go into each pool
  const poolRequestMap = new Map<string, string[]>();

  for (const [groupKey, groupRequests] of groups) {
    const parts = groupKey.split('|');
    const pickupArea = parts[0] || undefined;
    const dropArea = parts[1] || undefined;
    const shiftTime = groupRequests[0].requestedTime;

    // Sort: priority desc (urgent > high > normal), then requestedTime asc
    const priorityOrder: Record<string, number> = { urgent: 3, high: 2, normal: 1 };
    groupRequests.sort((a, b) => {
      const pDiff = (priorityOrder[b.priority] ?? 1) - (priorityOrder[a.priority] ?? 1);
      if (pDiff !== 0) return pDiff;
      return a.requestedTime.getTime() - b.requestedTime.getTime();
    });

    // Bin-pack: First Fit Decreasing
    const bins: Array<{ poolId: string; count: number }> = [];

    for (const req of groupRequests) {
      // Find first bin with capacity
      let placed = false;
      for (const bin of bins) {
        if (bin.count < DEFAULT_POOL_CAPACITY) {
          bin.count++;
          // Link request to pool
          await db.update(passengerRequests).set({
            poolId: bin.poolId,
            status: 'pooled',
            updatedAt: new Date(),
          }).where(eq(passengerRequests.id, req.id));
          poolRequestMap.get(bin.poolId)?.push(req.id);
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Create new pool
        const [pool] = await db.insert(requestPools).values({
          shiftTime,
          pickupArea,
          dropArea,
          requestCount: '1',
          capacityNeeded: '1',
          status: 'building',
          orgId,
        }).returning();

        bins.push({ poolId: pool.id, count: 1 });
        createdPools.push({ id: pool.id, requests: [] });
        poolRequestMap.set(pool.id, [req.id]);

        await db.update(passengerRequests).set({
          poolId: pool.id,
          status: 'pooled',
          updatedAt: new Date(),
        }).where(eq(passengerRequests.id, req.id));
      }
    }

    // Update requestCount on each bin
    for (const bin of bins) {
      await db.update(requestPools).set({
        requestCount: String(bin.count),
        capacityNeeded: String(bin.count),
        updatedAt: new Date(),
      }).where(eq(requestPools.id, bin.poolId));
    }
  }

  // Build final result with request IDs
  for (const pool of createdPools) {
    pool.requests = (poolRequestMap.get(pool.id) ?? []).map(id => ({ id }));
  }

  return createdPools;
}

/**
 * Schedule recurring auto-pool job (every 10 minutes) for all orgs.
 */
export async function scheduleAutoPoolCron() {
  const queue = getQueue('auto-pool');
  // BullMQ repeatable job
  await queue.add('run', {}, {
    repeat: { every: 10 * 60 * 1000 },
    jobId: 'auto-pool-cron',
    removeOnComplete: 1,
  });
}
