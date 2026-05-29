# Safe Family — Roadmap

Open work + completed milestones across SafeTunes, SafeTube, SafeReads, SafeStudy, SafeSpark, and Marketing. SafeSpark session-by-session log lives in [BUILD-HISTORY.md](BUILD-HISTORY.md).

---

## What's Next

### SafeStudy
- [x] Domain live (getsafestudy.com)
- [x] KidSearch.jsx refactored (2,435 → 962 lines, 23 components)
- [x] Security fixes: prompt injection, rate limiting, CORS, PIN security, subscription checks, orphan detection
- [x] Pinterest-substitute hardening (intent classifier, loop detector, ED tripwire, query budget, weekly digest, etc — see Apr 28 entry below)
- [ ] Parent UI for `kidConcernAlerts` (backend deployed, needs admin dashboard surface)
- [ ] Weekly digest opt-out toggle in admin Settings (backend flag deployed, needs UI)
- [ ] Stripe checkout UI button in admin Settings
- [ ] UpgradePrompt component (trial countdown)
- [ ] useSubscriptionSync hook (sync with Marketing Central)
- [ ] Promo code validation (DAWSFRIEND, DEWITT)
- [ ] Landing page polish (testimonials, FAQ, hero images)
- [ ] Mobile hamburger menu

### SafeReads Kid Side (NEW — Deployed Apr 3-4)
Full kid-facing reading platform:
- **Kid routes at `/read`** (getsafereads.com/read)
- Family code login (synced across all apps via `users.familyCode`)
- Library page: Netflix-style browsing with genre/format/sort filters, infinite scroll
- In-app book reader (Gutenberg HTML, serif typography, font controls, themes)
- Bible reading: 6 translations (ESV, NIV, NLT, NKJV, NASB, KJV) via Bolls.life API
- AI Study Notes: conservative Baptist perspective per chapter via OpenAI
- Saved verses with color highlights + personal notes
- Bible full-text search across translations
- Audiobooks via LibriVox (20K+ free), chapter player with position memory
- Tap-to-define dictionary (free Dictionary API)
- Book request system (kid requests → auto AI analysis → parent approves/denies)
- Pre-approved classics: 37 books, classified Safe/Caution/Mature
- Parent comfort level setting (Safe Only / Safe+Moderate / All Classics)
- Content safety gate (blocks unanalyzed books from reader)
- Book cover waterfall (Open Library → Google Books → DALL-E 3 → StylizedCover)
- Genre browser (15 genres), multiple book sources (Gutenberg, LibriVox, Bloom, Lit2Go, Book Dash)
- Desktop sidebar nav (lg+), bottom nav on mobile
- Parent side: manage books per kid, improved wishlists with status, pending request notifications

### SafeTunes
- [x] Playlist export feature for graduating teens (MusicKit library write API)
- [x] Kid request button (already built — verified Apr 6)

### SafeTube
- [x] AI Review enhancement deployed to prod May 5, 2026 (`rightful-rabbit-333`) — adds `parentCommunityNotes`, `knownControversies`, `commonSenseMediaRating` to `channelReviewCache`. **Initial deploy populated empty arrays / null** because gpt-4o-mini was silently dropping the new fields from its JSON response. Fixed same day by adding OpenAI `response_format: { type: "json_schema", strict: true }` to enforce the full schema. Verified live: PewDiePie review returns CSM 3/5, 2 controversies (slurs incident, meme associations), 2 community notes. Existing cached reviews (pre-deploy) still lack these fields; they'll populate as new channels are reviewed.
- [x] Kid request button (already built — verified Apr 6)

### Immediate
- [x] ~~Register for FPEA Florida Homeschool Convention (May 21-23, 2026)~~ — **MISSED.** Event passed without registration. Largest single Florida homeschool-mom audience for the year. Plan a 2027 registration well in advance (FPEA exhibitor slots typically open in fall), or look for the next equivalent convention (Southeast Homeschool Expo Atlanta Jul 24-25 is already on the TODO list).

