# SafeTube AI Review Enhancement Plan

## Overview

Enhance the AI Channel Review feature to include community/parent feedback, known controversies, and Common Sense Media ratings by leveraging OpenAI's training knowledge about popular YouTube channels.

## Current State

- **File:** `apps/safetube/convex/ai/channelReview.ts`
- **Model:** gpt-4o-mini
- **Input:** Channel title, description, subscriber count, last 20 video titles
- **Output:** summary, contentCategories, concerns, recommendation, ageRecommendation
- **Cache:** `channelReviewCache` table with `by_channel_id` index

## Changes

### 1. Enhanced OpenAI Prompt (`convex/ai/channelReview.ts`)

Instead of adding a separate web search step (which would add complexity, latency, and cost), we enhance the existing prompt to ask gpt-4o-mini to draw on its training data knowledge of the channel. GPT-4o-mini has extensive knowledge of popular YouTube channels from Common Sense Media reviews, news articles, parent forums, and Reddit discussions through its training cutoff.

**Prompt additions:**
- Ask the AI to recall what it knows about the channel from its training data
- Request a "Community & Parent Feedback" section
- Ask for known controversies or incidents
- Ask for Common Sense Media rating if known
- Instruct the model to clearly state when it has no external knowledge of a channel

**New JSON response fields:**
```json
{
  "summary": "...",
  "contentCategories": [...],
  "concerns": [...],
  "recommendation": "...",
  "ageRecommendation": "...",
  "parentCommunityNotes": ["Parents on Common Sense Media praise...", "Reddit users note..."],
  "knownControversies": ["In 2023, the creator was involved in..."],
  "commonSenseMediaRating": "4/5" | null
}
```

### 2. Schema Update (`convex/schema.ts`)

Add three optional fields to `channelReviewCache`:

```typescript
parentCommunityNotes: v.optional(v.array(v.string())),
knownControversies: v.optional(v.array(v.string())),
commonSenseMediaRating: v.optional(v.union(v.string(), v.null())),
```

All fields are optional for backward compatibility with existing cache entries.

### 3. Cache & Mutation Updates (`convex/ai/channelReview.ts`)

- Add new fields to `saveToCache` mutation args (all optional)
- Include new fields in cache return from `getCachedReview`
- Include new fields in the action's cache-hit return object
- Increase `max_tokens` from 1500 to 2000 to accommodate the longer response

**Cache invalidation:** Existing cache entries will still work (fields are optional). The `clearAllCache` mutation can be used to force re-reviews with the enhanced prompt. No migration needed.

### 4. Frontend Update (`src/components/admin/YouTubeSearch.jsx`)

Add two new collapsible sections below the existing concerns display:

1. **Community & Parent Feedback** (blue/indigo themed)
   - Shows `parentCommunityNotes` as a bulleted list
   - Only renders if array is non-empty

2. **Known Controversies** (orange/red themed, attention-grabbing)
   - Shows `knownControversies` as a bulleted list
   - Only renders if array is non-empty

3. **Common Sense Media Rating** (inline badge)
   - Shows next to the recommendation if available
   - "CSM: 4/5" style badge

### 5. Cost Impact

- Same model (gpt-4o-mini), same number of API calls
- Slightly more output tokens (~500 extra) = ~$0.001 additional per review
- No new API integrations or external service costs
- Cache continues to prevent redundant calls

## Files Modified

| File | Change |
|------|--------|
| `apps/safetube/convex/ai/channelReview.ts` | Enhanced prompt, new fields in save/return |
| `apps/safetube/convex/schema.ts` | 3 optional fields on `channelReviewCache` |
| `apps/safetube/src/components/admin/YouTubeSearch.jsx` | New UI sections for community notes & controversies |

## Rollout

1. Deploy schema change first (additive, no breaking changes)
2. Deploy backend changes (enhanced prompt + save logic)
3. Deploy frontend changes
4. Optionally run `clearAllCache` to re-review channels with enhanced prompt
5. New reviews will automatically include the enhanced data

## Limitations

- GPT-4o-mini knowledge is limited to its training cutoff -- it will not know about very recent controversies
- For smaller/niche channels, the model may have no community knowledge and will say so
- Common Sense Media ratings are only available for channels that CSM has reviewed
- The model may occasionally hallucinate details -- the prompt instructs it to only report what it is confident about

---

*Created: April 1, 2026*
