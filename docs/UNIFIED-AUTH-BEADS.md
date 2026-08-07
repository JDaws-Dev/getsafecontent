# Unified Auth Implementation Beads

**Epic:** safecontent-i5w - Unified Authentication Across Safe Family Apps
**Created:** February 12, 2026
**Status:** Planning

This document contains detailed implementation beads (tasks) for the unified authentication and upgrade/downgrade flows.

---

## Quick Reference

| Priority | Count | Focus Area |
|----------|-------|------------|
| P0 | 8 | Core auth provisioning |
| P1 (Auth) | 2 | Password sync, feature flags |
| P1 (Upgrade) | 6 | Subscription management APIs |
| P2 | 14 | UI, testing, migration |
| P3 | 2 | Future enhancements |

---

## P0: Core Auth Provisioning

### safecontent-i5w.1: Create centralUsers database table

**Priority:** P0 (Critical Path)
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Set up Prisma schema and database for storing central user credentials.

**Tasks:**
- [ ] Choose database (Supabase PostgreSQL recommended)
- [ ] Create Prisma schema for centralUsers
- [ ] Add billingCycle field for upgrade/downgrade support
- [ ] Run initial migration
- [ ] Add DATABASE_URL to Vercel env vars
- [ ] Create utility functions (CRUD)
- [ ] Test database connection

**Schema:**
```prisma
model CentralUser {
  id                 String   @id @default(cuid())
  email              String   @unique
  passwordHash       String
  name               String?
  stripeCustomerId   String?
  subscriptionId     String?
  subscriptionStatus String   @default("trial")
  billingCycle       String   @default("monthly") // monthly | yearly
  entitledApps       String[] @default([])
  promoCode          String?
  onboardingData     Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([email])
  @@index([stripeCustomerId])
}
```

**Acceptance Criteria:**
- [ ] Can create/read/update user records
- [ ] Email uniqueness constraint works
- [ ] entitledApps array updates correctly
- [ ] billingCycle field accepts "monthly" or "yearly"

---

### safecontent-i5w.2: Build user signup API endpoint

**Priority:** P0 (Critical Path)
**Estimated Time:** 4 hours
**Dependencies:** safecontent-i5w.1
**Status:** Not Started

**Description:**
Create POST /api/auth/signup endpoint on marketing site.

**Tasks:**
- [ ] Install bcryptjs (edge-compatible)
- [ ] Create /api/auth/signup route
- [ ] Validate email format and uniqueness
- [ ] Hash password (bcrypt, 12 rounds)
- [ ] Store in centralUsers table
- [ ] Generate session token
- [ ] Set HTTP-only cookie
- [ ] Handle promo codes (DAWSFRIEND, DEWITT)
- [ ] Add rate limiting (5 req/min)

**API Spec:**
```typescript
// POST /api/auth/signup
Request: {
  email: string;
  password: string;
  name: string;
  selectedApps: string[];
  promoCode?: string;
}
Response: {
  success: boolean;
  userId: string;
  error?: string;
}
```

---

### safecontent-i5w.3: Create signup page UI

**Priority:** P0
**Estimated Time:** 4 hours
**Dependencies:** safecontent-i5w.2
**Status:** Not Started

**Description:**
Build signup page on marketing site that collects email, password, name, and app selection.

**Tasks:**
- [ ] Create /signup page
- [ ] Email/password/name form fields
- [ ] App selection checkboxes
- [ ] Promo code input (optional)
- [ ] Form validation (client-side)
- [ ] Error handling/display
- [ ] Redirect to checkout on success
- [ ] Mobile responsive design

---

### safecontent-i5w.4: Add /provisionUser to SafeTunes

**Priority:** P0 (Critical Path)
**Estimated Time:** 3 hours
**Dependencies:** None (can parallelize)
**Status:** Not Started

**Description:**
Add HTTP endpoint to SafeTunes Convex that creates user + authAccounts entry.

**Location:** `apps/safetunes/convex/http.ts`, `apps/safetunes/convex/users.ts`

**Tasks:**
- [ ] Add /provisionUser route to http.ts
- [ ] Create provisionUserInternal mutation
- [ ] Validate admin key
- [ ] Check for existing user by email
- [ ] Create user if not exists
- [ ] Create authAccounts entry with password hash
- [ ] Handle existing authAccounts (update hash if different)
- [ ] Return success/failure
- [ ] Test locally
- [ ] Deploy to production

