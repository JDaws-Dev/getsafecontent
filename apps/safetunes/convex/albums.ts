import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============================================================================
// UNIFIED ALBUM MODEL
// ============================================================================
// Key Design:
// - ONE approvedAlbums record per album (per user) - no kidProfileId needed
// - Album has `featured` flag for Discover visibility
// - Kid-specific access is determined by approvedSongs entries
// - If a kid has ANY approved songs from an album, they have it in Library
// ============================================================================

// Get all approved albums for a user - UNIFIED VIEW
export const getApprovedAlbums = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all albums (now ONE record per album)
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get all approved songs to determine which kids have which albums
    const approvedSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get all kid profiles
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Build a map of albumName -> kidProfileIds who have songs from it
    const albumToKids = new Map<string, Set<string>>();
    for (const song of approvedSongs) {
      if (song.albumName && song.kidProfileId) {
        if (!albumToKids.has(song.albumName)) {
          albumToKids.set(song.albumName, new Set());
        }
        albumToKids.get(song.albumName)!.add(String(song.kidProfileId));
      }
    }

    // Dedupe albums by appleAlbumId (handle legacy data with multiple records)
    const albumMap = new Map<string, any>();
    for (const album of albums) {
      const key = album.appleAlbumId;
      if (!albumMap.has(key)) {
        // Get kids who have songs from this album
        const kidIds = albumToKids.get(album.albumName) || new Set();
        const albumKidProfiles = kidProfiles.filter(k => kidIds.has(String(k._id)));

        albumMap.set(key, {
          id: album._id,
          name: album.albumName,
          artist: album.artistName,
          artworkUrl: album.artworkUrl,
          year: album.releaseYear,
          trackCount: album.trackCount,
          appleAlbumId: album.appleAlbumId,
          genres: album.genres || [],
          hideArtwork: album.hideArtwork || false,
          discoverable: album.featured === true,
          kidProfileIds: Array.from(kidIds),
          kidProfiles: albumKidProfiles.map(k => ({
            _id: k._id,
            name: k.name,
            avatar: k.avatar,
            color: k.color,
          })),
        });
      } else {
        // Merge data from duplicate records (legacy support)
        const existing = albumMap.get(key)!;
        if (album.featured === true) existing.discoverable = true;
        if (!existing.artworkUrl && album.artworkUrl) existing.artworkUrl = album.artworkUrl;
      }
    }

    return Array.from(albumMap.values());
  },
});

// Get approved albums for a specific kid profile
export const getApprovedAlbumsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // First get the kid profile to find the userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return [];
    }

    // Get albums approved for this user (family)
    const userAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Only return albums specifically approved for THIS kid
    // Do NOT include albums with null kidProfileId (legacy data needs migration)
    const targetKidId = String(args.kidProfileId);
    return userAlbums.filter(
      (album) => album.kidProfileId && String(album.kidProfileId) === targetKidId
    );
  },
});

// Check if an album is approved
export const isAlbumApproved = query({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    const album = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .first();

    return album !== null;
  },
});

// Approve an album (UNIFIED: creates ONE record per album, regardless of kids)
export const approveAlbum = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.optional(v.id("kidProfiles")), // DEPRECATED - kept for backwards compat
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    releaseYear: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    genres: v.optional(v.array(v.string())),
    isExplicit: v.optional(v.boolean()),
    hideArtwork: v.optional(v.boolean()),
    featured: v.optional(v.boolean()), // Discoverable flag
    tracks: v.optional(v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      trackNumber: v.optional(v.number()),
      durationInMillis: v.optional(v.number()),
      isExplicit: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    console.log('[approveAlbum] Called with:', {
      userId: args.userId,
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
      featured: args.featured,
      tracksCount: args.tracks?.length || 0,
    });

    // Check if album already exists for this user (ONE record per album)
    const existing = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .first();

    if (existing) {
      console.log('[approveAlbum] Album already exists, updating if needed:', existing._id);
      // Update featured status if provided
      if (args.featured !== undefined && existing.featured !== args.featured) {
        await ctx.db.patch(existing._id, { featured: args.featured });
      }
      // Store tracks if provided
      if (args.tracks && args.tracks.length > 0) {
        await storeAlbumTracksInternal(ctx, args.userId, args.appleAlbumId, args.tracks);
      }
      return existing._id;
    }

    // Create ONE album record (no kidProfileId - that's determined by approvedSongs)
    console.log('[approveAlbum] Creating new album record');
    const newId = await ctx.db.insert("approvedAlbums", {
      userId: args.userId,
      // kidProfileId: undefined - UNIFIED model doesn't use this
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
      artistName: args.artistName,
      artworkUrl: args.artworkUrl,
      releaseYear: args.releaseYear,
      trackCount: args.trackCount,
      genres: args.genres,
      isExplicit: args.isExplicit,
      hideArtwork: args.hideArtwork,
      featured: args.featured || false,
      approvedAt: Date.now(),
    });

    // Store album tracks if provided
    if (args.tracks && args.tracks.length > 0) {
      await storeAlbumTracksInternal(ctx, args.userId, args.appleAlbumId, args.tracks);
    }

    console.log('[approveAlbum] Created new album with ID:', newId);
    return newId;
  },
});

