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

### May 28, 2026 — Clerk retirement + post-retirement repair night

**Big-rock items:**
- [x] **Clerk fully retired from SafeSpark** — ClerkProvider dropped, `/sign-in`/`/sign-up` routes deleted (middleware redirects to `/login`), Clerk JWT provider removed from `convex/auth.config.ts`, `@clerk/nextjs` uninstalled. 11 src files refactored to Marketing Central JWT only. Cleanup leftovers: unused Clerk env vars on Vercel, `legacyClerkUserId` column on `users` schema, two remaining `withIndex('by_clerk_id', identity.subject)` lookups (lines 144/558 in `safespark.ts`, currently unreachable), `debugWhoAmI` query (drop when stable).
- [x] **Marketing JWT verification via shared HMAC secret** — the actual fix for post-Clerk empty `/parent`. Marketing signs with HS256 + ADMIN_KEY, but SafeSpark's `auth.config.ts` only supported JWKS verification (RSA-only); HMAC tokens were silently rejected. Mirrored Marketing's secret to SafeSpark Convex env as `MARKETING_JWT_SECRET`, added `verifyMarketingToken()` helper in `convex/actors.ts` using `jose.jwtVerify`. Refactored 10 parent-facing queries/mutations to accept `userToken` arg (`users.getCurrent`, `safespark.listFamilyForParent`, `getFamilyUsageThisMonth`, `getProfileDetail`, `getKidSettings`, `setKidSettings`, `setBlockedTopics`, `debugWhoAmI`, `families.ensureForParent`, `families.getForParent`). Frontend passes `marketing.token` on every parent-side query. **Long-term debt:** Marketing should migrate to RSA + JWKS so cross-app verification doesn't need shared secrets.
- [x] **SafeSpark per-project context checkpoints** — Knox-frustration fix. New `safesparkCheckpoints` table + `convex/checkpoints.ts` module. Every ~10 turns OR >48h stale, gpt-4o-mini writes a ~500-word markdown recap (premise / what's built / design decisions / recent work / code anchors). `/api/demo/route.ts` prepends latest checkpoint to system prompt on every turn. DemoWorkbench fires `void maybeCreateCheckpoint()` after each saveCloud. Cost ~$0.0001/checkpoint. Phase 2 (UI project journal in version history): not yet built.
- [x] **Cross-app kid login nav (5 apps)** — each app's pre-auth kid login renders a 4-cell emoji grid (Music/Video/Books/Search/Build) linking to the other apps' kid routes with `?fc=XXXXXX` param. Receiving app auto-populates the family code and auto-advances to profile picker when fc has 6 chars. Inlined per-app (no shared package).
- [x] **Admin `/admin/*` dual-auth** — Marketing Central password sign-in added at `/admin-login` to bypass the broken Google OAuth (redirect URI never whitelisted in Cloud Console). New POST `/api/admin-auth/marketing-login` allow-list-checks email = jedaws@gmail.com, sets HttpOnly Secure cookie `safefamily_admin_jwt` (7d), admin layout dual-paths NextAuth + cookie. Google OAuth still works as fallback.
- [x] **AppSelector 5-app rollout** — signup page now routes every entry (including legacy `?app=safetunes` per-app LPs) through `<UnifiedPlanSummary>` when `NEXT_PUBLIC_ENABLE_UNIFIED_PRICING=true`. Customer-visible "4 apps"/"four apps" copy → "5 apps"/"five apps" in success, setup, account, terms, SignupCTA. Terms page Pricing block → $14.99/$149 + all 5 apps named with legacy $4.99 grandfather note. Existing single-app subs unaffected.

**Specific fires put out:**
- [x] **SafeSpark `/parent` render loop** — `useAuthCombined` had the whole Clerk auth object in `useCallback` deps; Clerk hooks return new object refs every render → `fetchAccessToken` identity churned → ConvexProviderWithAuth re-subscribed every render → all queries flipped between data and undefined → page bounced between "0 profiles" and "YYKN44/2 profiles" + GPU at 92%. Fixed by destructuring to `{isLoaded, isSignedIn, getToken}` primitives.
- [x] **SafeSpark code-bleed** — Knox's Philippians 2 game rendered raw JS as visible page text. HTML was 3.9 MB (99.6% base64 PNG from two SAFESPARK_SPRITE placeholders), browser srcDoc truncated mid-script. Two layers: (a) `generateImageUploadUrl`/`finalizeImageUpload` mutations now accept kid `sessionToken` so kid-session sprite uploads succeed instead of falling back to inline base64; (b) 400KB inline base64 safety cap in route.ts as belt-and-suspenders.
- [x] **"Switch kid" → "Switch profile"** rename on `/make` header (matches SafeTube's idiom).
- [x] **Jace's account migration** — password reset triggered for `soonerjace@gmail.com`, logged in via `/login`, verified end-to-end (family code `4QZ5WP`, kids, projects all reachable via email-fallback in `getActor()`).

**Discovered + tracked but not done:**
- [ ] `.gitignore` expansion + 508 tracked sensitive artifacts cleanup (new `.gitignore` written but `git rm --cached` not yet authorized). The `apps/safetunes/android-twa/android.keystore` (Play Store release signing key) has been in git history for months — current-HEAD removal won't expunge history; mitigation is either accept or do Google Play Signing key rotation.
- [ ] Marketing → RSA + JWKS migration (eliminates shared-secret dependency between apps; multi-day cross-app work).
- [ ] Phase 2 checkpoint UI (project journal in version history).

**Lessons saved to memory (`~/.claude/.../memory/`):**
- `feedback_clerk_auth_deps.md` — destructure Clerk auth hooks to primitives before useCallback deps
- `feedback_post_clerk_data_resolution.md` — after auth-provider swap, sweep every direct subject lookup
- `feedback_convex_jwks_vs_hmac.md` — Convex auth.config.ts can't verify HMAC JWTs; pass as arg + verify server-side

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
