# Stripe Duplicate Customer Cleanup

Guide for identifying and cleaning up duplicate Stripe customers.

## Background

Some users have multiple Stripe customer records due to:
- Multiple signup attempts
- Different email variations (yahoo vs gmail)
- Development/testing artifacts

## Known Duplicates (as of Feb 2026)

| Email | Customer IDs | Notes |
|-------|--------------|-------|
| bjak24@gmail.com | cus_U1wOeN3BkxYnNs, cus_U1BeKUxQtEvTZQ, cus_U1BPaZ8W2xFzGJ, cus_U1BCiHgWmWfVY5 | Brandon Watters - 4 duplicates |
| Jolene Bryan | 2 records | Different emails (yahoo vs gmail) |

## Cleanup Process

### Option 1: Use Stripe Dashboard (Recommended for Small Numbers)

1. Go to [Stripe Dashboard → Customers](https://dashboard.stripe.com/customers)
2. Search for the email address
3. Review each customer:
   - Check subscription status (active/canceled/past_due)
   - Check payment history
   - Check metadata
4. **Keep** the customer with:
   - Active subscription (highest priority)
   - Most payment history
   - Oldest creation date (if tie)
5. **Archive** duplicate customers:
   - Click customer → More → Archive customer
   - Note: Cancel any active subscriptions first

### Option 2: Use Cleanup Script (For Bulk Operations)

```bash
cd ~/safecontent

# Install dependencies
npm install stripe tsx

# Dry run - list duplicates without making changes
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-cleanup.ts

# List all customers with their status
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-cleanup.ts --list-all

# Archive duplicates (CAUTION: Review output first!)
STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-cleanup.ts --archive
```

The script will:
1. Fetch all customers from Stripe
2. Group by email (case-insensitive)
3. Identify duplicates
4. Sort by: active subscription → payment count → creation date
5. Mark first as "KEEP", rest as "ARCHIVE"
6. With `--archive`: Archive customers without active subscriptions

**Important:** The script skips customers with active subscriptions. Review those manually.

### Option 3: Manual API Cleanup

```bash
# Get customer details
curl https://api.stripe.com/v1/customers/cus_XXX \
  -u sk_live_xxx:

# List customer's subscriptions
curl https://api.stripe.com/v1/subscriptions?customer=cus_XXX \
  -u sk_live_xxx:

# Cancel a subscription (if needed)
curl https://api.stripe.com/v1/subscriptions/sub_XXX \
  -u sk_live_xxx: \
  -X DELETE

# Delete/archive customer
curl https://api.stripe.com/v1/customers/cus_XXX \
  -u sk_live_xxx: \
  -X DELETE
```

## Update centralUsers

After cleanup, update centralUsers with the canonical stripeCustomerId:

```bash
# Get the ADMIN_KEY
ADMIN_KEY=$(CONVEX_DEPLOYMENT=prod:adamant-crow-705 npx convex env list | grep ADMIN_KEY | cut -d= -f2)

# URL encode the key
ENCODED_KEY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$ADMIN_KEY'))")

# Update user's stripeCustomerId
curl -X POST "https://adamant-crow-705.convex.site/updateSubscription" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_KEY" \
  -d '{
    "email": "user@example.com",
    "subscriptionStatus": "active",
    "stripeCustomerId": "cus_CANONICAL_ID"
  }'
```

## Verification

After cleanup, verify:

1. **Stripe Dashboard**: Each user has exactly one customer record
2. **centralUsers**: stripeCustomerId matches the kept customer
3. **App subscriptions**: Users can still access their apps

```bash
# Check user in centralUsers
curl "https://adamant-crow-705.convex.site/getAccount?email=USER@EMAIL&key=$ENCODED_KEY"
```

## Rollback

If a customer was archived by mistake:
1. Go to Stripe Dashboard → Customers → Deleted
2. Find the customer
3. Click "Restore"

Note: Subscriptions on archived customers are automatically canceled and cannot be restored - the user will need to re-subscribe.
