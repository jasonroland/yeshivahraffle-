import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { tickets } from '@/src/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all tickets with their status
    const allTickets = await db
      .select({
        ticketNumber: tickets.ticketNumber,
        status: tickets.status,
      })
      .from(tickets)
      .orderBy(tickets.ticketNumber);

    // Get counts
    const stats = await db
      .select({
        status: tickets.status,
        count: sql<number>`count(*)`,
      })
      .from(tickets)
      .groupBy(tickets.status);

    const soldCount = stats.find(s => s.status === 'sold')?.count || 0;
    const reservedCount = stats.find(s => s.status === 'reserved')?.count || 0;
    const availableCount = stats.find(s => s.status === 'available')?.count || 0;

    return NextResponse.json({
      tickets: allTickets,
      stats: {
        total: 100,
        sold: Number(soldCount),
        reserved: Number(reservedCount),
        available: Number(availableCount),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket data' },
      { status: 500 }
    );
  }
}
