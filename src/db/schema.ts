import { pgTable, serial, integer, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const ticketStatusEnum = pgEnum('ticket_status', ['available', 'reserved', 'sold']);

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