### Completed
- [x] **Unified Auth** - JWT migration fully complete (Mar 27)
- [x] **Email Automation** - All types deployed (Apr 1)
- [x] **SafeStudy MVP** - Core search, tutor, profiles, time limits, Stripe webhooks
- [x] **Convex Auth Removal** - Removed from all 3 original apps (Mar 27)
- [x] **Trial-First Signup** - 7-day free trial, no credit card (Apr 2)
- [x] **Unified Family Codes** - Synced across all apps during provisioning (Apr 2)
- [x] **SafeStudy Security** - 10 audit fixes deployed (Apr 3)
- [x] **SafeReads Kid Side** - Full reading platform (Apr 3-4)
- [x] **SafeReads AI Enhancement** - Granular age guidance, community notes, series context (Apr 3)
- [x] **Customer Email** - SafeStudy launch email sent to all users (Apr 2)
- [x] **YouTube API Response** - Sent to YouTube API review team (Apr 3)
- [x] **SafeReads Nav Fix** - Single nav on landing page, removed double-stack (Apr 5)
- [x] **SafeReads Stripe Webhook** - Graceful handling of missing users, real errors return 500 (Apr 5-6)
- [x] **SafeReads /pricing redirect** - Added redirect to /#pricing anchor (Apr 5)
- [x] **All 4 Apps Footer Consistency** - Contact link, SafeStudy, app cross-links (Apr 5)
- [x] **SafeReads Kid Onboarding** - 3-step wizard (genres, reading goal, confirmation) (Apr 6)
- [x] **SafeReads Reading Streaks & Badges** - Daily tracking, 8 badges, weekly view (Apr 6)
- [x] **SafeReads Recommendations** - Personalized "Recommended for You" by genre + history (Apr 6)
- [x] **SafeReads New Icon** - White shield with book on orange (Apr 6)
- [x] **Marketing Dark Mode** - System preference re-enabled, comprehensive CSS overrides (Apr 6)
- [x] **Blog Post: "Why I Built SafeFamily"** - Founder story published (Apr 6)
- [x] **Consolidated Trial Emails** - All 4 apps POST trial results to Marketing Central; one customer email per user (with bundle upsell) + one admin digest instead of 3-4 separate emails (Apr 13)
- [x] **Stripe Cleanup** - Archived duplicate SafeReads product, renamed bundle to "Safe Family Bundle" (Apr 14)
- [x] **Blog: 6 Posts Scheduled** - SafeStudy intro, homeschool toolkit, Bible reading, kid requests, Bark/CE comparison, kids search (Apr 14-May 1, Mon/Thu cadence)
- [x] **Blog SEO Fixes** - og:image + twitter card on listing page, BreadcrumbList JSON-LD on posts, MDX img lazy loading (Apr 14)
- [x] **Outreach Research** - Competitor growth playbooks documented (docs/OUTREACH-RESEARCH-2026-04-08.md)
- [x] **Email Warmup Research** - Warmup tool comparison, manual warmup recommended for pilot scale (docs/EMAIL-WARMUP-RESEARCH-2026-04-08.md)
- [x] **Outscraper Pipeline Plan** - Full spec for FL homeschool co-op lead-gen pilot (docs/OUTSCRAPER-PIPELINE-PLAN.md)
- [x] **OG Image Updated** - Added SafeStudy (4 apps), purple→pink CTA, "Music. Video. Books. Search." (Apr 17)
- [x] **Promo Video Logos** - 5 transparent PNG logos (icon-only + icon+text) at videos/promo-logos/ (Apr 17)
- [x] **/syncFamilyCode endpoint** - Added to all 4 apps for syncing/reading familyCode on legacy users: `GET /syncFamilyCode?email=&code=&key=` (code optional; omit to read). Used to unify codes for pre-Apr-2 users (Apr 19)
- [x] **SafeStudy hardening — Pinterest-substitute lockdown** (Apr 28): 10-item rollout against the synonym-shuffling / aesthetic-browsing pattern surfaced by Bella Trotter's account audit (212 searches in last month, ~57 aesthetic-collage queries)
  - **#1 Intent classifier** — `convex/ai/intentClassifier.ts`: regex pre-filter (catches "pintrest/colage/asthedic" misspellings + self-image patterns) + gpt-4o-mini fallback. 9 categories. Always-escalate on `eating_disorder_adjacent` and `self_harm_adjacent`. Strictness-aware blocking (moderate blocks aesthetic-browsing+self-image; strict adds appearance+celebrity-gossip). Fail-open on classifier errors. Wired into `searchFromKid` BEFORE `performSearch`. Stores `intentCategory/Confidence/Rationale` on `searchHistory` and `blockedSearches`
  - **#2 Repetition / fuzzy-loop detector** — `convex/ai/loopDetector.ts`: normalizes query (strip stop words + ALL color tokens, sort tokens), 4+ matches in 30 minutes triggers cooldown redirect. Cross-checks both `searchHistory` AND `blockedSearches` (loop crosses the block boundary). New `getRecentQueriesForLoopCheck` internal query
  - **#3 Image search default OFF** — `allowImageSearch: false` for new profiles in `OnboardingWizard`, `KidProfileEditor`. Amber warning chip when toggled on ("turns SafeStudy into a Pinterest-style mood-board tool"). Existing kids unchanged
  - **#4 Daily query budget per kid** — added `kidProfiles.dailyQueryBudget` (optional). Strictness defaults: strict=15, moderate=25, light=50. `timeLimits.canSearch` updated to consult both the explicit `timeLimits.dailyLimitMinutes` (when set) and the new profile budget. Today's count uses family timezone
  - **#5 New blocked-topic options** — added `aesthetic-browsing`, `self-image`, `appearance`, `celebrities` to all 3 parent UIs (`KidProfileCustomize.jsx`, `KidProfileEditor.jsx`, `OnboardingWizard.jsx`). `DEFAULT_BLOCKED` now includes aesthetic-browsing + self-image
  - **#6 ED / self-harm tripwire + parent alert** — new `kidConcernAlerts` table (with `by_user`, `by_kid`, `by_user_unack` indexes). `convex/concernAlerts.ts` schedules a Resend email to the parent when a query trips the always-escalate categories; `concernAlertQueries.ts` exposes `listForUser`, `acknowledge`, `markNotified`. 24h dedupe on (kidProfileId, query, category) so retries don't spam. Email includes 988 / NEDA helpline links
  - **#7 Curiosity prompts (age-bucketed)** — `utils.js` split SUGGESTIONS into `SUGGESTIONS_YOUNG` (4-7), `SUGGESTIONS_MID` (8-11), `SUGGESTIONS_OLDER` (12+). New `pickCuriosityPrompts(ageRange, count)` helper. Older tier includes "How does the immune system work?", "What is dark matter?", "How does encryption keep messages secret?", "What caused the Great Depression?" — bias the empty state toward "real questions"
  - **#8 Hide kid-side query history** — removed History button from `SearchHeader`, removed `<SearchHistoryPanel>` render from `KidSearch`, removed "recent searches" branch from autocomplete (typing "ae" no longer surfaces "aesthetic colage pintrest" as a memorized suggestion). Parent dashboard still has full history. Component preserved for admin use
  - **#9 Image result cap** — `deduplicateImages(allImages, 6)` (was 8) in `convex/search.ts`. Defensive client-side `MAX_IMAGES = 6` slice in `ImagesResults.jsx`. No "more like this", no infinite scroll, no pagination
  - **#10 Weekly parent digest** — Sunday 23:00 UTC cron (`convex/crons.ts`). `convex/weeklyDigest.ts` (action) + `weeklyDigestQueries.ts` (queries/mutations). Per-kid summary: total searches, blocked count, top intent categories, concerning-query count, heaviest day, budget-hit days. Skips parents with no activity, opted-out (`users.weeklyDigestOptOut`), or expired/cancelled subscription. Includes "Turn off weekly digests" link
  - **Schema:** added `intentCategory/Confidence/Rationale` to `searchHistory` + `blockedSearches`, new `kidConcernAlerts` table, `kidProfiles.dailyQueryBudget`, `users.weeklyDigestOptOut + lastDigestSentAt`. All optional/additive. Deployed cleanly to `strong-scorpion-227`
  - **NOT YET BUILT (next session):** parent dashboard surfaces for `kidConcernAlerts` (the listForUser / acknowledge mutations exist; need UI), weekly-digest opt-out toggle in admin Settings page

