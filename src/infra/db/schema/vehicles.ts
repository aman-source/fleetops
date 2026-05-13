import { pgTable, uuid, text, integer, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations.js';

export const VEHICLE_STATUSES = [
  'available',
  'conditional',
  'under_maintenance',
  'no_go',
  'expired_documents',
  'ivms_fault',
  'nfc_fault',
  'hse_hold',
  'decommissioned',
] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_TYPES = ['light', 'bus', 'truck', 'excavator', 'tanker'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

// Valid status transitions: from → allowed targets
export const VEHICLE_STATUS_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  available: ['under_maintenance', 'no_go', 'expired_documents', 'ivms_fault', 'nfc_fault', 'hse_hold', 'decommissioned'],
  conditional: ['available', 'under_maintenance', 'no_go', 'expired_documents', 'ivms_fault', 'nfc_fault', 'hse_hold', 'decommissioned'],
  under_maintenance: ['available', 'conditional', 'no_go', 'decommissioned'],
  no_go: ['under_maintenance', 'available', 'conditional', 'decommissioned'],
  expired_documents: ['available', 'conditional', 'under_maintenance', 'decommissioned'],
  ivms_fault: ['available', 'conditional', 'under_maintenance', 'decommissioned'],
  nfc_fault: ['available', 'conditional', 'under_maintenance', 'decommissioned'],
  hse_hold: ['available', 'conditional', 'under_maintenance', 'no_go', 'decommissioned'],
  decommissioned: [], // terminal state
};

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  plateNo: text('plate_no').notNull(),
  fleetNo: text('fleet_no'),
  vin: text('vin'),
  engineNo: text('engine_no'),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  type: text('type').notNull(), // VehicleType
  seatCount: integer('seat_count').notNull(),
  owner: text('owner'),
  projectId: uuid('project_id').references(() => organizations.id),
  baseLocation: text('base_location'),
  status: text('status').notNull().default('available'), // VehicleStatus
  conditionalExpiry: timestamp('conditional_expiry', { withTimezone: true }),
  odometer: integer('odometer'),
  engineHours: integer('engine_hours'),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('chk_plate_format', sql`${table.plateNo} ~ '^\d{1,2}-[A-Z]-\d{3,4}$'`),
]);
