import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Log a blocked search attempt when a kid searches for inappropriate content.
 * This is called from the client-side when the content filter detects a blocked keyword.
 */
export const logBlockedSearch = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    blockedKeyword: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the kid profile to find the parent userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      throw new Error("Kid profile not found");
    }

    // Insert the blocked search record
    await ctx.db.insert("blockedSearches", {
      userId: kidProfile.userId,
      kidProfileId: args.kidProfileId,
      query: args.query,
      blockedKeyword: args.blockedKeyword,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get blocked searches for a specific user (parent), optionally filtered by kid.
 */
export const getBlockedSearches = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    kidProfileId: v.optional(v.id("kidProfiles")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get all blocked searches for this user, ordered by most recent
    let searches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_user_recent", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Filter by kid if specified
    if (args.kidProfileId) {
      searches = searches.filter((s) => s.kidProfileId === args.kidProfileId);
    }

    // Get kid profiles for display
    const kidProfileIds = [...new Set(searches.map((s) => s.kidProfileId))];
    const kidProfiles = await Promise.all(
      kidProfileIds.map((id) => ctx.db.get(id))
    );
    const kidProfileMap = new Map(
      kidProfiles.filter(Boolean).map((k) => [k!._id, k])
    );

    // Add kid info to each search
    return searches.map((search) => {
      const kid = kidProfileMap.get(search.kidProfileId);
      return {
        ...search,
        kidName: kid?.name || "Unknown",
        kidColor: kid?.color || "gray",
        kidIcon: kid?.name?.charAt(0).toUpperCase() || "?",
      };
    });
  },
});

/**
 * Get the count of blocked searches for today (for dashboard alert).
 */
export const getTodayBlockedCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();

    const searches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_user_recent", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), startTimestamp))
      .collect();

    return searches.length;
  },
});

/**
 * Get recent blocked searches for a user (for notifications/alerts).
 */
export const getRecentBlockedSearches = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const searches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_user_recent", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Get kid profiles for display
    const kidProfileIds = [...new Set(searches.map((s) => s.kidProfileId))];
    const kidProfiles = await Promise.all(
      kidProfileIds.map((id) => ctx.db.get(id))
    );
    const kidProfileMap = new Map(
      kidProfiles.filter(Boolean).map((k) => [k!._id, k])
    );

    return searches.map((search) => {
      const kid = kidProfileMap.get(search.kidProfileId);
      return {
        ...search,
        kidName: kid?.name || "Unknown",
        kidColor: kid?.color || "gray",
      };
    });
  },
});
