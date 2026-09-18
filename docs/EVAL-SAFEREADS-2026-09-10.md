# SafeReads product evaluation

Read-only review of `apps/safereads` on `feature/one-site`, 2026-09-10. Sources: the code, the 2026-09-10 local backup of the prod Convex deployment (`exuberant-puffin-838`), and the repo docs (ROADMAP, BUILD-HISTORY, ONE-SITE, marketing strategy). Nothing was changed or deployed.

**The short version.** SafeReads is not empty. It is two half-finished products glued together: a parent-side AI book-vetting tool built in January, and a kid-side reading app built in a four-day burst in April and untouched since. Neither half was finished to the point where a family gets a repeatable reason to open it. The fix is not "more features." It is to pick the one job parents will pay for, finish it end to end, and delete the rest.

Usage after five months in prod:

| Measure | Count |
|---|---|
| Parent accounts | 44 (29 lifetime comps, 3 active, 2 trial, 10 expired) |
| Parents who have ever run a book review | 4 |
| Book reviews ever generated | 35 |
| Kid profiles | 7, across 3 families |
| Books a parent has approved for a kid | 3 (all Bella, all Aug 25) |
| Reading-progress rows | 0, ever |
| Badges earned | 0, ever |
| Total kid reading time logged, lifetime | under 35 minutes |
| Paying Stripe customers attached to SafeReads | 1 |

---

## 1. What SafeReads actually does today

### Parent side (lives inside the getsafefamily.com dashboard iframe)

**Sign in.** Fully central. Login is the shared Safe Family account. Opening the old SafeReads dashboard directly just bounces to getsafefamily.com/dashboard/reads. The parent must have "safereads" in their entitled apps or they see an "inactive" prompt.

**Onboarding.** Five steps: welcome, add kids (name, age, color, 4-digit PIN, reading level), see your family code, pick a "reading comfort level" for the free classics (safe only / safe and caution / all classics), done.

**Home.** Greeting, family-code card, a button to the "SafeReads Advisor" chat, three quick-action tiles that all go to Search, a "Recently Reviewed" strip, a pending-requests banner, and the kid list.

**Search.** Title or author text search, barcode scan of an ISBN, or photograph a cover (the photo goes to GPT-4o vision, then to Google Books). Results come from Google Books with a retry ladder and Open Library enrichment. Every result is cached in the vetting table.

**Book page.** Cover, year, pages, ISBN, Google rating, categories, description. Buttons: Amazon (with affiliate tag), Add to Wishlist (per kid), private note. Then the **Content Review**: a GPT-4o verdict built from the book's metadata plus DoesTheDogDie crowd warnings. It returns safe / caution / warning, an age recommendation, read-aloud vs independent-reader guidance, a summary, and ten fixed content flags (violence, language, sexual content, substance use, dark themes, supernatural/occult, religious worldview, romance, identity/gender, social/political) each rated none/mild/moderate/heavy with details, plus "parent insights" (talking points, series context, challenged-book status, comparable books). Below that, "Safer Alternatives" (another GPT-4o call). Share and Report buttons. One review per book, cached forever.

**Approving a book for a kid.** There is no approve button on the book page. The only two paths are: add the book to a kid's wishlist, then go to the wishlist page and press Approve; or approve a request the kid made. An approved book appears on the kid's "My Books" shelf.

**Requests.** Kid requests show with an auto-generated review (in theory, see section 2), plus Review / Deny (with a reason the kid sees) / Approve.

**Kids.** Add, edit, delete, PIN, reading level. Per-kid screen time: either the family-wide cross-app limit from the hub, or a SafeReads-only daily limit. Per-kid "Books" list (approved books, plus a list of excluded classics) and "Wishlist" with statuses want-to-read / reading / finished / not interested.

**Advisor chat.** A GPT-4o chat with the parent's kids' names and ages in context, plus the last five reviews. Bold book titles become search links.

