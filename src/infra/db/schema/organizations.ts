import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'company' | 'contractor' | 'department' | 'project' | 'site' | 'camp' | 'workshop'
  parentId: uuid('parent_id').references((): any => organizations.id),
  active: boolean('active').default(true).notNull(),
  config: jsonb('config').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
