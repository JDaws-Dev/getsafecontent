import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Add a playlist to Discover (featured playlists)
export const addPlaylistToDiscover = mutation({
  args: {
    userId: v.id("users"),
    applePlaylistId: v.string(),
    playlistName: v.string(),
    curatorName: v.optional(v.string()),
    description: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    featuredForKids: v.optional(v.array(v.id("kidProfiles"))),
    hideArtwork: v.optional(v.boolean()),
    tracks: v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      albumName: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
      durationInMillis: v.optional(v.number()),
      trackNumber: v.number(),
      isExplicit: v.optional(v.boolean()),
      appleAlbumId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Check if playlist already exists for this user
    const existing = await ctx.db
      .query("featuredPlaylists")
      .withIndex("by_user_and_playlist", (q) =>
        q.eq("userId", args.userId).eq("applePlaylistId", args.applePlaylistId)
      )
      .first();

    if (existing) {
      // Update existing playlist
      const updateData: {
        playlistName: string;
        curatorName?: string;
        description?: string;
        artworkUrl?: string;
        trackCount?: number;
        featuredForKids?: string[];
        hideArtwork?: boolean;
      } = {
        playlistName: args.playlistName,
        curatorName: args.curatorName,
        description: args.description,
        artworkUrl: args.artworkUrl,
        trackCount: args.trackCount,
        hideArtwork: args.hideArtwork,
      };

      // Merge kid access
      if (args.featuredForKids && args.featuredForKids.length > 0) {
        const existingKids = existing.featuredForKids || [];
        const mergedKids = [...new Set([...existingKids, ...args.featuredForKids])];
        updateData.featuredForKids = mergedKids as string[];
      }

      await ctx.db.patch(existing._id, updateData);

      // Delete old tracks and add new ones
      const oldTracks = await ctx.db
        .query("featuredPlaylistTracks")
        .withIndex("by_playlist", (q) => q.eq("playlistId", existing._id))
        .collect();

      for (const track of oldTracks) {
        await ctx.db.delete(track._id);
      }

      // Add new tracks
      for (const track of args.tracks) {
        await ctx.db.insert("featuredPlaylistTracks", {
          userId: args.userId,
          playlistId: existing._id,
          ...track,
        });
      }

      return existing._id;
    }

    // Create new playlist
    const playlistId = await ctx.db.insert("featuredPlaylists", {
      userId: args.userId,
      applePlaylistId: args.applePlaylistId,
      playlistName: args.playlistName,
      curatorName: args.curatorName,
      description: args.description,
      artworkUrl: args.artworkUrl,
      trackCount: args.trackCount,
      featuredForKids: args.featuredForKids,
      hideArtwork: args.hideArtwork,
      createdAt: Date.now(),
    });

    // Add tracks
    for (const track of args.tracks) {
      await ctx.db.insert("featuredPlaylistTracks", {
        userId: args.userId,
        playlistId,
        ...track,
      });
    }

    return playlistId;
  },
});

// Get featured playlists for a kid
export const getFeaturedPlaylistsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) return [];

    const allPlaylists = await ctx.db
      .query("featuredPlaylists")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter by kid access
    return allPlaylists.filter(playlist => {
      if (!playlist.featuredForKids || playlist.featuredForKids.length === 0) {
        return true; // Available to all kids
      }
      return playlist.featuredForKids.includes(args.kidProfileId);
    });
  },
});

// Get tracks for a featured playlist
export const getFeaturedPlaylistTracks = query({
  args: { playlistId: v.id("featuredPlaylists") },
  handler: async (ctx, args) => {
    const tracks = await ctx.db
      .query("featuredPlaylistTracks")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    // Sort by track number
    return tracks.sort((a, b) => a.trackNumber - b.trackNumber);
  },
});

// Get all featured playlists for a user (admin view)
export const getFeaturedPlaylistsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("featuredPlaylists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Remove a featured playlist
export const removeFeaturedPlaylist = mutation({
  args: { playlistId: v.id("featuredPlaylists") },
  handler: async (ctx, args) => {
    // Delete tracks first
    const tracks = await ctx.db
      .query("featuredPlaylistTracks")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    for (const track of tracks) {
      await ctx.db.delete(track._id);
    }

    // Delete playlist
    await ctx.db.delete(args.playlistId);
  },
});

// Remove a single track from a featured playlist
export const removeTrackFromFeaturedPlaylist = mutation({
  args: {
    playlistId: v.id("featuredPlaylists"),
    appleSongId: v.string(),
  },
  handler: async (ctx, args) => {
    const tracks = await ctx.db
      .query("featuredPlaylistTracks")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    const trackToRemove = tracks.find(t => t.appleSongId === args.appleSongId);
    if (trackToRemove) {
      await ctx.db.delete(trackToRemove._id);

      // Update track count on playlist
      const playlist = await ctx.db.get(args.playlistId);
      if (playlist && playlist.trackCount) {
        await ctx.db.patch(args.playlistId, {
          trackCount: playlist.trackCount - 1,
        });
      }

      return { success: true };
    }

    return { success: false, error: "Track not found" };
  },
});
