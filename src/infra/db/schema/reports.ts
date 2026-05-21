import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const REPORT_TYPES = ['fleet_status', 'journey_summary', 'incident_report', 'maintenance_report', 'driver_performance'] as const;
export type ReportType = typeof REPORT_TYPES[number];

export const REPORT_STATUSES = ['pending', 'generating', 'ready', 'failed'] as const;
export type ReportStatus = typeof REPORT_STATUSES[number];

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  reportType: text('report_type').notNull(), // ReportType
  status: text('status').default('pending').notNull(), // ReportStatus
  params: jsonb('params'), // date range, filters etc
  fileKey: text('file_key'), // MinIO object key when ready
  fileSizeBytes: text('file_size_bytes'), // stored as text to avoid bigint issues
  errorMessage: text('error_message'),
  requestedBy: uuid('requested_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const scheduledReports = pgTable('scheduled_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  reportType: text('report_type').notNull(),
  cronExpression: text('cron_expression').notNull(), // e.g. '0 6 * * 1' = Mon 6am
  params: jsonb('params'),
  recipientUserIds: jsonb('recipient_user_ids').$type<string[]>().default([]),
  enabled: boolean('enabled').default(true).notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
