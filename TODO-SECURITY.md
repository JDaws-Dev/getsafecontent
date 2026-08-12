# Security To-Do List

**Created:** February 5, 2026
**Priority:** HIGH - Do this soon

---

## ✅ UPDATE June 11, 2026 — Admin key + JWT secret rotation COMPLETE

The shared admin key (hardcoded in 16 convex files + the marketing client bundle)
and the safespark variant were rotated across all 6 Convex prods + Vercel.
Old keys verified rejected (403) on every admin endpoint. Marketing now signs
login JWTs with a dedicated `JWT_SECRET` (was falling back to the admin key),
and `MARKETING_JWT_SECRET` is set on all 5 apps. All hardcoded fallbacks
removed from source; endpoints fail closed on missing env.

**New key values are NOT in this repo** — they live in the operator's password
manager. Remaining items from the original Feb checklist that still need a human:

- [ ] Delete the old YouTube API key from Google Cloud Console (SafeTubeV02 project)
- [ ] Remove the key values documented below in this file's history (now-dead keys, but tidy)
- [ ] Set up GitHub secret scanning alerts

---

## API Keys to Rotate

### 1. YouTube API Key (SafeTube) - ✅ ROTATED
- **Project:** SafeTubeV02
- **Old (exposed) key:** `AIzaSyCkmId6YvpRswG6RSxhoZJo1N-hnWv7CJc` ❌ DELETE THIS
- **New key:** `AIzaSyAakNe7-eBPwpX-XbuyoYpI5SJLpo1fEGo`
- **Console:** https://console.cloud.google.com/apis/credentials?project=safetubev02
- **Status:**
  - [x] Key regenerated
  - [x] Updated `~/safecontent/apps/safetube/.env.prod`
  - [ ] Update Vercel env vars for SafeTube
  - [ ] Redeploy SafeTube
  - [ ] Delete old key from Google Cloud Console

### 2. Vercel OIDC Token (SafeTunes) - MEDIUM
- **Note:** These tokens expire automatically, but were exposed
- **Action:** Check Vercel dashboard for any suspicious activity
- **Console:** https://vercel.com/family-planner/apple-music-whitelist/settings

### 3. Review Stripe Keys (SafeTunes) - LOW
- **Exposed:** Publishable key `pk_live_51Rtg...` (this is public by design)
- **Check:** Verify no secret keys (`sk_live_`) were in the exposed files
- **Console:** https://dashboard.stripe.com/apikeys
- **Action:** If any secret keys were exposed, rotate them immediately

---

## Files That Were Exposed (Now Fixed)

### SafeTube
- `.env.prod` - Contained YouTube API key
- `.env.vercel` - Contained Vercel tokens
- **Fix commit:** `31a9304` (pushed)

### SafeTunes
- `.env.vercel` - Contained Vercel OIDC token, Stripe publishable key
- `.env.vercel.production` - Contained Vercel build settings
- `.env.production.pulled` - Contained production env vars
- `STRIPE_ENV_VARS.md` - Documentation with setup info
- **Fix commit:** `abd3c1d` (pushed)

---

## Git History Note

The files are removed from tracking but still exist in git history. For complete removal, you'd need to use:
- `git filter-branch` or
- BFG Repo-Cleaner (https://rtyley.github.io/bfg-repo-cleaner/)

This is optional since you're rotating the keys anyway.

---

## Prevention Checklist

- [x] Added `.env.prod` to SafeTube `.gitignore`
- [x] Added `.env.vercel*` to SafeTunes `.gitignore`
- [ ] Consider using `.env.*.local` pattern for all local env files
- [ ] Set up GitHub secret scanning alerts
- [ ] Consider using a secrets manager (1Password, Doppler, etc.)

---

## After Rotating Keys

1. Test SafeTube YouTube search functionality
2. Test SafeTunes Apple Music functionality
3. Verify Stripe payments still work
4. Check all three apps load correctly in production

## SafeTube — server-side time-limit enforcement (filed 2026-07-12)

**Priority: P0.** SafeTube daily watch-time limits are enforced CLIENT-SIDE only. `convex/watchHistory.ts` `recordWatch`/`updateWatchDuration` accept writes without checking the cap, and `timeLimits.canWatch` only *reports* status. A page reload or modified client bypasses the cap entirely. The 2026-07-12 fix (branch fix/safetube-shorts-timelimit) closed the shorts auto-advance loophole and made the client backstop reliable, but true enforcement requires: (1) `recordWatch` to atomically reject when over cap, and (2) a heartbeat/update mutation that returns whether playback remains authorized so the player pauses on a denied response. SOL-reviewed; tracked in memory project_safetube_timelimit_enforcement.

## SafeSpark — cost-abuse hardening (2026-07-12, partial)

DONE (branch security/p0-lockdown, SOL SHIP):
- Removed hardcoded `BELLA-BUILD` demo-code fallback -> fails closed. **DEPLOY PRECONDITION: `BELLA_DEMO_CODE` MUST be set in Vercel prod env or the whole /api/demo route 401s.**
- Fail-closed when a sessionToken is supplied but does not resolve to a valid kid (was fail-open -> forged/expired token bypassed pause/budget/blocklist).

DONE 2026-08-11 (deployed to prod: giddy-peacock-124 + Vercel/getsafespark.com):
- ~~Direct callers can OMIT sessionToken~~ — tokenless callers now spend from one
  global `guest:demo` daily bucket (`SAFESPARK_GUEST_DAILY_BUDGET`, default 25)
  and their prompts are logged server-side to safesparkRequests. The demo code
  ships to the browser, so it was never a secret.
- ~~Budget enforced only via client `logRequest`~~ — new `safespark.spendPromptBudget`
  mutation does the check + increment ATOMICALLY in one transaction against the
  new `safesparkPromptSpend` table, called by /api/demo BEFORE any OpenAI call.
  Budget resolves server-side (per-kid `dailyQueryBudget`, else
  `SAFESPARK_SYSTEM_DEFAULT_DAILY_BUDGET`=75) so it can't be caller-supplied.
  Fails CLOSED (money gate). Forged/expired session tokens are refused.
- ~~`recordUsage` dead~~ — the always-null `convexToken` gates were removed; cost
  tracking now keys on sessionToken, and tokenless spend books under `guest:demo`
  instead of being thrown away.
- ~~public TTS action ungated~~ — fresh synthesis now requires a live kid session
  (`_sessionValid`, expiry-checked); anonymous/forged callers get cache hits only
  (free) and `_checkBudget` fails closed on unknown sessions.
