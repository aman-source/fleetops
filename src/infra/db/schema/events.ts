import { pgTable, uuid, text, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const EVENT_TYPES = [
  'overspeed', 'harsh_braking', 'harsh_accel', 'idle',
  'deviation', 'panic', 'tamper', 'offline',
  'geofence_entry', 'geofence_exit',
  'unauthorized_driver', 'night_driving',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_SEVERITIES = ['critical', 'warning', 'info'] as const;
export type EventSeverity = (typeof EVENT_SEVERITIES)[number];

export const EVENT_ACTION_STATUSES = ['open', 'acknowledged', 'resolved', 'escalated'] as const;

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').notNull(),
  driverId: uuid('driver_id'),
  journeyId: uuid('journey_id'),
  deviceId: uuid('device_id'),
  eventType: text('event_type').notNull(), // EventType
  severity: text('severity').notNull(), // EventSeverity
  lat: numeric('lat', { precision: 10, scale: 7 }),
  lon: numeric('lon', { precision: 10, scale: 7 }),
  speed: numeric('speed', { precision: 6, scale: 2 }),
  details: jsonb('details').$type<Record<string, unknown>>(),
  actionStatus: text('action_status').default('open').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_events_vehicle_time').on(table.vehicleId, table.recordedAt),
  index('idx_events_severity').on(table.severity, table.recordedAt),
  index('idx_events_journey').on(table.journeyId),
]);
