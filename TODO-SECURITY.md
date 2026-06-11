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
