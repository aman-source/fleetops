import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { drivers } from './drivers';
import { users } from './users';

export const driverNfcCards = pgTable('driver_nfc_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  driverId: uuid('driver_id').references(() => drivers.id).notNull(),
  cardUid: text('card_uid').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  issuedBy: uuid('issued_by').references(() => users.id),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedBy: uuid('revoked_by').references(() => users.id),
  revokeReason: text('revoke_reason'),
});
