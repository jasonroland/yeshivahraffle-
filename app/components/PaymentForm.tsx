'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentFormProps {
  onCancel: () => void;
}

export default function PaymentForm({ onCancel }: PaymentFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    zip: '',
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvv: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

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
          zip: formData.zip,
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          expMonth: formData.expMonth.padStart(2, '0'),
          expYear: formData.expYear,
          cvv: formData.cvv,
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="Your name"
          autoComplete="name"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="your@email.com"
          autoComplete="email"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="(555) 123-4567"
          autoComplete="tel"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="ccnumber" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Card Number
        </label>
        <input
          id="ccnumber"
          name="ccnumber"
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
          autoComplete="cc-number"
          maxLength={19}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="ccmonth" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Month
          </label>
          <input
            id="ccmonth"
            name="ccmonth"
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
            autoComplete="cc-exp-month"
            maxLength={2}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="ccyear" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Year
          </label>
          <input
            id="ccyear"
            name="ccyear"
            type="text"
            required
            value={formData.expYear}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, expYear: value.slice(0, 4) });
            }}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="YYYY"
            autoComplete="cc-exp-year"
            maxLength={4}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="cvc" className="block text-sm font-semibold text-slate-700 mb-1.5">
            CVV
          </label>
          <input
            id="cvc"
            name="cvc"
            type="text"
            required
            value={formData.cvv}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, cvv: value.slice(0, 4) });
            }}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="123"
            autoComplete="cc-csc"
            maxLength={4}
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="zip" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Zip Code
        </label>
        <input
          id="zip"
          name="zip"
          type="text"
          required
          value={formData.zip}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            setFormData({ ...formData, zip: value.slice(0, 5) });
          }}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="12345"
          autoComplete="postal-code"
          maxLength={5}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="pt-2 space-y-2">
        <button
          type="submit"
          disabled={loading}
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
