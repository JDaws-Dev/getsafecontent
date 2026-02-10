import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";

// Generate cache key from the search query
function generateSearchHash(query: string): string {
  const normalized = query.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Main action for AI-powered music search
// Takes natural language queries like "kid friendly pop hits from the 2000s"
// Returns structured search suggestions with Apple Music search terms
export const aiMusicSearch = action({
  args: {
    query: v.string(), // Natural language query like "kid friendly pop hits from the 2000s"
  },
  handler: async (ctx, args) => {
    const queryHash = generateSearchHash(args.query);

    // Check cache first
    const cached = await ctx.runQuery(api.ai.aiSearch.getCachedAISearch, {
      queryHash,
    });

    if (cached) {
      console.log("[AI Search] Cache hit! Reusing existing search results");
      await ctx.runMutation(api.ai.aiSearch.updateAISearchCacheStats, {
        cacheId: cached._id,
      });
      return {
        songs: cached.suggestions, // Cached data stored as suggestions, return as songs
        ageRange: cached.ageRange,
        era: cached.era,
        genres: cached.genres,
        fromCache: true,
        cacheHitCount: cached.timesReused + 1,
      };
    }

    console.log("[AI Search] Cache miss. Calling OpenAI API...");

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    const prompt = `You are a family-friendly music expert helping parents find appropriate songs for children.

User's search query: "${args.query}"

Suggest 15-25 SPECIFIC SONGS that match this request and are safe for children.

IMPORTANT - ONLY RETURN SONGS:
- Every suggestion must be a specific song title with its artist
- Include songs from a variety of different artists
- Mix well-known hits with hidden gems
- Consider the era/decade if mentioned in the query

CRITERIA FOR FAMILY-FRIENDLY SONGS:
- NO explicit lyrics, profanity, or adult themes
- NO songs about drugs, violence, or sexual content
- NO songs from artists primarily known for explicit content
- PREFER songs with positive, uplifting, or fun messages
- PREFER songs that kids will actually enjoy and want to listen to

Return ONLY valid JSON (no markdown, no code blocks) in exactly this format:
{
  "songs": [
    {
      "songName": "Exact Song Title",
      "artistName": "Artist Name",
      "searchQuery": "Song Title Artist Name",
      "reason": "Brief reason why this song fits the request (10 words max)",
      "year": "Release year or decade if known"
    }
  ],
  "ageRange": "estimated appropriate age range like '5-12' or 'all ages'",
  "era": "time period if specified in query, or null",
  "genres": ["inferred genres from the query"]
}`;

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
              content: "You are a family-friendly music expert. Only suggest music that is appropriate for children. Always return valid JSON only, with no markdown formatting.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
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
      // New format uses 'songs' array
      const songs = parsedResponse.songs || [];

      console.log(`[AI Search] Got ${songs.length} songs from OpenAI`);

      // Save to cache (store songs in suggestions field for backwards compatibility)
      await ctx.runMutation(api.ai.aiSearch.saveAISearchToCache, {
        queryHash,
        originalQuery: args.query,
        suggestions: songs, // Store songs in suggestions field
        searchTerms: [],
        ageRange: parsedResponse.ageRange,
        era: parsedResponse.era,
        genres: parsedResponse.genres,
      });

      return {
        songs,
        ageRange: parsedResponse.ageRange,
        era: parsedResponse.era,
        genres: parsedResponse.genres,
        fromCache: false,
        cacheHitCount: 0,
      };
    } catch (error) {
      console.error("[AI Search] Error:", error);
      throw new Error(`Failed to get AI search results: ${error}`);
    }
  },
});

// Query to get cached AI search
export const getCachedAISearch = query({
  args: { queryHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiSearchCache")
      .withIndex("by_query_hash", (q) => q.eq("queryHash", args.queryHash))
      .first();
  },
});

// Mutation to save AI search to cache
export const saveAISearchToCache = mutation({
  args: {
    queryHash: v.string(),
    originalQuery: v.string(),
    suggestions: v.array(v.any()),
    searchTerms: v.array(v.string()),
    ageRange: v.optional(v.string()),
    era: v.optional(v.any()),
    genres: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiSearchCache", {
      queryHash: args.queryHash,
      originalQuery: args.originalQuery,
      suggestions: args.suggestions,
      searchTerms: args.searchTerms,
      ageRange: args.ageRange,
      era: args.era,
      genres: args.genres,
      createdAt: Date.now(),
      timesReused: 0,
      lastUsedAt: Date.now(),
    });
  },
});

// Mutation to update cache stats
export const updateAISearchCacheStats = mutation({
  args: { cacheId: v.id("aiSearchCache") },
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
