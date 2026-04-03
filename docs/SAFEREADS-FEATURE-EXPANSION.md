# SafeReads Feature Expansion Plan

*Research completed: April 1, 2026*

---

## 1. Current State Assessment

### What SafeReads Does Today

SafeReads is an AI-powered book content analysis tool for parents. Here is everything it currently offers:

**Core Analysis Engine**
- Search books by title, author, or ISBN via Google Books API
- Barcode scanner (ISBN) using device camera
- Cover photo identification via GPT-4o vision
- AI content analysis (GPT-4o) with 10 content categories: Violence, Language, Sexual Content, Substance Use, Dark Themes, Supernatural/Occult, Religious/Worldview, Romance, Identity/Gender, Social/Political
- Four severity levels per category: none / mild / moderate / heavy
- Three-tier verdict system: Safe / Caution / Warning
- Age recommendations with three tiers: read-aloud age, independent reader age, mature-enough-to-process age
- Series context awareness (series name, book number, content progression across the series)
- Challenged/banned book status (ALA lists)
- Parent community notes (synthesized from Common Sense Media, Goodreads, homeschool communities)
- Comparable books calibration ("If your child handled X, this is similar")
- Parent talking points (conversation starters)
- Safer alternative suggestions (3-5 books with lower content intensity)
- DoesTheDogDie.com integration for crowdsourced trigger warnings
- Open Library enrichment (description, subjects, first sentence, covers)
- One analysis per book (objective, cached permanently, shared across all users)

**Author Pages**
- Author search mode (browse all books by author)
- AI-generated author overview (writing style, typical age range, common themes, content patterns)
- Author overview caching

**Organization Features**
- Kid profiles (name + age)
- Per-kid wishlists (add books, attach notes, see verdict badges)
- Personal book notes (per user, per book)
- Search history (recent searches, clear all)

**AI Chat Advisor**
- Conversational AI assistant for book recommendations
- Context-aware: knows the parent's kids (names, ages) and recently reviewed books
- Multi-conversation support with auto-titling
- Suggested prompts for new users

**Other**
- Report system (flag analyses as too lenient, too strict, factual error, missing content)
- Share verdict button
- Amazon affiliate link button
- 7-day free trial, $4.99/mo subscription
- Dark mode (ThemeProvider + ThemeToggle components exist)

### What the Landing Page Promises vs. What Exists

| Promise | Status |
|---------|--------|
| AI-powered content analysis | Delivered |
| 10 content categories | Delivered |
| Barcode scanning | Delivered |
| Cover photo scanning | Delivered |
| Wishlists for kids | Delivered |
| AI chat advisor | Delivered |
| iOS & Android apps | Promised "coming soon" on landing page, not built |

### What Is Missing (The Gap)

SafeReads is currently a **lookup tool** -- you search a book, get a one-time analysis, and move on. There is no reason to come back daily. The app lacks:

1. **Ongoing engagement** -- nothing pulls parents back after the initial analysis
2. **Reading lifecycle management** -- no way to track what kids are actually reading
3. **Discovery** -- no browse, no curated lists, no "what should we read next?"
4. **Community** -- every parent is isolated; no shared knowledge
5. **Curriculum integration** -- the #1 audience (homeschoolers) gets no curriculum tools
6. **Kid-facing features** -- kids have zero interaction with the app

---

## 2. Competitive Landscape

| Competitor | Strengths | Weaknesses | SafeReads Opportunity |
|-----------|-----------|------------|----------------------|
| **Common Sense Media** | Large human-reviewed library, brand trust, age ratings | Limited coverage (~30K books), subjective reviewer opinions, no personalization, slow to add new titles | Instant analysis of ANY book, objective multi-category breakdown, personalization via kid profiles |
| **Goodreads** | Massive community, reading tracking, social features, lists | No content safety focus, reviews are spoiler-filled and unreliable for parents, owned by Amazon | Safety-first angle that Goodreads will never prioritize |
| **BookLook** | Christian content reviews, worldview analysis | Tiny catalog, one denominational lens, no tech features | Broader worldview coverage (10 categories), objective rather than one-perspective reviews |
| **Redeemed Reader** | Thoughtful Christian book reviews, homeschool focus | Manual reviews = slow, limited catalog | AI speed + homeschool curriculum alignment |
| **Library summer reading programs** | Free, gamified, local community | Seasonal only, no content safety, clunky apps | Year-round engagement with safety built in |
| **Beanstack** | Reading tracking, challenges, library integration | No content analysis, institutional focus | Combine tracking + analysis in one place |

