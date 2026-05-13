import { eq, and, lt, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { passengerRequests, requestPools, boardingEvents } from '../../infra/db/schema/passenger.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import type { CreateRequestInput } from './passenger.schema.js';

let requestCounter = 1000;
function generateRequestNo(): string {
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
  const [request] = await db.insert(passengerRequests).values({
    requestNo: generateRequestNo(),
    userId,
    ...input,
    requestedTime: new Date(input.requestedTime),
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
  // Validate passenger is on manifest — simplified check
  const validationResult = input.passengerId ? 'valid' : 'exception';

  const [event] = await db.insert(boardingEvents).values({
    journeyId,
    passengerId: input.passengerId,
    method: input.method,
    validationResult,
    lat: input.lat != null ? String(input.lat) : null,
    lon: input.lon != null ? String(input.lon) : null,
    exceptionFlag: validationResult === 'exception' ? 'true' : 'false',
    exceptionNote: input.exceptionNote,
  }).returning();

  return event;
}
