# SafeTube - YouTube Parental Control App

## Project Overview
SafeTube is a YouTube parental control app that lets parents create whitelists of approved YouTube channels and videos for their kids. Kids can ONLY watch content that parents have explicitly approved.

## Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Convex (real-time database)
- **Authentication**: Better Auth (@convex-dev/better-auth)
- **Video Playback**: YouTube IFrame Player API (TOS-compliant)
- **Video Metadata**: YouTube Data API v3
- **Routing**: React Router v7

## Project Structure

```
SafeTube/
├── convex/                    # Backend (Convex functions)
│   ├── schema.ts              # Database schema
│   ├── auth.ts                # Better Auth setup
│   ├── users.ts               # User management, family codes
│   ├── kidProfiles.ts         # Kid profile CRUD
│   ├── channels.ts            # Approved channels management
│   └── videos.ts              # Approved videos management
├── src/
│   ├── pages/                 # Route pages
│   │   ├── LandingPage.jsx    # Marketing landing page
│   │   ├── LoginPage.jsx      # Parent login
│   │   ├── SignupPage.jsx     # Parent signup
│   │   ├── AdminDashboard.jsx # Parent control panel
│   │   └── KidPlayer.jsx      # Kid entry point
│   ├── components/
│   │   ├── admin/             # Parent dashboard components
│   │   │   ├── KidProfilesManager.jsx
│   │   │   ├── YouTubeSearch.jsx
│   │   │   └── ContentLibrary.jsx
│   │   └── kid/               # Kid player components
│   │       ├── ProfileSelector.jsx
│   │       ├── KidHome.jsx
│   │       └── VideoPlayer.jsx
│   ├── lib/
│   │   └── auth-client.js     # Better Auth client
│   └── config/
│       └── youtube.js         # YouTube API integration
├── public/                    # Static assets
│   ├── favicon.svg            # App favicon
│   └── logo.svg               # App logo
└── .env.example               # Environment variables template
```

## Database Schema

### Tables

**users** - Parent accounts
- `betterAuthId`: Auth system ID
- `email`, `name`: User info
- `familyCode`: 6-character code for kids to access content
- `parentPin`: Optional PIN for parent mode protection

**kidProfiles** - Individual kid profiles
- `userId`: Parent user reference
- `name`, `icon`, `color`: Profile customization

**approvedChannels** - Whitelisted YouTube channels
- `kidProfileId`: Which kid can access
- `channelId`, `channelTitle`, `thumbnailUrl`: Channel info
- Videos are fetched LIVE from YouTube when kid browses (not stored)

**approvedVideos** - Whitelisted individual videos (one-offs)
- `kidProfileId`: Which kid can access
- `videoId`, `title`, `thumbnailUrl`, `channelId`, `channelTitle`: Video info
- `durationSeconds`: Video length

**watchHistory** - Viewing history
- `kidProfileId`, `videoId`: What was watched
- `watchedAt`: Timestamp

## Key Features

### Parent Features
1. **YouTube Search**: Search channels and videos directly
2. **Channel Whitelist**: Add channels - all videos automatically approved
3. **Individual Videos**: Add single videos from non-whitelisted channels
4. **Per-Kid Whitelists**: Each kid has their own approved content
5. **Family Code**: Share code with kids to access their content
6. **Content Library**: View and manage approved content

### Kid Features
1. **Profile Selection**: Kids pick their profile
2. **Browse Channels**: See approved channels with live video fetching
3. **Search Within Channels**: Find specific videos in whitelisted channels
4. **Search Videos**: Search individually approved videos
5. **Video Player**: Full-screen YouTube player with always-visible back button

## Production Infrastructure

### Convex Deployment
- **Production**: `rightful-rabbit-333` (used by getsafetube.com)
- **Admin Dashboard**: `https://rightful-rabbit-333.convex.site/adminDashboard?key=<ADMIN_KEY>`

### Deploying to Production
```bash
# Deploy Convex functions to production
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex deploy

# Deploy frontend to Vercel
npm run build && vercel --prod --scope family-planner
```

### Environment Variables (Convex Production)
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `RESEND_API_KEY` - Resend email API key (shared with SafeTunes)
- `OPENAI_API_KEY` - For AI features
- `SITE_URL` - https://rightful-rabbit-333.convex.site

## Recent Updates

### Kid Dashboard Improvements (January 15, 2026)
Multiple improvements to the kid-facing dashboard experience.

**New Channels Section:**
- Added "New Channels" section to kid home page
- Shows channels added within the last 7 days with green "Just Added!" badge
- Only shows full channel approvals (not individual videos)
- Limit increased from 6 to 12 channels

