import { eq, and, isNull, lt, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import {
  workOrders, workOrderParts, workOrderPhotos, workOrderActivity, tires,
} from '../../infra/db/schema/maintenance.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { uploadFile } from '../../infra/storage/s3.js';
import { getQueue } from '../../infra/queue/bull.js';
import type {
  CreateWOInput, UpdateWOInput, ReleaseInput, AddPartInput,
  CreateTireInput, UpdateTireInput,
} from './maintenance.schema.js';

let woCounter = 12000;
function generateWONumber(): string {
  woCounter++;
  return `WO-${woCounter}`;
}

// ═══════════════════════════════════════════
// WORK ORDERS
// ═══════════════════════════════════════════

export async function listWorkOrders(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; vehicleId?: string;
  priority?: string; issueType?: string;
}) {
  const conditions = [eq(workOrders.orgId, tenantId), isNull(workOrders.deletedAt)];

  if (query.status) conditions.push(eq(workOrders.status, query.status));
  if (query.vehicleId) conditions.push(eq(workOrders.vehicleId, query.vehicleId));
  if (query.priority) conditions.push(eq(workOrders.priority, query.priority));
  if (query.issueType) conditions.push(eq(workOrders.issueType, query.issueType));
  if (query.cursor) conditions.push(lt(workOrders.id, query.cursor));

  const rows = await db.select().from(workOrders)
    .where(and(...conditions))
    .orderBy(desc(workOrders.openedAt))
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getWorkOrder(tenantId: string, woId: string) {
  const rows = await db.select().from(workOrders)
    .where(and(eq(workOrders.id, woId), eq(workOrders.orgId, tenantId), isNull(workOrders.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Work Order', woId);
  return rows[0];
}

export async function createWorkOrder(tenantId: string, userId: string, input: CreateWOInput) {
  // Set vehicle to under_maintenance
  await db.update(vehicles).set({ status: 'under_maintenance', updatedAt: new Date() })
    .where(eq(vehicles.id, input.vehicleId));

  const [wo] = await db.insert(workOrders).values({
    woNumber: generateWONumber(),
    ...input,
    targetHours: input.targetHours != null ? String(input.targetHours) : null,
    openedBy: userId,
    orgId: tenantId,
  }).returning();

  await logActivity(wo.id, userId, 'opened', { title: input.title, issueType: input.issueType });

  return wo;
}

export async function updateWorkOrder(tenantId: string, woId: string, userId: string, input: UpdateWOInput) {
  const existing = await getWorkOrder(tenantId, woId);

  if (existing.status === 'closed') {
    throw new ConflictError('Cannot update closed work order');
  }

  const oldStatus = existing.status;

  const [updated] = await db.update(workOrders).set({
    ...input,
    updatedAt: new Date(),
  }).where(eq(workOrders.id, existing.id)).returning();

  if (input.status && input.status !== oldStatus) {
    await logActivity(existing.id, userId, 'status_changed', { from: oldStatus, to: input.status });
  }

  return updated;
}

/**
 * Release decision — GO / CONDITIONAL / NO-GO
 */
export async function releaseVehicle(tenantId: string, woId: string, userId: string, input: ReleaseInput) {
  const wo = await getWorkOrder(tenantId, woId);

  if (wo.status === 'closed') {
    throw new ConflictError('Work order already closed');
  }

  if (input.decision === 'conditional' && !input.releaseExpiry) {
    throw new BadRequestError('Conditional release requires releaseExpiry date');
  }

  // Update work order
  const [updated] = await db.update(workOrders).set({
    releaseDecision: input.decision,
    releaseReason: input.reason,
    releaseExpiry: input.decision === 'conditional' && input.releaseExpiry
      ? new Date(input.releaseExpiry) : null,
    status: input.decision === 'no_go' ? wo.status : 'ready',
    updatedAt: new Date(),
  }).where(eq(workOrders.id, wo.id)).returning();

  // Update vehicle status based on decision
  let vehicleStatus: string;
  switch (input.decision) {
    case 'go':
      vehicleStatus = 'available';
      break;
    case 'conditional':
      vehicleStatus = 'conditional';
      // Schedule auto-revert to no_go on expiry
      if (input.releaseExpiry) {
        const delay = new Date(input.releaseExpiry).getTime() - Date.now();
        if (delay > 0) {
          const queue = getQueue('conditional-expiry');
          await queue.add('conditional-revert', {
            vehicleId: wo.vehicleId,
            woId: wo.id,
          }, {
            delay,
            jobId: `conditional-${wo.vehicleId}-${wo.id}`,
            removeOnComplete: true,
          });
        }
      }
      break;
    case 'no_go':
      vehicleStatus = 'no_go';
      break;
    default:
      vehicleStatus = 'under_maintenance';
  }

  await db.update(vehicles).set({
    status: vehicleStatus,
    conditionalExpiry: input.decision === 'conditional' && input.releaseExpiry
      ? new Date(input.releaseExpiry) : null,
    updatedAt: new Date(),
  }).where(eq(vehicles.id, wo.vehicleId));

  await logActivity(wo.id, userId, 'released', {
    decision: input.decision,
    reason: input.reason,
    expiry: input.releaseExpiry,
  });

  return updated;
}

/**
 * HSE co-sign approval.
 */
export async function hseApprove(tenantId: string, woId: string, userId: string) {
  const wo = await getWorkOrder(tenantId, woId);

  if (wo.status !== 'hse_review') {
    throw new ConflictError(`Work order not in HSE review status (current: ${wo.status})`);
  }

  const [updated] = await db.update(workOrders).set({
    hseApprovedBy: userId,
    hseApprovedAt: new Date(),
    status: 'ready',
    updatedAt: new Date(),
  }).where(eq(workOrders.id, wo.id)).returning();

  await logActivity(wo.id, userId, 'hse_approved', {});

  return updated;
}

/**
 * Add part to work order.
 */
export async function addPart(tenantId: string, woId: string, userId: string, input: AddPartInput) {
  await getWorkOrder(tenantId, woId);

  const [part] = await db.insert(workOrderParts).values({
    woId,
    ...input,
  }).returning();

  await logActivity(woId, userId, 'part_added', { partName: input.partName, partNumber: input.partNumber });

  return part;
}

/**
 * Upload photo to work order.
 */
export async function addPhoto(
  tenantId: string, woId: string, userId: string,
  label: string | undefined,
  file: { buffer: Buffer; mimetype: string; filename: string },
) {
  await getWorkOrder(tenantId, woId);

  const key = `work-orders/${woId}/${Date.now()}-${file.filename}`;
  await uploadFile(key, file.buffer, file.mimetype);

  const [photo] = await db.insert(workOrderPhotos).values({
    woId,
    label,
    fileUrl: key,
    uploadedBy: userId,
  }).returning();

  await logActivity(woId, userId, 'photo_added', { label, fileUrl: key });

  return photo;
}

/**
 * Get work order activity timeline.
 */
export async function getActivity(tenantId: string, woId: string) {
  await getWorkOrder(tenantId, woId);

  return db.select().from(workOrderActivity)
    .where(eq(workOrderActivity.woId, woId))
    .orderBy(desc(workOrderActivity.timestamp));
}

// ═══════════════════════════════════════════
// TIRES
// ═══════════════════════════════════════════

export async function listTires(tenantId: string, query: {
  cursor?: string; limit: number; vehicleId?: string; status?: string;
}) {
  const conditions = [eq(tires.orgId, tenantId)];

  if (query.vehicleId) conditions.push(eq(tires.vehicleId, query.vehicleId));
  if (query.status) conditions.push(eq(tires.status, query.status));
  if (query.cursor) conditions.push(lt(tires.id, query.cursor));

  const rows = await db.select().from(tires)
    .where(and(...conditions))
    .orderBy(tires.createdAt)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function createTire(tenantId: string, input: CreateTireInput) {
  const [tire] = await db.insert(tires).values({
    ...input,
    treadDepthMm: input.treadDepthMm != null ? String(input.treadDepthMm) : null,
    pressurePsi: input.pressurePsi != null ? String(input.pressurePsi) : null,
    orgId: tenantId,
  }).returning();
  return tire;
}

export async function updateTire(tenantId: string, tireId: string, input: UpdateTireInput) {
  const rows = await db.select().from(tires)
    .where(and(eq(tires.id, tireId), eq(tires.orgId, tenantId))).limit(1);

  if (!rows[0]) throw new NotFoundError('Tire', tireId);

  const [updated] = await db.update(tires).set({
    ...input,
    treadDepthMm: input.treadDepthMm != null ? String(input.treadDepthMm) : undefined,
    pressurePsi: input.pressurePsi != null ? String(input.pressurePsi) : undefined,
    updatedAt: new Date(),
  }).where(eq(tires.id, tireId)).returning();

  return updated;
}

// ── Helpers ──

async function logActivity(woId: string, userId: string, action: string, details: Record<string, unknown>) {
  await db.insert(workOrderActivity).values({ woId, userId, action, details });
}
