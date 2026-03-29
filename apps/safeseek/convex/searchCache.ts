import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "how", "why",
  "who", "where", "when", "do", "does", "did", "can", "could", "will",
  "would", "should", "tell", "me", "about", "please",
]);

/**
 * Normalize a search query for cache lookups:
 * lowercase, trim, remove punctuation, remove stop words, sort words alphabetically.
 */
export function normalizeQuery(query: string): string {
  const cleaned = query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
    .sort()
    .join(" ");
  return cleaned;
}

/**
 * Check if a cached response exists for this query+ageGroup+strictness.
 * Returns the cached response string if valid, null otherwise.
 */
export const checkCache = query({
  args: {
    normalizedQuery: v.string(),
    ageGroup: v.string(),
    strictness: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("searchCache")
      .withIndex("by_query", (q) =>
        q
          .eq("normalizedQuery", args.normalizedQuery)
          .eq("ageGroup", args.ageGroup)
          .eq("strictness", args.strictness)
      )
      .first();

    if (!cached) return null;
    if (cached.expiresAt < Date.now()) return null;

    // Note: queries cannot mutate, so timesReused increment happens via a
    // separate mutation call from the action that uses the cache hit.
    return {
      response: cached.response,
      cacheId: cached._id,
    };
  },
});

/**
 * Increment the timesReused counter for a cache entry.
 */
export const incrementCacheReuse = internalMutation({
  args: { cacheId: v.id("searchCache") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.cacheId);
    if (entry) {
      await ctx.db.patch(args.cacheId, {
        timesReused: entry.timesReused + 1,
      });
    }
  },
});

/**
 * Write a new cache entry.
 */
export const writeCache = internalMutation({
  args: {
    normalizedQuery: v.string(),
    ageGroup: v.string(),
    strictness: v.string(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("searchCache", {
      normalizedQuery: args.normalizedQuery,
      ageGroup: args.ageGroup,
      strictness: args.strictness,
      response: args.response,
      cachedAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      timesReused: 0,
    });
  },
});

/**
 * Delete expired cache entries (up to 100 per run).
 */
export const cleanExpiredCache = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("searchCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(100);

    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: expired.length };
  },
});
