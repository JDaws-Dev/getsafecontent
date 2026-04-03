# SafeReads Kid Experience: Research & Design

*Research date: April 1, 2026*

---

## Table of Contents

1. [Part 1: Free Book Content APIs & Repositories](#part-1-free-book-content-apis--repositories)
2. [Part 2: Kid-Focused Experience Design](#part-2-kid-focused-experience-design)
3. [Commercial Platform Integrations](#commercial-platform-integrations)
4. [Library Account Integration](#library-account-integration)

---

## Part 1: Free Book Content APIs & Repositories

The goal is to find sources of actual readable book content that can be embedded in SafeReads so kids can READ books directly in the app, not just review them.

---

### 1. Project Gutenberg

**URL:** https://www.gutenberg.org
**Catalog size:** 70,000+ free public domain ebooks

**API access:**
- Project Gutenberg itself has no official REST API. It publishes nightly XML catalog dumps.
- **Gutendex** (https://gutendex.com) is the best third-party API. Free, JSON-based, well-maintained. Supports queries by author, title, topic, language, copyright status, and MIME type.
- **RapidAPI option** (https://gutenbergapi.com) offers sub-200ms response times and full-text content access. Free tier available; paid tiers for higher volume.

**Kid-appropriate content:**
Excellent. Project Gutenberg organizes children's content into curated bookshelves:
- Children's Picture Books (~200 titles)
- Children's Literature (~1,000+ titles including Alice in Wonderland, Wizard of Oz, Treasure Island, Peter Pan, Anne of Green Gables)
- Children's Fiction (~500+ titles including The Railway Children, Five Children and It)
- Children's Book Series (Tom Swift, Five Little Peppers, Adventures of Reddy Fox)
- Children's Myths, Fairy Tales (~300+ titles including Andersen's, Grimm's, Japanese Fairy Tales)
- Children's Anthologies

**Formats:** HTML, ePub, plain text (UTF-8), Kindle-compatible formats. Most books available in all formats.

**Terms of use:** All content is public domain. No restrictions on embedding, redistribution, or commercial use. No attribution required.

**Embeddable:** Yes. Full text available via direct download URLs. ePub files can be rendered with epub.js. HTML versions can be displayed directly in an iframe or parsed into React components.

**Rate limits:** Gutendex has no documented rate limits. Direct Gutenberg file access may throttle aggressive scraping (use mirrors for bulk).

**Cost:** Completely free.

**Verdict: PRIMARY SOURCE.** The best source for classic children's literature. Thousands of kid-appropriate titles. Zero cost, zero restrictions. The content quality is excellent but these are all pre-1928 works, so no modern titles.

---

### 2. Open Library / Internet Archive

**URL:** https://openlibrary.org | https://archive.org
**Catalog size:** 20+ million catalog entries; ~2 million readable/borrowable books

**API access:**
- **Search API:** `https://openlibrary.org/search.json?q=QUERY` -- full metadata search
- **Books API:** `https://openlibrary.org/api/books` -- lookup by ISBN, OCLC, LCCN
- **Read API:** `https://openlibrary.org/api/volumes/brief/{id-type}/{id-value}.json` -- determines if a book is readable or borrowable online
- **Covers API:** `https://covers.openlibrary.org/b/id/{cover-id}-{size}.jpg`
- **RESTful API:** `https://openlibrary.org/works/{OLID}.json` -- full work metadata

**Kid-appropriate content:**
Mixed. Open Library catalogs all books, including adult content. Would need SafeReads' existing AI analysis layer to filter. Many children's classics are available as readable scans from Internet Archive.

**Formats:** Scanned page images (readable in browser), some ePub/PDF for public domain titles. Borrowable books use a DRM-protected lending system (1-hour or 14-day loans).

**Terms of use:**
- Public domain books: freely readable, downloadable, no restrictions
- Borrowable books: Controlled Digital Lending (CDL) model. One copy lent at a time. Cannot be embedded in third-party apps -- must use their reader or link to it.
- API: Free to use, no API key required. Be respectful of rate limits.

**Embeddable:**
- Public domain scanned books: Can link to their reader via `https://archive.org/details/{identifier}` but embedding their reader in an iframe is technically possible though not officially supported.
- Borrowable books: NOT embeddable. Must redirect users to Open Library/Internet Archive.
- The Read API can determine if a book is freely readable or only borrowable, which is useful for filtering.

**Rate limits:** No official documented limits, but the API FAQ says "be respectful" -- recommend caching and limiting to ~1 request/second.

**Cost:** Free.

**Verdict: SECONDARY SOURCE for metadata enrichment (already used by SafeReads) and LINK-OUT for borrowable books.** Public domain titles overlap heavily with Gutenberg (which has better formatted text). The Read API is useful for telling parents/kids "this book is available to read free on Open Library."

---

### 3. Standard Ebooks

**URL:** https://standardebooks.org
**Catalog size:** ~800 titles (curated, growing slowly)

**API access:**
- **OPDS feed:** Available at `https://standardebooks.org/feeds` for catalog browsing
- New Releases Atom/RSS feed: open to everyone
- Full OPDS catalog access: requires Patrons Circle membership (small donation)
- No REST API. OPDS (Atom-based XML) is the only programmatic access method.

**Kid-appropriate content:**
Limited but high quality. Standard Ebooks focuses on "the best" public domain literature. Includes some children's classics (Alice in Wonderland, Wizard of Oz, etc.) but the catalog is small and curated for adults. No children's category filtering.

**Formats:** ePub (beautifully formatted), Kindle (azw3/kepub). No plain text or HTML.

**Terms of use:** Public domain. Free to use, redistribute, embed. CC0 dedication on their editorial work.

**Embeddable:** Yes. ePub files can be downloaded and rendered with epub.js.

**Rate limits:** Not documented for OPDS feeds. Small catalog makes bulk download feasible.

**Cost:** Free for New Releases feed. Patrons Circle (donation) for full OPDS access.

**Verdict: NICE-TO-HAVE.** Beautiful formatting but tiny catalog with limited kid content. Could use as an upgrade source for the few overlapping titles -- if a book exists on both Gutenberg and Standard Ebooks, prefer the Standard Ebooks version for its superior typography.

---

### 4. LibriVox

**URL:** https://librivox.org
**Catalog size:** 20,648 completed audiobook titles

**API access:**
- **Official API:** `https://librivox.org/api/feed/audiobooks/?format=json`
- Supports parameters: `id`, `title`, `author`, `genre`, `limit`, `offset`, `extended` (for full metadata)
- Example: `https://librivox.org/api/feed/audiobooks/?title=alice+wonderland&format=json`
- JSON and XML response formats
- Audio files hosted on Internet Archive as MP3s

**Kid-appropriate content:**
Good overlap with Project Gutenberg (same source texts). Many children's classics have audio recordings: Alice in Wonderland, Wizard of Oz, Treasure Island, Peter Pan, Wind in the Willows, etc. Recording quality varies (volunteer readers).

**Formats:** MP3 audio files (128kbps typical). Hosted on archive.org with direct download URLs.

**Terms of use:** All recordings are public domain (CC0 or equivalent). Free to stream, download, embed, redistribute. No restrictions.

**Embeddable:** Yes. MP3 files can be streamed directly with HTML5 `<audio>` element. Could build a read-along experience pairing Gutenberg text with LibriVox audio.

**Rate limits:** API has no documented limits. Audio files served from archive.org CDN.

**Cost:** Completely free.

**Verdict: HIGH VALUE ADD.** Pairing LibriVox audio with Gutenberg text creates a "read-along" experience that is extremely compelling for younger readers (ages 4-9). This is a differentiator no competitor offers. The API is simple and reliable.

---

### 5. Google Books API

**URL:** https://developers.google.com/books
**Catalog size:** 40+ million books indexed

**API access:**
- **Volumes API:** `https://www.googleapis.com/books/v1/volumes?q=QUERY` -- already used by SafeReads for book search
- **Embedded Viewer API:** JavaScript library that renders Google's book preview in an iframe
- **Preview Wizard:** Drop-in widget for adding previews to pages

**Kid-appropriate content:**
Full spectrum. Google indexes everything. Relies on SafeReads' existing filtering.

**Formats:** The Embedded Viewer renders scanned pages as images. Not extractable text. Preview coverage varies:
- Public domain books: Often full text available (overlaps with Gutenberg)
- Modern books: Typically 10-20% preview ("snippet view" or "limited preview")
- Some publishers opt out entirely ("no preview")
- `accessInfo.viewability` field indicates: `ALL_PAGES`, `PARTIAL`, `NO_PAGES`

**Terms of use:** Google Books ToS requires using their Embedded Viewer for display. Cannot extract or cache the preview content. Cannot display in a way that "obscures or modifies" Google branding.

**Embeddable:** Yes, via the Embedded Viewer API. Loads in an iframe with Google's reader UI. Functional but not customizable -- cannot control fonts, colors, or reading experience. Not ideal for a kid-focused app.

**Rate limits:** 1,000 requests/day without API key. With API key: typically 1,000 requests/day (free). Higher limits require billing project setup.

**Cost:** Free for search API (already in use). Embedded Viewer is free.

**Verdict: SUPPLEMENTARY.** Already used for search. The Embedded Viewer could show previews of modern books, but the experience is not kid-friendly (Google's reader UI is designed for adults). Better to use Gutenberg/LibriVox for the actual reading experience and keep Google Books for search/metadata only.

---

### 6. Feedbooks

**URL:** https://www.feedbooks.com
**Catalog size:** Distributes 3+ million ebooks/month; public domain catalog has thousands of titles

**API access:**
- **OPDS catalog:** `https://www.feedbooks.com/catalog.atom`
- Public domain feed available
- OPDS format (Atom XML) with links to ePub downloads

**Kid-appropriate content:**
Mixed. Public domain catalog overlaps with Gutenberg. No children-specific filtering in the OPDS feed.

**Formats:** ePub, PDF, Kindle-compatible. Clean formatting.

**Terms of use:** Public domain titles are free to download and use. OPDS feed is open.

**Embeddable:** Yes. ePub files downloadable and renderable with epub.js.

**Rate limits:** Not documented.

**Cost:** Free for public domain catalog.

**Verdict: LOW PRIORITY.** Overlaps with Gutenberg and Standard Ebooks. No unique value for kid content. Could serve as a backup ePub source.

---

### 7. ManyBooks.net

**URL:** https://manybooks.net
**Catalog size:** 50,000+ free ebooks

**API access:**
- No documented public API
- Catalog browsable by genre, author, language, format on the website
- Downloads available in ePub, PDF, MOBI, TXT without account

**Kid-appropriate content:**
Has genre categories but no specific children's section. Content overlaps heavily with Project Gutenberg (many titles are Gutenberg-sourced).

**Formats:** ePub, PDF, MOBI, TXT

**Terms of use:** Public domain titles. Free to download.

**Embeddable:** Manual download only. No API means no programmatic integration.

**Rate limits:** N/A (no API)

**Cost:** Free

**Verdict: SKIP.** No API, no unique content. Everything here is available via Gutenberg with better access.

---

### 8. International Children's Digital Library (ICDL)

**URL:** http://www.childrenslibrary.org
**Catalog size:** ~4,000 books in 59 languages

**API access:**
- No documented public API
- Books readable in a browser-based page-by-page reader on their site
- Cannot download books in standard formats

**Kid-appropriate content:**
Excellent -- this is the most kid-focused repository. All content is specifically curated children's literature from around the world. Includes picture books, early readers, and chapter books spanning ages 3-13. Multilingual collection is unique.

**Formats:** Scanned page images viewable in their web reader. No ePub, PDF, or text exports.

**Terms of use:** "Books are provided only for personal use. You do not have the right to redistribute these books further." This means we CANNOT embed their content in SafeReads.

**Embeddable:** No. Content locked to their reader. No download API. Terms prohibit redistribution.

**Rate limits:** N/A

**Cost:** Free to read on their site

**Verdict: LINK-OUT ONLY.** Cannot embed content, but we could link to their reader for books that match. The multilingual collection is unique and valuable for ESL families. Worth listing as a "read it here" resource.

---

### 9. StoryWeaver (Pratham Books) / African Storybook

**URL:** https://storyweaver.org.in | https://www.africanstorybook.org
**Catalog size:** StoryWeaver: 38,000+ stories in 300+ languages; African Storybook: 1,800+ stories

**API access:**
- StoryWeaver has no documented REST API, but all content is CC-BY-4.0 licensed
- Books can be read online, downloaded as PDF/ePub, and translated/repurposed
- African Storybook also uses Creative Commons licensing with downloadable content

**Kid-appropriate content:**
Outstanding. Both platforms are specifically designed for children. StoryWeaver focuses on ages 3-12 with reading levels clearly marked. Stories range from wordless picture books to longer chapter stories. Content is culturally diverse and multilingual -- a huge differentiator.

**Formats:** PDF, ePub, web-readable. StoryWeaver also offers editable source files.

**Terms of use:** CC-BY-4.0 (StoryWeaver) -- can embed, redistribute, even modify with attribution. This is the most permissive license of any source. African Storybook uses similar CC licenses.

**Embeddable:** Yes. ePub files downloadable and renderable with epub.js. Attribution to Pratham Books/StoryWeaver required.

**Rate limits:** Not documented. Content is downloadable.

**Cost:** Completely free.

**Verdict: HIGH VALUE for young readers (ages 3-9).** The CC-BY-4.0 license is ideal. 38,000 stories specifically for kids, with reading levels. Multilingual support is unmatched. Pair with LibriVox audio for older classics. StoryWeaver fills the "early reader" gap that Gutenberg lacks.

---

### 10. epub.js / React Reader

**URL:** https://github.com/futurepress/epub.js | https://github.com/gerhardsletten/react-reader
**Type:** Open source ePub rendering library

**Overview:**
- **epub.js** is the standard JavaScript library for rendering ePub files in the browser. Handles pagination, table of contents, search, annotations, bookmarks, and font customization.
- **react-reader** (v2.0.9 as of 2026) is a React wrapper around epub.js with TypeScript support, mobile responsiveness, and a clean default UI.
- **Flow** is another open-source ePub reader built on epub.js with search, theming, highlighting, and annotations.

**Key capabilities for SafeReads:**
- Render any ePub file in an iframe or React component
- Custom themes (fonts, colors, background) -- perfect for kid-friendly reading
- Font size adjustment (accessibility)
- Page-by-page or scrolling modes
- Table of contents navigation
- Search within book
- Bookmarks and annotations (saveable to Convex)
- Reading position tracking (percentage-based) -- syncable to Convex for progress tracking
- Offline support via service worker caching

**Integration with React/Next.js:**
```
npm install react-reader
// or
npm install epubjs
```
Drop-in component. Works with Next.js SSR (needs dynamic import with `ssr: false` since it requires browser APIs).

**License:** MIT (react-reader), BSD (epub.js). Free for commercial use.

**Verdict: THE rendering solution.** This is how we display ePub content from Gutenberg, StoryWeaver, Standard Ebooks, and any other ePub source. The React integration is mature and well-maintained.

---

### Recommended Content Strategy (Summary)

| Source | Role | Ages | Count | License |
|--------|------|------|-------|---------|
| Project Gutenberg (via Gutendex) | Primary classics library | 6-14 | 2,000+ kid titles | Public domain |
| StoryWeaver | Early readers & diverse stories | 3-9 | 38,000+ | CC-BY-4.0 |
| LibriVox | Audio read-along companion | 4-12 | 5,000+ kid titles | Public domain |
| Standard Ebooks | Premium formatting for key titles | 8-14 | ~100 kid titles | Public domain |
| Open Library | Link-out for borrowable modern books | All | 2M+ | Varies |
| ICDL | Link-out for multilingual picture books | 3-13 | 4,000 | Personal use only |
| epub.js / react-reader | Rendering engine | N/A | N/A | MIT/BSD |
| Google Books | Search & metadata (already in use) | N/A | 40M+ | ToS restricted |

**Total freely embeddable kid-appropriate books: ~40,000+**

---

## Part 2: Kid-Focused Experience Design

### Design Philosophy

Following the patterns established by SafeTunes and SafeStudy:

- **SafeTunes:** Family code -> profile selection -> parent-approved music -> play
- **SafeStudy:** Family code -> profile selection -> parent-set boundaries -> age-appropriate search
- **SafeReads:** Family code -> profile selection -> parent-approved bookshelf -> READ

The key insight: SafeReads already does the hard part (AI book analysis). The kid side transforms that analysis into a curated reading experience. Parents approve books; kids read them.

---

### Kid Login Flow

**Route:** `/read` and `/read/:familyCode` (mirrors SafeStudy's `/search/:familyCode` and SafeTunes' `/play`)

**Step 1: Family Code Entry**
- Large, friendly input field for 6-character family code
- Stored in `localStorage` as `safereads_family_code` (same pattern as SafeTunes)
- Direct URL support: `getsafereads.com/read/ABC123` pre-fills the code
- QR code on parent dashboard links to this URL (same as SafeTunes' Getting Started page)

**Step 2: Profile Selection**
- Shows all kid profiles for that family code
- Each profile shows: name, avatar (colored circle with initial), age
- Optional 4-digit PIN entry (if parent enabled it)
- Selected profile stored in `localStorage` as `safereads_kid_profile`

**Step 3: Kid Dashboard (The Bookshelf)**
- Immediately see their personal bookshelf
- Warm, inviting design -- think "cozy reading nook" aesthetic

---

### Kid Dashboard: "My Bookshelf"

The main screen kids see after logging in. Designed to feel like their personal library.

**Layout (mobile-first):**

```
+----------------------------------+
|  [Avatar] Hi, Emma!    [Logout]  |
|  Reading streak: 5 days          |
+----------------------------------+
|                                  |
|  CURRENTLY READING               |
|  +---+  +---+                    |
|  |   |  |   |  <- Book covers   |
|  | 64%| | 23%|  <- Progress bar  |
|  +---+  +---+                    |
|                                  |
|  MY BOOKS                        |
|  +---+ +---+ +---+ +---+        |
|  |   | |   | |   | |   |        |
|  +---+ +---+ +---+ +---+        |
|  +---+ +---+ +---+ +---+        |
|  |   | |   | |   | |   |        |
|  +---+ +---+ +---+ +---+        |
|                                  |
|  READING CHALLENGES              |
|  [ Read 5 books this month  3/5] |
|  [ Try a new genre         1/1]  |
|                                  |
+----------------------------------+
|  [Shelf] [Explore] [Requests]    |
+----------------------------------+
```

**Sections:**
1. **Currently Reading** -- Books with active progress. Large cover art with progress bar overlay. Tap to resume reading.
2. **My Books** -- Grid of all parent-approved books. Sorted by date added (newest first). Book covers with title below.
3. **Reading Challenges** -- Gamification section (see below)

**Bottom navigation tabs:**
- **Shelf** (home) -- The bookshelf above
- **Explore** -- "Books Like This" recommendations + curated free books
- **Requests** -- Request new books for parent approval

---

### Reading Experience

When a kid taps a book on their shelf:

**If the book has free readable content (Gutenberg/StoryWeaver):**

Full in-app reading experience powered by epub.js/react-reader:

```
+----------------------------------+
|  [<Back]  Charlotte's Web  [...]  |
|           Chapter 3 - 64%        |
+----------------------------------+
|                                  |
|  The barn was very large. It     |
|  was very old. It smelled of     |
|  hay and it smelled of manure.   |
|  It smelled of the perspiration  |
|  of tired horses and the         |
|  wonderful sweet breath of       |
|  patient cows.                   |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|  Tap word for definition ^       |
+----------------------------------+
|  [Aa] [Bookmark] [<<] [>>]      |
+----------------------------------+
```

**Reader features:**
- **Tap-to-define:** Tap any word to see an age-appropriate definition (use a free dictionary API like Free Dictionary API or Wiktionary). Definition complexity adjusts based on kid's age setting.
- **Font controls (Aa button):** Font size (5 levels), font family (serif/sans-serif/dyslexia-friendly like OpenDyslexic), line spacing, background color (white/sepia/dark)
- **Bookmarks:** Tap bookmark icon to save current position. Bookmarks list accessible from overflow menu.
- **Progress bar:** Visual indicator at top showing chapter and overall percentage
- **Auto-save position:** Reading position synced to Convex every 30 seconds and on page turn
- **Read-along mode:** If LibriVox audio exists for this book, show a headphones icon. Tap to play narration synced with text highlighting (chapter-level sync).

**If the book does NOT have free content:**

Show the book detail card (cover, SafeReads analysis summary, age recommendation) with options:
- "Read in Kindle" (deep link to Kindle app if available)
- "Read in Libby" (deep link to Libby app if available)
- "Find at Library" (link to WorldCat or local library search)
- "Buy on Amazon" (affiliate link, revenue opportunity)

---

### Reading Progress Tracking

**Convex schema additions:**

```
readingProgress: defineTable({
  kidId: v.id("kids"),
  bookId: v.id("books"),
  currentPage: v.optional(v.number()),
  totalPages: v.optional(v.number()),
  percentComplete: v.number(),        // 0-100
  currentChapter: v.optional(v.string()),
  epubCfi: v.optional(v.string()),     // epub.js position identifier
  lastReadAt: v.number(),             // Unix timestamp
  startedAt: v.number(),              // When kid first opened book
  completedAt: v.optional(v.number()), // When kid finished book
  totalReadingTimeMinutes: v.number(), // Cumulative time spent reading
  sessionsCount: v.number(),          // Number of reading sessions
})
  .index("by_kid", ["kidId"])
  .index("by_kid_and_book", ["kidId", "bookId"])
  .index("by_kid_last_read", ["kidId", "lastReadAt"])

readingSessions: defineTable({
  kidId: v.id("kids"),
  bookId: v.id("books"),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  pagesRead: v.optional(v.number()),
  minutesRead: v.number(),
})
  .index("by_kid", ["kidId"])
  .index("by_kid_and_date", ["kidId", "startedAt"])

bookmarks: defineTable({
  kidId: v.id("kids"),
  bookId: v.id("books"),
  epubCfi: v.string(),
  label: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_kid_and_book", ["kidId", "bookId"])

vocabulary: defineTable({
  kidId: v.id("kids"),
  word: v.string(),
  definition: v.string(),
  bookId: v.optional(v.id("books")),
  lookedUpAt: v.number(),
  mastered: v.optional(v.boolean()),
})
  .index("by_kid", ["kidId"])
```

**What parents see on their dashboard:**
- Per-kid reading activity: books in progress, pages read today/this week, time spent reading
- Completion history: finished books with dates
- Vocabulary words looked up (great conversation starters)
- Reading pace trends over time

---

### Reading Timer (Time Limits)

Same pattern as SafeStudy's time limits system:

**Parent controls (in admin settings per kid):**
- Daily reading limit: 30min / 1hr / 2hr / 3hr / Unlimited
- Weekend reading limit (separate setting)
- Allowed reading hours: e.g., 7 AM - 9 PM
- "Bonus time" button: grant extra 30min for today

**Kid experience:**
- Gentle countdown warning at 5 minutes remaining ("5 more minutes of reading time!")
- When time expires: bookmark is auto-saved, screen shows friendly message: "Great reading today! You read for 45 minutes. Come back tomorrow!"
- Cannot bypass -- book content is not rendered after time limit
- Reading outside allowed hours shows: "Reading time starts at 7:00 AM. See you then!"

**Note:** Unlike screen time limits, reading time limits should be generous by default. Most parents WANT their kids reading more. The limit exists primarily for bedtime enforcement. Consider defaulting to "Unlimited" and letting parents opt into limits.

---

### Dictionary / Vocabulary Lookup

**Tap-to-define flow:**
1. Kid taps a word in the reading view
2. Word is highlighted
3. A small popup appears below with:
   - **Simple definition** (age-adjusted based on kid's age setting)
   - **Pronunciation** (phonetic spelling)
   - **"Add to My Words"** button (saves to vocabulary list)
4. Tap elsewhere to dismiss

**Dictionary API options:**
- **Free Dictionary API** (https://dictionaryapi.dev) -- free, no key, good for ages 8+
- **Wiktionary API** -- free, comprehensive, but definitions need simplification
- **Wordnik API** -- free tier (25,000 calls/day), has kid-appropriate simple definitions
- For younger kids (ages 4-7): pre-process definitions through a simple GPT prompt to rewrite at appropriate reading level

**Vocabulary list ("My Words"):**
- Accessible from the kid dashboard
- Shows all words looked up, organized by book
- Simple flashcard mode for review
- Parents can see vocabulary list in their dashboard (great for homeschool families)

---

### Kid Discovery ("Explore" Tab)

**"Books Like This" recommendations:**
When a kid finishes a book or is reading one, show recommendations based on:
- Same author's other works (already have author overview feature)
- Same genre/category
- Similar age range and content level
- SafeReads analysis data: books with similar themes but at the kid's approved content level

**Curated free books:**
- Pre-loaded shelves of Gutenberg/StoryWeaver content organized by age and topic:
  - "Adventure Stories" (Treasure Island, Swiss Family Robinson, etc.)
  - "Fairy Tales & Myths" (Grimm's, Andersen's, etc.)
  - "Animal Stories" (Black Beauty, Call of the Wild, etc.)
  - "Early Readers" (StoryWeaver Level 1-2)
  - "Picture Books" (StoryWeaver + Gutenberg picture books)
  - "Science & Nature" (StoryWeaver nonfiction)
- These are pre-analyzed by SafeReads AI so parents can review the analysis before adding to a kid's shelf

**How it works:**
- Kid browses Explore tab
- Sees book cover, title, brief description, age recommendation
- Taps "Request" to ask parent for approval
- Parent gets notification, sees SafeReads analysis, approves/denies
- If approved with free content available, book appears on kid's shelf ready to read

---

### Book Requests

**Kid flow:**
1. Kid sees a book in Explore or hears about one from a friend
2. Taps "Request" button
3. Optionally adds a note: "My friend said this is really good!"
4. Request appears in parent dashboard

**Parent flow:**
1. Notification: "Emma requested 'Percy Jackson: The Lightning Thief'"
2. Sees SafeReads AI analysis (auto-generated if not already in database)
3. Sees content flags, age recommendation, verdict
4. Approve or deny with optional message back to kid
5. If approved: book added to kid's shelf

This mirrors SafeTunes' music request system and SafeStudy's topic request system.

---

### Gamification: Reading Challenges & Badges

**Reading Streaks:**
- Track consecutive days with reading activity (minimum 10 minutes)
- Display streak count prominently on dashboard
- Streak milestones: 7 days, 14 days, 30 days, 100 days
- Streak freeze: parent can grant a "day off" that doesn't break the streak (vacation, sick day)

**Badges (earned automatically):**
- "Bookworm" -- Read 5 books
- "Speed Reader" -- Finish a book in one day
- "Genre Explorer" -- Read books from 3 different genres
- "Word Collector" -- Look up 50 vocabulary words
- "Marathon Reader" -- Read for 2 hours in one session
- "Night Owl" -- Read before bedtime 7 days in a row
- "Library Card" -- Read 10 free public domain books
- "Storyteller" -- Read books from 3 different countries (StoryWeaver)
- "Chapter Champion" -- Finish a book over 200 pages
- Age-specific badges for younger vs. older readers

**Reading Challenges (parent-set or system-generated):**
- "Read 5 books this month" (progress bar visible)
- "Try a new genre this week"
- "Read for 20 minutes every day for a week"
- Parents can create custom challenges with custom rewards

**Monthly Reading Report:**
- Auto-generated at month end
- Sent to parent email
- "This month, Emma read 4 books, spent 12 hours reading, learned 28 new words, and earned 2 badges!"
- Shareable (parents love sharing their kids' achievements)

---

### Parent Controls (Admin Dashboard Additions)

**Per-kid settings (extending existing kid profiles):**
- **Approved bookshelf:** Which books the kid can see and read
- **Reading time limits:** Daily/weekend, allowed hours (same pattern as SafeStudy)
- **Reading level filter:** Only show books at or below this level
  - Levels: Picture Book, Early Reader, Chapter Book (ages 6-8), Middle Grade (ages 8-12), Young Adult (ages 12+)
  - Maps to SafeReads' existing age recommendation data
- **Content filter threshold:** Use SafeReads' existing profile system (violence, language, sexual content, etc.) to automatically filter which books from Explore are visible to the kid
- **Auto-approve free classics:** Toggle to automatically approve public domain books that pass the content filter (reduces parent workload)
- **Vocabulary notifications:** Get notified when kid looks up a word (optional, for homeschool parents)

**Dashboard additions for parents:**
- "Reading Activity" card per kid: time read today, current book, pages this week
- "Pending Requests" with one-tap approve/deny
- "Reading Report" monthly summary
- "Books Completed" history with dates

---

### Technical Architecture

**ePub Reader Integration:**

```
// Dynamic import for Next.js (epub.js needs browser APIs)
const ReactReader = dynamic(() => import('react-reader'), { ssr: false });

// Component structure
<ReactReader
  url={epubUrl}                    // From Gutenberg/StoryWeaver CDN
  location={savedCfi}              // Restored from Convex readingProgress
  locationChanged={handleLocationChanged}  // Save to Convex
  getRendition={rendition => {
    // Customize theme
    rendition.themes.default({
      body: { fontFamily: kidFontFamily, fontSize: kidFontSize },
      p: { lineHeight: '1.8' },
    });
    // Handle word tap for dictionary
    rendition.on('selected', handleWordSelected);
  }}
/>
```

**Reading Progress Sync:**
- `locationChanged` callback fires on every page turn
- Debounce to save every 30 seconds (avoid excessive Convex writes)
- Save `epubCfi` (epub.js position identifier), percentage, chapter name
- On resume: restore position from Convex `readingProgress` table
- Sync reading session duration: start timer when book opens, pause when app backgrounds, save on close

**Family Code System (same as SafeTunes/SafeStudy):**
- Users table already has `familyCode` field in SafeStudy schema
- Add `familyCode` to SafeReads users table (6-char alphanumeric, unique)
- Query `kidProfiles` by family code (already indexed in SafeTunes/SafeStudy)
- Add kid PIN support (optional 4-digit PIN per kid)

**Free Book Content Pipeline:**
1. SafeReads AI analyzes a book (existing flow)
2. System checks if free content exists:
   - Query Gutendex by title + author -> get Gutenberg ID -> construct ePub URL
   - Query StoryWeaver by title -> get download URL
   - Check Standard Ebooks OPDS feed
3. If match found, store `freeContentUrl` and `freeContentSource` on the books table
4. When kid taps "Read," load ePub from the source URL into react-reader
5. Cache ePub files in browser via service worker for offline reading

**Matching SafeReads Analyses to Free Books:**
- SafeReads stores `googleBooksId` and `isbn13` on books
- Gutendex API supports ISBN search: `https://gutendex.com/books/?search=ISBN`
- Open Library supports ISBN lookup: `https://openlibrary.org/isbn/{isbn}.json`
- Matching flow: ISBN first (most reliable), then title+author fuzzy match
- Store mapping in a new `freeBookSources` table:

```
freeBookSources: defineTable({
  bookId: v.id("books"),
  source: v.union(
    v.literal("gutenberg"),
    v.literal("storyweaver"),
    v.literal("standard_ebooks"),
    v.literal("librivox_audio")
  ),
  sourceId: v.string(),           // Gutenberg ID, StoryWeaver ID, etc.
  epubUrl: v.optional(v.string()),
  audioUrl: v.optional(v.string()),
  format: v.optional(v.string()), // "epub", "html", "mp3"
  verifiedAt: v.number(),         // When we last verified the link works
})
  .index("by_book", ["bookId"])
  .index("by_source", ["source"])
```

---

### What Makes This a "Can't Put Down" Experience for Kids

1. **Instant gratification:** Thousands of free books ready to read NOW. No waiting for library holds, no buying, no leaving the app.
2. **Read-along mode:** LibriVox audio + Gutenberg text is magical for emerging readers. They hear the words while seeing them highlighted.
3. **Tap-to-define:** Builds vocabulary without breaking reading flow. Kids feel smart when they learn new words.
4. **Streak gamification:** "I can't break my streak!" is powerful motivation. Same psychology as Duolingo.
5. **Badge collection:** Visible progress gives kids ownership over their reading journey.
6. **Their own bookshelf:** Personalized space with "their" books feels special.
7. **Beautiful reading experience:** epub.js allows custom fonts, colors, dark mode -- kids can make the reader "theirs."

### What Makes This a "Must Have" for Parents

1. **AI content analysis + free reading in one app:** No other product does both. Parents check the book, then the kid reads it -- all in SafeReads.
2. **Reading time tracking:** Parents see exactly what and how much their kids read. Homeschool parents can use this for reading logs.
3. **Vocabulary insights:** See what words your kid is looking up. Great conversation starters.
4. **Content control:** The book analysis already exists. Now it directly gates what the kid can read.
5. **No ads, no links out, no social:** The reading environment is completely controlled. No ads, no user comments, no links to external content.
6. **Monthly reading reports:** Shareable achievement summaries. Parents share these in homeschool groups (organic marketing).
7. **Free books = free value:** Thousands of classic books at no additional cost. Parents pay for SafeReads and get a complete reading platform.

---

## Commercial Platform Integrations

Even when we cannot embed the actual reading experience, we can create a "hub" that links OUT to where the kid can read or listen, and track their activity back in SafeReads.

---

### 1. Kindle Integration

**Official API status:** Amazon does NOT provide a public Kindle API for third-party apps. There is no official way to:
- Access a user's Kindle library
- See what books they own
- Trigger downloads or reading sessions
- Get reading progress data

**Unofficial approaches:**
- **kindle-api** (https://github.com/Xetera/kindle-api): Node.js library accessing Kindle's private API without a headless browser. Can retrieve highlights, notebooks, and library data. However, relies on reverse-engineered endpoints that Amazon can change or block at any time. Uses TLS client proxy due to Amazon's fingerprinting.
- **Lector** (https://github.com/msuozzo/Lector): Python API for Kindle data (highlights, notes, books).

**Deep linking:**
- **Kindle iOS app URL scheme:** `kindle://` opens the Kindle app. Specific book deep links are not well-documented publicly.
- **Kindle Mac app:** Supports Copy Link for deep linking to specific passages (via Hookmark integration), but this is desktop-only.
- **Amazon web links:** `https://read.amazon.com/` opens Kindle Cloud Reader. Books are accessible at `https://read.amazon.com/reader?asin=ASIN_HERE` if the user owns the book.
- **"Send to Kindle":** Amazon offers a "Send to Kindle" button/API that can send documents to a user's Kindle. Could potentially send free Gutenberg ePubs to their Kindle.

**Realistic integration path:**
- Phase 1: "Read in Kindle" button that links to `https://www.amazon.com/dp/ASIN` (buy page) or `kindle://` URL scheme (opens app)
- Phase 2: "Send to Kindle" for free Gutenberg books -- send the ePub directly to the kid's Kindle
- Phase 3 (risky): Use unofficial API to pull library data for display in SafeReads, understanding it could break

**Recommendation:** Link-out only. Do not depend on unofficial APIs for core functionality. Use Amazon Product Advertising API (official, for affiliates) to get ASINs and buy links. This also creates an affiliate revenue stream.

---

### 2. Audible Integration

**Official API status:** Audible does NOT provide a public API. No official documentation exists.

**Unofficial approaches:**
- **audible** (https://audible.readthedocs.io): Python library for Audible's private API. Supports authentication, library retrieval, audiobook downloads (aax/aaxc), cover art, chapter info, and PDF companions. Actively maintained (last update Jan 2026).
- **AudibleApi** (https://github.com/rmcrackan/AudibleApi): C# implementation of Audible's internal API.
- **OpenAudible** (https://openaudible.org): Desktop tool for managing/backing up Audible libraries.

**Deep linking:**
- **Audible iOS URL scheme:** `audible://` opens the Audible app. Deep linking to specific books: `audible://library?asin=ASIN`
- **Web links:** `https://www.audible.com/pd/ASIN` opens the book page
- No way to trigger playback from outside the app

**Realistic integration path:**
- "Listen on Audible" button with link to `https://www.audible.com/pd/ASIN` or `audible://` URL scheme
- Could pair with LibriVox: "Free audiobook available!" for public domain titles, "Also on Audible" for modern titles
- Cannot see family's Audible library without unofficial API

**Recommendation:** Link-out only. Audible links for modern audiobooks, LibriVox audio for public domain books (embedded directly).

---

### 3. Amazon Kids+ (formerly FreeTime)

**Official API status:** No public API for Amazon Kids+ content. Amazon Kids+ is a walled-garden subscription service for Fire tablets and Echo devices.

**Developer integration:**
- Amazon allows apps to be included IN Amazon Kids+ by publishing on the Amazon Appstore and meeting their child-directed app guidelines.
- The in-app purchase API supports a parent-approval flow where kids request purchases and parents approve/deny.
- No way to query what content a family has access to through Amazon Kids+.

**Realistic integration path:**
- Could publish SafeReads as an Amazon Kids+ compatible app on the Amazon Appstore
- No API integration possible for pulling reading data or library contents
- Amazon Kids+ is a competitor more than an integration partner

**Recommendation:** Skip direct integration. Publishing SafeReads on Amazon Appstore as a Fire tablet app could be a future distribution channel, but there is no useful API to integrate with.

---

### 4. Libby / OverDrive

**Official API status:** OverDrive has a full developer portal with documented APIs.

**Developer Portal:** https://developer.overdrive.com

**Available APIs:**
- **Patron Information API:** Get patron details, links to checkouts and holds
- **Checkouts API:** Borrow, return, and check status of titles
- **Holds API:** Place and manage holds
- **Library Availability API:** Check if a title is available, number of copies, number of holds
- **Search API:** Search library catalogs
- **Library Account API:** Library collection information

**Authentication:** Requires library card number + PIN. OAuth2 flow for patron authentication.

**Deep linking:**
- Libby share links are available in OverDrive API responses (as of May 2024 update)
- Format: `https://share.libbyapp.com/title/TITLE_ID`
- Libby app opens these links directly on mobile
- No `libby://` URL scheme documented, but the share links work as universal links

**Terms:** API access requires partnership application through the OverDrive Developer Portal. Designed for library systems and discovery platforms. A reading-focused app for families would likely qualify.

**Realistic integration path:**
- Phase 1: Use Library Availability API to show "Available at your library" badges on books in SafeReads. Link out to Libby share URL for checkout.
- Phase 2: Apply for full API access. Show "Checked Out" / "On Hold" status within SafeReads. Enable one-tap holds from within SafeReads.
- Phase 3: Display due dates for checked-out library ebooks alongside SafeReads progress tracking.

**Recommendation: HIGHEST PRIORITY commercial integration.** OverDrive/Libby is the most library-friendly platform with actual documented APIs. Many SafeReads families already use Libby. Showing library availability alongside SafeReads reviews is a natural fit. Apply for developer access immediately.

---

### Integration Summary

| Platform | API Status | Can See Library? | Can Deep Link? | Can Track Progress? | Priority |
|----------|-----------|-----------------|----------------|-------------------|----------|
| Kindle | No official API | No (unofficial only) | Partial (web links) | No | Low |
| Audible | No official API | No (unofficial only) | Yes (URL scheme) | No | Low |
| Amazon Kids+ | No API | No | No | No | Skip |
| Libby/OverDrive | Full documented API | Yes (with partnership) | Yes (share links) | Checkout status only | HIGH |

**The realistic near-term approach:**
1. **Libby:** Apply for OverDrive developer access. Show library availability on book pages.
2. **Kindle/Audible:** Simple link-out buttons using web URLs and URL schemes. No library sync.
3. **Free content:** Embed Gutenberg + StoryWeaver + LibriVox directly (no link-out needed).
4. **Amazon affiliate links:** Use Amazon Product Advertising API for buy links. Revenue opportunity.

---

## Library Account Integration

### The Vision

Connect SafeReads to a family's local library account to create a unified reading management experience:
- See all checked-out physical and digital books in one place
- Get due date reminders (push notification or email)
- Auto-run SafeReads AI analysis on newly checked-out books
- Track reading progress for library books alongside free/owned books
- One-tap renewal from within SafeReads

---

### Library Protocols & Systems

#### SIP2 (Standard Interchange Protocol v2)

**What it is:** The standard protocol for self-checkout machines to communicate with library management systems. Originally designed for 3M self-service terminals.

**Patron data capabilities:**
- Patron status request (messages 23/63): validates patron barcode, checks if account is blocked/active
- Patron information request (message 63): retrieves patron details including items checked out, items overdue, hold items, fine details
- Can query checked-out items with due dates
- Can perform renewals

**Limitations:**
- SIP2 is a TCP socket protocol, not HTTP/REST. Requires a persistent TCP connection to the library's SIP server.
- Libraries must explicitly enable SIP2 access and provide server address/port.
- Most libraries only grant SIP2 access to approved vendors (self-checkout machines, ILL systems).
- No standard authentication beyond IP whitelisting + username/password.
- Getting individual libraries to grant SIP2 access to a third-party app is extremely difficult.

**Supported by:** Nearly all ILS systems (Koha, Evergreen, Sierra, Polaris, Symphony, Alma, FOLIO).

**Verdict:** Technically capable of everything we need, but the access model is wrong for a consumer app. SIP2 is designed for on-premises hardware, not cloud services.

---

#### NCIP (NISO Circulation Interchange Protocol)

**What it is:** An XML-based protocol (NISO Z39.83) designed for library system interoperability. Covers three main areas: Direct Consortial Borrowing, Circulation/ILL Interaction, and Self-Service Circulation.

**Patron data capabilities:**
- LookupUser: retrieve patron info, items checked out, holds, fines
- RenewItem: renew a checked-out item
- CheckOutItem / CheckInItem: circulation operations

**Limitations:**
- XML-based (SOAP-style), not REST
- Each library implements NCIP differently (variations in supported messages)
- Same access problem as SIP2: libraries must grant access to third parties
- Less widely deployed than SIP2

**Supported by:** Alma (Ex Libris), FOLIO, Koha, Sierra/Polaris (limited), OCLC systems.

**Verdict:** More standardized than SIP2 for inter-system communication, but still has the gatekeeper problem. Libraries must opt in.

---

#### OverDrive/Libby API (Digital Checkouts)

Covered in detail in the Commercial Platform Integrations section above. This is the most realistic path for DIGITAL library book tracking.

**Key capabilities for library integration:**
- Patron Information API: see digital checkouts and holds
- Checkouts API: borrow, return, check status
- Holds API: place and manage holds
- Can determine due dates for digital checkouts

**The big gap:** OverDrive only covers DIGITAL library items (ebooks and audiobooks borrowed through Libby). It does NOT cover physical books checked out from the library. Physical book tracking requires ILS integration.

---

#### Major ILS Systems and Their APIs

**Koha (Open Source)**
- **REST API:** Full RESTful API at `/api/v1/`
- **Patron checkouts endpoint:** `GET /api/v1/patrons/{patron_id}/checkouts`
- **Holds:** `GET /api/v1/holds`
- **Renewals:** `PUT /api/v1/checkouts/{checkout_id}`
- **Authentication:** OAuth2 or API key
- **Market:** ~4,600 libraries worldwide, 41 new contracts signed in 2024
- **Verdict:** Best API of any ILS. Open source means we can study the full API surface. If we start with one ILS, start here.

**Evergreen (Open Source)**
- **REST API:** New RESTful endpoints added recently (2024-2025)
- **Legacy API:** OpenSRF (Service Request Framework) -- complex, non-standard
- **Market:** ~895 library installations, primarily US public libraries
- **Verdict:** Improving API surface, but historically difficult to work with. Lower priority than Koha.

**Sierra / Polaris (Innovative Interfaces / iii)**
- **Sierra REST API:** Well-documented, supports patron records, checkouts, holds, fines
- **Polaris API:** Patron records including personal details, demographics, materials charged/requested
- **Market:** Very large -- thousands of libraries (proprietary, expensive)
- **Access:** Requires partnership with Innovative/iii. Libraries cannot independently grant API access.
- **Verdict:** Important long-term but requires vendor partnership.

**SirsiDynix Symphony/Horizon**
- **Symphony API:** Available but documentation is partner-restricted
- **Market:** Large presence in academic and public libraries
- **Verdict:** Similar access challenges as Sierra/Polaris.

---

#### BiblioCommons

**What it is:** A discovery layer (catalog frontend) used by many large public library systems (New York, Chicago, Seattle, etc.). Not an ILS itself -- sits in front of Sierra, Polaris, Symphony, etc.

**API:** Available at developer.bibliocommons.com. REST API, 5,000 calls/key/day. Provides catalog search, availability, and patron features through a unified interface regardless of underlying ILS.

**Key value:** BiblioCommons abstracts away the ILS differences. If we integrate with BiblioCommons, we get access to all their member libraries without caring whether they run Sierra, Polaris, or Symphony underneath.

**Limitations:** API access is typically granted to library partners only. Would need to apply and demonstrate value to libraries.

**Verdict:** High leverage if we can get access. One integration covers many large library systems.

---

#### Clever / ClassLink (Educational SSO)

**What they are:** Single Sign-On platforms for K-12 schools. Students log in once and get access to all their educational apps.

**Library integration:** Limited. Clever and ClassLink manage app access and student rostering, not library circulation. Some libraries use them for patron authentication (student ID = library card), but Clever/ClassLink themselves don't have checkout/hold/due-date data.

**How they could help SafeReads:**
- If SafeReads integrates with Clever/ClassLink, schools could deploy SafeReads to students with zero-touch setup
- Student's school library card could be automatically linked (if the library supports SSO)
- Reading progress could flow into the school's learning management system

**Verdict:** Valuable for school distribution, not for library account data. Separate initiative from home library integration.

---

#### "Plaid for Libraries" -- Does It Exist?

**Short answer:** No. There is no equivalent of Plaid (bank account aggregator) for library accounts. No company has built a universal library card linking service that normalizes patron data across ILS systems.

**Why not:**
- Libraries are decentralized (16,000+ public library systems in the US alone)
- Each runs different ILS software with different APIs
- No standard for patron authentication across systems
- Privacy concerns around library records (ALA has strong positions on patron privacy)
- Market too small and fragmented for a venture-backed aggregator

**Closest things:**
- **OverDrive** normalizes digital checkouts across 90% of US public libraries
- **BiblioCommons** normalizes catalog/patron UI for ~200 large library systems
- **FOLIO** is building toward open library infrastructure but it is not an aggregator

---

### Manual Approach: Parent-Entered Library Data

**Could we scrape library account pages?**

This is technically possible but strongly NOT recommended:
- Library websites change frequently (fragile scraping)
- Would need to store library login credentials (security liability)
- Different CSS/HTML for every library system
- Many libraries use CAPTCHA or bot detection
- Potential terms-of-service violations
- ALA would object on privacy grounds

**Better manual approach: "My Library Books" feature**

Let parents manually add library books they have checked out:

1. Parent searches for a book in SafeReads (existing search flow)
2. Taps "Add to Library Books" with due date
3. Book appears on kid's shelf with a library badge and due date
4. SafeReads auto-runs AI analysis if not already done
5. Reminders sent: 3 days before due, day of, overdue
6. Parent taps "Returned" or "Renewed" to update

This is dead simple, works with ANY library, requires no API integration, and still provides 80% of the value (due date reminders, auto-analysis, unified reading list).

---

### Realistic Rollout Path

**Phase 1 (Launch): Manual Library Books**
- "Add Library Book" button in parent dashboard
- Enter due date manually
- Due date reminders via push notification / email
- Auto-analyze on add
- Works with every library in the world, zero integration needed

**Phase 2 (3-6 months): OverDrive/Libby Integration**
- Apply for OverDrive developer API access
- Show "Available at Library" badges on book search results
- "Borrow in Libby" one-tap button
- Sync digital checkout due dates automatically
- This covers digital library books without needing ILS integration

**Phase 3 (6-12 months): Koha REST API**
- Build integration with Koha's REST API
- Parent links their library card (Koha libraries only)
- Auto-pull checkouts, holds, due dates for physical AND digital books
- Auto-analyze newly checked-out books
- One-tap renewal
- Target homeschool-friendly library systems that run Koha

**Phase 4 (12+ months): BiblioCommons Partnership**
- Apply for BiblioCommons API access
- One integration covers major metro library systems (NYPL, Chicago, Seattle, etc.)
- Significantly expands reach without per-ILS integration work

**Phase 5 (Future): Barcode Scanning**
- Use phone camera to scan book barcode (ISBN)
- Auto-add to "My Library Books" with one tap
- Look up due date if library integration exists
- Even without library integration, scanning a barcode is faster than searching

---

### What Library Integration Enables for Parents

1. **One place for everything:** Library books, free books, and owned books all on one shelf with reading progress
2. **Never pay a late fee again:** Due date reminders before the book is overdue
3. **Pre-read review:** When a library book is checked out, SafeReads analysis is ready before the kid opens the book
4. **Reading log for homeschool:** Complete record of every book read, whether library, free, or owned. Exportable for homeschool reporting.
5. **Hold notifications:** "Your hold on Percy Jackson is ready for pickup!" Push notification to parent.

---

*Document created: April 1, 2026*
*For implementation, start with Phase 1 (Manual Library Books) -- it provides immediate value with zero external dependencies.*
