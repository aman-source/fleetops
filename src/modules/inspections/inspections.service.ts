import { eq, and, isNull, lt, gte, lte } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import {
  inspectionCampaigns, inspectionAssignments, inspectionItems, inspectionResponses,
} from '../../infra/db/schema/inspections.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { getQueue, createWorker } from '../../infra/queue/bull.js';
import type { CreateCampaignInput, UpdateAssignmentInput, SubmitAssignmentInput } from './inspections.schema.js';

export async function listCampaigns(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; campaignType?: string;
}) {
  const conditions = [eq(inspectionCampaigns.orgId, tenantId), isNull(inspectionCampaigns.deletedAt)];

  if (query.status) conditions.push(eq(inspectionCampaigns.status, query.status));
  if (query.campaignType) conditions.push(eq(inspectionCampaigns.campaignType, query.campaignType));
  if (query.cursor) conditions.push(lt(inspectionCampaigns.id, query.cursor));

  const rows = await db.select().from(inspectionCampaigns)
    .where(and(...conditions))
    .orderBy(inspectionCampaigns.startDate)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getCampaign(tenantId: string, campaignId: string) {
  const rows = await db.select().from(inspectionCampaigns)
    .where(and(
      eq(inspectionCampaigns.id, campaignId),
      eq(inspectionCampaigns.orgId, tenantId),
      isNull(inspectionCampaigns.deletedAt),
    )).limit(1);

  if (!rows[0]) throw new NotFoundError('InspectionCampaign', campaignId);

  const items = await db.select().from(inspectionItems)
    .where(eq(inspectionItems.campaignId, campaignId));

  return { ...rows[0], items };
}

export async function createCampaign(tenantId: string, userId: string, userRole: string, input: CreateCampaignInput) {
  const [campaign] = await db.insert(inspectionCampaigns).values({
    name: input.name,
    campaignType: input.campaignType,
    description: input.description,
    vehicleScope: input.vehicleScope,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    status: 'draft',
    createdBy: userId,
    createdByRole: userRole,
    orgId: tenantId,
  }).returning();

  // Insert inspection items
  if (input.items.length > 0) {
    await db.insert(inspectionItems).values(
      input.items.map(item => ({
        campaignId: campaign.id,
        label: item.label,
        description: item.description,
        isCritical: item.isCritical ? 1 : 0,
      }))
    );
  }

  return getCampaign(tenantId, campaign.id);
}

/**
 * Schedule: auto-create assignments from vehicle scope, transition to 'scheduled'.
 */
export async function scheduleCampaign(tenantId: string, campaignId: string) {
  const campaign = await getCampaign(tenantId, campaignId);

  if (campaign.status !== 'draft') {
    throw new ConflictError(`Campaign is not in draft status (current: ${campaign.status})`);
  }

  // Query vehicles matching scope
  const scope = campaign.vehicleScope as {
    vehicleType?: string; projectId?: string; ageYears?: number; vehicleIds?: string[];
  };

  let vehicleRows: { id: string }[];

  if (scope.vehicleIds && scope.vehicleIds.length > 0) {
    vehicleRows = await db.select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.orgId, tenantId), isNull(vehicles.deletedAt)));
    vehicleRows = vehicleRows.filter(v => scope.vehicleIds!.includes(v.id));
  } else {
    const conditions = [eq(vehicles.orgId, tenantId), isNull(vehicles.deletedAt)];
    if (scope.vehicleType) conditions.push(eq(vehicles.type, scope.vehicleType));
    if (scope.projectId) conditions.push(eq(vehicles.projectId, scope.projectId));
    vehicleRows = await db.select({ id: vehicles.id }).from(vehicles).where(and(...conditions));
  }

  if (vehicleRows.length === 0) {
    throw new ConflictError('No vehicles match the campaign scope criteria');
  }

  // Create assignments
  await db.insert(inspectionAssignments).values(
    vehicleRows.map(v => ({
      campaignId,
      vehicleId: v.id,
      dueDate: campaign.endDate,
      status: 'pending' as const,
    }))
  );

  // Transition to scheduled
  const [updated] = await db.update(inspectionCampaigns).set({
    status: 'scheduled',
    updatedAt: new Date(),
  }).where(eq(inspectionCampaigns.id, campaignId)).returning();

  // Schedule BullMQ jobs to auto-activate at startDate and complete at endDate
  const now = Date.now();
  const queue = getQueue('inspection-campaigns');

  const activateDelay = new Date(campaign.startDate).getTime() - now;
  if (activateDelay > 0) {
    await queue.add('activate', { campaignId, tenantId }, {
      delay: activateDelay,
      jobId: `activate-${campaignId}`,
      removeOnComplete: true,
    });
  }

  const completeDelay = new Date(campaign.endDate).getTime() - now;
  if (completeDelay > 0) {
    await queue.add('complete', { campaignId, tenantId }, {
      delay: completeDelay,
      jobId: `complete-${campaignId}`,
      removeOnComplete: true,
    });
  }

  return updated;
}

export async function activateCampaign(tenantId: string, campaignId: string) {
  const campaign = await getCampaign(tenantId, campaignId);

  if (!['draft', 'scheduled'].includes(campaign.status)) {
    throw new ConflictError(`Cannot activate campaign in '${campaign.status}' status`);
  }

  const [updated] = await db.update(inspectionCampaigns).set({
    status: 'active',
    updatedAt: new Date(),
  }).where(eq(inspectionCampaigns.id, campaignId)).returning();

  return updated;
}

