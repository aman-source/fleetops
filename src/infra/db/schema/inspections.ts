import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { vehicles } from './vehicles';
import { users } from './users';

export const CAMPAIGN_TYPES = ['routine', 'focused', 'incident_response', 'compliance'] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'completed', 'cancelled'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ['pending', 'in_progress', 'passed', 'failed', 'skipped'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const RESPONSE_STATUSES = ['pass', 'fail', 'na'] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const inspectionCampaigns = pgTable('inspection_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  campaignType: text('campaign_type').notNull(), // CampaignType
  description: text('description'),
  vehicleScope: jsonb('vehicle_scope').$type<{
    vehicleType?: string;
    projectId?: string;
    ageYears?: number;
    vehicleIds?: string[];
  }>().default({}),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  status: text('status').default('draft').notNull(), // CampaignStatus
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdByRole: text('created_by_role'),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  findingsSummary: jsonb('findings_summary').$type<Record<string, unknown>>(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_inspection_campaigns_org_status').on(table.orgId, table.status),
]);

export const inspectionAssignments = pgTable('inspection_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => inspectionCampaigns.id).notNull(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id).notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date', { withTimezone: true }),
  status: text('status').default('pending').notNull(), // AssignmentStatus
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  result: jsonb('result').$type<Record<string, unknown>>(),
  photoCount: integer('photo_count').default(0).notNull(),
  criticalDefects: integer('critical_defects').default(0).notNull(),
}, (table) => [
  index('idx_inspection_assignments_campaign').on(table.campaignId),
  index('idx_inspection_assignments_vehicle').on(table.vehicleId, table.status),
]);

export const inspectionItems = pgTable('inspection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => inspectionCampaigns.id).notNull(),
  label: text('label').notNull(),
  description: text('description'),
  isCritical: integer('is_critical').default(0).notNull(), // 0=false, 1=true
});

export const inspectionResponses = pgTable('inspection_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').references(() => inspectionAssignments.id).notNull(),
  itemId: uuid('item_id').references(() => inspectionItems.id).notNull(),
  status: text('status').notNull(), // ResponseStatus
  note: text('note'),
  photoUrl: text('photo_url'),
});
