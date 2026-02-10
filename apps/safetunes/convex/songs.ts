import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all approved songs for a user (EXCLUDES Discover-only songs)
export const getApprovedSongs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter out songs that are ONLY in Discover (featured=true and kidProfileId=undefined)
    return songs.filter(song => {
      // If it has a specific kid profile, it's in the library
      if (song.kidProfileId) {
        return true;
      }
      // If it has no kid profile, only include if it's NOT featured (or featured is undefined)
      return !song.featured;
    });
  },
});

// Get approved songs for a specific kid profile
// NOTE: Only returns songs with THIS kid's specific kidProfileId
// Songs with null kidProfileId are NOT returned (legacy data that needs migration)
export const getApprovedSongsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // First get the kid profile to find the userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return [];
    }

    // Get songs approved for this user (family)
    const userSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Only return songs specifically approved for THIS kid
    // Do NOT include songs with null kidProfileId (those are legacy and need migration)
    return userSongs.filter(
      (song) => song.kidProfileId === args.kidProfileId
    );
  },
});

// Check if a song is approved
export const isSongApproved = query({
  args: {
    userId: v.id("users"),
    appleSongId: v.string(),
  },
  handler: async (ctx, args) => {
    const song = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_and_song", (q) =>
        q.eq("userId", args.userId).eq("appleSongId", args.appleSongId)
      )
      .first();

    return song !== null;
  },
});

// Approve a song
export const approveSong = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.optional(v.id("kidProfiles")),
    appleSongId: v.string(),
    songName: v.string(),
    artistName: v.string(),
    albumName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    durationInMillis: v.optional(v.number()),
    genres: v.optional(v.array(v.string())),
    isExplicit: v.optional(v.boolean()),
    hideArtwork: v.optional(v.boolean()),
    previewUrl: v.optional(v.string()),
    featured: v.optional(v.boolean()), // true = Discover, false/undefined = Library
    featuredForKids: v.optional(v.array(v.id("kidProfiles"))), // Which kids can see in Discover
    appleAlbumId: v.optional(v.string()), // Album ID for reference
    trackNumber: v.optional(v.number()), // Track number in album
  },
  handler: async (ctx, args) => {
    // CRITICAL: Library songs (non-featured) MUST have a kidProfileId
    // Only Discover songs (featured=true) can skip kidProfileId
    if (args.featured !== true && !args.kidProfileId) {
      throw new Error("kidProfileId is required for library songs. Each song must be approved for a specific kid.");
    }

    // For Discover songs (featured=true), check by appleSongId only (no kidProfileId)
    // For Library songs, check by appleSongId AND kidProfileId
    const existing = args.featured === true
      ? await ctx.db
          .query("approvedSongs")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), args.userId),
              q.eq(q.field("appleSongId"), args.appleSongId),
              q.eq(q.field("featured"), true)
            )
          )
          .first()
      : await ctx.db
          .query("approvedSongs")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), args.userId),
              q.eq(q.field("appleSongId"), args.appleSongId),
              q.eq(q.field("kidProfileId"), args.kidProfileId)
            )
          )
          .first();

    if (existing) {
      // If adding to Discover, update featured flag and kid access
      if (args.featured === true) {
        const updateData: { featured: boolean; featuredForKids?: string[] } = { featured: true };
        if (args.featuredForKids && args.featuredForKids.length > 0) {
          // Merge with existing kids if any
          const existingKids = existing.featuredForKids || [];
          const mergedKids = [...new Set([...existingKids, ...args.featuredForKids])];
          updateData.featuredForKids = mergedKids as string[];
        }
        await ctx.db.patch(existing._id, updateData);
      }
      return existing._id;
    }

    // Create new approval
    return await ctx.db.insert("approvedSongs", {
      userId: args.userId,
      kidProfileId: args.kidProfileId,
      appleSongId: args.appleSongId,
      songName: args.songName,
      artistName: args.artistName,
      albumName: args.albumName,
      artworkUrl: args.artworkUrl,
      durationInMillis: args.durationInMillis,
      genres: args.genres,
      isExplicit: args.isExplicit,
      hideArtwork: args.hideArtwork,
      featured: args.featured,
      featuredForKids: args.featuredForKids,
      appleAlbumId: args.appleAlbumId,
      trackNumber: args.trackNumber,
      approvedAt: Date.now(),
    });
  },
});

