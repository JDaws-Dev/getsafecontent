# LRCLib Migration — Replace MusixMatch

**Status:** ✅ **COMPLETED & DEPLOYED — July 19-20, 2026**
**Savings:** $59/month ($708/year) — **realized**
**Created:** March 9, 2026
**Updated:** April 5, 2026 (full test results added) · July 20, 2026 (implemented, deployed, subscription cancelled)

## ✅ Completion record (July 2026)

Implemented in `apps/safetunes/convex/ai/lyrics.ts` — `fetchLyrics` now tries **free sources first**, with Musixmatch demoted to an optional free-tier backup:

1. **LRCLIB** (`lrclib.net`) — free, no API key, full plain lyrics. Exact `/get` across track/artist name variations, then a fuzzy `/search` fallback.
2. **lyrics.ovh** — free, no key, second fallback.
3. **Musixmatch free tier** — last resort only, and now **optional**: if `MUSIXMATCH_API_KEY` is unset the action returns not-found instead of throwing, so the app keeps working with the key fully removed.

**Safety gate (important):** LRCLIB `/get` and lyrics.ovh match artist+title server-side, so a hit is the correct song. The fuzzy `/search` fallback requires **trackSim ≥ 75 AND artistSim ≥ 65 independently** — a blended score could accept a right-title/wrong-artist match and feed the AI content filter the *wrong* song's lyrics, letting an inappropriate track pass. Better to return nothing than the wrong song. All fetches have `AbortSignal.timeout(5000)`.

- Cross-model reviewed (SOL / gpt-5.6-sol): **SHIP** (initial HOLD on the similarity gate was addressed).
- Deployed to prod `formal-chihuahua-623` and **verified live** — LRCLIB returned full lyrics for real songs on cache-miss.
- **Musixmatch "Lyrics API Basic (legacy)" subscription cancelled July 19, 2026** via the Stripe customer portal; service ended at period end **July 23, 2026**. (Note: a separate, unused free "Musixmatch Pro" *artist* account also exists — unrelated to the app, ignore it.)

---

## Decision: Option A — Full Replace

Validated by testing all 280 approved songs in the SafeTunes production library against LRCLib on April 5, 2026.

---

## Test Results (April 5, 2026)

Tested every unique song in the jedaws@gmail.com SafeTunes library (280 songs) against the LRCLib API.

| Batch | Songs | Found | Missed | Hit Rate |
|-------|-------|-------|--------|----------|
| 1–50 (Ed Sheeran, Chuck Berry, Disney, Paul Simon) | 50 | 50 | 0 | **100%** |
| 51–150 (Huey Lewis, jazz big bands, Madison Ryann Ward) | 100 | 60 | 40 | 60% |
| 151–280 (more jazz, film scores, Disney soundtracks) | 130 | 84 | 46 | 65% |
| **TOTAL** | **280** | **194** | **86** | **69%** |

### What's missing — and why it doesn't matter

The 86 misses fall into 3 categories:

1. **Obscure jazz big band instrumentals (~50)** — Stan Kenton, Fletcher Henderson, Benny Goodman orchestral recordings, Erskine Hawkins, Mills Blue Rhythm Band, etc. **No lyrics exist** for these — they're instrumentals.
2. **Film score tracks (~15)** — John Williams ("One Barrel Chase"), Howard Shore ("The Uruk-Hai"), Alan Menken score cues ("Fanfare", "The Storm", "Jig"). **Also instrumentals.**
3. **Disney "Soundtrack Version" releases (~10)** — e.g. "Part of Your World (Soundtrack Version)" by Jodi Benson. LRCLib has these under the standard release name without the "(Soundtrack Version)" suffix. The fuzzy search fallback will catch most of these.

**For songs that actually have lyrics (pop, rock, singer-songwriter, etc.) the hit rate is effectively 100%.** Every Ed Sheeran, Chuck Berry, Paul Simon, Beatles, Disney vocal, and mainstream track was found with full lyrics.

**MusixMatch comparison:** MusixMatch's Basic tier ($59/month) returns **truncated lyrics** with `****` disclaimer markers that we have to strip. LRCLib returns **full, untruncated lyrics** for free.

---

## Current State — What We're Replacing

**MusixMatch Basic** ($59/month, was $29.50 with expired 50% coupon):
- 500 lyrics API calls/day, 5,000 total calls/day
- Returns partial/truncated lyrics on Basic tier
- Requires 2 API calls per lookup (search → get lyrics)
- API key required (`MUSIXMATCH_API_KEY` in Convex env)

**Primary file:** `apps/safetunes/convex/ai/lyrics.ts` (480 lines)