**Key insight:** No competitor combines content analysis + reading tracking + curriculum alignment + discovery. SafeReads can own this intersection.

---

## 3. Feature Recommendations

### A. Core Enhancement (Make What Exists Better)

#### A1. Reading Level Display
- **What:** Show Lexile range, AR (Accelerated Reader) level equivalent, and Guided Reading level alongside the age recommendation. Pull from Open Library metadata or estimate via GPT based on page count, vocabulary complexity, and genre.
- **Why parents want it:** Homeschool parents and parents of struggling/advanced readers need precise reading levels, not just age ranges. Schools use Lexile/AR; parents want the same language.
- **Effort:** Small (add fields to analysis prompt, display in VerdictCard)
- **Revenue potential:** Medium -- makes SafeReads feel more "educational tool" than "opinion app"
- **Priority:** Must-have

#### A2. Side-by-Side Book Comparison
- **What:** Select two books and see their content flags compared in a table. Highlights where one book is safer or more intense than the other.
- **Why parents want it:** "My kid wants to read Book X. Is it more or less intense than Book Y, which I already approved?" This is a daily parent question.
- **Effort:** Small (UI only -- analyses already cached, just render two side by side)
- **Revenue potential:** Low directly, but high for engagement/stickiness
- **Priority:** Should-have

#### A3. Deeper Series Intelligence
- **What:** When viewing any book in a series, show a visual timeline of the full series with per-book verdicts, so parents can see exactly where the content ramps up. "Books 1-3: Safe. Book 4: Caution. Books 5-7: Warning."
- **Why parents want it:** Parents approve Book 1, kid devours the series, and Book 4 suddenly has content they did not expect. This happens constantly with Harry Potter, Hunger Games, Percy Jackson.
- **Effort:** Medium (need series detection via Open Library, batch analysis, new UI component)
- **Revenue potential:** High -- this is a unique differentiator no competitor offers
- **Priority:** Must-have

#### A4. Re-Analysis Quality Improvements
- **What:** For books with reports flagged by users (too lenient / too strict), incorporate that feedback into re-analysis prompts. Show a "community accuracy score" based on report ratios.
- **Why parents want it:** Builds trust that analyses improve over time.
- **Effort:** Small (already have reports table, just feed into prompt)
- **Revenue potential:** Low directly, high for trust and retention
- **Priority:** Nice-to-have

---

### B. Library & Organization

#### B1. Bookshelves (Approved / Maybe / Rejected)
- **What:** Replace the single "wishlist" with three shelves per kid: Approved (parent-vetted, kid can read), Maybe (needs review), and Rejected (not appropriate yet). Books move between shelves with one tap.
- **Why parents want it:** The current wishlist is a flat list with no status. Parents need triage. "I looked at this book and it's fine" vs. "I need to review this" vs. "Not yet."
- **Effort:** Small (add a `status` field to wishlists table, update UI with tabs/filters)
- **Revenue potential:** High -- this is the foundation for ongoing engagement
- **Priority:** Must-have

#### B2. Reading Log / Tracker
- **What:** For each kid, track books read (start date, finish date, rating, optional short review from the kid). Show reading stats: books this month, pages this year, streak counter.
- **Why parents want it:** Homeschool parents need to document reading for portfolios/records. All parents want to see their kids' reading habits. Kids are motivated by visible progress.
- **Effort:** Medium (new `readingLog` table, new UI pages, stats calculations)
- **Revenue potential:** Very high -- this is what makes parents open the app weekly instead of once
- **Priority:** Must-have

#### B3. "Read Next" AI Recommendations
- **What:** Based on a kid's age, the books on their Approved shelf, and their reading history, generate personalized "Read Next" suggestions. Show 3-5 books on the kid's dashboard card.
- **Why parents want it:** "What should my 8-year-old read next?" is the #1 question in the chat advisor. Automate it.
- **Effort:** Medium (GPT action using kid context, new UI component on dashboard)
- **Revenue potential:** High -- drives discovery and repeat usage
- **Priority:** Should-have

