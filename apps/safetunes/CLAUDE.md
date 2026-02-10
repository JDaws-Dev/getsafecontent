# SafeTunes Coding Standards & Guidelines

## Project Overview
SafeTunes is a React/Vite/Convex web application that helps parents manage and approve music content for their children using Apple Music.

## Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Convex (real-time database)
- **Authentication**: Better Auth + bcrypt for password hashing, PIN-based kid authentication
- **Music API**: Apple MusicKit
- **Payment**: Stripe
- **Deployment**: Vercel

## Production Infrastructure

### Convex Deployments
- **Production**: `formal-chihuahua-623` (used by getsafetunes.com / safetunes.app)
- **Development**: `reminiscent-cod-488` (used for local development)

### Admin Dashboard (ALWAYS USE THIS FOR USER DATA)
```
https://formal-chihuahua-623.convex.site/adminDashboard?key=<ADMIN_KEY_URL_ENCODED>
```

To get user count via CLI:
```bash
curl -s "https://formal-chihuahua-623.convex.site/adminDashboard?key=<ADMIN_KEY_URL_ENCODED>" | grep -c '@'
```

### CRITICAL: Convex CLI Returns Stale Data
The Convex CLI (`npx convex data`, `npx convex run`) often returns **outdated/cached data**.

**DO NOT TRUST** for production user counts:
```bash
# These commands return STALE data - do not use for accurate counts
npx convex data users
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex run admin:getAllUsersWithKids '{}'
```

**ALWAYS USE** the admin dashboard HTTP endpoint above for real-time data.

### Deploying to Production
```bash
# Deploy Convex functions to production
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy

# Deploy frontend to Vercel
npm run build && vercel --prod
```

## Recent Updates

### Stripe Webhook Fix & Admin Tools (January 1, 2026)
Fixed critical issue where Stripe webhooks were returning 200 even when mutations failed, causing customers like Chad Watson to get stuck in "trial" status despite paying.

**The Problem:**
- Chad Watson tried to subscribe 3 times, creating 3 Stripe customer records
- Webhooks returned 200 OK but subscription status wasn't updating in SafeTunes
- `subscriptionEvents` table was empty (logging was failing silently)
- Customer was stuck seeing "trial has ended" despite payment

**Root Cause:**
- Webhook handler had no try/catch around event processing
- If any mutation failed, it failed silently and still returned 200
- Stripe thought webhook succeeded, so it didn't retry

**The Fix (`convex/stripe.ts`):**
1. **Proper error handling** - Each mutation wrapped in try/catch
2. **Critical operations return 500 on failure** - Stripe will retry
3. **Non-critical operations don't block** - Email failures don't prevent subscription updates
4. **Better logging** - Detailed console logs for every operation

**New Admin HTTP Endpoints:**

1. **Set Subscription Status** (for paying customers):
```bash
curl "https://formal-chihuahua-623.convex.site/setSubscriptionStatus?email=user@example.com&status=active&key=YOUR_KEY"
# Valid statuses: trial, active, lifetime, cancelled, expired
```

2. **Grant Lifetime** (for promo codes):
```bash
curl "https://formal-chihuahua-623.convex.site/grantLifetime?email=user@example.com&key=YOUR_KEY"
```

**New Internal Mutations (`convex/users.ts`):**
- `grantLifetimeByEmailInternal` - Sets status to "lifetime"
- `setSubscriptionStatusByEmailInternal` - Sets any status

**Key Files Modified:**
- `convex/stripe.ts` - Complete rewrite with proper error handling
- `convex/users.ts` - Added internal mutations
- `convex/setSubscriptionStatus.ts` - New HTTP endpoint
- `convex/http.ts` - Added route for setSubscriptionStatus

**Manual Fix Process for Stuck Customers:**
1. Check admin dashboard for customer status
2. If stuck, use `/setSubscriptionStatus` endpoint to fix
3. In Stripe, delete duplicate customer records to prevent multiple billing

### iOS App Store Login Fix (December 15, 2025)
Fixed critical login bug that caused Apple to reject the iOS app.

**The Problem:**
- Login worked in Safari but failed in iOS app WebView on fresh install
- After `signIn.email()` succeeded, the page showed an error before redirect
- Apple tested on iOS 26.x and saw "error appears when attempting to login"

**Root Cause:**
- LoginPage waited for `useEffect` to detect session changes before navigating
- Race condition: page could error out before redirect happened
- Fresh WebView installs hit this issue; cached sessions masked the bug

**The Fix (`src/pages/LoginPage.jsx`):**
```javascript
// After successful login, navigate immediately instead of waiting for useEffect
const result = await signIn.email({ email, password });
if (!result.error) {
  localStorage.setItem('safetunes_remembered_email', formData.email);
  navigate('/admin');  // Navigate immediately - don't wait for session useEffect
}
```

**Also improved:**
- Better error messages for network/fetch/timeout errors
- More specific credential error handling

**iOS App Push Notifications (Disabled):**
- Push notification prompt was showing on app launch before login
- Disabled in `SafeTunesApp_2.0/SafeTunesApp/App.tsx` for cleaner UX
- TODO: Re-enable after login, request permission in context

### Global Hide Artwork Feature (December 16, 2025)
Added a master toggle for parents to hide ALL album artwork across the app.

**Feature:**
- New "Content Controls" section in Settings
- "Hide All Album Artwork" toggle switch
- When enabled, replaces all artwork with music note placeholders
- Individual per-album hide settings are preserved and restored when global toggle is off

**Technical Implementation:**
- Added `globalHideArtwork` field to `users` table in schema
- Added `setGlobalHideArtwork` mutation in `convex/users.ts`
- Child dashboard queries parent user to get global setting
- All `shouldHideArtwork` functions check global setting first

**Key Files:**
- `convex/schema.ts`: Added `globalHideArtwork` to users table
- `convex/users.ts`: Added `setGlobalHideArtwork` mutation
- `src/components/admin/Settings.jsx`: New Content Controls section with toggle
- `src/components/child/ChildDashboard.jsx`: Updated all artwork visibility functions
- `src/components/child/DiscoveryPage.jsx`: Added `globalHideArtwork` prop support

**Usage:**
1. Parent goes to Settings → Content Controls
2. Toggles "Hide All Album Artwork" on/off
3. Changes take effect immediately for all kids

### Playlist Import Library ID Fix (December 16, 2025)
Fixed 404 errors when importing playlists from user's Apple Music library.

**The Problem:**
Library playlists contain tracks with library album IDs (like `l.6GiGz1u`) instead of catalog IDs. These library IDs are user-specific and return 404 when queried via the catalog API.

**The Fix:**
1. Detect library album IDs (start with `l.`)
2. Batch lookup songs via catalog API with `include: 'albums'` to get catalog album IDs
3. Update tracks with resolved catalog album IDs before processing