// Internal helper to store album tracks
async function storeAlbumTracksInternal(
  ctx: any,
  userId: any,
  appleAlbumId: string,
  tracks: Array<{
    appleSongId: string;
    songName: string;
    artistName: string;
    trackNumber?: number;
    durationInMillis?: number;
    isExplicit?: boolean;
  }>
) {
  // Check if tracks already exist
  const existingTracks = await ctx.db
    .query("albumTracks")
    .withIndex("by_user_and_album", (q) =>
      q.eq("userId", userId).eq("appleAlbumId", appleAlbumId)
    )
    .collect();

  if (existingTracks.length > 0) {
    console.log('[storeAlbumTracks] Tracks already exist, skipping');
    return;
  }

  // Store each track
  for (const track of tracks) {
    await ctx.db.insert("albumTracks", {
      userId,
      appleAlbumId,
      appleSongId: track.appleSongId,
      songName: track.songName,
      artistName: track.artistName,
      trackNumber: track.trackNumber,
      durationInMillis: track.durationInMillis,
      isExplicit: track.isExplicit,
      createdAt: Date.now(),
    });
  }

  console.log('[storeAlbumTracks] Stored', tracks.length, 'tracks for album', appleAlbumId);
}

// Remove an approved album
export const removeApprovedAlbum = mutation({
  args: {
    albumId: v.id("approvedAlbums"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.albumId);
  },
});

// Remove an album for specific kids
export const removeAlbumForKids = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    kidProfileIds: v.array(v.id("kidProfiles")),
  },
  handler: async (ctx, args) => {
    // Find all album instances for this user and apple album ID
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    // Delete albums that match the specified kid profile IDs
    // Or delete the "all kids" instance (kidProfileId is undefined/null) if all kids are being removed
    for (const album of albums) {
      if (args.kidProfileIds.includes(album.kidProfileId as any)) {
        await ctx.db.delete(album._id);
      }
    }

    return albums.length;
  },
});

// Toggle artwork visibility for an album
export const toggleAlbumArtwork = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    hideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find all instances of this album for this user (could be multiple for different kid profiles)
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    // Get album name to match songs
    const albumName = albums[0]?.albumName;

    // Update all album instances
    for (const album of albums) {
      await ctx.db.patch(album._id, {
        hideArtwork: args.hideArtwork,
      });
    }

    // Also update all individual songs from this album
    if (albumName) {
      const allSongs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      // Filter songs that belong to this album and update them
      for (const song of allSongs) {
        if (song.albumName === albumName) {
          await ctx.db.patch(song._id, {
            hideArtwork: args.hideArtwork,
          });
        }
      }
    }

    return albums.length;
  },
});

// Refresh artwork URL for an album
export const refreshAlbumArtwork = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    artworkUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all instances of this album for this user
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    // Update all album instances with new artwork URL
    for (const album of albums) {
      await ctx.db.patch(album._id, {
        artworkUrl: args.artworkUrl,
      });
    }

    return albums.length;
  },
});

// Get all albums with approved songs for a kid's LIBRARY
// UNIFIED MODEL: Kid has album in Library if they have ANY approvedSongs from it
export const getAlbumsWithApprovedSongs = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get the kid profile to find the userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return [];
    }

    // Get approved songs specifically for THIS kid
    const allApprovedSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter for songs approved for this specific kid
    const kidSongs = allApprovedSongs.filter(
      (song) => String(song.kidProfileId) === String(args.kidProfileId)
    );

    // Get all albums (for metadata)
    const allAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Get all album tracks for this user
    const albumTracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Group tracks by album
    const tracksByAlbum = new Map<string, any[]>();
    for (const track of albumTracks) {
      if (!tracksByAlbum.has(track.appleAlbumId)) {
        tracksByAlbum.set(track.appleAlbumId, []);
      }
      tracksByAlbum.get(track.appleAlbumId)!.push(track);
    }

    // Build albums map from kid's approved songs
    // IMPORTANT: Use album NAME as the key for consolidation to prevent duplicates
    // Soundtracks (Harry Potter, Jurassic Park, etc.) may have multiple appleAlbumIds
    // for the same album, so we consolidate by name to show them as one entry.
    const albumMap = new Map<string, any>();

    for (const song of kidSongs) {
      if (!song.albumName) continue;

      // Find matching album record for metadata (prefer ID match, fall back to name)
      const albumRecord = song.appleAlbumId
        ? allAlbums.find(a => a.appleAlbumId === song.appleAlbumId)
        : allAlbums.find(a => a.albumName === song.albumName);

      // Use ALBUM NAME as the key for consolidation (case-insensitive)
      // This ensures soundtracks/compilations with multiple IDs show as one album
      const key = song.albumName.toLowerCase().trim();

      if (!albumMap.has(key)) {
        // Get all tracks from albumTracks if we have the album
        const allTracksForAlbum = albumRecord ? tracksByAlbum.get(albumRecord.appleAlbumId) || [] : [];

        albumMap.set(key, {
          appleAlbumId: albumRecord?.appleAlbumId || song.appleAlbumId || null,
          albumName: song.albumName,
          artistName: albumRecord?.artistName || song.artistName,
          artworkUrl: albumRecord?.artworkUrl || song.artworkUrl,
          releaseYear: albumRecord?.releaseYear || null,
          hideArtwork: albumRecord?.hideArtwork ?? song.hideArtwork ?? false,
          isFullAlbum: false, // Will be updated if all tracks are approved
          trackCount: albumRecord?.trackCount || allTracksForAlbum.length,
          genres: albumRecord?.genres || song.genres || [],
          approvedSongs: [],
          approvedAt: song.approvedAt,
          _allTracksCount: allTracksForAlbum.length,
          // Track all appleAlbumIds for this consolidated album
          allAppleAlbumIds: albumRecord?.appleAlbumId ? [albumRecord.appleAlbumId] : (song.appleAlbumId ? [song.appleAlbumId] : []),
        });
      } else {
        // Album already exists - merge metadata if needed
        const existing = albumMap.get(key)!;
        // Add appleAlbumId to the list if not already there
        const newId = albumRecord?.appleAlbumId || song.appleAlbumId;
        if (newId && !existing.allAppleAlbumIds.includes(newId)) {
          existing.allAppleAlbumIds.push(newId);
        }
        // Use better metadata if available
        if (!existing.appleAlbumId && newId) {
          existing.appleAlbumId = newId;
        }
        if (!existing.artworkUrl && (albumRecord?.artworkUrl || song.artworkUrl)) {
          existing.artworkUrl = albumRecord?.artworkUrl || song.artworkUrl;
        }
      }

      // Add this song to the album's approved songs list
      const albumEntry = albumMap.get(key)!;
      const alreadyAdded = albumEntry.approvedSongs.some(
        (s: any) => s.appleSongId === song.appleSongId
      );
      if (!alreadyAdded) {
        albumEntry.approvedSongs.push({
          appleSongId: song.appleSongId,
          songName: song.songName,
          artistName: song.artistName,
          durationInMillis: song.durationInMillis,
          isExplicit: song.isExplicit,
        });
      }
    }

    // Check if albums are "full" (all tracks approved)
    for (const album of albumMap.values()) {
      if (album._allTracksCount > 0 && album.approvedSongs.length >= album._allTracksCount) {
        album.isFullAlbum = true;
      }
      delete album._allTracksCount;
    }

    // Convert map to array and sort by most recent
    const result = Array.from(albumMap.values()).sort(
      (a, b) => (b.approvedAt || 0) - (a.approvedAt || 0)
    );

    return result;
  },
});

