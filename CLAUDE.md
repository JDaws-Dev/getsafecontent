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
Repo root: **`~/Projects/safecontent`** (note: *not* `~/safecontent`)
- SafeTunes: `~/Projects/safecontent/apps/safetunes`
- SafeTube: `~/Projects/safecontent/apps/safetube`
- SafeReads: `~/Projects/safecontent/apps/safereads`
- SafeStudy: `~/Projects/safecontent/apps/safeseek`
- SafeSpark: `~/Projects/safecontent/apps/safespark`
- Marketing: `~/Projects/safecontent/sites/marketing`

## For AI Agents
1. Test in dev before prod.
2. Schema changes must be additive (don't remove fields).
3. Use feature branches for significant changes.
4. **Admin/webhook logic must be `internalMutation`/`internalQuery`.** A public `mutation`/`query` is callable directly via the deployment URL and bypasses any HTTP admin-key gate. User-facing functions must verify ownership (`requireOwner` / `getAuthUserId`), never trust a client-supplied `userId`/`email`.
5. **Target Convex deployments explicitly with `--deployment-name <name>`.** `CONVEX_DEPLOYMENT=prod:<name>` is honored by `deploy` but **silently misroutes** other commands (`export`, `env set`, `run`) to a dev deployment while appearing to succeed.
6. **SafeTube lives in a different Convex project.** The pinned CLI can't resolve `--deployment-name rightful-rabbit-333` for `run`/`env set` and 404s with `DeploymentNotFound`. Use `npx convex@latest` for those. `deploy` works with either.

## Deploy Commands

```bash
# SafeTunes
cd ~/Projects/safecontent/apps/safetunes && CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy

# SafeTube
cd ~/Projects/safecontent/apps/safetube && CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex deploy

# SafeReads
cd ~/Projects/safecontent/apps/safereads && CONVEX_DEPLOYMENT=prod:exuberant-puffin-838 npx convex deploy

# SafeStudy
cd ~/Projects/safecontent/apps/safeseek && CONVEX_DEPLOYMENT=prod:strong-scorpion-227 npx convex deploy

# SafeSpark
cd ~/Projects/safecontent/apps/safespark && CONVEX_DEPLOYMENT=prod:giddy-peacock-124 npx convex deploy

# Marketing (auto-deploys via Vercel on push)
cd ~/Projects/safecontent/sites/marketing && vercel --prod

# Frontends (Vite/Next apps) — Convex deploy does NOT ship UI changes
npm run build && vercel --prod --yes
# THEN move the domain — `vercel --prod` builds a Production deployment but does
# NOT re-alias the custom domain. Without this the old build stays live while
# the CLI cheerfully reports "Ready".
vercel alias set <deployment-url> <domain> --scope family-planner
```

**Verifying a frontend deploy:** do NOT compare the live bundle hash to your local
build — Vite hashes inline `VITE_*` env vars, so Vercel's hash legitimately differs.
Compare **byte size / content markers** instead. And note every app has a catch-all
SPA rewrite, so a missing asset still returns HTTP 200 — check `content_type`
(`application/javascript` = real, `text/html` = missing).

**Deploy ORDER across the fleet: all frontends BEFORE any Convex backend.** Parent-only
kid endpoints hard-require `userToken` (`convex/identity.ts` `requireOwner`). New
frontends send it and old backends accept it; an old cached frontend against a new
backend throws "Please sign in again." for every parent.

## Where Things Live
- **Operations reference** (admin endpoints, env vars, Stripe, auth, troubleshooting, security, newsletter, blog): [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- **Roadmap** (What's Next, Completed, TODO): [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Build history & current status** (session-by-session log): [`docs/BUILD-HISTORY.md`](docs/BUILD-HISTORY.md)
- **Open security work** (residual P0s + why): [`TODO-SECURITY.md`](TODO-SECURITY.md)
- **Backups** — LOCAL now, not CI: `scripts/backup-convex-local.sh` via launchd → iCloud, daily 3AM, all 6 deployments. GH Actions/R2 is retired: [`docs/CONVEX-BACKUP-SETUP.md`](docs/CONVEX-BACKUP-SETUP.md)
- **Lyrics** — SafeTunes uses free sources (LRCLIB → lyrics.ovh); Musixmatch cancelled Jul 2026: [`docs/LRCLIB-MIGRATION.md`](docs/LRCLIB-MIGRATION.md)
- **Marketing strategy**: `docs/MARKETING-STRATEGY-2026-05.md`
- **In-app roadmap UI**: `/admin/roadmap` on the marketing site (source: `sites/marketing/src/data/roadmap.ts`)

## Contact
- Owner: Jeremiah Daws (jedaws@gmail.com)
- Support: jeremiah@getsafefamily.com
