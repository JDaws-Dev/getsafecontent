# SafeStudy product evaluation (September 10, 2026)

Read-only review of `apps/safeseek` on branch `feature/one-site`. No files changed, nothing deployed. I could not pull live usage numbers (the sandbox blocked both the prod query and the local backup), so usage claims below come from the repo's own docs.

Bottom line up front: SafeStudy is a very well-defended search box with a chat window bolted on. Almost every line of code written since April has been about stopping a kid from doing the wrong thing. Almost none of it gives a kid a reason to open the app tomorrow, or gives a parent anything to look at except a list of what was typed. The tutor forgets everything between page loads, the parent dashboard never shows the tutor conversations the landing page promises, and there is no notion of a subject, a lesson, progress, or a week. It is a tool, not a program. The fix is not more safety. It is a daily loop the parent sets up and the kid finishes.

---

## 1. What SafeStudy actually does today

### The kid side, end to end

**Getting in.** A kid opens getsafestudy.com/play (or the hub's kid door), types the 6-character family code, picks their profile tile, and enters a 4-digit PIN if the parent set one. Arriving from a sibling app with a kid pass skips the PIN. The family's universal settings (ages, PINs, pauses) are pulled from the hub the moment the code resolves.

**The one screen.** After that there is exactly one screen: a search bar with four tabs underneath it. Learn, Images (only if the parent turned image search on, off by default), Research, and Tutor. Below the bar is an empty state with eight age-bucketed "curiosity prompts" like "How do magnets work?" There is no home page, no history, no saved items, no subjects, no progress of any kind. The kid's own search history was deliberately removed from the kid screen in April because it fed the Pinterest-loop behaviour.

**What a search actually returns.** The kid's question goes through, in order:

1. Pause check, subscription check, per-app daily search budget or the family-wide shared screen-time limit, allowed-hours window.
2. A prompt-injection regex filter and a rate limit (10 searches a minute, 50 AI calls an hour per family).
3. An intent classifier: a regex fast path, then a gpt-4o-mini call that labels the query as study, curiosity, aesthetic browsing, self-image, appearance, celebrity gossip, eating-disorder-adjacent, self-harm-adjacent, or other. Results are cached for 30 days by query text. Eating-disorder and self-harm labels always block and email the parents. The other categories block only on the strict tier or when the parent named them as blocked topics.
4. A 30-minute "rephrase guard" that keeps a concern-blocked question blocked even if the kid changes a word.
5. A loop detector that stops the kid after roughly four near-identical searches in 30 minutes.
6. Then the real search. If the question starts with what/who/where/when/how many, or is four words or fewer, it first fetches a Wikipedia summary (Simple English Wikipedia for kids 9 and under) plus a few Wikipedia images. That summary is pasted into a gpt-4o-mini system prompt that also carries the kid's age range, strictness, reading level, accessibility flags, blocked and allowed topics, and the parent's free-text instructions. The model is asked to return JSON: a 2-3 sentence answer, several titled sections, fun facts, related questions, and an optional Mermaid diagram. If image search is on, a Google Images call through Serper runs in parallel and up to 6 images are attached.
7. If the model refuses without naming real harm, the code asks it once more. If the answer contains a word from the kid's blocked list (the famous "dating back to" problem), it asks the model to rewrite once. If the answer still trips the filter, the kid gets "I found some information, but it wasn't quite right for you."
8. The result is cached for identical queries with the same profile settings, and a history row is written for the parent.

So a kid search returns: a short AI-written answer grounded in Wikipedia when the question is factual, expandable sections (each "Read more" is another uncached AI call that writes 4-6 paragraphs), fun facts, related questions the kid can click, and sometimes a diagram. Every section heading is also a button that re-searches "root query + heading."

**Research tab.** Runs the query through Serper's Google search with SafeSearch on, keeps only results from a hard-coded list of about 28 trusted domains (NASA, Britannica, PBS, Ducksters, Wikipedia, and so on), fetches the raw HTML of up to five pages from inside the Convex action, strips tags, keeps the first 2,000 characters, and asks gpt-4o-mini to rewrite each one "for a 5th grader" in 300 words. The kid sees up to three branded "Verified source" cards. No links, no images, no cache. It is slow (five sequential page fetches plus three model calls) and every run costs three model calls.

**Tutor tab.** A plain chat. The greeting is "Hi Bella! I'm your tutor. What are you working on today?" Each message is sent with the whole visible conversation to gpt-4o-mini (temperature 0.3, 300 tokens max) under a "teach first, then ask one question, 3-5 sentences" prompt with the same age, reading-level, and blocked-topic settings. Since August every tutor message also goes through the intent classifier; a concern hit does not block, it swaps in a supportive addendum for that one reply and emails the parents. The conversation is saved server-side in 30-minute sessions for the parent, but the kid's view lives only in React state: refresh the page and the tutor starts over with the greeting. There is no memory of yesterday, no notion of what subject the kid was working on, no way to resume.

**Voice and read-aloud.** Browser speech recognition fills the search box or the tutor box, and answers can be read aloud with the browser's speech synthesis. Both work on Bella's Chromebook.

**Blocked flow.** A blocked search shows "Hold on!" plus a friendly redirect and an "Ask My Parent" button that files a topic request. A small inbox in the header shows the kid whether the parent approved or denied.

### The parent side, end to end

Parents log in with the shared Safe Family account and land on a five-tab dashboard: Home, Activity, Requests, Kid Profiles, Settings. On first login a seven-step wizard creates the first kid profile.

**Home** shows three numbers (searches today, blocked today, number of kids), the family code, a card per kid with "searches today" and the last query, and the last five searches.

**Activity** is the search log: kid name, query, timestamp, a Flagged pill, filterable by kid, text, and Today/This Week/All Time. A toggle switches to the blocked log with the block reason, an "Allow this topic" button, "Dismiss," and a "Talk to them" tooltip. Pending topic requests sit at the top with Approve/Deny.

**Kid Profiles** is where the real controls live: name, age, color, reading level (K-12 or auto), 13 blocked-topic checkboxes (violence, drugs, dating, aesthetic browsing, self-image, celebrity gossip, and so on), a free-text allowed-topics list, a free-text "Instructions for SafeStudy" box ("She's homeschooled, studying biology"), four accessibility flags, image search on/off, topic requests on/off, and a PIN.

**Settings** shows subscription status, the family code, time limits (a per-kid daily search count of 10 to 100, allowed hours, weekend override, or the family-wide minutes limit shared with the other apps), and support links. "Manage Subscription" and "Delete my account" are both mailto links.

**Email.** Parents get the concern-alert email (with 988 and NEDA numbers), trial-expiry emails, and a Sunday weekly digest listing searches, blocks, top intent categories, and heaviest day per kid.

**Not on the parent side at all**, despite the backend storing it: tutor conversations, concern alerts as a list to acknowledge, the digest opt-out, or any per-kid trend over time.

### Data model in one paragraph

Users, kid profiles, search history, blocked searches, concern alerts, time limits, a cached shared-screen-time verdict, parent search settings (never actually read by the UI beyond custom instructions), topic requests, tutor sessions, a search cache, an intent cache, rate limits, and operator events. Nothing about subjects, lessons, assignments, mastery, streaks, saved items, or notes.

### Models and cost today

Everything is gpt-4o-mini at $0.15 per million input tokens and $0.60 per million output. A typical search is one classifier call plus one answer call (two or three if a refusal or rewrite retry fires), roughly a tenth of a cent. A tutor turn is about a third of that. A research query is three rewrite calls plus a Serper search, about a third of a cent. At the default budgets (15/25/50 searches a day by strictness) a heavy kid costs well under a dollar a month. Cost is not the constraint here; the improvement plan's 2026-03 projection of $17 a month for 100 families still holds.

---

## 2. Why it feels like filler

**It has no loop.** A search ends when the answer renders. The only "next" actions are related questions and section deep-dives, both of which are just more searches (`src/pages/KidSearch.jsx:569-577`, `src/components/kid/LearnResults.jsx:103-110`). Nothing is kept: no saved answers, no notebook, no "you learned about volcanoes on Tuesday," no streak. The kid-side history was removed on purpose (`src/pages/KidSearch.jsx:17-18`, `:304-305`), which was right for the Pinterest problem but left the kid with a tool that has no memory of them at all. Compare SafeTunes, where the library is the reason to come back.

**The tutor forgets everything.** Conversation state is React state only (`src/pages/KidSearch.jsx:88`, `:760-768`); a refresh restarts at the greeting. The server does save sessions (`convex/tutorSessions.ts:8-62`) but nothing ever reads them back to the kid, and the parent dashboard never calls `getTutorSessions` either (grep across `src/` finds zero callers). So the single most valuable surface in the product, the one where a kid says "I don't get fractions," leaves no trace anywhere a human can see it. The landing page nonetheless says "Every tutor session is saved so you can see what they're working on" (`src/pages/LandingPage.jsx:125`) and "Full search history and tutor conversations" (`:51`). That claim is currently false.

**The tutor has no subject, no lesson, no goal.** The prompt is generic (`convex/tutor.ts:105-135`): teach, ask a question, celebrate. It is capped at 300 tokens and "3-5 sentences," which is fine for a homework nudge but cannot run a lesson. There is no way for a parent to say "this week is long division" and have the tutor know it, other than the free-text instructions box that also gets pasted into search.

**The parent dashboard is a log, not a dashboard.** Home shows counts of searches (`src/pages/AdminDashboard.jsx:117-157`); Activity is a scrolling list of query strings (`:359-686`). There is no "what did Bella study this week," no subject breakdown, no time-on-task, no mastery, nothing a homeschool parent could put in a portfolio or attendance record. The intent categories are recorded on every row (`convex/schema.ts:88-92`) but the UI never uses them; only the Sunday email does. The concern-alert table has list and acknowledge queries (`convex/concernAlertQueries.ts`) with no UI, so the alert email's "Check the alerts dashboard" line points at nothing (`convex/weeklyDigest.ts:137`). `docs/ROADMAP.md:15-16` has had both on the list since April.

**All the recent engineering is defensive.** Reading `convex/search.ts` top to bottom: refusal challenge (`:285-339`), response rewrite (`:341-415`), concern rephrase guard (`:732-786`), loop detector (`:841-871`), classifier degradation alerts (`:711-730`). It is careful, well-commented work, and it was needed after the Bella Trotter audit (212 searches in a month, 57 aesthetic-collage queries, `docs/ROADMAP.md:130`). But the product now has roughly 1,000 lines of "stop the kid" and zero lines of "here is what to do next."

**Research mode dead-ends.** It is a one-shot rewrite of three web pages, slow, uncached, and it cannot be saved, cited, or built on. There is no "add to my report," no notes, nothing that turns reading into work product.

**Generic outputs.** Because every answer is a fresh JSON blob at temperature 0 with the same section/fun-facts/related-questions shape, everything looks the same: a volcano and the Great Depression get the identical card layout. The curiosity prompts are a static list of 42 questions (`src/components/kid/utils.js:6-52`); after a week a kid has seen them all.

**Nothing is age-differentiated in the experience.** Age only changes the prompt wording and which Wikipedia to hit. A 5-year-old and a 13-year-old get the same screen, the same tabs, the same typed-search interaction. The landing page promises OpenDyslexic font, larger text, and high contrast (`src/pages/LandingPage.jsx:149`), but accessibility flags only alter prompt text (`convex/search.ts:961-964`, `convex/tutor.ts:91-104`); there is no font, spacing, or contrast change anywhere in the kid UI.

**The pitch is "safe Google," and safe Google is free.** Kiddle is free. Google SafeSearch is free. Khanmigo is $4 a month for ten kids and comes with the entire Khan Academy curriculum behind it. As a standalone $4.99 product, "search plus a chat" is not a purchase decision most parents will make twice. As a bundle member it is fine, which is exactly why it reads as filler.

---

## 3. What the reference products do, and what people actually pay for

**Khanmigo (Khan Academy).** $4 a month or $44 a year, one parent plus up to ten kids. Socratic tutor across math, science, history, coding, and writing, but the thing parents are really buying is that it sits on top of Khan's mastery-based courses: every unit has practice, quizzes, a mastery percentage, and a parent view of progress. The tutor knows what unit the kid is on. That is the difference between a chatbot and a tutor.

**Synthesis Tutor.** $29 a month for a family of up to seven, aimed at ages 5-11, math only. Voice-guided, adaptive, designed to be done daily for 15-20 minutes on a tablet. Parents pay seven times SafeStudy's price for one subject because the kid actually does it every day without being asked, and the parent gets a progress report.

**IXL.** From $9.95 a month. Nothing clever: thousands of skills organised by grade and standard, a diagnostic that places the kid, daily practice, and a parent report that says "Bella is at 4th grade level 3 in fractions, 82% mastery." Homeschool parents use it as the record of what was covered.

**Prodigy.** About $12.95 a month for the family plan. A math RPG. The game is free; parents pay so the kid gets more of the game. The lesson: kids come back daily for the game, and parents pay to sustain the daily thing the kid already does.

**Duolingo.** Streaks, daily goals, leagues, one lesson a day, reminders. The most copied retention mechanic in consumer education, and it works for kids as well as adults. The daily unit is small and finishable.

**Khan Academy Kids.** Free, ages 2-8, a guided daily "learning path" the kid taps through, plus a library. Parents love it because the kid can be handed the tablet and something structured happens.

**Kiddle and Brainly.** Kiddle is a free, ad-supported kid-safe Google. It has never been something anyone pays for. Brainly is homework Q&A with a community; parents dislike it because it gives answers. Socratic (Google) was a photo-your-homework app; it wound down, and its niche is now served by general chatbots.

**Outschool.** Live classes at $10-30 a session. Parents pay a lot because a human shows up on a schedule and the kid produces something.

**Homeschool planners (Homeschool Planet, Notion and Google Sheets templates).** Roughly $7-9 a month or free. Parents use them to assign the week's work per kid per subject, check it off, and print attendance and portfolio reports for state records. They are boring and universal. Every homeschool family has one.

What parents actually pay for, in order: (1) the kid does structured work daily without nagging, (2) visible progress they can show someone, (3) records, (4) safety. Safety is the reason they say yes; the first three are the reasons they stay. What kids come back to daily: a small finishable unit, a streak or visible progress, a voice or character that remembers them, and a game or reward layer.

SafeStudy currently has (4) and nothing else. It also has two assets none of those products have: the parent already trusts it with the kid's whole media life across five apps, and the tutor already speaks the family's values through the per-kid instructions box.

---

## 4. Proposals, prioritised

Effort is in dev-days for one person who knows this codebase. Cost is OpenAI at gpt-4o-mini prices unless noted, for a kid using the feature every school day.

### The top three, build these first

**P1. Today's Lesson: a daily assignment the parent sets up and the kid finishes.** The parent creates subject tracks per kid (Math, Science, History, Bible, Reading, Writing, Custom) and for each track either types a topic ("long division", "the water cycle", "Genesis 1-3") or picks from a suggested sequence for the kid's grade. Every morning the kid's landing screen is a card: "Today: Long division. 1. Learn (an explainer written by the same search pipeline, with the diagram), 2. Try it (five problems or questions), 3. Ask the tutor if stuck, 4. Done." Finishing lights the day on a calendar and extends a streak. The parent sees a check mark and the kid's answers.
- Kid gets: a reason to open the app every day, and a finish line.
- Parent gets: the thing every homeschool planner does, but the lesson content and the checking are done for them.
- Why it's worth $4.99: this is the single feature that turns "a search engine" into "a program." It is what Khanmigo has that SafeStudy lacks, and it works for any subject the parent names, including Bible and character, which Khanmigo will never do.
- Effort: L (8-12 days). New tables: subject tracks, lessons, lesson attempts. Kid home screen (new). Parent assignment UI. Lesson generation reuses the search prompt with a "lesson" shape and adds a five-question check with an answer key generated at the same time. Auto-suggested sequences per grade can be a static JSON per subject to start.
- Cost: one generation per lesson (about $0.001) plus grading of free-text answers (about $0.0003 each). Under 5 cents per kid per month. Lessons can be cached by topic and grade across families.
- Risk: generated answer keys can be wrong on math; use the "Always reduce fractions all the way" style guard and, for math, generate the problems with code-computed answers rather than asking the model for both.

**P2. Review deck: spaced repetition built from everything the kid learned.** Every completed lesson, every tutor exchange that ended in a correct answer, and optionally every search the kid marks "keep this" produces two or three flashcards (question, answer, source). A daily "Review" tile shows 5-10 cards due using a simple SM-2 schedule. Cards the kid misses come back sooner; cards they know retire. A weekly "you remembered 38 of 42" line goes to the parent digest.
- Kid gets: a two-minute daily habit that is finishable and that shows a number going up.
- Parent gets: evidence of retention, not just exposure. "She searched volcanoes" becomes "she still knows what magma is three weeks later."
- Why it's worth paying for: this is the mechanic that makes Duolingo and IXL sticky and that no kid search engine offers. It also turns the existing search history, which today is just a log for the parent, into an asset for the kid.
- Effort: M (5-7 days). One table (cards with next-due, interval, ease), a card-generation step appended to the lesson and tutor pipelines, a review screen, one line in the digest.
- Cost: card generation is folded into calls that already happen (ask for cards in the same JSON) so roughly zero marginal cost. Review grading is client-side for typed answers with a lenient match; a model check only on disagreement.
- Risk: card quality from single searches can be trivial. Start with lessons and tutor only; add "keep this" from search later.

**P3. Parent dashboard that reads like a homeschool log, plus the missing surfaces.** Replace "searches today" with a per-kid week view: minutes engaged (already computed for shared screen time), lessons completed, subjects touched, review accuracy, questions asked to the tutor with the full transcripts (the data is already stored), concern alerts with acknowledge, and topic requests. Add a "Print this week" and "Export month" that produce a clean one-page record per kid: dates, subjects, topics, minutes. Rewrite the Sunday digest to match: "Bella did 4 of 5 lessons, 22 review cards at 86%, asked the tutor 14 questions, mostly fractions. One thing worth a conversation: ..."
- Parent gets: a real reason to open the dashboard and a document they can keep for state records or a co-op.
- Why it's worth paying for: this is what makes a parent renew. Today a parent who opens the dashboard sees a list of strings. After P1-P3 they see a report card they helped design.
- Effort: M (5-8 days) including tutor transcripts, alerts UI, digest rewrite, and the print view (the repo already has a letter-print skill for correct US Letter output).
- Cost: one model call per kid per week for the digest's "one thing worth a conversation" summary, about a tenth of a cent. Everything else is queries.
- Risk: showing full tutor transcripts to parents is a values call. I would show them; the landing page already promises it, and SafeSpark shows full chat logs. Tell the kid clearly that parents can read it.

### Next tier

**P4. Tutor memory and resumable sessions.** Persist the conversation per kid so refresh and next-day return continue where they left off ("Yesterday we were working on 3/4 + 1/8. Want to pick that up?"). Keep a short rolling "tutor notes" paragraph per kid (strengths, current struggles, what they like) that the model updates every few exchanges and that is injected into every tutor and lesson prompt. Show the parent the notes.
- Effort: S-M (3-4 days). Read `tutorSessions` on load; add a notes field on the profile; one summarisation call every N turns.
- Cost: one extra small call per 10 turns, negligible. Longer context per turn adds maybe 50% to tutor cost, still under a cent a day.
- Risk: notes must never contain concern-category content in a way that surprises the kid; keep them about learning.

**P5. Math step checker with photo input.** Kid photographs their worksheet or types a worked problem. A vision-capable model extracts the problem and each step, checks the arithmetic in code where possible, and points at the first wrong step without giving the answer ("Step 3: 7 times 8 is not 54. Try that one again."). Works with the physical curriculum most homeschool families already use.
- Effort: M (5-7 days). Camera or file upload on Chromebook, a vision model call (gpt-4o-mini accepts images; expect roughly half a cent per photo), a step-rendering component, and a "which step is wrong" prompt that returns structured JSON.
- Cost: at 5 photos a school day, about 50-60 cents per kid per month. This is the one feature that materially moves cost; cap it per day like SafeSpark's daily budget.
- Risk: handwriting extraction errors on younger kids' work. Show the extracted problem and ask "Is this right?" before checking.

**P6. Writing coach.** A dedicated mode where the kid pastes or types a paragraph, story, or essay and gets feedback in three passes the parent can choose from: "Did I answer the question?", "Grammar and spelling", "Make it stronger." Never rewrites the whole thing; highlights and suggests. Saves drafts so a parent can see version 1 and version 3.
- Effort: M (4-6 days). A drafts table, a side-by-side view, three prompts.
- Cost: about 0.05 cents per pass. Negligible.
- Risk: the model will want to rewrite. The prompt has to forbid producing more than one suggested sentence at a time, and the parent should be able to see the feedback.

**P7. Quiz me on anything.** From any Learn answer, a "Quiz me" button generates five questions on that topic at the kid's level, grades them, and offers to add missed ones to the review deck. Cheap, uses the existing pipeline, gives search a next step.
- Effort: S (2 days). Cost: one call, cached by topic and grade. Risk: none worth noting.

**P8. Kid home screen and My Stuff.** Replace the empty search box with a home: Today's Lesson, Review due, streak, "Continue with the tutor," and My Stuff (saved answers, quiz results, drafts). Curiosity prompts move below. This is the container P1, P2, P4, P6, and P7 all land in; build it with P1.
- Effort: M (3-4 days) including the switch from search-first to home-first, keeping `/play?q=` deep links working.
- Risk: the April decision to hide history from the kid was correct for raw queries. My Stuff should hold things the kid finished (lessons, quizzes, drafts), never a raw query list.

**P9. Read-aloud mode for the youngest kids.** For profiles under 8, make the tutor voice-first: tap-to-talk, the answer is read aloud automatically, big buttons, no typing required. The pieces exist (speech recognition and synthesis are wired); this is layout and defaults, plus a slower reading rate and simpler prompt shape.
- Effort: S-M (3 days). Cost: zero (browser speech). Risk: browser voices are robotic; the SafeSpark TTS pipeline could be borrowed later at roughly a cent per reply.

**P10. Printable worksheets.** From any lesson or topic, a "Print worksheet" that renders ten problems or comprehension questions plus a separate answer key on true US Letter pages. Homeschool families print constantly; this makes SafeStudy show up on the kitchen table.
- Effort: S (2 days) using the existing letter-print approach. Cost: one call per worksheet, cacheable. Risk: none.

**P11. Fix the topic-request dead end.** Today an approved request only adds the phrase to the prompt's allowed list; the intent classifier's strictness rule and the word-level response filter never look at allowed topics, so an approved "cute fall nails" on a strict kid can still be blocked. Make approval actually unblock: consult allowed topics in the block decision and skip the response word filter for approved phrases.
- Effort: S (1 day). Risk: none; this is a bug.

**P12. Research mode that produces something.** Keep the trusted-source rewrite but let the kid pick two or three sources into a "report," with the tutor helping them write three paragraphs in their own words with a simple sources list. Cache the per-page rewrites for a week so repeated topics are instant. This turns the slowest, most expensive mode into the most homeschool-real one.
- Effort: M (5 days). Cost: current cost, cached. Risk: the raw-HTML fetch inside a Convex action is slow and fragile; consider Serper's snippets plus one fetch instead of five.

**P13. Values tracks (optional, parent-enabled).** A Bible or character track in P1's subject list: a passage a day at the kid's reading level (SafeReads already has six translations via Bolls), two questions, and a tutor that can discuss it from the family's stated perspective using the existing instructions box. Do not make it default. It is a differentiator for the audience Safe Family actually has, and no competitor will build it.
- Effort: S once P1 exists (2 days). Risk: keep the perspective parent-specified, not baked into the product.

### What I would not build

More blocking. The classifier, rephrase guard, and loop detector are enough; the August loosening of the moderate tier was the right call. Also not a general "chat with an AI" mode with no subject; that is what makes it feel like a chatbot with a filter.

---

## 5. Quick wins and problems noticed

1. **Landing page promises tutor transcripts and dyslexia fonts that do not exist.** "Every tutor session is saved so you can see what they're working on," "Full search history and tutor conversations," and "OpenDyslexic font, increased spacing, larger text, high contrast." None of these are in the parent dashboard or kid UI. Either build them (P3, P9) or soften the copy this week.
2. **Concern alerts have no dashboard.** The email tells the parent to "Check the alerts dashboard"; the queries exist, the UI does not. On the roadmap since April.
3. **Approved topic requests can still be blocked** (P11 above). The kid asks, the parent says yes, the kid tries again and gets "Hold on!" again.
4. **Research mode skips the safety pipeline.** In Research mode the research call fires before and independently of the search call, and the research action has no intent classifier, no blocked-topics check, and no injection filter. A query the Learn tab would block still returns rewritten web pages. It also pastes raw fetched HTML text into the model, which is a prompt-injection path from third-party pages. Gate it behind the same checks as search.
5. **The tutor does not count toward the daily search budget.** Only searches write history rows and only history rows are counted, so a kid at their 25-search cap can chat with the tutor indefinitely, limited only by 15 messages a minute and 50 AI calls an hour. Either count tutor turns or say so in the parent UI.
6. **The weekly digest's "hit the daily budget on N days" is always zero.** It looks for blocked rows with reason "limit_reached," and nothing ever writes one; the cap returns early before logging.
7. **Parent "All Time" history is really "last 50 per kid, 100 total."** For a kid like Bella Trotter (212 searches a month) the All Time view and the Home counts are silently truncated.
8. **The search prompt asks the model for emojis in Mermaid diagrams**, which puts emoji on a kid screen, against the brand rule. Delete the word "emojis" from the diagram instruction. The weekly digest email also has a warning-sign emoji.
9. **Tutor state is lost on refresh** and the greeting repeats every visit. Even before P4, reading the last session back on load is a half-day change.
10. **"Searches today" disagrees between screens.** The Settings time-limit list counts "today" in server UTC while the kid gate and Home count in the family's timezone.
11. **Home tab matches searches to kids by name**, so two kids with the same name (or a renamed kid) merge. Match by profile id; the rows already carry it.
12. **Dead code.** `KidProfileCustomize.jsx` (merged into the editor, still 285 lines), `SearchHistoryPanel.jsx` (unrendered), and the `allowFollowUp` flag (always true, never read). Also `searchSettings` per-user safe-search level and domain lists are stored but nothing enforces them.
13. **Wikipedia lookup title-cases the whole question** ("How Do Bees Make Honey") before hitting the summary endpoint, so most first-attempt lookups miss and fall to the opensearch fallback. Stripping the question words first, then title-casing only the noun phrase, would raise the grounding rate.
14. **"Manage Subscription" and "Delete my account" are mailto links.** Point both at the hub's account page now that billing is central.
15. **Every "Read more" deep dive is an uncached 1,000-token call.** Cache by topic, subtopic, and reading level like search already does.
16. **Prompt hygiene.** The search prompt tells the model "Content strictness: moderate" without saying what that means, and the "ALWAYS safe:true" list has grown to eight bullets. Per the earlier lesson about prompt bloat, fold strictness into one sentence and trim the list to the refusals actually seen in production.

---

### Sources for section 3

- [Khanmigo Review 2026: Is It Worth $4/Month?](https://www.kidsaitools.com/en/articles/khanmigo-review-2026)
- [Khanmigo Updates: May 2026 New Features & Pricing](https://aitoolsbakery.com/blog/khanmigo-updates-2026/)
- [Khan Academy Pricing in 2026](https://www.edisonos.com/alternatives/khan-academy-pricing)
- [Synthesis Tutor Cost: Plans & Free Trial In 2026](https://brighterly.com/blog/synthesis-tutor-cost/)
- [Synthesis Tutor Review 2026: Pricing, Grades & How It Ranks](https://spellingjoy.com/best-apps/app/synthesis-tutor)
- [IXL vs Prodigy vs Brighterly: Which to Choose (2026)](https://brighterly.com/blog/ixl-vs-prodigy/)
- [IXL Review 2026: Complete Guide to Pricing](https://nibble-app.com/blog/ixl-review)
- [GPT-4o mini pricing](https://pricepertoken.com/pricing-page/model/openai-gpt-4o-mini)
