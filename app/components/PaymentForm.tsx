'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentFormProps {
  onCancel: () => void;
}

declare global {
  interface Window {
    Accept: {
      dispatchData: (
        secureData: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: {
            cardNumber: string;
            month: string;
            year: string;
            cardCode: string;
          };
        },
        callback: (response: {
          messages: {
            resultCode: string;
            message: Array<{ code: string; text: string }>;
          };
          opaqueData?: {
            dataDescriptor: string;
            dataValue: string;
          };
        }) => void
      ) => void;
    };
  }
}

export default function PaymentForm({ onCancel }: PaymentFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptJsLoaded, setAcceptJsLoaded] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvv: '',
  });

  // Load Accept.js script
  useEffect(() => {
    const script = document.createElement('script');
    const isProduction = process.env.NEXT_PUBLIC_AUTHORIZENET_ENVIRONMENT === 'production';
    script.src = isProduction
      ? 'https://js.authorize.net/v1/Accept.js'
      : 'https://jstest.authorize.net/v1/Accept.js';
    script.async = true;
    script.onload = () => setAcceptJsLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!acceptJsLoaded || !window.Accept) {
      setError('Payment system not loaded. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare secure data for Accept.js
      const authData = {
        clientKey: process.env.NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY!,
        apiLoginID: process.env.NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID!,
      };

      const cardData = {
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        month: formData.expMonth.padStart(2, '0'),
        year: formData.expYear,
        cardCode: formData.cvv,
      };

      const secureData = { authData, cardData };

      // Get payment nonce from Authorize.Net
      window.Accept.dispatchData(secureData, async (response) => {
        if (response.messages.resultCode === 'Error') {
          const errorMsg = response.messages.message
            .map((msg) => msg.text)
            .join(', ');
          setError(errorMsg || 'Failed to process card information');
          setLoading(false);
          return;
        }

        if (!response.opaqueData) {
          setError('Failed to get payment token');
          setLoading(false);
          return;
        }

        try {
          // Call our API to enter the raffle
          const apiResponse = await fetch('/api/raffle/enter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              opaqueDataDescriptor: response.opaqueData.dataDescriptor,
              opaqueDataValue: response.opaqueData.dataValue,
            }),
          });

          const data = await apiResponse.json();

          if (!apiResponse.ok || !data.success) {
            throw new Error(data.error || 'Failed to enter raffle');
          }

          // Redirect to success page with ticket details
          const params = new URLSearchParams({
            ticket: data.ticketNumber.toString(),
            amount: data.amountCharged.toString(),
            transactionId: data.transactionId || '',
          });
          router.push(`/success?${params.toString()}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
          setLoading(false);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="Your name"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Email
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="your@email.com"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Phone
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="(555) 123-4567"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Card Number
        </label>
        <input
          type="text"
          required
          value={formData.cardNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            setFormData({ ...formData, cardNumber: formatted });
          }}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Month
          </label>
          <input
            type="text"
            required
            value={formData.expMonth}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12)) {
                setFormData({ ...formData, expMonth: value.slice(0, 2) });
              }
            }}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="MM"
            maxLength={2}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Year
          </label>
          <input
            type="text"
            required
            value={formData.expYear}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, expYear: value.slice(0, 4) });
            }}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="YYYY"
            maxLength={4}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            CVV
          </label>
          <input
            type="text"
            required
            value={formData.cvv}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, cvv: value.slice(0, 4) });
            }}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="123"
            maxLength={4}
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="pt-2 space-y-2">
        <button
          type="submit"
          disabled={!acceptJsLoaded || loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Submit Entry'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