- [x] **SafeTunes kid-login crash — Convex 32k read-limit fix** (May 4): Ben Purves emailed a screenshot of his son hitting "Something went wrong" right after tapping his profile. Reproduced live with playwright using family code `RSAMPT` → console showed `[CONVEX Q(kidRequests:getKidRequests)] Server Error`. Running the query directly returned `Too many documents read in a single function execution (limit: 32000)`.
  - **Root cause:** `kidRequests:getKidRequests` (`apps/safetunes/convex/kidRequests.ts:6`) iterated each approved/partially-approved album request and ran `ctx.db.query("approvedSongs").withIndex("by_user", ...).filter(kidProfileId AND appleAlbumId).first()` per request. The `by_user` index narrows by parent only — the `.filter()` then walks the parent's full song list. Ben's family had 60 approved albums × 1163 songs across 3 kids → reads compounded past Convex's hard 32k-per-query limit → query threw → React's Sentry ErrorBoundary rendered the generic error screen
  - **Fix:** Pre-fetch the kid's own approved songs *once* via the selective `by_kid_profile` index (small per-kid subset), build Sets of `appleAlbumId` / `albumName` / `appleSongId`, then check existence in memory. One indexed query instead of N broad ones. Same correctness, dramatically fewer reads
  - **Verified:** All 3 kids (Andrew, Elizabeth, Jack) now load. Console clean. Andrew's dashboard shows "Good Evening, Andrew" + welcome modal as expected
  - Convex-only deploy to `formal-chihuahua-623`; no Vercel push needed. Drafted reply to benpurves@hotmail.com from the apps account (Jeremiah pasted/sent manually)
  - **Lesson:** `.withIndex(broad).filter(narrow)` is a scaling cliff. Fine for small accounts, fatal for power users. When checking existence across many child rows, fetch once via the most selective index (`by_kid_profile`) and check via in-memory Sets. Added as MEMORY.md lesson #9

