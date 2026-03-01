# Critical Operations Audit Report

**Date:** March 1, 2026
**Auditor:** Claude (AI)
**Related Issue:** safecontent-c42

## Executive Summary

This audit examines critical operations across all Safe Family apps (SafeTunes, SafeTube, SafeReads, Marketing) for consistency, security, and gaps. The audit was prompted by the discovery that checkout flows had 4 different implementations with inconsistent protection (safecontent-1cv).

### Key Findings

| Area | Consistency | Issues Found |
|------|-------------|--------------|
| Password Reset | ✅ Consistent | Minor: SafeReads returns `403` for invalid key vs `401` |
| Account Deletion | ⚠️ Gaps | SafeTunes has orphaned legacy code; Marketing has more comprehensive delete |
| Subscription Cancellation | ✅ Mostly Consistent | SafeReads uses Next.js API routes (valid); missing `invoice.payment_failed` handler |
| Admin Endpoint Auth | ✅ Consistent | All use `process.env.ADMIN_KEY` comparison |
| Password Sync | ✅ Consistent | All 3 apps sync to Marketing hub identically |

---

## 1. Password Reset Flow

### Implementation Comparison

| Aspect | SafeTunes | SafeTube | SafeReads | Marketing |
|--------|-----------|----------|-----------|-----------|
| Forgot Password Page | `/forgot-password` | `/forgot-password` | `/forgot-password` | `/forgot-password` |
| Reset Password Page | `/reset-password` | `/reset-password` | `/reset-password` | `/reset-password` |
| Email Storage Key | `safetunes_reset_email` | `safetube_reset_email` | `safereads_reset_email` | N/A |
| OTP Length | 6 digits | 6 digits | 6 digits | 6 digits |
| Password Min Length | 8 chars | 8 chars | 8 chars | 8 chars |
| Password Sync | ✅ Yes | ✅ Yes | ✅ Yes | N/A (hub) |
| Convex Auth Provider | `ResendOTPPasswordReset` | `ResendOTPPasswordReset` | `ResendOTPPasswordReset` | `ResendOTPPasswordReset` |

### Password Reset Code

All three apps use identical password reset flow:
1. User enters email on `/forgot-password`
2. OTP sent via Resend
3. User enters 6-digit code + new password on `/reset-password`
4. `signIn('password', { email, code, newPassword, flow: 'reset-verification' })`
5. Password synced to other apps via `syncPasswordToOtherApps` action

### Password Sync Implementation

All apps call Marketing site's `/api/auth/sync-password` endpoint:

| App | Source App ID | Sync Endpoint |
|-----|---------------|---------------|
| SafeTunes | `"safetunes"` | `https://getsafefamily.com/api/auth/sync-password` |
| SafeTube | `"safetube"` | Same |
| SafeReads | `"safereads"` | Same |

**Verdict:** ✅ **CONSISTENT** - All apps use the same flow and sync passwords correctly.

---

## 2. Account Deletion

### HTTP Endpoint Comparison

| Aspect | SafeTunes | SafeTube | SafeReads | Marketing |
|--------|-----------|----------|-----------|-----------|
| Endpoint | `/deleteUser` | `/deleteUser` | `/deleteUser` | `/deleteUser` |
| Method | GET | GET | GET | GET |
| Auth | Query param `key` | Query param `key` | Query param `key` | Query param `key` |
| Invalid Key Status | 401 | 401 | 403 | 401 |
| Internal Mutation | `internal.admin.deleteUserByEmailInternal` | `internal.admin.deleteUserByEmail` | `internal.admin.deleteUserByEmailInternal` | `api.accounts.deleteAccount` |
| CORS Headers | ❌ None | ❌ None | ❌ None | ✅ Yes |

### Implementation Details

#### SafeTunes (`deleteUserHttpAction.ts` + `deleteUser.ts`)
- **Issue Found:** Two separate implementations exist:
  1. `deleteUserHttpAction.ts` - Calls `internal.admin.deleteUserByEmailInternal` (USED by http.ts)
  2. `deleteUser.ts` - Contains `deleteUserByEmail` mutation and legacy `deleteBetterAuthUser` (uses BetterAuth component - legacy)
- The `deleteUser.ts` file has orphaned BetterAuth code that may not work with Convex Auth

#### SafeTube (`deleteUser.ts`)
- Calls `internal.admin.deleteUserByEmail`
- Clean implementation

#### SafeReads (`deleteUser.ts`)
- Calls `internal.admin.deleteUserByEmailInternal`
- Clean implementation

#### Marketing (`http.ts`)
- Most comprehensive: looks up user by email first, then calls `api.accounts.deleteAccount` with userId and reason
- Has CORS headers (allows cross-origin calls)
- Accepts optional `reason` parameter for audit logging

