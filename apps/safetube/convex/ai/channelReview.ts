import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";

// Review a YouTube channel based on its metadata and recent videos
export const reviewChannel = action({
  args: {
    channelId: v.string(),
    channelTitle: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    // Recent video titles to analyze
    recentVideoTitles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // CHECK CACHE FIRST
    const cached = await ctx.runQuery(api.ai.channelReview.getCachedReview, {
      channelId: args.channelId,
    });

    if (cached) {
      console.log(`[Channel Review] Cache hit! Reusing review for ${args.channelTitle}`);
      await ctx.runMutation(api.ai.channelReview.updateCacheStats, {
        cacheId: cached._id,
      });
      return {
        review: {
          summary: cached.summary,
          contentCategories: cached.contentCategories,
          concerns: cached.concerns,
          recommendation: cached.recommendation,
          ageRecommendation: cached.ageRecommendation,
          _id: cached._id,
        },
        fromCache: true,
        cacheHitCount: (cached.timesReused || 0) + 1,
      };
    }

    console.log(`[Channel Review] Cache miss. Reviewing ${args.channelTitle}...`);

    // CALL OPENAI
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    const videoListText = args.recentVideoTitles
      .slice(0, 20) // Limit to 20 most recent
      .map((title, idx) => `${idx + 1}. ${title}`)
      .join('\n');

    const prompt = `You are a content advisor helping parents evaluate YouTube channels for their children.

**Channel:** ${args.channelTitle}
**Subscribers:** ${args.subscriberCount || 'Unknown'}
**Description:** ${args.description || 'No description available'}

**Recent Videos:**
${videoListText}

Analyze this YouTube channel and provide a comprehensive assessment for parents:

1. **Summary** (2-3 sentences): What is this channel about? What type of content does it typically create?

2. **Content Categories**: List the main content types (e.g., "Gaming", "Educational", "Vlogs", "Music", "Comedy", etc.)

3. **Potential Concerns**: Identify any content that might concern parents. For each concern:
   - Category: (violence, language, scary-content, mature-themes, commercialism, screen-addiction, other)
   - Severity: (mild, moderate, significant)
   - Description: Brief explanation

   Look for:
   - Violence or aggression (even cartoon/game violence)
   - Inappropriate language or themes
   - Scary or disturbing content
   - Commercialism (excessive product promotion, gambling elements like loot boxes)
   - Content that may be addictive or encourage excessive screen time
   - Age-inappropriate relationship themes
   - Risky behavior encouragement

4. **Recommendation**:
   - "Recommended" - Clearly kid-friendly content (educational channels, PBS Kids, etc.)
   - "Review Videos First" - Mixed content, parent should preview before approving
   - "Not Recommended" - Contains significant mature content

5. **Age Recommendation**: Suggest an appropriate minimum age (e.g., "3+", "7+", "10+", "13+", "16+")

Return ONLY valid JSON (no markdown) in this format:
{
  "summary": "This channel is about...",
  "contentCategories": ["Gaming", "Entertainment"],
  "concerns": [
    {
      "category": "violence",
      "severity": "mild",
      "description": "Contains cartoon violence in gameplay"
    }
  ],
  "recommendation": "Review Videos First",
  "ageRecommendation": "7+"
}

If the channel appears to be clearly kid-friendly with no concerns, return an empty array for concerns.`;

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
              content: "You are a content advisor helping parents make informed decisions about YouTube channels for their children. Be thorough but fair - not all entertainment is harmful, but parents deserve to know about any potentially concerning content. Always return valid JSON only, no markdown formatting.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const completion = await response.json();
      const content = completion.choices[0].message.content;

      // Parse JSON response
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      const review = JSON.parse(cleanedContent);

      console.log(`[Channel Review] Review complete. Recommendation: ${review.recommendation}`);

      // SAVE TO CACHE
      const cacheId = await ctx.runMutation(api.ai.channelReview.saveToCache, {
        channelId: args.channelId,
        channelTitle: args.channelTitle,
        description: args.description,
        subscriberCount: args.subscriberCount,
        summary: review.summary,
        contentCategories: review.contentCategories || [],
        concerns: review.concerns || [],
        recommendation: review.recommendation,
        ageRecommendation: review.ageRecommendation,
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
      console.error("[Channel Review] Error:", error);
      throw new Error(`Failed to review channel: ${error}`);
    }
  },
});

// Query to get cached channel review
export const getCachedReview = query({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channelReviewCache")
      .withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId))
      .first();
  },
});

// Mutation to save to cache
export const saveToCache = mutation({
  args: {
    channelId: v.string(),
    channelTitle: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    summary: v.string(),
    contentCategories: v.array(v.string()),
    concerns: v.array(v.object({
      category: v.string(),
      severity: v.string(),
      description: v.string(),
    })),
    recommendation: v.string(),
    ageRecommendation: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("channelReviewCache", {
      ...args,
      reviewedAt: Date.now(),
      timesReused: 0,
      lastAccessedAt: Date.now(),
    });
  },
});

// Mutation to update cache stats
export const updateCacheStats = mutation({
  args: { cacheId: v.id("channelReviewCache") },
  handler: async (ctx, args) => {
    const cache = await ctx.db.get(args.cacheId);
    if (cache) {
      await ctx.db.patch(args.cacheId, {
        timesReused: (cache.timesReused || 0) + 1,
        lastAccessedAt: Date.now(),
      });
    }
  },
});

// Query to get cache statistics
export const getCacheStats = query({
  handler: async (ctx) => {
    const allCached = await ctx.db.query("channelReviewCache").collect();

    const totalCacheHits = allCached.reduce((sum, cache) => sum + (cache.timesReused || 0), 0);
    const totalApiCalls = allCached.length;
    const totalRequests = totalApiCalls + totalCacheHits;
    const cacheHitRate = totalRequests > 0 ? (totalCacheHits / totalRequests) * 100 : 0;

    // Estimate cost savings (gpt-4o-mini ~$0.003 per channel review)
    const costPerCall = 0.003;
    const costSaved = totalCacheHits * costPerCall;
    const costSpent = totalApiCalls * costPerCall;

    return {
      totalCacheEntries: allCached.length,
      totalCacheHits,
      totalApiCalls,
      totalRequests,
      cacheHitRate: cacheHitRate.toFixed(1),
      costSaved: costSaved.toFixed(3),
      costSpent: costSpent.toFixed(3),
    };
  },
});

// Mutation to clear a cached review
export const clearCachedReview = mutation({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("channelReviewCache")
      .withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId))
      .first();

    if (cached) {
      await ctx.db.delete(cached._id);
      return { deleted: true, id: cached._id };
    }
    return { deleted: false };
  },
});

// Mutation to clear all cached reviews
export const clearAllCache = mutation({
  args: {},
  handler: async (ctx) => {
    const allCached = await ctx.db.query("channelReviewCache").collect();
    let deletedCount = 0;

    for (const cached of allCached) {
      await ctx.db.delete(cached._id);
      deletedCount++;
    }

    return {
      deleted: true,
      count: deletedCount,
    };
  },
});
