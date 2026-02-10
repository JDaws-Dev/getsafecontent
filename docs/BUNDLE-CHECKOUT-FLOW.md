# Safe Family Bundle Checkout & Signup Flow

This document describes the complete user journey from landing page to using all 3 Safe Family apps.

## Overview

The Safe Family bundle is a single subscription that grants access to:
- **SafeTunes** - Music curation with AI lyric analysis
- **SafeTube** - YouTube channel allowlisting
- **SafeReads** - Book content analysis

**Pricing:**
- Monthly: $9.99/mo
- Yearly: $99/year (17% savings)

---

## The Bundle Checkout Flow

### Step 1: User Lands on getsafefamily.com

User arrives at the marketing landing page and clicks "Get Started" or navigates to the pricing section.

### Step 2: User Clicks Checkout Button

The `CheckoutButton` component in `PricingSection.tsx` handles the checkout:

1. User clicks "Subscribe Now" (monthly or yearly plan)
2. Frontend sends POST to `/api/checkout` with:
   - `email` (optional - if user entered it)
   - `priceId` (monthly or yearly Stripe price ID)

**Code location:** `sites/marketing/src/app/api/checkout/route.ts`

### Step 3: Stripe Checkout Session Created

The checkout API:
1. Creates a Stripe Checkout Session with:
   - `mode: "subscription"`
   - `metadata.bundle: "true"` (identifies this as a bundle purchase)
   - `subscription_data.metadata.bundle: "true"` (for webhook handling)
2. Returns the Stripe checkout URL to frontend
3. User is redirected to Stripe's hosted checkout page

### Step 4: User Completes Payment on Stripe

User enters:
- Email address
- Payment card details
- Billing address

Stripe processes the payment.

### Step 5: Stripe Sends Webhook

On successful payment, Stripe sends `checkout.session.completed` webhook to:
`https://getsafefamily.com/api/stripe/webhook`

**Code location:** `sites/marketing/src/app/api/stripe/webhook/route.ts`

### Step 6: Webhook Provisions Access to All 3 Apps

The webhook handler:
1. Verifies the event is a bundle purchase (`metadata.bundle === "true"`)
2. Extracts customer email from the session
3. Calls `grantBundleAccess(email)` which makes parallel API calls to:

| App | Endpoint | Effect |
|-----|----------|--------|
| SafeTunes | `/grantLifetime?email=...&key=...` | Sets `subscriptionStatus: "lifetime"` |
| SafeTube | `/setSubscriptionStatus?email=...&status=lifetime&key=...` | Sets `subscriptionStatus: "lifetime"` |
| SafeReads | `/grantLifetime?email=...&key=...` | Sets `subscriptionStatus: "lifetime"` (creates user if needed) |

**Important:** The endpoints use the `ADMIN_API_KEY` for authentication.

### Step 7: User Sees Success Page

After Stripe payment, user is redirected to:
`https://getsafefamily.com/success?session_id={CHECKOUT_SESSION_ID}`

The success page:
- Confirms subscription is active
- Shows links to all 3 apps
- Instructs user to sign up with the **same email address**

**Code location:** `sites/marketing/src/app/success/page.tsx`

---

## User Signup on Individual Apps

After checkout, the user must create an account on each app they want to use.

### Scenario A: User Signs Up With Bundle Email

**This is the expected flow:**

1. User clicks link to app (e.g., getsafetunes.com)
2. User signs up with **the same email they used for Stripe checkout**
3. The app's `afterUserCreatedOrUpdated` callback initializes the user
4. Since the bundle webhook already set their status to "lifetime", they have full access

**Why this works:**
- Bundle webhook pre-set `subscriptionStatus: "lifetime"` for that email
- When user signs up, the app finds the existing user record (or the newly patched one)
- User immediately has full access, no trial

### Scenario B: User Signs Up With Different Email

**This is a problem scenario:**

1. User signs up with a different email than they used for Stripe
2. The new user record starts with `subscriptionStatus: "trial"`
3. They don't get the bundle access they paid for

**Solution:** The success page clearly instructs users to use the same email.

### Scenario C: User Already Has Account on One App

1. User already has a SafeTunes account (for example)
2. They buy the bundle using that same email
3. Webhook calls `/grantLifetime` on SafeTunes
4. SafeTunes updates the existing user to `subscriptionStatus: "lifetime"`
5. Next time user logs in, they have lifetime access

**This works seamlessly** - the webhook updates existing users.

---

## App-Specific Behaviors

### SafeTunes (`apps/safetunes`)

**Signup flow:**
- Email/password OR Google OAuth
- New users start with `subscriptionStatus: "trial"`
- Trial lasts 7 days
- `afterUserCreatedOrUpdated` initializes: familyCode, createdAt, subscriptionStatus

**Grant lifetime mutation:**
- Located in `convex/users.ts` → `grantLifetimeByEmailInternal`
- **Requires user to exist** - throws error if user not found
- Updates existing user to `subscriptionStatus: "lifetime"`

### SafeTube (`apps/safetube`)

**Signup flow:**
- Email/password OR Google OAuth
- New users start with `subscriptionStatus: "trial"`
- Trial lasts 7 days
- `afterUserCreatedOrUpdated` initializes: familyCode, createdAt, subscriptionStatus

