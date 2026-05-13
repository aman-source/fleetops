import { pgTable, uuid, text, date, numeric, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const DRIVER_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const LICENSE_CLASSES = ['A', 'B', 'C', 'D', 'E'] as const;

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: text('employee_id'),
  name: text('name').notNull(),
  licenseNo: text('license_no').notNull(),
  licenseClass: text('license_class').notNull(), // LICENSE_CLASSES
  licenseExpiry: date('license_expiry').notNull(),
  ddcExpiry: date('ddc_expiry'),
  medicalExpiry: date('medical_expiry'),
  authorizedTypes: text('authorized_types').array(), // vehicle types driver can operate
  nfcCardUid: text('nfc_card_uid').unique(),
  nfcIssuedAt: timestamp('nfc_issued_at', { withTimezone: true }),
  status: text('status').default('active').notNull(), // DriverStatus
  score: numeric('score', { precision: 5, scale: 2 }),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