export async function listAssignments(tenantId: string, campaignId: string) {
  await getCampaign(tenantId, campaignId);

  return db.select().from(inspectionAssignments)
    .where(eq(inspectionAssignments.campaignId, campaignId));
}

export async function updateAssignment(
  tenantId: string,
  assignmentId: string,
  input: UpdateAssignmentInput,
) {
  const rows = await db.select({ id: inspectionAssignments.id, campaignId: inspectionAssignments.campaignId })
    .from(inspectionAssignments)
    .where(eq(inspectionAssignments.id, assignmentId)).limit(1);

  if (!rows[0]) throw new NotFoundError('InspectionAssignment', assignmentId);

  // Verify assignment belongs to this tenant via campaign
  await getCampaign(tenantId, rows[0].campaignId);

  const [updated] = await db.update(inspectionAssignments).set({
    ...input,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    startedAt: input.status === 'in_progress' ? new Date() : undefined,
  }).where(eq(inspectionAssignments.id, assignmentId)).returning();

  return updated;
}

export async function submitAssignment(
  tenantId: string,
  assignmentId: string,
  input: SubmitAssignmentInput,
) {
  const rows = await db.select().from(inspectionAssignments)
    .where(eq(inspectionAssignments.id, assignmentId)).limit(1);

  if (!rows[0]) throw new NotFoundError('InspectionAssignment', assignmentId);

  if (['passed', 'failed'].includes(rows[0].status)) {
    throw new ConflictError('Assignment already submitted');
  }

  // Verify tenant
  await getCampaign(tenantId, rows[0].campaignId);

  // Get campaign items to determine criticality
  const items = await db.select().from(inspectionItems)
    .where(eq(inspectionItems.campaignId, rows[0].campaignId));

  const itemMap = new Map(items.map(i => [i.id, i]));

  // Insert responses
  await db.insert(inspectionResponses).values(
    input.responses.map(r => ({
      assignmentId,
      itemId: r.itemId,
      status: r.status,
      note: r.note,
      photoUrl: r.photoUrl,
    }))
  );

  // Compute result
  const failedResponses = input.responses.filter(r => r.status === 'fail');
  const criticalDefects = failedResponses.filter(r => itemMap.get(r.itemId)?.isCritical === 1).length;
  const photoCount = input.responses.filter(r => r.photoUrl).length;
  const passed = criticalDefects === 0 && failedResponses.length === 0;

  const [updated] = await db.update(inspectionAssignments).set({
    status: passed ? 'passed' : 'failed',
    completedAt: new Date(),
    criticalDefects,
    photoCount,
    result: {
      totalItems: input.responses.length,
      failedItems: failedResponses.length,
      criticalDefects,
    },
  }).where(eq(inspectionAssignments.id, assignmentId)).returning();

  return updated;
}

export async function getCampaignReport(tenantId: string, campaignId: string) {
  const campaign = await getCampaign(tenantId, campaignId);
  const assignments = await listAssignments(tenantId, campaignId);

  const summary = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    passed: assignments.filter(a => a.status === 'passed').length,
    failed: assignments.filter(a => a.status === 'failed').length,
    skipped: assignments.filter(a => a.status === 'skipped').length,
    totalCriticalDefects: assignments.reduce((sum, a) => sum + (a.criticalDefects ?? 0), 0),
  };

  return { campaign, summary, assignments };
}

/**
 * Check if vehicle has a failed inspection with critical defects (Gate 2 sub-check).
 */
export async function vehicleHasBlockingInspection(vehicleId: string): Promise<boolean> {
  const now = new Date();

  // Find active campaigns this vehicle is assigned to
  const rows = await db.select({
    status: inspectionAssignments.status,
    criticalDefects: inspectionAssignments.criticalDefects,
  })
    .from(inspectionAssignments)
    .innerJoin(inspectionCampaigns, eq(inspectionAssignments.campaignId, inspectionCampaigns.id))
    .where(and(
      eq(inspectionAssignments.vehicleId, vehicleId),
      eq(inspectionCampaigns.status, 'active'),
      lte(inspectionCampaigns.startDate, now),
      gte(inspectionCampaigns.endDate, now),
    ));

  return rows.some(r => r.status === 'failed' && (r.criticalDefects ?? 0) > 0);
}

/**
 * BullMQ worker for campaign lifecycle transitions.
 */
export function startInspectionCampaignWorker() {
  const worker = createWorker<{ campaignId: string; tenantId: string }>(
    'inspection-campaigns',
    async (job) => {
      const { campaignId, tenantId } = job.data;

      if (job.name === 'activate') {
        await db.update(inspectionCampaigns).set({ status: 'active', updatedAt: new Date() })
          .where(and(
            eq(inspectionCampaigns.id, campaignId),
            eq(inspectionCampaigns.status, 'scheduled'),
          ));
      } else if (job.name === 'complete') {
        await db.update(inspectionCampaigns).set({ status: 'completed', updatedAt: new Date() })
          .where(and(
            eq(inspectionCampaigns.id, campaignId),
            eq(inspectionCampaigns.status, 'active'),
          ));
      }
    },
    { concurrency: 2 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[inspection-campaigns] job ${job?.id} failed:`, err);
  });

  return worker;
}
