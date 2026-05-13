import { z } from 'zod';
import { DOCUMENT_ENTITY_TYPES, DOCUMENT_TYPES, DOCUMENT_STATUSES } from '../../infra/db/schema/documents.js';

export const createDocumentSchema = z.object({
  entityType: z.enum(DOCUMENT_ENTITY_TYPES),
  entityId: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
  referenceNo: z.string().optional(),
  issuedDate: z.string().date().optional(),
  expiryDate: z.string().date(),
  reminderDays: z.array(z.number().int().min(1).max(365)).optional(),
  blocksOnExpiry: z.boolean().optional(),
});

export const updateDocumentSchema = z.object({
  referenceNo: z.string().optional(),
  issuedDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  reminderDays: z.array(z.number().int().min(1).max(365)).optional(),
  blocksOnExpiry: z.boolean().optional(),
});

export const documentQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  entityType: z.enum(DOCUMENT_ENTITY_TYPES).optional(),
  entityId: z.string().uuid().optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
});

export const expiringQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(90),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
