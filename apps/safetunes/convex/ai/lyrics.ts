import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

// Internal query to check if lyrics are cached
export const getCachedLyrics = internalQuery({
  args: {
    trackName: v.string(),
    artistName: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize track and artist names for consistent lookups
    const normalizeString = (str: string) =>
      str.toLowerCase().trim().replace(/[^\w\s]/g, '');

    const normalizedTrack = normalizeString(args.trackName);
    const normalizedArtist = normalizeString(args.artistName);

    // Search in contentReviewCache for cached lyrics
    const cached = await ctx.db
      .query("contentReviewCache")
      .filter((q) => q.eq(q.field("reviewType"), "song"))
      .collect();

    // Find a match by comparing normalized names
    for (const entry of cached) {
      if (entry.trackName && entry.lyrics) {
        const cachedTrack = normalizeString(entry.trackName);
        const cachedArtist = normalizeString(entry.artistName);

        // Check for exact or close match
        if (cachedTrack === normalizedTrack && cachedArtist === normalizedArtist) {
          // NOTE: Cannot update access stats here because this is a query (read-only)
          // Access stats tracking was removed to fix "ctx.db.patch is not a function" error
          // Queries in Convex are read-only and cannot modify the database

          return {
            lyrics: entry.lyrics,
            source: entry.lyricsSource || "cache",
            trackInfo: {
              trackName: entry.trackName,
              artistName: entry.artistName,
            },
          };
        }
      }
    }

    return null;
  },
});

// Internal mutation to save lyrics to cache
// Uses check-then-skip pattern to avoid write conflicts when multiple requests
// try to cache the same lyrics simultaneously
export const saveLyricsToCache = internalMutation({
  args: {
    trackName: v.string(),
    artistName: v.string(),
    lyrics: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize for consistent lookups
    const normalizeString = (str: string) =>
      str.toLowerCase().trim().replace(/[^\w\s]/g, '');

    const normalizedTrack = normalizeString(args.trackName);
    const normalizedArtist = normalizeString(args.artistName);

    // Check if entry already exists with these lyrics
    const cached = await ctx.db
      .query("contentReviewCache")
      .filter((q) => q.eq(q.field("reviewType"), "song"))
      .collect();

    // Look for existing entry with matching normalized names
    for (const entry of cached) {
      if (entry.trackName && entry.lyrics) {
        const cachedTrack = normalizeString(entry.trackName);
        const cachedArtist = normalizeString(entry.artistName);

        if (cachedTrack === normalizedTrack && cachedArtist === normalizedArtist) {
          // Entry already exists - skip to avoid write conflict
          // Only update if lyrics are different (shouldn't happen normally)
          if (entry.lyrics !== args.lyrics) {
            await ctx.db.patch(entry._id, {
              lyrics: args.lyrics,
              lyricsSource: args.source,
              lastAccessedAt: Date.now(),
            });
          }
          return; // Already cached, don't create duplicate
        }
      }
    }

    // No existing entry found - create new cache entry
    // NOTE: We only store lyrics here, NOT fake review data
    // The AI review will create a proper entry with track ID when it runs
    await ctx.db.insert("contentReviewCache", {
      reviewType: "song",
      trackName: args.trackName,
      artistName: args.artistName,
      lyrics: args.lyrics,
      lyricsSource: args.source,
      // Don't set fake review fields - this is lyrics-only cache
      // The actual AI review will create a separate entry with appleTrackId
      reviewedAt: Date.now(),
      openAiModel: "lyrics-cache-only", // Mark as lyrics-only, not a real review
      timesReused: 0,
      lastAccessedAt: Date.now(),
    });
  },
});

