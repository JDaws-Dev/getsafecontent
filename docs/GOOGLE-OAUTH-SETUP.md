# Google OAuth Setup Guide

This guide walks through setting up Google OAuth for Safe Family apps.

## Prerequisites

- Access to Google Cloud Console (console.cloud.google.com)
- Access to Vercel Dashboard (vercel.com)
- Access to Convex Dashboard (dashboard.convex.dev)

---

## Step 1: Create Google Cloud Project (if needed)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown → "New Project"
3. Name: `Safe Family`
4. Click "Create"

---

## Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services → OAuth consent screen**
2. Select **External** user type → Create
3. Fill in the app information:
   - App name: `Safe Family`
   - User support email: `jeremiah@getsafefamily.com`
   - App logo: (optional, can add later)
   - Developer contact email: `jedaws@gmail.com`
4. Click "Save and Continue"
5. **Scopes**: Click "Add or Remove Scopes"
   - Select: `email`, `profile`, `openid`
   - Click "Update"
6. Click "Save and Continue"
7. **Test users**: Skip for now (we'll publish the app)
8. Click "Save and Continue"

---

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Safe Family Web`
5. **Authorized JavaScript origins** - Add all domains:
   ```
   https://getsafefamily.com
   https://getsafetunes.com
   https://getsafetube.com
   https://getsafereads.com
   ```
6. **Authorized redirect URIs** - Add Convex Auth callbacks:
   ```
   https://formal-chihuahua-623.convex.site/api/auth/callback/google
   https://rightful-rabbit-333.convex.site/api/auth/callback/google
   https://exuberant-puffin-838.convex.site/api/auth/callback/google
   ```
7. Click "Create"
8. **Copy the Client ID and Client Secret** - you'll need these next

---

## Step 4: Set Convex Environment Variables

For each app, set the OAuth credentials in Convex Dashboard:

### SafeTunes (formal-chihuahua-623)

```bash
cd ~/safecontent/apps/safetunes
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex env set AUTH_GOOGLE_ID "YOUR_CLIENT_ID"
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex env set AUTH_GOOGLE_SECRET "YOUR_CLIENT_SECRET"
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex env set SITE_URL "https://getsafetunes.com"
```

### SafeTube (rightful-rabbit-333)

```bash
cd ~/safecontent/apps/safetube
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env set AUTH_GOOGLE_ID "YOUR_CLIENT_ID"
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env set AUTH_GOOGLE_SECRET "YOUR_CLIENT_SECRET"
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env set SITE_URL "https://getsafetube.com"
```

### SafeReads (exuberant-puffin-838)

```bash
cd ~/safecontent/apps/safereads
CONVEX_DEPLOYMENT=prod:exuberant-puffin-838 npx convex env set AUTH_GOOGLE_ID "YOUR_CLIENT_ID"
CONVEX_DEPLOYMENT=prod:exuberant-puffin-838 npx convex env set AUTH_GOOGLE_SECRET "YOUR_CLIENT_SECRET"
CONVEX_DEPLOYMENT=prod:exuberant-puffin-838 npx convex env set SITE_URL "https://getsafereads.com"
```

---

## Step 5: Set Vercel Environment Variables (Marketing Site)

The marketing site also needs OAuth credentials for central signup:

1. Go to [Vercel Dashboard](https://vercel.com/) → Safe Family Marketing project
2. Go to **Settings → Environment Variables**
3. Add these variables (Production environment):

| Name | Value |
|------|-------|
| `AUTH_GOOGLE_ID` | Your Google Client ID |
| `AUTH_GOOGLE_SECRET` | Your Google Client Secret |

4. Click "Save"
5. **Redeploy** the marketing site to pick up new env vars:
   ```bash
   cd ~/safecontent/sites/marketing && vercel --prod
   ```

---

## Step 6: Publish OAuth App (Required for Production)

1. Go back to **APIs & Services → OAuth consent screen**
2. Click **"Publish App"**
3. Confirm the verification (may take a few days for Google to approve)

Note: While in "Testing" status, only test users can sign in. Publishing allows anyone to sign in.

---

## Step 7: Verify Setup

Test Google OAuth on each app:

1. **Marketing Site**: Go to https://getsafefamily.com/signup → Click "Continue with Google"
2. **SafeTunes**: Go to https://getsafetunes.com/login → Click "Continue with Google"
3. **SafeTube**: Go to https://getsafetube.com/login → Click "Continue with Google"
4. **SafeReads**: Go to https://getsafereads.com/login → Click "Continue with Google"

Expected behavior:
- Redirects to Google sign-in
- After Google auth, redirects back to app
- User is logged in with their Google account

---

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Check that the redirect URI exactly matches what's in Google Cloud Console
- Convex uses: `https://{deployment}.convex.site/api/auth/callback/google`

### "Access blocked: This app's request is invalid"
- OAuth consent screen not configured
- Missing scopes (email, profile, openid)

### "This app isn't verified"
- App is in Testing mode - need to Publish
- Or add the test user's email to the test users list

### OAuth works locally but not in production
- Make sure env vars are set for Production environment (not just Preview)
- Redeploy after setting env vars

---

## Security Notes

- Never commit OAuth credentials to git
- Use environment variables only
- Client Secret should only be in server-side env vars
- Rotate credentials if exposed

---

## Quick Reference

| App | Convex Deployment | Callback URL |
|-----|-------------------|--------------|
| SafeTunes | formal-chihuahua-623 | https://formal-chihuahua-623.convex.site/api/auth/callback/google |
| SafeTube | rightful-rabbit-333 | https://rightful-rabbit-333.convex.site/api/auth/callback/google |
| SafeReads | exuberant-puffin-838 | https://exuberant-puffin-838.convex.site/api/auth/callback/google |

---

*Created: February 12, 2026*
