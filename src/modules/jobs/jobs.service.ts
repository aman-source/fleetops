import { eq, and, isNull, lt } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { jobPlans, jobWaypoints, jobProofs } from '../../infra/db/schema/job-plans.js';
import { journeys } from '../../infra/db/schema/journeys.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { uploadFile } from '../../infra/storage/s3.js';
import { stripExif } from '../../shared/image.js';
import type {
  CreateJobInput, UpdateJobInput, AddWaypointInput, CompleteWaypointInput,
} from './jobs.schema.js';

let jobCounter = 23000;
function generateJobNumber(): string {
  jobCounter++;
  return `JOB-${jobCounter}`;
}

export async function listJobs(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; journeyId?: string; jobType?: string;
}) {
  const conditions = [eq(jobPlans.orgId, tenantId), isNull(jobPlans.deletedAt)];

  if (query.status) conditions.push(eq(jobPlans.status, query.status));
  if (query.journeyId) conditions.push(eq(jobPlans.journeyId, query.journeyId));
  if (query.jobType) conditions.push(eq(jobPlans.jobType, query.jobType));
  if (query.cursor) conditions.push(lt(jobPlans.id, query.cursor));

  const rows = await db.select().from(jobPlans)
    .where(and(...conditions))
    .orderBy(jobPlans.createdAt)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getJob(tenantId: string, jobId: string) {
  const rows = await db.select().from(jobPlans)
    .where(and(eq(jobPlans.id, jobId), eq(jobPlans.orgId, tenantId), isNull(jobPlans.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Job', jobId);

  const waypoints = await db.select().from(jobWaypoints)
    .where(eq(jobWaypoints.jobId, jobId))
    .orderBy(jobWaypoints.sequence);

  const proofs = await db.select().from(jobProofs)
    .where(eq(jobProofs.jobId, jobId));

  return { ...rows[0], waypoints, proofs };
}

export async function createJob(tenantId: string, userId: string, input: CreateJobInput) {
  const [job] = await db.insert(jobPlans).values({
    jobNumber: generateJobNumber(),
    ...input,
    destinationLat: input.destinationLat != null ? String(input.destinationLat) : null,
    destinationLon: input.destinationLon != null ? String(input.destinationLon) : null,
    plannedStart: input.plannedStart ? new Date(input.plannedStart) : null,
    plannedEnd: input.plannedEnd ? new Date(input.plannedEnd) : null,
    status: 'draft',
    orgId: tenantId,
    createdBy: userId,
  }).returning();

  return job;
}

export async function updateJob(tenantId: string, jobId: string, input: UpdateJobInput) {
  const existing = await getJob(tenantId, jobId);

  if (['closed', 'cancelled'].includes(existing.status)) {
    throw new ConflictError(`Cannot update job in '${existing.status}' status`);
  }

  const [updated] = await db.update(jobPlans).set({
    ...input,
    destinationLat: input.destinationLat != null ? String(input.destinationLat) : undefined,
    destinationLon: input.destinationLon != null ? String(input.destinationLon) : undefined,
    plannedStart: input.plannedStart ? new Date(input.plannedStart) : undefined,
    plannedEnd: input.plannedEnd ? new Date(input.plannedEnd) : undefined,
    updatedAt: new Date(),
  }).where(eq(jobPlans.id, jobId)).returning();

  return updated;
}

export async function assignJourney(tenantId: string, jobId: string, journeyId: string) {
  const existing = await getJob(tenantId, jobId);

  // Verify journey belongs to same tenant
  const jRows = await db.select({ id: journeys.id }).from(journeys)
    .where(and(eq(journeys.id, journeyId), eq(journeys.orgId, tenantId))).limit(1);
  if (!jRows[0]) throw new NotFoundError('Journey', journeyId);

  if (!['draft', 'assigned'].includes(existing.status)) {
    throw new ConflictError(`Cannot assign journey to job in '${existing.status}' status`);
  }

  const [updated] = await db.update(jobPlans).set({
    journeyId,
    status: 'assigned',
    updatedAt: new Date(),
  }).where(eq(jobPlans.id, jobId)).returning();

  return updated;
}

export async function addWaypoint(tenantId: string, jobId: string, input: AddWaypointInput) {
  await getJob(tenantId, jobId);

  const [wp] = await db.insert(jobWaypoints).values({
    jobId,
    ...input,
    lat: String(input.lat),
    lon: String(input.lon),
    plannedArrival: input.plannedArrival ? new Date(input.plannedArrival) : null,
  }).returning();

  return wp;
}

export async function completeWaypoint(
  tenantId: string,
  jobId: string,
  waypointId: string,
  userId: string,
  input: CompleteWaypointInput,
  file?: { buffer: Buffer; mimetype: string; filename: string },
) {
  const job = await getJob(tenantId, jobId);

  const wp = job.waypoints.find(w => w.id === waypointId);
  if (!wp) throw new NotFoundError('Waypoint', waypointId);

  if (wp.actualArrival) throw new ConflictError('Waypoint already completed');

  // Record arrival
  await db.update(jobWaypoints).set({
    actualArrival: new Date(),
    proofData: input as unknown as Record<string, unknown>,
  }).where(eq(jobWaypoints.id, waypointId));

  // Upload proof file if provided
  if (file) {
    const cleanBuffer = await stripExif(file.buffer, file.mimetype);
    const key = `jobs/${jobId}/waypoints/${waypointId}/${Date.now()}-${file.filename}`;
    await uploadFile(key, cleanBuffer, file.mimetype);

    await db.insert(jobProofs).values({
      jobId,
      waypointId,
      type: wp.proofType,
      fileUrl: key,
      capturedBy: userId,
      deviceLat: input.deviceLat != null ? String(input.deviceLat) : null,
      deviceLon: input.deviceLon != null ? String(input.deviceLon) : null,
    });
  }

  // If all waypoints completed, advance job to completed
  const allWaypoints = await db.select({ actualArrival: jobWaypoints.actualArrival })
    .from(jobWaypoints).where(eq(jobWaypoints.jobId, jobId));

  if (allWaypoints.every(w => w.actualArrival)) {
    await db.update(jobPlans).set({ status: 'completed', updatedAt: new Date() })
      .where(eq(jobPlans.id, jobId));
  } else if (job.status === 'assigned') {
    await db.update(jobPlans).set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(jobPlans.id, jobId));
  }

  return getJob(tenantId, jobId);
}

export async function closeJob(tenantId: string, jobId: string) {
  const job = await getJob(tenantId, jobId);

  if (job.status === 'closed') throw new ConflictError('Job already closed');
  if (job.status === 'cancelled') throw new ConflictError('Cannot close cancelled job');

  const [updated] = await db.update(jobPlans).set({
    status: 'closed',
    updatedAt: new Date(),
  }).where(eq(jobPlans.id, jobId)).returning();

  return updated;
}

/**
 * Called on journey close — check if linked job has incomplete waypoints.
 * Returns true if exceptions found (caller emits notification).
 */
export async function checkJobOnJourneyClose(journeyId: string): Promise<boolean> {
  const jobs = await db.select({ id: jobPlans.id, status: jobPlans.status })
    .from(jobPlans)
    .where(and(eq(jobPlans.journeyId, journeyId), isNull(jobPlans.deletedAt)));

  let hasExceptions = false;
  for (const job of jobs) {
    if (['draft', 'assigned', 'in_progress'].includes(job.status)) {
      const wps = await db.select({ actualArrival: jobWaypoints.actualArrival })
        .from(jobWaypoints).where(eq(jobWaypoints.jobId, job.id));

      if (wps.some(w => !w.actualArrival)) {
        hasExceptions = true;
      }
    }
  }

  return hasExceptions;
}
