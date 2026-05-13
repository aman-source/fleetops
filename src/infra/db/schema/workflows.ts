import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { organizations } from './organizations.js';

export const WORKFLOW_STATUSES = ['draft', 'published', 'archived'] as const;
export const EXECUTION_STATUSES = ['running', 'waiting_approval', 'waiting_timer', 'completed', 'failed'] as const;
export const NODE_TYPES = ['trigger', 'gate', 'approval', 'notification', 'action', 'branch', 'wait'] as const;

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  key: text('key').unique().notNull(), // 'JM-APPROVAL' | 'VEH-RELEASE'
  currentVersion: integer('current_version').default(1).notNull(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workflowVersions = pgTable('workflow_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id).notNull(),
  version: integer('version').notNull(),
  status: text('status').default('draft').notNull(),
  nodes: jsonb('nodes').notNull().$type<Array<{
    id: string; type: string; config: Record<string, unknown>; position: { x: number; y: number };
  }>>(),
  edges: jsonb('edges').notNull().$type<Array<{
    from: string; to: string; condition?: string;
  }>>(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: uuid('published_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id).notNull(),
  versionId: uuid('version_id').references(() => workflowVersions.id).notNull(),
  entityType: text('entity_type').notNull(), // 'journey' | 'work_order'
  entityId: uuid('entity_id').notNull(),
  currentNode: text('current_node'),
  status: text('status').default('running').notNull(),
  context: jsonb('context').$type<Record<string, unknown>>(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_wf_exec_entity').on(table.entityType, table.entityId),
  index('idx_wf_exec_status').on(table.status),
]);
