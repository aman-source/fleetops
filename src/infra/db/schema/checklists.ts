import { pgTable, uuid, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const checklistTemplates = pgTable('checklist_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  projectId: uuid('project_id').references(() => organizations.id), // nullable = applies to all projects
  version: integer('version').default(1).notNull(),
  status: text('status').default('draft').notNull(), // 'draft' | 'published' | 'archived'
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => checklistTemplates.id).notNull(),
  stepNumber: integer('step_number').notNull(),
  category: text('category').notNull(),
  label: text('label').notNull(),
  description: text('description'),
  requiresPhoto: boolean('requires_photo').default(false).notNull(),
  isCritical: boolean('is_critical').default(false).notNull(), // failing this = blocks gate 2
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
