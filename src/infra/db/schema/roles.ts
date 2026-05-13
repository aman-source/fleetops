import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // 'driver' | 'journey_manager' | 'maintenance' | 'hse' | 'gm' | 'storekeeper' | 'admin' | 'planner' | 'passenger'
  permissions: text('permissions').array().notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