**Shorts Sorting Fix:**
- Shorts now consistently sorted by publish date (most recent first)
- Fixed issue where shorts appeared in random order on each page load
- Added null/undefined date handling for consistent sorting

**Unknown Channel Filtering:**
- Watch history queries now filter out entries with "Unknown Channel"
- Prevents bad data from Chrome extension from appearing in parent dashboard
- Added `removeUnknownChannelHistory` mutation for cleanup

**YouTube Search Improvements:**
- Added clickable channel names to filter search results by channel
- Added `channelId` parameter to `searchVideosCached` action
- Channel filter included in cache key for proper caching
- Added view count and time ago display on video search results
- Added HTML entity decoding for titles (e.g., `&#39;` → `'`)

**New Helper Functions (`src/config/youtube.js`):**
- `decodeHtmlEntities(text)` - Decode HTML entities in text
- `formatViewCount(count)` - Format view counts (e.g., "1.2M views")
- `formatTimeAgo(dateString)` - Format relative time (e.g., "3 days ago")

**Key Files Modified:**
- `src/components/kid/KidHome.jsx`: New Channels section, shorts sorting
- `src/components/admin/YouTubeSearch.jsx`: Channel filter, view counts
- `convex/youtubeCache.ts`: Added channelId parameter
- `convex/watchHistory.ts`: Unknown Channel filtering, cleanup mutations
- `src/config/youtube.js`: New helper functions

### Full Email System & Domain Setup (January 15, 2026)
Complete email infrastructure for SafeTube with dedicated domain.

**Domain Setup:**
- Added `getsafetube.com` domain to Resend
- All emails now sent from `@getsafetube.com`
- Reply-to: `jeremiah@getsafetube.com` (Google Workspace)

**Email Functions (`convex/emails.ts`):**
1. `sendTrialSignupEmails` - Welcome + admin notification on signup
2. `sendPasswordResetEmail` - Forgot password flow
3. `sendSubscriptionConfirmation` - When user pays via Stripe
4. `sendCancellationConfirmation` - When user cancels
5. `sendPaymentFailedEmail` - When payment fails
6. `sendCancellationReasonEmail` - Admin gets cancellation reason
7. `sendBatchedRequestNotification` - Kids' channel/video requests
8. `sendAdminNotification` - Stripe signup notification

**Frontend Email Updates:**
All contact emails updated from `@getsafetunes.com` to `@getsafetube.com`:
- SupportPage.jsx (mailto + display)
- TermsPage.jsx
- PrivacyPage.jsx
- LoginPage.jsx (forgot password)
- AdminDashboard.jsx (subscription contact)
- Settings.jsx (support + account deletion)

**Backend Email Triggering:**
- Emails triggered from `syncUser` mutation (not frontend)
- Uses `ctx.scheduler.runAfter(0, api.emails.sendTrialSignupEmails, ...)`
- Guarantees correct name from database

### Landing Page Color Update (January 11, 2026)
Updated landing page to use red/orange gradient matching the OG image.

**Changes:**
- Hero section: `from-red-600 to-orange-500` gradient
- Buttons: red/orange gradient instead of cyan/teal
- All accent colors changed from cyan/teal to red/orange
- Consistent branding across OG image and landing page

### Settings Page Subscription Status Fix (January 1, 2026)
Fixed the Settings page to show the correct subscription status instead of hardcoded "Free Trial".

**The Problem:**
- Michelle (metrotter@gmail.com) used DAWSFRIEND promo code for lifetime access
- Database correctly showed `subscriptionStatus: "lifetime"`
- Settings page was hardcoded to always show "Free Trial"

**The Fix (`src/components/admin/Settings.jsx`):**
```jsx
// Before (hardcoded):
<p className="text-lg font-medium text-gray-900">Free Trial</p>

// After (dynamic):
<p className="text-lg font-medium text-gray-900">
  {userData?.subscriptionStatus === 'lifetime' ? 'Lifetime Access' :
   userData?.subscriptionStatus === 'active' ? 'Premium' :
   userData?.subscriptionStatus === 'trial' ? 'Free Trial' : 'Free Trial'}
</p>
```

**Promo Codes Supported:**
- `DAWSFRIEND` - Lifetime access
- `DEWITT` - Lifetime access (added for influencer moms)

### Channel Videos Now Fetched Live (December 2025)
- Adding a channel NO LONGER stores all videos in database
- Videos are fetched live from YouTube API when kid clicks on channel
- Benefits: Instant channel adding, new uploads automatically available, smaller database
- Kid can search within channel's videos (up to 500 videos fetched)

