import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Toggle featured status for an album
export const toggleAlbumFeatured = mutation({
  args: {
    albumId: v.id("approvedAlbums"),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.albumId, {
      featured: args.featured,
    });
  },
});

// Toggle featured status for a song
export const toggleSongFeatured = mutation({
  args: {
    songId: v.id("approvedSongs"),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.songId, {
      featured: args.featured,
    });
  },
});

// Remove album from Discover for a specific kid
// Handles the case where album is available to all kids (featuredForKids empty)
// or only to specific kids (featuredForKids has entries)
export const removeAlbumFromDiscoverForKid = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    kidProfileId: v.id("kidProfiles"),
  },
  handler: async (ctx, args) => {
    console.log('[removeAlbumFromDiscoverForKid] Called with:', {
      userId: args.userId,
      appleAlbumId: args.appleAlbumId,
      kidProfileId: args.kidProfileId,
    });

    // Get ALL album records for this appleAlbumId (there may be multiple per-kid records)
    const allAlbumRecords = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    console.log('[removeAlbumFromDiscoverForKid] Found', allAlbumRecords.length, 'album records');

    // Find the one that has featured=true (this is the Discover record)
    const album = allAlbumRecords.find(a => a.featured === true);

    console.log('[removeAlbumFromDiscoverForKid] Featured album:', album ? {
      _id: album._id,
      albumName: album.albumName,
      featured: album.featured,
      featuredForKids: album.featuredForKids,
      kidProfileId: album.kidProfileId,
    } : 'null');

    if (!album) {
      return { success: false, error: `Album not in Discover (found ${allAlbumRecords.length} records, none with featured=true)` };
    }

    // Get all kid profiles for this user
    const allKids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const currentFeaturedForKids = album.featuredForKids || [];
    let newFeaturedForKids: string[];

    if (currentFeaturedForKids.length === 0) {
      // Album is available to ALL kids - need to explicitly set it to all EXCEPT this kid
      newFeaturedForKids = allKids
        .filter((k) => k._id !== args.kidProfileId)
        .map((k) => k._id as string);
    } else {
      // Album is already restricted to specific kids - remove this kid from the list
      newFeaturedForKids = currentFeaturedForKids.filter(
        (id) => id !== args.kidProfileId
      );
    }

    // If no kids left, turn off featured entirely
    if (newFeaturedForKids.length === 0) {
      await ctx.db.patch(album._id, {
        featured: false,
        featuredForKids: [],
      });
      return { success: true, message: "Album removed from Discover entirely" };
    }

    // Update with new kid list
    await ctx.db.patch(album._id, {
      featuredForKids: newFeaturedForKids,
    });

    return {
      success: true,
      message: `Album now available to ${newFeaturedForKids.length} kid(s)`,
      remainingKids: newFeaturedForKids.length,
    };
  },
});

// Set discoverable (featured) status for an album by appleAlbumId
// UNIFIED MODEL: Updates the ONE album record for this user
// Optionally specify which kids can see the album in Discover (empty = all kids)
export const setAlbumDiscoverable = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    discoverable: v.boolean(),
    featuredForKids: v.optional(v.array(v.id("kidProfiles"))), // Which kids can see this (empty/null = all kids)
  },
  handler: async (ctx, args) => {
    // Get THE album record (UNIFIED: only one per album)
    const album = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .first();

    if (album) {
      const updateData: { featured: boolean; featuredForKids?: string[] } = {
        featured: args.discoverable,
      };

      // If turning on discover and kids specified, set which kids can see it
      if (args.discoverable && args.featuredForKids !== undefined) {
        updateData.featuredForKids = args.featuredForKids as string[];
      }
      // If turning off discover, clear the kid restrictions
      if (!args.discoverable) {
        updateData.featuredForKids = [];
      }

      await ctx.db.patch(album._id, updateData);
      return 1;
    }

    return 0;
  },
});

// Get featured (discoverable) albums for a user
// UNIFIED MODEL: Simply returns albums where featured=true
export const getFeaturedAlbums = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // UNIFIED: One record per album, just filter by featured flag
    const allFeaturedAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_featured", (q) =>
        q.eq("userId", args.userId).eq("featured", true)
      )
      .collect();

    // Deduplicate albums by appleAlbumId (keep first occurrence with best data)
    const albumMap = new Map();
    for (const album of allFeaturedAlbums) {
      const key = album.appleAlbumId || `${album.albumName}:${album.artistName}`;
      if (!albumMap.has(key)) {
        albumMap.set(key, album);
      } else {
        // Keep the one with better data (prefer one with artwork)
        const existing = albumMap.get(key);
        if (!existing.artworkUrl && album.artworkUrl) {
          albumMap.set(key, album);
        }
      }
    }

    return Array.from(albumMap.values());
  },
});

