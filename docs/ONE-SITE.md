# One site — running the getsafefamily.com consolidation branch

Branch: `feature/one-site`. Spec: the "Safe Family Under One Roof" page (see BUILD-HISTORY 2026-09-08).
Goal of Phase 1: every app served under a path on getsafefamily.com, one sign-in, nothing live changes until we flip env vars.

## How it fits together

- The **hub** (`sites/marketing`) proxies `/tube/*`, `/tunes/*`, `/reads/*`, `/study/*`, `/spark/*` to each app's own deployment, prefix intact. Origins come from env: `ONE_SITE_ORIGIN_TUBE` etc. (`sites/marketing/next.config.ts`). Unset = that path is untouched, so production is unaffected until we set them.
- Each **Vite app** is built with `base: '/<path>/'` and a router basename (`src/lib/appBase.js`); its `vercel.json` also serves `/<path>/*` on its own deployment, so previews work standalone and via the hub.
- Each **Next app** uses `basePath: '/<path>'`.
- **SafeTunes is dual-host**: assets always come from `/tunes/…`, but the router prefix is decided at load time, so the same build serves getsafetunes.com at the root (the iPhone/Android shells only accept that host) and getsafefamily.com/tunes.
- **One dashboard**: `sites/marketing/src/app/dashboard/[[...app]]/page.tsx` is the only parent dashboard. Each app tab is a same-origin iframe of that app's parent area with `?embed=1`; in embedded mode the app hides its own header/switcher/sign-out (`src/lib/embed.*` in each app) and sends Stripe/sign-out navigation to the top window. Opened directly under the hub, an app's admin redirects to `/dashboard/<app>`.
- **One kid front door**: `sites/marketing/src/app/play/[[...app]]/page.tsx`. Kids enter the family code once; every app is a tab (Music, Videos, Books, Search, Build) rendering that app's kid entry in an iframe with `?fc=<code>&embed=1`. Apps hide their own cross-app switcher when embedded and redirect a direct kid deep link under the hub to `/play/<app>?fc=<code>`. The code and last app are remembered on the device.
- **One sign-in**: apps store the parent token under `safefamily_jwt` (migrating their old per-app key once). After a hub sign-in, `AppSessionBridge` mints that token and stores it; hub sign-out clears it. Works because everything now shares the hub's origin.

## Run it locally

```bash
scripts/one-site-dev.sh              # hub :3000 + SafeTube :5175
scripts/one-site-dev.sh tube study   # add apps as they are wired (tunes 5174, study 5176, reads 5177, spark 5178)
```
Then open http://localhost:3000/tube/play/<family code>. Logs: `/tmp/one-site-<app>.log`. If a hub is already on :3000 the script leaves it alone.

Local caveat: the hub dev server talks to the marketing **dev** deployment while the apps verify tokens against **prod** central, so a locally minted token is refused by the apps. The real sign-in-once check happens on preview deployments (below).

## Prove sign-in-once locally against production (the real check)

```bash
mkdir -p ~/one-site-env && cd ~/one-site-env   # keep OUTSIDE the repo
for a in apps/safetube apps/safetunes apps/safeseek apps/safereads apps/safespark sites/marketing; do
  (cd ~/Projects/safecontent/$a && vercel env pull ~/one-site-env/$(basename $a).env --environment production --yes); done
ENV_DIR=~/one-site-env scripts/one-site-dev-prod.sh
```
Then open http://localhost:3000/login and sign in as yourself. You land on **/dashboard — the one
parent dashboard**: one tab per app, each app's parent screens rendered inside it, no second
sign-in. (The apps' own /tube/admin etc. redirect there when opened directly.) Kid flow:
/tube/play/<your family code>. This talks to production data exactly like the live sites do.

## Vercel previews (secondary)

Preview deployments exist for every app but are behind Vercel's SSO login (deployment
protection), so the hub cannot proxy to them and a browser can't test them without a Vercel
session. To use previews for the cross-app check you would need Protection Bypass for
Automation on each project. The local-against-production run above is the simpler proof.

## Prove it on Vercel previews (no domain changes)

1. Push the branch; each app project builds a preview (`vercel` from the app dir, or the Git integration).
2. On the hub project, set `ONE_SITE_ORIGIN_<APP>` **for the Preview environment only** to each app's preview URL, then deploy a hub preview.
3. Walk the flows on the hub preview URL: sign in once at `/login`, then `/tube/admin`, `/tunes/admin`, … with no second sign-in; kid flow at `/tube/play/<code>`.
4. Production stays as it is until the same env vars are set on the hub's Production environment and the old domains are pointed at the hub (except getsafetunes.com, which keeps serving SafeTunes).

## Known follow-ups from the walkthrough build
- SafeSpark: the family code ERLW4U maps to a SafeSpark family with no kid profiles (Bella's SafeSpark profile sits under Jeremiah's own family record), so the Build tab shows SafeSpark's sign-up screen for this family. Data question, not one-site code.
- SafeTunes: Apple Music authorization popup from inside the dashboard iframe — verify in the walkthrough.
- SafeReads kid screens still show emoji (pre-existing).
- SafeStudy's production `VITE_CONVEX_URL` on Vercel has a trailing newline (works in prod, tripped the local launcher; worth re-saving cleanly).

## Before go-live (from the spec's loose-ends table)
- Add getsafefamily.com to the YouTube API key's allowed referrers.
- Stripe return URLs and emails → `/account` and app paths.
- Chrome extension host permission → getsafefamily.com.
- Old domains → 301 to hub paths (all except getsafetunes.com).