// Generate alternative artist name formats to try
function generateArtistNameAlternatives(artistName: string): string[] {
  const alternatives: string[] = [artistName]; // Start with original

  // Remove common suffixes and parentheticals
  const patterns = [
    /\s+Tell\s+'Em$/i,
    /\s+Tell\s+Em$/i,
    /\s+\(.*?\)$/,  // Remove anything in parentheses at the end
    /\s+featuring.*$/i,
    /\s+feat\..*$/i,
    /\s+ft\..*$/i,
    /\s+with.*$/i,
    /\s+x\s+.*$/i,  // Remove "x other artist" collabs
    /\s+&\s+.*$/i,  // Remove "& other artist" collabs
    /\s+,\s+.*$/i,  // Remove ", other artist" collabs
  ];

  patterns.forEach(pattern => {
    const simplified = artistName.replace(pattern, '').trim();
    if (simplified && !alternatives.includes(simplified)) {
      alternatives.push(simplified);
    }
  });

  // Try just the first name/word
  const firstWord = artistName.split(/[\s,&]+/)[0];
  if (firstWord && firstWord.length > 2 && !alternatives.includes(firstWord)) {
    alternatives.push(firstWord);
  }

  return alternatives;
}

// Generate alternative track name formats to try
function generateTrackNameAlternatives(trackName: string): string[] {
  const alternatives: string[] = [trackName]; // Start with original

  // Remove common suffixes and parentheticals
  const patterns = [
    /\s+\(.*?\)$/,  // Remove anything in parentheses at the end (e.g., "(Remastered)")
    /\s+\[.*?\]$/,  // Remove anything in brackets at the end
    /\s+-\s+.*$/,   // Remove " - Something" at the end
    /\s+\(feat\..*?\)/i,  // Remove featured artist info
    /\s+\(ft\..*?\)/i,
    /\s+\(featuring.*?\)/i,
    /\s+\(with.*?\)/i,
    /\s+\/\s+.*$/,  // Remove " / something" at the end
    /\s+Remastered.*$/i,
    /\s+\d{4}\s*Remaster.*$/i,
    /\s+Radio\s+Edit$/i,
    /\s+Album\s+Version$/i,
    /\s+Single\s+Version$/i,
    /\s+Live.*$/i,
    /\s+Remix$/i,
    /\s+Mix$/i,
    /\s+Edit$/i,
    /\s+Version$/i,
  ];

  patterns.forEach(pattern => {
    const simplified = trackName.replace(pattern, '').trim();
    if (simplified && simplified.length > 2 && !alternatives.includes(simplified)) {
      alternatives.push(simplified);
    }
  });

  // Apply multiple patterns together for deeply cleaned version
  let deepClean = trackName;
  patterns.forEach(pattern => {
    deepClean = deepClean.replace(pattern, '').trim();
  });
  if (deepClean && deepClean.length > 2 && !alternatives.includes(deepClean)) {
    alternatives.push(deepClean);
  }

  return alternatives;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        );
      }
    }
  }
  return dp[m][n];
}

// Calculate similarity score (0-100) between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  return Math.round((1 - distance / maxLen) * 100);
}

