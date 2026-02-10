# Safe Family - Build History & Implementation Archive

> This document archives completed implementation details, migration specs, and build instructions that were used during development. For current operational docs, see [CLAUDE.md](../CLAUDE.md).

*Archived: February 10, 2026*

---

## Table of Contents
1. [Migration Plan](#migration-plan)
2. [App Consistency Implementation](#app-consistency-implementation)
3. [SafeReads Trial Conversion](#safereads-trial-conversion)
4. [Settings Page Components](#settings-page-components)
5. [Landing Page Specifications](#landing-page-specifications)
6. [Admin Dashboard Specifications](#admin-dashboard-specifications)
7. [Design System](#design-system)
8. [Stripe Integration Details](#stripe-integration-details)
9. [Completed Tasks Log](#completed-tasks-log)

---

## Migration Plan

### Phase 0: Folder Restructure ✅ COMPLETED

All projects moved into safecontent monorepo:
```
~/safecontent/
├── apps/
│   ├── safetunes/      → from ~/applemusicwhitelist
│   ├── safetube/       → from ~/safetubes
│   └── safereads/      → from ~/safereads
├── sites/
│   └── marketing/      → getsafefamily.com
└── CLAUDE.md
```

### Phase 1: Marketing Site & Admin Dashboard ✅ COMPLETED
- [x] Choose final brand name: Safe Family
- [x] Create Vercel project (getsafecontent → getsafefamily.com)
- [x] Initialize Next.js project
- [x] Register domain: getsafefamily.com
- [x] Build marketing landing pages
- [x] Build admin dashboard
- [x] Create bundle Stripe product
- [x] Launch marketing site

### Phase 2: App Consistency & Admin Endpoints ✅ COMPLETED
All three apps now have consistent admin capabilities:
- SafeTunes: `/grantLifetime`, `/deleteUser`, `/adminDashboard`
- SafeTube: `/setSubscriptionStatus`, `/deleteUser`, `/adminDashboard`
- SafeReads: `/grantLifetime`, `/deleteUser`, `/adminDashboard`

### Phase 3: Auth Unification (FUTURE - Post-Launch)
Not implemented for MVP. Each app has separate auth:
- SafeTunes & SafeTube: Better Auth (email/password)
- SafeReads: Convex Auth (Google OAuth)

Future plan: Create shared Convex auth project for single sign-on.

---

## App Consistency Implementation

### Feature Matrix (Final State)

| Feature | SafeTunes | SafeTube | SafeReads |
|---------|-----------|----------|-----------|
| Auth Provider | Better Auth | Better Auth | Convex Auth |
| Email/Password | ✓ | ✓ | ✗ |
| Google OAuth | ✗ | ✗ | ✓ |
| HTTP: grantLifetime | ✓ | ✓ | ✓ |
| HTTP: deleteUser | ✓ | ✓ | ✓ |
| HTTP: adminDashboard | ✓ | ✓ | ✓ |
| Promo codes | ✓ | ✓ | ✓ |
| Stripe integration | ✓ | ✓ | ✓ |
| Account deletion | ✓ | ✓ | ✓ |
| Cancellation modal | ✓ | ✓ | N/A |

### Subscription Status Values (Standardized)
All apps use: `trial`, `active`, `cancelled`, `lifetime`, `past_due`, `expired`

---

## SafeReads Trial Conversion

Converted from "3 free analyses" to "7-day free trial" for consistency.

### Schema Changes
```typescript
// Added to users table:
trialExpiresAt: v.optional(v.number()),
subscriptionStatus: v.optional(v.union(
  v.literal("trial"),
  v.literal("active"),
  v.literal("lifetime"),
  v.literal("canceled"),
  v.literal("past_due"),
  v.literal("incomplete")
)),
```

### Key Logic
```typescript
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const trialExpiresAt = user.trialExpiresAt ?? (user._creationTime + TRIAL_DURATION_MS);
const isTrialValid = status === "trial" && now < trialExpiresAt;
const hasAccess = isSubscribed || isTrialValid;
```

### Files Modified
- `convex/schema.ts`
- `convex/subscriptions.ts`
- `src/components/VerdictSection.tsx`
- `src/components/UpgradePrompt.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/page.tsx`

---

## Settings Page Components

### Unified "Your Apps" Component
Created for bundle users to see all apps they have access to:
```tsx
interface YourAppsProps {
  currentApp: 'safetunes' | 'safetube' | 'safereads';
  hasAccessTo: {
    safetunes: boolean;
    safetube: boolean;
    safereads: boolean;
  };
  bundleSubscription?: {
    status: string;
    renewsAt?: Date;
    price: string;
  };
}
```

### Ported Components
- Billing History Component (from SafeTunes to others)
- Cancellation Reason Modal (from SafeTunes to SafeTube)
- Account Deletion (all apps)

---

## Landing Page Specifications

### Hero Section
- Headline: "Stop worrying about what they're watching."
- Platform badges: Apple Music, YouTube, Any Book
- CTA: "Get All 3 Apps — $9.99/mo"
- Trust signals: 7-day free trial, No credit card required, Cancel anytime

### Page Sections
1. Hero with cycling text animation
2. Problem Section - "Kids apps too limited, regular apps too open"
3. Demo Section - Live search for books, songs, channels
4. App Cards with realistic previews
5. Testimonials (6 total, 2 per app)
6. FAQ Section (8 Q&As)
7. Pricing with monthly/yearly toggle

### Hero Images
- SafeTunes: Boy with headphones (Pexels 1490844)
- SafeTube: Family on tablet (Pexels 4473777)
- SafeReads: Girl reading
- Marketing: Kids on tablet (Pexels 4908731)

All images: `aspect-[4/5]`, `borderRadius: '0 3rem 3rem 3rem'`, `object-cover`

---

## Admin Dashboard Specifications

### Authentication
- Single authorized user: jedaws@gmail.com
- Session stored in HTTP-only cookie

### Stats Cards
- Total Users (per app breakdown)
- Active Subscriptions
- Lifetime Users
- Trial Users

### User Management
- Filter by app, status
- Search by email
- Actions: Grant Lifetime, Revoke, Delete

---

## Design System

### Color Palette
```css
/* SafeTunes - Purple */
--safetunes-gradient: linear-gradient(135deg, #6366f1, #8b5cf6);

/* SafeTube - Red/Orange */
--safetube-gradient: linear-gradient(135deg, #ef4444, #f97316);

/* SafeReads - Green/Teal */
--safereads-gradient: linear-gradient(135deg, #10b981, #14b8a6);
```

### Typography
- Font: Inter, system-ui, sans-serif
- h1: 3rem/700, h2: 2.25rem/600, h3: 1.5rem/600
- Body: 1rem/400

---

## Stripe Integration Details

### Bundle Product
- Product ID: `prod_TvRXoGfAONo3nA`
- Monthly Price: `price_1SxaerKgkIT46sg7NHNy0wk8` ($9.99)
- Yearly Price: `price_1SzLJUKgkIT46sg7xsKo2A71` ($99)

### Webhook Events
- `checkout.session.completed` → Grant lifetime to all 3 apps
- `customer.subscription.updated` → Re-grant or revoke
- `customer.subscription.deleted` → Revoke access
- `invoice.payment_failed` → Log for manual follow-up

### Checkout Flow
1. User clicks CTA on marketing site
2. Create Stripe checkout session with bundle price
3. Redirect to Stripe hosted checkout
4. On success, webhook fires
5. Webhook grants lifetime access to all 3 apps via admin endpoints
6. User redirected to success page

---

## Completed Tasks Log

### February 10, 2026
- [x] Hero images added to all 4 landing pages
- [x] Mobile responsiveness testing automated with Playwright
- [x] safecontent-r55 EPIC closed (UI/UX audit)
- [x] safecontent-8wo EPIC closed (Account pages audit)
- [x] Michelle granted lifetime on all 3 apps
- [x] Yearly pricing added ($99/year)
- [x] CLAUDE.md restructured for launch

### February 5, 2026
- [x] Marketing site built and deployed
- [x] Bundle Stripe product created
- [x] Admin endpoints added to all apps
- [x] SafeReads trial conversion (3 analyses → 7 days)
- [x] Security incident remediated (rotated exposed keys)
- [x] Amazon affiliate setup submitted

### Earlier
- [x] Monorepo structure created
- [x] Individual apps developed and launched
- [x] Stripe integration per app
- [x] Better Auth / Convex Auth setup

---

## Rollback Procedures (Reference)

### Git Revert
```bash
git log --oneline -10
git revert HEAD~N..HEAD
```

### Convex Rollback
```bash
git checkout <last-good-commit>
CONVEX_DEPLOYMENT=prod:xxx npx convex deploy
```

### Vercel Rollback
1. Vercel dashboard → Project → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

---

*End of Build History Archive*