#### B4. Family Library
- **What:** A shared view of all books the family has reviewed, organized by kid. Filter by verdict, category, author. Exportable as CSV/PDF for homeschool records.
- **Why parents want it:** After 6 months, a family might have 100+ reviewed books. They need a way to see the big picture.
- **Effort:** Medium (aggregation queries, filter UI, export)
- **Revenue potential:** Medium -- retention feature
- **Priority:** Should-have

---

### C. Social & Community

#### C1. Parent Ratings & Short Reviews
- **What:** After viewing an analysis, parents can add a 1-5 star rating and a short (280-char) review. Show aggregate ratings and top reviews on the book page.
- **Why parents want it:** AI analysis + real parent opinions = complete picture. "The AI says Caution, but 47 parents rated it 4.5 stars and say it's great for mature 10-year-olds."
- **Effort:** Medium (new `parentReviews` table, moderation system, display UI)
- **Revenue potential:** Very high -- community content is the moat. This is what makes SafeReads irreplaceable.
- **Priority:** Must-have

#### C2. Curated Lists by Age/Genre/Theme
- **What:** Admin-created and community-voted reading lists: "Best adventure books for 8-year-olds", "Historical fiction without violence", "Books for kids processing divorce", "20 Books Every Homeschool Family Should Own."
- **Why parents want it:** Browse-mode discovery. Parents often do not have a specific title in mind -- they need inspiration.
- **Effort:** Medium (new `readingLists` and `listItems` tables, curation UI, browse page)
- **Revenue potential:** High -- curated lists are shareable marketing assets (SEO, social media, newsletters)
- **Priority:** Should-have

#### C3. Share Reviews With Other Parents
- **What:** Generate a shareable link or image card for any book's analysis that can be posted to Facebook groups, texted to friends, etc. "Here's what SafeReads says about Diary of a Wimpy Kid."
- **Why parents want it:** Parents discuss books in groups constantly. This is free marketing.
- **Effort:** Small (ShareVerdictButton already exists -- enhance with OG image generation)
- **Revenue potential:** High as a growth/acquisition tool
- **Priority:** Should-have

---

### D. Integration & Discovery

#### D1. Library Availability Check
- **What:** Enter your local library system (via OverDrive/Libby API or WorldCat), and each book page shows "Available at [Library Name]" with a direct link to place a hold.
- **Why parents want it:** The workflow is: find book on SafeReads -> check if library has it -> place hold. Currently requires switching apps.
- **Effort:** Large (OverDrive API integration, library system selection, caching)
- **Revenue potential:** Medium -- convenience feature, strong for retention
- **Priority:** Nice-to-have (build after core features)

#### D2. Bookshop.org / Amazon Affiliate Links
- **What:** The Amazon button already exists. Add Bookshop.org as an option (their affiliate program pays 10% and supports independent bookstores). Let the user choose their preferred store in settings.
- **Why parents want it:** Many homeschool parents prefer supporting independent bookstores. Bookshop.org resonates with this audience.
- **Effort:** Small (add Bookshop.org link generation, user preference in settings)
- **Revenue potential:** Direct affiliate revenue -- even small amounts offset AI costs
- **Priority:** Should-have

#### D3. Book Request System (Kid -> Parent)
- **What:** Kids can submit book requests (title they heard about from a friend, saw at school, etc.). Parents get a notification, review the analysis, and approve/deny with one tap.
- **Why parents want it:** Kids constantly ask "Can I read this?" Parents want a structured way to handle requests instead of forgetting.
- **Effort:** Medium (new `bookRequests` table, kid-facing request form, parent notification UI)
- **Revenue potential:** High -- creates a two-sided engagement loop (kids AND parents use the app)
- **Priority:** Should-have

#### D4. Curriculum Alignment (Homeschool)
- **What:** Tag books with curriculum alignment: Sonlight, Ambleside Online, Classical Conversations, BookShark, My Father's World, Veritas Press, Beautiful Feet Books. Show "This book appears in Sonlight Core D" on the analysis page. Allow filtering the search by curriculum.
- **Why parents want it:** Homeschool parents choose curricula, then need to vet the books on those reading lists. This saves hours of work per semester.
- **Effort:** Large (curriculum data collection/entry, mapping system, display UI)
- **Revenue potential:** Very high -- this alone could justify the subscription for homeschool parents. It positions SafeReads as an essential homeschool tool rather than a nice-to-have.
- **Priority:** Must-have (start with 2-3 major curricula, expand over time)