**Author page.** Google Books catalog for the author plus a cached GPT-4o author overview (style, age range, themes, content patterns).

**Settings.** Account info, family code (regenerate), comfort level, link to the Safe Family account page, subscription card with SafeReads' own Stripe checkout at $4.99/mo, log out, delete account.

**Admin page.** Totals, verdict distribution, engagement, a user table. Read-only.

### Kid side (lives inside getsafefamily.com/play)

**Entry.** Family code (or the cross-app kid pass), then pick a profile, then PIN if set. Server verifies the PIN with lockout. Kid onboarding: pick two or more of fifteen genres and a daily goal (15/30/45/60 min).

**Home.** Greeting with stat pills (reading, finished, pages, books, streak, minutes left), a "time to rest your eyes" banner when over limit, a streaks card (streak count, today's goal bar, seven-day dots, eight badge slots), Continue Reading, a Read the Bible button, Recommended for You, Browse by Genre, Discover More Books, Listen to a Story (LibriVox), latest saved verse, pending requests, and My Bookshelf.

**Library.** Infinite-scroll grid of Project Gutenberg (via Gutendex, topic "children") plus LibriVox children's audiobooks, with genre pills and Books/Audiobooks filters. The 38 hardcoded classics are pinned to the top.

**Search.** Text search across Gutendex, Bloom Library, Lit2Go, LibriVox and Book Dash in parallel. Only Gutenberg results have a working button ("Read Now" if it is one of the 38, otherwise "Ask Parent"). Everything else is a card you cannot tap.

**Book page.** Three states. Not on the shelf: "Ask Parent to Approve." Free book not yet reviewed: "This book is being reviewed" and a dead end. Readable: Start/Continue Reading, Add to My Books, Listen to Audiobook if LibriVox has a title match. For a real (Google Books) book the parent approved, the kid gets only "Find on Kindle" and "Find at Library" links. There is nothing to read and no way to log progress on it.

**Reader.** Yes, full text in-app, for Gutenberg books only. The whole book's HTML is fetched live from gutenberg.org at read time, boilerplate is stripped with regexes, and the entire novel is rendered as one long scrolling page. No chapters, no page turns, no bookmarks. Font size, three themes (light / sepia / dark), a progress bar, tap-a-word dictionary lookups (dictionaryapi.dev, unfiltered). Progress is saved as scroll percent, "finished" at 98 percent.

**Audiobooks.** LibriVox via archive.org MP3s. Chapter list, 15-second skip, speed control, auto-advance, position remembered in the browser only. No sleep timer, no text sync, and listening never counts toward streaks or "finished."

**Bible.** Six translations (ESV, NIV, NLT, NKJV, NASB, KJV) pulled from Bolls.life, an unofficial third-party API. Book, chapter, reading view with font/theme/translation switch, prev/next, per-chapter progress dots, save and highlight verses in four colors, full-text search with up to three parallel translations, and a "Study" button that generates GPT-4o-mini notes with an explicitly conservative Baptist prompt, cached per age band. No reading plans, no memory-verse practice.

**Streaks and badges.** Daily minutes, goal met yes/no, eight badges (first book, 5 and 10 books, 3/7/30-day streaks, speed reader, explorer). Zero have ever been earned.

**Screen time.** Server-enforced on book text, Bible chapters and audiobook chapters. Family-wide cross-app limit from the hub overrides the per-app limit. Fails open. A "Reading is paused" gate honors the hub pause.

---

## 2. Why it feels like filler

Blunt diagnosis: the two halves do not connect, the kid half has no content a 4-to-13-year-old in 2026 recognizes, and the connecting feature (parent approves, kid reads) is broken in three separate places.

**1. The parent tool and the kid app are two different products.** A parent vets a modern book (Harry Potter, Heir of Fire, Wingfeather Saga). The kid app can only read public-domain text. So an approved modern book lands on the kid's shelf as a cover with "Find on Kindle" (`src/app/read/book/[bookId]/page.tsx:598-616`). The kid can't read it here and can't even log that they read it elsewhere; the start-reading handler for non-free books is defined but never rendered (`:166`), so the "Track Your Progress" panel (`:664-688`) is unreachable. That is why `readingProgress` has zero rows after five months.

**2. Kids search for real books and get nothing.** The kid search log has ten entries: "Wingfeather Saga" four times and "Nicholas Sparks" once, all with zero results, because kid search only hits public-domain sources (`convex/freeBooks.ts` searchAllSources). The kid learns in one session that the search box is useless.

**3. The "AI vets every request" gate has silently failed on every real request.** The request mutation stamps `analysisStatus: "analyzing"` (`convex/bookRequests.ts:71-86`) and relies on the parent later opening the Requests page, which fires a separate client-side action (`src/app/dashboard/requests/page.tsx:133-161`). Nothing retries. All three real requests are still "analyzing" from April. Meanwhile the kid book page blocks any non-classic free book with "This book is being reviewed" until an analysis row exists (`src/app/read/book/[bookId]/page.tsx:372-406`). Bella's approved "Prince and the Pauper" is very likely stuck behind that screen.

**4. The kid catalog is code, not data.** The "38 classics" is a hardcoded array in `convex/preApprovedBooks.ts:28-74`, duplicated with genre tags in `convex/recommendations.ts:320-363` and again in `convex/generateClassicCovers.ts:14-52`. The 13+ tier is Machiavelli's *The Prince*, *A Modest Proposal*, *The Yellow Wallpaper*, *Dorian Gray*. Nobody's 13-year-old is opening those on a tablet. Everything else on the shelf is a live Gutendex query filtered by a five-keyword blocklist (`freeBooks.ts:47-70`); the "scary," "comics" and "action" genres drop the children filter entirely (`:411-413`, `:911-916`). LibriVox's "curated" audiobooks for age 8+ include Dracula and Frankenstein (`freeBooks.ts:1036`). The app is positioned as parent-vetted, and the vetting on the free catalog is a keyword blocklist.

**5. The reader is a proof of concept.** One multi-megabyte HTML string, fetched from gutenberg.org at read time by trying three URL patterns (`freeBooks.ts:248-252`), injected with `dangerouslySetInnerHTML` and no sanitizer (`src/components/kid/BookReader.tsx` around line 470). No chapters, no pagination, no bookmarks. If gutenberg.org is slow or rate-limits, the book does not open.

**6. Gamification counts nothing.** The "pages" stat is always 0 because the reader never writes page numbers. The explorer badge requires categories from the parent vetting table, which Gutenberg reads never create (`convex/readingStreaks.ts:257-282`), so it can't be earned. Streak minutes use wall clock even when idle (`BookReader.tsx:200-225`) while the limit clock is idle-aware, so the two numbers the kid sees disagree (Cole: 26.9 streak minutes vs 29 seconds of usage on the same day). Streak days are keyed on server UTC (`readingStreaks.ts:70-73`), so evening reading in Eastern time credits tomorrow.

**7. Whole backends are unreachable from the UI.** Bloom Library, Lit2Go, Book Dash and StoryWeaver are integrated (`convex/bloomBooks.ts`, `lit2go.ts`, `bookDash.ts`, `freeBooks.ts:486-553`) and produce search cards with no tap target (`src/components/kid/FreeBookSearch.tsx:235-330`). The Audio tab shows audiobooks the kid cannot play. Home's "Discover More Books" cards link to an empty search page (`src/app/read/home/page.tsx:435, 461`). Genre pills on the search page switch tabs and never search (`src/app/read/search/page.tsx:828-834`). DALL-E covers exist in code and have never run (0 rows).

**8. Onboarding promises what the data can't deliver.** Fifteen genres offered; recommendations draw only from the 38 classics, so "Because you like Comics / Sports / Space" never fires and the section shows "Start reading to get personalized picks!" until a book is finished. No kid has ever finished a book.

**9. Parent side is a lookup tool, not a habit.** Four parents have ever run a review. Every home-page tile leads to Search. The "Recently Reviewed" strip and the advisor chat context are global across all families (`convex/analyses.ts:33-66`, `convex/chat.ts:177-196`), which is both a privacy leak and, for a new parent, a strip of some other family's Stephen King lookups. There is no weekly reason to come back: no digest, no progress, nothing changes unless the parent goes searching.

**10. The deployment carries a lot of dead weight.** About 1,100 lines of legacy hub code in `convex/accounts.ts` (this deployment used to be Marketing Central), dead `centralUsers` / `appSyncStatus` / `profiles` tables, leftover Convex Auth tables, and foreign tables from a March matchmaking game (`gameEvents`, `rooms`, `visitors`). Two billing paths (central pull plus own Stripe) and two trial mechanisms (`analysisCount` and 7-day) coexist.

Net: the parent half works but has no retention hook; the kid half looks like an app but has no content a kid wants, a fragile reader, and gamification that never pays out. Neither is bad code. They are unfinished products.

---

## 3. What the reference products do, and what parents actually pay for

| Product | Price | What the money buys |
|---|---|---|
| Epic! | ~$12/mo | 40,000+ current licensed kids' books and audiobooks, read-to-me, quizzes, badges, parent progress dashboard, age-filtered. Free for teachers, which is how families find it. |
| Amazon Kids+ (Kindle Kids / FreeTime) | $5.99/mo, less with Prime | Licensed books plus video/apps, one parent dashboard with age filters, time limits, bedtime, and per-kid reading progress including "books finished" and "time read." |
| Libby / Sora | Free with a library card | Real modern books via the public library. Kids' filter, reading history. Sora is the school version with class assignments. |
| Reading Eggs | ~$13/mo | Structured phonics and reading lessons ages 2 to 13, 3,500 ebooks, detailed progress reports. Homeschool families pay for the curriculum, not the library. |
| Vooks / Skybrary | ~$5/mo | Animated or narrated picture books for ages 3 to 8. Small catalogs, very sticky with young kids. |
| Common Sense Media | Free (donation "Plus") | Age rating, content sliders, "what parents need to know," "talk to your kids about." This is the reference bar for SafeReads' parent review. |
| Storyline Online | Free | Actors reading picture books on video (it is a YouTube channel, which makes it a SafeTube approval, not a SafeReads feature). |
| Bookshare | Free for qualifying print disabilities | Accessible full-text of licensed books. Not a mass-market model. |
| Audible / Audible Plus | ~$8/mo | Licensed audiobooks including a kids catalog. |
| Standard Ebooks | Free | ~1,200 beautifully typeset public-domain epubs with real chapters and covers. The quality bar for public-domain text. |

What parents pay for, in order: (1) current books their kid actually asks for, (2) a trustworthy age/content answer before buying, (3) a kid-safe device experience with limits, (4) visible reading progress they can brag about or report to a co-op, (5) read-aloud narration for pre-readers.

SafeReads cannot license current books at $4.99. So it must win on 2, 3 and 4, and lean on the one thing nobody else in this list has: it sits next to the kid's music, video, search and game-building apps and can trade reading for screen time.

---

## 4. Proposals

Effort: S = 1 to 2 dev-days, M = 3 to 6, L = 7 to 15.

### Top three to build first

**A. A reading log for any book, not just Gutenberg (M).**
Kid: on any approved book, including a paper book, a Kindle book or a library book, the kid taps "I read today," enters minutes and pages (or a chapter), and it counts toward the goal, streak and badges. Parent: sees minutes and pages per kid per week, and can log a family read-aloud that counts for every kid present. Why it earns $4.99: this is the homeschool reading log, the thing co-ops and state portfolios ask for, and it makes every existing gamification screen real. It also fixes the "approved modern book is a dead cover" problem at the root. Dependencies: none external; the `readingProgress` table and streak logic already exist and just need a writer. Risk: kids self-report; add a parent "confirm" tap and it becomes a feature, not a flaw.

**B. A real public-domain library: curated, chaptered, pre-vetted (L).**
Replace the hardcoded 38 and live Gutendex scraping with a seeded catalog of 150 to 300 kid-appropriate titles imported from Standard Ebooks (properly typeset epubs with chapters and covers) and Gutenberg for the gaps, stored in Convex by chapter. Each title gets an AI content report generated from the actual full text once (not from metadata), an age band, a genre, and a "read-aloud or independent" tag. The reader gets chapters, page-turn pagination, bookmarks, and a chapter-level "listen instead" when LibriVox has a match. Why it earns $4.99: right now the shelf is 38 titles ending in Machiavelli; this makes it a real children's library (Burnett, Nesbit, Baum's 14 Oz books, Kipling, Alcott, Montgomery's Anne series, Twain, Stevenson, Verne, Andrew Lang's colored fairy books, Thornton Burgess, Howard Pyle, Longfellow) that opens instantly and never depends on gutenberg.org being up. Dependencies: Standard Ebooks (free, CC0/public domain, attribution appreciated), LibriVox, one-time OpenAI cost for the reports (a few dollars total). Risk: the import and cleanup is real work; do it as a script, not by hand.

