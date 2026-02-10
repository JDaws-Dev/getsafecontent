import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get recently played items for a kid profile (filtered to only show approved songs)
export const getRecentlyPlayed = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // First get the kid profile to find the userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return [];
    }

    // Get all approved song IDs for this kid
    const approvedSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Create a Set of approved song IDs for fast lookup
    // Only include songs specifically approved for THIS kid
    // Do NOT include songs with null kidProfileId (legacy data needs migration)
    const approvedSongIds = new Set(
      approvedSongs
        .filter(song => song.kidProfileId === args.kidProfileId)
        .map(song => song.appleSongId)
    );

    // Get recently played items
    const items = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_and_played", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(50); // Fetch more than needed since some may be filtered out

    // Filter to only include items that are still approved
    const filteredItems = items.filter(item => {
      // If it's a song, check if it's still approved
      if (item.itemType === 'song' && item.itemId) {
        return approvedSongIds.has(item.itemId);
      }
      // For other item types (albums, playlists), keep them for now
      return true;
    });

    return filteredItems.slice(0, 20);
  },
});

// Get listening stats for a kid profile
export const getListeningStats = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const allItems = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // Calculate total plays and listening time
    let totalPlays = 0;
    let totalListenTimeMs = 0;
    const artistCounts: Record<string, { count: number; name: string }> = {};
    const songCounts: { item: typeof allItems[0]; count: number }[] = [];

    for (const item of allItems) {
      const playCount = item.playCount || 1;
      totalPlays += playCount;
      totalListenTimeMs += item.totalListenTimeMs || 0;

      // Track artist plays
      if (item.artistName) {
        if (!artistCounts[item.artistName]) {
          artistCounts[item.artistName] = { count: 0, name: item.artistName };
        }
        artistCounts[item.artistName].count += playCount;
      }

      // Track song plays
      songCounts.push({ item, count: playCount });
    }

    // Sort to get top artists and songs
    const topArtists = Object.values(artistCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topSongs = songCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(s => ({
        ...s.item,
        playCount: s.count,
      }));

    // Calculate listening time breakdown
    const totalMinutes = Math.floor(totalListenTimeMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);

    return {
      totalPlays,
      totalListenTimeMs,
      totalMinutes,
      totalHours,
      uniqueSongs: allItems.filter(i => i.itemType === 'song').length,
      topArtists,
      topSongs,
    };
  },
});

// Get all listening history for a kid (for parent dashboard)
export const getFullListeningHistory = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_and_played", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(100);

    return items;
  },
});

// Add an item to recently played
export const addRecentlyPlayed = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    itemType: v.string(),
    itemId: v.string(),
    itemName: v.string(),
    artistName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    durationInMillis: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if this item was already played recently
    const existing = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.eq(q.field("itemType"), args.itemType),
          q.eq(q.field("itemId"), args.itemId)
        )
      )
      .first();

    if (existing) {
      // Update the playedAt timestamp and increment play count
      const currentPlayCount = existing.playCount || 1;
      const currentListenTime = existing.totalListenTimeMs || 0;
      const songDuration = args.durationInMillis || existing.durationInMillis || 0;

      await ctx.db.patch(existing._id, {
        playedAt: Date.now(),
        playCount: currentPlayCount + 1,
        durationInMillis: songDuration || existing.durationInMillis,
        totalListenTimeMs: currentListenTime + songDuration,
      });
      return existing._id;
    }

    // Create new recently played entry
    const id = await ctx.db.insert("recentlyPlayed", {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      itemType: args.itemType,
      itemId: args.itemId,
      itemName: args.itemName,
      artistName: args.artistName,
      artworkUrl: args.artworkUrl,
      playedAt: Date.now(),
      playCount: 1,
      durationInMillis: args.durationInMillis,
      totalListenTimeMs: args.durationInMillis || 0,
    });

    // Keep only the most recent 100 items per kid (increased from 50)
    const allItems = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_and_played", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .collect();

    // Delete items beyond the 100th
    if (allItems.length > 100) {
      for (let i = 100; i < allItems.length; i++) {
        await ctx.db.delete(allItems[i]._id);
      }
    }

    return id;
  },
});

// Get most played songs (On Repeat) - sorted by play count (filtered to only show approved songs)
export const getMostPlayed = query({
  args: { kidProfileId: v.id("kidProfiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // First get the kid profile to find the userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return [];
    }

    // Get all approved song IDs for this kid
    const approvedSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Create a Set of approved song IDs for fast lookup
    // Only include songs specifically approved for THIS kid
    // Do NOT include songs with null kidProfileId (legacy data needs migration)
    const approvedSongIds = new Set(
      approvedSongs
        .filter(song => song.kidProfileId === args.kidProfileId)
        .map(song => song.appleSongId)
    );

    const allItems = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // Sort by play count descending, then by most recent
    // Filter to only show approved songs played at least twice
    const sorted = allItems
      .filter(item => {
        // Must be played at least twice
        if ((item.playCount || 1) < 2) return false;
        // Must be an approved song
        if (item.itemType === 'song' && item.itemId) {
          return approvedSongIds.has(item.itemId);
        }
        return true;
      })
      .sort((a, b) => {
        const countDiff = (b.playCount || 1) - (a.playCount || 1);
        if (countDiff !== 0) return countDiff;
        return (b.playedAt || 0) - (a.playedAt || 0);
      });

    const limit = args.limit || 50;
    return sorted.slice(0, limit);
  },
});

// Clear recently played for a kid profile
export const clearRecentlyPlayed = mutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});
