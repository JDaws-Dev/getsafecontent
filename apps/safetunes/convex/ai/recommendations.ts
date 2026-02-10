import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";

// Generate cache key from request parameters
function generateQueryHash(params: {
  kidAge?: number;
  musicPreferences: string;
  targetGenres?: string[];
  restrictions?: string;
}): string {
  // Normalize parameters for consistent hashing
  const normalized = {
    kidAge: params.kidAge || 0,
    musicPreferences: params.musicPreferences.toLowerCase().trim(),
    targetGenres: params.targetGenres?.sort() || [],
    restrictions: params.restrictions?.toLowerCase().trim() || "",
  };

  // Create a simple hash from normalized JSON
  const str = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Main action to get AI recommendations (with caching)
export const getAiRecommendations = action({
  args: {
    kidAge: v.optional(v.number()),
    musicPreferences: v.string(),
    targetGenres: v.optional(v.array(v.string())),
    restrictions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CHECK CACHE FIRST
    const queryHash = generateQueryHash(args);
    const cached = await ctx.runQuery(api.ai.recommendations.getCachedRecommendation, {
      queryHash,
    });

    if (cached) {
      console.log("[AI Recommendations] Cache hit! Reusing existing recommendations");
      // UPDATE CACHE STATS
      await ctx.runMutation(api.ai.recommendations.updateCacheStats, {
        cacheId: cached._id,
      });
      return {
        recommendations: cached.recommendations,
        fromCache: true,
        cacheHitCount: cached.timesReused + 1,
      };
    }

    console.log("[AI Recommendations] Cache miss. Calling OpenAI API...");

    // NO CACHE - CALL OPENAI
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    const prompt = `You are a family-friendly music recommendation expert helping parents find appropriate music for their children.

Kid's Age: ${args.kidAge || 'Not specified'}
Music Preferences: ${args.musicPreferences}
Target Genres: ${args.targetGenres?.join(', ') || 'Any appropriate genres'}
Restrictions: ${args.restrictions || 'General family-friendly content'}

Recommend 10-15 artists, albums, or genres that would be appropriate for this child.
Focus on clean, positive content. Avoid artists known for explicit lyrics, mature themes, or inappropriate content.

Important guidelines:
- Only recommend artists/albums with family-friendly content
- Consider the child's age when making recommendations
- Prioritize educational, positive, or age-appropriate themes
- Avoid artists known for explicit content, even if they have some clean songs
- Provide variety across different music styles within the safe criteria

Return ONLY valid JSON (no markdown, no code blocks) in exactly this format:
{
  "recommendations": [
    {
      "type": "artist",
      "name": "Artist Name",
      "reason": "Why this is appropriate and matches preferences",
      "ageAppropriate": true,
      "genres": ["Pop", "Kids"]
    }
  ]
}`;

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
              content: "You are a family-friendly music recommendation expert. Always return valid JSON only, with no markdown formatting.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
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

      const parsedResponse = JSON.parse(cleanedContent);
      const recommendations = parsedResponse.recommendations || [];

      console.log(`[AI Recommendations] Got ${recommendations.length} recommendations from OpenAI`);

      // SAVE TO CACHE
      await ctx.runMutation(api.ai.recommendations.saveToCache, {
        queryHash,
        kidAge: args.kidAge,
        musicPreferences: args.musicPreferences,
        targetGenres: args.targetGenres,
        restrictions: args.restrictions,
        recommendations: recommendations,
        openAiModel: "gpt-4o-mini",
      });

      return {
        recommendations: recommendations,
        fromCache: false,
        cacheHitCount: 0,
      };
    } catch (error) {
      console.error("[AI Recommendations] Error:", error);
      throw new Error(`Failed to get AI recommendations: ${error}`);
    }
  },
});

// Query to get cached recommendation
export const getCachedRecommendation = query({
  args: { queryHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiRecommendationCache")
      .withIndex("by_query_hash", (q) => q.eq("queryHash", args.queryHash))
      .first();
  },
});

// Mutation to save to cache
export const saveToCache = mutation({
  args: {
    queryHash: v.string(),
    kidAge: v.optional(v.number()),
    musicPreferences: v.string(),
    targetGenres: v.optional(v.array(v.string())),
    restrictions: v.optional(v.string()),
    recommendations: v.array(v.any()),
    openAiModel: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiRecommendationCache", {
      queryHash: args.queryHash,
      kidAge: args.kidAge,
      musicPreferences: args.musicPreferences,
      targetGenres: args.targetGenres,
      restrictions: args.restrictions,
      recommendations: args.recommendations,
      createdAt: Date.now(),
      openAiModel: args.openAiModel,
      timesReused: 0,
      lastUsedAt: Date.now(),
    });
  },
});

// Mutation to update cache stats
export const updateCacheStats = mutation({
  args: { cacheId: v.id("aiRecommendationCache") },
  handler: async (ctx, args) => {
    const cache = await ctx.db.get(args.cacheId);
    if (cache) {
      await ctx.db.patch(args.cacheId, {
        timesReused: cache.timesReused + 1,
        lastUsedAt: Date.now(),
      });
    }
  },
});

// Query to get cache statistics (for admin dashboard)
export const getCacheStats = query({
  handler: async (ctx) => {
    const allCached = await ctx.db.query("aiRecommendationCache").collect();

    const totalCacheHits = allCached.reduce((sum, cache) => sum + cache.timesReused, 0);
    const totalApiCalls = allCached.length;
    const totalRequests = totalApiCalls + totalCacheHits;
    const cacheHitRate = totalRequests > 0 ? (totalCacheHits / totalRequests) * 100 : 0;

    // Estimate cost savings (assuming $0.002 per API call for gpt-4o-mini)
    const costPerCall = 0.002;
    const costSaved = totalCacheHits * costPerCall;
    const costSpent = totalApiCalls * costPerCall;

    return {
      totalCacheEntries: allCached.length,
      totalCacheHits,
      totalApiCalls,
      totalRequests,
      cacheHitRate: cacheHitRate.toFixed(1),
      costSaved: costSaved.toFixed(2),
      costSpent: costSpent.toFixed(2),
      mostReusedCache: allCached.sort((a, b) => b.timesReused - a.timesReused)[0],
    };
  },
});