**C. Reading earns screen time in the other apps (M).**
Parent sets an exchange rate ("every 15 minutes of reading earns 10 minutes of SafeTube/SafeTunes, up to 30 a day"). Kid sees a bank on the home screen and in the other apps. Why it earns $4.99, and more importantly sells the $29.99 bundle: no competitor can do this because no competitor owns the kid's video and music apps. It is the one feature that makes SafeReads the reason to buy the suite rather than the app people drop. Dependencies: the hub's shared screen-time ledger already exists on both sides; this adds a credit line to it. Risk: gaming (leave the reader open). Mitigate with idle detection already in `useReadingTime` and with the parent confirm from A.

### The rest, in priority order

**D. Fix the approve-and-read loop (S).** Approve button on the parent book page. Schedule the request analysis from inside the request mutation (server-side, with a retry cron for anything stuck in "analyzing" over an hour). Let a parent approval override the "being reviewed" block. This turns the flagship "kid asks, AI vets, parent approves" story from broken to true.

**E. Let kids request any book (S to M).** Kid search hits Google Books too (title-only results, no descriptions shown to the kid), so "Wingfeather Saga" returns something. The request goes to the parent with the full review and an Amazon or library link, and once approved the kid logs it via A. This is the single biggest kid-side dead end today.

**F. Bible reading plans and memory verses, on a licensed API (M).** Kid-facing plans (Gospel of John in 30 days, Proverbs a chapter a day, a family Advent plan), a memory-verse card with hide-words practice, and a family plan where all kids read the same chapter and the parent gets discussion questions. Move text from Bolls.life to Crossway's ESV API (free for non-commercial with attribution, apply for commercial) or api.bible (American Bible Society, licensed translations), and drop translations you do not have rights to. The marketing strategy already pitches SafeReads as "Bible study your kid will actually use"; this is the feature that pitch needs. Risk: the current six translations through an unofficial API is a licensing exposure for a paid product; fix before advertising it.

