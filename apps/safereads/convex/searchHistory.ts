import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/** List recent unique searches for a user, newest first. */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    count: v.optional(v.number()),
  },
  handler: async (ctx, { userId, count }) => {
    const limit = count ?? 4;
    // Fetch more than needed to account for duplicates
    const all = await ctx.db
      .query("searchHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    // Deduplicate by query (case-insensitive), keeping most recent
    const seen = new Set<string>();
    const unique = [];
    for (const entry of all) {
      const normalized = entry.query.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(entry);
        if (unique.length >= limit) break;
      }
    }
    return unique;
  },
});

/** Record a search. */
export const record = mutation({
  args: {
    userId: v.id("users"),
    query: v.string(),
    resultCount: v.number(),
  },
  handler: async (ctx, { userId, query: searchQuery, resultCount }) => {
    return await ctx.db.insert("searchHistory", {
      userId,
      query: searchQuery,
      resultCount,
    });
  },
});

/** Clear all search history for a user. */
export const clearAll = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const entries = await ctx.db
      .query("searchHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    await Promise.all(entries.map((entry) => ctx.db.delete(entry._id)));
  },
});
