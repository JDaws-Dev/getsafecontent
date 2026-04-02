# Safe Family - Operations Guide

## Quick Reference

| App | Domain | Convex Prod | Tech |
|-----|--------|-------------|------|
| SafeTunes | getsafetunes.com | `formal-chihuahua-623` | React + Vite |
| SafeTube | getsafetube.com | `rightful-rabbit-333` | React + Vite |
| SafeReads | getsafereads.com | `exuberant-puffin-838` | Next.js |
| SafeStudy | getsafestudy.com (TBD) | `strong-scorpion-227` | React + Vite + OpenAI |
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
```bash
# 1. View current orphans (dry run)
cd ~/safecontent/apps/safetunes
npx convex run orphanDetection:findOrphanedRecords

# 2. Delete all orphans (cascades to child records)
npx convex run orphanDetection:deleteOrphanedRecords
```

### Prevention
- Always use `archiveAndDeleteKidProfile` mutation instead of raw deletes
- User deletion should cascade to kid profiles via `deleteUserHttpAction`
- The detection system alerts proactively so issues don't accumulate

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

### SafeStudy Launch (Highest Priority)
- [ ] Purchase domain (getsafestudy.com or similar)
- [ ] Add Stripe checkout UI button in admin Settings
- [ ] Build UpgradePrompt component (trial countdown)
- [ ] Add `useSubscriptionSync` hook (sync with Marketing Central)
- [ ] Add "safestudy" to Marketing Central entitledApps
- [ ] Promo code validation (DAWSFRIEND, DEWITT)
- [ ] Landing page polish (testimonials, FAQ, hero images)
- [ ] Mobile hamburger menu
- [ ] KidSearch.jsx refactor (2,429 lines needs component extraction)

### Immediate
- [ ] Register for FPEA Florida Homeschool Convention (May 21-23, 2026)
  - See `docs/FPEA-2026-EXHIBITOR-GUIDE.md`
  - Cost: $525-685 (Zone 3-1)

### Completed
- [x] **Unified Auth** - JWT migration fully complete (Mar 27)
- [x] **Email Automation** - All types deployed (Apr 1)
- [x] **SafeStudy MVP** - Core search, tutor, profiles, time limits, Stripe webhooks
- [x] **Convex Auth Removal** - Removed from all 3 original apps (Mar 27)
- [x] **Homepage Updates** - On branch `marketing-homepage-updates`

### Marketing
- [ ] Publish Substack article (saved in `docs/client-acquisition-research.md`)
- [ ] Send outreach emails to Chris McKenna & Andrew Hogan
- [ ] Apply to Southeast Homeschool Expo (Atlanta, Jul 24-25)
- [ ] Add more blog posts (target: 2/week)
- [ ] Create convention promo code (e.g., `FPEA2026`)
- [ ] Design booth materials (banner, brochures)

---

## Contact
- Owner: Jeremiah Daws (jedaws@gmail.com)
- Support: jeremiah@getsafefamily.com

---

*Last updated: April 1, 2026*
