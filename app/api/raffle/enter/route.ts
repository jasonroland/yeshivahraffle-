import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/src/db';
import { tickets } from '@/src/db/schema';
import { authorizeTransaction, getCardPointeConfig, isTransactionApproved, formatAmountToCents } from '@/src/lib/cardpointe';
import { getClientIp, isIpBlocked, recordFailedAttempt } from '@/src/lib/ip-blocking';
import { eq, sql } from 'drizzle-orm';

const enterRaffleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  zip: z.string().min(5, 'Valid zip code is required').max(5, 'Valid zip code is required'),
  cardNumber: z.string().min(13, 'Valid card number is required'),
  expMonth: z.string().length(2, 'Valid expiration month is required'),
  expYear: z.string().length(4, 'Valid expiration year is required'),
  cvv: z.string().min(3, 'Valid CVV is required').max(4),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP and check if blocked
    const clientIp = getClientIp(request);

    if (await isIpBlocked(clientIp)) {
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Please try again later or contact support.' },
        { status: 403 }
      );
    }

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

        const ticket = result[0] as { id: number; ticket_number: number } | undefined;

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
    } catch {
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

    // Step 3: Create and charge payment with exact amount using CardPointe
    const actualAmount = assignedTicket.ticketNumber; // Amount in dollars
    const amountInCents = formatAmountToCents(actualAmount);

    try {
      // Get CardPointe config
      const config = getCardPointeConfig();

      // Format expiry as MMYY
      const expiry = validatedData.expMonth + validatedData.expYear.slice(-2);

      // Create donation message
      const dollarAmount = (parseFloat(amountInCents) / 100).toFixed(2);
      const donationMessage = `Thank you for your donation of $${dollarAmount}!`;

      // Call CardPointe API
      const response = await authorizeTransaction({
        merchid: config.merchantId,
        account: validatedData.cardNumber,
        expiry: expiry,
        amount: amountInCents,
        currency: 'USD',
        capture: 'y',
        cvv2: validatedData.cvv,
        receipt: 'y',
        email: validatedData.email,
        name: validatedData.name,
        postal: validatedData.zip,
        userfields: {
          donation_message: donationMessage,
          donor_name: validatedData.name,
          invoice_number: `DONATION-${assignedTicket.ticketNumber}`,
          description: 'Thank you for your donation to Yeshivas Tiferes Yisroel v\'Moshe',
        },
      });

      // Check if transaction was approved
      if (!isTransactionApproved(response)) {
        throw new Error(response.resptext || 'Transaction declined');
      }

      // Step 4: Mark ticket as sold and save transaction ID
      await db
        .update(tickets)
        .set({
          status: 'sold',
          amountPaid: assignedTicket.ticketNumber,
          transactionId: response.retref, // Using retref (retrieval reference number) as transaction ID
          purchasedAt: new Date(),
        })
        .where(eq(tickets.id, assignedTicket.id));

      // Success!
      return NextResponse.json({
        success: true,
        ticketNumber: assignedTicket.ticketNumber,
        amountCharged: assignedTicket.ticketNumber,
        transactionId: response.retref,
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

      // Record failed payment attempt for IP blocking
      const cardLastFour = validatedData.cardNumber.slice(-4);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      const { blocked } = await recordFailedAttempt(clientIp, cardLastFour, errorMessage);

      if (blocked) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many failed payment attempts. Your access has been temporarily restricted.',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `${errorMessage}. Your card was not charged. Please try again.`,
        },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error('Error in raffle entry:', err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