**G. Discussion questions and a five-question quiz per book (M).** Generated once per title from full text (public domain) or from metadata plus review (modern books), cached. Kid takes the quiz when finishing; parent sees the discussion questions and the score. Epic! and Reading Eggs charge for this; homeschoolers use it as narration practice. Dependencies: OpenAI, one call per book ever.

**H. A family-values layer on the review (M).** Keep the objective review, then add a short family profile (how you feel about magic, romance, language, scary content) and render a "For your family" line at the top: "Fine for Jack (7) as a read-aloud; hold for independent reading until 9 because of the moderate scary scenes." The `profiles` table from January is dead and can be reused. This is what Common Sense Media cannot do and what parents ask the advisor chat for.

**I. Picture-book mode for ages 4 to 7 (M to L).** Bloom Library and Book Dash are already integrated on the backend and unreachable from the UI. Add a page-by-page picture-book reader (many Bloom books ship with narration) so the youngest tier, currently seven Beatrix Potter and nursery-rhyme text files, gets something that looks like a picture book. Risk: quality varies; curate a few hundred titles by hand, do not expose the whole feed.

**J. Weekly parent digest email (S).** Minutes and pages per kid, books finished, streaks, pending requests, one suggested book. Resend and the templates already exist. This is the retention hook the parent side does not have.

