# SafeReads

AI-powered book content analysis for parents. Search books, get objective content reviews to make informed decisions.

## Stack

- Next.js 15 (App Router, TypeScript, `src/` directory)
- Convex (backend, real-time DB, actions for external APIs)
- Convex Auth (authentication, Google OAuth)
- Stripe (subscriptions, $2.99/mo Pro plan)
- Resend (transactional emails - welcome email on subscription)
- OpenAI GPT-4o (AI verdict engine with structured JSON output)
- Tailwind CSS (bookish theme: parchment palette, Libre Baskerville + Inter)
- Radix UI primitives for accessible components
- Lucide React for icons

## Commands

```bash
npm run dev          # Start Next.js dev server
npx convex dev       # Start Convex dev server (run alongside npm run dev)
npm run build        # Production build
npm run lint         # ESLint
```

## Architecture

- **Convex actions** for external API calls (Google Books, Open Library, OpenAI)
- **Convex queries/mutations** for DB reads/writes
- Books cached permanently (metadata is static)
- **One analysis per book** — objective content review, not personalized to user profiles
- Analyses keyed by `bookId` only (no profile dependency)
- "No Verdict" returned when insufficient book data

## Subscription Flow

1. Free users get 3 trial reviews
2. Upgrade triggers Stripe Checkout (`/api/stripe/checkout`)
3. Stripe webhook (`/api/webhooks/stripe`) updates user subscription status
4. Welcome email sent via Resend on `customer.subscription.created`
5. Success modal shown on redirect to `/dashboard?subscription=success`

## Environment Variables (Vercel Production)

- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_PRICE_ID` — Pro plan price ID
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `RESEND_API_KEY` — Resend email API key
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `NEXT_PUBLIC_APP_URL` — App URL (https://getsafereads.com)

## Key Directories

```
src/app/                    # Next.js App Router pages
src/app/dashboard/          # Authenticated pages (protected by middleware)
src/components/             # React components
convex/                     # Convex backend (schema, queries, mutations, actions)
convex/lib/                 # Shared utilities
```

## Quality Gates

All must pass before committing:
1. `npm run build` — no TypeScript or build errors
2. `npm run lint` — no ESLint errors

## Philosophy

This codebase will outlive you. Fight entropy. Leave it better than you found it.