### UI Improvements
- Renamed from "SafeTubes" to "SafeTube" (mimics YouTube)
- Light theme with red/orange gradients
- Custom Toast notifications (replaced native alerts)
- Custom ConfirmModal (replaced native confirm dialogs)
- SVG icons replaced emojis throughout
- Always-visible back button in video player (mobile-friendly)
- `referrerPolicy="no-referrer"` on all YouTube thumbnails

### Architecture
- **Whitelisted channels**: Store channel info only, fetch videos live
- **Individual videos**: Store in `approvedVideos` table
- **Global search**: Searches individually approved videos
- **Channel search**: Searches live-fetched videos from that channel

## Environment Variables

```bash
# YouTube Data API Key (required for search)
VITE_YOUTUBE_API_KEY=your_key_here

# Convex URL (auto-generated by `npx convex dev`)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

## Getting Started

```bash
# Install dependencies
npm install

# Start Convex backend (in one terminal)
npx convex dev

# Start frontend (in another terminal)
npm run dev
```

## YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Create an API key in Credentials
5. Add the key to your `.env` file

## User Flows

### Parent Flow
1. Sign up / Log in
2. Create kid profiles
3. Search YouTube for channels or videos
4. Add channels (all videos approved) or individual videos
5. Share family code with kids

### Kid Flow
1. Go to `/play` or use family code URL
2. Enter family code
3. Select their profile
4. Browse channels or videos
5. Click channel → loads videos live → search within channel
6. Watch approved content

## Security Considerations

- Kids can ONLY access content explicitly approved by parents
- No YouTube recommendations or related videos shown
- No direct access to YouTube search (kids search approved content only)
- Family codes are simple but can be changed by parents
- Optional parent PIN for dashboard access

## YouTube API Quota

### Current Allocation (Verified January 11, 2026)
- **Daily Quota**: 10,000 units/day (standard default)
- **Status**: Active and working - no approval needed to launch

### Quota Costs by Operation
| Operation | Cost | Notes |
|-----------|------|-------|
| Search | 100 units | Most expensive - parent searching for channels/videos |
| Video details | 1 unit | Getting video metadata |
| Channel details | 1 unit | Getting channel info |
| PlaylistItems | 1 unit | Fetching channel videos |

### Capacity Planning
- With 10,000 units/day you can support ~50-100 active daily users
- Current usage: minimal (11 users, ~0% of quota)
- Request quota increase only when approaching limit

### Checking Quota
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select SafeTube project
3. APIs & Services → YouTube Data API v3 → Quotas tab
4. Or direct: `https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas`

Channel video fetching uses pagination (up to 500 videos = ~10 API calls).

## Future Enhancements

### MVP (Current)
- [x] Channel whitelisting with live video fetching
- [x] Individual video whitelisting
- [x] Search within channels
- [x] Custom UI modals (no native dialogs)

### V2 - Screen Time API Integration
- [ ] Apply for `com.apple.developer.family-controls` entitlement
- [ ] Auto-block YouTube app when SafeTube is installed
- [ ] Block youtube.com in Safari/Chrome
- [ ] Prevent SafeTube app deletion without parent approval
- [ ] Watch time limits per kid

### V2.5 - Stripe Integration (COMPLETED January 15, 2026)
Full Stripe subscription integration with webhook handling and customer portal.

**Files Created/Modified:**
- `convex/stripe.ts` - Stripe webhook handler (checkout, subscription updates, payment failures)
- `convex/stripeActions.ts` - Checkout session, customer portal, invoice history actions
- `convex/subscriptionEvents.ts` - Event logging for debugging
- `convex/users.ts` - Added `updateSubscriptionStatus`, `updateSubscriptionByStripeId`, and `setSubscriptionStatusByEmailInternal` mutations
- `convex/setSubscriptionStatus.ts` - Admin HTTP endpoint to manually fix subscription status
- `convex/schema.ts` - Added `by_subscription` index and `subscriptionEvents` table
- `convex/http.ts` - Added `/stripe` webhook route and `/setSubscriptionStatus` admin route
- `convex/auth.ts` - Hardcoded baseURL to Convex site URL (fixes crossSubdomainCookies error)
- `src/components/admin/Settings.jsx` - Added SubscriptionCard with checkout/portal buttons and fallback contact message

**Stripe Webhook Events Handled:**
- `checkout.session.completed` - New subscription created, sends confirmation email
- `customer.subscription.updated` - Subscription status changes, cancellation scheduled
- `customer.subscription.deleted` - Subscription fully cancelled
- `invoice.paid` - Payment successful
- `invoice.payment_failed` - Payment failed, marks as `past_due`

**Key Implementation Details:**

1. **No Stripe Trial** - Users get 7-day app trial first, then charged immediately when clicking "Upgrade to Premium" (no additional Stripe trial period).

2. **Better Auth baseURL Fix** - The `crossSubdomainCookies` feature requires `baseURL` to be the Convex site URL (`https://rightful-rabbit-333.convex.site`), NOT the frontend URL. This was causing login failures.