// Get all albums with approved songs for admin (user-level)
export const getAlbumsWithApprovedSongsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all approved songs for this user
    const allApprovedSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter out songs that are ONLY in Discover (featured=true and kidProfileId=undefined)
    const approvedSongs = allApprovedSongs.filter(song => {
      // If it has a specific kid profile, it's in the library
      if (song.kidProfileId) {
        return true;
      }
      // If it has no kid profile, only include if it's NOT featured (or featured is undefined)
      return !song.featured;
    });

    // Get all approved albums for this user
    const approvedAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter out albums that are ONLY in Discover (featured=true and kidProfileId=undefined)
    const libraryAlbums = approvedAlbums.filter(album => {
      // If it has a specific kid profile, it's in the library
      if (album.kidProfileId) {
        return true;
      }
      // If it has no kid profile, only include if it's NOT featured (or featured is undefined)
      return !album.featured;
    });

    // Create a map of albums with their approved songs
    // IMPORTANT: Use album NAME as the key for consolidation to prevent duplicates
    // Soundtracks (Harry Potter, Jurassic Park, etc.) may have multiple appleAlbumIds
    // for the same album, so we consolidate by name to show them as one entry.
    const albumMap = new Map();

    // Add full approved albums (excluding Discover-only)
    for (const album of libraryAlbums) {
      // Use album name (lowercase, trimmed) as key for consolidation
      const key = album.albumName.toLowerCase().trim();
      if (!albumMap.has(key)) {
        albumMap.set(key, {
          appleAlbumId: album.appleAlbumId,
          albumName: album.albumName,
          artistName: album.artistName,
          artworkUrl: album.artworkUrl,
          releaseYear: album.releaseYear,
          hideArtwork: album.hideArtwork || false,
          isFullAlbum: true,
          trackCount: album.trackCount,
          genres: album.genres || [],
          approvedSongs: [],
          approvedAt: album.approvedAt,
          // Track all appleAlbumIds for this consolidated album
          allAppleAlbumIds: album.appleAlbumId ? [album.appleAlbumId] : [],
        });
      } else {
        // Album already exists - add appleAlbumId to the list if not there
        const existing = albumMap.get(key);
        if (album.appleAlbumId && !existing.allAppleAlbumIds?.includes(album.appleAlbumId)) {
          existing.allAppleAlbumIds = existing.allAppleAlbumIds || [];
          existing.allAppleAlbumIds.push(album.appleAlbumId);
        }
        // Use better metadata if available
        if (!existing.artworkUrl && album.artworkUrl) {
          existing.artworkUrl = album.artworkUrl;
        }
      }
    }

    // Add albums from individual song approvals
    for (const song of approvedSongs) {
      if (!song.albumName) continue; // Skip songs without album info

      // Use album name (lowercase, trimmed) as key for consolidation
      const key = song.albumName.toLowerCase().trim();

      // If album doesn't exist in map, create it
      if (!albumMap.has(key)) {
        const albumEntry = {
          appleAlbumId: song.appleAlbumId || null,
          albumName: song.albumName,
          artistName: song.artistName,
          artworkUrl: song.artworkUrl,
          releaseYear: null,
          hideArtwork: song.hideArtwork || false,
          isFullAlbum: false,
          trackCount: 0,
          approvedSongs: [],
          approvedAt: song.approvedAt,
          allAppleAlbumIds: song.appleAlbumId ? [song.appleAlbumId] : [],
        };
        albumMap.set(key, albumEntry);
      }

      const albumEntry = albumMap.get(key);

      // Track appleAlbumIds from songs
      if (song.appleAlbumId && !albumEntry.allAppleAlbumIds?.includes(song.appleAlbumId)) {
        albumEntry.allAppleAlbumIds = albumEntry.allAppleAlbumIds || [];
        albumEntry.allAppleAlbumIds.push(song.appleAlbumId);
      }

      // Use better metadata if available
      if (!albumEntry.artworkUrl && song.artworkUrl) {
        albumEntry.artworkUrl = song.artworkUrl;
      }
      if (!albumEntry.appleAlbumId && song.appleAlbumId) {
        albumEntry.appleAlbumId = song.appleAlbumId;
      }

      // Merge genres from this song if it has any
      if (song.genres && song.genres.length > 0 && !albumEntry.isFullAlbum) {
        const existingGenres = new Set(albumEntry.genres || []);
        song.genres.forEach((genre: string) => existingGenres.add(genre));
        albumEntry.genres = Array.from(existingGenres);
      }

      // Add this song to the album's approved songs list
      // (Include for ALL albums - both full albums and partial)
      albumEntry.approvedSongs.push({
        appleSongId: song.appleSongId,
        songName: song.songName,
        artistName: song.artistName,
        durationInMillis: song.durationInMillis,
        isExplicit: song.isExplicit,
        kidProfileId: song.kidProfileId, // Include kid profile for filtering
        hideArtwork: song.hideArtwork,
      });
    }

    // Convert map to array and sort by most recent
    const result = Array.from(albumMap.values()).sort(
      (a, b) => (b.approvedAt || 0) - (a.approvedAt || 0)
    );

    return result;
  },
});

