'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/src/lib/stripe-client';
import PaymentForm from '@/app/components/PaymentForm';

interface TicketData {
  ticketNumber: number;
  status: 'available' | 'reserved' | 'sold';
}

interface TicketStats {
  total: number;
  sold: number;
  reserved: number;
  available: number;
}

export default function Home() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 100,
    sold: 0,
    reserved: 0,
    available: 100,
  });
  const [loading, setLoading] = useState(true);

  const stripePromise = getStripe();

  // Fetch ticket data
  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/raffle/tickets');
      const data = await response.json();
      setTickets(data.tickets);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalTickets = 100;
  const allTicketNumbers = Array.from({ length: totalTickets }, (_, i) => i + 1);
  const soldTicketNumbers = new Set(
    tickets.filter(t => t.status === 'sold' || t.status === 'reserved').map(t => t.ticketNumber)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 text-center">
            Wine Raffle
          </h1>
          <p className="text-xs text-slate-600 text-center mt-1">
            Yeshivas Tiferes Yisroel v&apos;Moshe
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Raffle Image */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden relative aspect-video">
          <Image
            src="/Document.png"
            alt="YTYM Group"
            layout="fill"
            objectFit="contain"
            priority
          />
        </div>
        {/* CTA Button */}
        <button
          onClick={() => setShowPaymentModal(true)}
          className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow hover:bg-blue-700"
        >
          Enter Raffle Now
        </button>

        {/* Stats */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.available}</div>
              <div className="text-xs text-slate-600">Available</div>
            </div>
            <div className="w-px h-12 bg-slate-200"></div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.sold}</div>
              <div className="text-xs text-slate-600">Sold</div>
            </div>
          </div>
        </div>

        {/* Prize */}
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="text-6xl mb-3">🍷</div>
          <h2 className="text-lg font-bold text-slate-900">Premium Wine Bottle</h2>
          <p className="text-sm text-slate-600 mt-1">Win this beautiful prize!</p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">How It Works</h3>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <p className="text-sm text-slate-700 pt-0.5">
                Click &ldquo;Enter Raffle Now&rdquo; and fill in your details
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <p className="text-sm text-slate-700 pt-0.5">
                Get randomly assigned a ticket number (1-100)
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <p className="text-sm text-slate-700 pt-0.5">
                Pay the amount of your ticket number ($1-$100)
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                4
              </div>
              <p className="text-sm text-slate-700 pt-0.5">
                Winner drawn when all tickets are sold
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-slate-700">
              <strong>Note:</strong> Your payment depends on your randomly assigned ticket. You could pay as little as $1 or up to $100.
            </p>
          </div>
        </div>

        {/* Ticket Grid */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">Ticket Board</h3>
          <p className="text-xs text-slate-600 mb-4">
            Live view of all tickets. You&apos;ll be randomly assigned one when you enter the raffle.
          </p>

          <div className="flex gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              <span className="text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
              <span className="text-slate-600">Sold</span>
            </div>
          </div>

          <div className="grid grid-cols-10 gap-1.5">
            {allTicketNumbers.map((ticketNumber) => (
              <div
                key={ticketNumber}
                className={`
                  aspect-square rounded flex items-center justify-center text-[10px] font-semibold
                  ${soldTicketNumbers.has(ticketNumber)
                    ? 'bg-slate-300 text-slate-600'
                    : 'bg-emerald-500 text-white'
                  }
                `}
              >
                {ticketNumber}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Disclaimer */}
      <div className="max-w-md mx-auto px-4 pt-2 pb-8 text-xs text-slate-500">
        <h4 className="font-bold mb-2 text-slate-600">
          No Purchase Necessary Clause
        </h4>
        <div className="space-y-2">
          <p>
            No purchase, donation, or payment of any kind is necessary to enter
            or win. A purchase or donation will not increase your chances of
            winning. To enter without purchase, participants may submit a
            legibly handwritten postcard, no larger than 4” x 6”, containing
            their full name, complete mailing address, phone number, and email
            address to:
          </p>
          <p>
            YTYM
            <br />
            Attn: “No Purchase Necessary Entry”
            <br />
            1069 Dickens Street
            <br />
            Far Rockaway, NY 11691
          </p>
          <p>
            All mail-in entries must be received by November 21, 2025 to be
            eligible. Entries that are incomplete, illegible, mechanically
            reproduced, or received after the deadline will not be accepted.
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <Elements stripe={stripePromise}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Enter Raffle</h3>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
                <p className="text-xs text-slate-700">
                  You will be randomly assigned a ticket number and charged $1-$100 based on that number.
                </p>
              </div>

              <PaymentForm
                onCancel={() => setShowPaymentModal(false)}
              />
            </div>
          </div>
        </Elements>
      )}
    </div>
  );
}