**Code Changes in `PlaylistImport.jsx`:**
```javascript
// Mark library album IDs for resolution
const isLibraryAlbumId = albumId && albumId.startsWith('l.');
return {
  ...trackData,
  albumId: isLibraryAlbumId ? null : albumId,
  catalogSongId: catalogId,
  needsAlbumResolution: isLibraryAlbumId,
};

// STEP 0.5: Resolve album IDs via song catalog lookup
const tracksNeedingResolution = tracks.filter(t => t.needsAlbumResolution);
// Batch lookup songs to get their album relationships
const result = await musicKitService.music.api.music(
  `/v1/catalog/us/songs`,
  { ids: batch.join(','), include: 'albums' }
);
```

**Also Added:**
- Validation that kidIds are actual kid profile IDs (not user IDs)
- Better error logging for debugging playlist creation issues

### Android TWA & Google Play Store Submission (December 14, 2025)
Built and submitted Android app to Google Play Store using Trusted Web Activity (TWA).

**TWA Configuration:**
- Package: `com.getsafetunes.twa`
- Built with Bubblewrap CLI (version 3)
- Start URL: `/` (redirects to `/app` when detected as TWA)
- Digital Asset Links configured at `/.well-known/assetlinks.json`

**TWA Detection:**
```javascript
// Detect Android TWA - runs in standalone mode without browser UI
const isNativeApp = window.matchMedia('(display-mode: standalone)').matches && /Android/.test(navigator.userAgent);
```

**Components Updated for TWA:**
- `CookieConsent.jsx`: Hidden in TWA (no tracking in native apps)
- `FacebookPixel.jsx`: Disabled in TWA
- `GoogleAds.jsx`: Disabled in TWA
- `App.jsx`: Root route redirects to `/app` in TWA

