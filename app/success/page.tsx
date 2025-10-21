'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const ticketNumber = searchParams.get('ticket');
  const amountCharged = searchParams.get('amount');
  const receiptUrl = searchParams.get('receipt');

  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    // Stop confetti animation after 3 seconds
    const timer = setTimeout(() => setConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {confetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mazel Tov!
          </h1>
          <p className="text-gray-600">
            You&apos;ve successfully entered the raffle!
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 mb-6 text-white">
          <p className="text-sm uppercase tracking-wide mb-2 opacity-90">
            Your Ticket Number
          </p>
          <p className="text-6xl font-bold mb-2">#{ticketNumber}</p>
          <p className="text-lg">
            Amount Charged: ${amountCharged}.00
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">What&apos;s Next?</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">✉️</span>
                <span>Check your email for a payment receipt from Stripe</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🎯</span>
                <span>The winner will be announced soon</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🍷</span>
                <span>Prize: Premium wine bottle</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-900 mb-1">
              Supporting a Great Cause
            </h3>
            <p className="text-sm text-gray-700">
              Your contribution supports Yeshivas Tiferes Yisroel v&apos;Moshe. Thank you for your generosity!
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {receiptUrl && receiptUrl !== 'null' && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View Receipt
            </a>
          )}

          <Link
            href="/"
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Back to Raffle
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