// Action to fetch lyrics from Musixmatch API with caching
export const fetchLyrics = action({
  args: {
    trackName: v.string(),
    artistName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Lyrics Fetch] Request for: "${args.trackName}" by "${args.artistName}"`);

    // CHECK CACHE FIRST - This saves API calls!
    const cached = await ctx.runQuery(internal.ai.lyrics.getCachedLyrics, {
      trackName: args.trackName,
      artistName: args.artistName,
    });

    if (cached) {
      console.log(`[Lyrics Fetch] ✅ CACHE HIT - Returning cached lyrics (${cached.lyrics.length} chars)`);
      return {
        success: true,
        lyrics: cached.lyrics,
        source: "cache",
        trackInfo: cached.trackInfo,
      };
    }

    console.log(`[Lyrics Fetch] ⚠️ CACHE MISS - Fetching from Musixmatch API`);

    const apiKey = process.env.MUSIXMATCH_API_KEY;
    if (!apiKey) {
      throw new Error("MUSIXMATCH_API_KEY environment variable not set");
    }

    const artistAlternatives = generateArtistNameAlternatives(args.artistName);
    const trackAlternatives = generateTrackNameAlternatives(args.trackName);

    console.log(`[Lyrics Fetch] Will try ${trackAlternatives.length} track name variations:`, trackAlternatives);
    console.log(`[Lyrics Fetch] Will try ${artistAlternatives.length} artist name variations:`, artistAlternatives);

    // Create all combinations of track and artist alternatives
    const combinations: Array<{track: string, artist: string}> = [];
    for (const track of trackAlternatives) {
      for (const artist of artistAlternatives) {
        combinations.push({ track, artist });
      }
    }

    // Limit to first 10 combinations to avoid too many API calls
    const limitedCombinations = combinations.slice(0, 10);
    console.log(`[Lyrics Fetch] Will try ${limitedCombinations.length} combinations`);

    // Try each combination
    for (let i = 0; i < limitedCombinations.length; i++) {
      const { track: trackName, artist: artistName } = limitedCombinations[i];

      try {
        console.log(`[Lyrics Fetch] Attempt ${i + 1}/${limitedCombinations.length}: "${trackName}" by "${artistName}"`);

        // Step 1: Search for the track to get the track_id
        const searchUrl = `https://api.musixmatch.com/ws/1.1/track.search?q_track=${encodeURIComponent(trackName)}&q_artist=${encodeURIComponent(artistName)}&page_size=10&apikey=${apiKey}`;

        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          console.log(`[Lyrics Fetch] Search request failed with status ${searchResponse.status}, trying next combination`);
          continue;
        }

        const searchData = await searchResponse.json();

        if (searchData.message.header.status_code !== 200 || !searchData.message.body.track_list.length) {
          console.log(`[Lyrics Fetch] No results found for: "${trackName}" by "${artistName}", trying next combination`);
          continue;
        }

        // Find best match using improved similarity scoring
        const trackList = searchData.message.body.track_list;

        // Score each result based on how well it matches
        const scoredResults = trackList.map((item: any) => {
          const track = item.track;

          // Use fuzzy matching for better results
          const trackSimilarity = calculateSimilarity(trackName, track.track_name);
          const artistSimilarity = calculateSimilarity(artistName, track.artist_name);

          // Weight track name slightly higher than artist
          const score = (trackSimilarity * 0.6) + (artistSimilarity * 0.4);

          return { track, score, trackSimilarity, artistSimilarity };
        });

        // Sort by score descending and pick the best match
        scoredResults.sort((a, b) => b.score - a.score);
        const bestMatch = scoredResults[0];

        // Lower threshold to 40 for more matches (was 50)
        if (bestMatch.score < 40) {
          console.log(`[Lyrics Fetch] No good match found. Best score: ${bestMatch.score.toFixed(1)} (track: ${bestMatch.trackSimilarity}, artist: ${bestMatch.artistSimilarity}) for "${bestMatch.track.track_name}" by "${bestMatch.track.artist_name}", trying next combination`);
          continue;
        }

        const track = bestMatch.track;
        const trackId = track.track_id;

        console.log(`[Lyrics Fetch] Found track ID: ${trackId} (score: ${bestMatch.score.toFixed(1)}) - "${track.track_name}" by "${track.artist_name}"`);

        // Step 2: Get lyrics using the track_id
        const lyricsUrl = `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${trackId}&apikey=${apiKey}`;

        const lyricsResponse = await fetch(lyricsUrl);
        if (!lyricsResponse.ok) {
          console.log(`[Lyrics Fetch] Lyrics request failed with status ${lyricsResponse.status}, trying next combination`);
          continue;
        }

        const lyricsData = await lyricsResponse.json();

        if (lyricsData.message.header.status_code !== 200 || !lyricsData.message.body.lyrics) {
          console.log(`[Lyrics Fetch] No lyrics available for track ID: ${trackId}, trying next combination`);
          continue;
        }

        const lyricsBody = lyricsData.message.body.lyrics.lyrics_body;

        // Musixmatch free tier returns partial lyrics with a disclaimer at the end
        // Remove the disclaimer
        const cleanedLyrics = lyricsBody
          .replace(/\*{4,}.*?\*{4,}/gs, '')
          .replace(/\.\.\.$/gm, '')  // Remove trailing ellipsis
          .trim();

        // Check if lyrics are actually present (not just empty after cleaning)
        if (!cleanedLyrics || cleanedLyrics.length < 10) {
          console.log(`[Lyrics Fetch] Lyrics too short or empty after cleaning (${cleanedLyrics.length} chars), trying next combination`);
          continue;
        }

        console.log(`[Lyrics Fetch] ✅ Successfully fetched lyrics (${cleanedLyrics.length} characters)`);

        // SAVE TO CACHE for future requests - this prevents hitting the API again!
        // Save with the ORIGINAL track/artist names for better cache hits
        await ctx.runMutation(internal.ai.lyrics.saveLyricsToCache, {
          trackName: args.trackName,  // Original input
          artistName: args.artistName,  // Original input
          lyrics: cleanedLyrics,
          source: "musixmatch",
        });

        // Also save with the matched names if different
        if (track.track_name !== args.trackName || track.artist_name !== args.artistName) {
          await ctx.runMutation(internal.ai.lyrics.saveLyricsToCache, {
            trackName: track.track_name,
            artistName: track.artist_name,
            lyrics: cleanedLyrics,
            source: "musixmatch",
          });
        }

        console.log(`[Lyrics Fetch] 💾 Saved lyrics to cache for future requests`);

        return {
          success: true,
          lyrics: cleanedLyrics,
          source: "musixmatch",
          trackInfo: {
            trackName: track.track_name,
            artistName: track.artist_name,
            albumName: track.album_name,
          },
        };
      } catch (error) {
        console.error(`[Lyrics Fetch] Error with "${trackName}" by "${artistName}":`, error);
        continue;
      }
    }

    // Try one more fallback: broader search with just track name
    try {
      console.log(`[Lyrics Fetch] Trying fallback: broader search with just track name "${args.trackName}"`);

      const fallbackUrl = `https://api.musixmatch.com/ws/1.1/track.search?q=${encodeURIComponent(args.trackName + ' ' + args.artistName)}&page_size=5&apikey=${apiKey}`;

      const fallbackResponse = await fetch(fallbackUrl);
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();

        if (fallbackData.message.header.status_code === 200 && fallbackData.message.body.track_list.length > 0) {
          // Try each result
          for (const item of fallbackData.message.body.track_list) {
            const track = item.track;

            // Get lyrics for this track
            const lyricsUrl = `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${track.track_id}&apikey=${apiKey}`;
            const lyricsResponse = await fetch(lyricsUrl);

            if (lyricsResponse.ok) {
              const lyricsData = await lyricsResponse.json();

              if (lyricsData.message.header.status_code === 200 && lyricsData.message.body.lyrics) {
                const cleanedLyrics = lyricsData.message.body.lyrics.lyrics_body
                  .replace(/\*{4,}.*?\*{4,}/gs, '')
                  .replace(/\.\.\.$/gm, '')
                  .trim();

                if (cleanedLyrics && cleanedLyrics.length >= 10) {
                  console.log(`[Lyrics Fetch] ✅ Fallback succeeded with "${track.track_name}" by "${track.artist_name}"`);

                  // Save to cache
                  await ctx.runMutation(internal.ai.lyrics.saveLyricsToCache, {
                    trackName: args.trackName,
                    artistName: args.artistName,
                    lyrics: cleanedLyrics,
                    source: "musixmatch-fallback",
                  });

                  return {
                    success: true,
                    lyrics: cleanedLyrics,
                    source: "musixmatch",
                    trackInfo: {
                      trackName: track.track_name,
                      artistName: track.artist_name,
                      albumName: track.album_name,
                    },
                  };
                }
              }
            }
          }
        }
      }
    } catch (fallbackError) {
      console.error(`[Lyrics Fetch] Fallback search failed:`, fallbackError);
    }

    // If we've exhausted all options, return error
    console.log(`[Lyrics Fetch] Failed to fetch lyrics after trying ${limitedCombinations.length} combinations and fallback`);
    return {
      success: false,
      lyrics: null,
      source: null,
      error: `Lyrics not found for "${args.trackName}" by "${args.artistName}". The song may be instrumental, too new, or not in the lyrics database.`,
    };
  },
});