// Remove an approved song
export const removeApprovedSong = mutation({
  args: {
    songId: v.id("approvedSongs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.songId);
  },
});

// Remove an approved song by appleSongId and userId
export const removeApprovedSongByAppleId = mutation({
  args: {
    userId: v.id("users"),
    appleSongId: v.string(),
  },
  handler: async (ctx, args) => {
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_and_song", (q) =>
        q.eq("userId", args.userId).eq("appleSongId", args.appleSongId)
      )
      .collect();

    // Delete all matching songs (there might be multiple if approved for different kid profiles)
    for (const song of songs) {
      await ctx.db.delete(song._id);
    }

    return songs.length;
  },
});

// Toggle artwork visibility for a song and its album
export const toggleSongArtwork = mutation({
  args: {
    userId: v.id("users"),
    appleSongId: v.string(),
    hideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find the song
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_and_song", (q) =>
        q.eq("userId", args.userId).eq("appleSongId", args.appleSongId)
      )
      .collect();

    if (songs.length === 0) return 0;

    const albumName = songs[0]?.albumName;

    // Update the song
    for (const song of songs) {
      await ctx.db.patch(song._id, {
        hideArtwork: args.hideArtwork,
      });
    }

    // Also update the album and all other songs from this album
    if (albumName) {
      // Update all songs from this album
      const allSongs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const song of allSongs) {
        if (song.albumName === albumName) {
          await ctx.db.patch(song._id, {
            hideArtwork: args.hideArtwork,
          });
        }
      }

      // Update all album instances with this name
      const allAlbums = await ctx.db
        .query("approvedAlbums")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const album of allAlbums) {
        if (album.albumName === albumName) {
          await ctx.db.patch(album._id, {
            hideArtwork: args.hideArtwork,
          });
        }
      }
    }

    return songs.length;
  },
});

// Get album tracks from database
export const getAlbumTracks = query({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    const tracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    return tracks;
  },
});

// Remove song from BOTH Library and Discover (everywhere)
export const removeSongEverywhere = mutation({
  args: {
    userId: v.id("users"),
    appleSongId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find ALL instances of this song for this user (Library + Discover)
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_and_song", (q) =>
        q.eq("userId", args.userId).eq("appleSongId", args.appleSongId)
      )
      .collect();

    // Delete all instances (both kidProfileId-specific AND featured)
    for (const song of songs) {
      await ctx.db.delete(song._id);
    }

    return songs.length;
  },
});

// Toggle song access for a specific kid (add or remove)
export const toggleSongForKid = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    appleSongId: v.string(),
    songName: v.string(),
    artistName: v.string(),
    albumName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    durationInMillis: v.optional(v.number()),
    appleAlbumId: v.optional(v.string()), // Album ID for full album lookup
    trackNumber: v.optional(v.number()),
    isExplicit: v.optional(v.boolean()),
    forceRemove: v.optional(v.boolean()), // If true, only remove (don't add)
  },
  handler: async (ctx, args) => {
    // Check if song exists for this specific kid
    const existingSong = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_and_song", (q) =>
        q.eq("userId", args.userId).eq("appleSongId", args.appleSongId)
      )
      .filter((q) => q.eq(q.field("kidProfileId"), args.kidProfileId))
      .first();

    if (existingSong) {
      // Remove access for this kid
      await ctx.db.delete(existingSong._id);
      return { action: "removed", kidProfileId: args.kidProfileId };
    } else if (!args.forceRemove) {
      // Add access for this kid (only if not forceRemove)
      await ctx.db.insert("approvedSongs", {
        userId: args.userId,
        kidProfileId: args.kidProfileId,
        appleSongId: args.appleSongId,
        songName: args.songName,
        artistName: args.artistName,
        albumName: args.albumName,
        artworkUrl: args.artworkUrl,
        durationInMillis: args.durationInMillis,
        appleAlbumId: args.appleAlbumId,
        trackNumber: args.trackNumber,
        isExplicit: args.isExplicit,
        approvedAt: Date.now(),
      });
      return { action: "added", kidProfileId: args.kidProfileId };
    } else {
      // forceRemove was true but song doesn't exist - no-op
      return { action: "not_found", kidProfileId: args.kidProfileId };
    }
  },
});

