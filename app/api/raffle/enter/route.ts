import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/src/db';
import { tickets } from '@/src/db/schema';
import { stripe } from '@/src/lib/stripe';
import { eq, and, sql } from 'drizzle-orm';

const enterRaffleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = enterRaffleSchema.parse(body);

    // Step 1: Quick check if any tickets are available (no lock)
    const availableCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(eq(tickets.status, 'available'));

    if (!availableCount[0] || availableCount[0].count === 0) {
      return NextResponse.json(
        { success: false, error: 'All tickets have been sold out!' },
        { status: 400 }
      );
    }

    // Step 2: Assign a random available ticket using transaction with locking
    let assignedTicket;

    try {
      // Start a transaction and lock a random available ticket
      assignedTicket = await db.transaction(async (tx) => {
        // SELECT FOR UPDATE SKIP LOCKED ensures:
        // 1. The row is locked (no one else can grab it)
        // 2. If already locked, skip to next available
        // 3. Prevents race conditions
        const result = await tx.execute(sql`
          SELECT * FROM tickets
          WHERE status = 'available'
          ORDER BY RANDOM()
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `);

        const ticket = result.rows[0] as { id: number; ticket_number: number } | undefined;

        if (!ticket) {
          throw new Error('No tickets available');
        }

        // Update the ticket to reserved status (without payment intent yet)
        const [updatedTicket] = await tx
          .update(tickets)
          .set({
            status: 'reserved',
            buyerName: validatedData.name,
            buyerEmail: validatedData.email,
            buyerPhone: validatedData.phone,
            reservedAt: new Date(),
          })
          .where(eq(tickets.id, ticket.id))
          .returning();

        return updatedTicket;
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'All tickets sold out during processing. Please try again.' },
        { status: 400 }
      );
    }

    if (!assignedTicket) {
      return NextResponse.json(
        { success: false, error: 'Failed to assign ticket' },
        { status: 500 }
      );
    }

    // Step 3: Create and confirm payment with exact amount
    const actualAmount = assignedTicket.ticketNumber * 100; // Convert to cents
    let paymentIntent;

    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: actualAmount,
        currency: 'usd',
        payment_method: validatedData.paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          ticketNumber: assignedTicket.ticketNumber.toString(),
          buyerName: validatedData.name,
          buyerEmail: validatedData.email,
        },
        receipt_email: validatedData.email,
        description: `Yeshiva Raffle - Ticket #${assignedTicket.ticketNumber}`,
      });
    } catch (error) {
      // Payment failed - release the ticket back to available
      await db
        .update(tickets)
        .set({
          status: 'available',
          buyerName: null,
          buyerEmail: null,
          buyerPhone: null,
          reservedAt: null,
        })
        .where(eq(tickets.id, assignedTicket.id));

      return NextResponse.json(
        {
          success: false,
          error: 'Payment failed. Your card was not charged. Please try again.'
        },
        { status: 400 }
      );
    }

    // Step 4: Mark ticket as sold and save payment intent ID
    await db
      .update(tickets)
      .set({
        status: 'sold',
        amountPaid: assignedTicket.ticketNumber,
        stripePaymentIntentId: paymentIntent.id,
        purchasedAt: new Date(),
      })
      .where(eq(tickets.id, assignedTicket.id));

    // Success!
    return NextResponse.json({
      success: true,
      ticketNumber: assignedTicket.ticketNumber,
      amountCharged: assignedTicket.ticketNumber,
      receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
    });

  } catch (error) {
    console.error('Error in raffle entry:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