**K. Printables (S).** Monthly reading log and a "finished a book" certificate as true US Letter PDFs. Cheap, and exactly what homeschool families screenshot and share.

**L. Kid "want to read" list and per-kid shelves (S).** Wishlists are parent-only today; kids have no way to save a book they saw. Give the kid a want-to-read shelf that the parent sees as gentle requests.

**M. Library deep links (S).** Beside "Find at Library," add "Find in Libby" and "Find on Hoopla" links keyed on ISBN, and a one-time "which library do you use" setting. Turns a dead end into a free way to get the modern book.

**N. Collapse billing into the hub (S to M).** Retire SafeReads' own Stripe checkout and the analysis-count trial, keep the central pull only. Reduces the two-source-of-truth bugs (a central grant showing "trial expired" until sync lands) and simplifies the pricing move.

**O. Cleanup pass (S).** Emoji sweep, delete the legacy hub code and dead tables, single source for the classics list, remove unreachable search sources until I ships. Detail in section 5.

What I would not do: Open Library / Internet Archive controlled digital lending. It is legally contested after the Hachette ruling, requires an archive.org account per reader, and is not something to build a paid kids' product on.

Sequence I'd recommend: D and O in the first week (small, stops the bleeding), then A and C together (they share the ledger), then B, then E, F, G. That gets SafeReads to "the reading log and rewards app that also has a real classics library and a Bible" within roughly six to eight dev-weeks, which is a product a homeschool family recognizes at $4.99 and a bundle-seller at $29.99.

