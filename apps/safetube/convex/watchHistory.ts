import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Record a video watch
export const recordWatch = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelTitle: v.string(),
    watchDurationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const watchId = await ctx.db.insert("watchHistory", {
      kidProfileId: args.kidProfileId,
      videoId: args.videoId,
      title: args.title,
      thumbnailUrl: args.thumbnailUrl,
      channelTitle: args.channelTitle,
      watchedAt: Date.now(),
      watchDurationSeconds: args.watchDurationSeconds,
    });

    return watchId;
  },
});

// Update watch duration (called when video ends or is stopped)
export const updateWatchDuration = mutation({
  args: {
    watchId: v.id("watchHistory"),
    watchDurationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.watchId, {
      watchDurationSeconds: args.watchDurationSeconds,
    });
  },
});

// Get recent watch history for a kid
export const getWatchHistory = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(limit);

    return history;
  },
});

// Get watch history for all kids of a user (for parent dashboard)
export const getWatchHistoryForUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    // Get all kid profiles for this user
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (kidProfiles.length === 0) return [];

    // Get watch history for each kid
    const allHistory = [];
    for (const profile of kidProfiles) {
      const history = await ctx.db
        .query("watchHistory")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", profile._id))
        .order("desc")
        .take(Math.ceil((limit * 2) / kidProfiles.length)); // Fetch extra to account for filtered items

      // Add kid profile info to each entry, filtering out "Unknown Channel" entries
      allHistory.push(
        ...history
          .filter((h) => h.channelTitle !== "Unknown Channel")
          .map((h) => ({
            ...h,
            kidName: profile.name,
            kidIcon: profile.icon,
            kidColor: profile.color,
          }))
      );
    }

    // Sort all by watchedAt and limit
    return allHistory
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, limit);
  },
});

// Get watch stats for a kid (total watch time, most watched, etc.)
export const getWatchStats = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    daysBack: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7;
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("watchedAt"), cutoffTime))
      .collect();

    // Calculate stats
    const totalWatchTimeSeconds = history.reduce(
      (sum, h) => sum + (h.watchDurationSeconds || 0),
      0
    );
    const totalVideosWatched = history.length;

    // Most watched videos (by count)
    const videoWatchCounts: Record<string, { count: number; title: string; thumbnailUrl: string; channelTitle: string }> = {};
    for (const h of history) {
      if (!videoWatchCounts[h.videoId]) {
        videoWatchCounts[h.videoId] = {
          count: 0,
          title: h.title,
          thumbnailUrl: h.thumbnailUrl,
          channelTitle: h.channelTitle,
        };
      }
      videoWatchCounts[h.videoId].count++;
    }

    const mostWatched = Object.entries(videoWatchCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([videoId, data]) => ({
        videoId,
        ...data,
      }));

    // Watch time by day
    const watchTimeByDay: Record<string, number> = {};
    for (const h of history) {
      const day = new Date(h.watchedAt).toDateString();
      watchTimeByDay[day] = (watchTimeByDay[day] || 0) + (h.watchDurationSeconds || 0);
    }

    return {
      totalWatchTimeSeconds,
      totalVideosWatched,
      mostWatched,
      watchTimeByDay,
      daysBack,
    };
  },
});

// Get today's watch time for a kid (for time limits)
export const getTodayWatchTime = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get start of today (midnight local time - we use UTC for simplicity)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("watchedAt"), startOfToday))
      .collect();

    const totalSeconds = history.reduce(
      (sum, h) => sum + (h.watchDurationSeconds || 0),
      0
    );

    return {
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      videosWatched: history.length,
    };
  },
});

// Get recent watch history across all kids (for Kids Dashboard overview)
export const getRecentHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get all kid profiles for this user
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (kidProfiles.length === 0) return [];

    // Collect all history across kids
    const allHistory = [];
    for (const profile of kidProfiles) {
      const history = await ctx.db
        .query("watchHistory")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", profile._id))
        .order("desc")
        .take(limit * 2); // Fetch extra to account for filtered items

      // Filter out "Unknown Channel" entries
      allHistory.push(...history.filter(h => h.channelTitle !== "Unknown Channel"));
    }

    // Sort by watchedAt and limit
    return allHistory
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, limit);
  },
});

// Remove watch history entries with "Unknown Channel" (cleanup bad data)
export const removeUnknownChannelHistory = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.eq(q.field("channelTitle"), "Unknown Channel"))
      .collect();

    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    return { deleted: history.length };
  },
});

// Remove watch history for a specific video (called when video is removed from library)
export const removeVideoFromHistory = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all watch history entries for this video
    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.eq(q.field("videoId"), args.videoId))
      .collect();

    // Delete them all
    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    return { deleted: history.length };
  },
});

// Clear old watch history (optional - for cleanup)
export const clearOldHistory = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    daysToKeep: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.daysToKeep * 24 * 60 * 60 * 1000;

    const oldHistory = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.lt(q.field("watchedAt"), cutoffTime))
      .collect();

    for (const h of oldHistory) {
      await ctx.db.delete(h._id);
    }

    return { deleted: oldHistory.length };
  },
});