**Set subscription status mutation:**
- Located in `convex/users.ts` → `setSubscriptionStatusByEmailInternal`
- **Requires user to exist** - throws error if user not found
- Updates existing user to specified status

### SafeReads (`apps/safereads`)

**Signup flow:**
- Email/password OR Google OAuth
- New users start with `subscriptionStatus: "trial"`
- Trial lasts 7 days
- `afterUserCreatedOrUpdated` initializes: subscriptionStatus, trialExpiresAt, analysisCount

**Grant lifetime mutation:**
- Located in `convex/subscriptions.ts` → `grantLifetimeInternal`
- **Creates user if not found** (pre-provisioning)
- New users created with: email, name (optional), subscriptionStatus: "lifetime", analysisCount: 0
- Existing users updated to `subscriptionStatus: "lifetime"`

---

## Critical Differences Between Apps

| Behavior | SafeTunes | SafeTube | SafeReads |
|----------|-----------|----------|-----------|
| Pre-provision new user | No | No | **Yes** |
| Error if user not found | Yes | Yes | No (creates) |
| Required for bundle to work | User must signup first | User must signup first | Works even before signup |

**Important:** Because SafeTunes and SafeTube require the user to exist, and the webhook runs immediately after checkout:

1. If user has never signed up → webhook may fail for SafeTunes/SafeTube
2. The user then signs up → starts with "trial" status
3. **Gap:** User may not have bundle access until they contact support

**Workaround:** Users are instructed to check all 3 apps after signup. If access isn't working, contact support.

---

## Subscription Lifecycle Events

### Subscription Updated (status change)

When subscription status changes (e.g., payment failure):

1. Stripe sends `customer.subscription.updated` webhook
2. Handler checks `metadata.bundle === "true"`
3. Looks up customer email from Stripe
4. If `status === "active"`: re-grants access via `grantBundleAccess()`
5. If `status === "canceled"` or `"unpaid"`: revokes access via `revokeBundleAccess()`

### Subscription Deleted (cancelled)

When subscription is cancelled:

1. Stripe sends `customer.subscription.deleted` webhook
2. Handler revokes access by calling:
   - SafeTunes: `/setSubscriptionStatus?status=expired`
   - SafeTube: `/setSubscriptionStatus?status=expired`
   - SafeReads: **No endpoint** (requires manual handling)

### Invoice Payment Failed

1. Stripe sends `invoice.payment_failed` webhook
2. Currently just logs the event
3. TODO: Send notification email about failed payment

---

## Environment Variables Required

### Marketing Site (Vercel)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_BUNDLE_PRICE_ID` | Default price ID (monthly) |
| `ADMIN_API_KEY` | Key to authenticate with app endpoints |
| `NEXT_PUBLIC_URL` | Base URL for success/cancel redirects |

### Each App (Convex)

| Variable | Description |
|----------|-------------|
| `ADMIN_KEY` | Must match `ADMIN_API_KEY` from marketing site |

---

## Stripe Configuration

### Product

- **Product ID:** `prod_TvRXoGfAONo3nA`
- **Name:** Safe Family Bundle

### Prices

| Plan | Price ID | Amount |
|------|----------|--------|
| Monthly | `price_1SxaerKgkIT46sg7NHNy0wk8` | $9.99/mo |
| Yearly | `price_1SzLJUKgkIT46sg7xsKo2A71` | $99/year |

### Webhook

- **URL:** `https://getsafefamily.com/api/stripe/webhook`
- **Events to send:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

---

## Troubleshooting

### User Says "I Paid But Can't Access"

1. Check Stripe dashboard for successful payment
2. Check Vercel logs for webhook execution
3. If webhook failed:
   - Check `ADMIN_API_KEY` is set correctly
   - Check app admin endpoints are responding
4. Manually grant access:
   ```bash
   # Get admin key
   KEY="u2A0NLQwYgNCGVz3%2F6b9v97bFsP6v3TnqqtxFL8rOQ0%3D"

   # Grant on all apps
   curl "https://formal-chihuahua-623.convex.site/grantLifetime?email=USER@EMAIL&key=$KEY"
   curl "https://rightful-rabbit-333.convex.site/setSubscriptionStatus?email=USER@EMAIL&status=lifetime&key=$KEY"
   curl "https://exuberant-puffin-838.convex.site/grantLifetime?email=USER@EMAIL&key=$KEY"
   ```

### Webhook Returns 500

- Check Vercel logs: `vercel logs getsafefamily.com`
- Common causes:
  - Missing `ADMIN_API_KEY`
  - Wrong `STRIPE_WEBHOOK_SECRET`
  - App endpoint down

### User Used Different Email

If user signed up with different email than Stripe:
1. Find their Stripe email in dashboard
2. Ask them what email they used for each app
3. Either:
   - Grant lifetime to their app email(s)
   - Or ask them to create new account with Stripe email

---

## Future Improvements

1. **Pre-provision users on SafeTunes/SafeTube** - Create user records before signup like SafeReads does
2. **Add setSubscriptionStatus to SafeReads** - For revocation on cancellation
3. **Failed payment emails** - Notify users when payment fails
4. **Retry failed provisioning** - Queue and retry failed webhook calls
5. **Admin dashboard integration** - Show bundle users in unified dashboard

---

*Last updated: February 10, 2026*
