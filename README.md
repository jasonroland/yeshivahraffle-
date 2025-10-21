# Wine Raffle for Yeshivas Tiferes Yisroel v'Moshe

A modern, mobile-first raffle application where participants are randomly assigned ticket numbers (1-100) and charged the corresponding amount ($1-$100). Built with Next.js 15, Vercel Postgres, and Stripe.

## Features

- **Random Ticket Assignment**: Users don't choose their ticket - they're randomly assigned one after payment authorization
- **Race Condition Prevention**: Uses PostgreSQL transactions with row-level locking to ensure no duplicate tickets
- **Stripe Integration**: Secure payment processing with authorization before assignment
- **Real-time Updates**: Ticket board updates every 5 seconds showing available/sold tickets
- **Mobile-First Design**: Clean, simple UI optimized for mobile devices
- **Automatic Receipts**: Stripe sends email receipts to participants

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Payments**: Stripe
- **Validation**: Zod

## How It Works

1. User clicks "Enter Raffle Now" and fills in their details + credit card
2. Card is authorized for up to $100 (no charge yet)
3. System randomly assigns an available ticket number (1-100) using database locking
4. Payment amount is updated to match the ticket number
5. Card is charged the exact amount (e.g., ticket #42 = $42)
6. If payment fails, ticket is released back to the pool
7. User receives confirmation and Stripe email receipt

## Race Condition Prevention

The system uses PostgreSQL's `SELECT FOR UPDATE SKIP LOCKED` to prevent race conditions:

```sql
SELECT * FROM tickets
WHERE status = 'available'
ORDER BY RANDOM()
LIMIT 1
FOR UPDATE SKIP LOCKED
```

This ensures that even if 100 people submit simultaneously, each gets a unique ticket.

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Fill in your Supabase DATABASE_URL and Stripe keys

# 3. Push database schema
npm run db:push

# 4. Start development server
npm run dev

# 5. Initialize database with 100 tickets
curl -X POST http://localhost:3000/api/raffle/init
```

## API Routes

- `POST /api/raffle/init` - Initialize 100 tickets
- `GET /api/raffle/tickets` - Get all tickets and stats
- `POST /api/raffle/enter` - Enter raffle (handles payment flow)

## Testing

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

## Database Schema

```typescript
tickets {
  id                     serial PRIMARY KEY
  ticketNumber           integer UNIQUE (1-100)
  status                 enum ('available', 'reserved', 'sold')
  buyerName              varchar
  buyerEmail             varchar
  buyerPhone             varchar
  amountPaid             integer
  stripePaymentIntentId  varchar
  reservedAt             timestamp
  purchasedAt            timestamp
  createdAt              timestamp DEFAULT NOW()
}
```

## Deployment

1. Push code to GitHub
2. Import to Vercel
3. Add environment variables in Vercel settings
4. Deploy
5. Initialize database: `curl -X POST https://your-app.vercel.app/api/raffle/init`

## License

Private - Yeshivas Tiferes Yisroel v'Moshe
