# SafeStudy: the daily program (built 2026-09-10)

Built on `feature/one-site`. **Not deployed.** Everything here is additive —
new tables, new functions, new optional fields — so it can ship with a normal
Convex deploy, but see "Before deploying" at the bottom.

## Why

SafeStudy was a very well-defended search box with a chat window attached.
Everything built between April and August stopped a kid doing the wrong thing —
the intent classifier, the concern-rephrase guard, the loop detector — and
nothing told them what to do next. A search ended when the answer rendered, the
tutor forgot the kid on every page load, and the parent dashboard was a list of
query strings. "Safe Google" is free elsewhere; Khanmigo is $4/mo with a whole
curriculum behind it.

So this is the other half: a parent sets up subjects once, the kid gets one
small finishable thing a day, and both sides can see it happened.

## The shape of it

A parent puts a kid on **subject tracks** — a subject, a title, and an ordered
list of topics. Each active track hands the kid its next topic as a **lesson**
(a short explainer plus five questions) on the days it runs. Finishing a lesson
advances the track, writes the day's progress row, extends the streak, and drops
**review cards** into a spaced-repetition deck. The deck is the daily habit; the
progress rows are the parent's record.

## New tables (`convex/schema.ts`)

| Table | What it holds |
|---|---|
| `subjectTracks` | A subject a kid is working through, its topic list, and where they are in it |
| `lessons` | One assigned lesson for one kid on one day, with its content, questions, answers and score |
| `lessonCache` | Generated lesson bodies, shared **across families** by topic + grade |
| `reviewCards` | Spaced-repetition cards with SM-2 scheduling state |
| `kidProgress` | One row per kid per day: lessons, cards, quizzes, tutor turns, searches |
| `kidStreaks` | Streak roll-up so the home screen reads one row, not a month of days |
| `tutorNotes` | The short rolling note the tutor keeps about each kid |
| `savedItems` | "My Stuff" — finished lessons, quizzes, and answers the kid kept |

## New modules

- **`lessonQueries.ts`** — tracks CRUD, lesson reads, `completeLesson`
  (grading, track advance, card creation, progress, streak), the lesson cache,
  and the shared `bumpProgress` / `touchStreak` helpers.
- **`lessons.ts`** (node) — `ensureToday` (called on kid home mount, no-op when
  today's lessons exist), `generateOneOff`, and `generateBody`.
- **`review.ts`** — the deck: due cards, `gradeCard`, `finishSession`,
  `addCards`, deck stats.
- **`progress.ts`** — the day record, the kid's today, the parent's week, the
  family overview, "My Stuff", and `completeQuiz`.
- **`quiz.ts`** (node) — "Quiz me on this" from a Learn answer.
- **`tutorNotes.ts`** — the tutor's rolling memory of a kid.
- **`lib/mathProblems.ts`** — deterministic arithmetic problems with exact
  answers.
- **`ai/safetyGate.ts`** + **`ai/gateRefs.ts`** — the shared screening path.

## Decisions worth knowing

**Grading never goes through a model.** Every question ships with its answer and
is graded in a mutation. Free-text matching is lenient about case, punctuation
and leading articles, and compares numbers numerically. A model marking a
child's correct answer wrong is the fastest way to lose the kid and the parent.

**Arithmetic answer keys are computed, not written.** `lib/mathProblems.ts`
generates problems for addition, subtraction, multiplication, division, long
division, fractions, decimals, percentages, rounding, and area/perimeter, banded
by age. The model is only asked for the explainer. Anything it doesn't
recognise falls back to model-written questions, which are dropped if a
multiple-choice answer isn't among its own choices.

**Lesson bodies are cached across families.** A lesson on the water cycle for a
5th grader is the same lesson for every 5th grader, so the second family pays
nothing. Nothing kid-specific is written to the cache, and math questions are
still regenerated per kid so two siblings don't get the identical five sums.

**Day keys are the family's, never the server's.** Every date boundary uses
`dayKeyForTimezone`. Streaks credited to the wrong day is the bug SafeReads
shipped, and evening work is when this actually happens.

**Tutor notes are about learning only.** The summarizer is told in as many words
to keep out feelings, body, food, family trouble and anything confided. Those
belong in the concern-alert path, which already handles them and tells a parent
— not in a paragraph pasted into every future prompt. Parents can read the notes
and clear them.

## Costs

At gpt-4o-mini prices, per kid per school day: a lesson is roughly a tenth of a
cent on a cache miss and free on a hit; review sessions cost nothing (no model
call); a quiz is one cached call. Tutor cost rises slightly because the memory
paragraph rides in each prompt. Well under 10 cents per kid per month.

## Fixes shipped alongside

- **Research mode had no safety screening at all** — no injection filter, no
  intent classifier, no blocked-topics check. A question the Learn tab refused
  returned rewritten web pages one tab over. The gate that lived inline in
  `searchFromKid` moved to `ai/safetyGate.ts` and every surface now runs it.
  Fetched page text is also fenced and labelled as untrusted data in the prompt.
- **Approved topic requests could still be blocked.** `shouldBlockCategory`
  never received `allowedTopics`, so a parent's "yes" changed nothing for a
  strict-tier kid. Approval now clears the non-concern block and skips the
  response word-filter for that query. Eating-disorder and self-harm escalation
  is deliberately checked *above* the allow-list and is unaffected.
- **The tutor didn't count toward the daily budget.** A kid at their 25-search
  cap could chat indefinitely. Tutor turns now count, and the parent's
  "searches today" includes them.
- **The digest's "hit the daily budget on N days" was always zero** — nothing
  ever wrote the `limit_reached` row it counts. `search.ts` now records it,
  deduped to one row per reason per day.
- **The parent's "searches today" was computed in server UTC** while the kid's
  gate used the family timezone, so the two disagreed every evening.
- **The Wikipedia lookup was mostly missing.** Question-prefix stripping used
  shortest-first regex alternation, so "what is a volcano" matched the bare
  "what" branch and became "Is A Volcano"; and every word was title-cased, which
  Wikipedia titles don't do. Most first-attempt lookups failed and answers went
  to the model ungrounded.
- **"Read more" deep dives were uncached** ~1,000-token calls. Now cached by
  topic, subtopic and reading level.
- **Emoji removed from the Mermaid diagram prompts** in `search.ts` and
  `warmCache.ts` (they were putting emoji on kid screens against the house rule)
  and from the digest email.
- **The weekly digest leads with the program** — lessons finished, review
  accuracy, subjects covered, tutor questions — and only then searches and
  blocks. It also sends on a week of lessons with zero searches, which it
  previously treated as "no activity".

## Known and deliberately not done

- Tutor exchanges don't create review cards. Detecting "ended in a correct
  answer" reliably is harder than it looks; lessons and quizzes are the card
  sources.
- Photo/math step checking, the writing coach, printable worksheets, read-aloud
  mode for under-8s, and the Research report builder are all still open. They
  are P5, P6, P9, P10 and P12 in `docs/EVAL-SAFESTUDY-2026-09-10.md`.
- The parent Activity tab's "All Time" is still really "last 50 per kid, 100
  total".
- `searchSettings` (per-user safe-search level and domain lists) is still stored
  and still enforced nowhere.

## Before deploying

1. All five app Convex backends already run `feature/one-site` code. This is
   additive, so a deploy is safe on its own — but **frontends ship before
   backends** across the fleet, per `CLAUDE.md`.
2. The kid UI and parent dashboard for this work are separate changes on the
   same branch. Deploy them together with the backend or the new tabs point at
   functions that don't exist yet.
3. Nothing here needs a new environment variable.