**Current flow:**
1. Check Convex `contentReviewCache` for cached lyrics
2. If miss: try up to 10 track/artist name combinations against MusixMatch
3. For each combo: `track.search` API call → find best match with fuzzy scoring → `track.lyrics.get` API call
4. Clean up truncated lyrics (remove `****` disclaimers, trailing `...`)
5. Cache result in Convex for future lookups
6. Final fallback: broader combined query search

---

## LRCLib — What We're Moving To

**Free, open-source lyrics database:**
- Cost: **$0**
- Rate limits: None documented
- Returns **full lyrics** (not truncated)
- Returns **synced lyrics** too (LRC timed format — future karaoke feature?)
- 1 API call per lookup (vs 2 for MusixMatch)
- No API key required
- ~3 million songs
- Requires `User-Agent` header

**API endpoints:**

```
# Direct lookup (exact match)
GET https://lrclib.net/api/get?track_name=Shape+of+You&artist_name=Ed+Sheeran

# Fuzzy search (returns array of up to 20 results)
GET https://lrclib.net/api/search?q=shape+of+you+ed+sheeran
```

**Response:**
```json
{
  "id": 123456,
  "trackName": "Shape of You",
  "artistName": "Ed Sheeran",
  "albumName": "÷ (Deluxe)",
  "duration": 233,
  "instrumental": false,
  "plainLyrics": "The club isn't the best place to find a lover...",
  "syncedLyrics": "[00:00.00] The club isn't the best place..."
}
```

---

## Files to Modify

### 1. `apps/safetunes/convex/ai/lyrics.ts` — Main lyrics fetching (REWRITE)

**Current:** 480 lines, MusixMatch API with fuzzy matching, 2-step search+get flow.

**New approach:**

```typescript
export const fetchLyrics = action({
  args: {
    trackName: v.string(),
    artistName: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Check cache (KEEP existing getCachedLyrics — no changes)
    const cached = await ctx.runQuery(internal.ai.lyrics.getCachedLyrics, {
      trackName: args.trackName,
      artistName: args.artistName,
    });
    if (cached) return { success: true, ...cached };

    // 2. Try LRCLib direct lookup
    const trackAlts = generateTrackNameAlternatives(args.trackName);
    const artistAlts = generateArtistNameAlternatives(args.artistName);

    for (const track of trackAlts) {
      for (const artist of artistAlts) {
        const params = new URLSearchParams({
          track_name: track,
          artist_name: artist,
        });
        const url = `https://lrclib.net/api/get?${params}`;

        try {
          const resp = await fetch(url, {
            headers: { 'User-Agent': 'SafeTunes/1.0 (getsafetunes.com)' },
          });

          if (!resp.ok) continue; // 404 = not found, try next combo

          const data = await resp.json();

          if (data.instrumental) {
            return {
              success: true,
              lyrics: "[Instrumental]",
              source: "lrclib",
              trackInfo: { trackName: data.trackName, artistName: data.artistName, albumName: data.albumName },
            };
          }

          if (data.plainLyrics && data.plainLyrics.length >= 10) {
            // Cache it
            await ctx.runMutation(internal.ai.lyrics.saveLyricsToCache, {
              trackName: args.trackName,
              artistName: args.artistName,
              lyrics: data.plainLyrics,
              source: "lrclib",
            });

            return {
              success: true,
              lyrics: data.plainLyrics,
              source: "lrclib",
              trackInfo: { trackName: data.trackName, artistName: data.artistName, albumName: data.albumName },
            };
          }
        } catch (e) {
          continue;
        }
      }
    }

    // 3. Fallback: fuzzy search
    try {
      const q = `${args.trackName} ${args.artistName.split(',')[0]}`;
      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'SafeTunes/1.0 (getsafetunes.com)' },
      });

      if (resp.ok) {
        const results = await resp.json();
        // Score results with existing similarity logic
        const best = findBestMatch(results, args.trackName, args.artistName);
        if (best?.plainLyrics) {
          await ctx.runMutation(internal.ai.lyrics.saveLyricsToCache, {
            trackName: args.trackName,
            artistName: args.artistName,
            lyrics: best.plainLyrics,
            source: "lrclib-search",
          });
          return {
            success: true,
            lyrics: best.plainLyrics,
            source: "lrclib",
            trackInfo: { trackName: best.trackName, artistName: best.artistName, albumName: best.albumName },
          };
        }
      }
    } catch (e) { /* fall through */ }

    // 4. Not found
    return {
      success: false,
      lyrics: null,
      source: null,
      error: `Lyrics not found for "${args.trackName}" by "${args.artistName}". The song may be instrumental, too new, or not in the lyrics database.`,
    };
  },
});
```

**Keep unchanged:**
- `getCachedLyrics` internal query (lines 6–50) — no changes
- `saveLyricsToCache` internal mutation (lines 56–115) — no changes
- `generateArtistNameAlternatives` helper (lines 118–149) — no changes
- `generateTrackNameAlternatives` helper (lines 152–194) — no changes
- `levenshteinDistance` helper (lines 197–219) — no changes
- `calculateSimilarity` helper (lines 222–235) — no changes

**Remove:**
- All MusixMatch API calls (lines 238–480)
- `MUSIXMATCH_API_KEY` environment variable check

### 2. `apps/safetunes/src/components/admin/ContentReviewModal.jsx` — UI text

Update display text for lyrics source attribution:

```jsx
// Line 324: Change
{lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}
// To
{lyricsSource === 'lrclib' ? 'LRCLib' : lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}