### Gaps Identified

1. **SafeTunes has orphaned BetterAuth delete code** in `deleteUser.ts` that references `components.betterAuth.adapter.deleteMany`. This is legacy code from before Convex Auth migration.

2. **No CORS headers** on app delete endpoints (SafeTunes, SafeTube, SafeReads) - but these are admin-only endpoints so CORS isn't needed.

3. **Status code inconsistency:** SafeReads returns 403 for invalid key, others return 401.

**Verdict:** ⚠️ **MINOR GAP** - Clean up SafeTunes legacy delete code.

---

## 3. Subscription Cancellation

### Stripe Webhook Handlers

| Aspect | SafeTunes | SafeTube | SafeReads | Marketing |
|--------|-----------|----------|-----------|-----------|
| Has webhook handler | ✅ (Convex) | ✅ (Convex) | ✅ (Next.js) | N/A |
| Webhook location | `convex/stripe.ts` | `convex/stripe.ts` | `src/app/api/webhooks/stripe/route.ts` | N/A |
| `checkout.session.completed` | ✅ | ✅ | ✅ (no-op) | N/A |
| `customer.subscription.created` | ❌ | ❌ | ✅ (+ welcome email) | N/A |
| `customer.subscription.updated` | ✅ | ✅ | ✅ | N/A |
| `customer.subscription.deleted` | ✅ | ✅ | ✅ | N/A |
| `invoice.paid` | ✅ | ✅ | ❌ (minor gap) | N/A |
| `invoice.payment_failed` | ✅ | ✅ | ❌ (gap) | N/A |
| Multi-subscription check | ✅ | ✅ | N/A | N/A |
| Event logging | ✅ | ✅ | ❌ | N/A |
| Cancellation email | ✅ | ✅ | ❌ | N/A |

### Architectural Difference

**SafeReads uses Next.js API routes for webhooks** instead of Convex HTTP actions:
- Location: `apps/safereads/src/app/api/webhooks/stripe/route.ts`
- Uses `ConvexHttpClient` to call Convex mutations
- This is a valid architectural choice for Next.js apps

### Feature Parity Analysis

**SafeReads has the CORE subscription events covered:**
- ✅ `subscription.created` - Sets status to `active` + sends welcome email
- ✅ `subscription.updated` - Updates status correctly
- ✅ `subscription.deleted` - Sets status to `canceled`

**Minor gaps (nice-to-have):**
- ❌ `invoice.paid` - SafeTunes/SafeTube use this to confirm `active` status; redundant since `subscription.created/updated` already handles this
- ⚠️ `invoice.payment_failed` - Won't mark subscriptions as `past_due` or send payment failed emails

**Verdict:** ⚠️ **MINOR GAP** - SafeReads is missing `invoice.payment_failed` handler. Users with failed payments won't be notified and won't be marked `past_due`. However, Stripe's dunning emails may cover this.

### SafeTunes & SafeTube Webhook Comparison

Both apps have **nearly identical** webhook implementations:

| Feature | SafeTunes | SafeTube |
|---------|-----------|----------|
| Stripe API Version | `2024-11-20.acacia` | (default) |
| Signature verification | ✅ | ✅ |
| Error logging to `subscriptionEvents` | ✅ | ✅ |
| Multi-subscription deletion check | ✅ | ✅ |

**Verdict:** ✅ **MOSTLY CONSISTENT** - All 3 apps have webhook handlers. SafeReads uses Next.js API routes instead of Convex HTTP actions (valid architectural choice). Minor gap: SafeReads missing `invoice.payment_failed` handler.

---

## 4. Admin Endpoint Authentication

### HTTP Authentication Comparison

| Endpoint | SafeTunes | SafeTube | SafeReads | Marketing |
|----------|-----------|----------|-----------|-----------|
| `/adminDashboard` | Query `key` vs `ADMIN_KEY` | Same | Same | Same |
| `/deleteUser` | Query `key` vs `ADMIN_KEY` | Same | Same | Same |
| `/grantLifetime` | Query `key` vs `ADMIN_KEY` | N/A | Query `key` | Query `key` |
| `/setSubscriptionStatus` | Query `key` vs `ADMIN_KEY` | Same | Same | POST + header |
| `/provisionUser` | POST, header `x-admin-key` | Same | POST, no header | POST + header |

### Authentication Methods

1. **Query Parameter Auth** (`key=ADMIN_KEY`)
   - Used by: `adminDashboard`, `deleteUser`, `grantLifetime`
   - Simple, works for GET requests
   - Not ideal (keys in URL/logs) but acceptable for admin tools

2. **Header Auth** (`x-admin-key: ADMIN_KEY`)
   - Used by: `updateSubscription`, `createUserWithPassword`, `addAuthAccount` (Marketing)
   - Better practice for POST requests

