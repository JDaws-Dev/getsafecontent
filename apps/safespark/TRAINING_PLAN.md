# SafeSpark Training Plan

A focused plan for the "kids learn HOW to use this tool" layer. Drafted
after migration day, evolving from the abandoned BELLA trainer rather than
inheriting it whole.

## Core constraints (set by Jeremiah)

1. **No gatekeeping.** Every feature is unlocked up front. A kid who wants
   to dive straight into making does not have to complete any lesson first.
2. **Training is opt-in.** Some kids will want it. Some won't. The product
   does not nag.
3. **Parent can require it.** New parent setting: *"Require my kid to
   complete a training step before opening the maker today."* Off by default.
4. **Bite-sized.** Each lesson is one screen, one demo, one tiny "try this"
   action — never homework-feeling.
5. **Tied to actual making.** Every concept is taught inside a project
   the kid is already building, or by building one. No abstract "what is AI"
   slides.
6. **Engaging.** Animated, conversational, voice-friendly. Spark teaches
   the kid the way Spark builds with the kid.

## What kids need to learn (and roughly in what order)

We're teaching three actual skills, not 30 academic ones:

### Track 1 — How to ask AI well (Prompting)

What good prompts look like, in real terms a 10-year-old grasps.

- **L1.** Be specific. Show the kid the same ask done two ways — "make a
  game" vs "make a Pokemon battle game with a boss" — and let them feel
  the difference live.
- **L2.** Say what you DO want, not what you don't. Show the contrast.
- **L3.** Ask in chunks. Long, multi-feature asks lose half the
  requirements (Knox lost the Force-power feature this exact way). Teach
  the "and then" pattern.
- **L4.** Test then change. Always try the build before asking for more
  changes. ("Notice it. Name it. Ask for it.")
- **L5.** The undo / version button is a tool, not a failure signal. Use
  it freely.

### Track 2 — How data flows in real apps (APIs + databases)

The two concepts that matter most. Taught inside an actual project.

- **L6. What's an API?** Ten-second framing: "An API is a menu. Your
  project orders from it — Pokemon images, dog photos, country flags —
  and the API sends them over." Demo: tap a button, watch PokeAPI fill in
  a sprite live.
- **L7. Picking the right API.** Spark has access to several (PokeAPI,
  Dog CEO, Open Trivia DB, Open Library, MealDB, REST Countries, etc.).
  The kid plays a tiny matching game: "you want dog photos → which menu?"
- **L8. What's a database?** Same framing: "A database is your project's
  memory." Demo: kid builds a 3-line habit tracker that uses localStorage
  → check a box, refresh, the box is still checked. That's the database
  saving it.
- **L9. Two databases SafeSpark uses for you.** (a) localStorage = this
  browser only. (b) Convex = your account, everywhere. The version
  history, the recycle bin, share links — all database. Show the panel.
- **L10. When to remember vs forget.** Real product judgment: what
  should a high-score game save? What shouldn't it save? (Names? Real
  ones? Friend names? PII?) Teaches discretion.

### Track 3 — Owning the output (AI literacy / safety habits)

The "vibe coding adults need too" track.

- **L11. AI makes mistakes.** Show one. The kid spots it. Praise the
  spot.
- **L12. AI doesn't know you.** It guesses based on patterns. If it gets
  your idea wrong, that's the kid's job to correct, not Spark's job to
  read minds.
- **L13. What you don't share.** Real names, school names, addresses,
  passwords, family info. Spark refuses to ask. The kid learns to refuse
  to volunteer.
- **L14. Style vs originality.** "Make it Pixar style" = fine. "Steal
  this exact thing someone else made" = not the same. Tiny ethical line.
- **L15. The thing you made is YOURS.** AI helps; the kid decides. The
  kid presents it. Reinforce the authorship frame the product already
  establishes.

## How it ships in the product

### Surface

A new tab next to **Chat / Preview / Projects / New** on mobile, and a
new top-nav item on desktop. Call it **"Learn"** (or **"Skills"** if Learn
feels schoolish — open question).

Tapping it shows a Duolingo-feeling grid of bite-sized lessons. Each
lesson tile shows:
- Title ("Be specific")
- A 1-line "what you'll do" hook
- ~30 second duration
- Done / not-done state

### Lesson shape (one screen)

Every lesson follows the same shape so kids learn the pattern:

