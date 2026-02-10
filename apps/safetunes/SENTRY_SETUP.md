# Sentry Error Tracking Setup

Sentry is now integrated into SafeTunes for production error tracking. Follow these steps to complete the setup:

## 1. Create Sentry Account

1. Go to https://sentry.io/signup/
2. Sign up for a free account (includes 5,000 errors/month free)
3. Create a new project when prompted
4. Select **"React"** as the platform

## 2. Get Your DSN

After creating the project, Sentry will show you a **DSN** (Data Source Name). It looks like:

```
https://abc123def456@o123456.ingest.sentry.io/7891011
```

## 3. Add DSN to Vercel Environment Variables

1. Go to your Vercel dashboard: https://vercel.com
2. Select the SafeTunes project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name:** `VITE_SENTRY_DSN`
   - **Value:** (paste your Sentry DSN from step 2)
   - **Environment:** Production (and optionally Preview)
5. Click **Save**

## 4. Redeploy

After adding the environment variable:

```bash
npm run build
vercel --prod --yes
```

Or just click **"Redeploy"** in Vercel dashboard.

## 5. Verify It's Working

1. Open your production site: https://getsafetunes.com
2. In Sentry dashboard, go to **Issues**
3. You should see errors start appearing if any occur in production

## What Sentry Tracks

✅ **JavaScript errors** - Unhandled exceptions, promise rejections
✅ **React errors** - Component crashes, render errors
✅ **Performance** - Page load times, API calls
✅ **Session replays** - 10% of sessions, 100% of error sessions

## Privacy Features

- ✅ Automatically filters out emails and IP addresses
- ✅ Masks all text in session replays
- ✅ Blocks all media (images/videos) in replays
- ✅ Only runs in production (not localhost)

## Optional: Slack Integration

To get notified of errors in Slack:

1. In Sentry, go to **Settings** → **Integrations**
2. Find **Slack** and click **Install**
3. Choose which errors trigger notifications

## Monitoring Tips

- Check Sentry daily for the first week after launch
- Set up alerts for high-priority errors
- Use **Releases** feature to track errors by deployment
- Monitor **Performance** tab for slow pages

---

## Current Status

✅ Sentry SDK installed (`@sentry/react`)
✅ Initialization code added to `/src/sentry.js`
✅ Called from `/src/main.jsx`
⏳ **NEEDS:** Sentry DSN environment variable in Vercel

**Next Step:** Follow steps 1-4 above to complete setup!
