import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all playlists for a kid
export const getPlaylists = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const playlists = await ctx.db
      .query("kidPlaylists")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // Get video count and first video thumbnail for each playlist
    const playlistsWithMeta = await Promise.all(
      playlists.map(async (playlist) => {
        const videos = await ctx.db
          .query("kidPlaylistVideos")
          .withIndex("by_playlist_order", (q) => q.eq("playlistId", playlist._id))
          .collect();

        return {
          ...playlist,
          videoCount: videos.length,
          coverThumbnail: videos[0]?.thumbnailUrl || null,
        };
      })
    );

    return playlistsWithMeta;
  },
});

// Get videos in a specific playlist
export const getPlaylistVideos = query({
  args: { playlistId: v.id("kidPlaylists") },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("kidPlaylistVideos")
      .withIndex("by_playlist_order", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    // Sort by sortOrder
    return videos.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Create a new playlist
export const createPlaylist = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    name: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const playlistId = await ctx.db.insert("kidPlaylists", {
      kidProfileId: args.kidProfileId,
      name: args.name,
      emoji: args.emoji || "📺",
      createdAt: now,
      updatedAt: now,
    });

    return playlistId;
  },
});

// Rename a playlist
export const renamePlaylist = mutation({
  args: {
    playlistId: v.id("kidPlaylists"),
    name: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playlistId, {
      name: args.name,
      emoji: args.emoji,
      updatedAt: Date.now(),
    });
  },
});

// Delete a playlist and all its videos
export const deletePlaylist = mutation({
  args: { playlistId: v.id("kidPlaylists") },
  handler: async (ctx, args) => {
    // Delete all videos in playlist
    const videos = await ctx.db
      .query("kidPlaylistVideos")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    for (const video of videos) {
      await ctx.db.delete(video._id);
    }

    // Delete the playlist
    await ctx.db.delete(args.playlistId);
  },
});

// Add a video to a playlist
export const addVideoToPlaylist = mutation({
  args: {
    playlistId: v.id("kidPlaylists"),
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelTitle: v.string(),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if video already in playlist
    const existing = await ctx.db
      .query("kidPlaylistVideos")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .filter((q) => q.eq(q.field("videoId"), args.videoId))
      .first();

    if (existing) {
      return existing._id; // Already in playlist
    }

    // Get current max sortOrder
    const videos = await ctx.db
      .query("kidPlaylistVideos")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    const maxOrder = videos.length > 0
      ? Math.max(...videos.map(v => v.sortOrder))
      : -1;

    const videoId = await ctx.db.insert("kidPlaylistVideos", {
      playlistId: args.playlistId,
      kidProfileId: args.kidProfileId,
      videoId: args.videoId,
      title: args.title,
      thumbnailUrl: args.thumbnailUrl,
      channelTitle: args.channelTitle,
      durationSeconds: args.durationSeconds,
      sortOrder: maxOrder + 1,
      addedAt: Date.now(),
    });

    // Update playlist's updatedAt
    await ctx.db.patch(args.playlistId, { updatedAt: Date.now() });

    return videoId;
  },
});

// Remove a video from a playlist
export const removeVideoFromPlaylist = mutation({
  args: {
    playlistId: v.id("kidPlaylists"),
    videoId: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("kidPlaylistVideos")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .filter((q) => q.eq(q.field("videoId"), args.videoId))
      .first();

    if (video) {
      await ctx.db.delete(video._id);
      await ctx.db.patch(args.playlistId, { updatedAt: Date.now() });
    }
  },
});

// Check if a video is in any of the kid's playlists
export const getVideoPlaylistStatus = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
  },
  handler: async (ctx, args) => {
    const playlistVideos = await ctx.db
      .query("kidPlaylistVideos")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.eq(q.field("videoId"), args.videoId))
      .collect();

    return playlistVideos.map(pv => pv.playlistId);
  },
});

// Move video within playlist (reorder)
export const reorderPlaylistVideo = mutation({
  args: {
    playlistId: v.id("kidPlaylists"),
    videoId: v.string(),
    newSortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("kidPlaylistVideos")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    const movingVideo = videos.find(v => v.videoId === args.videoId);
    if (!movingVideo) return;

    const oldOrder = movingVideo.sortOrder;
    const newOrder = args.newSortOrder;

    // Update sort orders for affected videos
    for (const video of videos) {
      if (video.videoId === args.videoId) {
        await ctx.db.patch(video._id, { sortOrder: newOrder });
      } else if (oldOrder < newOrder) {
        // Moving down - shift videos in between up
        if (video.sortOrder > oldOrder && video.sortOrder <= newOrder) {
          await ctx.db.patch(video._id, { sortOrder: video.sortOrder - 1 });
        }
      } else {
        // Moving up - shift videos in between down
        if (video.sortOrder >= newOrder && video.sortOrder < oldOrder) {
          await ctx.db.patch(video._id, { sortOrder: video.sortOrder + 1 });
        }
      }
    }

    await ctx.db.patch(args.playlistId, { updatedAt: Date.now() });
  },
});