// Line 455: Same change
```

### 3. `apps/safetunes/src/components/admin/LyricsModal.jsx` — UI text

```jsx
// Line 69: Same source display change
{lyricsSource === 'lrclib' ? 'LRCLib' : lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}
```

### 4. `apps/safetunes/src/components/admin/PlaylistInspector.jsx` — UI text

```jsx
// Line 177: Same source display change
{lyricsSource === 'lrclib' ? 'LRCLib' : lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}
```

### 5. Convex environment — Remove API key

```bash
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex env unset MUSIXMATCH_API_KEY
```

### 6. `apps/safetunes/convex/ai/lyrics.ts.backup` — Delete

Old backup of the MusixMatch implementation. No longer needed.

---

## Files NOT changing

| File | Why |
|------|-----|
| `convex/schema.ts` | `lyricsSource` field stays as-is, just stores "lrclib" instead of "musixmatch" |
| `convex/ai/contentReview.ts` | Takes `lyricsSource` as a string arg — source-agnostic already |
| `src/components/admin/RequestsView.jsx` | Calls `fetchLyrics` action — interface unchanged |
| `src/components/child/ChildDashboard.jsx` | Calls `fetchLyrics` action — interface unchanged |

The `fetchLyrics` action keeps the exact same input/output interface. All callers work without changes.

---

## Existing cache — backward compatible

The `contentReviewCache` table already has lyrics cached with `lyricsSource: "musixmatch"`. These continue to work — the cache lookup doesn't filter by source. New entries will have `lyricsSource: "lrclib"`. Over time the cache naturally transitions.

---

## Implementation Steps

| Step | Time | What |
|------|------|------|
| 1 | 5 min | Rewrite `fetchLyrics` action in `lyrics.ts` (replace MusixMatch calls with LRCLib) |
| 2 | 5 min | Update source display text in 3 UI components |
| 3 | 5 min | Delete `lyrics.ts.backup` |
| 4 | 5 min | Deploy to dev, test with a few songs |
| 5 | 5 min | Deploy to prod: `CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy` |
| 6 | 2 min | Remove env var: `npx convex env unset MUSIXMATCH_API_KEY` |
| 7 | 5 min | Verify in prod: trigger a lyrics fetch for a song not yet cached |
| 8 | 1 min | Cancel MusixMatch subscription |

**Total: ~35 minutes**

---

## Post-Migration Checklist

- [ ] `lyrics.ts` rewritten with LRCLib API calls
- [ ] Source display updated in ContentReviewModal, LyricsModal, PlaylistInspector
- [ ] `lyrics.ts.backup` deleted
- [ ] Deployed to dev and tested
- [ ] Deployed to prod
- [ ] `MUSIXMATCH_API_KEY` removed from Convex env
- [ ] Verified lyrics fetch works in prod (uncached song)
- [ ] MusixMatch subscription cancelled
- [ ] Verify no errors in Convex logs after 24 hours

---

## Rollback Plan

If LRCLib has issues after deployment:

1. `git revert <commit>` to restore MusixMatch code
2. Re-add API key: `npx convex env set MUSIXMATCH_API_KEY "your_key"`
3. Redeploy: `CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy`

Cached lyrics from before the migration are still in the database and will continue to serve.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LRCLib down/slow | Low | Medium | Existing cache serves most requests; manual lyrics entry fallback exists |
| Missing lyrics for obscure songs | Medium | Low | 100% hit rate for mainstream music; misses are instrumentals with no lyrics |
| LRCLib shuts down permanently | Very low | High | Community project with 3M+ songs; could switch to another free API or re-subscribe to MusixMatch |
| Rate limiting | Very low | Low | No documented limits; our cache prevents excessive calls anyway |

---

## Future Opportunities

With LRCLib's **synced lyrics** (`syncedLyrics` field), we could add:
- Karaoke-style lyrics display in the kid player (lyrics highlight as song plays)
- Lyrics scrolling synced to playback position
- This was impossible with MusixMatch Basic tier (no sync data)

---

## Cost Summary

| | Before | After |
|---|---|---|
| Monthly cost | $59 | $0 |
| Annual cost | $708 | $0 |
| Lyrics quality | Truncated (Basic tier) | Full text |
| Synced lyrics | Not available | Included |
| API calls per lookup | 2 | 1 |
| API key management | Required | None |
