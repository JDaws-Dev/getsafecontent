# Safe Family - Operations Guide

## Quick Reference

| App | Domain | Convex Prod | Tech |
|-----|--------|-------------|------|
| SafeTunes | getsafetunes.com | `formal-chihuahua-623` | React + Vite |
| SafeTube | getsafetube.com | `rightful-rabbit-333` | React + Vite |
| SafeReads | getsafereads.com | `exuberant-puffin-838` | Next.js |
| SafeStudy | getsafestudy.com | `strong-scorpion-227` | React + Vite + OpenAI |
| Marketing | getsafefamily.com | `adamant-crow-705` | Next.js |
| Blog | getsafefamily.com/blog | N/A (shares Marketing) | MDX + Velite |

---

## For AI Agents

**Before making changes:**
1. Test in dev before prod
2. Schema changes must be additive (don't remove fields)
3. Use feature branches for significant changes

**Key paths:**
- SafeTunes: `~/safecontent/apps/safetunes`
- SafeTube: `~/safecontent/apps/safetube`
- SafeReads: `~/safecontent/apps/safereads`
- SafeStudy: `~/safecontent/apps/safeseek`
- Marketing: `~/safecontent/sites/marketing`

**For implementation history, see:** `docs/BUILD-HISTORY.md`

---

## Admin Endpoints

Get the admin key:
```bash
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env list | grep ADMIN_KEY
```

URL encode it:
```bash
python3 -c "import urllib.parse; print(urllib.parse.quote('YOUR_KEY'))"
```

### SafeTunes (`formal-chihuahua-623.convex.site`)
```bash
# Grant lifetime
curl "https://formal-chihuahua-623.convex.site/grantLifetime?email=EMAIL&key=KEY"

# Delete user
curl "https://formal-chihuahua-623.convex.site/deleteUser?email=EMAIL&key=KEY"

# Admin dashboard
curl "https://formal-chihuahua-623.convex.site/adminDashboard?key=KEY&format=json"

# Wipe all orphaned records (cascades to children) — added 2026-05-21
curl "https://formal-chihuahua-623.convex.site/cleanupOrphans?key=KEY"
```

### SafeTube (`rightful-rabbit-333.convex.site`)
```bash
# Set status (trial/active/lifetime/cancelled/expired)
curl "https://rightful-rabbit-333.convex.site/setSubscriptionStatus?email=EMAIL&status=STATUS&key=KEY"

# Delete user
curl "https://rightful-rabbit-333.convex.site/deleteUser?email=EMAIL&key=KEY"

# Admin dashboard
curl "https://rightful-rabbit-333.convex.site/adminDashboard?key=KEY&format=json"
```

### SafeStudy (`strong-scorpion-227.convex.site`)
```bash
# Admin dashboard
curl "https://strong-scorpion-227.convex.site/adminDashboard?key=KEY&format=json"

# Provision user
curl "https://strong-scorpion-227.convex.site/provisionUser?email=EMAIL&key=KEY"

# Set subscription status
curl "https://strong-scorpion-227.convex.site/setSubscriptionStatus?email=EMAIL&status=STATUS&key=KEY"
```

### SafeReads (`exuberant-puffin-838.convex.site`)
```bash
# Grant lifetime
curl "https://exuberant-puffin-838.convex.site/grantLifetime?email=EMAIL&key=KEY"

# Delete user
curl "https://exuberant-puffin-838.convex.site/deleteUser?email=EMAIL&key=KEY"

# Admin dashboard
curl "https://exuberant-puffin-838.convex.site/adminDashboard?key=KEY&format=json"
```

### Marketing Central (`adamant-crow-705.convex.site`)
The central account management system for all Safe Family users.
```bash
# Grant lifetime access (optionally specify apps)
curl "https://adamant-crow-705.convex.site/grantLifetime?email=EMAIL&key=KEY&apps=safetunes,safetube,safereads"

# Delete user
curl "https://adamant-crow-705.convex.site/deleteUser?email=EMAIL&key=KEY"

# Admin dashboard
curl "https://adamant-crow-705.convex.site/adminDashboard?key=KEY&format=json"

# Get account details
curl "https://adamant-crow-705.convex.site/getAccount?email=EMAIL&key=KEY"

# Verify app access
curl "https://adamant-crow-705.convex.site/verifyAppAccess?email=EMAIL&app=safetunes&key=KEY"

# Create authAccount for legacy user (SafeTunes/SafeTube only)
curl "https://APP.convex.site/createAuthAccount?email=EMAIL&key=KEY"
```

---

## Data Integrity & Orphan Detection

SafeTunes has an automated orphan detection system that checks for data integrity issues daily.

### What Are Orphans?
Orphaned records are child records that reference non-existent parent records:
- `kidProfiles` with deleted parent users
- `playlists`, `requests`, `recentlyPlayed` with deleted kid profiles
- `approvedSongs`/`approvedAlbums` with deleted users

### Monitoring
- **Automated Check**: Runs daily at 4:00 AM UTC
- **Email Alert**: Sent to admin if orphans detected
- **Admin Endpoint**: View current orphans via web interface

### View Orphaned Records
```bash
# HTML view (interactive)
curl "https://formal-chihuahua-623.convex.site/adminOrphans?key=ADMIN_KEY"

# JSON view (for scripting)
curl "https://formal-chihuahua-623.convex.site/adminOrphans?key=ADMIN_KEY&format=json"
```

### Cleanup Procedure
Use the HTTP endpoint (works around `npx convex run` routing to dev when .env.local is set):
```bash
KEY="<ADMIN_KEY_URL_ENCODED>"
curl "https://formal-chihuahua-623.convex.site/cleanupOrphans?key=$KEY"
```
Or via CLI (only reliable if you `unset CONVEX_DEPLOYMENT` first and `.env.local` is gone):
```bash
cd ~/safecontent/apps/safetunes
npx convex run orphanDetection:findOrphanedRecords   # dry run
npx convex run orphanDetection:deleteOrphanedRecords # cascade-deletes
```

### Alerter Behavior (rev 2026-05-21)
The daily cron at 4 AM UTC fires `checkAndAlertOrphans`, which now:
- Delegates discovery to `findOrphanedRecords` (single source of truth — no drift between admin view and alerter)
- Emails only on **delta** (count changed since last check) OR **Sunday heartbeat** (weekly "still alive" signal)
- Stable Mon–Sat checks are silent — stops the daily noise that masked a 1,066-record undercount for 11+ days
- Logs every check to a new `orphanCheckHistory` table for trend tracking

### Prevention
- Always use `archiveAndDeleteKidProfile` mutation instead of raw deletes
- User deletion should cascade to kid profiles via `deleteUserHttpAction`
- The detection system alerts on delta only — stable counts are silent so real changes stand out

---

## Automated Backups

Daily backups of all Convex production databases to Cloudflare R2.

- **Schedule**: 3:00 AM UTC daily (GitHub Actions)
- **Storage**: Cloudflare R2 bucket
- **Retention**: 30 days (auto-deleted via R2 lifecycle rules)
- **Alert**: Email on failure

### Manual Backup
```bash
# Export a single app
cd ~/safecontent/apps/safetunes
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex export --path ~/Desktop/backup.zip

# Include file storage
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex export --path ~/Desktop/backup.zip --include-file-storage
```

### Restore from Backup
```bash
# Download from R2 (via wrangler or AWS CLI)
wrangler r2 object get safefamily-backups/2026-02-24/safetunes-2026-02-24.zip --local ./restore.zip

# Import to Convex (CAUTION: overwrites data!)
unzip ./restore.zip -d ./restore
npx convex import --path ./restore
```

### Setup
See `docs/CONVEX-BACKUP-SETUP.md` for full configuration including:
- GitHub secrets setup
- Cloudflare R2 bucket creation
- Lifecycle rules for 30-day retention

---

## Stripe Monitoring

Daily automated audits to catch billing issues before customers do.

- **Schedule**: 4:00 AM UTC daily (GitHub Actions)
- **Alerts**: Email when issues detected
- **Checks**:
  - Duplicate customers (same email)
  - Multiple active subscriptions per email
  - Failed webhooks (last 24h)

### Manual Audit
```bash
# Run audit (dry run - no changes)
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-audit.ts

# JSON output (for automation)
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-audit.ts --json
```

### Cleanup Duplicates
```bash
# List duplicates
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-cleanup.ts

# Archive duplicates (CAUTION: review output first)
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-cleanup.ts --archive
```

### Setup
GitHub Actions requires these secrets:
- `STRIPE_SECRET_KEY` - Stripe live API key
- `RESEND_API_KEY` - For alert emails

See `docs/STRIPE-DUPLICATE-CLEANUP.md` for cleanup guidance.

---

## Auth Troubleshooting

### Current Auth Architecture
- **Each app has separate auth** - users must sign up per app
- **Convex Auth** requires both `users` table entry AND `authAccounts` entry
- Password reset ONLY works if user has an `authAccounts` entry

### Common Auth Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `InvalidAccountId` | No `authAccounts` entry | Use `/createAuthAccount` endpoint |
| `auth:signIn Server Error` | Missing `auth.config.js` | Add config file, redeploy |
| `internal is not defined` | Missing import | Add `import { internal } from "./_generated/api"` |

### Legacy User Migration
Users created before Convex Auth integration need `authAccounts` entries:

```bash
# Check if user has authAccount
npx convex run users:checkAuthAccountExists '{"email": "user@example.com"}'

# Create authAccount for legacy user
curl "https://APP.convex.site/createAuthAccount?email=EMAIL&key=ADMIN_KEY"

# Or via mutation (get userId first)
npx convex run users:debugInsertAuthAccount '{"userId": "ID", "email": "EMAIL", "passwordHash": "NEEDS_RESET"}'
```

After creating authAccount, user must use **Forgot Password** to set their password.

### Key Auth Files
- `convex/auth.ts` - Convex Auth configuration
- `convex/auth.config.js` - Provider configuration (MUST be committed!)
- `convex/users.ts` - User management + `debugInsertAuthAccount`
- `convex/migrateAuthAccounts.ts` - Batch migration scripts (SafeTunes only)

---

## Pricing & Stripe

### Individual Apps
| App | Monthly | Trial |
|-----|---------|-------|
| SafeTunes | $4.99 | 7 days |
| SafeTube | $4.99 | 7 days |
| SafeReads | $4.99 | 7 days |

### Bundle (Safe Family)
| Plan | Price |
|------|-------|
| 2 Apps | $7.99/mo |
| 3 Apps Monthly | $9.99/mo |
| 3 Apps Yearly | $99/year |

**Stripe IDs:**
- Product: `prod_TvRXoGfAONo3nA`
- Monthly Price: `price_1SxaerKgkIT46sg7NHNy0wk8`
- Yearly Price: `price_1SzLJUKgkIT46sg7xsKo2A71`

### Promo Codes
| Code | Effect |
|------|--------|
| `DAWSFRIEND` | Lifetime access |
| `DEWITT` | Lifetime access |

---

## User Management

### Key Users (Do Not Delete)
- `jedaws@gmail.com` - Owner (all apps)
- `metrotter@gmail.com` - Michelle (SafeTube only currently)
- `jennydaws@gmail.com` - Jenny (lifetime)

### Test Patterns (Safe to Delete)
- `*@artiosacademies.com`
- `*@test.com`
- `test*@*`
- `demo@getsafe*.com`

---

## Deploy Commands

```bash
# SafeTunes
cd ~/safecontent/apps/safetunes && npx convex deploy --prod

# SafeTube
cd ~/safecontent/apps/safetube && CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex deploy

# SafeReads
cd ~/safecontent/apps/safereads && CONVEX_DEPLOYMENT=prod:exuberant-puffin-838 npx convex deploy

# SafeStudy
cd ~/safecontent/apps/safeseek && CONVEX_DEPLOYMENT=prod:strong-scorpion-227 npx convex deploy

# Marketing (auto-deploys via Vercel on push)
cd ~/safecontent/sites/marketing && vercel --prod
```

---

## Environment Variables

### Marketing Site (Vercel)
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - `whsec_iEPhQgt9sFmVzNMgwEjZhw2yfmiIOA16`
- `STRIPE_BUNDLE_PRICE_ID` - `price_1SxaerKgkIT46sg7NHNy0wk8`
- `ADMIN_API_KEY` - Same as Convex ADMIN_KEY
- `NEXT_PUBLIC_URL` - `https://getsafefamily.com`
- `GOOGLE_BOOKS_API_KEY` - For book demo
- `RESEND_API_KEY` - For newsletter emails
- `RESEND_NEWSLETTER_AUDIENCE_ID` - Resend audience for subscribers
- `UPSTASH_REDIS_REST_URL` - Rate limiting & audit logs
- `UPSTASH_REDIS_REST_TOKEN` - Upstash auth
- `SENTRY_DSN` - Error tracking (server-side)
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking (client-side)
- `ENABLE_UNIFIED_AUTH` - Feature flag for unified auth (see below)

### Convex Apps
Each app has in Convex env vars:
- `ADMIN_KEY` - Admin API authentication
- `STRIPE_SECRET_KEY` - Stripe API
- `STRIPE_WEBHOOK_SECRET` - Webhook verification

---

## Common Operations

### Grant Lifetime to New User
```bash
# Get and encode admin key
KEY=$(CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env list 2>/dev/null | grep ADMIN_KEY | cut -d= -f2)
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$KEY'))")

# Grant on all 3 apps
curl "https://formal-chihuahua-623.convex.site/grantLifetime?email=USER@EMAIL.COM&key=$ENCODED"
curl "https://rightful-rabbit-333.convex.site/setSubscriptionStatus?email=USER@EMAIL.COM&status=lifetime&key=$ENCODED"
curl "https://exuberant-puffin-838.convex.site/grantLifetime?email=USER@EMAIL.COM&key=$ENCODED"
```

### Fix Stuck Subscription
If a user paid but shows as trial:
```bash
curl "https://APP.convex.site/setSubscriptionStatus?email=EMAIL&status=active&key=KEY"
```

### Rotate Admin Key
```bash
NEW_KEY=$(openssl rand -base64 32)
echo "New key: $NEW_KEY"

CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env set ADMIN_KEY "$NEW_KEY"
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex env set ADMIN_KEY "$NEW_KEY"
CONVEX_DEPLOYMENT=prod:exuberant-puffin-838 npx convex env set ADMIN_KEY "$NEW_KEY"

# Also update ADMIN_API_KEY in Vercel for marketing site
```

---

## Feature Flags

Feature flags allow gradual rollout of new features without code changes.

### ENABLE_UNIFIED_AUTH

Controls the unified authentication system for new signups.

| Value | Behavior |
|-------|----------|
| `true` | New flow: Signup creates centralUser first, webhook uses /provisionUser with password hash |
| `false` (default) | Legacy flow: Direct to Stripe checkout, webhook uses /setSubscriptionStatus |

**To enable:**
```bash
# Via Vercel CLI
vercel env add ENABLE_UNIFIED_AUTH production
# Enter value: true

# Or via Vercel Dashboard
# Settings → Environment Variables → Add ENABLE_UNIFIED_AUTH = true
```

**To disable (rollback):**
```bash
vercel env rm ENABLE_UNIFIED_AUTH production
# Or set value to "false"
```

**Files involved:**
- `sites/marketing/src/lib/feature-flags.ts` - Flag definitions
- `sites/marketing/src/app/api/feature-flags/route.ts` - Client-side flag API
- `sites/marketing/src/app/signup/page.tsx` - Signup flow logic
- `sites/marketing/src/app/api/stripe/webhook/route.ts` - Webhook provisioning logic

**Gradual rollout strategy:**
1. Test with `ENABLE_UNIFIED_AUTH=true` in preview/staging
2. Monitor Sentry for errors
3. Enable in production when confident
4. If issues occur, disable immediately (instant rollback)

---

## Troubleshooting

### Webhook Not Firing
1. Check Stripe dashboard → Webhooks → Recent events
2. Verify webhook URL: `https://getsafefamily.com/api/stripe/webhook`
3. Check Vercel logs for errors

### User Can't Login
- SafeTunes/SafeTube: Email/password auth
- SafeReads: Google OAuth only
- Check if user exists in admin dashboard
- **If `InvalidAccountId` error**: User missing `authAccounts` entry
  - Use `/createAuthAccount` endpoint to fix
  - Then have user use Forgot Password

### Checkout Fails
1. Check Vercel env vars are set
2. Verify Stripe API key is live (not test)
3. Check browser console for errors

---

## Support Playbook

### "I paid but can't access"
1. Check Stripe dashboard for payment
2. Check app admin dashboard for user status
3. Use `setSubscriptionStatus` endpoint to fix

### "I forgot my password"
- SafeTunes/SafeTube: Use forgot password flow
- SafeReads: Re-login with Google

### "How do I cancel?"
- Direct to Settings → Manage Subscription in any app
- Or: Stripe customer portal

---

## Security & Monitoring

### Rate Limiting (Upstash Redis)
Public APIs are rate-limited per IP:
- `/api/checkout` - 10 requests/min
- `/api/demo/*` - 30 requests/min (shared)
- `/api/newsletter/subscribe` - 5 requests/min

Returns `429 Too Many Requests` with `Retry-After` header when exceeded.

### Error Tracking (Sentry)
- Dashboard: https://safetunes.sentry.io/projects/safe-family-marketing/
- Captures client-side and server-side errors
- Alerts on payment/webhook failures

### Audit Logging
All admin actions logged to `/admin/audit-logs`:
- Grant/revoke lifetime access
- Delete user
- Send emails
- Retry failed provisions

Logs include: timestamp, admin email, action, target, IP address.

### Webhook Resilience
- 5s timeout per app provisioning call
- 3 retries with exponential backoff
- Alert email on final failure
- Partial success still grants access to working apps

---

## Admin Pages

| URL | Purpose |
|-----|---------|
| `/admin` | Dashboard - users, revenue, stats |
| `/admin/users` | User management, bulk actions |
| `/admin/audit-logs` | Admin action history |

---

## Newsletter

### Email Capture
- Form on all blog posts
- Lead magnet: "10 Ways to Keep Kids Safe Online"
- Guide page: `/guides/keeping-kids-safe-online`

### Resend Setup
- Domain verified: `getsafefamily.com`
- Audience ID in env var
- Welcome email sent on subscribe

### Subscribers
- View in admin dashboard (NewsletterCard)
- Manage in [Resend](https://resend.com/audiences)

---

## Blog

**URL**: getsafefamily.com/blog

### Content System
- **Velite** for MDX content management
- Posts in `sites/marketing/content/blog/*.mdx`
- Scheduled publishing: future-dated posts auto-appear on their date

### Adding a Blog Post
1. Create `sites/marketing/content/blog/your-slug.mdx`
2. Add frontmatter (title, slug, description, date, published, image, author, category, tags)
3. Write content in MDX (can use `<SignupCTA product="SafeTunes" />`)
4. Push to main - auto-deploys via Vercel

### Categories
- SafeTunes, SafeTube, SafeReads, General

---

## What's Next

### SafeStudy
- [x] Domain live (getsafestudy.com)
- [x] KidSearch.jsx refactored (2,435 → 962 lines, 23 components)
- [x] Security fixes: prompt injection, rate limiting, CORS, PIN security, subscription checks, orphan detection
- [x] Pinterest-substitute hardening (intent classifier, loop detector, ED tripwire, query budget, weekly digest, etc — see Apr 28 entry below)
- [ ] Parent UI for `kidConcernAlerts` (backend deployed, needs admin dashboard surface)
- [ ] Weekly digest opt-out toggle in admin Settings (backend flag deployed, needs UI)
- [ ] Stripe checkout UI button in admin Settings
- [ ] UpgradePrompt component (trial countdown)
- [ ] useSubscriptionSync hook (sync with Marketing Central)
- [ ] Promo code validation (DAWSFRIEND, DEWITT)
- [ ] Landing page polish (testimonials, FAQ, hero images)
- [ ] Mobile hamburger menu

### SafeReads Kid Side (NEW — Deployed Apr 3-4)
Full kid-facing reading platform:
- **Kid routes at `/read`** (getsafereads.com/read)
- Family code login (synced across all apps via `users.familyCode`)
- Library page: Netflix-style browsing with genre/format/sort filters, infinite scroll
- In-app book reader (Gutenberg HTML, serif typography, font controls, themes)
- Bible reading: 6 translations (ESV, NIV, NLT, NKJV, NASB, KJV) via Bolls.life API
- AI Study Notes: conservative Baptist perspective per chapter via OpenAI
- Saved verses with color highlights + personal notes
- Bible full-text search across translations
- Audiobooks via LibriVox (20K+ free), chapter player with position memory
- Tap-to-define dictionary (free Dictionary API)
- Book request system (kid requests → auto AI analysis → parent approves/denies)
- Pre-approved classics: 37 books, classified Safe/Caution/Mature
- Parent comfort level setting (Safe Only / Safe+Moderate / All Classics)
- Content safety gate (blocks unanalyzed books from reader)
- Book cover waterfall (Open Library → Google Books → DALL-E 3 → StylizedCover)
- Genre browser (15 genres), multiple book sources (Gutenberg, LibriVox, Bloom, Lit2Go, Book Dash)
- Desktop sidebar nav (lg+), bottom nav on mobile
- Parent side: manage books per kid, improved wishlists with status, pending request notifications

### SafeTunes
- [x] Playlist export feature for graduating teens (MusicKit library write API)
- [x] Kid request button (already built — verified Apr 6)

### SafeTube
- [x] AI Review enhancement deployed to prod May 5, 2026 (`rightful-rabbit-333`) — adds `parentCommunityNotes`, `knownControversies`, `commonSenseMediaRating` to `channelReviewCache`. **Initial deploy populated empty arrays / null** because gpt-4o-mini was silently dropping the new fields from its JSON response. Fixed same day by adding OpenAI `response_format: { type: "json_schema", strict: true }` to enforce the full schema. Verified live: PewDiePie review returns CSM 3/5, 2 controversies (slurs incident, meme associations), 2 community notes. Existing cached reviews (pre-deploy) still lack these fields; they'll populate as new channels are reviewed.
- [x] Kid request button (already built — verified Apr 6)

### Immediate
- [x] ~~Register for FPEA Florida Homeschool Convention (May 21-23, 2026)~~ — **MISSED.** Event passed without registration. Largest single Florida homeschool-mom audience for the year. Plan a 2027 registration well in advance (FPEA exhibitor slots typically open in fall), or look for the next equivalent convention (Southeast Homeschool Expo Atlanta Jul 24-25 is already on the TODO list).

### Completed
- [x] **Unified Auth** - JWT migration fully complete (Mar 27)
- [x] **Email Automation** - All types deployed (Apr 1)
- [x] **SafeStudy MVP** - Core search, tutor, profiles, time limits, Stripe webhooks
- [x] **Convex Auth Removal** - Removed from all 3 original apps (Mar 27)
- [x] **Trial-First Signup** - 7-day free trial, no credit card (Apr 2)
- [x] **Unified Family Codes** - Synced across all apps during provisioning (Apr 2)
- [x] **SafeStudy Security** - 10 audit fixes deployed (Apr 3)
- [x] **SafeReads Kid Side** - Full reading platform (Apr 3-4)
- [x] **SafeReads AI Enhancement** - Granular age guidance, community notes, series context (Apr 3)
- [x] **Customer Email** - SafeStudy launch email sent to all users (Apr 2)
- [x] **YouTube API Response** - Sent to YouTube API review team (Apr 3)
- [x] **SafeReads Nav Fix** - Single nav on landing page, removed double-stack (Apr 5)
- [x] **SafeReads Stripe Webhook** - Graceful handling of missing users, real errors return 500 (Apr 5-6)
- [x] **SafeReads /pricing redirect** - Added redirect to /#pricing anchor (Apr 5)
- [x] **All 4 Apps Footer Consistency** - Contact link, SafeStudy, app cross-links (Apr 5)
- [x] **SafeReads Kid Onboarding** - 3-step wizard (genres, reading goal, confirmation) (Apr 6)
- [x] **SafeReads Reading Streaks & Badges** - Daily tracking, 8 badges, weekly view (Apr 6)
- [x] **SafeReads Recommendations** - Personalized "Recommended for You" by genre + history (Apr 6)
- [x] **SafeReads New Icon** - White shield with book on orange (Apr 6)
- [x] **Marketing Dark Mode** - System preference re-enabled, comprehensive CSS overrides (Apr 6)
- [x] **Blog Post: "Why I Built SafeFamily"** - Founder story published (Apr 6)
- [x] **Consolidated Trial Emails** - All 4 apps POST trial results to Marketing Central; one customer email per user (with bundle upsell) + one admin digest instead of 3-4 separate emails (Apr 13)
- [x] **Stripe Cleanup** - Archived duplicate SafeReads product, renamed bundle to "Safe Family Bundle" (Apr 14)
- [x] **Blog: 6 Posts Scheduled** - SafeStudy intro, homeschool toolkit, Bible reading, kid requests, Bark/CE comparison, kids search (Apr 14-May 1, Mon/Thu cadence)
- [x] **Blog SEO Fixes** - og:image + twitter card on listing page, BreadcrumbList JSON-LD on posts, MDX img lazy loading (Apr 14)
- [x] **Outreach Research** - Competitor growth playbooks documented (docs/OUTREACH-RESEARCH-2026-04-08.md)
- [x] **Email Warmup Research** - Warmup tool comparison, manual warmup recommended for pilot scale (docs/EMAIL-WARMUP-RESEARCH-2026-04-08.md)
- [x] **Outscraper Pipeline Plan** - Full spec for FL homeschool co-op lead-gen pilot (docs/OUTSCRAPER-PIPELINE-PLAN.md)
- [x] **OG Image Updated** - Added SafeStudy (4 apps), purple→pink CTA, "Music. Video. Books. Search." (Apr 17)
- [x] **Promo Video Logos** - 5 transparent PNG logos (icon-only + icon+text) at videos/promo-logos/ (Apr 17)
- [x] **/syncFamilyCode endpoint** - Added to all 4 apps for syncing/reading familyCode on legacy users: `GET /syncFamilyCode?email=&code=&key=` (code optional; omit to read). Used to unify codes for pre-Apr-2 users (Apr 19)
- [x] **SafeStudy hardening — Pinterest-substitute lockdown** (Apr 28): 10-item rollout against the synonym-shuffling / aesthetic-browsing pattern surfaced by Bella Trotter's account audit (212 searches in last month, ~57 aesthetic-collage queries)
  - **#1 Intent classifier** — `convex/ai/intentClassifier.ts`: regex pre-filter (catches "pintrest/colage/asthedic" misspellings + self-image patterns) + gpt-4o-mini fallback. 9 categories. Always-escalate on `eating_disorder_adjacent` and `self_harm_adjacent`. Strictness-aware blocking (moderate blocks aesthetic-browsing+self-image; strict adds appearance+celebrity-gossip). Fail-open on classifier errors. Wired into `searchFromKid` BEFORE `performSearch`. Stores `intentCategory/Confidence/Rationale` on `searchHistory` and `blockedSearches`
  - **#2 Repetition / fuzzy-loop detector** — `convex/ai/loopDetector.ts`: normalizes query (strip stop words + ALL color tokens, sort tokens), 4+ matches in 30 minutes triggers cooldown redirect. Cross-checks both `searchHistory` AND `blockedSearches` (loop crosses the block boundary). New `getRecentQueriesForLoopCheck` internal query
  - **#3 Image search default OFF** — `allowImageSearch: false` for new profiles in `OnboardingWizard`, `KidProfileEditor`. Amber warning chip when toggled on ("turns SafeStudy into a Pinterest-style mood-board tool"). Existing kids unchanged
  - **#4 Daily query budget per kid** — added `kidProfiles.dailyQueryBudget` (optional). Strictness defaults: strict=15, moderate=25, light=50. `timeLimits.canSearch` updated to consult both the explicit `timeLimits.dailyLimitMinutes` (when set) and the new profile budget. Today's count uses family timezone
  - **#5 New blocked-topic options** — added `aesthetic-browsing`, `self-image`, `appearance`, `celebrities` to all 3 parent UIs (`KidProfileCustomize.jsx`, `KidProfileEditor.jsx`, `OnboardingWizard.jsx`). `DEFAULT_BLOCKED` now includes aesthetic-browsing + self-image
  - **#6 ED / self-harm tripwire + parent alert** — new `kidConcernAlerts` table (with `by_user`, `by_kid`, `by_user_unack` indexes). `convex/concernAlerts.ts` schedules a Resend email to the parent when a query trips the always-escalate categories; `concernAlertQueries.ts` exposes `listForUser`, `acknowledge`, `markNotified`. 24h dedupe on (kidProfileId, query, category) so retries don't spam. Email includes 988 / NEDA helpline links
  - **#7 Curiosity prompts (age-bucketed)** — `utils.js` split SUGGESTIONS into `SUGGESTIONS_YOUNG` (4-7), `SUGGESTIONS_MID` (8-11), `SUGGESTIONS_OLDER` (12+). New `pickCuriosityPrompts(ageRange, count)` helper. Older tier includes "How does the immune system work?", "What is dark matter?", "How does encryption keep messages secret?", "What caused the Great Depression?" — bias the empty state toward "real questions"
  - **#8 Hide kid-side query history** — removed History button from `SearchHeader`, removed `<SearchHistoryPanel>` render from `KidSearch`, removed "recent searches" branch from autocomplete (typing "ae" no longer surfaces "aesthetic colage pintrest" as a memorized suggestion). Parent dashboard still has full history. Component preserved for admin use
  - **#9 Image result cap** — `deduplicateImages(allImages, 6)` (was 8) in `convex/search.ts`. Defensive client-side `MAX_IMAGES = 6` slice in `ImagesResults.jsx`. No "more like this", no infinite scroll, no pagination
  - **#10 Weekly parent digest** — Sunday 23:00 UTC cron (`convex/crons.ts`). `convex/weeklyDigest.ts` (action) + `weeklyDigestQueries.ts` (queries/mutations). Per-kid summary: total searches, blocked count, top intent categories, concerning-query count, heaviest day, budget-hit days. Skips parents with no activity, opted-out (`users.weeklyDigestOptOut`), or expired/cancelled subscription. Includes "Turn off weekly digests" link
  - **Schema:** added `intentCategory/Confidence/Rationale` to `searchHistory` + `blockedSearches`, new `kidConcernAlerts` table, `kidProfiles.dailyQueryBudget`, `users.weeklyDigestOptOut + lastDigestSentAt`. All optional/additive. Deployed cleanly to `strong-scorpion-227`
  - **NOT YET BUILT (next session):** parent dashboard surfaces for `kidConcernAlerts` (the listForUser / acknowledge mutations exist; need UI), weekly-digest opt-out toggle in admin Settings page

- [x] **SafeTunes kid-login crash — Convex 32k read-limit fix** (May 4): Ben Purves emailed a screenshot of his son hitting "Something went wrong" right after tapping his profile. Reproduced live with playwright using family code `RSAMPT` → console showed `[CONVEX Q(kidRequests:getKidRequests)] Server Error`. Running the query directly returned `Too many documents read in a single function execution (limit: 32000)`.
  - **Root cause:** `kidRequests:getKidRequests` (`apps/safetunes/convex/kidRequests.ts:6`) iterated each approved/partially-approved album request and ran `ctx.db.query("approvedSongs").withIndex("by_user", ...).filter(kidProfileId AND appleAlbumId).first()` per request. The `by_user` index narrows by parent only — the `.filter()` then walks the parent's full song list. Ben's family had 60 approved albums × 1163 songs across 3 kids → reads compounded past Convex's hard 32k-per-query limit → query threw → React's Sentry ErrorBoundary rendered the generic error screen
  - **Fix:** Pre-fetch the kid's own approved songs *once* via the selective `by_kid_profile` index (small per-kid subset), build Sets of `appleAlbumId` / `albumName` / `appleSongId`, then check existence in memory. One indexed query instead of N broad ones. Same correctness, dramatically fewer reads
  - **Verified:** All 3 kids (Andrew, Elizabeth, Jack) now load. Console clean. Andrew's dashboard shows "Good Evening, Andrew" + welcome modal as expected
  - Convex-only deploy to `formal-chihuahua-623`; no Vercel push needed. Drafted reply to benpurves@hotmail.com from the apps account (Jeremiah pasted/sent manually)
  - **Lesson:** `.withIndex(broad).filter(narrow)` is a scaling cliff. Fine for small accounts, fatal for power users. When checking existence across many child rows, fetch once via the most selective index (`by_kid_profile`) and check via in-memory Sets. Added as MEMORY.md lesson #9

- [x] **SafeTube time-limit bug fix** (Apr 28): two compounding bugs in `VideoPlayer.jsx` were letting watchDurationSeconds inflate to 19+ hours/day on Bella Trotter's account despite a 90 min/day limit
  - **Bug 1 — wall-clock inflation:** `saveWatchDuration` was computing `Date.now() - watchStartTimeRef`, which counts real-world seconds from when the video element loaded. If a kid pauses, walks away, or leaves the tab open overnight, the timer kept running. **Fix:** track *active playback time* via `playStartedAtRef` + `accumulatedPlayMsRef`. PLAYING (state=1) → begin span; PAUSED/BUFFERING/ENDED → roll span into accumulator. `getActivePlayMs()` returns total active time only
  - **Bug 2 — save-on-end only:** `saveWatchDuration` only fired on video END / handleClose. During a long single video, watchDurationSeconds stayed at 0, so `canWatch` (the time-limit gate) saw 0 minutes used and kept allowing more. **Fix:** added `periodicSaveIntervalRef` running every 30s during playback. Also save on PAUSED transitions
  - **Mid-session limit enforcement:** `VideoPlayer` now subscribes reactively to `api.timeLimits.canWatch` via `useQuery`. When the limit is hit during playback (triggered by the new periodic saves), the player auto-closes and bounces back to KidPlayer (which already has the time-limit modal)
  - Frontend-only — no SafeTube backend deploy (still under YouTube API compliance review)

- [x] **UX audit — round 6 shipped** (Apr 19): 10 more items spanning product + architecture foundations
  - **SafeReads reader focus mode** — chrome auto-hides after 3s inactivity in `/read/book/*`; any scroll / tap / mouse move inside the scroll container re-shows + resets the idle timer (matches Kindle/Apple Books)
  - **Pricing progressive disclosure** — Monthly/Yearly toggle replaced with side-by-side radio cards. Both prices visible at once, yearly card has "Save X%" badge. Yearly label no longer clips on mobile
  - **Blog TOC in sidebar** — added `s.toc()` to velite schema; post sidebar shows "On this page" card with h2/h3 titles
  - **`/account` post-purchase dashboard** — added prominent family-code card at the top (gradient, copy button) + "First time? Setup guide" CTA linking to `/setup`. `getCurrentUser` now returns `familyCode`
  - **`/setup` page** — new route with 4-step visual walkthrough (kid profiles → connect apps → share family code → approve content), jump-into-app grid, common questions. Linked from `/account` for post-purchase users
  - **Testimonials voice fix** — rewrote 3 of 5 in varied cadence including one mildly-qualified-but-positive review (Emily T. mentions mobile UI could be snappier). Kept Mike R. (SafeTube) and Jennifer K. (SafeTube)
  - **SafeTunes kid welcome modal** — first-visit per kid profile, explains 3-step request/approve/listen flow, dismissible, persisted in `localStorage[safetunes_kid_welcomed_${id}]`. MVP for the "cold drop into empty library" issue; full 3-step wizard is a follow-up
  - **Unified kid profiles — Marketing Central foundation** — added `kids` table to `adamant-crow-705` schema (parentUserId, name, age, color, avatarIcon, pinHash, archived) with `by_parent` + `by_parent_and_archived` indexes. New `kids.ts` module with `listByParent`, `getById`, `create`, `update`, `archive` + `upsertByNameInternal` for server-to-server provisioning. Apps not migrated yet — that's next session
  - **`@safefamily/ui` package scaffold** — created `packages/ui/` with package.json, README, and first extracted component: `<FamilyCodeInput>` (the 6-box segmented code entry matching SafeReads/SafeStudy). Not wired into apps yet; workspace strategy (npm/pnpm workspaces vs Turborepo) is the next-session decision
  - **Accessibility globals** — added `prefers-reduced-motion` guards to all 4 apps' + marketing's CSS; added global `:focus-visible` ring + `.sr-only` utility to marketing. Applies to `animate-*`, `transition-*`, `scroll-behavior`
- [x] **UX audit — round 5 shipped** (Apr 19): 12 more fixes across all 4 apps + marketing
  - **SafeStudy kid avatars** — ported SafeReads' color→emoji mapping (dragon/lion/lightning/owl/rocket/star/unicorn/paw-prints/dolphin/herb). Profile selection tiles, PIN entry circle, and header avatar now show distinct icons per color instead of the initial letter only. New `AVATAR_ICONS` + `getAvatarIcon()` export on `utils.js`
  - **SafeStudy nav: "Kid Search" → "Kid Login"** on the landing header + footer, linking `/play` (not `/search`) for cross-app consistency
  - **SafeStudy kid family-code entry** — replaced sterile single input + "Start Searching" button with SafeReads-style 6-box segmented input, whimsical copy ("Enter your family's secret code! / Ready to discover something new?"), decorative background blobs + Sparkles/Rocket icons, "Let's Go! →" CTA, "Don't have a code?" help card
  - **SafeTunes kid request search artwork** — on web now pulls real Apple Music cover art (`artwork.url` at 120×120), gradient music-note icon kept only in iOS/TWA wrappers for App Store compliance
  - **SafeTunes landing nav demoted Kid Login** to a compact "Kids →" tertiary link; primary pair is now Parent Login + Start Free Trial (matches SafeReads hierarchy)
  - **SafeReads kid search: pre-approved books skip "Ask Parent"** — now render a green "Read Now" link straight to the reader. `FreeBookSearch` queries `preApprovedBooks.getPreApprovedBooks` and keys off gutenbergId to decide which button to show
  - **Marketing "Sound familiar?" pill** — amber triangle warning icon (read as error) swapped for `MessageCircle`
  - **Marketing footer expansion** — thin navy bar replaced with 12-col grid: brand blurb + tagline + trust chips / Apps column (with icons) / Company column (Blog, Guides, Contact) / Legal column (Privacy, Terms, Refund Policy). Adds real "made with care" footer instead of the dev-placeholder look
  - **Blog category filter chips** — added `BlogListClient` client component above the grid. Derives category list from published posts, includes "All" chip, filters in-memory
  - **Blog Previous/Next post nav** — added chronological nav (across all categories) between the article body and "More from {category}" section. Uses `card-soft` styling, ArrowLeft/Right icons, hidden placeholders on mobile for alignment
  - **Blog right-rail sidebar (lg+)** — `lg:grid-cols-[minmax(0,1fr)_280px]` layout with sticky sidebar: author bio card, reading time estimate (~word count / 220 wpm from body length), newsletter subscribe CTA, tags card. Mobile unaffected
  - **SafeReads "iOS & Android Coming Soon" banner** — removed (was hugging the fold, low value, redundant with new marketing FAQ entry)
- [x] **UX audit — round 4 shipped** (Apr 19):
  - SafeReads landing nav: "Kid Login" purple pill (competing with primary CTA) → plain text link; "Safe Family" cross-link brightened from `text-ink-400` to `text-ink-600` in both the landing nav and reusable `Navbar.tsx`
  - Marketing FAQ: added "Do I need an Apple Music subscription for SafeTunes?" and "Do you have iOS or Android apps?" (audit-identified gaps that cost trust)
  - **SafeStudy `/play` + `/kids` aliases**: these routes previously fell through the wildcard to `/`, breaking muscle memory with the other apps (/play for SafeTunes/SafeTube, /read for SafeReads). Added `/play`, `/play/:familyCode`, `/kids`, `/kids/:familyCode` routing to KidSearch
- [x] **UX audit — round 3 shipped** (Apr 19): CTA + verb cleanup across all 4 app landings:
  - SafeTube hero CTA: white-on-orange (read as empty outline at small sizes) → solid navy `#1a1a2e` + verb unified to "Start Free Trial"
  - SafeTunes landing: header "Try Free" → "Start Free Trial"; hero "Get 7 Days Free — No Credit Card" → "Start Free Trial"; secondary "Get 7 Days Free" → "Start Free Trial"
  - SafeStudy hero "Start Free for 7 Days — $4.99/mo after" → "Start Free Trial"
  - All 4 apps + marketing now use the same primary verb ("Start Free Trial") with one bundle-specific exception ("Get All 4 Apps — $9.99/mo" on marketing hero)
- [x] **UX audit — round 2 shipped** (Apr 19):
  - SafeTube kid login: placeholder `FAMILY CODE` → `ABC123` with `placeholder-gray-500` contrast; disabled-grey button → always-enabled "Let's Go! →" that validates on click with friendly error ("Your family code is 6 letters and numbers"); added helper line under input
  - SafeTunes landing H1: "The Apple Music Parental Dashboard That Actually Works" split into 3 intentional lines; dropped lg text-6xl → 2.75rem (xl still gets 6xl) so it doesn't collapse to 5 ragged lines in the two-column hero
  - SafeTunes cookie banner: no longer pops on first paint over the hero CTA — waits for scroll past 400px OR 6s dwell (was fixed 1s delay)
  - SafeTube + SafeStudy "Safe Family" cross-link: was `text-gray-400 hover:text-gray-600` (read as disabled), now `text-gray-600 hover:text-red-500` / `text-blue-600` (visible link)
  - SafeReads Gutenberg reader: strips `<span class="pagenum">[page i]</span>` + inline `[page i]/[pg 100]` markers that were leaking into rendered text
  - SafeReads search/genre: deduped identical books (same title+author, different Gutenberg editions) — fixes "Huckleberry Finn appears twice" issue. Single `dedupeBooks()` helper applied to `searchFreeBooks`, `getBooksByGenre`, and related-books query
- [x] **UX audit quick-wins shipped** (Apr 19): post-eval fixes across all 4 apps + marketing:
  - SafeStudy kid `ResearchCard` — source text now runs through `stripMarkdown` so `**bold**` + `### headings` don't render as raw characters
  - SafeTunes `CookieConsent` — skips `/play`, `/player`, `/child-login`, `/kids` routes (COPPA optics + no 9-year-old should see "Accept All")
  - Marketing `Header.tsx` — mobile hamburger menu (state existed but nothing rendered it below md:); panel links to 4 apps + Blog
  - Marketing signup page — `AppSelector` pricing row + `AccountForm` app summary row stack vertically below `sm:` so the Yearly toggle + chips don't overflow 375px
  - Marketing CTA copy unified to **"Start Free Trial"** — `PricingSection` (was "Start Protecting Today — Free for 7 Days") and `StickyMobileCTA` (was "Get Started"); Hero keeps bundle-specific "Get All 4 Apps — $9.99/mo"
  - SafeReads `freeBooks.ts` — Gutenberg's auto-generated placeholder covers (colored abstract patterns matching `pgNNN.cover.(medium|small).(jpg|png)`) now return `undefined` so the waterfall falls through to Open Library → Google Books → `StylizedCover` (which was already well-designed)
  - Full report: `docs/UX-EVAL-2026-04-19.md` (23 P0/P1, 10 quick wins). Three audit findings (SafeStudy "SafeSeek" rename, duplicate "Read This Book" CTA, bottom-nav overlap in `/read`) were already fixed in the code — audit screenshots were stale (Apr 3, pre-fix).
- [x] **Family code unification - full pipeline** (Apr 19):
  - Legacy migration: synced 28 users (72 field updates) across all 4 apps — all users now have a single unified code
  - **Marketing Central is now the source of truth**: `users.familyCode` added to schema, backfilled for 35 users, exposed via `/getCentralUser` and `/syncFamilyCode`
  - **Webhook bug fixed**: `getCentralUser` was pointing at SafeReads (404s → legacy fallback); now correctly hits `adamant-crow-705` — unifies auth for any legacy-flow users too
  - **Webhook + signup** now pass `familyCode` from Marketing Central to each `/provisionUser` call, and cache the learned code back if Marketing didn't have one yet
  - **All 4 apps' `provisionUserInternal`** now honor `args.familyCode` on existing-user updates (previously ignored), so future upgrades/repairs keep codes aligned

### TODO
- [ ] **Calendar reminder: rotate Apple Music developer JWT by 2026-10-15** — Apple caps token lifetime at 180 days. Current token (rotated 2026-05-21) expires **2026-11-17**. Generator: `cd apps/safetunes && node generate-musickit-token.cjs` (uses `AuthKey_T2M5WA6Z67.p8`). Then `vercel env rm/add VITE_MUSICKIT_DEVELOPER_TOKEN production` + `vercel --prod` rebuild. Set a reminder ~4 weeks early — last rotation came 6 days late and broke kid-side music silently for all paying users.
- [ ] LRCLib migration (replace MusixMatch — saves $59/mo, plan in docs/LRCLIB-MIGRATION.md)
- [ ] Marketing: Publish Substack article
- [ ] Marketing: Apply to Southeast Homeschool Expo (Atlanta, Jul 24-25)
- [ ] Marketing: blog posts (target: 2/week — 6 scheduled through May 1)
- [ ] Marketing: FPEA convention promo code + booth materials
- [ ] Register for FPEA Convention (May 21-23, 2026, $525-685)
- [ ] Outscraper pipeline: build Phase 1 (schema + HTTP endpoint in Marketing Central)
- [ ] Set up Instantly account + outreach.getsafefamily.com subdomain for cold email
- [ ] Marketing strategy execution — full plan in `docs/MARKETING-STRATEGY-2026-05.md` (May 6, 2026):
  - **First dollar:** affiliate seeding to 10 Christian/homeschool mom creators (30% recurring), NOT Meta cold traffic
  - **Meta launch (week 2):** ABO @ $40/day, 3 ad sets, optimize Lead (not Subscribe — not enough paid events yet); CAC ceiling ~$24
  - **Cold-traffic LPs:** each app already has its own LP at its own domain (getsafetube.com etc.) — don't duplicate on getsafefamily.com. Optimize the existing pages: Meta Pixel + Conversions API, social proof above fold, headline split test ("Take YouTube back from the algorithm" vs "Start your 7-day free trial — no credit card")
  - **Bundle upsell:** add to each app's signup thank-you page ("Add the other 3 apps for $5 more") + day-3 / day-6 emails — captures bundle attach rate without confusing cold traffic with 4-app pricing upfront
  - **Lead creative:** "Search History Reveal" using Bella Trotter's 212 searches / 57 aesthetic-browsing flagged by SafeStudy intent classifier (uniquely ours; competitors can't tell this story)
  - **Christian targeting** is custom-audience + 1% lookalike (Meta killed religion targeting); save faith-coded copy for warm/affiliate
  - **Compliance landmines:** no "your 9-year-old" copy, no other people's kid faces, add backup ad-account admin (family-safety ads get falsely flagged constantly)

---

## Contact
- Owner: Jeremiah Daws (jedaws@gmail.com)
- Support: jeremiah@getsafefamily.com

---

*Last updated: May 27, 2026 (**Unified pricing rollout built behind feature flag — $14.99/mo or $149/yr, all 5 apps including SafeSpark.** Pricing pivot decided this evening after a portfolio scan revealed 2 paying subs across 35 users and 7 distinct paths to pay (single $4.99, two-app $7.99, bundle $9.99, yearly $99, plus proposed Family+Spark $16.99 and standalone SafeSpark $7.99). Concluded the pricing surface is wildly more complex than demand justifies, and the SafeFamily brand promise ("comprehensive kid safety") gets diluted every time someone buys one app instead of the whole thing. Collapsed to **$14.99/mo or $149/yr for all 5 apps**, grandfathering all existing paying subscribers forever (which at present is **2 customers, both on the $4.99 single-app tier** — there are zero $9.99 bundle subscribers in the actual data; earlier session language saying "grandfather the $9.99 bundle" was inaccurate, the grandfather group is the 2 single-app subs). Lifetime tier proposed and rejected because SafeSpark's per-turn OpenAI cost makes lifetime economically broken. Stripe Products + Prices created by Jeremiah: monthly `price_1Tbm6RKgkIT46sg75fZzF2gj` (prod `prod_Uay2qoEvGAOfWL`), yearly `price_1Tbm8OKgkIT46sg7YgWgQPDC` (prod `prod_Uay4yy3aKjbkxi`). Code shipped behind `ENABLE_UNIFIED_PRICING` flag (mirrors the `ENABLE_UNIFIED_AUTH` pattern already in use): (1) `sites/marketing/src/lib/feature-flags.ts` — `isUnifiedPricingEnabled()` (server) + `isUnifiedPricingEnabledClient()` (client, reads `NEXT_PUBLIC_ENABLE_UNIFIED_PRICING`). (2) `sites/marketing/src/components/landing/UnifiedPricingSection.tsx` (new) — single pricing card, monthly/yearly toggle, all 5 apps as a grid, "less than Apple One Family" anchor, grandfather link for existing subs. (3) `PricingSection.tsx` — wrapped existing component as `LegacyPricingSection`, conditional render based on flag. (4) `sites/marketing/src/app/api/checkout/route.ts` — new `PRICE_IDS.UNIFIED_MONTHLY` and `PRICE_IDS.UNIFIED_YEARLY` (env-overridable, hardcoded fallbacks point at the prod IDs), new code path triggered by `plan: "unified"` in request body that forces `finalApps = [...VALID_APPS, "safespark"]`, adds `plan: "unified"` to Stripe session + subscription metadata. (5) `sites/marketing/src/app/signup/page.tsx` — reads `?plan=unified&interval=monthly|yearly`, swaps the AppSelector for a new `UnifiedPlanSummary` component (apps fixed at all 5, interval toggle, locked pricing), passes `plan: "unified"` to checkout. (6) Webhook + SafeSpark provisioning ALREADY worked from Phase 3 earlier today — `parseAppsFromMetadata` validates against `ALL_APPS_WITH_SPARK`, `APP_ENDPOINTS["safespark"] = giddy-peacock-124`, `adminKeyFor("safespark")` handles the distinct SafeSpark admin key with fallback. Build passes. **SafeSpark /parent infinite render loop FIX (production breakage caught + closed).** Jeremiah reported /parent "freaking out, loading and flickering and going crazy." Root cause: the `useEffect` on lines 40-44 of `src/app/parent/page.tsx` (added in this morning's `3f30fa63` dual-auth refactor) called `upsertMe({ displayName })` whenever `me === null`. But `displayName` was in the deps array and gets recomputed every render — Clerk's `useUser` returns new object refs on re-render, marketing context updates, etc. — so displayName ref changes → effect re-fires → upsertMe runs → re-render → fires again → infinite loop. Fixed in commit `d6de07d3`, deployed `dpl_7KSpsXS5qPq352enzkP8DPpkN5xm` (`bella-hnvn6gefm`, Ready). The effect was also dead code: every user reaching /parent has already been provisioned (3 Clerk originals + 23 backfilled lifetimes + any new signup via /provisionUser), so the auto-upsert never had real work to do. If a user ever does need creation, that belongs in the signin/provisioning flow, not as a side effect of viewing the dashboard. Verified live: /parent returns HTTP 200 and the served bundle has zero `upsertFromClerk` references (the removed code is genuinely out of the deployed bundle). Earlier today: **SafeSpark /make = kid app, /parent = clear admin (separation matches the rest of the suite).** Jeremiah caught the architecture problem: /make was acting as both kid AND parent app simultaneously, and /parent's header had "Open SafeSpark →" as its most prominent button — sending parents straight INTO the kid app, opposite of every other Safe Family app (SafeTunes/SafeTube/SafeReads keep parent admin and kid app cleanly separated). Fixed in commit `0c0d60b5`, deployed `dpl_2zCCuYrX9XVs176vsr9gD4Qcp4x6` (`bella-3h2at8aap`, Ready). Three changes: (1) /make ALWAYS shows the kid gate when no kid session exists — dropped the `parentAsSelf` flag and the "I'm a parent, just use it as me" link entirely. Clerk-signed-in parent landing on /make sees the family-code + profile-picker flow exactly like a kid would. (2) /make gate gets a violet banner at top when isSignedIn=true: "Looking for the parent admin? Go to /parent →". Plus the /make workbench header now has a new "Admin" button (visible only to Clerk parents) linking to /parent, and the "Switch kid" button shows whenever a kid session exists (was previously hidden for Clerk parents). (3) /parent header DROPS the "Open SafeSpark →" violet button — it was the loudest thing on the page and sent parents to the wrong place. Family-code section copy updated to read like an instruction parents give their kids: "Share this with your kids to let them in / On your kid's device, open getsafespark.com and enter [CODE]." Small "Open the maker as a parent →" link kept for parents who want to test. Verified live (chunk `124rmw_cm3eid.js` has both "Looking for the parent admin" banner copy and "Parent admin" tooltip). Earlier today: **SafeSpark /make: Clerk-signed-in parent now gets the gate (Jeremiah follow-up) + OpenAI spend diagnosis.** Jeremiah caught a second-order bug from the unified-route refactor: when a parent logs in via Clerk and hits /make, `hasIdentity` is true via `isSignedIn`, the early-return skips the gate, and the workbench loads empty (parent's projects are owned by `kid:<id>` under their self-profile, not by their Clerk subject). No path to enter the family code from where they land. Fix shipped commit `b1d9af15` + deployed (`bella-9d6dzdtcy`, Ready): split `hasIdentity` from a new `shouldShowGate` flag — gate shows whenever there's no kid session AND the parent hasn't explicitly chosen "use as me." Clerk-signed-in parent landing on /make now sees the gate by default with a "I'm a parent — just use it as me" link that sets a `safespark_parent_as_self` flag in localStorage and falls through to the workbench. Flag persists until they sign out. Header gets a new "Use kid profile" button visible only when the parent is in "use as me" mode — clears the flag, returns them to the gate. Lets them flip back any time without signing out of Clerk. **Separately, OpenAI bill diagnosis** — Jeremiah's screenshot of platform.openai.com/usage shows $84.61 spent May 13-28 (16 days), $98.60 of $100 May limit consumed, 2,667,190 tokens / 1,002 requests, **100% gpt-4o-mini** (split between 2024-07-18 and 2024-08-06 snapshots). NOT a sudden spike — daily bars show consistent ~$5-8/day average across the full window, peak May 18-20. NOT Codex (which uses reasoning models, not gpt-4o-mini). Fingerprint matches: SafeStudy intent classifier (runs on every kid search), SafeStudy AI tutor + search summaries, SafeTube channel review (switched to gpt-4o-mini yesterday with strict JSON schema), SafeSpark daily cards/enrichment. Personal org has many projects beyond SafeFamily (ANNA_Assistant, BUDGET, Mooes Project, etc. visible in the project dropdown). Pending: per-project filter on the OpenAI dashboard to definitively identify the share between apps. Earlier today: **SafeSpark /make hydration mismatch fix + gate copy rewrite (Jace follow-up).** Jace's kids reported two symptoms when they tried the recovery flow: "the page is flickering a lot" and "it tells us to create account or login." Diagnosed two distinct issues. **(1) Flicker = hydration mismatch.** DemoWorkbench had `useState(() => localStorage.getItem('lumiKidSession'))` running render-time — returns null on server (no localStorage), returns the token on client. With my earlier unified-route refactor (commit `4601acd8`), the early-return for `!hasIdentity` then chose between rendering the gate vs the workbench, so the server-rendered HTML and the client-rendered HTML pick different subtrees → React swap → visible flicker on every load. Fixed by deferring all localStorage reads to a post-mount useEffect + rendering a small "SafeSpark" placeholder until `mounted` is true. SSR and first paint are now identical, no mismatch. **(2) "Create account or login" misread.** The original gate copy said "Welcome to SafeSpark / Type your family code to get in / No code? Ask the person who set up your family — they got one when they made their account." To a kid that reads as "do I need to make an account?" Especially the trailing "when they made their account" line. Rewrote to "Welcome back! / Type your family code to see your projects / [Continue →] / Ask your parent for the family code if you don't remember it." Frames it as continuation, not signup. Shipped commit (pending) + deployed (`dpl_C6D2dsKfitfZv2HUcq5E2L5qCDpc`, `bella-or87zdsgn`, Ready). Verified live: served bundle contains "Welcome back" (1 hit) and the stale "Type your family code to get in" is gone (0 hits). Earlier today: **SafeSpark unified kid route LIVE — /make matches SafeTunes/SafeReads pattern.** Jeremiah caught real architecture debt: SafeSpark inherited two routes from BELLA (/start = family code entry, /make = workbench) where the rest of the suite has ONE route per kid that handles both states (SafeTunes /play, SafeReads /read). The amber recovery banner shipped earlier today (commit `d8f87404`) was a band-aid on this. Real fix shipped in commit `4601acd8` + deployed (`dpl_AapZ144P9FgDReFGF77ciR2yQi6F`, `bella-2lhc07y5h`, Ready): (1) Extracted /start's family-code → profile-picker → PIN flow into reusable `<KidLoginGate />` at `src/components/kid/KidLoginGate.tsx`. Takes optional `onSession` callback so callers can either embed it (inline state update, /make case) or use standalone (router.push to /make, legacy /start case). (2) /start route became a thin wrapper rendering the gate — old bookmarks + the marketing CTAs keep working. (3) DemoWorkbench (/make's body) removed the amber banner, replaced with an early-return that renders `<KidLoginGate onSession={...} />` when `!hasIdentity`. Made `kidSessionToken` reactive (added setter) so the onSession callback updates state without page reload. Verified live: served chunk contains the gate copy `"Type your family code"` (1 hit) and the stale banner copy is GONE (0 hits). Net UX for a kid with no session: gate appears inline on /make → enter code → workbench appears below, single URL throughout the whole flow. Earlier today: **SafeSpark "where are my projects?" recovery banner LIVE on /make.** Triggered by Jace's report 2026-05-28 that his kids "lost all their projects." Investigation across prod (`giddy-peacock-124`) confirmed: Knox has 15 active projects, 75 versions, NONE deleted. Myles has 0 (separate dormant-kid bead). The user-visible symptom is real though — when a kid's `lumiKidSession` localStorage token clears (browser cleanup, different device, incognito), /make silently falls into guest mode and `listMyProjects` returns nothing because the request has no kid identity. Kid sees "Nothing here yet" and assumes everything is gone. Knox's project list shows the same titles built TWICE ~9hrs apart (04:02 UTC + 13:10 UTC) — he literally rebuilt the same projects from scratch because the first session was already lost by the time he came back. Fix (commit `d8f87404`): amber banner at top of /make whenever `!hasIdentity` (no Clerk session AND no lumiKidSession), copy: "Looking for your projects? Pick your profile to see everything you've built before. Your projects are saved — they just need to know it's you." Button routes to /start. Deployed to Vercel (`dpl_Ca48iAnooKJnVTdecq8xqoyVDvhe`, `bella-8k5259o9b`, Status Ready). Verified live: chunk `12swl69lr5wzl.js` on getsafespark.com contains the banner copy. **Same investigation re-exposed the .env.local dev-vs-prod gotcha — this time in apps/safespark/.env.local pointing at `dev:aware-kingfisher-36` and silently overriding my `CONVEX_DEPLOYMENT=prod:giddy-peacock-124` env prefix.** Wasted ~10 min on a phantom data-difference panic before catching it. Same pattern as marketing's .env.local. Added roadmap item `ops-env-local-prod-override` (P1) to actually fix this across the repo so it stops biting. Also added `safespark-kid-session-restore` (P0) so the underlying issue (zero kidSession persistence beyond localStorage) is tracked properly. Earlier today: **Password reset email flow VERIFIED WORKING (false alarm closed) + reminder about CLI dev-vs-prod gotcha.** Chasing the "password reset emails not sending" bead (safecontent-ntm.2), I confirmed via Resend's `/v1/emails` API that BOTH reset codes I sent to Michelle today were `delivered` to metrotter@gmail.com (codes 722181 at 20:43 UTC and 193284 at 00:23 UTC). The email pipeline works. Michelle has a fresh code in her inbox right now (the 193284 one) — combined with the /parent/setup fix from earlier, she can complete login + reach her dashboard end-to-end. Bead may apply to a DIFFERENT email flow (per-app trial-expired, older Convex Auth reset, etc.) — needs clarification before claiming fixed. Roadmap entry updated to status `blocked` with note. **Also re-learned the marketing CLI dev-vs-prod gotcha:** chasing the bead I thought I'd found a duplicate Michelle account because `npx convex run accounts:getAccountByEmail` returned a different record than the `/getAccount` HTTP endpoint. Wasted ~15 min on a phantom "merge accounts" plan before remembering `sites/marketing/.env.local` sets `CONVEX_DEPLOYMENT=dev:reliable-jaguar-191`, which OVERRIDES the shell `CONVEX_DEPLOYMENT=prod:...` env var. All `npx convex run` calls in marketing hit DEV, not prod. The "duplicate" was just dev's database having a separate copy of Michelle. Same gotcha as SafeTube earlier this session, just in a different repo. **Reinforced workflow note**: to query prod from this codebase, hit the deployment URL directly via curl/HTTP, not via `npx convex run`. Earlier today: **SafeSpark `/parent/setup` and `/parent/profile/[id]` dual-auth fix.** Michelle reported `/parent/setup` stalls on Loading… Root cause was in convex/users.ts `getCurrent` — it only resolved by `clerkUserId === identity.subject` with no email fallback. Federated users (Marketing Central JWT) hit the query, got `null` back, page showed "Parent setup is for parents" forever (or stalled at loading depending on how the page handled `me === null` vs `undefined`). Same gap in `convex/kidProfiles.ts getForCurrentKid`. Both rewritten to the same email-fallback pattern getActor() uses (try clerkUserId first → fall back to email if no match). Deployed Convex to `giddy-peacock-124`. Frontend `/parent/profile/[id]` page also still gated on Clerk's useUser() only — refactored to the dual-auth pattern (`clerkSignedIn || marketing.isAuthenticated`) mirroring the /parent page fix from earlier today. Unauth fallback now links to /login (federated) instead of Clerk's /sign-in. Frontend deployed via Vercel (deployment `dpl_E8AWQMWf4g3qbgdHmjuVCtYu741m`, `bella-9ukw0g2un`, status Ready); verified live by curl-fetching `/parent/setup` (HTTP 200) and confirming chunk `0pw74_elurg9m.js` contains the `safespark_jwt` storage key (proof the federated AuthContext is in the bundle). Earlier today: **Sign-in link added to main getsafefamily.com Header + /account crash fix shipped.** Surfaced when Jeremiah said "there's no login button on the main safefamily page" — existing customers had no way to reach /account from the public site. Commit `3391f0a8` adds "Sign in" link next to Start Free Trial on desktop (hidden sm-, visible sm+) routing to `/login`, plus "Sign in to your account" row in the mobile menu below Blog (separated by a divider). Same deploy revealed a `/account` JavaScript crash for any federated user with the new safespark entitlement: `TypeError: Cannot read properties of undefined (reading 'gradient')`. Root cause: `src/app/account/page.tsx` typed AppId as the original 4 apps, so `APP_INFO["safespark"]` returned undefined when the page mapped over entitledApps. Commit `a2e90fa3` widens AppId, adds full safespark entry to APP_INFO (Sparkles icon, getsafespark.com domain, amber-violet gradient), and adds a defensive `if (!info) return null` guard in the .map() so any future unknown app id can't take down the whole /account render. Both shipped to prod, verified the Sign in chunk (`5633a7b9451a0d87.js`) is in the served bundle. **IMPORTANT diagnosis discovered tonight: marketing site has TWO separate auth systems.** /login = Marketing Central (Convex Auth, used by all customers including the 23 backfilled lifetimes). /admin-login = NextAuth Google OAuth, gated on `jedaws@gmail.com` only. They share no session — admin can't be unlocked by federated Marketing login. Jeremiah hit this trying to reach /admin/roadmap after a customer-side login. Separate issue: Google OAuth itself fails because the redirect URI `https://getsafefamily.com/api/admin-auth/callback/google` is almost certainly not in the Authorized redirect URIs for OAuth client `60981898692-rf7qqn60061niahq5ksj4ckiecqe3be7` in Google Cloud Console. Fix is Jeremiah-only (2 min in console). Long-term fix: consolidate to one auth surface — either expand admin layout to ALSO accept jedaws@gmail.com via Marketing Central, or pick one. Earlier this evening: **Consolidated portfolio roadmap shipped at `/admin/roadmap`.** Jeremiah called a pause on dev work to get a unified picture of everything open across the 5 apps + marketing — said the scattered sources (CODEX.md, beads, NEXT_PASS.md, CLAUDE.md footer, in-session TODOs) were making it impossible to track. Built it as: (a) single typed-data source of truth at `sites/marketing/src/data/roadmap.ts` (~600 lines, every open item I could pull from the audit + beads + scattered TODOs, ~45 items grouped P0/P1/P2/P3 plus a "recently done" block); (b) visual filterable admin page at `sites/marketing/src/app/admin/roadmap/page.tsx` with filters for app/priority/status, expandable rows showing description + files + beads id + notes; (c) added to AdminNav so it's discoverable. Deployed `dpl_oryhinasl` (status `Ready`), verified `/admin/roadmap` returns HTTP 200. Source file is the canonical place — both Claude Code and Codex have read/write access; editing the array updates the rendered page on next deploy. Gated by existing admin layout (only jedaws@gmail.com sees it). Counts at deploy time: 8 P0 open, 21 P1 (most in-progress or open), 10 P2, 5 P3, 6 recently done (May 27 session output). Earlier today: **SafeSpark /parent dual-auth bounce-loop fix LIVE.** Jeremiah's wife Michelle tried to log in via Marketing Central and the screenshot showed Clerk's `/sign-in` page (with dev-mode badge, hitting wrong user). Trace: federated `/login` succeeded → `router.replace("/parent")` → Clerk middleware in `src/proxy.ts` saw `/parent` was NOT in `isPublicRoute()` → 307 redirect to `/sign-in`. Two coordinated fixes: (1) `src/proxy.ts` — added `/parent` and `/parent/(.*)` to the public-route matcher so Clerk middleware no longer intercepts the page. The page does its own auth check now, so this is safe. (2) `src/app/parent/page.tsx` — added a `useAuth()` import from `@/contexts/AuthContext` (the federated context) alongside the existing Clerk `useUser()`. New combined check: `isSignedIn = clerkSignedIn || federatedAuthenticated`. Display email/name reads from whichever auth is active. `upsertFromClerk` only fires for Clerk users (federated users already have rows from the May 27 backfill / live signup webhook). Replaced Clerk's `<UserButton />` with a conditional: Clerk users still see `<UserButton />`, federated users see a custom "Sign out" button that calls `marketing.logout()` and bounces to `/login`. The "please sign in" fallback for unauth users now links to `/login` (federated) instead of trying to deep-link Clerk. Verified live: `curl -I https://getsafespark.com/parent` returns HTTP 200 (was 307 → /sign-in before this deploy). Michelle can now log in via /login and actually reach her dashboard. Also triggered a password reset email for metrotter@gmail.com via Marketing Central's `/requestPasswordReset` so she has a way in. Earlier today: **SafeSpark dual-auth migration LIVE end-to-end** (Clerk + Marketing Central JWT). Phase A (frontend foundation, commit `43df82b9`) shipped first; Phase B (backend bridge, commit `01215ea9`) shipped right after. Backend deployed to `giddy-peacock-124`, frontend deployed to Vercel (deployment `dpl_AY8eRswmecBWWHBrQCZSX4UBYk9E`), `/login` route verified serving on getsafespark.com (HTTP 200, contains "Use your Safe Family" + "Forgot password" + "legacy sign-in" fallback link). Architecture: (a) `convex/auth.config.ts` now has TWO providers — Clerk (legacy) + `https://adamant-crow-705.convex.site` (Marketing). Convex verifies whichever JWT arrives via the issuer's `/.well-known/jwks.json`. (b) `convex/actors.ts` `getActor()` resolves identity in two passes — first by `clerkUserId === identity.subject` (Clerk fast-path), then falls back to `email === identity.email` for Marketing JWTs whose subject is a marketing-side user._id that won't match any SafeSpark `clerkUserId`. (c) `src/contexts/AuthContext.tsx` exposes the raw `token` so the Convex bridge can read it. (d) `src/components/ConvexClientProvider.tsx` swapped `ConvexProviderWithClerk` for `ConvexProviderWithAuth` using a custom `useAuthCombined()` hook that returns Clerk's JWT when signed in there (preserves legacy fast-path) and falls back to the Marketing JWT for federated sessions. Existing Clerk users (jedaws + soonerjace + Jace's actively-engaged kids) are entirely unaffected — they still authenticate via `/sign-in`, their Clerk JWT still hits the Clerk provider, `ctx.auth.getUserIdentity()` still returns `user_xxx` subject, getActor still matches them via clerkUserId. **The 23 backfilled lifetime users can now log in.** They visit getsafespark.com/login, sign in with Marketing Central credentials (Michelle/Jenny/Ben Purves/Jolene/etc. need to use Forgot Password to set a password first — they have entitlement but no password set), get a JWT, the Convex bridge sends it on every query, getActor resolves their SafeSpark user row by email, /parent renders normally. Network outage delayed this commit by ~10 min mid-shipping (api.convex.dev + api.vercel.com + github.com all timed out from this machine briefly); cleared and shipped clean. **Held back for the actual Clerk RETIREMENT** (separate from this dual-auth migration): drop the ClerkProvider wrapper, drop the Clerk branch from `useAuthCombined`, drop Clerk from auth.config.ts, delete `/sign-in` and `/sign-up` routes, remove `@clerk/nextjs` from package.json, remove Clerk env vars from Vercel. Defer until existing Clerk users have naturally migrated (or we email them to move). Earlier today: **SafeSpark federated-auth foundation shipped** (Phase A — frontend only, zero customer impact). Per Jeremiah's "do it right" + the discovery that Jace's kids made 95 requests in the last 24h (most active SafeSpark user, signed up THIS afternoon), the Clerk removal is happening as a parallel migration not a rip-and-replace. Tonight's work is the non-breaking frontend foundation: (1) `apps/safespark/src/contexts/AuthContext.tsx` — federated JWT auth context mirroring the SafeReads pattern. Storage keys namespaced `safespark_jwt` / `safespark_user`. `useAuth()` hook exposes login/logout/passwordReset against `adamant-crow-705.convex.site/{login,verifyToken,requestPasswordReset,resetPassword}`. Login flow gates on `entitledApps.includes("safespark")` and shows an upgrade prompt for non-entitled users. (2) `apps/safespark/src/app/login/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` — new routes for federated path. (3) `apps/safespark/src/proxy.ts` — added `/login`, `/forgot-password`, `/reset-password` to the Clerk public-route matcher so Clerk middleware doesn't intercept them. (4) `apps/safespark/src/components/ConvexClientProvider.tsx` — wraps with both ClerkProvider AND AuthProvider so existing Clerk sessions (jedaws + soonerjace) keep working while federated path is available. Build passes. **NOT YET WIRED**: backend bridge. Convex queries still call `ctx.auth.getUserIdentity()` and only return Clerk subjects. Federated users (Michelle etc) can authenticate via /login but actually reaching `/parent` requires backend refactor — `convex/actors.ts` `getActor()` needs a 3rd path that resolves via Marketing-verified JWT (either by adding marketing as a 2nd auth.config.ts provider, or by passing email arg + verifying server-side). This is the "do it right" backend work for next session — 2-3 focused hours, real production-data risk (every query in safespark.ts uses getActor), should be done fresh-head not after a marathon. Earlier today: **Lifetime users backfilled with SafeSpark entitlement** (23 accounts). After the $14.99 unified pricing pivot, the "Safe Family lineup" promise that comp/lifetime users were granted under now includes 5 apps instead of 4. Per Jeremiah's clarified policy ("no future lifetime stuff gets it, but current users get it"), I (a) added `backfillSafeSparkToLifetimeUsers` mutation to `sites/marketing/convex/migrations.ts` and deployed to `adamant-crow-705`, (b) ran it — all 23 lifetime users now have `safespark` in their `entitledApps`, idempotency verified (re-run shows 23 already-have / 0 to update), (c) ran a Python script (`/tmp/provision_safespark_lifetime.py`) that hit SafeSpark's `/provisionUser` for each — 22 new SafeSpark user rows created + 1 updated (jedaws which existed as a Clerk user). SafeSpark prod (`giddy-peacock-124`) now has 25 users total (3 Clerk-era + Bella synthetic + 23 backfilled lifetimes). All ready to log in once the federated-auth path ships. **Important policy boundary that survived**: `ALL_APPS` in `sites/marketing/convex/accounts.ts` was deliberately kept at the original 4 apps — so future DAWSFRIEND/DEWITT redemptions WILL NOT auto-grant SafeSpark. Only the existing 23 got this one-time backfill; new lifetime grants stay at 4 apps to avoid unbounded variable-cost exposure on the comp-forever tier. Also: marketing convex appears to silently drop `internalMutation` definitions during deploy in some setups — `backfillSafeSparkToLifetimeUsers` had to be declared as public `mutation` to actually become callable (function-spec listed it only after the swap from `internalMutation`). Worth knowing for future migrations in this codebase. **Landing page scaled back per Jeremiah's pivot** — after a Chrome-extension Claude audit flagged the page as still showing stale "$9.99 / 4 apps" copy in DemoSection's "Ready to take control?" CTA and the SafeSpark age was inconsistent (AppCards said 10-13, SafeSparkSpotlight said 9-15), Jeremiah decided to also rip out the heavy per-app sections and push depth to each app's own LP. Result: DemoSection's "Ready to take control?" block updated to 5 apps + $14.99 + "Start Free Trial" CTA. SafeSpark age unified to 9-15 everywhere. UnifiedPricingSection grandfather link rewritten — "Already on a $9.99 bundle?" replaced with "Existing subscriber? Your current price is locked in forever. [Manage your subscription]." AppCards rewritten from preview-heavy 5-app showcase to a compact 3-col grid: one-line "BIG thing each app does" + icon + Learn more arrow. Removed SafeSparkSpotlight (just built it but it goes against the broad-strokes direction — file kept in repo for potential reuse, just not imported). Removed DemoSection import entirely. New landing flow: Hero → ProblemSolution → AppCards (compact) → Testimonials → FAQ → PricingSection. Deferred Clerk removal (Task #10) to tomorrow as a fresh-session task — 4-6 hours of focused work touching 10 frontend files + 4 Convex backend files + customer-facing migration of 2 existing Clerk users (jedaws + soonerjace). New TODO captured: kid login pages need easy cross-app nav so a kid on SafeTunes /play can switch to SafeTube /play without re-typing the family code (unified `users.familyCode` already makes this technically simple). **Landing page updates also shipped tonight** (deployment `dpl_D2tJ591MKMLm2qvc21uiqDGFfdYz`): Hero rotating words now include "asking AI"; new "AI for Kids" platform badge in the Hero; Hero subheadline updated to mention all 5 content types including AI; Hero CTA "Get All 4 Apps — $9.99/mo" → "Get All 5 Apps — $14.99/mo" with "Less than Apple One Family" anchor; AppCards bundle callout "$9.99/month" → "$14.99/month"; AppShowcase 3× "Included in $9.99 bundle" badges → "Included in Safe Family — $14.99/mo" (note: AppShowcase + BundleBanner are dead code — not imported anywhere — but updated for consistency); StickyMobileCTA mobile bottom bar "$9.99/mo / All 4 apps" → "$14.99/mo / All 5 apps"; BundleBanner rewritten for 5 content types (Music/Video/Books/Search/AI) and $14.99 pricing. **NEW: `SafeSparkSpotlight` component** at `src/components/landing/SafeSparkSpotlight.tsx` — dedicated section between AppCards and DemoSection. Has founder story angle ("built the first version for my own daughter"), kid-built project mockup (Knox's Pokémon battle game image from `~/Projects/safecontent/apps/safespark/public/landing/build-pokemon.png` copied to `sites/marketing/public/safespark/`), and the four-habits explainer (Ask / Check / Build / Own — mirrors the bella README's ask-guide-check-improve-own loop). Wired into `src/app/page.tsx` after AppCards. Marketing site `npm run build` passes. **ACTIVATED MAY 27, 2026.** Three env vars set on Vercel marketing prod: `SAFESPARK_ADMIN_KEY` (required so the webhook can hit `giddy-peacock-124/provisionUser` — SafeSpark's admin key differs from the shared ADMIN_API_KEY), `ENABLE_UNIFIED_PRICING=true` (server-side), `NEXT_PUBLIC_ENABLE_UNIFIED_PRICING=true` (client-side). Manual `vercel --prod` ran, deployment Ready. Verified live: `getsafefamily.com/#pricing` now renders `UnifiedPricingSection` (single card, $14.99/$149, "All five Safe Family apps", monthly/yearly toggle); `14.99` appears 6× in rendered HTML; legacy 3-card pricing dead but code still present (will be removed in a future cleanup pass). Existing paying subscribers (the 2 single-app $4.99 customers) are grandfathered automatically — Stripe never auto-migrates a customer between Price IDs, and the webhook only mirrors what Stripe sends. Their existing single-app subscriptions stay live on the legacy `price_1SUXOjKgkIT46sg7RKwIgAVv` (SafeTunes) / `price_1Spp7oKgkIT46sg7oJIKGfMG` (SafeTube) Prices at $4.99/mo forever. Their session metadata doesn't include safespark, so SafeSpark is never auto-provisioned for them. The only path for an existing customer to move to the unified plan is to actively upgrade via the Stripe portal. Earlier today: **SafeSpark federated-auth migration Phase 2 + 3 shipped — Marketing Central now wired to provision SafeSpark.** Following the merge + Phase 1 work earlier today: (Phase 2 — migrate existing Clerk users) deployed `convex/migrations.ts` to `giddy-peacock-124` and ran `backfillLegacyClerkUserId`. Dry-run reported 2 real Clerk users to backfill (`jedaws@gmail.com`, `soonerjace@gmail.com`) and 1 synthetic skipped; real run completed cleanly; idempotency verified (re-run shows 0 changes). Both users now have `legacyClerkUserId === clerkUserId` as a one-release fallback during the eventual cutover. (Phase 3 — Marketing Central → SafeSpark wiring) added `safespark` to: `sites/marketing/convex/schema.ts` (5 union validators + 2 object fields, all additive — existing rows unaffected); `sites/marketing/convex/accounts.ts` (new `ALL_APPS_WITH_SPARK` constant kept distinct from `ALL_APPS` so DAWSFRIEND/grandfather spreads don't accidentally grant SafeSpark, plus `appValidator` updated to accept safespark); `sites/marketing/src/lib/provisioning.ts` (`AppName` type, `APP_ENDPOINTS[safespark] = giddy-peacock-124`, new `adminKeyFor(app)` helper that prefers `SAFESPARK_ADMIN_KEY` when set and falls back to `ADMIN_API_KEY` — the AGENTS.md note that the keys "should match" is aspirational right now; they're different in prod, this hides that without forcing a rotation); `sites/marketing/src/app/api/stripe/webhook/route.ts` (same AppName/endpoints/admin-key treatment, `parseAppsFromMetadata` now validates against `ALL_APPS_WITH_SPARK` so Stripe sessions that explicitly list `apps: "safespark"` in metadata get provisioned, but the legacy-bundle no-metadata default still returns only the original 4 apps so no implicit SafeSpark grant is possible). Schema deployed to `adamant-crow-705` cleanly. Marketing site `npm run build` passes. **What's NOT done yet:** AppSelector UI doesn't show SafeSpark as a checkable option (the "add-on vs separate tier vs bundle restructure" decision is a real design call worth surfacing rather than guessing); PricingSection still says "4 apps for $9.99"; no Stripe Price IDs created yet for the $16.99 "Family + Spark" tier (Jeremiah's dashboard work). Charging *infrastructure* is in place — adding the Price IDs to Vercel env + a small AppSelector UI update is the only thing between today and charging. Frontend Clerk removal on hold pending explicit confirmation (customer-facing, breaks 2 active Clerk users). Earlier today: **SafeSpark merged into the monorepo + first phase of Clerk → federated-auth migration shipped.** Jeremiah merged the standalone bella repo to `apps/safespark/` with the trainer code stripped (per the plan in `apps/safespark/NEXT_PASS.md`), then handed off the federated-auth migration. Phase 1 (additive only, no destruction, no Clerk removal yet) deployed to prod `giddy-peacock-124`: (a) fresh prod snapshot saved to `apps/safespark/backups/prod-20260527-172530.json` — counts {users:3, families:2, kidProfiles:4, kidSessions:4, projects:23, versions:88, shares:11, requests:116, usage:5, errors:3}. Both data-hygiene issues from MIGRATION_SAFETY.md are now CLEAN (orphan family parentUserId resolved; all 23 projects are kid-owned via `kid:<id>` synthetic IDs so no "22 unowned Jace projects" problem remains). (b) Schema additions: added `legacyClerkUserId`, `stripeCustomerId`, `subscriptionId`, `name` columns + `by_legacy_clerk_id` index + `'inactive'` to subscriptionStatus enum on `users` table. Kept `clerkUserId` REQUIRED (initial attempt to make it optional broke 4 call sites in `actors.ts` / `safespark.ts` that assume it's defined — reverted that overreach). (c) New `provisionUserInternal` mutation + `/provisionUser` POST endpoint mirroring SafeReads' contract. Marketing-Central-provisioned rows get a synthetic `clerkUserId = "marketing:<email>"` to satisfy the required field; when the same user later signs in via Clerk, `upsertFromClerk` will continue to look up by `user_xxx` subject and create/find their row. Smoke test (4 calls): unauthorized → 401, missing email → 400, first call → `provisioned: true`, second call → idempotent `updated: true` same userId. Test user cleaned up via `/deleteUser`. **Held back for explicit go before next phase:** (1) Marketing Central code to call SafeSpark's `/provisionUser` (requires Stripe Price IDs for the "Family + Spark" tier — Jeremiah's dashboard work, ~10 min); (2) migrating the 3 existing Clerk users to email-keyed identity via a one-shot script that populates `legacyClerkUserId`; (3) frontend Clerk removal (17 src files touch `@clerk`); (4) `ALL_APPS` additions across the marketing site + AppSelector + PricingSection. Pricing locked at $16.99/mo "Family + Spark" tier per Jeremiah. ALL_APPS-in-marketing intentionally not modified yet because doing so would auto-provision SafeSpark accounts for every subscriber tier — needs the tier-gating logic first (Option A from the merge plan). Earlier today: **SafeReads back online after 50-day deploy outage.** While verifying the SafeReads mobile-login fix from earlier today (`aef6bdca` / `4a088b25`), `vercel ls` revealed the last successful SafeReads production deploy was **April 7 (50 days ago)** — every deploy attempt since April 19 had failed with `● Error`. Two compounding causes: (1) `apps/safereads/convex/syncFamilyCode.ts` had a TypeScript "implicit any on self-reference" error that broke `next build` and never got committed/fixed (the SafeTunes version of the same file passes its Vite build, so it slipped through). (2) Vercel auto-deploy on git push appears to be silently NOT firing for the SafeReads project — three commits pushed this session (`aef6bdca`, `4a088b25`, `e2dba7a8`, `d515f12e`) triggered zero builds. Fix today: committed the TS fix (`e2dba7a8` — hoists handler to named const with `Promise<Response>` return type), ran `vercel --prod` manually. New deployment `dpl_8MLkQnJFFyzSDYwEbEkdAcAopB5g` is `● Ready` and live; chunk scan confirms both `Log in` (mobile login button) and `getsafespark` / `SafeSpark` (cross-links) are in the served JS. **Action item — investigate why auto-deploy isn't firing for SafeReads** (project git integration may have detached after the run of failed builds; check Vercel project settings → Git → Connected Repository). All four other commits from earlier sessions that affected `apps/safereads/src/**` were silently undeployed for 38–50 days; today's manual push catches everything up. Earlier today: **SafeSpark (codename `bella`) visually merged into the SafeFamily lineup** (commit `d515f12e` across 11 files). 5th app now appears in: Marketing Header + Footer + AppShowcase (new "Also in the family" cards row that also fixed a pre-existing gap where SafeStudy was missing from this component) + Setup page; SafeReads/SafeTube/SafeStudy landing pages got a new "Meet SafeSpark — the AI training lab for kids" NEW callout separated by border from the existing 4-app bundle pitch so the $9.99 bundle economics aren't visually compromised; SafeTunes LandingPageSimple footer cross-link row got SafeSpark with NEW badge. Held back deliberately (require pricing/scope decisions): Marketing PricingSection bundle, AppSelector signup flow, and `ALL_APPS` backend constants in `sites/marketing/convex/{migrations,accounts}.ts` + `src/lib/provisioning.ts` (adding SafeSpark to ALL_APPS would auto-provision a SafeSpark account on every new signup → free variable-cost OpenAI usage portfolio-wide). Latent bug flagged but not fixed: `apps/safereads/convex/accounts.ts` ALL_APPS is missing SafeStudy. FPEA Florida Homeschool Convention (May 21-23) marked **missed** in TODO — event passed without registration. **SafeStudy trial-expiration bug fix deployed to prod `strong-scorpion-227`.** Usage audit across all 5 SafeFamily apps revealed SafeStudy had 5 "trial" users stuck for 21–52 days with no `trialEndsAt` field — the daily `runTrialExpirationCheck` cron silently skipped them via `if (!user.trialEndsAt) continue;` so they would never expire. Root cause in `apps/safeseek/convex/users.ts` `provisionUserInternal`: the Marketing-site signup flow calls `/provisionUser` with `subscriptionStatus: "trial"` but the mutation never set `trialEndsAt` on insert/update. (The direct legacy `createUser` path at line 130–131 sets it correctly — only the Marketing-provisioned path was broken.) Fix: provisioning now sets `trialEndsAt = now + 7d` whenever the resolved status is `"trial"` (new users always, existing users only if not already set so in-flight trials aren't clobbered). Defensive follow-up in `convex/trialExpiration.ts`: the silent-skip path now `console.warn`s with the user id and email, and the cron's summary log + return value include a `missingEndDate` counter so the next instance of this drift surfaces immediately instead of rotting for 52 days. **Backfill of the 5 existing zombies is pending an explicit call from Jeremiah** — sandbox correctly blocked mass-modifying 5 production user statuses without authorization. Discovered while doing a portfolio-wide usage eval: **only 2 actively paying subs across the whole portfolio** per Marketing Central (`active: 2, lifetime: 23, expired: 16, cancelled: 1` of 42 accounts). Lifetime users on each app (~30) are the same comp pool (Jeremiah's family + DAWSFRIEND/DEWITT redemptions). SafeTunes is the only app showing real product use (25/45 parents have kids set up, 10K songs / 777 albums approved). SafeReads is a graveyard (2/37 parents set up kids, 5 total analyses). 0 new signups across every app in the last 7d. Diagnosis is consistent with the May 6 marketing-strategy doc: this is a distribution problem, not a product problem. Trial-model discussion in progress — Jeremiah is leaning toward card-required trial across all 4 apps, no grandfathering needed since no users are actually in an active trial window. Also: **SafeSpark (codename `bella`, repo at `~/Projects/bella`) is the 5th SafeFamily platform member** per `~/Projects/bella/AGENTS.md` — domain `getsafespark.com`, Convex prod `giddy-peacock-124`, admin key env `SAFESPARK_ADMIN_KEY`, same HTTP admin contract as the other 4 (`adminDashboard`, `grantLifetime`, `setSubscriptionStatus`, `syncFamilyCode`, `deleteUser`). Product framing per the bella README is intentionally **not** "SafeFamily content filter" — it's an AI training lab for kids (ask/guide/check/improve/own loop). Borrows SafeFamily platform infrastructure only. 2 users (Jeremiah + Bella), 19 chat turns / $1.42 OpenAI spend MTD, not publicly launched. Pricing decision pending per `~/Projects/bella/PRICING.md`: leaning Option 1 (new "Family + Spark" tier ~$16.99/mo + standalone Spark $7.99/mo) but standalone-vs-bundle ladder is mathematically broken as written and the price should be locked only after pulling real `safesparkUsage.totalCents` distribution from prod. **SafeReads mobile login fix shipped** (commits `aef6bdca`, `4a088b25` on `main`) — landing page nav now shows "Log in" link on mobile (was `hidden sm:inline-flex` so phones only saw "Try Free"); points to `/login` directly instead of `/dashboard`. Vercel auto-deployed. Earlier on May 21: **SafeTunes orphan-detection cleanup + alerter rewrite.** Daily "Data Integrity Alert" email had been undercounting badly — said "20 orphaned records" while the live admin endpoint showed **1,086** (20 kidProfiles + 32 approvedAlbums + 1,034 approvedSongs from ~5 deleted parent accounts in Nov 2025). Root cause: `checkAndAlertOrphans` only scanned 6 of the 8 tables that `findOrphanedRecords` scans — drift between the cron and the admin view. Two fixes in one Convex deploy: (a) added `/cleanupOrphans` HTTP endpoint, ran it, deleted all 1,086 + 85 cascade children (playlists, recentlyPlayed, requests); (b) rewrote `checkAndAlertOrphans` to delegate to `findOrphanedRecords` (single source of truth, no drift) and email only on delta-vs-last-check OR Sunday heartbeat. New `orphanCheckHistory` table persists every check for trend visibility. Stable counts on non-Sunday days are now silent — stops the daily-noise pattern that hid the bug for 11+ days. Earlier today: **SafeTunes prod outage — Apple MusicKit JWT expired May 15, 2026; rotated and redeployed.** Symptom: kid-side music playback broken silently for ~6 days. Surfaced by Jolene Bryan emailing the support inbox May 20 ("kids have been seeing this when trying to listen to music"). Diagnosis: decoded the JWT in `apps/safetunes/.env.production` and saw `exp: 1778908497` = 2026-05-15 — Apple caps developer-token lifetime at 180 days; the previous token was issued Nov 17, 2025 and not rotated. Fix: ran `node generate-musickit-token.cjs` (uses `AuthKey_T2M5WA6Z67.p8` already in repo), updated Vercel `VITE_MUSICKIT_DEVELOPER_TOKEN` for the `apple-music-whitelist` project, ran `vercel --prod` — deployment `dpl_8XK4WpCsX692YL6ZQdanR6PgPAz6` READY. Verified by fetching the live `musickit-*.js` chunk and confirming new `iat: 1779380111` is present, old `iat: 1763356497` is gone. Added a calendar reminder TODO for 2026-10-15 to rotate before next expiry on 2026-11-17. Marketing strategy doc landed May 6 at `docs/MARKETING-STRATEGY-2026-05.md` — full Meta playbook, channel comparison, creative concepts, and 30-day starter plan. Top recommendation: affiliate seeding to ~10 Christian/homeschool mom creators is the highest-ROI first dollar at 35-user scale, not Meta cold traffic. Each app already has its own LP at its own domain — strategy doc's "build /safetube LP" recommendation is moot; what's actually needed is Pixel + Conversions API on the existing app LPs and a bundle upsell on each app's thank-you page. Yesterday: SafeTube AI review enhancements deployed to prod `rightful-rabbit-333`. Code had been merged to main since Apr 3 (commit `a1af74f7`) but the Convex backend deploy was held pending YouTube API compliance review. Per Jeremiah's call today, deployed regardless. First deploy was silently broken — gpt-4o-mini was dropping the new fields (`parentCommunityNotes`, `knownControversies`, `commonSenseMediaRating`) from its JSON response despite the prompt asking for them. Same-day fix: switched OpenAI call to `response_format: { type: "json_schema", strict: true }` with a full schema including the new fields as required. Verified live by hitting `https://rightful-rabbit-333.convex.cloud/api/action` directly — PewDiePie review returned CSM 3/5, 2 controversies, 2 parent community notes. **Important debugging lesson:** `npx convex run` does NOT respect the shell `CONVEX_DEPLOYMENT=prod:...` env var when `.env.local` defines a different (dev) deployment. All "prod test" runs via the CLI were actually hitting dev. To test against prod, hit the deployment URL directly via `curl POST /api/action` with `{path, args, format:"json"}`. Earlier today: SafeTunes `kidRequests:getKidRequests` Convex query fix deployed May 4 to prod `formal-chihuahua-623` — Ben Purves's son hit "Something went wrong" on kid login because the query looped per approved album request and walked the parent's full `approvedSongs` via the non-selective `by_user` index, blowing past Convex's 32k document-read limit.)*
