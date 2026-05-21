import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'whatsapp', 'push', 'inapp'] as const;
export const NOTIFICATION_STATUSES = ['pending', 'sent', 'delivered', 'failed'] as const;

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // event type that triggered it
  title: text('title').notNull(),
  body: text('body'),
  channel: text('channel').notNull(),
  status: text('status').default('pending').notNull(),
  read: boolean('read').default(false).notNull(),
  data: jsonb('data').$type<Record<string, unknown>>(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_notifications_user').on(table.userId, table.read, table.createdAt),
]);

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').references(() => notifications.id).notNull(),
  channel: text('channel').notNull(),
  providerId: text('provider_id'),
  status: text('status').default('pending').notNull(), // 'pending' | 'sent' | 'failed'
  sentAt: timestamp('sent_at', { withTimezone: true }),
  error: text('error'),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  eventType: text('event_type').notNull(),
  channels: text('channels').array().notNull(), // ['email', 'push']
  enabled: boolean('enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
