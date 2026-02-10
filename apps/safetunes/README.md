# SafeTunes - Parent-Controlled Music Streaming App

## Overview
A web-based application that allows parents to whitelist specific Apple Music albums for their children. Parents get an admin interface to search and approve content; kids get a simple player showing only approved albums.

## Problem Statement
Apple Music's parental controls only filter explicit content, but don't allow parents to whitelist specific albums. Parents need granular control over what their children can access - not just explicit vs. clean, but album-by-album approval.

## Target Users
- Homeschool families
- Christian/conservative families
- Parents with children ages 5-14
- Any parent wanting granular control over music content

## Product Components

### 1. Admin Dashboard (Parent Interface)
**URL:** `/admin`

**Features:**
- Password protected login
- Search Apple Music catalog (using MusicKit JS API)
- Display search results with:
  - Album artwork
  - Artist name
  - Album title
  - Year released
  - Track count
- "Approve" button for each search result
- View all currently approved albums in a grid
- "Remove" button to revoke access to albums
- Search/filter approved albums list
- Support for multiple kid profiles (separate approval lists per child)

**Nice-to-have features for later:**
- Preview 30-second clips before approving
- Bulk approve by artist
- Community-sourced safe lists
- Age-based templates

### 2. Player Interface (Kid Interface)
**URL:** `/play`

**Features:**
- Kid profile selection (if multiple kids)
- Display only parent-approved albums in a grid
- Album artwork prominently displayed
- Click album to see track listing
- Playback controls using MusicKit JS
- Simple, clean, kid-friendly UI
- Apple Music authentication (one-time OAuth)
- No search functionality - only browse approved content

**Nice-to-have features for later:**
- Request feature (kid requests album, parent gets notification)
- Recently played section
- Shuffle all approved songs

### 3. Backend/Database

**Approved Albums Storage:**
- Album ID (Apple Music identifier)
- Album name
- Artist name
- Date approved
- Kid profile ID (which kid this is approved for)
- Album artwork URL

**Kid Profiles:**
- Profile name
- Profile ID
- Optional: avatar/color

**Technology Options:**
- Firebase Realtime Database (free tier, real-time updates)
- Google Sheets + Sheets API (simplest, may be slower)
- Supabase (PostgreSQL, free tier)

**Recommendation:** Start with Firebase for real-time updates and easy scaling

## Technical Architecture

### Frontend
- **Framework:** React (or plain HTML/CSS/JS if preferred)
- **Styling:** Tailwind CSS for quick, clean UI
- **Music API:** MusicKit JS (Apple Music web API)
- **Hosting:** Vercel, Netlify, or GitHub Pages (all free tier options)

### Backend
- **Database:** Firebase Realtime Database
- **Authentication:** Simple password protection for admin (can use Firebase Auth)
- **API:** Firebase SDK for read/write operations

### Apple Music Integration
- **Required:** Apple Developer Account ($99/year)
- **API:** MusicKit JS
- **Authentication:** Users authenticate with their Apple Music account via OAuth
- **Requirements:** Users must have active Apple Music subscription

## Development Phases

### Phase 1: MVP (Minimum Viable Product)
1. Set up Apple Developer account and MusicKit credentials
2. Build admin dashboard:
   - Search Apple Music
   - Approve albums
   - View/remove approved albums
3. Build player interface:
   - Display approved albums only
   - Basic playback functionality
4. Set up Firebase database
5. Deploy to web hosting
6. Test with own family (Bella on Chromebook via Family Link)

### Phase 2: Beta Testing
1. Invite 10-20 families to test for free
2. Gather feedback
3. Fix bugs and iterate
4. Add kid profiles support

### Phase 3: Launch
1. Set up payment processing (Stripe)
2. Build pricing/signup page
3. Implement 30-day money-back guarantee
4. Launch to small audience (homeschool groups, etc.)

### Phase 4: Scale & Enhance
1. Add Spotify support
2. Community features (shared safe lists)
3. Request/approval workflow
4. Mobile app versions
5. Listening analytics for parents

