import { eq, and, isNull, lt } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { loadingSegments, loadingEvidence } from '../../infra/db/schema/loading.js';
import { journeys } from '../../infra/db/schema/journeys.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { uploadFile } from '../../infra/storage/s3.js';
import { stripExif } from '../../shared/image.js';
import type { CreateSegmentInput, UpdateSegmentInput, LoadInput, UnloadInput } from './logistics.schema.js';

export async function listSegments(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; journeyId?: string; jobId?: string;
}) {
  const conditions = [eq(loadingSegments.orgId, tenantId), isNull(loadingSegments.deletedAt)];

  if (query.status) conditions.push(eq(loadingSegments.status, query.status));
  if (query.journeyId) conditions.push(eq(loadingSegments.journeyId, query.journeyId));
  if (query.jobId) conditions.push(eq(loadingSegments.jobId, query.jobId));
  if (query.cursor) conditions.push(lt(loadingSegments.id, query.cursor));

  const rows = await db.select().from(loadingSegments)
    .where(and(...conditions))
    .orderBy(loadingSegments.createdAt)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getSegment(tenantId: string, segmentId: string) {
  const rows = await db.select().from(loadingSegments)
    .where(and(
      eq(loadingSegments.id, segmentId),
      eq(loadingSegments.orgId, tenantId),
      isNull(loadingSegments.deletedAt),
    )).limit(1);

  if (!rows[0]) throw new NotFoundError('LoadingSegment', segmentId);

  const evidence = await db.select().from(loadingEvidence)
    .where(eq(loadingEvidence.segmentId, segmentId));

  return { ...rows[0], evidence };
}

export async function createSegment(tenantId: string, input: CreateSegmentInput) {
  // Verify journey belongs to tenant
  const jRows = await db.select({ id: journeys.id }).from(journeys)
    .where(and(eq(journeys.id, input.journeyId), eq(journeys.orgId, tenantId))).limit(1);
  if (!jRows[0]) throw new NotFoundError('Journey', input.journeyId);

  const [segment] = await db.insert(loadingSegments).values({
    ...input,
    quantity: input.quantity != null ? String(input.quantity) : null,
    loadingLat: input.loadingLat != null ? String(input.loadingLat) : null,
    loadingLon: input.loadingLon != null ? String(input.loadingLon) : null,
    status: 'planned',
    orgId: tenantId,
  }).returning();

  return segment;
}

export async function updateSegment(tenantId: string, segmentId: string, input: UpdateSegmentInput) {
  const existing = await getSegment(tenantId, segmentId);

  if (['closed', 'exception'].includes(existing.status)) {
    throw new ConflictError(`Cannot update segment in '${existing.status}' status`);
  }

  const [updated] = await db.update(loadingSegments).set({
    ...input,
    quantity: input.quantity != null ? String(input.quantity) : undefined,
    updatedAt: new Date(),
  }).where(eq(loadingSegments.id, segmentId)).returning();

  return updated;
}

export async function recordLoad(
  tenantId: string,
  segmentId: string,
  userId: string,
  input: LoadInput,
  file?: { buffer: Buffer; mimetype: string; filename: string },
) {
  const existing = await getSegment(tenantId, segmentId);

  if (existing.status !== 'planned') {
    throw new ConflictError(`Cannot load segment in '${existing.status}' status`);
  }

  await db.update(loadingSegments).set({
    status: 'loaded',
    loadTime: new Date(),
    loadingClerkId: userId,
    loadingLat: input.loadingLat != null ? String(input.loadingLat) : undefined,
    loadingLon: input.loadingLon != null ? String(input.loadingLon) : undefined,
    notes: input.notes,
    updatedAt: new Date(),
  }).where(eq(loadingSegments.id, segmentId));

  if (file) {
    await uploadEvidenceFile(segmentId, userId, 'load_photo', file);
  }

  return getSegment(tenantId, segmentId);
}

export async function recordUnload(
  tenantId: string,
  segmentId: string,
  userId: string,
  input: UnloadInput,
  file?: { buffer: Buffer; mimetype: string; filename: string },
) {
  const existing = await getSegment(tenantId, segmentId);

  if (!['loaded', 'in_transit'].includes(existing.status)) {
    throw new ConflictError(`Cannot unload segment in '${existing.status}' status`);
  }

  await db.update(loadingSegments).set({
    status: 'unloaded',
    unloadTime: new Date(),
    unloadingLat: input.unloadingLat != null ? String(input.unloadingLat) : undefined,
    unloadingLon: input.unloadingLon != null ? String(input.unloadingLon) : undefined,
    notes: input.notes,
    updatedAt: new Date(),
  }).where(eq(loadingSegments.id, segmentId));

  if (file) {
    await uploadEvidenceFile(segmentId, userId, 'unload_photo', file);
  }

  return getSegment(tenantId, segmentId);
}

export async function closeSegment(tenantId: string, segmentId: string, supervisorId: string) {
  const existing = await getSegment(tenantId, segmentId);

  if (existing.status !== 'unloaded') {
    throw new ConflictError(`Cannot close segment in '${existing.status}' status — must be unloaded first`);
  }

  const [updated] = await db.update(loadingSegments).set({
    status: 'closed',
    supervisorApprovedBy: supervisorId,
    updatedAt: new Date(),
  }).where(eq(loadingSegments.id, segmentId)).returning();

  return updated;
}

export async function addEvidence(
  tenantId: string,
  segmentId: string,
  userId: string,
  evidenceType: string,
  file: { buffer: Buffer; mimetype: string; filename: string },
) {
  await getSegment(tenantId, segmentId);
  return uploadEvidenceFile(segmentId, userId, evidenceType, file);
}

async function uploadEvidenceFile(
  segmentId: string,
  userId: string,
  evidenceType: string,
  file: { buffer: Buffer; mimetype: string; filename: string },
) {
  const cleanBuffer = await stripExif(file.buffer, file.mimetype);
  const key = `logistics/${segmentId}/${evidenceType}-${Date.now()}-${file.filename}`;
  await uploadFile(key, cleanBuffer, file.mimetype);

  const [evidence] = await db.insert(loadingEvidence).values({
    segmentId,
    type: evidenceType,
    fileUrl: key,
    capturedBy: userId,
    exifStripped: true,
  }).returning();

  return evidence;
}

/**
 * Check for unclosed segments when journey is being closed.
 * Returns true if any segments are not closed.
 */
export async function checkSegmentsOnJourneyClose(journeyId: string): Promise<boolean> {
  const rows = await db.select({ status: loadingSegments.status })
    .from(loadingSegments)
    .where(and(eq(loadingSegments.journeyId, journeyId), isNull(loadingSegments.deletedAt)));

  return rows.some(r => r.status !== 'closed');
}
