# GetSafeContent Marketing Site

Marketing and bundle checkout site for the SafeContent family of apps:
- **SafeTunes** - Parent-approved Apple Music for kids
- **SafeTube** - Parent-approved YouTube for kids
- **SafeReads** - AI-powered book content analysis

## Features

- Landing page with app showcase and interactive demos
- Bundle subscription checkout via Stripe
- Admin dashboard for managing users across all apps
- Success page with links to all three apps

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in the values:
   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required environment variables. Key ones:

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_BUNDLE_PRICE_ID` | Price ID for the bundle product |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `NEXT_PUBLIC_URL` | Base URL for redirects |
| `ADMIN_API_KEY` | Shared key for app admin endpoints |

## Stripe Setup

1. Create a product in Stripe Dashboard:
   - Name: "Safe Family Bundle"
   - Price: $9.99/month (or $99/year)
   - Add metadata: `bundle: true`

2. Copy the price ID to `STRIPE_BUNDLE_PRICE_ID`

3. Create a webhook endpoint pointing to `/api/stripe/webhook`:
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## Admin Dashboard

Access at `/admin` (restricted to jedaws@gmail.com via Google OAuth).

Features:
- View all users across SafeTunes, SafeTube, and SafeReads
- Grant/revoke lifetime subscriptions
- Delete users

## Deployment

Deployed on Vercel: https://getsafecontent.vercel.app

Set all environment variables in Vercel project settings.
