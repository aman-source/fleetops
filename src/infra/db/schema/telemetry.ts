import { pgTable, uuid, text, numeric, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Telemetry logs — append-only, high-volume.
 * In production: partitioned by month for query performance.
 * PostGIS geography column for position would be ideal, but Drizzle
 * doesn't natively support it. We store lat/lon as numeric and use
 * raw SQL for spatial queries when needed.
 */
export const telemetryLogs = pgTable('telemetry_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').notNull(),
  deviceId: uuid('device_id').notNull(),
  driverId: uuid('driver_id'),
  journeyId: uuid('journey_id'),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lon: numeric('lon', { precision: 10, scale: 7 }).notNull(),
  speed: numeric('speed', { precision: 6, scale: 2 }),
  heading: numeric('heading', { precision: 5, scale: 2 }),
  ignition: boolean('ignition'),
  fuelPct: integer('fuel_pct'),
  engineRpm: integer('engine_rpm'),
  odometer: integer('odometer'),
  engineHours: integer('engine_hours'),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_telemetry_vehicle_time').on(table.vehicleId, table.recordedAt),
  index('idx_telemetry_journey').on(table.journeyId, table.recordedAt),
]);