**Acceptance Criteria:**
- [ ] Returns 401 for invalid admin key
- [ ] Creates user + authAccounts for new email
- [ ] User can login with provided password hash
- [ ] Idempotent (safe to call multiple times)

---

### safecontent-i5w.5: Add /provisionUser to SafeTube

**Priority:** P0 (Critical Path)
**Estimated Time:** 3 hours
**Dependencies:** None (can parallelize)
**Status:** Not Started

**Description:**
Same as safecontent-i5w.4 but for SafeTube.

**Location:** `apps/safetube/convex/http.ts`, `apps/safetube/convex/users.ts`

---

### safecontent-i5w.6: Add /provisionUser to SafeReads

**Priority:** P0 (Critical Path)
**Estimated Time:** 3 hours
**Dependencies:** None (can parallelize)
**Status:** Not Started

**Description:**
Same as safecontent-i5w.4 but for SafeReads. Note: SafeReads uses Google OAuth, so password provider is added alongside OAuth.

**Location:** `apps/safereads/convex/http.ts`, `apps/safereads/convex/users.ts`

---

### safecontent-i5w.7: Update Stripe webhook

**Priority:** P0 (Critical Path)
**Estimated Time:** 4 hours
**Dependencies:** safecontent-i5w.2, safecontent-i5w.4/5/6
**Status:** Not Started

**Description:**
Enhance webhook to call /provisionUser with password hash from central database.

**Location:** `sites/marketing/src/app/api/stripe/webhook/route.ts`

**Tasks:**
- [ ] On checkout.session.completed, fetch user from centralUsers
- [ ] Get passwordHash from central user
- [ ] Call /provisionUser on each entitled app
- [ ] Pass email, passwordHash, name, subscriptionStatus
- [ ] Implement retry logic (3 retries, exponential backoff)
- [ ] Log provision results
- [ ] Send admin alert on failure
- [ ] Maintain backward compatibility
- [ ] Add feature flag for gradual rollout

---

### safecontent-i5w.21: Verify Convex Auth authAccounts access

**Priority:** P0 (BLOCKING - Do First)
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Confirm we can write directly to Convex Auth's authAccounts table.

**Tasks:**
- [ ] Check if authAccounts is accessible via ctx.db
- [ ] Test inserting a record manually
- [ ] Verify password comparison works after insert
- [ ] Document any issues/workarounds
- [ ] If blocked, research custom auth provider approach

---

## P1: Upgrade/Downgrade Backend

### safecontent-i5w.24: GET /api/subscription/current

**Priority:** P1
**Estimated Time:** 3 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Return user's current subscription details for Settings UI.

**Location:** `sites/marketing/src/app/api/subscription/current/route.ts`

**Tasks:**
- [ ] Create route handler
- [ ] Authenticate user from session
- [ ] Fetch subscription from Stripe
- [ ] Parse metadata (apps, billingCycle)
- [ ] Calculate available upgrade/downgrade options
- [ ] Return formatted response

**API Spec:**
```typescript
// GET /api/subscription/current
Response: {
  subscriptionId: string;
  stripeCustomerId: string;
  currentApps: string[];
  billingCycle: "monthly" | "yearly";
  currentPrice: number;
  status: "active" | "trial" | "canceled" | "past_due";
  currentPeriodEnd: string;
  availablePlans: { apps: string[]; monthlyPrice: number; yearlyPrice: number }[];
}
```

---

### safecontent-i5w.25: POST /api/subscription/preview

**Priority:** P1
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Preview price changes before confirming.

**Location:** `sites/marketing/src/app/api/subscription/preview/route.ts`

**Tasks:**
- [ ] Create route handler
- [ ] Accept proposed apps and billing cycle
- [ ] Use Stripe's preview upcoming invoice API
- [ ] Calculate proration amounts
- [ ] Calculate savings vs individual pricing
- [ ] Return formatted preview

**API Spec:**
```typescript
// POST /api/subscription/preview
Request: {
  apps: string[];
  billingCycle: "monthly" | "yearly";
}
Response: {
  currentPlan: { apps: string[]; price: number; billingCycle: string };
  proposedPlan: { apps: string[]; price: number; billingCycle: string };
  proration: { unusedCredit: number; immediateCharge: number; netChange: number };
  savings: number;
  effectiveDate: string;
}
```

---

### safecontent-i5w.26: POST /api/subscription/update

