import { pgTable, uuid, text, integer, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { vehicles } from './vehicles';
import { drivers } from './drivers';
import { journeys } from './journeys';
import { events } from './events';
import { users } from './users';
import { organizations } from './organizations';

export const INCIDENT_STATUSES = ['active', 'responding', 'escalated', 'closed'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_TIERS = [1, 2, 3] as const;

export const incidents = pgTable('incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  journeyId: uuid('journey_id').references(() => journeys.id),
  tier: integer('tier').default(1).notNull(),
  status: text('status').default('active').notNull(),
  situation: text('situation'),
  lat: numeric('lat', { precision: 10, scale: 7 }),
  lon: numeric('lon', { precision: 10, scale: 7 }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedBy: uuid('closed_by').references(() => users.id),
  closureReport: text('closure_report'),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_incidents_status').on(table.status, table.startedAt),
  index('idx_incidents_vehicle').on(table.vehicleId),
]);

export const STEP_STATUSES = ['pending', 'active', 'done', 'skipped'] as const;

export const incidentSteps = pgTable('incident_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id').references(() => incidents.id).notNull(),
  stepNumber: integer('step_number').notNull(),
  description: text('description').notNull(),
  status: text('status').default('pending').notNull(),
  completedBy: uuid('completed_by').references(() => users.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  skipReason: text('skip_reason'),
});

export const driverScores = pgTable('driver_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  driverId: uuid('driver_id').references(() => drivers.id).notNull(),
  period: text('period').notNull(), // '2026-05' monthly
  overspeedCount: integer('overspeed_count').default(0).notNull(),
  harshBrakingCount: integer('harsh_braking_count').default(0).notNull(),
  harshAccelCount: integer('harsh_accel_count').default(0).notNull(),
  idleCount: integer('idle_count').default(0).notNull(),
  incidentCount: integer('incident_count').default(0).notNull(),
  complianceScore: numeric('compliance_score', { precision: 5, scale: 2 }),
  totalScore: numeric('total_score', { precision: 5, scale: 2 }),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_driver_scores_period').on(table.driverId, table.period),
]);