#### D5. New Release Alerts for Favorite Authors
- **What:** "Follow" an author to get notified when they publish a new book. Weekly digest email of new releases from followed authors.
- **Why parents want it:** Kids devour a favorite author's books and parents want to know when the next one drops.
- **Effort:** Medium (author follow system, periodic Google Books check, email via Resend)
- **Revenue potential:** Medium -- retention and re-engagement
- **Priority:** Nice-to-have

---

### E. Engagement & Retention

#### E1. Reading Challenges / Goals
- **What:** Set reading goals per kid: "Read 20 books this summer", "Read 5 non-fiction books this month." Progress bar on the dashboard. Pre-built seasonal challenges (Summer Reading Challenge, Fall Into Books, etc.).
- **Why parents want it:** Gamification works. Libraries have run summer reading programs for decades because external motivation gets kids reading.
- **Effort:** Medium (new `challenges` and `challengeProgress` tables, goal UI, progress tracking)
- **Revenue potential:** High -- daily/weekly engagement driver
- **Priority:** Should-have

#### E2. Badges & Achievements for Kids
- **What:** Kids earn badges for milestones: "Bookworm" (10 books), "Series Slayer" (finished a series), "Genre Explorer" (read from 5 genres), "Page Turner" (100 pages in a day). Visual badge display on kid's profile.
- **Why parents want it:** Kids love collecting things. Badges make the reading log feel like a game, not a chore.
- **Effort:** Small-Medium (badge definitions, trigger logic, display component)
- **Revenue potential:** Medium -- retention via kid engagement
- **Priority:** Should-have

#### E3. Weekly Email Digest
- **What:** Opt-in weekly email per parent: "This week on SafeReads" with new analyses your family reviewed, new curated lists matching your kids' ages, trending safe books, and reading challenge progress.
- **Why parents want it:** Re-engagement for parents who forget to open the app. Keeps SafeReads top-of-mind.
- **Effort:** Small (Resend already integrated, cron job, email template)
- **Revenue potential:** High for retention/churn reduction
- **Priority:** Should-have

#### E4. "Book of the Week" Curated Pick
- **What:** Each week, highlight one book per age bracket (4-7, 8-10, 11-13, 14+) with a full analysis and a short editorial note. Show on the dashboard and in the weekly email.
- **Why parents want it:** Curated picks from a trusted source. Low effort for the parent, high value.
- **Effort:** Small (editorial process + display component; could be AI-assisted)
- **Revenue potential:** Medium -- engagement + marketing content
- **Priority:** Nice-to-have

#### E5. Book Club Mode
- **What:** Create a book club with other SafeReads parents. Select a book, set a reading schedule, discuss in a shared thread. See the analysis together. Great for homeschool co-ops.
- **Why parents want it:** Homeschool co-ops read books together constantly. This gives them a shared space with content analysis built in.
- **Effort:** Large (group system, invites, shared threads, scheduling)
- **Revenue potential:** High -- viral growth (each club member needs a subscription)
- **Priority:** Nice-to-have (Phase 3)

---

## 4. Roadmap

### Phase 1: Foundation (Weeks 1-3) -- Make It Worth $4.99/mo

These features transform SafeReads from a lookup tool into a daily-use app:

1. **Bookshelves** (B1) -- Approved / Maybe / Rejected replaces flat wishlist. *Small effort, immediate value.*
2. **Reading Log** (B2) -- Track what kids read, when, and how much. *Medium effort, highest retention impact.*
3. **Reading Level Display** (A1) -- Lexile/AR levels on every analysis. *Small effort, immediate credibility.*
4. **Series Timeline** (A3) -- Visual content progression across a series. *Medium effort, unique differentiator.*

**After Phase 1, SafeReads is:** An analysis tool + a reading management system. Parents have a reason to come back weekly.

### Phase 2: Community & Discovery (Weeks 4-6) -- Make It Hard to Leave

5. **Parent Ratings & Reviews** (C1) -- AI + human opinions together. *Medium effort, builds the moat.*
6. **Curriculum Alignment** (D4) -- Start with Sonlight, Ambleside Online, and Classical Conversations. *Large effort, but the homeschool killer feature.*
7. **Book Request System** (D3) -- Kids request, parents review. *Medium effort, two-sided engagement.*
8. **Bookshop.org Affiliate** (D2) -- Direct revenue. *Small effort.*
9. **Curated Lists** (C2) -- Browse by age, genre, theme. *Medium effort, SEO/marketing value.*