// Approve multiple albums at once (for playlist import)
export const approveMultipleAlbums = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.optional(v.id("kidProfiles")),
    albums: v.array(
      v.object({
        appleAlbumId: v.string(),
        albumName: v.string(),
        artistName: v.string(),
        artworkUrl: v.optional(v.string()),
        releaseYear: v.optional(v.string()),
        trackCount: v.optional(v.number()),
        genres: v.optional(v.array(v.string())),
        isExplicit: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const approvedIds = [];

    for (const album of args.albums) {
      // Check if already approved
      const existing = await ctx.db
        .query("approvedAlbums")
        .withIndex("by_user_and_album", (q) =>
          q.eq("userId", args.userId).eq("appleAlbumId", album.appleAlbumId)
        )
        .first();

      if (!existing) {
        const id = await ctx.db.insert("approvedAlbums", {
          userId: args.userId,
          kidProfileId: args.kidProfileId,
          appleAlbumId: album.appleAlbumId,
          albumName: album.albumName,
          artistName: album.artistName,
          artworkUrl: album.artworkUrl,
          releaseYear: album.releaseYear,
          trackCount: album.trackCount,
          genres: album.genres,
          isExplicit: album.isExplicit,
          approvedAt: Date.now(),
        });
        approvedIds.push(id);
      }
    }

    return approvedIds;
  },
});

// Get all album tracks for a user (for search)
export const getAllAlbumTracksForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Use the by_user index to efficiently query tracks for this user
    const tracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return tracks;
  },
});

// Get ALL albums from ALL users (for admin backfill)
export const getAllAlbumsForBackfill = query({
  args: {},
  handler: async (ctx) => {
    const allAlbums = await ctx.db
      .query("approvedAlbums")
      .collect();

    // Return unique albums by appleAlbumId
    const albumMap = new Map();
    for (const album of allAlbums) {
      if (!album.appleAlbumId) continue; // Skip partial albums

      if (!albumMap.has(album.appleAlbumId)) {
        albumMap.set(album.appleAlbumId, {
          _id: album._id,
          userId: album.userId,
          appleAlbumId: album.appleAlbumId,
          albumName: album.albumName,
          artistName: album.artistName,
          artworkUrl: album.artworkUrl,
          releaseYear: album.releaseYear,
          trackCount: album.trackCount,
          genres: album.genres,
          isExplicit: album.isExplicit,
          hideArtwork: album.hideArtwork,
          kidProfileIds: album.kidProfileId ? [album.kidProfileId] : [],
        });
      }
    }

    return Array.from(albumMap.values());
  },
});

// Remove album from BOTH Library and Discover (everywhere)
export const removeAlbumEverywhere = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[removeAlbumEverywhere] Starting removal for:", args.appleAlbumId);

    try {
      // Find ALL instances of this album for this user (Library + Discover)
      const albums = await ctx.db
        .query("approvedAlbums")
        .withIndex("by_user_and_album", (q) =>
          q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
        )
        .collect();

      console.log("[removeAlbumEverywhere] Found", albums.length, "album instances");

      // Get album name for matching individual songs
      const albumName = albums[0]?.albumName;

      // Delete all album instances (both kidProfileId-specific AND featured)
      for (const album of albums) {
        await ctx.db.delete(album._id);
      }
      console.log("[removeAlbumEverywhere] Deleted album instances");

      // Also remove associated album tracks
      const tracks = await ctx.db
        .query("albumTracks")
        .withIndex("by_user_and_album", (q) =>
          q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
        )
        .collect();

      console.log("[removeAlbumEverywhere] Found", tracks.length, "tracks to delete");

      for (const track of tracks) {
        await ctx.db.delete(track._id);
      }
      console.log("[removeAlbumEverywhere] Deleted tracks");

      // Also remove any individual approved songs from this album
      if (albumName) {
        console.log("[removeAlbumEverywhere] Looking for approvedSongs with albumName:", albumName);
        const allSongs = await ctx.db
          .query("approvedSongs")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .collect();

        console.log("[removeAlbumEverywhere] Found", allSongs.length, "total songs for user");

        let deletedSongsCount = 0;
        for (const song of allSongs) {
          if (song.albumName === albumName) {
            await ctx.db.delete(song._id);
            deletedSongsCount++;
          }
        }
        console.log("[removeAlbumEverywhere] Deleted", deletedSongsCount, "individual songs");
      }

      console.log("[removeAlbumEverywhere] Success! Removed album.");
      return albums.length;
    } catch (error) {
      console.error("[removeAlbumEverywhere] Error:", error);
      throw error;
    }
  },
});