3. **Invoice vs Receipt Emails** - Stripe automatically sends both an Invoice (what's due) and a Receipt (proof of payment). This is normal behavior.

4. **"Bill to" Name** - Shows the cardholder name from payment, not the SafeTube user name. Real customers will see their own name.

5. **SubscriptionCard Fallback** - If `stripeCustomerId` is missing (webhook failed), shows "To manage or cancel, contact jeremiah@getsafetube.com" instead of broken button.

**Admin Endpoints:**

1. **Set Subscription Status** (for fixing stuck customers):
```bash
curl "https://rightful-rabbit-333.convex.site/setSubscriptionStatus?email=user@example.com&status=active&key=<ADMIN_KEY>"
# Valid statuses: trial, active, lifetime, cancelled, expired, past_due
# Optional: &stripeCustomerId=cus_xxx&subscriptionId=sub_xxx
```

2. **Manually Send Confirmation Email** (if webhook failed):
```bash
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex run emails:sendSubscriptionConfirmation '{"email": "user@example.com", "name": "User Name", "subscriptionType": "paid"}'
```

**Environment Variables (Production):**
```bash
STRIPE_SECRET_KEY=<stored in Convex dashboard>
STRIPE_WEBHOOK_SECRET=<stored in Convex dashboard>
SITE_URL=https://getsafetube.com
BETTER_AUTH_SECRET=<auto-generated>
```

**Stripe Configuration:**
- Product: SafeTube Premium ($4.99/month)
- Price ID: `price_1Spp7oKgkIT46sg7oJIKGfMG`
- Webhook URL: `https://rightful-rabbit-333.convex.site/stripe`
- Customer Portal: Enabled for payment updates and cancellation

**Subscription Status Values:**
- `trial` - Free 7-day trial (auto-set on signup)
- `active` - Paying subscriber
- `past_due` - Payment failed, retry pending
- `cancelled` - Subscription ended
- `lifetime` - Promo code users (DAWSFRIEND, DEWITT)

**Troubleshooting:**

1. **Webhook failing with "HMAC key is empty"** - Redeploy Convex functions to pick up env vars
2. **Login failing with "baseURL required"** - Ensure `auth.ts` has hardcoded Convex site URL
3. **Customer paid but still shows trial** - Use `/setSubscriptionStatus` endpoint to fix manually
4. **"Manage Subscription" button missing** - Set `stripeCustomerId` via admin endpoint

**Manual Fix Process for Stuck Customers:**
1. Check admin dashboard for customer status
2. Find customer ID in Stripe Dashboard (starts with `cus_`)
3. Run: `curl "https://rightful-rabbit-333.convex.site/setSubscriptionStatus?email=EMAIL&status=active&stripeCustomerId=cus_XXX&key=..."`
4. Send confirmation email manually if needed
5. In Stripe, delete duplicate customer records to prevent multiple billing

**URLs Configured:**
- Success URL: `https://getsafetube.com/admin?session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `https://getsafetube.com/admin?canceled=true`
- Portal return URL: `https://getsafetube.com/admin`

### V2.6 - Blocked Search Notifications (TODO)
**Current State:** Content filter blocks inappropriate searches client-side only. Kids see friendly error message but parents are NOT notified.

**FAQ Claim:** "What if they search for something inappropriate? You get notified instantly."

**TODO to match FAQ:**
- [ ] Add `blockedSearches` table to schema
- [ ] Create `logBlockedSearch` mutation (kidProfileId, query, blockedKeyword, timestamp)
- [ ] Update KidHome.jsx to call mutation when search is blocked
- [ ] Add blocked searches query to parent dashboard
- [ ] Show blocked searches in kid activity/stats section
- [ ] Optional: Send real-time push notification to parent

### V3 - Additional Features
- [ ] Screen time scheduling
- [ ] Watch history for parents
- [ ] Multiple devices support
- [ ] Push notifications for requests
- [ ] Age-appropriate content filtering
