# SafeReads AI Analysis Enhancement Plan

## Current State Assessment

### What Exists
SafeReads uses GPT-4o to produce objective book content reviews. The analysis pipeline:

1. **Data sources**: Google Books API (metadata, description, maturity rating) + Open Library (description fallback, subjects, first sentence) + DoesTheDogDie.com (crowdsourced trigger warnings)
2. **AI prompt**: Sends book metadata + description + DTDD warnings to GPT-4o with structured JSON output
3. **Output**: verdict (safe/caution/warning/no_verdict), ageRecommendation, summary, 10 content flag categories with severity levels, reasoning
4. **Caching**: One analysis per book (objective, not personalized), stored permanently in `analyses` table
5. **Extras**: Alternative book suggestions, author overviews, report button for inaccurate verdicts

### 10 Content Categories (Current)
Violence, Language, Sexual Content & Nudity, Substance Use, Dark Themes & Mental Health, Supernatural & Occult, Religious & Worldview Content, Romance, Identity & Gender, Social & Political Themes

### Identified Weaknesses

1. **No parent community insights** -- The AI relies on its training data but doesn't surface what real parent communities (Common Sense Media, Goodreads) say about the book
2. **No banned/challenged book awareness** -- No check against ALA challenged books lists or state-level bans
3. **No series context** -- Doesn't note if the book is part of a series or if content escalates across the series
4. **No "what parents compare it to"** -- Parents often understand content levels through comparison ("similar to Hunger Games but darker")
5. **No granular age breakdown** -- Just a single age recommendation, not "read-aloud OK at 8, independent reading at 10"
6. **Content flag details are thin** -- "moderate violence" doesn't tell parents WHAT kind (fantasy battle vs. realistic school shooting)
7. **No page-specific warnings** -- Parents want to know "the concerning scene is in chapters 12-14" for preview/skip

## Enhancement Plan

### Phase 1: Enhanced AI Prompt (Backend)

Update `SYSTEM_PROMPT` in `convex/analyses.ts` to request richer output:

#### New fields in AI response:
- **`parentCommunityNotes`** (string) -- What parent review communities generally say about this book. Synthesized from the AI's knowledge of Common Sense Media reviews, Goodreads parent reviews, and homeschool community discussions.
- **`challengedBookStatus`** (object, optional) -- Whether the book appears on challenged/banned lists and why.
  - `isChallenged` (boolean)
  - `reason` (string) -- Why it was challenged
  - `context` (string) -- Whether the challenges were upheld or overturned, and the AI's note on the substance
- **`seriesContext`** (object, optional) -- Series awareness.
  - `seriesName` (string)
  - `bookNumber` (number or string, e.g., "3 of 7")
  - `contentProgression` (string) -- "Content matures significantly from book 3 onward"
- **`ageGuidance`** (object) -- Granular age breakdown replacing the flat string.
  - `readAloud` (string) -- e.g., "7+" (parent reading aloud, can skip/discuss)
  - `independentReader` (string) -- e.g., "10+"
  - `matureEnoughToProcess` (string) -- e.g., "12+" (themes they can emotionally handle)
- **`parentTalkingPoints`** (string[]) -- 2-4 conversation starters for parents to discuss the book's themes with their kids.
- **`comparableBooks`** (string) -- "If your child handled [X], this is similar. If [Y] was too much, this may also be."

#### Enhanced content flag details:
Each flag's `details` field will be prompted to include specifics:
- Violence: type (fantasy, realistic, war), whether injuries are described, whether death occurs
- Language: specific words used (categorized, not quoted), frequency
- Sexual Content: what specifically happens, how explicit
- etc.

### Phase 2: Schema Update (Backend)

Add new optional fields to the `analyses` table and the `store` mutation. All new fields are optional to preserve backward compatibility with existing cached analyses.

```
analyses: {
  // ... existing fields ...
  parentCommunityNotes: v.optional(v.string()),
  challengedBookStatus: v.optional(v.object({
    isChallenged: v.boolean(),
    reason: v.string(),
    context: v.string(),
  })),
  seriesContext: v.optional(v.object({
    seriesName: v.string(),
    bookNumber: v.optional(v.string()),
    contentProgression: v.string(),
  })),
  ageGuidance: v.optional(v.object({
    readAloud: v.optional(v.string()),
    independentReader: v.optional(v.string()),
    matureEnoughToProcess: v.optional(v.string()),
  })),
  parentTalkingPoints: v.optional(v.array(v.string())),
  comparableBooks: v.optional(v.string()),
}
```

### Phase 3: Frontend Updates

1. **VerdictCard** -- Show `ageGuidance` breakdown instead of flat `ageRecommendation` when available
2. **New: ParentInsightsCard** -- Display `parentCommunityNotes`, `challengedBookStatus`, `parentTalkingPoints`, `comparableBooks`
3. **New: SeriesContextBadge** -- Small badge/note on VerdictCard showing series position
4. **ContentFlagList** -- No structural change needed (details field is already displayed)

### Implementation Order

1. Update `convex/schema.ts` -- Add optional fields to analyses table
2. Update `convex/analyses.ts` -- Enhanced prompt, store mutation args, types
3. Create `src/components/ParentInsightsCard.tsx` -- New component
4. Update `src/components/VerdictCard.tsx` -- Age guidance breakdown
5. Update `src/components/VerdictSection.tsx` -- Wire up new components
6. Update book detail page -- Add ParentInsightsCard

### Backward Compatibility

- All new schema fields are `v.optional(...)` -- existing cached analyses unaffected
- Frontend components check for field existence before rendering new sections
- No migration needed -- new analyses get rich data, old ones show current UI
- The `ageRecommendation` field is kept alongside `ageGuidance` for backward compat

### What This Does NOT Do

- Does NOT add new external API calls (no Common Sense Media API -- it's not public)
- Does NOT change the AI model (stays GPT-4o)
- Does NOT break existing cached analyses
- Does NOT require schema migration
- Does NOT add new environment variables

---

*Created: April 1, 2026*
