# Wine Raffle Setup Guide

This guide will help you set up the database and Stripe integration for the Wine Raffle application.

## Prerequisites

- Node.js installed
- Supabase account (free)
- Stripe account

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in the project details:
   - **Name**: Wine Raffle (or any name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **Create new project** (takes ~2 minutes)
5. Once created, go to **Project Settings** (gear icon in sidebar)
6. Go to **Database** section
7. Scroll down to **Connection String**
8. Select **Transaction** mode (important!)
9. Copy the connection string (it will have port 6543)

## Step 3: Set Up Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Make sure you're in **Test Mode** (toggle in top right)
3. Go to **Developers** → **API Keys**
4. Copy the following:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

## Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:
   ```env
   # Supabase Database (from Step 2)
   DATABASE_URL="postgres://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

   # Stripe Keys (from Step 3)
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

## Step 5: Create Database Tables

Run the following command to push the schema to your database:

```bash
npx drizzle-kit push
```

This will create the `tickets` table with the necessary schema.

## Step 6: Initialize Database with 100 Tickets

You can initialize the database in two ways:

### Option A: Using the API (Recommended)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Make a POST request to initialize:
   ```bash
   curl -X POST http://localhost:3000/api/raffle/init
   ```

   Or visit `http://localhost:3000/api/raffle/init` in your browser and use a tool like Postman to make a POST request.

### Option B: Using Drizzle Studio

```bash
npx drizzle-kit studio
```

This opens a web interface where you can manually insert data.

## Step 7: Test the Application

1. Start the development server (if not already running):
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`

3. Click **"Enter Raffle Now"**

4. Fill in the form with test data

5. Use a Stripe test card:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)

6. Submit and watch for:
   - Random ticket assignment
   - Success message with ticket number and amount
   - Ticket board updating in real-time

## Step 8: Deploy to Vercel

1. Push your code to GitHub (make sure `.env.local` is in `.gitignore`)

2. Go to Vercel Dashboard → Import Project

3. Connect your GitHub repository

4. Add the same environment variables from `.env.local` in the Vercel project settings:
   - Go to **Settings** → **Environment Variables**
   - Add each variable from your `.env.local`

5. Deploy!

6. After deployment, run the init endpoint once:
   ```bash
   curl -X POST https://your-app.vercel.app/api/raffle/init
   ```

## Troubleshooting

### Database Connection Issues

- Make sure `DATABASE_URL` is correctly set in `.env.local`
- Check that you've run `npm run db:push` to create tables
- Verify your Supabase database is active
- Ensure you're using the **Transaction mode** connection string (port 6543, not 5432)

### Stripe Payment Issues

- Ensure you're using **test mode** keys (starts with `pk_test_` and `sk_test_`)
- Use Stripe test cards: https://stripe.com/docs/testing
- Check the browser console and terminal for error messages

### Tickets Not Updating

- Check that you've initialized the database with `/api/raffle/init`
- Verify the API route `/api/raffle/tickets` returns data
- Check browser console for fetch errors

## Production Checklist

Before going live with real money:

- [ ] Switch to Stripe **live mode** keys
- [ ] Update environment variables in Vercel with live keys
- [ ] Test the entire flow end-to-end
- [ ] Set up email notifications (optional)
- [ ] Configure Stripe webhooks for payment confirmations (optional)
- [ ] Review Stripe payment settings and business information
- [ ] Test race conditions with multiple simultaneous entries

## API Routes Reference

- `POST /api/raffle/init` - Initialize database with 100 tickets
- `GET /api/raffle/tickets` - Get all tickets and stats
- `POST /api/raffle/enter` - Enter the raffle (handles payment)

## Database Schema

```typescript
tickets {
  id: serial (primary key)
  ticketNumber: integer (unique, 1-100)
  status: enum ('available' | 'reserved' | 'sold')
  buyerName: varchar (nullable)
  buyerEmail: varchar (nullable)
  buyerPhone: varchar (nullable)
  amountPaid: integer (nullable)
  stripePaymentIntentId: varchar (nullable)
  reservedAt: timestamp (nullable)
  purchasedAt: timestamp (nullable)
  createdAt: timestamp (not null, default now)
}
```

## How Race Conditions Are Prevented

The system uses PostgreSQL's `SELECT FOR UPDATE SKIP LOCKED` to ensure that even if 100 people submit at the exact same millisecond, each person gets a unique ticket. The database locks the selected row during the transaction, preventing other requests from grabbing the same ticket.

## Support

For issues or questions, check:
- Database logs in Supabase Dashboard → Logs
- Stripe logs in Stripe Dashboard → Developers → Logs
- Browser console for frontend errors
- Terminal output for backend errors