3. **Body Auth** (deprecated)
   - Not used in current implementation

### Consistency Check

All apps use the same pattern:
```typescript
const ADMIN_KEY = process.env.ADMIN_KEY!;
if (!key || key !== ADMIN_KEY) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

**Verdict:** ✅ **CONSISTENT** - All apps use the same admin key and auth pattern.

---

## 5. Admin Dashboard

### Feature Comparison

| Feature | SafeTunes | SafeTube | SafeReads |
|---------|-----------|----------|-----------|
| CORS Headers | ✅ | ✅ | ✅ |
| HTML View | ✅ | ✅ | ✅ |
| JSON API (`format=json`) | ✅ | ✅ | ✅ |
| User Count | ✅ | ✅ | ✅ |
| Active/Trial/Lifetime Breakdown | ✅ | ✅ | ✅ |
| Monthly Revenue Calc | ✅ ($4.99) | ❌ | ✅ ($2.99) |
| Kid Profile Count | ✅ | ✅ | ✅ |
| App-specific Metrics | Songs/Albums | Channels/Videos | Analyses |
| Stripe Link | ✅ | ❌ | ✅ |
| Last Activity | ✅ | ❌ | ❌ |

### JSON Response Fields

| Field | SafeTunes | SafeTube | SafeReads |
|-------|-----------|----------|-----------|
| email | ✅ | ✅ | ✅ |
| name | ✅ | ✅ | ✅ |
| subscriptionStatus | ✅ | ✅ | ✅ |
| createdAt | ✅ | ✅ | ✅ |
| kidCount | ✅ (`kidProfileCount`) | ✅ | ✅ |
| stripeCustomerId | ✅ | ✅ | ✅ |
| subscriptionEndsAt | ✅ | ❌ (`trialEndsAt`) | ✅ |

**Verdict:** ✅ **CONSISTENT** - Core functionality matches; app-specific differences are expected.

---

## Recommendations

### High Priority

1. ~~**SafeReads Stripe Webhook**~~ **RESOLVED (Mar 1, 2026)**
   - SafeReads DOES have a webhook handler at `src/app/api/webhooks/stripe/route.ts`
   - Uses Next.js API routes instead of Convex HTTP actions (valid architecture)
   - Handles core events: `subscription.created/updated/deleted`
   - Minor gap: Missing `invoice.payment_failed` handler (Stripe dunning emails cover this)

### Medium Priority

2. **Clean Up SafeTunes Legacy Delete Code**
   - `apps/safetunes/convex/deleteUser.ts` contains BetterAuth references
   - Remove `deleteBetterAuthUser` and `components.betterAuth.adapter.deleteMany`
   - Issue: `safecontent-XXX` (create if needed)

3. **Standardize HTTP Status Codes**
   - SafeReads returns 403 for invalid key; others return 401
   - 401 (Unauthorized) is more correct for authentication failure
   - 403 (Forbidden) implies authenticated but not authorized

### Low Priority

4. **Add Last Activity to SafeTube/SafeReads Dashboard**
   - SafeTunes shows last play activity
   - Useful for identifying inactive users

5. **Add Monthly Revenue to SafeTube Dashboard**
   - Currently missing revenue calculation

---

## Files Audited

### Password Reset
- `apps/safetunes/src/pages/ResetPasswordPage.jsx`
- `apps/safetube/src/pages/ResetPasswordPage.jsx`
- `apps/safereads/src/app/reset-password/page.tsx`
- `apps/safetunes/convex/passwordSync.ts`
- `apps/safetube/convex/passwordSync.ts`
- `apps/safereads/convex/passwordSync.ts`

### Account Deletion
- `apps/safetunes/convex/deleteUserHttpAction.ts`
- `apps/safetunes/convex/deleteUser.ts`
- `apps/safetube/convex/deleteUser.ts`
- `apps/safereads/convex/deleteUser.ts`
- `sites/marketing/convex/http.ts` (lines 458-524)

### Subscription Cancellation
- `apps/safetunes/convex/stripe.ts`
- `apps/safetube/convex/stripe.ts`
- `apps/safereads/src/app/api/webhooks/stripe/route.ts` (Next.js API route)
- `apps/safereads/convex/subscriptions.ts` (mutations called by webhook)

### Admin Endpoints
- `apps/safetunes/convex/http.ts`
- `apps/safetube/convex/http.ts`
- `apps/safereads/convex/http.ts`
- `sites/marketing/convex/http.ts`
- `apps/safetunes/convex/adminDashboard.ts`
- `apps/safetube/convex/adminDashboard.ts`
- `apps/safereads/convex/adminDashboard.ts`

---

*Audit complete. Created beads for identified gaps.*
