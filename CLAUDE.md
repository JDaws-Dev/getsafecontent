# Safe Family — Project Guide

> This file is loaded into every Claude turn. Keep it tight. Move detail to `docs/`.

## Quick Reference

| App | Domain | Convex Prod | Tech |
|-----|--------|-------------|------|
| SafeTunes | getsafetunes.com | `formal-chihuahua-623` | React + Vite |
| SafeTube | getsafetube.com | `rightful-rabbit-333` | React + Vite |
| SafeReads | getsafereads.com | `exuberant-puffin-838` | Next.js |
| SafeStudy | getsafestudy.com | `strong-scorpion-227` | React + Vite + OpenAI |
| SafeSpark | getsafespark.com | `giddy-peacock-124` | Next.js + OpenAI |
| Marketing | getsafefamily.com | `adamant-crow-705` | Next.js |
| Blog | getsafefamily.com/blog | N/A (shares Marketing) | MDX + Velite |

## Key Paths
- SafeTunes: `~/safecontent/apps/safetunes`
- SafeTube: `~/safecontent/apps/safetube`
- SafeReads: `~/safecontent/apps/safereads`
- SafeStudy: `~/safecontent/apps/safeseek`
- SafeSpark: `~/safecontent/apps/safespark`
- Marketing: `~/safecontent/sites/marketing`

## For AI Agents
1. Test in dev before prod.
2. Schema changes must be additive (don't remove fields).
3. Use feature branches for significant changes.

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

# SafeSpark
cd ~/safecontent/apps/safespark && CONVEX_DEPLOYMENT=prod:giddy-peacock-124 npx convex deploy

# Marketing (auto-deploys via Vercel on push)
cd ~/safecontent/sites/marketing && vercel --prod
```

## Where Things Live
- **Operations reference** (admin endpoints, env vars, backups, Stripe, auth, troubleshooting, security, newsletter, blog): [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- **Roadmap** (What's Next, Completed, TODO): [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Build history & current status** (session-by-session log): [`docs/BUILD-HISTORY.md`](docs/BUILD-HISTORY.md)
- **Marketing strategy**: `docs/MARKETING-STRATEGY-2026-05.md`
- **In-app roadmap UI**: `/admin/roadmap` on the marketing site (source: `sites/marketing/src/data/roadmap.ts`)

## Contact
- Owner: Jeremiah Daws (jedaws@gmail.com)
- Support: jeremiah@getsafefamily.com
