import { pgTable, uuid, text, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { vehicles } from './vehicles.js';
import { drivers } from './drivers.js';
import { users } from './users.js';
import { organizations } from './organizations.js';

export const JOURNEY_STATUSES = [
  'draft', 'pending_approval', 'approved', 'active',
  'delayed', 'deviated', 'completed', 'closed',
  'rejected', 'cancelled', 'emergency',
] as const;
export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

export const RISK_LEVELS = ['L', 'M', 'H'] as const;

export const journeys = pgTable('journeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyNo: text('journey_no').unique().notNull(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id).notNull(),
  purpose: text('purpose'),
  plannedDeparture: timestamp('planned_departure', { withTimezone: true }).notNull(),
  plannedArrival: timestamp('planned_arrival', { withTimezone: true }).notNull(),
  actualDeparture: timestamp('actual_departure', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  riskScore: numeric('risk_score', { precision: 4, scale: 2 }),
  riskLevel: text('risk_level'), // 'L' | 'M' | 'H'
  status: text('status').default('draft').notNull(),
  emergencyContact: text('emergency_contact'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  closedBy: uuid('closed_by').references(() => users.id),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  vehicleStatusSnapshot: text('vehicle_status_snapshot').notNull(), // snapshot at creation
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_journeys_status').on(table.status, table.plannedDeparture),
  index('idx_journeys_vehicle').on(table.vehicleId, table.status),
  index('idx_journeys_driver').on(table.driverId, table.status),
]);

export const BOARDING_STATUSES = ['manifested', 'boarded', 'alighted', 'no_show'] as const;
export const BOARDING_METHODS = ['nfc', 'qr', 'employee_id', 'manual'] as const;

export const journeyPassengers = pgTable('journey_passengers', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').references(() => journeys.id).notNull(),
  passengerId: uuid('passenger_id'),
  passengerName: text('passenger_name').notNull(),
  employeeId: text('employee_id'),
  department: text('department'),
  pickupPoint: text('pickup_point'),
  boardingStatus: text('boarding_status').default('manifested').notNull(),
  boardingMethod: text('boarding_method'),
  boardedAt: timestamp('boarded_at', { withTimezone: true }),
  alightedAt: timestamp('alighted_at', { withTimezone: true }),
});

export const WAYPOINT_STATUSES = ['pending', 'current', 'done', 'skipped'] as const;

export const journeyWaypoints = pgTable('journey_waypoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').references(() => journeys.id).notNull(),
  sequence: integer('sequence').notNull(),
  name: text('name').notNull(),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lon: numeric('lon', { precision: 10, scale: 7 }).notNull(),
  plannedArrival: timestamp('planned_arrival', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  status: text('status').default('pending').notNull(),
  notes: text('notes'),
});

export const APPROVAL_STEPS = ['submitter', 'journey_mgr', 'hse', 'final'] as const;
export const APPROVAL_DECISIONS = ['approved', 'rejected', 'pending'] as const;

export const journeyApprovals = pgTable('journey_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').references(() => journeys.id).notNull(),
  step: text('step').notNull(),
  userId: uuid('user_id').references(() => users.id),
  decision: text('decision').default('pending').notNull(),
  reason: text('reason'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