// Remove partial album (by name) - for albums that don't have appleAlbumId
export const removePartialAlbumByName = mutation({
  args: {
    userId: v.id("users"),
    albumName: v.string(),
    artistName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[removePartialAlbumByName] Starting removal for:", args.albumName, "by", args.artistName);

    try {
      // Remove all individual songs from this album
      const allSongs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      let deletedSongsCount = 0;
      for (const song of allSongs) {
        if (song.albumName === args.albumName && song.artistName === args.artistName) {
          await ctx.db.delete(song._id);
          deletedSongsCount++;
        }
      }

      console.log("[removePartialAlbumByName] Deleted", deletedSongsCount, "songs");
      console.log("[removePartialAlbumByName] Success! Removed partial album.");
      return deletedSongsCount;
    } catch (error) {
      console.error("[removePartialAlbumByName] Error:", error);
      throw error;
    }
  },
});

// Hide/unhide artwork for album EVERYWHERE (Library + Discover)
export const toggleAlbumArtworkEverywhere = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    hideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find ALL instances of this album
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    // Update all album instances
    for (const album of albums) {
      await ctx.db.patch(album._id, {
        hideArtwork: args.hideArtwork,
      });
    }

    // Get all songs for this user
    const allSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get album name from the record, OR try to find it from songs
    let albumName = albums[0]?.albumName;
    if (!albumName) {
      // No album record - try to get name from songs with matching appleAlbumId
      const matchingSong = allSongs.find(s => s.appleAlbumId === args.appleAlbumId);
      albumName = matchingSong?.albumName;
    }

    // Update songs by BOTH appleAlbumId AND albumName (case-insensitive)
    let songsUpdated = 0;
    const albumNameLower = albumName?.toLowerCase();
    for (const song of allSongs) {
      const matchesAlbumId = song.appleAlbumId === args.appleAlbumId;
      const matchesAlbumName = albumNameLower && song.albumName?.toLowerCase() === albumNameLower;
      if (matchesAlbumId || matchesAlbumName) {
        await ctx.db.patch(song._id, {
          hideArtwork: args.hideArtwork,
        });
        songsUpdated++;
      }
    }

    return { albumsUpdated: albums.length, songsUpdated };
  },
});

// Hide/unhide artwork by album NAME (fallback when no appleAlbumId)
export const toggleAlbumArtworkByName = mutation({
  args: {
    userId: v.id("users"),
    albumName: v.string(),
    hideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find ALL album instances with this name
    const allAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const matchingAlbums = allAlbums.filter(
      (a) => a.albumName?.toLowerCase() === args.albumName.toLowerCase()
    );

    // Update all matching album instances
    for (const album of matchingAlbums) {
      await ctx.db.patch(album._id, {
        hideArtwork: args.hideArtwork,
      });
    }

    // Also update all songs from this album
    const allSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let songsUpdated = 0;
    for (const song of allSongs) {
      if (song.albumName?.toLowerCase() === args.albumName.toLowerCase()) {
        await ctx.db.patch(song._id, {
          hideArtwork: args.hideArtwork,
        });
        songsUpdated++;
      }
    }

    return { albumsUpdated: matchingAlbums.length, songsUpdated };
  },
});

// Get album with full track information and approval status (for Album Detail Modal)
// UNIFIED MODEL: One album record, kid access determined by approvedSongs
export const getAlbumWithTracks = query({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get THE album record (UNIFIED: only one per album)
    const album = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .first();

    // Get all tracks for this album from albumTracks table
    const albumTracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    // Get approved songs for this album (individual track approvals per kid)
    const approvedSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter approved songs for this album by album name
    const albumApprovedSongs = approvedSongs.filter(
      (song) => song.albumName === album?.albumName
    );

    // Get ALL kid profiles
    const allKidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // UNIFIED: Kid access is determined by approvedSongs, not album records
    // Find which kids have ANY songs from this album approved
    const kidsWithAccess = new Set<string>();
    for (const song of albumApprovedSongs) {
      if (song.kidProfileId) {
        kidsWithAccess.add(String(song.kidProfileId));
      }
    }

    // Map tracks with their approval status - PER KID
    const tracksWithStatus = albumTracks.map((track) => {
      // Check if this specific track is approved via approvedSongs for each kid
      const approvedVersions = albumApprovedSongs.filter(
        (s) => s.appleSongId === track.appleSongId
      );

      // Get the kid profile IDs that have this specific track approved
      const trackKidProfileIds = approvedVersions.map((s) => s.kidProfileId).filter(Boolean);

      return {
        ...track,
        isApproved: approvedVersions.length > 0,
        kidProfileIds: trackKidProfileIds,
      };
    });

    // Discoverable is the `featured` flag on the album
    const discoverable = album?.featured === true;

    return {
      album,
      tracks: tracksWithStatus,
      kidProfiles: allKidProfiles,
      discoverable,
      // UNIFIED: Kids who have ANY approved songs from this album
      albumKidProfileIds: Array.from(kidsWithAccess),
    };
  },
});