- [x] **SafeTube time-limit bug fix** (Apr 28): two compounding bugs in `VideoPlayer.jsx` were letting watchDurationSeconds inflate to 19+ hours/day on Bella Trotter's account despite a 90 min/day limit
  - **Bug 1 — wall-clock inflation:** `saveWatchDuration` was computing `Date.now() - watchStartTimeRef`, which counts real-world seconds from when the video element loaded. If a kid pauses, walks away, or leaves the tab open overnight, the timer kept running. **Fix:** track *active playback time* via `playStartedAtRef` + `accumulatedPlayMsRef`. PLAYING (state=1) → begin span; PAUSED/BUFFERING/ENDED → roll span into accumulator. `getActivePlayMs()` returns total active time only
  - **Bug 2 — save-on-end only:** `saveWatchDuration` only fired on video END / handleClose. During a long single video, watchDurationSeconds stayed at 0, so `canWatch` (the time-limit gate) saw 0 minutes used and kept allowing more. **Fix:** added `periodicSaveIntervalRef` running every 30s during playback. Also save on PAUSED transitions
  - **Mid-session limit enforcement:** `VideoPlayer` now subscribes reactively to `api.timeLimits.canWatch` via `useQuery`. When the limit is hit during playback (triggered by the new periodic saves), the player auto-closes and bounces back to KidPlayer (which already has the time-limit modal)
  - Frontend-only — no SafeTube backend deploy (still under YouTube API compliance review)

