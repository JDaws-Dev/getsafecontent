import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all approved videos for a kid
export const getApprovedVideos = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("approvedVideos")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    return videos.sort((a, b) => b.addedAt - a.addedAt);
  },
});

// Get approved videos from a specific channel
export const getApprovedVideosByChannel = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("approvedVideos")
      .withIndex("by_channel", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("channelId", args.channelId)
      )
      .collect();

    return videos.sort((a, b) => b.addedAt - a.addedAt);
  },
});

// Check if a video is approved for a kid
export const isVideoApproved = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("approvedVideos")
      .withIndex("by_video", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("videoId", args.videoId)
      )
      .first();

    return !!video;
  },
});

// Add a single video to approved list
export const addApprovedVideo = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelId: v.string(),
    channelTitle: v.string(),
    duration: v.string(),
    durationSeconds: v.number(),
    madeForKids: v.boolean(),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already approved
    const existing = await ctx.db
      .query("approvedVideos")
      .withIndex("by_video", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("videoId", args.videoId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new
    const videoDocId = await ctx.db.insert("approvedVideos", {
      userId: args.userId,
      kidProfileId: args.kidProfileId,
      videoId: args.videoId,
      title: args.title,
      thumbnailUrl: args.thumbnailUrl,
      channelId: args.channelId,
      channelTitle: args.channelTitle,
      duration: args.duration,
      durationSeconds: args.durationSeconds,
      madeForKids: args.madeForKids,
      publishedAt: args.publishedAt,
      addedAt: Date.now(),
    });

    return videoDocId;
  },
});

// Add multiple videos at once (e.g., when adding a whole channel)
export const addApprovedVideos = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    videos: v.array(
      v.object({
        videoId: v.string(),
        title: v.string(),
        thumbnailUrl: v.string(),
        channelId: v.string(),
        channelTitle: v.string(),
        duration: v.string(),
        durationSeconds: v.number(),
        madeForKids: v.boolean(),
        publishedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const video of args.videos) {
      // Check if already approved
      const existing = await ctx.db
        .query("approvedVideos")
        .withIndex("by_video", (q) =>
          q.eq("kidProfileId", args.kidProfileId).eq("videoId", video.videoId)
        )
        .first();

      if (existing) {
        results.push(existing._id);
        continue;
      }

      // Create new
      const videoDocId = await ctx.db.insert("approvedVideos", {
        userId: args.userId,
        kidProfileId: args.kidProfileId,
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        duration: video.duration,
        durationSeconds: video.durationSeconds,
        madeForKids: video.madeForKids,
        publishedAt: video.publishedAt,
        addedAt: Date.now(),
      });

      results.push(videoDocId);
    }

    return results;
  },
});

// Add a video to multiple kid profiles at once
export const addVideoToMultipleKids = mutation({
  args: {
    userId: v.id("users"),
    kidProfileIds: v.array(v.id("kidProfiles")),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelId: v.string(),
    channelTitle: v.string(),
    duration: v.string(),
    durationSeconds: v.number(),
    madeForKids: v.boolean(),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const kidProfileId of args.kidProfileIds) {
      // Check if already approved
      const existing = await ctx.db
        .query("approvedVideos")
        .withIndex("by_video", (q) =>
          q.eq("kidProfileId", kidProfileId).eq("videoId", args.videoId)
        )
        .first();

      if (existing) {
        results.push(existing._id);
        continue;
      }

      // Create new
      const videoDocId = await ctx.db.insert("approvedVideos", {
        userId: args.userId,
        kidProfileId,
        videoId: args.videoId,
        title: args.title,
        thumbnailUrl: args.thumbnailUrl,
        channelId: args.channelId,
        channelTitle: args.channelTitle,
        duration: args.duration,
        durationSeconds: args.durationSeconds,
        madeForKids: args.madeForKids,
        isShort: args.durationSeconds <= 180, // YouTube Shorts are ≤3 minutes (180 seconds)
        publishedAt: args.publishedAt,
        addedAt: Date.now(),
      });

      results.push(videoDocId);
    }

    return results;
  },
});

// Remove a video from approved list (also clears watch history for that video)
export const removeApprovedVideo = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("approvedVideos")
      .withIndex("by_video", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("videoId", args.videoId)
      )
      .first();

    if (video) {
      await ctx.db.delete(video._id);
    }

    // Also remove from watch history so it doesn't show in "Recently Watched"
    const watchHistory = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.eq(q.field("videoId"), args.videoId))
      .collect();

    for (const h of watchHistory) {
      await ctx.db.delete(h._id);
    }
  },
});

// Clear ALL approved videos for a user (admin utility)
export const clearAllApprovedVideosForUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all approved videos for this user
    const videos = await ctx.db
      .query("approvedVideos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Delete them all
    let deleted = 0;
    for (const video of videos) {
      await ctx.db.delete(video._id);
      deleted++;
    }

    return { deleted };
  },
});

// Get all playable content for a kid (from both channels and individual videos)
// This is what the kid's player will use
export const getPlayableContent = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get all approved channels (full channel approvals)
    const fullChannels = await ctx.db
      .query("approvedChannels")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // Get all approved videos
    const videos = await ctx.db
      .query("approvedVideos")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // Get approved channel IDs for quick lookup
    const fullChannelIds = new Set(fullChannels.map((c) => c.channelId));

    // Build partial channels from videos that are NOT from fully approved channels
    const partialChannelMap: Record<string, {
      channelId: string;
      channelTitle: string;
      thumbnailUrl: string;
      videoCount: number;
      addedAt: number;
      isPartial: boolean;
    }> = {};

    for (const video of videos) {
      // Skip videos from fully approved channels
      if (fullChannelIds.has(video.channelId)) continue;

      if (!partialChannelMap[video.channelId]) {
        partialChannelMap[video.channelId] = {
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl, // Use first video's thumbnail
          videoCount: 0,
          addedAt: video.addedAt,
          isPartial: true,
        };
      }
      partialChannelMap[video.channelId].videoCount++;
      // Use the most recent addedAt
      if (video.addedAt > partialChannelMap[video.channelId].addedAt) {
        partialChannelMap[video.channelId].addedAt = video.addedAt;
      }
    }

    const partialChannels = Object.values(partialChannelMap);

    // Combine full and partial channels, marking full ones as isPartial: false
    const allChannels = [
      ...fullChannels.map(c => ({ ...c, isPartial: false })),
      ...partialChannels,
    ].sort((a, b) => b.addedAt - a.addedAt);

    return {
      channels: allChannels,
      videos: videos.sort((a, b) => b.addedAt - a.addedAt),
      approvedChannelIds: Array.from(fullChannelIds),
    };
  },
});