// Approve multiple tracks for specific kids (UNIFIED MODEL)
// This creates approvedSongs entries for each kid+track combo
// Album can be BOTH in Library (for some kids) AND Discoverable (for all kids)
export const approveAlbumTracks = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    trackIds: v.array(v.string()),
    kidProfileIds: v.array(v.id("kidProfiles")),
    albumMetadata: v.object({
      albumName: v.string(),
      artistName: v.string(),
      artworkUrl: v.optional(v.string()),
      releaseYear: v.optional(v.string()),
      trackCount: v.optional(v.number()),
      genres: v.optional(v.array(v.string())),
      isExplicit: v.optional(v.boolean()),
    }),
    hideArtwork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log('[approveAlbumTracks] Approving', args.trackIds.length, 'tracks for', args.kidProfileIds.length, 'kids');

    // For each kid profile
    for (const kidProfileId of args.kidProfileIds) {
      // For each track
      for (const trackId of args.trackIds) {
        // Check if already approved for this kid
        const existing = await ctx.db
          .query("approvedSongs")
          .withIndex("by_user_and_song", (q) =>
            q.eq("userId", args.userId).eq("appleSongId", trackId)
          )
          .filter((q) => q.eq(q.field("kidProfileId"), kidProfileId))
          .first();

        if (!existing) {
          // Get track details from albumTracks
          const trackDetails = await ctx.db
            .query("albumTracks")
            .withIndex("by_user_and_song", (q) =>
              q.eq("userId", args.userId).eq("appleSongId", trackId)
            )
            .first();

          if (trackDetails) {
            await ctx.db.insert("approvedSongs", {
              userId: args.userId,
              kidProfileId,
              appleSongId: trackId,
              songName: trackDetails.songName,
              artistName: trackDetails.artistName,
              albumName: args.albumMetadata.albumName,
              artworkUrl: args.albumMetadata.artworkUrl,
              durationInMillis: trackDetails.durationInMillis,
              genres: args.albumMetadata.genres,
              isExplicit: trackDetails.isExplicit,
              hideArtwork: args.hideArtwork || false,
              approvedAt: Date.now(),
            });
          }
        }
      }
    }

    // Ensure ONE album record exists (UNIFIED model - no kidProfileId)
    const existingAlbum = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .first();

    if (!existingAlbum) {
      await ctx.db.insert("approvedAlbums", {
        userId: args.userId,
        // No kidProfileId in unified model
        appleAlbumId: args.appleAlbumId,
        albumName: args.albumMetadata.albumName,
        artistName: args.albumMetadata.artistName,
        artworkUrl: args.albumMetadata.artworkUrl,
        releaseYear: args.albumMetadata.releaseYear,
        trackCount: args.albumMetadata.trackCount,
        genres: args.albumMetadata.genres,
        isExplicit: args.albumMetadata.isExplicit,
        approvedAt: Date.now(),
        hideArtwork: args.hideArtwork || false,
        // featured status is NOT automatically set - parent controls this separately
      });
    }

    // NOTE: We NO LONGER auto-remove from Discover when adding to Library
    // An album can be BOTH discoverable AND in specific kids' libraries
  },
});

// Remove specific tracks for specific kids
export const removeAlbumTracksForKids = mutation({
  args: {
    userId: v.id("users"),
    trackIds: v.array(v.string()),
    kidProfileIds: v.optional(v.array(v.id("kidProfiles"))), // If empty, remove for all kids
  },
  handler: async (ctx, args) => {
    for (const trackId of args.trackIds) {
      const songs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user_and_song", (q) =>
          q.eq("userId", args.userId).eq("appleSongId", trackId)
        )
        .collect();

      for (const song of songs) {
        // If kidProfileIds specified, only remove for those kids
        if (args.kidProfileIds && args.kidProfileIds.length > 0) {
          if (song.kidProfileId && args.kidProfileIds.includes(song.kidProfileId)) {
            await ctx.db.delete(song._id);
          }
        } else {
          // Remove for all kids
          await ctx.db.delete(song._id);
        }
      }
    }
  },
});

// Store album tracks (called from frontend when album has no tracks stored)
export const storeAlbumTracks = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    tracks: v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      trackNumber: v.optional(v.number()),
      durationInMillis: v.optional(v.number()),
      isExplicit: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    // Check if tracks already exist
    const existingTracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    if (existingTracks.length > 0) {
      console.log('[storeAlbumTracks] Tracks already exist, skipping');
      return existingTracks.length;
    }

    // Store each track
    for (const track of args.tracks) {
      await ctx.db.insert("albumTracks", {
        userId: args.userId,
        appleAlbumId: args.appleAlbumId,
        appleSongId: track.appleSongId,
        songName: track.songName,
        artistName: track.artistName,
        trackNumber: track.trackNumber,
        durationInMillis: track.durationInMillis,
        isExplicit: track.isExplicit,
        createdAt: Date.now(),
      });
    }

    console.log('[storeAlbumTracks] Stored', args.tracks.length, 'tracks for album', args.appleAlbumId);
    return args.tracks.length;
  },
});

// ============================================================================
// KID: Add Discover album to their Library
// ============================================================================
// When a kid clicks "Add to Library" from Discover, this creates approvedSongs
// entries for all tracks in the album, giving them library access
// ============================================================================

