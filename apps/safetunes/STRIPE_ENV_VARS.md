# Stripe Environment Variables for Vercel

Add these environment variables to Vercel:

## 1. Go to Vercel Dashboard
https://vercel.com/family-planner/apple-music-whitelist/settings/environment-variables

## 2. Add these variables:

### VITE_STRIPE_PRICE_ID
**Value:** `price_1SUXOjKgkIT46sg7RKwIgAVv`
**Environment:** Production (and optionally Preview)
**Description:** Monthly subscription price ID

### VITE_STRIPE_PUBLISHABLE_KEY
**Value:** `pk_live_51RtgcnKgkIT46sg7XmLrt97ZPHRVx7D00UEJsobuDjUmSBg8JS7cfPpF716cXtcn9xLikK29AnzH22BG3bk51XmV00cN5bpZ7G`
**Environment:** Production (and optionally Preview)
**Description:** Stripe publishable key (safe to expose in frontend)

## 3. Redeploy after adding
Click "Redeploy" or run:
```bash
vercel --prod --yes
```

## 4. Set up Stripe Webhook (AFTER deployment)

Once deployed, configure the webhook in Stripe:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter webhook URL: `https://modest-ram-699.convex.cloud/stripe`
4. Select events to send:
   - ✅ checkout.session.completed
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
   - ✅ invoice.payment_failed
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add it to Convex:
   ```bash
   CONVEX_DEPLOYMENT=prod:modest-ram-699 npx convex env set STRIPE_WEBHOOK_SECRET whsec_YOUR_SECRET_HERE
   ```
8. Deploy Convex again:
   ```bash
   CONVEX_DEPLOYMENT=prod:modest-ram-699 npx convex deploy
   ```

## Done!

Your Stripe integration will be complete and ready to accept payments!