**After Phase 2, SafeReads is:** A community-powered homeschool reading platform. Curriculum alignment makes it indispensable for the target audience.

### Phase 3: Engagement & Growth (Weeks 7-10) -- Make It Addictive

10. **Reading Challenges** (E1) -- Seasonal and custom goals. *Medium effort.*
11. **Badges for Kids** (E2) -- Gamification layer. *Small-medium effort.*
12. **Weekly Email Digest** (E3) -- Re-engagement. *Small effort.*
13. **"Read Next" AI Recommendations** (B3) -- Personalized discovery. *Medium effort.*
14. **Side-by-Side Comparison** (A2) -- Power user feature. *Small effort.*
15. **Shareable Review Cards** (C3) -- Growth/acquisition. *Small effort.*

### Phase 4: Polish & Expand (Ongoing)

16. **Library Availability** (D1) -- Convenience integration.
17. **New Release Alerts** (D5) -- Author follow system.
18. **Book Club Mode** (E5) -- Group reading for co-ops.
19. **Book of the Week** (E4) -- Editorial curation.
20. **Family Library Export** (B4) -- Homeschool records.

---

## 5. What Makes SafeReads Worth $4.99/mo on Its Own

Today, the value proposition is: "Unlimited AI book analyses." That is thin because most families only analyze 5-10 books per month, and cached analyses are free for everyone.

**After Phase 1-2, the value proposition becomes:**

> SafeReads is the only app that combines instant AI content analysis, reading level data, series content tracking, curriculum alignment, reading logs, and a parent community -- all in one place. It replaces Common Sense Media + Goodreads + a spreadsheet + asking in Facebook groups.

The subscription pays for:
- Unlimited new analyses (AI cost)
- Reading logs and stats for all kids
- Reading challenges and badges
- Curated lists and "Read Next" recommendations
- Curriculum alignment data
- Book request system
- Community reviews and ratings
- Weekly digest emails

---

## 6. What Would Make SafeReads "Can't Live Without" for Homeschool Parents

The single most important feature for the homeschool audience is **curriculum alignment** (D4). Here is why:

1. Every homeschool family picks a curriculum (or multiple)
2. Every curriculum has a reading list (dozens to hundreds of books)
3. Parents currently Google each book individually or ask in Facebook groups
4. SafeReads can pre-analyze every book on major curriculum lists and present them in a browseable, filterable view
5. No competitor does this

**The pitch at FPEA 2026 becomes:** "You're using Sonlight? We've already analyzed every book on your reading list. Sign up and see the full breakdown for your grade level."

Combined with reading logs (which homeschool parents need for record-keeping), curriculum alignment transforms SafeReads from "a nice tool" into "an essential part of my homeschool workflow."

**Secondary must-haves for homeschool parents:**
- **Reading logs with export** -- Many states require documentation of educational activities
- **Series awareness** -- Homeschool curricula often assign book series across grade levels
- **Bookshelves** -- Organizing the enormous volume of books in a homeschool year
- **Book request system** -- Older homeschool kids do independent reading and need a way to get parent approval

---

## 7. Revenue Impact Summary

| Feature | Acquisition | Retention | Direct Revenue |
|---------|-------------|-----------|----------------|
| Bookshelves (B1) | Low | High | -- |
| Reading Log (B2) | Medium | Very High | -- |
| Reading Level (A1) | Medium | Medium | -- |
| Series Timeline (A3) | High | High | -- |
| Parent Reviews (C1) | Medium | Very High | -- |
| Curriculum Alignment (D4) | Very High | Very High | -- |
| Book Requests (D3) | Medium | High | -- |
| Bookshop.org Affiliate (D2) | Low | Low | Direct |
| Curated Lists (C2) | High (SEO) | Medium | -- |
| Reading Challenges (E1) | Medium | High | -- |
| Badges (E2) | Low | High | -- |
| Weekly Digest (E3) | Low | High | -- |
| Shareable Cards (C3) | Very High | Low | -- |

---

*This document is a research deliverable. No code changes were made.*
