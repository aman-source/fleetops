import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { organizations } from './organizations.js';
import { journeys } from './journeys.js';

export const REQUEST_STATUSES = ['pending', 'pooled', 'assigned', 'approved', 'rejected', 'cancelled'] as const;
export const TRIP_TYPES = ['one_way', 'round_trip', 'recurring'] as const;
export const REQUEST_PRIORITIES = ['normal', 'high', 'urgent'] as const;
export const POOL_STATUSES = ['building', 'assigned', 'converted', 'cancelled'] as const;
export const VALIDATION_RESULTS = ['valid', 'invalid', 'not_on_manifest', 'exception'] as const;

export const passengerRequests = pgTable('passenger_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestNo: text('request_no').unique().notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  pickupLocationId: uuid('pickup_location_id'),
  dropLocationId: uuid('drop_location_id'),
  pickupName: text('pickup_name'),
  dropName: text('drop_name'),
  requestedTime: timestamp('requested_time', { withTimezone: true }).notNull(),
  priority: text('priority').default('normal').notNull(),
  tripType: text('trip_type').default('one_way').notNull(),
  status: text('status').default('pending').notNull(),
  poolId: uuid('pool_id'),
  journeyId: uuid('journey_id').references(() => journeys.id),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_pax_requests_status').on(table.status, table.requestedTime),
  index('idx_pax_requests_user').on(table.userId),
]);

export const transportEntitlements = pgTable('transport_entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  eligibleRoutes: uuid('eligible_routes').array(),
  allowedDays: text('allowed_days').array(), // ['MON','TUE',...]
  approverId: uuid('approver_id').references(() => users.id),
  validityStart: timestamp('validity_start', { withTimezone: true }).notNull(),
  validityEnd: timestamp('validity_end', { withTimezone: true }).notNull(),
  status: text('status').default('active').notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const requestPools = pgTable('request_pools', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftTime: timestamp('shift_time', { withTimezone: true }),
  pickupArea: text('pickup_area'),
  dropArea: text('drop_area'),
  plannerId: uuid('planner_id').references(() => users.id),
  vehicleId: uuid('vehicle_id'),
  driverId: uuid('driver_id'),
  requestCount: text('request_count').default('0').notNull(),
  capacityNeeded: text('capacity_needed').default('0').notNull(),
  status: text('status').default('building').notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const boardingEvents = pgTable('boarding_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').references(() => journeys.id).notNull(),
  passengerId: uuid('passenger_id'),
  method: text('method').notNull(), // 'nfc' | 'qr' | 'employee_id' | 'manual'
  validationResult: text('validation_result').notNull(),
  lat: text('lat'),
  lon: text('lon'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  exceptionFlag: text('exception_flag').default('false').notNull(),
  exceptionNote: text('exception_note'),
});