## Pricing

**Single Tier:**
- $7.99/month or $69/year
- Unlimited kids
- Unlimited approved albums
- All features
- 30-day money-back guarantee

**No free tier** - keeps it simple, focuses on serious customers

## Business Model

### Costs
- Apple Developer Account: $99/year
- Hosting: $0-20/month (free tier initially)
- Payment processing: ~3% per transaction
- **Total annual operating cost:** ~$100-300/year

### Revenue Projections
- 50 families: $4,794/year
- 200 families: $19,176/year
- 500 families: $47,940/year

### User Requirements
- Active Apple Music subscription (family plan recommended)
- Web browser (Chrome, Safari, Firefox)
- Internet connection

## Marketing Strategy (Post-Launch)

### Target Channels
- Homeschool Facebook groups
- Christian parenting blogs/podcasts
- Reddit: r/homeschool, r/christianparents
- Teachers Pay Teachers
- Church/school newsletters
- Word of mouth in existing networks

### Value Proposition
"Complete control over what your kids hear on Apple Music. Search, approve, done. Less than a Netflix subscription for peace of mind."

## Technical Requirements for Developer

### Knowledge Needed
- JavaScript/React basics
- MusicKit JS API documentation
- Firebase setup and integration
- Basic CSS for UI
- Stripe integration (for payments, Phase 3)

### Development Environment
- Code editor (VS Code)
- Node.js and npm
- Git for version control
- Apple Developer account access

### Key Documentation Links
- MusicKit JS: https://developer.apple.com/documentation/musickit/musickit-js
- Firebase: https://firebase.google.com/docs
- Stripe: https://stripe.com/docs

## Success Metrics

### MVP Success
- Works reliably for own family (Bella)
- Can approve/remove albums without bugs
- Playback works smoothly on Chromebook
- Parent can manage from phone

### Beta Success
- 10+ families actively using it
- Positive feedback on core functionality
- <5 major bugs reported
- Parents would pay for it

### Launch Success
- 50 paying customers in first 3 months
- <10% churn rate
- Positive word-of-mouth referrals
- Revenue covers costs + development time

## Future Hardware Extension (Phase 5+)
Once web app is proven, build dedicated Raspberry Pi music player:
- Raspberry Pi Zero 2 W or Pi 4
- 5-7" touchscreen
- Custom 3D printed case
- Boots directly into player interface
- Portable with battery option

**Hardware cost estimate:** $150-250 per unit

## Next Steps for Development

1. **Set up Apple Developer account** - apply for MusicKit access
2. **Create Firebase project** - set up database structure
3. **Build admin search interface** - implement MusicKit JS search
4. **Build approval system** - save approved albums to Firebase
5. **Build player interface** - fetch and display approved albums only
6. **Test authentication flow** - ensure Apple Music OAuth works
7. **Deploy to hosting** - get it live for testing
8. **Lock down Chromebook** - Family Link whitelist for testing with Bella

## Questions to Resolve During Development

- Should kids be able to see album track listings before playing?
- How often should approved list refresh? (Real-time vs on page load?)
- Should there be a "favorites" feature within approved albums?
- Need parental notifications when kid plays music?
- Should there be listening time limits built in?

---

## Development Timeline Estimate
- **Week 1-2:** Apple setup, Firebase setup, admin dashboard with search
- **Week 3:** Player interface and playback functionality  
- **Week 4:** Testing, bug fixes, deployment, Family Link testing with Bella
- **Week 5-6:** Beta testing with other families (optional before paid launch)

**Total MVP:** 3-4 weeks part-time development

---

## Recent Updates

### November 2025 - PRODUCTION LAUNCH 🚀

**SafeTunes is now LIVE at https://getsafetunes.com**

#### Launch Features:
- **Domain:** getsafetunes.com with SSL/HTTPS
- **Pricing:** $4.99/month with 7-day free trial
- **Coupon System:** DAWSFRIEND code for free lifetime access
- **SEO Optimized:** Meta tags, sitemap, robots.txt
- **Production Backend:** Convex deployed to https://formal-chihuahua-623.convex.cloud

