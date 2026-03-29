import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * Internal mutation to insert a search history record
 */
export const insertSearchHistory = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    results: v.string(),
    aiSummary: v.string(),
    flagged: v.boolean(),
    flagReason: v.optional(v.string()),
    searchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("searchHistory", {
      kidProfileId: args.kidProfileId,
      query: args.query,
      results: args.results,
      aiSummary: args.aiSummary,
      flagged: args.flagged,
      flagReason: args.flagReason,
      searchedAt: args.searchedAt,
    });
  },
});

/**
 * Internal mutation to insert a blocked search record
 */
export const insertBlockedSearch = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    blockedReason: v.string(),
    searchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("blockedSearches", {
      kidProfileId: args.kidProfileId,
      query: args.query,
      blockedReason: args.blockedReason,
      searchedAt: args.searchedAt,
    });
  },
});

/**
 * Get search settings for a user
 */
export const getSearchSettingsInternal = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("searchSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get recent search history for a kid
 */
export const getSearchHistory = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = args.limit || 50;

    const history = await ctx.db
      .query("searchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(maxResults);

    return history.map((h) => ({
      ...h,
      results: undefined,
      resultCount: JSON.parse(h.results || "[]").length,
    }));
  },
});

/**
 * Get blocked searches for all kids of a user
 */
export const getBlockedSearches = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const allBlocked = [];
    for (const profile of profiles) {
      const blocked = await ctx.db
        .query("blockedSearches")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
        .order("desc")
        .take(50);

      for (const b of blocked) {
        allBlocked.push({
          ...b,
          kidName: profile.name,
          kidIcon: profile.icon,
        });
      }
    }

    allBlocked.sort((a, b) => b.searchedAt - a.searchedAt);
    return allBlocked;
  },
});

/**
 * Get all search history for all kids of a user (for parent dashboard)
 */
export const getAllSearchHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const allHistory = [];
    for (const profile of profiles) {
      const history = await ctx.db
        .query("searchHistory")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", profile._id))
        .order("desc")
        .take(50);

      for (const h of history) {
        allHistory.push({
          ...h,
          results: undefined,
          kidName: profile.name,
          kidIcon: profile.icon,
          kidColor: profile.color,
        });
      }
    }

    allHistory.sort((a, b) => b.searchedAt - a.searchedAt);
    return allHistory.slice(0, 100);
  },
});