**Account Deletion Page (Google Play Requirement):**
- Created `/delete-account` route with `DeleteAccountPage.jsx`
- Email: jeremiah@getsafetunes.com
- Lists data retention policy (what's deleted vs retained)
- URL: `https://getsafetunes.com/delete-account`

**Google Play Console Setup Completed:**
- Identity verification: Approved
- Android device verification: Required via Play Console mobile app
- Content ratings: Everyone/All ages (IARC)
- Data safety declaration: Completed
- Target audience: 13+
- App access: Login credentials provided for reviewers

**Data Types Declared:**
- Personal Info: Name, Email address
- App Activity: App interactions, In-app search history
- App Info and Performance: Crash logs, Diagnostics

**Important Notes:**
- Subscriptions are NOT purchasable in the TWA (payment UI hidden)
- Test accounts must be created via actual signup flow (Better Auth uses separate tables)
- First-time app review: 3-7 days typical

**Key Files:**
- `android-twa/twa-manifest.json`: TWA configuration
- `src/pages/DeleteAccountPage.jsx`: Account deletion page
- `src/hooks/useIsNativeApp.js`: Native app detection hook

### Kid-Specific Song Approval Enforcement (December 12, 2025)
Critical fix to prevent orphaned songs/albums without `kidProfileId`.

**The Problem:**
Songs and albums were being approved without a `kidProfileId`, causing:
- Music showing up for wrong kids
- Songs appearing in listening history for kids who shouldn't have them
- Orphaned records that couldn't be properly managed

**Backend Fix - `convex/songs.ts`:**
```typescript
// CRITICAL: Library songs (non-featured) MUST have a kidProfileId
// Only Discover songs (featured=true) can skip kidProfileId
if (args.featured !== true && !args.kidProfileId) {
  throw new Error("kidProfileId is required for library songs. Each song must be approved for a specific kid.");
}
```

**Frontend Fixes:**
- `MusicLibrarySeparate.jsx`: Refactored `handleToggleSong` and `handleSelectAll` to use `toggleSongForKid` and `bulkAssignSongsToKid` instead of `approveSong`
- `AlbumRequests.jsx`: Added `kidProfileId: request.kidProfileId` when approving individual tracks from album requests
- Removed unused `approveSong` import from MusicLibrarySeparate.jsx
- Removed unused `LibraryiTunes` import from AdminDashboard.jsx

**Data Model Rule:**
- Every library song MUST have a specific `kidProfileId`
- If parent selects "all kids", create SEPARATE records for EACH kid
- Only Discover songs (`featured=true`) can skip `kidProfileId` (they use `featuredForKids` array instead)

**Migration Functions (in `convex/debug.ts`):**
- `analyzeNullKidProfiles`: Find songs/albums with null kidProfileId
- `fixNullKidProfileSongs`: Copy null songs to all kids, then delete originals
- `fixNullKidProfileAlbums`: Copy null albums to all kids, then delete originals

### Convex Deployment Frozen Fix (December 12, 2025)
When Convex deploy reports success but functions don't update, run:
```bash
npx convex dev --configure=existing --team jeremiah-daws --project applemusicwhitelist
```
This reinitializes the project connection and fixes the frozen deployment.

### AI Lyric Review - Religious Concerns Category (December 11, 2025)
Added new content category to flag religious/spiritual concerns in song lyrics.

**New Category: Religious/Spiritual Concerns**
- Using God's name in vain ("Oh my God", "God damn", "Jesus Christ" as exclamations)
- Irreverent or mocking references to God, Jesus, or religious figures
- Blasphemy or disrespectful treatment of religious concepts
- References to the devil, Satan, or demonic themes presented positively

**Technical Implementation:**
- Added to `convex/ai/contentReview.ts` prompt categories
- Added example in JSON format section with `category: "religious-concerns"`
- Cleared all 67 cached reviews to use updated prompt

### iOS App Store Compliance - Additional Fixes (December 11, 2025)
Additional fixes to ensure iOS app never shows payment-related content.

**Root Route Redirect:**
- When `checkIsNativeApp()` returns true, "/" redirects to "/play"
- Prevents iOS app from ever showing landing page with pricing

**Error Page Fix:**
- Error fallback "Go to Homepage" button now goes to "/play" in iOS app
- Button text changes to "Go Back" in iOS app

**Request Modal Artwork Hidden:**
- Kid request confirmation modal now shows music note icon instead of album artwork
- Prevents kids from seeing potentially inappropriate album covers before parent approval

**Login Page Text:**
- "Start free trial" link changed to "Sign up" in iOS app

**Key Files Modified:**
- `src/App.jsx`: Root route redirect, error fallback redirect
- `src/pages/LoginPage.jsx`: Conditional trial text
- `src/components/child/ChildDashboard.jsx`: Request modal artwork hidden

### Music Tab UX Improvements (December 11, 2025)
Major UX improvements to the Music tab (Library, Lists, Discover) in the Parent Admin dashboard.

**Optimistic UI Updates:**
- All artwork toggle buttons now update instantly (no waiting for server)
- Kid targeting buttons in Discover update instantly
- Error handling reverts UI if server call fails

**Ghost Rows for Partial Albums:**
- When viewing a partial album, fetches full track list from Apple Music
- Approved songs shown normally, unapproved songs as faded "ghost rows"
- Ghost rows have "+ Add" button for quick individual song approval
- Tracks sorted by track number for proper album order
- Loading indicator while fetching tracks

**Per-Kid Discover Pool Targeting:**
- Added "Who can see this in Discover?" section to album detail
- "All Kids" button or individual kid toggles with assigned colors
- Allows families with age gaps to have separate Discover pools

**Playlist Management in Lists Tab:**
- Added three-dot menu to each playlist card
- Rename option with prompt dialog
- Delete option with confirmation
- Menus auto-close when opening a new one

**Technical Implementation:**
```javascript
// Ghost rows for partial albums
const approvedIds = new Set(selectedAlbum.approvedSongs?.map(s => s.appleSongId) || []);
const unapprovedTracks = fullAlbumTracks.filter(t => !approvedIds.has(t.appleSongId));
const allTracks = [
  ...(selectedAlbum.approvedSongs || []).map(s => ({ ...s, isApproved: true })),
  ...unapprovedTracks.map(t => ({ ...t, isApproved: false })),
].sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

// Optimistic update pattern
onClick={() => {
  const newValue = !currentValue;
  setLocalState(prev => ({ ...prev, field: newValue })); // Instant UI update
  serverMutation({ field: newValue }).catch(error => {
    setLocalState(prev => ({ ...prev, field: !newValue })); // Revert on error
  });
}}
```

**Key Files Modified:**
- `src/components/admin/MusicLibrarySeparate.jsx`: All Music tab improvements

### iOS App Store Compliance & Onboarding Simplification (December 11, 2025)
Made SafeTunes iOS app compliant with Apple App Store guidelines and simplified onboarding.

**iOS App Detection (`useIsNativeApp` hook):**
- Detects if running inside React Native WebView wrapper
- Detection methods: `window.isSafeTunesApp`, `window.isInSafeTunesApp`, or user agent contains "SafeTunesApp"
- Used to hide payment/subscription UI in iOS app

**Signup Page Changes for iOS:**
- Header changes from "Start Your Free Trial" to "Create Your Account"
- Subtext changes from "7 days free. No credit card required." to "Get started with SafeTunes"
- Promo code field hidden (implies payment)
- "No credit card / Cancel anytime" trust signals hidden
- "$4.99/month after your trial" pricing hidden
- Trial expiration error messages hidden

**Onboarding Simplified (Step 3 - Create Kid Profiles):**
- Removed: Age Range, Favorite Genres, Favorite Artists, Music Preferences
- Kept: Name, Color Theme, 4-Digit PIN (optional), Daily Listening Limit
- Default daily limit: 1 hour
- Daily limit options: 30 min, 1 hour, 2 hours, 3 hours, Unlimited

**Family Code UX Improvement:**
- Purple highlighted button (was gray) to draw attention
- "Your kid's login code" helper text below button
- Improved toast: "Copied! Go to getsafetunes.com/play on your kid's device and enter this code."

**Technical Implementation:**
```javascript
// useIsNativeApp.js
function checkIsNativeApp() {
  return window.isSafeTunesApp === true ||
         window.isInSafeTunesApp === true ||
         /SafeTunesApp/.test(navigator.userAgent);
}

// Daily limit options
const DAILY_LIMIT_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 0, label: 'Unlimited' },
];

// createKidProfile now accepts dailyLimitMinutes
await createKidProfile({
  userId, name, avatar, color, pin,
  dailyLimitMinutes: kid.dailyLimitMinutes || undefined,
});
```

**Key Files Modified:**
- `src/hooks/useIsNativeApp.js`: New hook for iOS app detection
- `src/pages/SignupPage.jsx`: Conditional UI based on `isNativeApp`
- `src/pages/OnboardingPage.jsx`: Simplified kid profile form
- `convex/kidProfiles.ts`: Added `dailyLimitMinutes` parameter, maps to `dailyTimeLimitMinutes`
- `src/components/admin/ParentDashboardHome.jsx`: Improved family code UX

### Requests Tab & Live Activity UX Improvements (December 11, 2025)
Improved visibility of kid information in requests and activity feed.

**Request Cards - Kid Name Always Visible:**
- Kid name and colored avatar now visible on mobile (previously hidden)
- Name truncated to 60px max on mobile to prevent overflow
- Colored avatar circle always shows for quick identification

**Live Family Activity - Artist Name Prominent:**
- Requests now show artist name as main content (was showing album name)
- Album/song name displayed as subtitle below artist
- Both album requests AND song requests now appear in activity feed
- More useful at-a-glance view for parents

**Technical Implementation:**
```jsx
// Request card kid profile - always visible
<div className="flex items-center gap-1">
  <div className={`w-4 h-4 rounded-full ${colorClass} flex-shrink-0`}>
    {avatarSvg}
  </div>
  <span className="truncate max-w-[60px] sm:max-w-none">{kidProfile.name}</span>
</div>

// Activity feed - artist prominent with album subtitle
pendingRequests.forEach((req) => {
  const hasArtist = req.artistName && req.artistName.trim();
  activities.push({
    content: hasArtist ? req.artistName : req.albumName,
    subtitle: hasArtist ? req.albumName : null,
  });
});
```

**Key Files Modified:**
- `src/components/admin/RequestsView.jsx`: Removed `hidden sm:flex` from kid profile section
- `src/components/admin/ParentDashboardHome.jsx`: Artist name as content, album as subtitle, added song requests

### Library Tab UX Refactor (December 11, 2025)
Major refactor of the Library and Discover tabs to improve scalability and reduce visual clutter.

**Library Tab - Navigation Rows (Replaced Accordions):**
- Removed expandable accordion sections that didn't scale well
- Added clean tappable navigation rows: "Artists (X) >", "Genres (X) >", "Albums (X) >", "Songs (X) >"
- Each row navigates to a dedicated full-screen list view

**New Dedicated List Views:**
- `artists-list`: Scrollable list with avatar circles showing first letter
- `genres-list`: List with genre icons and album counts
- `albums-list`: Grid view with sort dropdown (Recent, A-Z, By Artist)
- `songs-list`: List view with kid toggles and three-dot menus

**Album Detail View Refactor:**
- Compact header: Smaller artwork (80px), single-line metadata
- Clean action row: Icon buttons for Review, Visibility toggle, Delete, Settings
- Removed duplicate bottom action buttons (Hide Artwork, Remove Album)
- Simplified bulk assignment: "Assign all to: (M) (G)" compact row above song list

**Three-Dot Menu on Song Rows:**
- Added to both Album Detail and Songs List views
- Menu options: AI Review, View in Apple Music (opens song page), Remove Song
- Closes other menus when opening a new one

**Kid Toggle Improvements:**
- Active state: Shows checkmark (✓) inside colored circle
- Inactive state: Shows initial letter with dashed border
- More unambiguous visual feedback for access status

**Discover Tab - Dismissible Banner:**
- Added X button to close the "Discover Pool" explanation header
- Dismissal persisted in sessionStorage (returns on next session)
- Smaller/more compact banner design

**Technical Implementation:**
```jsx
// New library views
const [libraryView, setLibraryView] = useState('home');
// Values: 'home', 'artists-list', 'genres-list', 'albums-list', 'songs-list', 'artist', 'genre', 'album'

// Discover banner dismissal
const [discoverBannerDismissed, setDiscoverBannerDismissed] = useState(() => {
  return sessionStorage.getItem('discoverBannerDismissed') === 'true';
});

// Kid toggle with checkmark
{hasAccess ? (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
) : (
  kid.name.charAt(0).toUpperCase()
)}
```

**Key Files Modified:**
- `src/components/admin/MusicLibrarySeparate.jsx`: All Library/Discover tab changes

**Bundle Size Impact:**
- AdminPage bundle reduced from 490KB to 474KB by removing duplicate UI elements

### Parent Dashboard Song Preview Popup (December 11, 2025)
Added consistent song preview functionality across all parent dashboard components with a centered popup player.

**Components Updated:**
- `AddMusic.jsx` - Search results song preview
- `AlbumInspector.jsx` - Album track preview
- `PlaylistInspector.jsx` - Playlist track preview

**Preview Popup Features:**
- Dark gradient background (gray-900 to gray-800)
- Track artwork with music note fallback
- Song name and artist display
- Seekable progress bar with scrubber thumb on hover
- Time display (current / duration)
- "Done" button to stop and close
- Backdrop click also stops and closes

**Technical Implementation:**
```jsx
// State variables for preview
const [playingTrackId, setPlayingTrackId] = useState(null);
const [playingTrackMeta, setPlayingTrackMeta] = useState(null);
const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
const [previewDuration, setPreviewDuration] = useState(0);

// For MusicKit-based playback (AddMusic, AlbumInspector):
useEffect(() => {
  if (!playingTrackId) return;
  const handleTimeUpdate = () => {
    const state = musicKitService.getPlaybackState();
    if (state) {
      setPreviewCurrentTime(state.currentPlaybackTime || 0);
      setPreviewDuration(state.currentPlaybackDuration || 0);
    }
  };
  musicKitService.addEventListener('playbackTimeDidChange', handleTimeUpdate);
  return () => musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
}, [playingTrackId]);

// For HTML Audio-based playback (PlaylistInspector):
audio.ontimeupdate = () => {
  setPreviewCurrentTime(audio.currentTime);
  setPreviewDuration(audio.duration || 0);
};
```

**Removed Global MusicPlayer:**
- Removed `<MusicPlayer />` from `AdminDashboard.jsx`
- This was causing a duplicate bottom player when previewing songs
- Now only the centered popup player appears

**Key Files Modified:**
- `src/components/admin/AddMusic.jsx`: Preview state, handlers, popup modal
- `src/components/admin/AlbumInspector.jsx`: MusicKit playback with popup
- `src/components/admin/PlaylistInspector.jsx`: HTML Audio playback with popup
- `src/components/admin/AdminDashboard.jsx`: Removed MusicPlayer import and usage

### AI Album Review Fix (December 11, 2025)
Fixed ArgumentValidationError when running AI album review from AlbumInspector.

**Issue:**
- `trackList` was passing `isExplicit: true/false` but validator only accepts `name`, `artistName`, `contentRating`
- Error: "Object contains extra field `isExplicit` that is not in the validator"

**Fix:**
Changed in `AlbumInspector.jsx` line 865-869:
```javascript
// Before (broken):
const trackList = tracks.map(t => ({
  name: t.name,
  artistName: t.artistName,
  isExplicit: t.isExplicit || false,  // ❌ Not in validator
}));

// After (fixed):
const trackList = tracks.map(t => ({
  name: t.name,
  artistName: t.artistName,
  contentRating: t.isExplicit ? 'explicit' : null,  // ✅ Correct field
}));
```

### Getting Started Page UX Improvements (December 11, 2025)
Major improvements to the Getting Started page based on UI/UX evaluation for overwhelmed parents.

**New Features:**
- **QR Code**: Scannable QR code for `getsafetunes.com/play` so parents don't have to type URLs on kid's device
- **Progress Checkboxes**: Steps 1 and 2 are clickable to mark as completed, persisted in localStorage
- **Time Estimate**: "Setup takes about 5-10 minutes" in header with clock icon
- **Native iPhone App**: Prominent link to App Store download with purple gradient background

**Improved Instructions:**
- iOS Step 6 clarified: "Delete ALL websites in the list by swiping left on each one (Apple pre-adds sites like Discovery Kids - remove them all)"
- Android: Added yellow prerequisite box with "Set up Family Link" external link to `families.google.com/familylink`
- Fixed "Shar" typo to "Share" in home screen tip

**Expanded Troubleshooting:**
- "Where's my Family Code?" - explains it's at top of page and in Settings
- "Setting up multiple devices" - repeat Step 1, same Family Code for all
- "Multiple kids in the family" - separate profiles with different music
- "Kid keeps getting logged out" - use Safari/Chrome (not private mode), add to home screen

**What's Next Section:**
- Items are now clickable buttons that navigate to appropriate tabs
- "Add Kid Profiles" and "Connect Apple Music" → Settings tab
- "Start Approving Music" → Add Music tab

**Technical Implementation:**
```jsx
// Progress tracking persisted in localStorage
const [completedSteps, setCompletedSteps] = useState(() => {
  const saved = localStorage.getItem('safetunes_setup_progress');
  return saved ? JSON.parse(saved) : {};
});

// QR Code using external API
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=7c3aed`;

// Navigation to tabs
onNavigateToTab?.('settings') // or 'add'
```

**Key Files Modified:**
- `src/components/admin/GettingStarted.jsx`: QR code, progress tracking, expanded troubleshooting, clickable What's Next
- `src/components/admin/AdminDashboard.jsx`: Pass `onNavigateToTab={setActiveTab}` to GettingStarted

### KidCard Smart Accordion (December 11, 2025)
Added expandable dropdown to Kid Cards on Parent Dashboard with detailed activity information.

**Smart Accordion Design:**
- Tap chevron to expand/collapse detailed view below each Kid Card
- Safety-first priority: blocked activity shows first if any exists
- Four expandable sections with conditional visibility

**Expandable Sections:**
1. **Safety Alert** (red background, conditional):
   - Only shows if `blockedCount > 0`
   - Red warning background with shield icon
   - Shows count of blocked searches in last 24 hours
   - "View blocked activity" link

2. **Quick Stats Row** (purple background):
   - Total plays count with play icon
   - Top 3 artists as compact pills (from listening stats)
   - Horizontal layout for space efficiency

3. **Recent History**:
   - "Now Playing" with green LIVE badge (if currently playing)
   - Last 4 plays as vertical list with timestamps
   - Shows song name, artist, and artwork
   - Uses `formatTimeAgo()` for relative timestamps

4. **Manage Profile & Limits Button**:
   - Purple button at bottom of expanded section
   - Deep navigates to Settings > Kid Profiles tab
   - Uses `onNavigateToTab('settings', { settingsSection: 'kids' })`

**Deep Navigation to Settings:**
- "Manage Profile & Limits" passes `settingsSection` option
- `AdminDashboard` stores `settingsSection` in state
- `Settings` component accepts `initialSection` prop
- `useEffect` updates active section when prop changes

**Technical Implementation:**
```jsx
// KidCard expand state
const [isExpanded, setIsExpanded] = useState(false);

// Real-time data queries
const recentActivity = useQuery(api.recentlyPlayed.getRecentlyPlayed, { kidProfileId: kid._id });
const listeningStats = useQuery(api.recentlyPlayed.getListeningStats, { kidProfileId: kid._id });

// Top artists extraction
const topArtists = listeningStats?.topArtists?.slice(0, 3) || [];
const totalPlays = listeningStats?.totalPlays || recentActivity?.length || 0;

// Navigate to specific settings section
const handleManageKidProfile = (kidId) => {
  onNavigateToTab?.('settings', { settingsSection: 'kids' });
};
```

**Key Files Modified:**
- `src/components/admin/ParentDashboardHome.jsx`: KidCard accordion UI, removed mock data
- `src/components/admin/Settings.jsx`: Added `initialSection` prop support
- `src/components/admin/AdminDashboard.jsx`: Added `settingsSection` state, updated Settings render

**Mock Data Removal:**
- Removed `MOCK_KIDS` constant
- Removed `MOCK_ACTIVITY` constant
- Kids list now uses only real Convex data from `kidProfiles` query
- Activity feed uses only real data from queries

### Parent Dashboard "Command Center" Refactor (December 11, 2025)
Simplified app architecture by removing Stats pages entirely and consolidating all critical data onto the Parent Dashboard.

**Design Philosophy:**
- Parent Dashboard is now the "Command Center" - one screen to see everything
- Removed separate Stats/Reporting pages to reduce navigation complexity
- All essential metrics visible at a glance on Kid Cards
- Emoji-based badges instead of charts for cleaner visual

**Kid Card Redesign:**
- 3 Key Metrics displayed inline:
  - 🕒 **Time Today**: Minutes listened with late night indicator (🌙 Moon icon for 10PM-6AM activity)
  - 🛡️/🛑 **Safety Status**: "Safe" or "X Blocked" count
  - ▶️ **Now Playing**: Current song (green) or "Active X ago" timestamp
- Lock/Access Toggle: iOS-style switch in top-right to pause music access
- Uses `musicPaused` field in kidProfiles with `setMusicPaused` mutation

**Navigation Cleanup:**
- Removed Stats tab from desktop navigation
- Removed Stats from mobile hamburger menu
- Removed ListeningStats component import from AdminDashboard
- Activity Feed no longer has "View All →" link (nowhere to navigate to)

**Late Night Activity Detection:**
```javascript
// Check if any recent plays were between 10PM-6AM
const hasLateNightActivity = useMemo(() => {
  if (!recentlyPlayed?.length) return false;
  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  return recentlyPlayed.some(item => {
    if (item.playedAt < last24Hours) return false;
    const hour = new Date(item.playedAt).getHours();
    return hour >= 22 || hour < 6;
  });
}, [recentlyPlayed]);
```

**Key Files Modified:**
- `src/components/admin/ParentDashboardHome.jsx`: KidCard emoji metrics, late night detection, removed View All link
- `src/components/admin/AdminDashboard.jsx`: Removed Stats tab, hamburger menu option, and ListeningStats import

**Removed Components/Features:**
- ListeningStats component no longer used in admin dashboard
- Stats tab content section removed
- handleViewStats function removed from ParentDashboardHome

### Kid Player Skip Button & Mobile Touch Fixes (December 11, 2025)
Fixed skip button disabled state and mobile touch highlight issues.

**Skip Button Queue Sync Fix:**
- Queue state now syncs automatically when playback state changes
- Previously queue was only updated when user opened queue modal
- Skip Next/Previous buttons now correctly reflect actual MusicKit queue
- Fixed issue where Next button was grayed out when playing from album

**Mobile Touch Highlight Fix:**
- Removed `hover:bg-white/10` from skip buttons (caused stuck highlight on mobile)
- Added `player-button` CSS class with comprehensive focus/tap removal
- Added `e.currentTarget.blur()` after button clicks
- Global `-webkit-tap-highlight-color: transparent` applied

**Volume Slider Improvements:**
- Added native volume change listener for iOS app hardware buttons
- Improved setVolume with clamping and logging

**Key Files Modified:**
- `src/components/child/ChildDashboard.jsx`: Queue state sync in updatePlayerState, native volume listener
- `src/components/child/KidPlayerComponents.jsx`: Removed hover states, added player-button class, blur on click
- `src/config/musickit.js`: Improved setVolume function
- `src/index.css`: New player-button CSS class, global tap highlight removal

### Kid Player Improvements & Bug Fixes (December 11, 2025)
Major improvements to the full screen player and album modal.

**Progress Bar Enhancements:**
- Larger touch target (24px invisible hit area) for easier mobile scrubbing
- Visible white scrubber thumb (16px circle) that scales up when dragging
- Smooth transitions for better visual feedback

**Skip Button Disable Logic:**
- Previous/Next buttons now gray out when nothing to skip to
- Disabled when: single track in queue, at end of queue (next), at start with <3s played (previous)
- Visual feedback: 30% opacity, `cursor-not-allowed`

**Sleep Timer Feature:**
- New Moon button in player bottom row opens SleepTimerModal
- Timer options: 5, 15, 30, 45, 60 minutes, or "End of Track"
- Visual countdown badge shows remaining time
- Auto-pauses playback when timer expires
- Proper cleanup on unmount

**Full Screen Player Animation:**
- Slide-up animation when opening player
- `isAnimatingOut` state for smooth close transition
- CSS keyframes for `player-slide-up`

**Album Detail Modal Overflow Fix:**
- Fixed horizontal scrolling on mobile with long song titles
- Added `overflow-hidden` to modal backdrop and header
- Added `overflow-x-hidden` to tracks scroll area
- Added `min-w-0` to track rows for proper text truncation
- Added `truncate` to album/artist names in header

**MarqueeText Component Redesign:**
- Bounce animation: scrolls to end, pauses, returns to start
- Text rests at the BEGINNING (not end) so title isn't cut off
- Runs 3 times then stops (not infinite)
- Animation keyframes:
  ```css
  @keyframes marquee-bounce {
    0%, 10% { transform: translateX(0); }      /* Start at beginning */
    40%, 60% { transform: translateX(-Xpx); }  /* Show end */
    90%, 100% { transform: translateX(0); }    /* Return to start */
  }
  ```

**Queue Improvements:**
- Better track name extraction with fallback chain
- Improved empty queue state with friendly illustration
- Unique key fallbacks for queue items

**Key Files Modified:**
- `src/components/child/KidPlayerComponents.jsx`: Progress bar, sleep timer, skip buttons, MarqueeText, empty states
- `src/components/child/ChildDashboard.jsx`: Sleep timer state, queue normalization, album modal overflow fixes

### Featured Playlists & Discover Enhancements (December 11, 2025)
Added Featured Playlists to Discover section and kid playlist copying feature.

**Featured Playlists System:**
- Parents can add Apple Music playlists to Discover (via PlaylistImport or search)
- Playlists stored in `featuredPlaylists` table with tracks in `featuredPlaylistTracks`
- Kid access control via `featuredForKids` array (empty = all kids)
- Playlists appear in Discover's "Featured Playlists" horizontal carousel

**PlaylistInspector Component:**
- New modal for reviewing playlists before adding to Discover
- AI safety scan using `reviewAlbumOverview` action (reused from albums)
- Track selection with explicit content filtering
- "Select Clean Only" quick filter
- Safety report modal shows flagged tracks with reasons

**Mood Browsing Includes Playlists:**
- Browse by Mood now shows matching playlists AND albums
- Playlists filtered by mood keywords (name, curator, description)
- Playlists displayed in horizontal scroll above album grid

**Add to Playlists Button (Kid Feature):**
- Green "Add to Playlists" button in Discover playlist detail view
- One-tap copies entire featured playlist to kid's own playlists
- Creates new playlist with same name and all songs
- Uses `createPlaylist` + `addSongsToPlaylist` mutations
- Loading spinner while copying

**Playlist/Album Modal Fix:**
- Fixed bug where tapping playlist/album from mood view didn't open detail
- `selectedAlbum` and `selectedPlaylist` checks now come BEFORE `selectedMood`
- Ensures modals/detail views show when tapped from any drill-down view

**Key Files:**
- `src/components/child/DiscoveryPage.jsx`: Featured playlists display, mood filtering, add to playlists
- `src/components/admin/PlaylistInspector.jsx`: New playlist review modal with AI safety scan
- `src/components/admin/PlaylistImport.jsx`: Updated to use PlaylistInspector
- `convex/featuredPlaylists.ts`: CRUD for featured playlists
- `convex/featured.ts`: Updated `getFeaturedContentForKid` to return playlists

**Database Schema:**
```typescript
// featuredPlaylists table
featuredPlaylists: defineTable({
  userId: v.id("users"),
  applePlaylistId: v.string(),
  playlistName: v.string(),
  curatorName: v.optional(v.string()),
  description: v.optional(v.string()),
  artworkUrl: v.optional(v.string()),
  trackCount: v.optional(v.number()),
  featuredForKids: v.optional(v.array(v.id("kidProfiles"))),
  hideArtwork: v.optional(v.boolean()),
  createdAt: v.number(),
})

// featuredPlaylistTracks table
featuredPlaylistTracks: defineTable({
  userId: v.id("users"),
  playlistId: v.id("featuredPlaylists"),
  appleSongId: v.string(),
  songName: v.string(),
  artistName: v.string(),
  albumName: v.optional(v.string()),
  artworkUrl: v.optional(v.string()),
  durationInMillis: v.optional(v.number()),
  trackNumber: v.number(),
  isExplicit: v.optional(v.boolean()),
  appleAlbumId: v.optional(v.string()),
})
```

### Logo Rebrand & Marketing Assets Update (December 10, 2025)
Updated all branding to use new shield/music note logo design.

**New Logo SVG Path (viewBox: 0 0 88.994 96.651):**
```svg
<path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
```

**Brand Colors:**
- Purple: `#9333ea`
- Pink: `#ec4899`
- Gradient: `linear-gradient(135deg, #9333ea 0%, #ec4899 100%)`

**Landing Page Updates:**
- Header logo: Updated to shield icon with gradient background (`w-7 h-7`)
- Hero badge icon: Updated to shield
- Hide Album Artwork section: Updated placeholder icon
- AI Lyric Review section: Updated icon
- Footer nav: Changed "Login" to "Parent Login" for consistency

**New/Updated Public Assets:**
- `public/favicon.svg`: 64x64 favicon with gradient background and shield
- `public/safetunes-icon.svg`: 64x64 app icon with rounded corners
- `public/safetunes-logo.svg`: 180x40 horizontal logo (icon + "SafeTunes" text)

**Social Media Assets:**
- `pics/safetunes-social-1024.svg`: 1024x1024 profile picture (rounded corners)
- `pics/safetunes-social-1024.png`: PNG export of above

**Marketing Assets Updated:**
- `marketing-assets/facebook-banner.html`: Updated logo to shield
- `marketing-assets/facebook-profile-picture.html`: Replaced "ST" initials with shield icon
- `marketing-assets/profile-pic.html`: Updated both versions (gradient & white background)

**Source Logo Files:**
- `pics/SAFETUNES LOGO SVG_v3.svg`: Icon only (no text) - use this as source
- `pics/SAFETUNES LOGO SVG_v2.svg`: With text
- `pics/SAFETUNES LOGO SVG.svg`: Original with text

**Key Files Modified:**
- `src/pages/LandingPageSimple.jsx`: Logo updates throughout

### Multi-Kid Song Management & UI Improvements (December 8, 2025)
Added inline kid toggle controls for managing song access per child, plus UI improvements.

**Inline Kid Toggles:**
- Added kid avatar toggle buttons to song rows in Library tab
- Toggles appear in: Songs section, search results, and album detail track lists
- Click avatar to instantly grant/revoke access for that kid
- Colored = has access, faded/dashed = no access
- No modal needed - instant inline editing

**Album Detail View Enhancements:**
- Added kid toggles on each track in album detail view
- Added "Quick assign all songs to:" bulk action row
- Uses `bulkAssignSongsToKid` mutation for batch operations

**Import from Playlist Relocated:**
- Moved from isolated top position into "Add Albums to Library" section
- Now appears below search with "or" divider
- Contextually grouped with other add-to-library methods
- Collapsible panel with purple background

**Time Limit Blocked Indicator:**
- Added visual indicator when kid has reached daily time limit
- Shows on KidActivityCard in parent dashboard
- Red border + "LIMIT REACHED" badge when blocked
- Green "Xm left" badge when time remaining

**Backend Additions:**
```typescript
// convex/songs.ts
toggleSongForKid - Toggle song access for specific kid
getSongAccessByKid - Get map of song access per kid
bulkAssignSongsToKid - Bulk assign songs to a kid

// convex/timeControls.ts
getAllKidsTimeLimitStatus - Get time limit status for all kids
```

**Key Files:**
- `src/components/admin/MusicLibrarySeparate.jsx`: Kid toggles, playlist import relocation
- `src/components/admin/AdminDashboard.jsx`: Time limit blocked indicator, removed old import button
- `convex/songs.ts`: New mutations and queries for song access management
- `convex/timeControls.ts`: New query for all kids time limit status

### Landing Page Conversion Optimization Overhaul (December 8, 2025)
Major redesign of landing page to improve conversion rates based on comprehensive UX/UI review.

**Hero Section Changes:**
- New CTA: "Get 7 Days Free — No Credit Card" (was "Start 7-Day Free Trial")
- Added power benefit statement: "They play ONLY approved music | You see what they search for | Block inappropriate covers instantly"
- Added micro-copy: "Takes 5 minutes to set up. Cancel anytime."
- Added trust line: "Trusted by families worldwide • COPPA Compliant • No Data Selling"

**Pricing Section Redesign:**
- Removed 3-column comparison table (was anchoring users to free alternatives)
- Simplified to single value-focused pricing card
- Added reassurance line: "Already tried Apple Music's filter? SafeTunes is the only solution that actually works."

**Feature Sections Redesigned:**
- **Request Flow**: Redesigned as 2-step visual timeline with numbered steps, centered header, benefits bar at bottom
- **Protection in Action**: Redesigned with centered layout, single screenshot, horizontal benefits bar
- **Hide Album Covers**: Added before/after visual comparison (EXPLICIT cover → music note placeholder), improved testimonial attribution
- **AI Lyric Review**: Added song context ("Money Trees" by Kendrick Lamar example), prominent "Not Recommended for Kids" verdict

**Testimonials Expanded:**
- Increased from 1 to 3 testimonials
- Added specific demographics (Jennifer M., Mom of 2; David R., Dad of 1, Texas; Michelle K., Mom of 3, California)
- Grid layout with 5-star ratings

**FAQ Expansion:**
- Added parent anxiety questions: "Will my kid resent me?", "How often will they request?", "Can they request from school?"
- Added FAQ schema markup for SEO (structured data for Google featured snippets)

**Visual Consistency:**
- Standardized checkmark colors to green across all sections
- Consistent section layout pattern: centered header → visual content → benefits bar

**Files Modified:**
- `src/pages/LandingPageSimple.jsx`: Complete overhaul (~600 lines added/changed)

### Promo Code System with Real-Time Validation (December 7, 2025)
Added promo code functionality to signup with instant visual feedback:

**Features:**
- "Have a promo code?" toggle reveals input field
- Real-time validation as user types
- Valid codes (DAWSFRIEND, DEWITT): Green styling, "Lifetime access unlocked!" message, header changes to "Get Lifetime Access", green submit button
- Invalid codes: Red styling, "Invalid code - you'll start with a 7-day trial" message
- Case-insensitive validation

**Lifetime Codes:**
- `DAWSFRIEND` - Original lifetime code
- `DEWITT` - Exclusive code for influencer moms (added Dec 7, 2025)

**Technical Implementation:**
- `src/pages/SignupPage.jsx`: Added couponCode to form state, real-time validation logic, conditional UI styling
- `convex/userSync.ts:65-69`: Validates lifetime codes and sets `subscriptionStatus: "lifetime"`
- `convex/users.ts:70-74`: Same validation logic for legacy createUser mutation

**Key Files:**
```javascript
// SignupPage.jsx - Real-time validation
const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
const couponTrimmed = formData.couponCode.trim().toUpperCase();
const isLifetimeCode = lifetimeCodes.includes(couponTrimmed);
const hasInvalidCode = couponTrimmed.length > 0 && !isLifetimeCode;

// userSync.ts - Backend validation
const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
const couponUpper = args.couponCode?.trim().toUpperCase();
const hasValidCoupon = couponUpper && lifetimeCodes.includes(couponUpper);
const subscriptionStatus = hasValidCoupon ? "lifetime" : "trial";
```

### Child Library Search UX Improvements (November 24, 2025)
Implemented Apple Music-style unified search experience for child library:

**Key Changes:**
- **Unified Search Results**: When searching in Library tab, all results (songs, albums, artists, genres) now display in a single flat list instead of separate collapsible sections
- **Instant Visual Feedback**: Search results appear immediately with result count header
- **Smart Prioritization**: Songs appear first (most common search target), followed by artists, albums, then genres
- **Type Badges**: Each result shows its type (SONG, ALBUM, ARTIST, GENRE) for clarity
- **Quick Actions**: Songs have play buttons, other items navigate to detail views
- **No Results State**: Friendly empty state when search returns nothing

**Technical Implementation:**
- `src/components/child/ChildDashboard.jsx:1048-1106`: Created `unifiedSearchResults` useMemo that combines all filtered content
- `src/components/child/ChildDashboard.jsx:1927-2035`: Built Apple Music-style flat list UI
- Each result has consistent structure with artwork, name, subtitle, and action button
- Navigation clears search when drilling into artists/genres

**User Experience:**
- Search is now scannable and intuitive like Spotify/Apple Music
- No need to expand sections to see results
- Eliminates confusion about whether search found anything

### Tab Naming & Messaging Updates (November 24, 2025)
Improved clarity and appeal of navigation and messaging:

**Changes:**
- **"New Music" → "Discover"**: Renamed tab to better communicate its purpose (exploring pre-approved music)
- **Discovery Page Banner**: Updated from informational blue to exciting purple/pink/orange gradient
- **Kid-Friendly Messaging**: Changed from "Everything here is already approved! All music in Discover has been pre-approved by your parent" to "Ready to explore! Everything here is unlocked for you. Listen, vibe, and add your favorites to your Library!"
- **Mobile Request Buttons**: Shortened "My Requested Items" to responsive "Requests" (mobile) / "My Requests" (desktop)

**Technical Implementation:**
- `src/components/child/ChildDashboard.jsx:1216, 3651`: Updated tab labels
- `src/components/child/DiscoveryPage.jsx:328-341`: New banner with sparkle icon and gradient
- `src/components/child/ChildDashboard.jsx:3024-3025`: Responsive button text

### Home Page Display Limits (November 24, 2025)
Reduced clutter on child dashboard home page:

**Changes:**
- Recently Played: 5 → 4 items
- Your Playlists: 5 → 4 items
- Recently Added Albums: 10 → 4 items
- New Songs: 5 → 4 items

**Technical Implementation:**
- `src/components/child/ChildDashboard.jsx`: Updated all `slice()` calls to limit to 4 items
- More focused, less overwhelming home page experience

### Recently Played Debugging (November 24, 2025)
Added logging to track recently played functionality:

**Technical Implementation:**
- `src/components/child/ChildDashboard.jsx:486-505`: Added console logs and error handling to `handlePlaySong`
- Helps identify issues with recently played tracking
- Confirmed functionality is working correctly

### Genre Feature Implementation (November 2025)
Added genre browsing functionality to both admin and child library views:

**Key Changes:**
- Albums now capture genre data from Apple MusicKit API (`genreNames` attribute)
- Database schema includes `genres` field (array of strings) in `approvedAlbums` table
- Genre grouping filters out generic genres (e.g., "Music") and uses primary genre
- Genres section in library with collapsible UI matching iTunes mobile design
- Drill-down navigation: Genres → Genre's Albums
- Sorted by popularity (genres with most albums first)

**Technical Implementation:**
- `convex/albums.ts`: Updated `approveAlbum` mutation to save genres array
- `convex/albums.ts`: Fixed `getApprovedAlbums` query to return `genres` field
- `src/components/admin/AlbumSearch.jsx`: Extracts `genreNames` from Apple Music search results
- `src/components/admin/LibraryiTunes.jsx`: Groups albums by genre, filters generic genres
- `src/components/child/ChildDashboard.jsx`: Same genre grouping logic for consistency

**Important Notes:**
- `genreNames` is a default attribute on albums in Apple Music API (no `extend` parameter needed)
- Admin library uses `getApprovedAlbums` query
- Child library uses `getAlbumsWithApprovedSongs` query
- Both queries now return genres to ensure consistency across views
- Partial albums (with only individual songs) inherit genres from matching full albums

## Code Quality Standards

### React Components
- Use **functional components** with hooks (no class components)
- Prefer named exports over default exports for better refactoring
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Use meaningful component and variable names

### State Management
- Use Convex `useQuery` for reading data (real-time reactive)
- Use Convex `useMutation` for writing/updating data
- Use `useState` for local component state only
- Avoid prop drilling - use context when needed
- Keep state as close to where it's used as possible

### Convex Best Practices
- Always validate inputs using `v` from `convex/values`
- Use proper TypeScript types for schema definitions
- Create indexes for frequently queried fields
- Use `ctx.auth.getUserIdentity()` for authenticated queries
- Handle errors gracefully with try/catch

### Styling
- Use **Tailwind CSS** utility classes (no custom CSS unless necessary)
- Follow mobile-first responsive design
- Maintain consistent spacing scale (4, 8, 12, 16, 24, 32px)
- Use semantic color names from Tailwind palette
- Keep color schemes consistent with brand (gradients, blues, purples)

## Security Requirements

### Critical Security Rules
⚠️ **Never commit secrets, API keys, or credentials**
- Use environment variables for all sensitive data
- Check `.env` files are in `.gitignore`
- No hardcoded passwords, tokens, or keys

### Input Validation
- Always sanitize user input on both client and server
- Validate all mutations with Convex validators
- Use parameterized queries (Convex handles this automatically)
- Escape user-generated content before rendering

### Authentication & Authorization
- Use bcrypt for password hashing (10+ salt rounds)
- Never store passwords in plain text
- Verify user permissions before data access
- Use proper session management
- Implement CSRF protection for forms

### XSS Prevention
- React auto-escapes by default (keep it that way)
- Never use `dangerouslySetInnerHTML` unless absolutely necessary
- Sanitize URLs from Apple Music API
- Validate all external data sources

## Performance Guidelines

### React Performance
- Use `React.memo()` for expensive components
- Implement proper `key` props in lists
- Avoid inline function definitions in render (use `useCallback`)
- Lazy load routes and large components
- Optimize images (use appropriate sizes, formats)

### Convex Queries
- Use specific queries instead of fetching all data
- Implement pagination for large lists
- Use indexes for filtered queries
- Avoid N+1 query problems
- Cache expensive computations

### Asset Optimization
- Compress images before upload
- Use WebP format where supported
- Implement lazy loading for images
- Minimize bundle size (check with `npm run build`)

## Testing & Debugging

### Manual Testing Checklist
- Test on mobile and desktop viewports
- Verify authentication flows (parent & kid login)
- Check error states and edge cases
- Test with real Apple Music data
- Verify Stripe payment flow

### Error Handling
- Always catch and handle errors gracefully
- Display user-friendly error messages
- Log errors for debugging (use console.error)
- Provide fallback UI for failed states
- Handle network failures and timeouts

## Git & Version Control

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, Refactor)
- Reference issue numbers when applicable
- Keep commits focused on a single change