- [x] **UX audit — round 6 shipped** (Apr 19): 10 more items spanning product + architecture foundations
  - **SafeReads reader focus mode** — chrome auto-hides after 3s inactivity in `/read/book/*`; any scroll / tap / mouse move inside the scroll container re-shows + resets the idle timer (matches Kindle/Apple Books)
  - **Pricing progressive disclosure** — Monthly/Yearly toggle replaced with side-by-side radio cards. Both prices visible at once, yearly card has "Save X%" badge. Yearly label no longer clips on mobile
  - **Blog TOC in sidebar** — added `s.toc()` to velite schema; post sidebar shows "On this page" card with h2/h3 titles
  - **`/account` post-purchase dashboard** — added prominent family-code card at the top (gradient, copy button) + "First time? Setup guide" CTA linking to `/setup`. `getCurrentUser` now returns `familyCode`
  - **`/setup` page** — new route with 4-step visual walkthrough (kid profiles → connect apps → share family code → approve content), jump-into-app grid, common questions. Linked from `/account` for post-purchase users
  - **Testimonials voice fix** — rewrote 3 of 5 in varied cadence including one mildly-qualified-but-positive review (Emily T. mentions mobile UI could be snappier). Kept Mike R. (SafeTube) and Jennifer K. (SafeTube)
  - **SafeTunes kid welcome modal** — first-visit per kid profile, explains 3-step request/approve/listen flow, dismissible, persisted in `localStorage[safetunes_kid_welcomed_${id}]`. MVP for the "cold drop into empty library" issue; full 3-step wizard is a follow-up
  - **Unified kid profiles — Marketing Central foundation** — added `kids` table to `adamant-crow-705` schema (parentUserId, name, age, color, avatarIcon, pinHash, archived) with `by_parent` + `by_parent_and_archived` indexes. New `kids.ts` module with `listByParent`, `getById`, `create`, `update`, `archive` + `upsertByNameInternal` for server-to-server provisioning. Apps not migrated yet — that's next session
  - **`@safefamily/ui` package scaffold** — created `packages/ui/` with package.json, README, and first extracted component: `<FamilyCodeInput>` (the 6-box segmented code entry matching SafeReads/SafeStudy). Not wired into apps yet; workspace strategy (npm/pnpm workspaces vs Turborepo) is the next-session decision
  - **Accessibility globals** — added `prefers-reduced-motion` guards to all 4 apps' + marketing's CSS; added global `:focus-visible` ring + `.sr-only` utility to marketing. Applies to `animate-*`, `transition-*`, `scroll-behavior`
- [x] **UX audit — round 5 shipped** (Apr 19): 12 more fixes across all 4 apps + marketing
  - **SafeStudy kid avatars** — ported SafeReads' color→emoji mapping (dragon/lion/lightning/owl/rocket/star/unicorn/paw-prints/dolphin/herb). Profile selection tiles, PIN entry circle, and header avatar now show distinct icons per color instead of the initial letter only. New `AVATAR_ICONS` + `getAvatarIcon()` export on `utils.js`
  - **SafeStudy nav: "Kid Search" → "Kid Login"** on the landing header + footer, linking `/play` (not `/search`) for cross-app consistency
  - **SafeStudy kid family-code entry** — replaced sterile single input + "Start Searching" button with SafeReads-style 6-box segmented input, whimsical copy ("Enter your family's secret code! / Ready to discover something new?"), decorative background blobs + Sparkles/Rocket icons, "Let's Go! →" CTA, "Don't have a code?" help card
  - **SafeTunes kid request search artwork** — on web now pulls real Apple Music cover art (`artwork.url` at 120×120), gradient music-note icon kept only in iOS/TWA wrappers for App Store compliance
  - **SafeTunes landing nav demoted Kid Login** to a compact "Kids →" tertiary link; primary pair is now Parent Login + Start Free Trial (matches SafeReads hierarchy)
  - **SafeReads kid search: pre-approved books skip "Ask Parent"** — now render a green "Read Now" link straight to the reader. `FreeBookSearch` queries `preApprovedBooks.getPreApprovedBooks` and keys off gutenbergId to decide which button to show
  - **Marketing "Sound familiar?" pill** — amber triangle warning icon (read as error) swapped for `MessageCircle`
  - **Marketing footer expansion** — thin navy bar replaced with 12-col grid: brand blurb + tagline + trust chips / Apps column (with icons) / Company column (Blog, Guides, Contact) / Legal column (Privacy, Terms, Refund Policy). Adds real "made with care" footer instead of the dev-placeholder look
  - **Blog category filter chips** — added `BlogListClient` client component above the grid. Derives category list from published posts, includes "All" chip, filters in-memory
  - **Blog Previous/Next post nav** — added chronological nav (across all categories) between the article body and "More from {category}" section. Uses `card-soft` styling, ArrowLeft/Right icons, hidden placeholders on mobile for alignment
  - **Blog right-rail sidebar (lg+)** — `lg:grid-cols-[minmax(0,1fr)_280px]` layout with sticky sidebar: author bio card, reading time estimate (~word count / 220 wpm from body length), newsletter subscribe CTA, tags card. Mobile unaffected
  - **SafeReads "iOS & Android Coming Soon" banner** — removed (was hugging the fold, low value, redundant with new marketing FAQ entry)
