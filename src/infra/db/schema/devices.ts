import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { vehicles } from './vehicles';
import { organizations } from './organizations';

export const DEVICE_TYPES = ['ivms', 'nfc_reader', 'passenger_counter', 'dashcam', 'panic_button'] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEVICE_HEALTH = ['online', 'offline', 'fault'] as const;

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // DeviceType
  serialNo: text('serial_no').notNull(),
  imei: text('imei'),
  simNo: text('sim_no'),
  apn: text('apn'),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  firmware: text('firmware'),
  lastSeen: timestamp('last_seen', { withTimezone: true }),
  healthStatus: text('health_status').default('unknown').notNull(),
  gpsQuality: integer('gps_quality'),
  batteryPct: integer('battery_pct'),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
