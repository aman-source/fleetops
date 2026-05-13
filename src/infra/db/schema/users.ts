import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { roles } from './roles';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  name: text('name').notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'locked' | 'inactive'
  mfaSecret: text('mfa_secret'),
  mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
