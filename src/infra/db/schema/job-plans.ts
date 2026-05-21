import { pgTable, uuid, text, numeric, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { journeys } from './journeys';
import { users } from './users';

export const JOB_TYPES = ['delivery', 'pickup', 'service', 'inspection', 'survey', 'maintenance'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ['draft', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PROOF_TYPES = ['signature', 'photo', 'nfc_scan', 'none'] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export const jobPlans = pgTable('job_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobNumber: text('job_number').unique().notNull(),
  journeyId: uuid('journey_id').references(() => journeys.id),
  workOrderRef: text('work_order_ref'),
  jobType: text('job_type').notNull(), // JobType
  purpose: text('purpose'),
  destinationLat: numeric('destination_lat', { precision: 10, scale: 7 }),
  destinationLon: numeric('destination_lon', { precision: 10, scale: 7 }),
  plannedStart: timestamp('planned_start', { withTimezone: true }),
  plannedEnd: timestamp('planned_end', { withTimezone: true }),
  status: text('status').default('draft').notNull(), // JobStatus
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_job_plans_org_status').on(table.orgId, table.status),
  index('idx_job_plans_journey').on(table.journeyId),
]);

export const jobWaypoints = pgTable('job_waypoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobPlans.id).notNull(),
  sequence: integer('sequence').notNull(),
  name: text('name').notNull(),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lon: numeric('lon', { precision: 10, scale: 7 }).notNull(),
  plannedArrival: timestamp('planned_arrival', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  proofType: text('proof_type').default('none').notNull(), // ProofType
  proofData: jsonb('proof_data').$type<Record<string, unknown>>(),
  notes: text('notes'),
});

export const jobProofs = pgTable('job_proofs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobPlans.id).notNull(),
  waypointId: uuid('waypoint_id').references(() => jobWaypoints.id),
  type: text('type').notNull(), // ProofType
  fileUrl: text('file_url').notNull(), // MinIO key
  capturedBy: uuid('captured_by').references(() => users.id).notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  deviceLat: numeric('device_lat', { precision: 10, scale: 7 }),
  deviceLon: numeric('device_lon', { precision: 10, scale: 7 }),
});