export const addDiscoverAlbumToKidLibrary = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    releaseYear: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    genres: v.optional(v.array(v.string())),
    isExplicit: v.optional(v.boolean()),
    hideArtwork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log('[addDiscoverAlbumToKidLibrary] Adding album to kid library:', {
      kidProfileId: args.kidProfileId,
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
    });

    // Get album tracks from the albumTracks table
    const albumTracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    console.log('[addDiscoverAlbumToKidLibrary] Found', albumTracks.length, 'tracks for album');

    if (albumTracks.length === 0) {
      console.log('[addDiscoverAlbumToKidLibrary] No tracks found - album may not have track data stored');
      // Still return success - the album might just not have tracks stored yet
      // The kid can still play from Discover, they just won't see it in Library
      return { tracksAdded: 0, message: 'No track data available' };
    }

    let tracksAdded = 0;

    // Create approvedSongs entry for each track
    for (const track of albumTracks) {
      // Check if already approved for this kid
      const existing = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user_and_song", (q) =>
          q.eq("userId", args.userId).eq("appleSongId", track.appleSongId)
        )
        .filter((q) => q.eq(q.field("kidProfileId"), args.kidProfileId))
        .first();

      if (!existing) {
        await ctx.db.insert("approvedSongs", {
          userId: args.userId,
          kidProfileId: args.kidProfileId,
          appleSongId: track.appleSongId,
          songName: track.songName,
          artistName: track.artistName,
          albumName: args.albumName,
          artworkUrl: args.artworkUrl,
          durationInMillis: track.durationInMillis,
          genres: args.genres,
          isExplicit: track.isExplicit,
          hideArtwork: args.hideArtwork || false,
          approvedAt: Date.now(),
        });
        tracksAdded++;
      }
    }

    console.log('[addDiscoverAlbumToKidLibrary] Added', tracksAdded, 'new tracks to kid library');

    return { tracksAdded, message: 'Album added to library' };
  },
});

// ============================================================================
// MIGRATION: Consolidate duplicate album records to unified model
// ============================================================================
// Run this once to merge multiple approvedAlbums records (per kid) into ONE per album
// The migration:
// 1. Groups albums by userId + appleAlbumId
// 2. For each group, keeps ONE record with merged data (featured = true if ANY were featured)
// 3. Deletes duplicate records
// NOTE: approvedSongs already track per-kid access, so we don't lose that data
// ============================================================================

export const migrateToUnifiedAlbumModel = mutation({
  args: {},
  handler: async (ctx) => {
    console.log('[MIGRATION] Starting unified album model migration...');

    // Get ALL approved albums
    const allAlbums = await ctx.db.query("approvedAlbums").collect();
    console.log(`[MIGRATION] Found ${allAlbums.length} total album records`);

    // Group by userId + appleAlbumId
    const albumGroups = new Map<string, typeof allAlbums>();
    for (const album of allAlbums) {
      const key = `${album.userId}:${album.appleAlbumId}`;
      if (!albumGroups.has(key)) {
        albumGroups.set(key, []);
      }
      albumGroups.get(key)!.push(album);
    }

    let duplicateGroupsCount = 0;
    let recordsDeleted = 0;
    let recordsUpdated = 0;

    // Process each group
    for (const [key, albums] of albumGroups.entries()) {
      if (albums.length === 1) {
        // No duplicates, just clear kidProfileId if set
        const album = albums[0];
        if (album.kidProfileId !== undefined) {
          await ctx.db.patch(album._id, { kidProfileId: undefined });
          recordsUpdated++;
        }
        continue;
      }

      // Multiple records for same album - need to consolidate
      duplicateGroupsCount++;
      console.log(`[MIGRATION] Consolidating ${albums.length} records for ${key}`);

      // Determine merged values
      const isFeatured = albums.some(a => a.featured === true);
      const hideArtwork = albums.some(a => a.hideArtwork === true);

      // Find the best record to keep (prefer one with artwork, most data)
      const keepRecord = albums.reduce((best, current) => {
        // Prefer one with artwork
        if (!best.artworkUrl && current.artworkUrl) return current;
        // Prefer one with genres
        if ((!best.genres || best.genres.length === 0) && current.genres && current.genres.length > 0) return current;
        // Prefer older record (more likely to be the "original")
        if (current.approvedAt < best.approvedAt) return current;
        return best;
      });

      // Update the record we're keeping with merged values
      await ctx.db.patch(keepRecord._id, {
        featured: isFeatured,
        hideArtwork,
        kidProfileId: undefined, // Clear kidProfileId in unified model
      });
      recordsUpdated++;

      // Delete all other records
      for (const album of albums) {
        if (album._id !== keepRecord._id) {
          await ctx.db.delete(album._id);
          recordsDeleted++;
        }
      }
    }

    const result = {
      totalRecords: allAlbums.length,
      uniqueAlbums: albumGroups.size,
      duplicateGroups: duplicateGroupsCount,
      recordsDeleted,
      recordsUpdated,
    };

    console.log('[MIGRATION] Complete:', result);
    return result;
  },
});

// Remove an album by appleAlbumId (deletes album and all its approved songs)
export const removeAlbumByAppleId = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all album instances for this user
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    const albumName = albums[0]?.albumName;

    // Delete all album instances
    for (const album of albums) {
      await ctx.db.delete(album._id);
    }

    // Also delete all approved songs from this album
    if (albumName) {
      const allSongs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      for (const song of allSongs) {
        if (song.albumName === albumName) {
          await ctx.db.delete(song._id);
        }
      }
    }

    return { albumsDeleted: albums.length };
  },
});

