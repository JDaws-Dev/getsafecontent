# Safe Family - Operations Guide

## Quick Reference

| App | Domain | Convex Prod | Tech |
|-----|--------|-------------|------|
| SafeTunes | getsafetunes.com | `formal-chihuahua-623` | React + Vite |
| SafeTube | getsafetube.com | `rightful-rabbit-333` | React + Vite |
| SafeReads | getsafereads.com | `exuberant-puffin-838` | Next.js |
| Marketing | getsafefamily.com | N/A (Vercel) | Next.js |
| Blog | getsafefamily.com/blog | N/A (Vercel) | MDX + Velite |

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

### SafeReads (`exuberant-puffin-838.convex.site`)
```bash
# Grant lifetime
curl "https://exuberant-puffin-838.convex.site/grantLifetime?email=EMAIL&key=KEY"

# Delete user
curl "https://exuberant-puffin-838.convex.site/deleteUser?email=EMAIL&key=KEY"

# Admin dashboard
curl "https://exuberant-puffin-838.convex.site/adminDashboard?key=KEY&format=json"
```

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
- `jedaws@gmail.com` - Owner
- `metrotter@gmail.com` - Michelle (lifetime all apps)
- `jennydaws@gmail.com` - Jenny (lifetime all apps)

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

## Troubleshooting

### Webhook Not Firing
1. Check Stripe dashboard → Webhooks → Recent events
2. Verify webhook URL: `https://getsafefamily.com/api/stripe/webhook`
3. Check Vercel logs for errors

### User Can't Login
- SafeTunes/SafeTube: Email/password auth
- SafeReads: Google OAuth only
- Check if user exists in admin dashboard

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

### Immediate
- [ ] Register for FPEA Florida Homeschool Convention (May 21-23, 2026)
  - See `docs/FPEA-2026-EXHIBITOR-GUIDE.md`
  - URL: https://fpea.com/webforms/2026-exhibitor-registration
  - Cost: $525-685 (Zone 3-1)

### Marketing
- [ ] Publish Substack article (saved in `docs/client-acquisition-research.md`)
- [ ] Send outreach emails to Chris McKenna & Andrew Hogan
- [ ] Apply to Southeast Homeschool Expo (Atlanta, Jul 24-25)
- [ ] Apply to Suwanee Farmers Market (opens January)

### Product
- [ ] Add more blog posts (target: 2/week)
- [ ] Create convention promo code (e.g., `FPEA2026`)
- [ ] Design booth materials (banner, brochures)

---

## Contact
- Owner: Jeremiah Daws (jedaws@gmail.com)
- Support: jeremiah@getsafefamily.com

---

*Last updated: February 11, 2026*
