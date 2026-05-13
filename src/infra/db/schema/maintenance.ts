import { pgTable, uuid, text, integer, numeric, boolean, date, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { vehicles } from './vehicles';
import { users } from './users';
import { organizations } from './organizations';

export const WO_ISSUE_TYPES = [
  'preventive', 'corrective', 'breakdown', 'accident',
  'tire', 'battery', 'ivms', 'nfc', 'license_renewal',
] as const;

export const WO_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export const WO_STATUSES = [
  'inbound', 'in_bay', 'awaiting_parts', 'hse_review', 'ready', 'closed',
] as const;
export type WOStatus = (typeof WO_STATUSES)[number];

export const RELEASE_DECISIONS = ['go', 'conditional', 'no_go'] as const;

export const HSE_COSIGN = ['auto', 'required', 'skipped'] as const;

export const workOrders = pgTable('work_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  woNumber: text('wo_number').unique().notNull(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id).notNull(),
  issueType: text('issue_type').notNull(),
  priority: text('priority').default('medium').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('inbound').notNull(),
  bay: text('bay'),
  technicianId: uuid('technician_id').references(() => users.id),
  releaseDecision: text('release_decision'),
  releaseReason: text('release_reason'),
  releaseExpiry: timestamp('release_expiry', { withTimezone: true }),
  hseCosign: text('hse_cosign').default('auto').notNull(),
  hseApprovedBy: uuid('hse_approved_by').references(() => users.id),
  hseApprovedAt: timestamp('hse_approved_at', { withTimezone: true }),
  odometerAt: integer('odometer_at'),
  engineHoursAt: integer('engine_hours_at'),
  openedBy: uuid('opened_by').references(() => users.id).notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  targetHours: numeric('target_hours', { precision: 4, scale: 1 }),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_wo_vehicle').on(table.vehicleId, table.status),
  index('idx_wo_status').on(table.status, table.priority),
]);

export const workOrderParts = pgTable('work_order_parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  woId: uuid('wo_id').references(() => workOrders.id).notNull(),
  partNumber: text('part_number').notNull(),
  partName: text('part_name').notNull(),
  oemAftermarket: text('oem_aftermarket'),
  supplier: text('supplier'),
  quantity: integer('quantity').default(1).notNull(),
  warrantyMonths: integer('warranty_months'),
  oldPartDisposed: boolean('old_part_disposed').default(false).notNull(),
  costBaisa: integer('cost_baisa'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workOrderPhotos = pgTable('work_order_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  woId: uuid('wo_id').references(() => workOrders.id).notNull(),
  label: text('label'),
  fileUrl: text('file_url').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
});

export const WO_ACTIONS = [
  'opened', 'assigned', 'photo_added', 'part_added',
  'status_changed', 'released', 'hse_approved', 'closed',
] as const;

export const workOrderActivity = pgTable('work_order_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  woId: uuid('wo_id').references(() => workOrders.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const TIRE_STATUSES = ['active', 'worn', 'damaged', 'replaced', 'disposed'] as const;

export const tires = pgTable('tires', {
  id: uuid('id').primaryKey().defaultRandom(),
  serialNo: text('serial_no').unique().notNull(),
  brand: text('brand'),
  model: text('model'),
  size: text('size'),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  axlePosition: text('axle_position'),
  installDate: date('install_date'),
  installOdometer: integer('install_odometer'),
  treadDepthMm: numeric('tread_depth_mm', { precision: 4, scale: 1 }),
  pressurePsi: numeric('pressure_psi', { precision: 5, scale: 1 }),
  status: text('status').default('active').notNull(),
  disposalReason: text('disposal_reason'),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