---

## 5. Quick wins noticed

Bugs and security

- The upgrade button in the trial-expired modal posts to checkout with no body; the route requires an email and returns 400, so the button spins and does nothing (`src/components/UpgradePrompt.tsx:26`, `src/app/api/stripe/checkout/route.ts:50-53`). Settings' upgrade works.
- Admin stats and user list are public queries gated only by a caller-supplied email string (`convex/admin.ts:49-130`). Anyone who passes the owner's email gets every user's email and status. Make them internal or verify the JWT.
- `bible.setCacheEntry` is a public mutation (`convex/bible.ts:777`); anyone can overwrite cached Scripture text for every kid.
- Cross-tenant reads without ownership checks: advisor chat list/read/delete by raw id (`convex/chat.ts:15-75`), reports, search history, classic exclusions (`convex/preApprovedBooks.ts:190-225`), family code regenerate by userId, `analyses.analyze` by email (burns any user's trial), `unsaveVerse` by bare id (`bible.ts:473`).
- "Recently Reviewed" on the parent home and the chat context are global across all families (`convex/analyses.ts:33-66`, `convex/chat.ts:177-196`).
- Chat, alternatives, author overviews and cover identification are not gated by trial at all; an expired-trial parent can run GPT-4o forever.
- Gutenberg HTML rendered unsanitized in the kid reader (`src/components/kid/BookReader.tsx`).
- Login page renders two identical "Continue with Google" buttons (`src/app/login/page.tsx:329-372`, `:436-479`).
- Checkout route returns stack traces and env-presence flags in error JSON ("Temporarily include debug info", `checkout/route.ts:155-165`).
- Kid Amazon link has no affiliate tag (`src/app/read/book/[bookId]/page.tsx:606`); the parent one does.
- `/read/profiles` is linked from the kid layout (`src/app/read/layout.tsx:102,108`) and does not exist.
- Excluded-classics list on the parent kid page shows "Classic #11" instead of titles (`src/app/dashboard/kids/[kidId]/books/page.tsx:272-297`).
- Kids page "Books (n)" counts only approved books, so every family reads 0 while kids see 38.
- Deep-linking an audiobook fresh does a fuzzy title search by numeric id and usually finds the wrong book (`src/app/read/listen/[bookId]/page.tsx:769`).
- `home/page.tsx:232` reads localStorage during render (hydration hazard).

Emoji on kid screens (house rule)

- `src/app/read/home/page.tsx:29-36, 542, 643, 864, 963, 1127`
- `src/app/read/onboarding/page.tsx:288`
- `src/components/kid/ProfileSelector.tsx:12-19, 176, 192, 234`
- `src/components/kid/StylizedCover.tsx:27-164` (every genre palette)
- `src/components/kid/ReadingStreaks.tsx:12-47, 125, 137, 220, 247, 1033`
- `src/components/kid/BookCard.tsx:419, 437`
- `src/components/kid/FreeBookSearch.tsx:268`, `RequestButton.tsx:50`, `FreeBookRequestButton.tsx:48`, `GenreBrowser.tsx:198`
- `convex/readingStreaks.ts:14-49, 422` (badge emoji sent to the client)
- `convex/emails.ts:136` (admin email subject), `src/app/api/webhooks/stripe/route.ts:216-226` (check glyphs in the welcome email)

Dead code and stale copy

- Unimported components: `ThemeToggle.tsx`, `PasswordStrengthIndicator.tsx`, `kid/RequestButton.tsx` (near-duplicate of `FreeBookRequestButton`). Unused hooks on the kid side: `useHaptic`, `useNotification`.
- Unreferenced backend: `convex/accounts.ts` (about 1,100 lines of legacy hub code including a public `grantLifetimeAccess` at line 906), `adminUserEmail.ts`, `generateClassicCovers.ts`, most of `emails.ts`, and never-called exports `browseLit2Go`, `browseBloom`, `browseBookDash`, `searchStoryWeaver`, `browseLibriVox`, `getFreeBook`, `getBookProgress`, `analyses.reanalyze`, `wishlists.updateNote`, `notes.listByUser`.
- Dead tables: `profiles`, `centralUsers` (38 stale rows), `appSyncStatus`, `subscriptionEvents`, the Convex Auth tables, and foreign game tables (`gameEvents`, `rooms`, `visitors`, `matchmakingQueue`, `dailyScores`) that make the backup 40 percent noise.
- Three copies of the classics list (`preApprovedBooks.ts`, `recommendations.ts`, `generateClassicCovers.ts`).
- Stale copy: "getsafereads.com/read" in three places (`dashboard/page.tsx:118`, `settings/page.tsx:263`, `onboarding/page.tsx:275`); landing says "all 4 apps for $9.99" and "$19.96 → $9.99" (`src/app/page.tsx:672, 759`); "Over Free classic books" typo (`page.tsx:523`); privacy page still says Clerk (`src/app/privacy/page.tsx:22, 48, 71`); settings says "Add SafeTunes, SafeTube" with no SafeStudy/SafeSpark (`settings/page.tsx:445`); `.env.local.example` and `CLAUDE.md` still describe $2.99, Convex Auth and a 3-review trial; home says "ESV, NIV, NLT, NKJV, KJV and more" when there are six total (`read/home/page.tsx:761`).
- Landing page carries a "30-day money-back guarantee," a "COPPA Compliant" badge and three unattributed testimonials (`src/app/page.tsx:28-52`); confirm these are real before the pricing move.
- Old beads issues `SafeReads-jo6/kp3/van` describe the already-done hub migration.
