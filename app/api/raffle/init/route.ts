import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { tickets } from '@/src/db/schema';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Check if tickets already exist
    const existingTickets = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets);

    if (existingTickets[0] && existingTickets[0].count > 0) {
      return NextResponse.json(
        { message: 'Database already initialized', count: Number(existingTickets[0].count) },
        { status: 200 }
      );
    }

    // Create 100 tickets (1-100)
    const ticketsToInsert = Array.from({ length: 100 }, (_, i) => ({
      ticketNumber: i + 1,
      status: 'available' as const,
    }));

    await db.insert(tickets).values(ticketsToInsert);

    return NextResponse.json({
      success: true,
      message: 'Successfully initialized 100 tickets',
      count: 100,
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
