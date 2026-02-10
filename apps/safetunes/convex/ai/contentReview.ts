import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";

// Main action to review content with AI (with caching)
export const reviewContent = action({
  args: {
    appleTrackId: v.optional(v.string()),
    appleAlbumId: v.optional(v.string()),
    reviewType: v.string(), // "song" | "album"
    trackName: v.optional(v.string()),
    albumName: v.optional(v.string()),
    artistName: v.string(),
    lyrics: v.optional(v.string()),
    lyricsSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CHECK CACHE FIRST
    const cached = await ctx.runQuery(api.ai.contentReview.getCachedReview, {
      reviewType: args.reviewType,
      trackId: args.appleTrackId,
      albumId: args.appleAlbumId,
    });

    if (cached) {
      console.log(`[AI Content Review] Cache hit! Reusing review for ${args.trackName || args.albumName}`);
      // UPDATE CACHE STATS
      await ctx.runMutation(api.ai.contentReview.updateCacheStats, {
        cacheId: cached._id,
      });
      return {
        review: {
          summary: cached.summary,
          positiveAspects: cached.positiveAspects || [],
          inappropriateContent: cached.inappropriateContent,
          overallRating: cached.overallRating,
          ageRecommendation: cached.ageRecommendation,
          _id: cached._id,
        },
        fromCache: true,
        cacheHitCount: cached.timesReused + 1,
      };
    }

    console.log(`[AI Content Review] Cache miss. Reviewing ${args.trackName || args.albumName}...`);

    // NO CACHE - NEED LYRICS
    if (!args.lyrics) {
      throw new Error("Lyrics required for first-time review. Please provide lyrics to analyze.");
    }

    // CALL OPENAI
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    const contentName = args.trackName || args.albumName || "Unknown";
    const prompt = `You are a comprehensive content advisor helping parents make informed decisions about music for their children. Your role is to identify ALL potentially concerning content that ANY parent might want to know about - from the strictest to the most relaxed parenting styles.

Song/Album: ${contentName}
Artist: ${args.artistName}

Lyrics:
${args.lyrics}

IMPORTANT: Read through the ENTIRE song carefully, line by line. Do not stop after finding the first issue - continue analyzing every line until you've reviewed all lyrics completely.

Your goal is to be THOROUGH and INFORMATIVE, not to judge. Different parents have different values and boundaries. Flag everything that might matter to ANY parent, and let them decide what's appropriate for their family.

Provide a comprehensive analysis with the following:

1. Brief summary (2-3 sentences): What is this song about? What themes, messages, or emotions does it convey?

2. Content considerations: Review EVERY LINE of the lyrics and flag ALL instances of potentially concerning content that any parent might want to know about.

For EACH AND EVERY concern found (not just the first one), create a separate entry with:
   - Category (use the specific categories listed below)
   - Severity (mild, moderate, significant)
   - Direct quote from lyrics (exact words - be specific)
   - Context: Explain what this is and why it might matter for different age groups

CRITICAL - You must check for ALL of these categories throughout the ENTIRE song:

**Sexual Content & Romance:**
   - Sexual references, innuendo, or suggestive language
   - Sexual slang terms, coded language, or euphemisms (e.g., "superman that", "smash", "hit that", "tap that", "piping", "beat it up", etc.)
   - ANY references to body parts, body shape, or physical form in a romantic/attraction context (e.g., "shape of your body", "curves", "figure", etc.)
   - Comments about someone's physical appearance in a romantic or desiring way
   - References to touching, holding, or exploring another person's body
   - Intimate physical contact beyond hand-holding (kissing, touching, embracing romantically)
   - Adult relationship dynamics (secret relationships, forbidden romance)
   - Physical desire or attraction
   - Degrading sexual language or acts (treating partners as objects)

**Substance Use:**
   - Alcohol consumption or references to drinking (beer, wine, liquor, champagne, etc.)
   - Drug use (marijuana, pills, other substances)
   - Smoking or vaping
   - Being drunk, high, or intoxicated
   - References to bars, parties with drinking

**Mental Health & Self-Harm:**
   - Suicidal thoughts or ideation
   - Self-harm references
   - Depression or hopelessness (if severe)
   - Anxiety or panic (if intense)

**Body Image & Appearance:**
   - Objectification of bodies (treating someone as a physical object rather than a person)
   - Focus on physical appearance, attractiveness, or body parts as primary value
   - ANY mention of body shape, form, or physical features in a sexualized or objectifying way
   - Weight or body shape references (if potentially harmful)
   - Emphasis on physical beauty or attractiveness defining worth

**Language:**
   - Profanity (including mild words like "damn", "hell", "crap")
   - Crude humor or bathroom references
   - Disrespectful tone toward authority

**Religious/Spiritual Concerns:**
   - Using God's name in vain or as an exclamation ("Oh my God", "God damn", "Jesus Christ" as exclamations)
   - Irreverent or mocking references to God, Jesus, or religious figures
   - Blasphemy or disrespectful treatment of religious concepts
   - References to the devil, Satan, or demonic themes presented positively

**Violence & Aggression:**
   - Physical violence or fighting
   - Weapons
   - Aggressive or threatening language
   - Death or injury

**Behavioral Concerns:**
   - Rebellion against parents/authority
   - Risky or dangerous behavior
   - Disrespect or meanness
   - Lying or deception presented positively

**Emotional Intensity:**
   - Intense fear or scary themes
   - Overwhelming sadness
   - Dark or disturbing imagery

**Other Mature Themes:**
   - Worldview elements some families may want to discuss
   - Any other content parents should know about

4. Overall rating:
   - "appropriate" - Minimal content concerns; suitable for most young children
   - "use-caution" - Contains content that some parents may want to discuss or review with their child
   - "inappropriate" - Contains significant mature content that many parents would not choose for children

5. Age recommendation: Suggest an appropriate age range (e.g., "5+", "8+", "10+", "13+", "16+") based on the most mature content found

Present your analysis in a factual, informative tone. Be exhaustively thorough - parents want to know about EVERY potentially concerning element, not just examples. Your job is to inform, not to make the decision for them. Cast a wide net and flag anything that could matter to parents with different values and boundaries.

Return ONLY valid JSON (no markdown, no code blocks) in exactly this format:
{
  "summary": "This song is about...",
  "positiveAspects": [],
  "inappropriateContent": [
    {
      "category": "sexual-content",
      "severity": "moderate",
      "quote": "exact first concerning lyric here",
      "context": "This references romantic physical attraction. Some parents may want to discuss this with older children, while others prefer to avoid this content entirely."
    },
    {
      "category": "romantic-themes",
      "severity": "mild",
      "quote": "exact second concerning lyric here",
      "context": "Contains dating/relationship themes. May be appropriate for teens but not younger children in some families."
    },
    {
      "category": "substance-use",
      "severity": "significant",
      "quote": "exact lyric about drinking/drugs",
      "context": "Direct reference to alcohol/drug use. Most parents would want to be aware of this content."
    },
    {
      "category": "religious-concerns",
      "severity": "mild",
      "quote": "Oh my God",
      "context": "Uses God's name as an exclamation rather than reverently. Some religious families consider this taking the Lord's name in vain."
    }
  ],
  "overallRating": "use-caution",
  "ageRecommendation": "13+"
}

Remember:
- Include EVERY instance of concerning content as a separate entry in the inappropriateContent array. Do not summarize multiple issues into one entry.
- Always return an empty array for positiveAspects (we are focusing only on flagging concerns, not finding positives).
- If there are NO concerns, return an empty array for inappropriateContent.
- In the "context" field, explain what the content is and why different types of parents might have concerns about it, without being judgmental.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Using mini for cost efficiency
          messages: [
            {
              role: "system",
              content: "You are a comprehensive content reviewer helping parents make informed decisions. Always return valid JSON only, with no markdown formatting. Be exhaustively thorough - review EVERY line of the lyrics and flag ALL potentially concerning content from ANY parenting perspective (strict to relaxed). Your goal is to inform, not judge. Flag everything that might matter to different families - from explicit content to subtle themes. IMPORTANT: Recognize slang terms, coded language, and cultural references that have sexual or inappropriate meanings (e.g., 'superman that' is explicit sexual slang). Use your knowledge of hip-hop, pop culture, and modern slang to identify these references. Parents with different values and boundaries will use this information to make their own decisions.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent analysis
          max_tokens: 3000, // Increased to accommodate comprehensive line-by-line reviews
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const completion = await response.json();
      const content = completion.choices[0].message.content;

      // Parse the JSON response, handling potential markdown code blocks
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      const review = JSON.parse(cleanedContent);

      console.log(`[AI Content Review] Review complete. Found ${review.inappropriateContent?.length || 0} issues`);

      // SAVE TO CACHE
      const cacheId = await ctx.runMutation(api.ai.contentReview.saveToCache, {
        appleTrackId: args.appleTrackId,
        appleAlbumId: args.appleAlbumId,
        reviewType: args.reviewType,
        trackName: args.trackName,
        albumName: args.albumName,
        artistName: args.artistName,
        lyrics: args.lyrics,
        lyricsSource: args.lyricsSource || "manual",
        summary: review.summary,
        positiveAspects: review.positiveAspects || [],
        inappropriateContent: review.inappropriateContent || [],
        overallRating: review.overallRating,
        ageRecommendation: review.ageRecommendation,
        openAiModel: "gpt-4o-mini",
      });

      return {
        review: {
          ...review,
          _id: cacheId,
        },
        fromCache: false,
        cacheHitCount: 0,
      };
    } catch (error) {
      console.error("[AI Content Review] Error:", error);
      throw new Error(`Failed to review content: ${error}`);
    }
  },
});

// Query to get cached review
export const getCachedReview = query({
  args: {
    reviewType: v.string(),
    trackId: v.optional(v.string()),
    albumId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.reviewType === "song" && args.trackId) {
      return await ctx.db
        .query("contentReviewCache")
        .withIndex("by_track_id", (q) => q.eq("appleTrackId", args.trackId))
        .first();
    } else if (args.reviewType === "album" && args.albumId) {
      return await ctx.db
        .query("contentReviewCache")
        .withIndex("by_album_id", (q) => q.eq("appleAlbumId", args.albumId))
        .first();
    }
    return null;
  },
});

// Mutation to save to cache
export const saveToCache = mutation({
  args: {
    appleTrackId: v.optional(v.string()),
    appleAlbumId: v.optional(v.string()),
    reviewType: v.string(),
    trackName: v.optional(v.string()),
    albumName: v.optional(v.string()),
    artistName: v.string(),
    lyrics: v.optional(v.string()),
    lyricsSource: v.optional(v.string()),
    summary: v.string(),
    positiveAspects: v.optional(v.array(v.string())),
    inappropriateContent: v.array(v.any()),
    overallRating: v.string(),
    ageRecommendation: v.optional(v.string()),
    openAiModel: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contentReviewCache", {
      appleTrackId: args.appleTrackId,
      appleAlbumId: args.appleAlbumId,
      reviewType: args.reviewType,
      trackName: args.trackName,
      albumName: args.albumName,
      artistName: args.artistName,
      lyrics: args.lyrics,
      lyricsSource: args.lyricsSource,
      summary: args.summary,
      positiveAspects: args.positiveAspects,
      inappropriateContent: args.inappropriateContent,
      overallRating: args.overallRating,
      ageRecommendation: args.ageRecommendation,
      reviewedAt: Date.now(),
      openAiModel: args.openAiModel,
      timesReused: 0,
      lastAccessedAt: Date.now(),
    });
  },
});

// Mutation to update cache stats
export const updateCacheStats = mutation({
  args: { cacheId: v.id("contentReviewCache") },
  handler: async (ctx, args) => {
    const cache = await ctx.db.get(args.cacheId);
    if (cache) {
      await ctx.db.patch(args.cacheId, {
        timesReused: cache.timesReused + 1,
        lastAccessedAt: Date.now(),
      });
    }
  },
});

// Query to get cache statistics (for admin dashboard)
export const getCacheStats = query({
  handler: async (ctx) => {
    const allCached = await ctx.db.query("contentReviewCache").collect();

    const totalCacheHits = allCached.reduce((sum, cache) => sum + cache.timesReused, 0);
    const totalApiCalls = allCached.length;
    const totalRequests = totalApiCalls + totalCacheHits;
    const cacheHitRate = totalRequests > 0 ? (totalCacheHits / totalRequests) * 100 : 0;

    // Estimate cost savings (assuming $0.005 per review for gpt-4o-mini with longer context)
    const costPerCall = 0.005;
    const costSaved = totalCacheHits * costPerCall;
    const costSpent = totalApiCalls * costPerCall;

    // Get most reused reviews (popular songs)
    const topReviewed = allCached
      .sort((a, b) => b.timesReused - a.timesReused)
      .slice(0, 10)
      .map(cache => ({
        name: cache.trackName || cache.albumName,
        artist: cache.artistName,
        timesReused: cache.timesReused,
        rating: cache.overallRating,
      }));

    return {
      totalCacheEntries: allCached.length,
      totalCacheHits,
      totalApiCalls,
      totalRequests,
      cacheHitRate: cacheHitRate.toFixed(1),
      costSaved: costSaved.toFixed(2),
      costSpent: costSpent.toFixed(2),
      topReviewed,
    };
  },
});

// Query to get review by ID (for displaying cached review)
export const getReviewById = query({
  args: { reviewId: v.id("contentReviewCache") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reviewId);
  },
});

// Mutation to clear a cached review (useful for re-testing with updated prompts)
export const clearCachedReview = mutation({
  args: {
    appleTrackId: v.optional(v.string()),
    appleAlbumId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.appleTrackId) {
      const cached = await ctx.db
        .query("contentReviewCache")
        .withIndex("by_track_id", (q) => q.eq("appleTrackId", args.appleTrackId))
        .first();
      if (cached) {
        await ctx.db.delete(cached._id);
        return { deleted: true, id: cached._id };
      }
    } else if (args.appleAlbumId) {
      const cached = await ctx.db
        .query("contentReviewCache")
        .withIndex("by_album_id", (q) => q.eq("appleAlbumId", args.appleAlbumId))
        .first();
      if (cached) {
        await ctx.db.delete(cached._id);
        return { deleted: true, id: cached._id };
      }
    }
    return { deleted: false };
  },
});

// Mutation to find and clear cached review by song/artist name
export const clearCachedReviewByName = mutation({
  args: {
    trackName: v.optional(v.string()),
    albumName: v.optional(v.string()),
    artistName: v.string(),
  },
  handler: async (ctx, args) => {
    const allCached = await ctx.db.query("contentReviewCache").collect();

    const matchingReviews = allCached.filter(cached => {
      if (args.trackName && cached.trackName) {
        const trackMatch = cached.trackName.toLowerCase() === args.trackName.toLowerCase();
        const artistMatch = cached.artistName.toLowerCase().includes(args.artistName.toLowerCase());
        return trackMatch && artistMatch;
      }
      if (args.albumName && cached.albumName) {
        const albumMatch = cached.albumName.toLowerCase() === args.albumName.toLowerCase();
        const artistMatch = cached.artistName.toLowerCase().includes(args.artistName.toLowerCase());
        return albumMatch && artistMatch;
      }
      return false;
    });

    let deletedCount = 0;
    const deletedReviews = [];

    for (const cached of matchingReviews) {
      deletedReviews.push({
        id: cached._id,
        trackName: cached.trackName,
        albumName: cached.albumName,
        artistName: cached.artistName,
        appleTrackId: cached.appleTrackId,
      });
      await ctx.db.delete(cached._id);
      deletedCount++;
    }

    return {
      deleted: deletedCount > 0,
      count: deletedCount,
      deletedReviews,
      message: deletedCount > 0
        ? `Cleared ${deletedCount} cached review(s)`
        : `No matching cached reviews found for "${args.trackName || args.albumName}" by "${args.artistName}"`
    };
  },
});

// Mutation to clear ALL cached reviews (useful after updating the prompt)
export const clearAllCache = mutation({
  args: {},
  handler: async (ctx) => {
    const allCached = await ctx.db.query("contentReviewCache").collect();
    let deletedCount = 0;

    for (const cached of allCached) {
      await ctx.db.delete(cached._id);
      deletedCount++;
    }

    return {
      deleted: true,
      count: deletedCount,
      message: `Cleared ${deletedCount} cached reviews`
    };
  },
});

// Query to get cached album overview
export const getCachedAlbumOverview = query({
  args: {
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("albumOverviewCache")
      .withIndex("by_album_id", (q) => q.eq("appleAlbumId", args.appleAlbumId))
      .first();
  },
});

// Query to get cached album overviews for multiple album IDs (for request list badges)
export const getCachedAlbumOverviews = query({
  args: {
    appleAlbumIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, { recommendation: string; suggestedAction: string }> = {};

    for (const albumId of args.appleAlbumIds) {
      const cached = await ctx.db
        .query("albumOverviewCache")
        .withIndex("by_album_id", (q) => q.eq("appleAlbumId", albumId))
        .first();

      if (cached) {
        results[albumId] = {
          recommendation: cached.recommendation,
          suggestedAction: cached.suggestedAction,
        };
      }
    }

    return results;
  },
});

// Mutation to save album overview to cache
export const saveAlbumOverviewToCache = mutation({
  args: {
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    trackCount: v.number(),
    overallImpression: v.string(),
    artistProfile: v.string(),
    recommendation: v.string(),
    suggestedAction: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("albumOverviewCache", {
      ...args,
      reviewedAt: Date.now(),
    });
  },
});

// Album Overview Review - reviews album as a whole without individual lyrics
export const reviewAlbumOverview = action({
  args: {
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    editorialNotes: v.optional(v.any()), // Apple Music editorial notes (short/standard)
    trackList: v.array(v.object({
      name: v.string(),
      artistName: v.optional(v.string()),
      contentRating: v.optional(v.union(v.string(), v.null())),
    })),
  },
  handler: async (ctx, args) => {
    // Check cache first
    const cached = await ctx.runQuery(api.ai.contentReview.getCachedAlbumOverview, {
      appleAlbumId: args.appleAlbumId,
    });

    if (cached) {
      console.log(`[Album Overview] Cache HIT for ${args.albumName}`);
      return {
        success: true,
        overview: {
          overallImpression: cached.overallImpression,
          artistProfile: cached.artistProfile,
          recommendation: cached.recommendation,
          suggestedAction: cached.suggestedAction,
        },
        albumName: cached.albumName,
        artistName: cached.artistName,
        trackCount: cached.trackCount,
        fromCache: true,
      };
    }

    console.log(`[Album Overview] Cache MISS for ${args.albumName} - calling OpenAI`);

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    console.log(`[Album Overview] Reviewing album: ${args.albumName} by ${args.artistName}`);
    console.log(`[Album Overview] Editorial notes received:`, args.editorialNotes);

    // Create track list summary with explicit flags
    const trackListText = args.trackList
      .map((track, idx) => {
        const explicitFlag = track.contentRating === 'explicit' ? ' [EXPLICIT]' :
                           track.contentRating === 'clean' ? ' [CLEAN]' : '';
        return `${idx + 1}. ${track.name}${explicitFlag}`;
      })
      .join('\n');

    // Count explicit tracks
    const explicitCount = args.trackList.filter(t => t.contentRating === 'explicit').length;

    // Format editorial notes if available
    const editorialText = args.editorialNotes
      ? `\n**Apple Music Description:** ${args.editorialNotes.short || args.editorialNotes.standard || 'Not available'}\n`
      : '';

    const prompt = `You are a content advisor helping parents quickly evaluate an album.

**Album:** "${args.albumName}" by ${args.artistName}
**Tracks:** ${args.trackList.length} total (${explicitCount} marked EXPLICIT)${editorialText}

${trackListText}

IMPORTANT: No explicit flag ≠ kid-friendly. Many songs have mature themes without explicit tags.
${args.editorialNotes ? 'Use the Apple Music description above to understand the album\'s themes and style.' : ''}

Provide a CONCISE assessment:

1. **Artist Profile** (2-3 sentences max): Based on YOUR KNOWLEDGE of this artist, what kind of content do they typically create? Target audience? Common themes in their music?

2. **Overall Impression** (2-3 sentences max): Analyzing the track titles AND your knowledge of this artist/album, what specific content concerns might parents have? Look for patterns in track titles (romance, nightlife, party references, etc.).

3. **Recommendation**:
   - ✅ "Likely Safe" - ONLY for children's artists (Disney, VeggieTales, Raffi, etc.)
   - ⚠️ "Review Recommended" - Some potential concerns worth checking
   - 🚨 "Detailed Review Required" - Artist known for mature content

4. **Suggested Action** (1-2 sentences): Brief WHY parents should/shouldn't review this album.

Return ONLY valid JSON (no markdown formatting) with this structure:
{
  "overallImpression": "string",
  "artistProfile": "string",
  "recommendation": "Likely Safe" | "Review Recommended" | "Detailed Review Required",
  "suggestedAction": "string"
}

CRITICAL GUIDELINES:
- Keep responses SHORT and SCANNABLE (2-3 sentences per section)
- "Likely Safe" = ONLY children's artists (Disney, VeggieTales, Raffi, etc.)
- Adult artists (pop, hip-hop, reggaeton, R&B, rock, country) = "Review Recommended" or "Detailed Review Required"
- Romance, partying, nightlife themes = NEVER "Likely Safe"
- When in doubt, recommend review`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a content advisor for parents with knowledge of music artists and their typical content. Be CAUTIOUS, CONCISE, and CLEAR. Keep each section to 2-3 sentences maximum. Use your knowledge about the specific artist and album to identify likely content concerns. Analyze track titles for clues (romance, nightlife, drinking, dancing, relationships, etc.). Most mainstream music is made for adults and should be reviewed. Only children's music gets 'Likely Safe'. When in doubt, recommend review. Always return valid JSON only, no markdown.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 800, // Reduced for shorter responses
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const completion = await response.json();
      const content = completion.choices[0].message.content;

      // Parse the JSON response
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      const overview = JSON.parse(cleanedContent);

      console.log(`[Album Overview] Complete. Recommendation: ${overview.recommendation}`);

      // Save to cache
      try {
        await ctx.runMutation(api.ai.contentReview.saveAlbumOverviewToCache, {
          appleAlbumId: args.appleAlbumId,
          albumName: args.albumName,
          artistName: args.artistName,
          trackCount: args.trackList.length,
          overallImpression: overview.overallImpression,
          artistProfile: overview.artistProfile,
          recommendation: overview.recommendation,
          suggestedAction: overview.suggestedAction,
        });
        console.log(`[Album Overview] Saved to cache: ${args.albumName}`);
      } catch (cacheError) {
        console.error("[Album Overview] Failed to save to cache:", cacheError);
        // Don't fail the request if caching fails
      }

      return {
        success: true,
        overview,
        albumName: args.albumName,
        artistName: args.artistName,
        trackCount: args.trackList.length,
      };
    } catch (error) {
      console.error("[Album Overview] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to review album",
      };
    }
  },
});

// Clean up bad "lyrics-cache-only" or "cached-lyrics-only" entries from contentReviewCache
// These are fake review entries created by the lyrics caching that pollute the AI review cache
export const cleanupBadCacheEntries = mutation({
  args: {},
  handler: async (ctx) => {
    const allCache = await ctx.db.query("contentReviewCache").collect();

    // Find entries with lyrics-only model markers - these are fake reviews
    const badEntries = allCache.filter(entry =>
      entry.openAiModel === "cached-lyrics-only" ||
      entry.openAiModel === "lyrics-cache-only"
    );

    let deleted = 0;
    for (const entry of badEntries) {
      await ctx.db.delete(entry._id);
      deleted++;
    }

    return {
      totalCacheEntries: allCache.length,
      badEntriesFound: badEntries.length,
      deleted,
    };
  },
});