#### Key Updates:
- **Landing Page:** Personal founder story, updated pricing, mobile-optimized
- **Admin Dashboard:** Clean desktop navigation, Support tab inline with main nav
- **Settings:** Logout moved to Settings, whitelist instructions corrected to entire domain
- **Signup Flow:** Coupon code input with automatic lifetime subscription for valid codes
- **Database:** Added couponCode field, subscriptionStatus includes "lifetime" option

#### Technical Infrastructure:
- **Hosting:** Vercel with SPA routing configuration (vercel.json)
- **Backend:** Convex production deployment
- **Payment:** Stripe integration ready (not yet enabled)
- **Routes:** All routes working (/play, /admin, /login, /signup, /support)

### January 2025 - Recent Activity & Kid Dashboard Enhancements
- **Recent Activity Tracking**: Parent dashboard now shows last 3 songs played per kid profile
  - Full activity modal shows up to 50 recently played songs
  - Tracks songs played from album track lists and player controls
  - Automatic tracking when songs change (play, skip, auto-advance)
- **Kid Filter in Library**: Added dropdown to filter library view by specific kid profile
- **Removed Kids Tab**: Consolidated navigation - Kids tab removed from desktop, filter added to Library instead
- **Artwork Display Fixes**: Fixed broken album artwork in recent activity (Apple Music URL template handling)
- **Support Page Updates**: Updated all device setup guides to use correct domain (getsafetunes.com)
- **Kid Login Helper**: Added banner to landing page directing users to `/play` for child device setup

### Family Code System (November 2024)
- **6-Character Family Codes**: Auto-generated unique codes for kid login (e.g., TUNE42)
- **Dedicated /play Route**: Kids enter family code, select profile, enter PIN
- **Security Model**: Kids cannot access parent dashboard or marketing pages
- **Settings Integration**: Family code displayed prominently with copy button
- **Database Schema**: Added familyCode field with indexing for fast lookups

### Documentation Updates
- Updated all setup documentation to reflect `/play` as the kid login URL
- Fixed typos in support documentation (getgetsafetunes.com → getsafetunes.com)
- Chromebook, iPad/iPhone, Android, and Kindle Fire guides now reference getsafetunes.com/play
- Added PRODUCTION_CHECKLIST.md for launch readiness tracking

### Database Configuration (Verified November 17, 2025)
- **Production:** `https://formal-chihuahua-623.convex.cloud` (Live at getsafetunes.com)
- **Development:** `https://reminiscent-cod-488.convex.cloud` (Local testing)
- **Status:** Production is LIVE with real users!
- **Current Users:** 7 family member accounts (jedaws@gmail.com, jdaws47@gmail.com, Hudson.daws@gmail.com, jdaws@artiosacademies.com, jeremiah@3djumpstart.com, metrotter@gmail.com, gwdaws@gmail.com)
- **Current Kids:** 7 kid profiles (Brady, Claire, Ethan, Joe Jr., Brad, Isabella, Sara)

### ⚠️ Important: CLI Caching Issue Discovered
- Convex CLI (`npx convex run`) can return stale/cached data
- **Always verify production data with HTTP API:**
  ```bash
  curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
    -H 'Content-Type: application/json' \
    -d '{"path":"findKids:findAllKids","format":"json","args":[{}]}'
  ```
- See DATABASE_STATUS.md for full troubleshooting guide

---

## Current Status

**✅ SOFT LAUNCH READY**

The app is fully functional and deployed to production. You can start sharing with friends/family using the **DAWSFRIEND** coupon code for free lifetime access.

**Next Steps:**
1. Create favicon and social share images
2. Add Privacy Policy and Terms of Service
3. Enable Stripe payment processing
4. Launch marketing campaigns

---

*Built by a teacher, fun uncle, and soon-to-be stepdad who wanted better for the kids in his life.*
