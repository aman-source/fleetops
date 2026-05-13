import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  action: text('action').notNull(), // 'POST /api/v1/journeys' or 'journey.status.changed'
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  beforeValue: jsonb('before_value').$type<Record<string, unknown>>(),
  afterValue: jsonb('after_value').$type<Record<string, unknown>>(),
  statusCode: integer('status_code'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  orgId: uuid('org_id'),
}, (table) => [
  index('idx_audit_entity').on(table.entityType, table.entityId, table.timestamp),
  index('idx_audit_user').on(table.userId, table.timestamp),
]);
