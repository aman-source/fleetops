import { pgTable, uuid, text, date, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';

export const DOCUMENT_ENTITY_TYPES = ['vehicle', 'driver'] as const;
export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

export const DOCUMENT_TYPES = [
  'mulkia',           // vehicle registration
  'insurance',        // vehicle insurance
  'ras',              // vehicle inspection (Road Assessment Sheet)
  'site_permit',      // PDO site access permit
  'fire_extinguisher', // vehicle fire extinguisher cert
  'first_aid',        // vehicle first aid kit cert
  'license',          // driver license
  'ddc',              // Defensive Driving Certificate
  'medical',          // driver medical fitness
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ['valid', 'expiring', 'expired'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(), // 'vehicle' | 'driver'
  entityId: uuid('entity_id').notNull(),
  documentType: text('document_type').notNull(), // DocumentType
  referenceNo: text('reference_no'),
  issuedDate: date('issued_date'),
  expiryDate: date('expiry_date').notNull(),
  reminderDays: integer('reminder_days').array().default([90, 60, 30, 7]),
  fileUrl: text('file_url'), // MinIO path
  status: text('status').default('valid').notNull(), // DocumentStatus
  blocksOnExpiry: boolean('blocks_on_expiry').default(true).notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_documents_entity').on(table.entityType, table.entityId),
  index('idx_documents_expiry').on(table.expiryDate, table.status),
]);