- [x] **UX audit — round 4 shipped** (Apr 19):
  - SafeReads landing nav: "Kid Login" purple pill (competing with primary CTA) → plain text link; "Safe Family" cross-link brightened from `text-ink-400` to `text-ink-600` in both the landing nav and reusable `Navbar.tsx`
  - Marketing FAQ: added "Do I need an Apple Music subscription for SafeTunes?" and "Do you have iOS or Android apps?" (audit-identified gaps that cost trust)
  - **SafeStudy `/play` + `/kids` aliases**: these routes previously fell through the wildcard to `/`, breaking muscle memory with the other apps (/play for SafeTunes/SafeTube, /read for SafeReads). Added `/play`, `/play/:familyCode`, `/kids`, `/kids/:familyCode` routing to KidSearch
- [x] **UX audit — round 3 shipped** (Apr 19): CTA + verb cleanup across all 4 app landings:
  - SafeTube hero CTA: white-on-orange (read as empty outline at small sizes) → solid navy `#1a1a2e` + verb unified to "Start Free Trial"
  - SafeTunes landing: header "Try Free" → "Start Free Trial"; hero "Get 7 Days Free — No Credit Card" → "Start Free Trial"; secondary "Get 7 Days Free" → "Start Free Trial"
  - SafeStudy hero "Start Free for 7 Days — $4.99/mo after" → "Start Free Trial"
  - All 4 apps + marketing now use the same primary verb ("Start Free Trial") with one bundle-specific exception ("Get All 4 Apps — $9.99/mo" on marketing hero)
- [x] **UX audit — round 2 shipped** (Apr 19):
  - SafeTube kid login: placeholder `FAMILY CODE` → `ABC123` with `placeholder-gray-500` contrast; disabled-grey button → always-enabled "Let's Go! →" that validates on click with friendly error ("Your family code is 6 letters and numbers"); added helper line under input
  - SafeTunes landing H1: "The Apple Music Parental Dashboard That Actually Works" split into 3 intentional lines; dropped lg text-6xl → 2.75rem (xl still gets 6xl) so it doesn't collapse to 5 ragged lines in the two-column hero
  - SafeTunes cookie banner: no longer pops on first paint over the hero CTA — waits for scroll past 400px OR 6s dwell (was fixed 1s delay)
  - SafeTube + SafeStudy "Safe Family" cross-link: was `text-gray-400 hover:text-gray-600` (read as disabled), now `text-gray-600 hover:text-red-500` / `text-blue-600` (visible link)
  - SafeReads Gutenberg reader: strips `<span class="pagenum">[page i]</span>` + inline `[page i]/[pg 100]` markers that were leaking into rendered text
  - SafeReads search/genre: deduped identical books (same title+author, different Gutenberg editions) — fixes "Huckleberry Finn appears twice" issue. Single `dedupeBooks()` helper applied to `searchFreeBooks`, `getBooksByGenre`, and related-books query
- [x] **UX audit quick-wins shipped** (Apr 19): post-eval fixes across all 4 apps + marketing:
  - SafeStudy kid `ResearchCard` — source text now runs through `stripMarkdown` so `**bold**` + `### headings` don't render as raw characters
  - SafeTunes `CookieConsent` — skips `/play`, `/player`, `/child-login`, `/kids` routes (COPPA optics + no 9-year-old should see "Accept All")
  - Marketing `Header.tsx` — mobile hamburger menu (state existed but nothing rendered it below md:); panel links to 4 apps + Blog
  - Marketing signup page — `AppSelector` pricing row + `AccountForm` app summary row stack vertically below `sm:` so the Yearly toggle + chips don't overflow 375px
  - Marketing CTA copy unified to **"Start Free Trial"** — `PricingSection` (was "Start Protecting Today — Free for 7 Days") and `StickyMobileCTA` (was "Get Started"); Hero keeps bundle-specific "Get All 4 Apps — $9.99/mo"
  - SafeReads `freeBooks.ts` — Gutenberg's auto-generated placeholder covers (colored abstract patterns matching `pgNNN.cover.(medium|small).(jpg|png)`) now return `undefined` so the waterfall falls through to Open Library → Google Books → `StylizedCover` (which was already well-designed)
  - Full report: `docs/UX-EVAL-2026-04-19.md` (23 P0/P1, 10 quick wins). Three audit findings (SafeStudy "SafeSeek" rename, duplicate "Read This Book" CTA, bottom-nav overlap in `/read`) were already fixed in the code — audit screenshots were stale (Apr 3, pre-fix).
