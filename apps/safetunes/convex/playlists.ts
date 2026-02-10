import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all playlists for a user
export const getPlaylists = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playlists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get all playlists for a kid
export const getPlaylistsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playlists")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
  },
});

// Get a specific playlist
export const getPlaylist = query({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playlistId);
  },
});

// Create a new playlist
export const createPlaylist = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("playlists", {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      name: args.name,
      description: args.description,
      songs: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update playlist name/description
export const updatePlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { playlistId, ...updates } = args;
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(playlistId, {
      ...definedUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a playlist
export const deletePlaylist = mutation({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.playlistId);
  },
});

// Add a song to a playlist
export const addSongToPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    song: v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      albumName: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
      durationInMillis: v.optional(v.number()),
      appleAlbumId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");

    // Check if song already exists in playlist
    const songExists = playlist.songs.some(
      (s) => s.appleSongId === args.song.appleSongId
    );

    if (!songExists) {
      await ctx.db.patch(args.playlistId, {
        songs: [...playlist.songs, args.song],
        updatedAt: Date.now(),
      });
    }
  },
});

// Add multiple songs to a playlist (for adding entire album)
export const addSongsToPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    songs: v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      albumName: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
      durationInMillis: v.optional(v.number()),
      appleAlbumId: v.optional(v.string()),
    })),
    approveForKid: v.optional(v.boolean()), // If true, also approve songs for this kid's library
  },
  handler: async (ctx, args) => {
    console.log('addSongsToPlaylist called with:', {
      playlistId: args.playlistId,
      songsCount: args.songs.length,
      approveForKid: args.approveForKid,
    });

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");

    console.log('Current playlist has', playlist.songs.length, 'songs');

    // Filter out songs that already exist in playlist
    const existingSongIds = new Set(playlist.songs.map(s => s.appleSongId));
    const newSongs = args.songs.filter(s => !existingSongIds.has(s.appleSongId));

    console.log('Filtered to', newSongs.length, 'new songs to add');

    if (newSongs.length > 0) {
      await ctx.db.patch(args.playlistId, {
        songs: [...playlist.songs, ...newSongs],
        updatedAt: Date.now(),
      });

      console.log('Successfully added songs, new total:', playlist.songs.length + newSongs.length);

      // If approveForKid is true, also approve these songs for the kid's library
      if (args.approveForKid) {
        for (const song of newSongs) {
          // Check if song is already approved
          const existing = await ctx.db
            .query("approvedSongs")
            .filter((q) =>
              q.and(
                q.eq(q.field("userId"), playlist.userId),
                q.eq(q.field("appleSongId"), song.appleSongId),
                q.eq(q.field("kidProfileId"), playlist.kidProfileId)
              )
            )
            .first();

          if (!existing) {
            await ctx.db.insert("approvedSongs", {
              userId: playlist.userId,
              kidProfileId: playlist.kidProfileId,
              appleSongId: song.appleSongId,
              songName: song.songName,
              artistName: song.artistName,
              albumName: song.albumName,
              artworkUrl: song.artworkUrl,
              durationInMillis: song.durationInMillis,
              approvedAt: Date.now(),
            });
          }
        }
      }
    }

    return newSongs.length; // Return number of songs added
  },
});

// Remove a song from a playlist
export const removeSongFromPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    appleSongId: v.string(),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) throw new Error("Playlist not found");

    const updatedSongs = playlist.songs.filter(
      (s) => s.appleSongId !== args.appleSongId
    );

    await ctx.db.patch(args.playlistId, {
      songs: updatedSongs,
      updatedAt: Date.now(),
    });
  },
});

// Reorder songs in a playlist
export const reorderPlaylistSongs = mutation({
  args: {
    playlistId: v.id("playlists"),
    songs: v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      albumName: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
      durationInMillis: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playlistId, {
      songs: args.songs,
      updatedAt: Date.now(),
    });
  },
});