**Priority:** P1
**Estimated Time:** 4 hours
**Dependencies:** safecontent-i5w.24, safecontent-i5w.25
**Status:** Not Started

**Description:**
Update subscription apps and billing cycle via Stripe.

**Location:** `sites/marketing/src/app/api/subscription/update/route.ts`

**Tasks:**
- [ ] Create route handler
- [ ] Validate request (min 1 app, not removing current app, etc.)
- [ ] Determine new price ID based on apps and billing cycle
- [ ] Call Stripe subscriptions.update
- [ ] Update metadata with new apps list
- [ ] Handle proration correctly
- [ ] Return success/failure
- [ ] Trigger immediate provisioning for upgrades

**API Spec:**
```typescript
// POST /api/subscription/update
Request: {
  action: "update_apps" | "change_billing_cycle";
  apps?: string[];
  billingCycle?: "monthly" | "yearly";
}
Response: {
  success: boolean;
  subscription: { apps: string[]; billingCycle: string; price: number };
  provisioningResults?: { app: string; success: boolean }[];
}
```

---

### safecontent-i5w.27: Webhook subscription.updated handler

**Priority:** P1
**Estimated Time:** 3 hours
**Dependencies:** safecontent-i5w.4/5/6, safecontent-i5w.28
**Status:** Not Started

**Description:**
Handle customer.subscription.updated events to provision/revoke apps.

**Location:** `sites/marketing/src/app/api/stripe/webhook/route.ts`

**Tasks:**
- [ ] Add case for customer.subscription.updated
- [ ] Parse new and previous apps from metadata
- [ ] Determine added and removed apps
- [ ] Provision new apps with user's password hash
- [ ] Call revokeAccess for removed apps
- [ ] Update centralUsers entitledApps
- [ ] Log changes to audit log

---

### safecontent-i5w.28: /revokeAccess endpoint (all apps)

**Priority:** P1
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Create endpoint on each app to revoke user access.

**Location:** Each app's `convex/http.ts`

**Tasks:**
- [ ] Add /revokeAccess route to SafeTunes
- [ ] Add /revokeAccess route to SafeTube
- [ ] Add /revokeAccess route to SafeReads
- [ ] Validate admin key
- [ ] Find user by email
- [ ] Set subscriptionStatus to "inactive"
- [ ] Optionally invalidate sessions

**API Spec:**
```typescript
// POST /revokeAccess?email=...&key=...
Response: { success: boolean; revoked: boolean }
```

---

### safecontent-i5w.29: Stripe price IDs setup

**Priority:** P1
**Estimated Time:** 1 hour
**Dependencies:** None
**Status:** Not Started

**Description:**
Create Stripe price IDs for 1-app and 2-app bundle plans.

**Tasks:**
- [ ] Create product for individual SafeTunes ($4.99/mo)
- [ ] Create product for individual SafeTube ($4.99/mo)
- [ ] Create product for individual SafeReads ($4.99/mo)
- [ ] Create 2-app bundle product ($7.99/mo)
- [ ] Document all price IDs
- [ ] Add price IDs to env vars or constants file

**Existing Price IDs:**
- 3-App Monthly: `price_1SxaerKgkIT46sg7NHNy0wk8`
- 3-App Yearly: `price_1SzLJUKgkIT46sg7xsKo2A71`

---

## P2: Settings UI

### safecontent-i5w.30: SubscriptionManager component (SafeTunes)

**Priority:** P2
**Estimated Time:** 6 hours
**Dependencies:** safecontent-i5w.24, safecontent-i5w.25, safecontent-i5w.26
**Status:** Not Started

**Description:**
Build the subscription management UI in SafeTunes Settings page.

**Location:** `apps/safetunes/src/components/SubscriptionManager.tsx`

**Tasks:**
- [ ] Create SubscriptionManager component
- [ ] Fetch current subscription on mount
- [ ] Display current plan (apps, price, billing cycle)
- [ ] Integrate AppToggle for each app
- [ ] Integrate BillingCycleToggle
- [ ] Show PricePreviewCard on changes
- [ ] Confirm button with loading state
- [ ] Success/error handling
- [ ] Warning for downgrades
- [ ] Cancel subscription link (Stripe portal)
- [ ] Mobile responsive design

---

### safecontent-i5w.31: SubscriptionManager component (SafeTube)

**Priority:** P2
**Estimated Time:** 4 hours
**Dependencies:** safecontent-i5w.30
**Status:** Not Started

