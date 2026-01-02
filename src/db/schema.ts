import { pgTable, serial, integer, varchar, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const ticketStatusEnum = pgEnum('ticket_status', ['available', 'reserved', 'sold']);

// Table to track blocked IPs after too many failed payment attempts
export const blockedIps = pgTable('blocked_ips', {
  id: serial('id').primaryKey(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull().unique(), // IPv6 can be up to 45 chars
  reason: varchar('reason', { length: 255 }).notNull(),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  blockedAt: timestamp('blocked_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // null = permanent block
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Table to track failed payment attempts per IP (rolling window)
export const failedPaymentAttempts = pgTable('failed_payment_attempts', {
  id: serial('id').primaryKey(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  cardLastFour: varchar('card_last_four', { length: 4 }), // For tracking card testing patterns
  declineReason: varchar('decline_reason', { length: 255 }),
  attemptedAt: timestamp('attempted_at').notNull().defaultNow(),
});

export type BlockedIp = typeof blockedIps.$inferSelect;
export type NewBlockedIp = typeof blockedIps.$inferInsert;
export type FailedPaymentAttempt = typeof failedPaymentAttempts.$inferSelect;
export type NewFailedPaymentAttempt = typeof failedPaymentAttempts.$inferInsert;

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  ticketNumber: integer('ticket_number').notNull().unique(),
  status: ticketStatusEnum('status').notNull().default('available'),
  buyerName: varchar('buyer_name', { length: 255 }),
  buyerEmail: varchar('buyer_email', { length: 255 }),
  buyerPhone: varchar('buyer_phone', { length: 50 }),
  amountPaid: integer('amount_paid'),
  transactionId: varchar('stripe_payment_intent_id', { length: 255 }), // Column name kept for DB compatibility
  reservedAt: timestamp('reserved_at'),
  purchasedAt: timestamp('purchased_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