// Get song access status for all kids (which kids have access to which songs)
export const getSongAccessByKid = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all approved songs for this user
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Build a map of appleSongId -> array of kidProfileIds that have access
    const accessMap: Record<string, string[]> = {};

    for (const song of songs) {
      if (!accessMap[song.appleSongId]) {
        accessMap[song.appleSongId] = [];
      }
      if (song.kidProfileId) {
        accessMap[song.appleSongId].push(song.kidProfileId);
      }
    }

    return accessMap;
  },
});

// Bulk assign songs to a kid (copy from another kid or add multiple)
export const bulkAssignSongsToKid = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    songs: v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      albumName: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
      durationInMillis: v.optional(v.number()),
      appleAlbumId: v.optional(v.string()),
      trackNumber: v.optional(v.number()),
      isExplicit: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    let added = 0;
    let skipped = 0;

    for (const song of args.songs) {
      // Check if already exists for this kid
      const existing = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user_and_song", (q) =>
          q.eq("userId", args.userId).eq("appleSongId", song.appleSongId)
        )
        .filter((q) => q.eq(q.field("kidProfileId"), args.kidProfileId))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("approvedSongs", {
        userId: args.userId,
        kidProfileId: args.kidProfileId,
        appleSongId: song.appleSongId,
        songName: song.songName,
        artistName: song.artistName,
        albumName: song.albumName,
        artworkUrl: song.artworkUrl,
        durationInMillis: song.durationInMillis,
        appleAlbumId: song.appleAlbumId,
        trackNumber: song.trackNumber,
        isExplicit: song.isExplicit,
        approvedAt: Date.now(),
      });
      added++;
    }

    return { added, skipped };
  },
});

// Hide/unhide artwork for song EVERYWHERE (Library + Discover + its album)
export const toggleSongArtworkEverywhere = mutation({
  args: {
    userId: v.id("users"),
    appleSongId: v.string(),
    hideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find ALL instances of this song
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_and_song", (q) =>
        q.eq("userId", args.userId).eq("appleSongId", args.appleSongId)
      )
      .collect();

    if (songs.length === 0) return 0;

    const albumName = songs[0]?.albumName;

    // Update all song instances
    for (const song of songs) {
      await ctx.db.patch(song._id, {
        hideArtwork: args.hideArtwork,
      });
    }

    // Also update ALL other songs from the same album
    if (albumName) {
      const allSongs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const song of allSongs) {
        if (song.albumName === albumName) {
          await ctx.db.patch(song._id, {
            hideArtwork: args.hideArtwork,
          });
        }
      }

      // Update ALL album instances with this name
      const allAlbums = await ctx.db
        .query("approvedAlbums")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const album of allAlbums) {
        if (album.albumName === albumName) {
          await ctx.db.patch(album._id, {
            hideArtwork: args.hideArtwork,
          });
        }
      }
    }

    return songs.length;
  },
});

// Get songs missing appleAlbumId for a user (for backfill)
export const getSongsMissingAlbumId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter songs that don't have an appleAlbumId but do have an albumName
    return songs.filter(song => !song.appleAlbumId && song.albumName);
  },
});

// Update song with album ID (for backfill)
export const updateSongAlbumId = mutation({
  args: {
    songId: v.id("approvedSongs"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.songId, {
      appleAlbumId: args.appleAlbumId,
    });
    return true;
  },
});

// Bulk update songs with album IDs (more efficient)
export const bulkUpdateSongAlbumIds = mutation({
  args: {
    updates: v.array(v.object({
      songId: v.id("approvedSongs"),
      appleAlbumId: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    for (const update of args.updates) {
      await ctx.db.patch(update.songId, {
        appleAlbumId: update.appleAlbumId,
      });
      updated++;
    }
    return updated;
  },
});
