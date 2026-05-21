import { pgTable, uuid, text, numeric, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { journeys } from './journeys';
import { jobPlans } from './job-plans';
import { users } from './users';

export const SEGMENT_STATUSES = ['planned', 'loaded', 'in_transit', 'unloaded', 'closed', 'exception'] as const;
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number];

export const EVIDENCE_TYPES = ['load_photo', 'unload_photo', 'signature', 'document'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const loadingSegments = pgTable('loading_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').references(() => journeys.id).notNull(),
  jobId: uuid('job_id').references(() => jobPlans.id),
  sequence: integer('sequence').notNull().default(1),
  materialRef: text('material_ref'),
  materialDescription: text('material_description').notNull(),
  quantity: numeric('quantity', { precision: 12, scale: 3 }),
  uom: text('uom'), // 'tonnes' | 'pieces' | 'm3' | etc
  loadingLat: numeric('loading_lat', { precision: 10, scale: 7 }),
  loadingLon: numeric('loading_lon', { precision: 10, scale: 7 }),
  unloadingLat: numeric('unloading_lat', { precision: 10, scale: 7 }),
  unloadingLon: numeric('unloading_lon', { precision: 10, scale: 7 }),
  loadTime: timestamp('load_time', { withTimezone: true }),
  unloadTime: timestamp('unload_time', { withTimezone: true }),
  loadingClerkId: uuid('loading_clerk_id').references(() => users.id),
  supervisorApprovedBy: uuid('supervisor_approved_by').references(() => users.id),
  status: text('status').default('planned').notNull(), // SegmentStatus
  notes: text('notes'),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_loading_segments_journey').on(table.journeyId),
  index('idx_loading_segments_org_status').on(table.orgId, table.status),
]);

export const loadingEvidence = pgTable('loading_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  segmentId: uuid('segment_id').references(() => loadingSegments.id).notNull(),
  type: text('type').notNull(), // EvidenceType
  fileUrl: text('file_url').notNull(), // MinIO key
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  capturedBy: uuid('captured_by').references(() => users.id).notNull(),
  exifStripped: boolean('exif_stripped').default(false).notNull(),
});