- [x] **Family code unification - full pipeline** (Apr 19):
  - Legacy migration: synced 28 users (72 field updates) across all 4 apps — all users now have a single unified code
  - **Marketing Central is now the source of truth**: `users.familyCode` added to schema, backfilled for 35 users, exposed via `/getCentralUser` and `/syncFamilyCode`
  - **Webhook bug fixed**: `getCentralUser` was pointing at SafeReads (404s → legacy fallback); now correctly hits `adamant-crow-705` — unifies auth for any legacy-flow users too
  - **Webhook + signup** now pass `familyCode` from Marketing Central to each `/provisionUser` call, and cache the learned code back if Marketing didn't have one yet
  - **All 4 apps' `provisionUserInternal`** now honor `args.familyCode` on existing-user updates (previously ignored), so future upgrades/repairs keep codes aligned

### TODO
- [ ] **Calendar reminder: rotate Apple Music developer JWT by 2026-10-15** — Apple caps token lifetime at 180 days. Current token (rotated 2026-05-21) expires **2026-11-17**. Generator: `cd apps/safetunes && node generate-musickit-token.cjs` (uses `AuthKey_T2M5WA6Z67.p8`). Then `vercel env rm/add VITE_MUSICKIT_DEVELOPER_TOKEN production` + `vercel --prod` rebuild. Set a reminder ~4 weeks early — last rotation came 6 days late and broke kid-side music silently for all paying users.
- [ ] LRCLib migration (replace MusixMatch — saves $59/mo, plan in docs/LRCLIB-MIGRATION.md)
- [ ] Marketing: Publish Substack article
- [ ] Marketing: Apply to Southeast Homeschool Expo (Atlanta, Jul 24-25)
- [ ] Marketing: blog posts (target: 2/week — 6 scheduled through May 1)
- [ ] Marketing: FPEA convention promo code + booth materials
- [ ] Register for FPEA Convention (May 21-23, 2026, $525-685)
- [ ] Outscraper pipeline: build Phase 1 (schema + HTTP endpoint in Marketing Central)
- [ ] Set up Instantly account + outreach.getsafefamily.com subdomain for cold email
- [ ] Marketing strategy execution — full plan in `docs/MARKETING-STRATEGY-2026-05.md` (May 6, 2026):
  - **First dollar:** affiliate seeding to 10 Christian/homeschool mom creators (30% recurring), NOT Meta cold traffic
  - **Meta launch (week 2):** ABO @ $40/day, 3 ad sets, optimize Lead (not Subscribe — not enough paid events yet); CAC ceiling ~$24
  - **Cold-traffic LPs:** each app already has its own LP at its own domain (getsafetube.com etc.) — don't duplicate on getsafefamily.com. Optimize the existing pages: Meta Pixel + Conversions API, social proof above fold, headline split test ("Take YouTube back from the algorithm" vs "Start your 7-day free trial — no credit card")
  - **Bundle upsell:** add to each app's signup thank-you page ("Add the other 3 apps for $5 more") + day-3 / day-6 emails — captures bundle attach rate without confusing cold traffic with 4-app pricing upfront
  - **Lead creative:** "Search History Reveal" using Bella Trotter's 212 searches / 57 aesthetic-browsing flagged by SafeStudy intent classifier (uniquely ours; competitors can't tell this story)
  - **Christian targeting** is custom-audience + 1% lookalike (Meta killed religion targeting); save faith-coded copy for warm/affiliate
  - **Compliance landmines:** no "your 9-year-old" copy, no other people's kid faces, add backup ad-account admin (family-safety ads get falsely flagged constantly)