### Branch Strategy
- Use feature branches for new work
- Never commit directly to `main`
- Delete branches after merging
- Keep branches up to date with main

## Code Review Focus Areas

When reviewing code, pay special attention to:

1. **Security vulnerabilities** (exposed secrets, XSS, injection attacks)
2. **Performance issues** (unnecessary re-renders, large bundles)
3. **Code duplication** (opportunities for reusable components/hooks)
4. **Error handling** (are all edge cases covered?)
5. **Accessibility** (keyboard navigation, screen readers)
6. **Mobile responsiveness** (does it work on small screens?)
7. **Type safety** (proper TypeScript/Convex types)
8. **Documentation** (are complex parts explained?)

## Common Patterns

### Fetching Data with Convex
```javascript
const albums = useQuery(api.albums.getApprovedAlbums, { userId: user._id });
if (!albums) return <LoadingSpinner />;
```

### Mutations with Error Handling
```javascript
const approveAlbum = useMutation(api.albums.approveAlbum);

const handleApprove = async (albumId) => {
  try {
    await approveAlbum({ userId: user._id, albumId });
  } catch (error) {
    console.error('Failed to approve album:', error);
    setError('Failed to approve album. Please try again.');
  }
};
```

### Authentication Check
```javascript
const { user, loading } = useAuth();
if (loading) return <LoadingSpinner />;
if (!user) return <Navigate to="/login" />;
```

## Anti-Patterns to Avoid

❌ Hardcoding API keys or secrets
❌ Using `var` instead of `const`/`let`
❌ Mutating state directly (always use setState)
❌ Large components (>300 lines)
❌ Inline styles instead of Tailwind
❌ Ignoring TypeScript/ESLint warnings
❌ Committing commented-out code
❌ Using `any` type in TypeScript

## Questions?

For questions about:
- **React**: https://react.dev/
- **Convex**: https://docs.convex.dev/
- **Tailwind**: https://tailwindcss.com/docs
- **Vite**: https://vitejs.dev/
