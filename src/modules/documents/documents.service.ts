import { eq, and, isNull, lte, gte, lt, sql } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { documents } from '../../infra/db/schema/documents.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { NotFoundError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import { uploadFile } from '../../infra/storage/s3.js';
import { stripExif } from '../../shared/image.js';
import { scheduleExpiryReminders, cancelExpiryReminders } from './documents.expiry.js';
import type { CreateDocumentInput, UpdateDocumentInput } from './documents.schema.js';

export async function listDocuments(tenantId: string, query: {
  cursor?: string; limit: number; entityType?: string; entityId?: string;
  documentType?: string; status?: string;
}) {
  const conditions = [eq(documents.orgId, tenantId), isNull(documents.deletedAt)];

  if (query.entityType) conditions.push(eq(documents.entityType, query.entityType));
  if (query.entityId) conditions.push(eq(documents.entityId, query.entityId));
  if (query.documentType) conditions.push(eq(documents.documentType, query.documentType));
  if (query.status) conditions.push(eq(documents.status, query.status));
  if (query.cursor) conditions.push(lt(documents.id, query.cursor));

  const rows = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(documents.expiryDate)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getDocument(tenantId: string, docId: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.orgId, tenantId), isNull(documents.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Document', docId);
  return rows[0];
}

export async function createDocument(
  tenantId: string,
  input: CreateDocumentInput,
  file?: { buffer: Buffer; mimetype: string; filename: string },
) {
  let fileUrl: string | undefined;

  if (file) {
    const key = `documents/${input.entityType}/${input.entityId}/${input.documentType}-${Date.now()}-${file.filename}`;
    const cleanBuffer = await stripExif(file.buffer, file.mimetype);
    await uploadFile(key, cleanBuffer, file.mimetype);
    fileUrl = key;
  }

  const [doc] = await db
    .insert(documents)
    .values({
      ...input,
      fileUrl,
      orgId: tenantId,
      status: computeStatus(input.expiryDate),
    })
    .returning();

  // Schedule BullMQ expiry reminder jobs
  await scheduleExpiryReminders(doc);

  // If expiring/expired and blocks, update vehicle status
  if (doc.status !== 'valid' && doc.blocksOnExpiry && doc.entityType === 'vehicle') {
    await flagVehicleExpiredDocs(doc.entityId);
  }

  return doc;
}

export async function updateDocument(
  tenantId: string,
  docId: string,
  input: UpdateDocumentInput,
  file?: { buffer: Buffer; mimetype: string; filename: string },
) {
  const existing = await getDocument(tenantId, docId);

  let fileUrl = existing.fileUrl;
  if (file) {
    const key = `documents/${existing.entityType}/${existing.entityId}/${existing.documentType}-${Date.now()}-${file.filename}`;
    const cleanBuffer = await stripExif(file.buffer, file.mimetype);
    await uploadFile(key, cleanBuffer, file.mimetype);
    fileUrl = key;
  }

  const newExpiryDate = input.expiryDate ?? existing.expiryDate;
  const newStatus = computeStatus(newExpiryDate);

  const [updated] = await db
    .update(documents)
    .set({
      ...input,
      fileUrl,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, existing.id))
    .returning();

  // Cancel old reminders, schedule new ones
  await cancelExpiryReminders(existing.id);
  await scheduleExpiryReminders(updated);

  // If renewed to valid, check if vehicle can be unblocked
  if (newStatus === 'valid' && existing.status !== 'valid' && existing.entityType === 'vehicle') {
    await checkVehicleDocsClear(existing.entityId, tenantId);
  }

  return updated;
}

export async function listExpiring(tenantId: string, days: number, limit: number) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const rows = await db
    .select()
    .from(documents)
    .where(and(
      eq(documents.orgId, tenantId),
      isNull(documents.deletedAt),
      lte(documents.expiryDate, futureDate.toISOString().split('T')[0]),
      gte(documents.expiryDate, new Date().toISOString().split('T')[0]),
    ))
    .orderBy(documents.expiryDate)
    .limit(limit);

  return rows;
}

// ── Helpers ──

function computeStatus(expiryDate: string): 'valid' | 'expiring' | 'expired' {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'valid';
}

async function flagVehicleExpiredDocs(vehicleId: string) {
  await db
    .update(vehicles)
    .set({ status: 'expired_documents', updatedAt: new Date() })
    .where(eq(vehicles.id, vehicleId));
}

async function checkVehicleDocsClear(vehicleId: string, tenantId: string) {
  // Check if ALL documents for this vehicle are valid
  const expiredDocs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(
      eq(documents.entityType, 'vehicle'),
      eq(documents.entityId, vehicleId),
      eq(documents.orgId, tenantId),
      isNull(documents.deletedAt),
      eq(documents.blocksOnExpiry, true),
      sql`${documents.status} != 'valid'`,
    ))
    .limit(1);

  // If no expired/expiring blocking docs remain, clear vehicle flag
  if (expiredDocs.length === 0) {
    const vehicleRows = await db
      .select({ status: vehicles.status })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (vehicleRows[0]?.status === 'expired_documents') {
      await db
        .update(vehicles)
        .set({ status: 'available', updatedAt: new Date() })
        .where(eq(vehicles.id, vehicleId));
    }
  }
}
