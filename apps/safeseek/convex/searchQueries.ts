import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { requireOwnerSoft } from "./identity";

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
    intentCategory: v.optional(v.string()),
    intentConfidence: v.optional(v.number()),
    intentRationale: v.optional(v.string()),
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
      intentCategory: args.intentCategory,
      intentConfidence: args.intentConfidence,
      intentRationale: args.intentRationale,
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
    intentCategory: v.optional(v.string()),
    intentConfidence: v.optional(v.number()),
    intentRationale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("blockedSearches", {
      kidProfileId: args.kidProfileId,
      query: args.query,
      blockedReason: args.blockedReason,
      searchedAt: args.searchedAt,
      intentCategory: args.intentCategory,
      intentConfidence: args.intentConfidence,
      intentRationale: args.intentRationale,
    });
  },
});

/**
 * Internal mutation: log a concern alert (ED, self-harm) for parent escalation.
 * Dedupes on (kidProfileId, query, category) within 24h so retries don't
 * email parents repeatedly.
 */
export const recordConcernAlert = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    query: v.string(),
    category: v.string(),
    confidence: v.number(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("kidConcernAlerts")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();
    const dup = recent.find(
      (r) =>
        r.query.toLowerCase().trim() === args.query.toLowerCase().trim() &&
        r.category === args.category
    );
    if (dup) return dup._id;

    return await ctx.db.insert("kidConcernAlerts", {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      query: args.query,
      category: args.category,
      confidence: args.confidence,
      rationale: args.rationale,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal: recent queries for the loop detector. Lightweight — no JSON
 * parsing, just (query, searchedAt). Includes both successful + blocked
 * searches because the loop pattern crosses the block boundary (kid keeps
 * trying different spellings against the blocker).
 */
export const getRecentQueriesForLoopCheck = internalQuery({
  args: {
    kidProfileId: v.id("kidProfiles"),
    sinceMs: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.sinceMs;
    const history = await ctx.db
      .query("searchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("searchedAt"), cutoff))
      .collect();
    const blocked = await ctx.db
      .query("blockedSearches")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("searchedAt"), cutoff))
      .collect();
    return [...history, ...blocked].map((r) => ({
      query: r.query,
      searchedAt: r.searchedAt,
    }));
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
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "searchQueries.getBlockedSearches");
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
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "searchQueries.getAllSearchHistory");
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