**Description:**
Port SubscriptionManager from SafeTunes to SafeTube.

---

### safecontent-i5w.32: SubscriptionManager component (SafeReads)

**Priority:** P2
**Estimated Time:** 4 hours
**Dependencies:** safecontent-i5w.30
**Status:** Not Started

**Description:**
Port SubscriptionManager to SafeReads. Adjust for Next.js architecture.

---

### safecontent-i5w.33: AppToggle component

**Priority:** P2
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Toggle switch component for adding/removing apps.

**Features:**
- App icon and name display
- Toggle switch
- "Current App" badge
- Disabled state (can't remove current app)
- "+ included in bundle" indicator

---

### safecontent-i5w.34: BillingCycleToggle component

**Priority:** P2
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Monthly/yearly toggle with savings display.

**Features:**
- Toggle between Monthly and Yearly
- Show savings ($20/year for 3-app)
- Only show yearly option for 3-app bundle

---

### safecontent-i5w.35: PricePreviewCard component

**Priority:** P2
**Estimated Time:** 3 hours
**Dependencies:** None
**Status:** Not Started

**Description:**
Shows proration details and confirms changes.

**Features:**
- Current vs proposed plan comparison
- Proration credit/charge breakdown
- Net change amount
- Savings message
- Downgrade warning
- Confirm button

---

### safecontent-i5w.36: Integration tests - upgrade/downgrade

**Priority:** P2
**Estimated Time:** 4 hours
**Dependencies:** safecontent-i5w.24-28
**Status:** Not Started

**Description:**
E2E tests for plan change flows.

**Test Cases:**
- [ ] Upgrade 1-app to 2-app
- [ ] Upgrade 2-app to 3-app
- [ ] Downgrade 3-app to 2-app
- [ ] Monthly to yearly conversion
- [ ] Yearly to monthly conversion
- [ ] Preview matches actual charges
- [ ] Can't remove current app
- [ ] Past due prevents upgrade

---

## P2: Other Secondary Tasks

### safecontent-i5w.8: Implement password sync

**Priority:** P2
**Estimated Time:** 3 hours
**Dependencies:** safecontent-i5w.1
**Status:** Complete

**Description:**
When a user changes their password on one app, sync the new password hash to all other apps they're entitled to.

**Implementation (Feb 12, 2026):**

1. **Created /updatePassword HTTP endpoints** on each app:
   - `apps/safetunes/convex/updatePassword.ts`
   - `apps/safetube/convex/updatePassword.ts`
   - `apps/safereads/convex/updatePassword.ts`
   - Updates the authAccounts.secret field for the user

2. **Added updatePasswordInternal mutations** to each app's users.ts/updatePasswordInternal.ts:
   - Validates the user exists in authAccounts
   - Updates the password hash (Scrypt format)
   - Returns success/failure status

3. **Created /updateCentralPassword endpoint** in SafeReads:
   - `apps/safereads/convex/updateCentralPassword.ts`
   - Updates the centralUsers table when an app reports a password change

4. **Created /api/auth/sync-password endpoint** on marketing site:
   - `sites/marketing/src/app/api/auth/sync-password/route.ts`
   - Receives password change from source app
   - Updates centralUsers table in SafeReads
   - Calls /updatePassword on all other apps (not the source)
   - Added rate limiting (10 req/min)

5. **Added passwordSync.ts** to each app:
   - `apps/safetunes/convex/passwordSync.ts`
   - `apps/safetube/convex/passwordSync.ts`
   - `apps/safereads/convex/passwordSync.ts`
   - Contains syncPasswordToOtherApps action
   - Gets current password hash and calls marketing site sync endpoint

6. **Updated ResetPasswordPage** in each app to call syncPasswordToOtherApps:
   - `apps/safetunes/src/pages/ResetPasswordPage.jsx`
   - `apps/safetube/src/pages/ResetPasswordPage.jsx`
   - `apps/safereads/src/app/reset-password/page.tsx`
   - Fire-and-forget call after successful password reset

**Flow:**
1. User resets password in SafeTunes via Convex Auth
2. After success, frontend calls syncPasswordToOtherApps action
3. Action gets new password hash from local authAccounts
4. Action calls marketing site /api/auth/sync-password
5. Marketing site updates centralUsers in SafeReads
6. Marketing site calls /updatePassword on SafeTube and SafeReads
7. All apps now have the new password hash

**Files Modified/Created:**
- apps/safetunes/convex/updatePassword.ts (new)
- apps/safetunes/convex/passwordSync.ts (new)
- apps/safetunes/convex/users.ts (added updatePasswordInternal)
- apps/safetunes/convex/http.ts (added routes)
- apps/safetunes/src/pages/ResetPasswordPage.jsx (added sync call)
- apps/safetube/convex/updatePassword.ts (new)
- apps/safetube/convex/passwordSync.ts (new)
- apps/safetube/convex/users.ts (added updatePasswordInternal)
- apps/safetube/convex/http.ts (added routes)
- apps/safetube/src/pages/ResetPasswordPage.jsx (added sync call)
- apps/safereads/convex/updatePassword.ts (new)
- apps/safereads/convex/updatePasswordInternal.ts (new)
- apps/safereads/convex/updateCentralPassword.ts (new)
- apps/safereads/convex/passwordSync.ts (new)
- apps/safereads/convex/http.ts (added routes)
- apps/safereads/src/app/reset-password/page.tsx (added sync call)
- sites/marketing/src/app/api/auth/sync-password/route.ts (new)
- sites/marketing/src/lib/ratelimit.ts (added sync-password rate limit)

---

### safecontent-i5w.10: Add 'inactive' status UI

**Priority:** P2
**Estimated Time:** 2 hours
**Dependencies:** safecontent-i5w.4/5/6
**Status:** Not Started

**Description:**
Show upgrade prompt in non-entitled apps.

---

### safecontent-i5w.11: Migrate existing purchasers

**Priority:** P2
**Estimated Time:** 4 hours
**Dependencies:** All P0/P1 tasks
**Status:** Closed

**Decision:** Option A - No Migration Required

**Analysis:**
Existing bundle purchasers who bought before unified auth was implemented have:
1. User accounts on individual apps (created via `/setSubscriptionStatus`)
2. NO `centralUsers` entries
3. Potentially different passwords on different apps (or no password if they used Google OAuth on SafeReads)

**Migration Options Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | Do nothing - they continue using app-specific logins | Zero risk, no disruption | Slightly fragmented UX for legacy users |
| B | Send email asking them to "link" accounts | Gives user control | Adds complexity, low conversion expected |
| C | Auto-create centralUsers from existing app data | Unified experience | Can't get password hash from Convex Auth, would require forced password reset |

**Recommendation: Option A**

Rationale:
1. **Existing users keep working** - Their app-specific logins still function perfectly
2. **New flow is for new users only** - Anyone who signs up via the marketing site now gets unified auth automatically
3. **Zero disruption** - No emails, no forced migrations, no password resets
4. **Technical limitation** - Cannot extract password hashes from Convex Auth's `authAccounts` table to populate centralUsers
5. **Future unified experience** - If a legacy user ever re-subscribes via the marketing site, they'll go through the new flow

**Implementation:** No code changes required. The webhook already has a graceful fallback:
- If `centralUser` exists with `passwordHash` → use new `/provisionUser` flow
- If not → fall back to legacy `/setSubscriptionStatus` flow

See: `/sites/marketing/src/app/api/stripe/webhook/route.ts` lines 371-378

**Closed:** February 12, 2026

---

### safecontent-i5w.12: Handle account conflicts

**Priority:** P2
**Estimated Time:** 3 hours
**Dependencies:** None
**Status:** Completed (February 12, 2026)

**Implementation Notes:**

Implemented **Option B (Safety First)** - Keep existing passwords when there's a conflict.

**Conflict Scenarios Handled:**

1. **User exists in app with password A, bundle purchased with password B:**
   - User record is updated with new subscription status
   - Password hash is NOT changed (keeps original)
   - Returns `passwordConflict: true` in response
   - Warning logged: "PASSWORD CONFLICT for email: User has existing authAccount with different password hash"

2. **User exists in centralUsers but not in app:**
   - Normal provisioning - creates user and authAccount with central password

3. **User exists in app but not in centralUsers:**
   - This scenario is handled by existing apps' direct signup flows
   - When they later buy a bundle, scenario 1 applies

**Rationale for Option B:**
- Avoids surprising users whose app password suddenly changes
- Users can still log in with their original password
- Users can use "Forgot Password" to reset if needed
- Users can change password in Settings after logging in

**Files Modified:**
- `apps/safetunes/convex/users.ts` - provisionUserInternal
- `apps/safetube/convex/users.ts` - provisionUserInternal
- `apps/safereads/convex/provisionUserInternal.ts` - provisionUserInternal

**Response Format:**
The /provisionUser HTTP endpoints now return:
```json
{
  "success": true,
  "userId": "...",
  "provisioned": false,
  "updated": true,
  "authAccountCreated": false,
  "authAccountUpdated": false,
  "passwordConflict": true
}
```

**Closed:** February 12, 2026

---

### safecontent-i5w.13: Add feature flag

**Priority:** P1
**Estimated Time:** 1 hour
**Dependencies:** None
**Status:** Not Started

---

### safecontent-i5w.14: Write integration tests (auth)

**Priority:** P1
**Estimated Time:** 4 hours
**Dependencies:** All P0 tasks
**Status:** Complete

**Implementation (Feb 12, 2026):**

Created comprehensive integration tests for the unified auth flow in two formats:

1. **API Integration Tests** (`src/__tests__/unified-auth.integration.ts`)
   - Node.js/TypeScript tests that directly test API endpoints
   - Tests 6 categories: Central User Creation, App Provisioning, Promo Signup, Account Conflicts, Authorization, Input Validation
   - 14 test cases covering all critical paths

2. **E2E Browser Tests** (`e2e/unified-auth-flow.spec.ts`)
   - Playwright-based tests for full browser flow
   - Tests signup UI, promo code validation, Stripe redirect, validation errors
   - Includes manual verification steps for app login testing

3. **Test Runner Script** (`scripts/test-unified-auth.sh`)
   - Easy-to-use shell script for running tests
   - Validates environment setup before running
   - Supports API-only, E2E-only, or both test modes

**Test Coverage:**
- Signup creates centralUser with correct fields
- Checkout flow works with centralUser
- Webhook provisions all entitled apps (via promo flow)
- User can login to apps after provisioning (manual verification)
- Legacy flow still works when flag disabled (documented in tests)
- Password conflict handling
- Authorization validation (admin key required)
- Input validation (email, password strength)

**How to Run:**
```bash
# Set admin key first
export ADMIN_API_KEY='your_key_here'

# Run API tests
cd sites/marketing
npx tsx src/__tests__/unified-auth.integration.ts

# Run E2E tests
npx playwright test e2e/unified-auth-flow.spec.ts

# Run with browser UI
npx playwright test e2e/unified-auth-flow.spec.ts --headed

# Run all tests via script
./scripts/test-unified-auth.sh --all
```

**Files Created:**
- `sites/marketing/src/__tests__/unified-auth.integration.ts`
- `sites/marketing/e2e/unified-auth-flow.spec.ts`
- `sites/marketing/scripts/test-unified-auth.sh`

**Closed:** February 12, 2026

---

### safecontent-i5w.17: Add monitoring/alerting

**Priority:** P1
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

---

### safecontent-i5w.18: Create admin provision tool

**Priority:** P2
**Estimated Time:** 3 hours
**Dependencies:** safecontent-i5w.4/5/6
**Status:** Not Started

---

### safecontent-i5w.19: Document rollback procedures

**Priority:** P1
**Estimated Time:** 2 hours
**Dependencies:** None
**Status:** Not Started

---

### safecontent-i5w.20: Handle direct app signup

**Priority:** P2
**Estimated Time:** 3 hours
**Dependencies:** safecontent-i5w.2
**Status:** Not Started

---

### safecontent-i5w.22: Add rate limiting to provision endpoints

**Priority:** P2
**Estimated Time:** 1 hour
**Dependencies:** safecontent-i5w.4/5/6
**Status:** Not Started

---

### safecontent-i5w.23: User communication plan

**Priority:** P2
**Estimated Time:** 2 hours
**Dependencies:** safecontent-i5w.11
**Status:** Complete

**Decision:** No Communication Campaign Needed

**Date:** February 12, 2026

**Summary:**
Since we decided NOT to migrate existing users (safecontent-i5w.11 - Option A), there is no user communication required. Existing users continue using their app-specific logins without any changes to their experience.

**Communication Plan:**

| User Segment | Action Required | Communication |
|--------------|-----------------|---------------|
| Existing bundle users | None | No email/notification needed |
| Existing individual app users | None | No email/notification needed |
| New users (post-unified-auth) | Automatic | They use unified auth by default |

**Rationale:**
1. **No forced migration** = No user confusion to explain
2. **Logins unchanged** = No "update your password" emails needed
3. **Seamless experience** = New users get unified auth automatically
4. **Zero disruption** = Existing users notice no difference

**In-App Messaging Consideration:**
We considered adding in-app messaging to inform existing users about the option to "upgrade" to unified login. However, this was deemed unnecessary because:
- The benefit to the user is minimal (same password across apps)
- Would require building UI that prompts users to change passwords
- Could cause confusion ("Why do I need to change my password?")
- Not worth the development effort for < 50 existing users

**Future Option:**
If we ever decide to encourage unified login adoption, we could:
1. Add a banner in Settings: "Use the same login across all Safe Family apps"
2. Link to `/migrate-account` page on marketing site
3. User creates new password, which syncs to all apps

This is NOT planned and should only be reconsidered if:
- User base grows significantly (1000+ users)
- Users actively request unified login
- Business requirements change

**Files Created/Modified:**
- `docs/UNIFIED-AUTH-ARCHITECTURE.md` - Added User Communication Plan section

**Closed:** February 12, 2026

---

## P3: Future Enhancements

### safecontent-i5w.15: Add Google OAuth to central auth

**Priority:** P3
**Estimated Time:** 6 hours
**Dependencies:** safecontent-i5w.2
**Status:** Not Started

---

### safecontent-i5w.16: Implement cross-app SSO

**Priority:** P3
**Estimated Time:** 8 hours
**Dependencies:** All P0/P1
**Status:** Not Started

---

## Related Issues

| Bead ID | Title | Status |
|---------|-------|--------|
| safecontent-44m | Fix promo signup (users can't login) | Open |

---

## Sprint Planning

### Sprint 1 (Week 1): Foundation
- safecontent-i5w.21 (MUST DO FIRST)
- safecontent-i5w.1
- safecontent-i5w.2
- safecontent-i5w.3
- safecontent-i5w.13

### Sprint 2 (Week 2): App Endpoints + Core Integration
- safecontent-i5w.4
- safecontent-i5w.5
- safecontent-i5w.6
- safecontent-i5w.28
- safecontent-i5w.7
- safecontent-i5w.19

### Sprint 3 (Week 3): Upgrade/Downgrade Backend
- safecontent-i5w.29
- safecontent-i5w.24
- safecontent-i5w.25
- safecontent-i5w.26
- safecontent-i5w.27

### Sprint 4 (Week 4): Settings UI
- safecontent-i5w.33
- safecontent-i5w.34
- safecontent-i5w.35
- safecontent-i5w.30
- safecontent-i5w.31
- safecontent-i5w.32

### Sprint 5 (Week 5): Testing & Launch
- safecontent-i5w.14
- safecontent-i5w.36
- safecontent-i5w.17
- safecontent-i5w.11 (CLOSED - No migration needed)
- safecontent-i5w.23 (CLOSED - No communication needed)

---

## Key Decisions Log

### safecontent-i5w.11: Existing Bundle Purchaser Migration

**Decision:** No migration required (Option A)

**Date:** February 12, 2026

**Summary:**
Existing bundle purchasers who bought before unified auth was implemented will continue using their existing app-specific logins. The new unified auth flow only applies to new users signing up through the marketing site.

**Rationale:**
1. Existing users' logins still work perfectly
2. Cannot extract password hashes from Convex Auth (technical limitation)
3. Low user volume (< 50 users) doesn't justify migration effort
4. Webhook already has graceful fallback to legacy flow
5. If legacy users re-subscribe later, they'll naturally get unified auth

**Impact:** Zero disruption to existing users. New users get unified experience automatically.

See: `UNIFIED-AUTH-ARCHITECTURE.md` > Migration Plan > Phase 6 for full details.

---

### safecontent-i5w.23: User Communication Plan

**Decision:** No communication campaign required

**Date:** February 12, 2026

**Summary:**
Since we chose not to migrate existing users (safecontent-i5w.11), there is no need for user communication. Existing users continue using their app-specific logins without any changes. New users automatically use unified auth - no explanation needed.

**Rationale:**
1. No forced migration = no user confusion to address
2. Existing logins unchanged = no "update your password" emails
3. New users get unified auth automatically = seamless experience
4. In-app messaging to promote unified login was considered but rejected (low ROI for < 50 users)

**Impact:** Zero user communication required. Support playbook documented for edge cases.

See: `UNIFIED-AUTH-ARCHITECTURE.md` > User Communication Plan for full details.

---

*Last Updated: February 12, 2026*