```
+-------------------------------------+
|  L3 · Ask in chunks                 |
|                                     |
|  [tiny illustration]                |
|                                     |
|  "When you pack a lot into one      |
|  ask, Spark loses half. Watch:"     |
|                                     |
|  [10-second animated demo embedded  |
|   right in the lesson card]         |
|                                     |
|  Your turn:                         |
|  [Try a chunked ask in Spark →]     |
|                                     |
|  [Got it ✓]   [Skip]                |
+-------------------------------------+
```

Three blocks: *show* → *demo* → *try*. Total time on screen: 30-90 seconds.

### Parent admin setting

In `/parent` settings (new section, "Kid settings"):

> **Daily training step** — *Off* / *Once a day* / *Before every session*
>
> *When on, your kid completes one short lesson before the maker
> opens. They can pick any lesson they haven't finished yet.*

Default: Off. Discoverable but not pushed.

### What the kid sees when parent-required is on

Subtle, never punitive:

> *"Hi Knox — your parent picked one quick skill for today. Pick any of
> these three to get going."*
>
> [3 unfinished lesson tiles]
>
> [I'll do this later ↗] *(if parent set "Once a day" rather than
> "every session")*

### Progress, gently

No XP, no streaks, no leaderboards. Just a Duolingo-style "you've finished
4 of 15 skills" tracker. Kid sees it on the Learn tab. Parent sees it on
the parent dashboard. That's it.

## What we're keeping from the abandoned BELLA trainer

The good content + idea structure. Not the surface or the gamification.

**Keep:**
- The five-verb ask/guide/check/improve/own loop (it's a real skill, just
  embed it inside the new bite-sized lessons rather than as a curriculum
  spine).
- The API library content (the curated list of safe kid-accessible APIs is
  reusable — feeds Track 2).
- The kid-safe topic boundaries from the existing system prompt.

**Drop / don't carry forward:**
- "Modes" — Chat / Build / Learn / Make / Game / Music. SafeSpark is one
  surface; modes confuse.
- XP, achievements, locked features, capability unlocks, Journey map,
  badges. All of it. They were tied to the gatekept curriculum model.
- 16-literacy + 7-project structure with a fixed sequence. Replace with
  15 bite-sized lessons in 3 tracks, any order, all unlocked.
- "Personality unlocks," "coach settings" framing. Spark is a tool, not a
  companion.
- Long markdown lesson pages (`curriculum/*.md`). Replace with the
  one-screen lesson card shape above.

## What's new compared to the old plan

- **Optional by default.** The old BELLA trainer was the whole product.
  Here it's a side feature. Most kids will spend 90% of their time in
  the maker.
- **Concepts inside projects.** Old lessons were standalone reads. New
  lessons embed a live demo (real Spark output) and a "go try this on
  your own project" step that returns the kid to the maker.
- **Parent-gated, not product-gated.** The parent decides if training is
  required, not the product. Aligns with SafeFamily's broader pattern
  (parents in charge, kids steered).
- **API and database are FIRST-CLASS concepts**, not buried in track 4.
  These are the two ideas that turn "AI typed some code" into "I built a
  thing that uses the internet and remembers what I did."

## Build order

A practical sequence, not all-at-once.

1. **Parent setting + Learn tab scaffold** (~3hr). Empty tab, parent
   toggle, no lessons yet. Ships the surface area.
2. **One lesson card component** (~3hr). The 3-block "show / demo / try"
   shape, reusable, supports embedded video or animated SVG demo.
3. **Track 1 lessons (5)** — prompting. The most universally useful and
   the easiest to demo (just shows Spark's actual behavior side-by-side).
4. **Track 2 lessons (5)** — APIs + databases. Higher-value content but
   more demo work.
5. **Track 3 lessons (5)** — AI literacy + safety. Mostly conversational,
   less interactive.

Each track ships independently. The product is usable after step 1.

## Open questions to decide before building

- **Tab name**: "Learn" or "Skills" or "Practice"?
- **Lesson length cap**: hard 60-second cap, or soft 90?
- **Voice narration**: Spark reads each lesson card aloud by default for
  younger kids? (We already have text-to-speech.)
- **Reward shape**: just the "4 of 15" tracker, or also a tiny visual
  confetti moment per completion?
- **Parent visibility**: which lessons the kid completed, or just the
  count?

None of these block step 1.
