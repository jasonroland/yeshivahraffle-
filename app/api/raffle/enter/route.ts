import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/src/db';
import { tickets } from '@/src/db/schema';
import { getMerchantAuthentication, ApiContracts, ApiControllers } from '@/src/lib/authorizenet';
import { eq, sql } from 'drizzle-orm';

const enterRaffleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  opaqueDataDescriptor: z.string().min(1, 'Payment data is required'),
  opaqueDataValue: z.string().min(1, 'Payment data is required'),
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

    // Step 3: Create and charge payment with exact amount using Authorize.Net
    const actualAmount = assignedTicket.ticketNumber; // Amount in dollars

    try {
      // Create the payment data
      const opaqueData = new ApiContracts.OpaqueDataType();
      opaqueData.setDataDescriptor(validatedData.opaqueDataDescriptor);
      opaqueData.setDataValue(validatedData.opaqueDataValue);

      const paymentType = new ApiContracts.PaymentType();
      paymentType.setOpaqueData(opaqueData);

      // Set order information
      const orderDetails = new ApiContracts.OrderType();
      orderDetails.setInvoiceNumber(`DONATION-${assignedTicket.ticketNumber}`);
      orderDetails.setDescription(`Thank you for your donation to Yeshivas Tiferes Yisroel v'Moshe`);

      // Set billing information
      const billTo = new ApiContracts.CustomerAddressType();
      billTo.setFirstName(validatedData.name.split(' ')[0] || validatedData.name);
      billTo.setLastName(validatedData.name.split(' ').slice(1).join(' ') || '');
      billTo.setEmail(validatedData.email);
      billTo.setPhoneNumber(validatedData.phone);

      // Set customer email for receipt
      const customerData = new ApiContracts.CustomerDataType();
      customerData.setEmail(validatedData.email);

      // Create transaction request
      const transactionRequest = new ApiContracts.TransactionRequestType();
      transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
      transactionRequest.setPayment(paymentType);
      transactionRequest.setAmount(actualAmount);
      transactionRequest.setOrder(orderDetails);
      transactionRequest.setBillTo(billTo);
      transactionRequest.setCustomer(customerData);

      // Create request
      const createRequest = new ApiContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(getMerchantAuthentication());
      createRequest.setTransactionRequest(transactionRequest);

      // Execute transaction
      const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());

      const transactionResponse = await new Promise<{
        success: boolean;
        transactionId?: string;
        errorMessage?: string;
      }>((resolve) => {
        ctrl.execute(() => {
          const apiResponse = ctrl.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(apiResponse);

          if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
            const transactionResponse = response.getTransactionResponse();
            if (transactionResponse && transactionResponse.getMessages()) {
              resolve({
                success: true,
                transactionId: transactionResponse.getTransId(),
              });
            } else {
              const errors = transactionResponse?.getErrors();
              const errorMessage = errors
                ? errors.getError().map((e: { getErrorText: () => string }) => e.getErrorText()).join(', ')
                : 'Transaction failed';
              resolve({
                success: false,
                errorMessage,
              });
            }
          } else {
            const errors = response.getTransactionResponse()?.getErrors();
            const errorMessage = errors
              ? errors.getError().map((e: { getErrorText: () => string }) => e.getErrorText()).join(', ')
              : response.getMessages().getMessage()[0].getText();
            resolve({
              success: false,
              errorMessage,
            });
          }
        });
      });

      if (!transactionResponse.success) {
        throw new Error(transactionResponse.errorMessage || 'Payment failed');
      }

      // Step 4: Mark ticket as sold and save transaction ID
      await db
        .update(tickets)
        .set({
          status: 'sold',
          amountPaid: assignedTicket.ticketNumber,
          stripePaymentIntentId: transactionResponse.transactionId || null,
          purchasedAt: new Date(),
        })
        .where(eq(tickets.id, assignedTicket.id));

      // Success!
      return NextResponse.json({
        success: true,
        ticketNumber: assignedTicket.ticketNumber,
        amountCharged: assignedTicket.ticketNumber,
        transactionId: transactionResponse.transactionId,
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

      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
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