// Remove an album by NAME (fallback when no appleAlbumId)
export const removeAlbumByName = mutation({
  args: {
    userId: v.id("users"),
    albumName: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all album instances with this name
    const allAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const matchingAlbums = allAlbums.filter(
      (a) => a.albumName?.toLowerCase() === args.albumName.toLowerCase()
    );

    // Delete all matching album instances
    for (const album of matchingAlbums) {
      await ctx.db.delete(album._id);
    }

    // Also delete all approved songs from this album
    const allSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let songsDeleted = 0;
    for (const song of allSongs) {
      if (song.albumName?.toLowerCase() === args.albumName.toLowerCase()) {
        await ctx.db.delete(song._id);
        songsDeleted++;
      }
    }

    return { albumsDeleted: matchingAlbums.length, songsDeleted };
  },
});

// Remove album songs for a SPECIFIC KID only (by appleAlbumId)
export const removeAlbumForKid = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all songs for this kid from this album
    const allSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Normalize the appleAlbumId for comparison (handle string/number mismatches)
    const targetAlbumId = String(args.appleAlbumId).trim();

    // Get album name from any matching song
    const albumSongs = allSongs.filter(
      (s) => {
        // Compare appleAlbumId as strings to handle type mismatches
        const songAlbumId = s.appleAlbumId ? String(s.appleAlbumId).trim() : '';
        return songAlbumId === targetAlbumId &&
               String(s.kidProfileId) === String(args.kidProfileId);
      }
    );

    let songsDeleted = 0;
    for (const song of albumSongs) {
      await ctx.db.delete(song._id);
      songsDeleted++;
    }

    return { songsDeleted };
  },
});

// Remove album songs for a SPECIFIC KID only (by album name - fallback)
export const removeAlbumForKidByName = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    albumName: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all songs for this kid from this album
    const allSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const albumSongs = allSongs.filter(
      (s) => s.albumName?.toLowerCase() === args.albumName.toLowerCase() &&
             String(s.kidProfileId) === String(args.kidProfileId)
    );

    let songsDeleted = 0;
    for (const song of albumSongs) {
      await ctx.db.delete(song._id);
      songsDeleted++;
    }

    return { songsDeleted };
  },
});

// ============================================================================
// ENSURE ALBUM RECORD EXISTS WITH FULL METADATA
// ============================================================================
// Called when importing songs from playlists to ensure the album record exists
// so that album detail views can show all tracks for the album.
// This creates/updates the album record and stores all tracks if provided.
// ============================================================================

export const ensureAlbumRecord = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    releaseYear: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    genres: v.optional(v.array(v.string())),
    isExplicit: v.optional(v.boolean()),
    hideArtwork: v.optional(v.boolean()),
    // Full track list from Apple Music - store all tracks for album detail view
    tracks: v.optional(v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      trackNumber: v.optional(v.number()),
      durationInMillis: v.optional(v.number()),
      isExplicit: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    console.log('[ensureAlbumRecord] Ensuring album record exists:', {
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
      tracksProvided: args.tracks?.length || 0,
    });

    // Check if album already exists
    const existing = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .first();

    let albumId: any;

    if (existing) {
      console.log('[ensureAlbumRecord] Album exists, checking for updates');
      albumId = existing._id;

      // Update with any new data
      const updates: any = {};
      if (!existing.artworkUrl && args.artworkUrl) updates.artworkUrl = args.artworkUrl;
      if (!existing.genres?.length && args.genres?.length) updates.genres = args.genres;
      if (!existing.trackCount && args.trackCount) updates.trackCount = args.trackCount;
      if (!existing.releaseYear && args.releaseYear) updates.releaseYear = args.releaseYear;

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
        console.log('[ensureAlbumRecord] Updated album with:', Object.keys(updates));
      }
    } else {
      // Create new album record
      console.log('[ensureAlbumRecord] Creating new album record');
      albumId = await ctx.db.insert("approvedAlbums", {
        userId: args.userId,
        appleAlbumId: args.appleAlbumId,
        albumName: args.albumName,
        artistName: args.artistName,
        artworkUrl: args.artworkUrl,
        releaseYear: args.releaseYear,
        trackCount: args.trackCount,
        genres: args.genres,
        isExplicit: args.isExplicit,
        hideArtwork: args.hideArtwork,
        approvedAt: Date.now(),
        // Don't set featured - this just ensures the album exists for metadata
      });
    }

    // Store tracks if provided
    if (args.tracks && args.tracks.length > 0) {
      // Check if tracks already exist
      const existingTracks = await ctx.db
        .query("albumTracks")
        .withIndex("by_user_and_album", (q) =>
          q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
        )
        .collect();

      if (existingTracks.length === 0) {
        console.log('[ensureAlbumRecord] Storing', args.tracks.length, 'tracks');
        for (const track of args.tracks) {
          await ctx.db.insert("albumTracks", {
            userId: args.userId,
            appleAlbumId: args.appleAlbumId,
            appleSongId: track.appleSongId,
            songName: track.songName,
            artistName: track.artistName,
            trackNumber: track.trackNumber,
            durationInMillis: track.durationInMillis,
            isExplicit: track.isExplicit,
            createdAt: Date.now(),
          });
        }
      } else {
        console.log('[ensureAlbumRecord] Tracks already exist, skipping');
      }
    }

    return { albumId, created: !existing };
  },
});