// Get featured songs for a user
export const getFeaturedSongs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_featured", (q) =>
        q.eq("userId", args.userId).eq("featured", true)
      )
      .collect();
  },
});

// Add an album directly to Discover (featured=true, stores album and tracks)
// This is used when parent adds album from search to Discover section
export const addAlbumToDiscover = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    releaseDate: v.optional(v.string()),
    genres: v.optional(v.array(v.string())),
    kidProfileIds: v.optional(v.array(v.id("kidProfiles"))), // Which kids can see this in Discover
    hideArtwork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log('[addAlbumToDiscover] Adding album:', args.albumName, 'for kids:', args.kidProfileIds);

    // Check if album already exists for this user
    const existing = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .first();

    if (existing) {
      // Album exists - update featured status and kid access
      const updateData: { featured: boolean; featuredForKids?: string[]; hideArtwork?: boolean } = { featured: true };
      if (args.kidProfileIds && args.kidProfileIds.length > 0) {
        // Merge with existing kids if any
        const existingKids = existing.featuredForKids || [];
        const mergedKids = [...new Set([...existingKids, ...args.kidProfileIds])];
        updateData.featuredForKids = mergedKids as string[];
      }
      if (args.hideArtwork !== undefined) {
        updateData.hideArtwork = args.hideArtwork;
      }
      await ctx.db.patch(existing._id, updateData);
      console.log('[addAlbumToDiscover] Album already exists, updated featured status');
      return existing._id;
    }

    // Create new album with featured=true
    const newId = await ctx.db.insert("approvedAlbums", {
      userId: args.userId,
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
      artistName: args.artistName,
      artworkUrl: args.artworkUrl,
      trackCount: args.trackCount,
      releaseYear: args.releaseDate,
      genres: args.genres,
      featured: true,
      featuredForKids: args.kidProfileIds, // Store which kids can see this
      hideArtwork: args.hideArtwork,
      approvedAt: Date.now(),
    });

    console.log('[addAlbumToDiscover] Created new featured album:', newId);
    return newId;
  },
});

// Remove album from Discover COMPLETELY (all records)
// This handles the legacy per-kid model where multiple records exist with featured=true
export const removeAlbumFromDiscoverCompletely = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get ALL album records for this appleAlbumId
    const allAlbumRecords = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    let updated = 0;
    for (const album of allAlbumRecords) {
      if (album.featured === true) {
        await ctx.db.patch(album._id, {
          featured: false,
          featuredForKids: [],
        });
        updated++;
      }
    }

    return {
      success: true,
      message: `Removed ${updated} featured record(s) for album`,
      totalRecords: allAlbumRecords.length,
      updatedRecords: updated,
    };
  },
});

// Get all featured (discoverable) content for a kid profile
// Albums are filtered by featuredForKids if set, otherwise available to all kids
export const getFeaturedContentForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get kid profile to find userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) return { albums: [], playlists: [] };

    // Get all featured albums for this user
    const allFeaturedAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_featured", (q) =>
        q.eq("userId", kidProfile.userId).eq("featured", true)
      )
      .collect();

    // Filter by kid access: include album if:
    // 1. featuredForKids is null/undefined/empty (available to all kids), OR
    // 2. This kid's ID is in the featuredForKids array
    const filteredAlbums = allFeaturedAlbums.filter(album => {
      if (!album.featuredForKids || album.featuredForKids.length === 0) {
        return true; // Available to all kids
      }
      return album.featuredForKids.includes(args.kidProfileId);
    });

    // Deduplicate albums by appleAlbumId (keep first occurrence with best data)
    const albumMap = new Map();
    for (const album of filteredAlbums) {
      const key = album.appleAlbumId || `${album.albumName}:${album.artistName}`;
      if (!albumMap.has(key)) {
        albumMap.set(key, album);
      } else {
        // Keep the one with better data (prefer one with artwork)
        const existing = albumMap.get(key);
        if (!existing.artworkUrl && album.artworkUrl) {
          albumMap.set(key, album);
        }
      }
    }
    const albums = Array.from(albumMap.values());

    // Get all featured playlists for this user
    const allFeaturedPlaylists = await ctx.db
      .query("featuredPlaylists")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter playlists by kid access (same logic as albums)
    const playlists = allFeaturedPlaylists.filter(playlist => {
      if (!playlist.featuredForKids || playlist.featuredForKids.length === 0) {
        return true; // Available to all kids
      }
      return playlist.featuredForKids.includes(args.kidProfileId);
    });

    return { albums, playlists };
  },
});
