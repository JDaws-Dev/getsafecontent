import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all kid profiles for a user
export const getKidProfiles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get kid profiles by family code (for child login)
export const getKidProfilesByFamilyCode = query({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    // First, find the user with this family code
    const user = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) => q.eq("familyCode", args.familyCode))
      .first();

    if (!user) {
      return null;
    }

    // Then get all kid profiles for that user
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      userId: user._id,
      familyName: user.name,
      profiles: profiles,
    };
  },
});

// Get a single kid profile by ID
export const getKidProfile = query({
  args: { profileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.profileId);
  },
});

// Verify kid PIN
export const verifyKidPin = query({
  args: {
    profileId: v.id("kidProfiles"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    return profile?.pin === args.pin;
  },
});

// Create a new kid profile
export const createKidProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    pin: v.optional(v.string()), // Optional - for sibling protection
    ageRange: v.optional(v.string()),
    favoriteGenres: v.optional(v.array(v.string())),
    favoriteArtists: v.optional(v.array(v.string())),
    musicPreferences: v.optional(v.string()),
    dailyLimitMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kidProfiles", {
      userId: args.userId,
      name: args.name,
      avatar: args.avatar,
      color: args.color,
      pin: args.pin,
      createdAt: Date.now(),
      ageRange: args.ageRange,
      favoriteGenres: args.favoriteGenres,
      favoriteArtists: args.favoriteArtists,
      musicPreferences: args.musicPreferences,
      dailyTimeLimitMinutes: args.dailyLimitMinutes,
      timeLimitEnabled: args.dailyLimitMinutes !== undefined && args.dailyLimitMinutes > 0,
    });
  },
});

// Update kid profile
export const updateKidProfile = mutation({
  args: {
    profileId: v.id("kidProfiles"),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    pin: v.optional(v.string()),
    ageRange: v.optional(v.string()),
    favoriteGenres: v.optional(v.array(v.string())),
    favoriteArtists: v.optional(v.array(v.string())),
    musicPreferences: v.optional(v.string()),
    dailyTimeLimitMinutes: v.optional(v.number()),
    timeLimitEnabled: v.optional(v.boolean()),
    // Time-of-day restrictions
    allowedStartTime: v.optional(v.string()),
    allowedEndTime: v.optional(v.string()),
    timeOfDayEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { profileId, ...updates } = args;

    // Filter out undefined values
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(profileId, definedUpdates);
  },
});

// Delete kid profile
export const deleteKidProfile = mutation({
  args: { profileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.profileId);
  },
});

// Toggle music access for a kid (used by parent to pause/unpause music)
export const setMusicPaused = mutation({
  args: {
    profileId: v.id("kidProfiles"),
    paused: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.profileId, {
      musicPaused: args.paused,
    });
    return { success: true, paused: args.paused };
  },
});

// ============================================
// RESET KID PROFILE - Clears ALL data, keeps profile
// ============================================
// This gives the kid a fresh start - removes all their music, playlists,
// listening history, requests, etc. The profile itself remains.
export const resetKidProfile = mutation({
  args: { profileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Kid profile not found");
    }

    // 1. Delete all approved songs for this kid
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const song of songs) {
      await ctx.db.delete(song._id);
    }

    // 2. Delete all playlists for this kid
    const playlists = await ctx.db
      .query("playlists")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const playlist of playlists) {
      await ctx.db.delete(playlist._id);
    }

    // 3. Delete all recently played for this kid
    const recentlyPlayed = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const item of recentlyPlayed) {
      await ctx.db.delete(item._id);
    }

    // 4. Delete all daily listening time records
    const listeningTime = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const item of listeningTime) {
      await ctx.db.delete(item._id);
    }

    // 5. Delete all album requests for this kid
    const albumRequests = await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const request of albumRequests) {
      await ctx.db.delete(request._id);
    }

    // 6. Delete all song requests for this kid
    const songRequests = await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const request of songRequests) {
      await ctx.db.delete(request._id);
    }

    // 7. Delete all blocked searches for this kid
    const blockedSearches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const search of blockedSearches) {
      await ctx.db.delete(search._id);
    }

    // 8. Delete discovery history for this kid
    const discoveryHistory = await ctx.db
      .query("discoveryHistory")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const item of discoveryHistory) {
      await ctx.db.delete(item._id);
    }

    return {
      success: true,
      deletedCounts: {
        songs: songs.length,
        playlists: playlists.length,
        recentlyPlayed: recentlyPlayed.length,
        listeningTime: listeningTime.length,
        albumRequests: albumRequests.length,
        songRequests: songRequests.length,
        blockedSearches: blockedSearches.length,
        discoveryHistory: discoveryHistory.length,
      },
    };
  },
});

// ============================================
// ARCHIVE AND DELETE KID PROFILE
// ============================================
// Archives all kid data for 30 days, then deletes the profile.
// Parent can restore within 30 days.
export const archiveAndDeleteKidProfile = mutation({
  args: { profileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Kid profile not found");
    }

    // Collect all data to archive
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();

    const playlists = await ctx.db
      .query("playlists")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();

    const recentlyPlayed = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();

    const albumRequests = await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();

    const songRequests = await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();

    const blockedSearches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.profileId))
      .collect();

    // Create archive record
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("archivedKidProfiles", {
      userId: profile.userId,
      originalProfileId: args.profileId,
      name: profile.name,
      avatar: profile.avatar,
      color: profile.color,
      pin: profile.pin,
      originalCreatedAt: profile.createdAt,
      favoriteGenres: profile.favoriteGenres,
      favoriteArtists: profile.favoriteArtists,
      ageRange: profile.ageRange,
      musicPreferences: profile.musicPreferences,
      dailyTimeLimitMinutes: profile.dailyTimeLimitMinutes,
      timeLimitEnabled: profile.timeLimitEnabled,
      archivedSongs: JSON.stringify(songs),
      archivedPlaylists: JSON.stringify(playlists),
      archivedRecentlyPlayed: JSON.stringify(recentlyPlayed),
      archivedRequests: JSON.stringify([...albumRequests, ...songRequests]),
      archivedBlockedSearches: JSON.stringify(blockedSearches),
      archivedAt: now,
      expiresAt: now + thirtyDaysMs,
      archiveReason: "deleted_by_parent",
    });

    // Delete all data
    for (const song of songs) await ctx.db.delete(song._id);
    for (const playlist of playlists) await ctx.db.delete(playlist._id);
    for (const item of recentlyPlayed) await ctx.db.delete(item._id);
    for (const request of albumRequests) await ctx.db.delete(request._id);
    for (const request of songRequests) await ctx.db.delete(request._id);
    for (const search of blockedSearches) await ctx.db.delete(search._id);

    // Delete daily listening time
    const listeningTime = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const item of listeningTime) await ctx.db.delete(item._id);

    // Delete discovery history
    const discoveryHistory = await ctx.db
      .query("discoveryHistory")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const item of discoveryHistory) await ctx.db.delete(item._id);

    // Finally delete the profile
    await ctx.db.delete(args.profileId);

    return {
      success: true,
      archivedUntil: new Date(now + thirtyDaysMs).toISOString(),
      archivedCounts: {
        songs: songs.length,
        playlists: playlists.length,
        recentlyPlayed: recentlyPlayed.length,
        requests: albumRequests.length + songRequests.length,
        blockedSearches: blockedSearches.length,
      },
    };
  },
});

// ============================================
// GET ARCHIVED PROFILES
// ============================================
export const getArchivedProfiles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const archives = await ctx.db
      .query("archivedKidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter out expired archives and add days remaining
    return archives
      .filter((archive) => archive.expiresAt > now)
      .map((archive) => ({
        ...archive,
        daysRemaining: Math.ceil((archive.expiresAt - now) / (24 * 60 * 60 * 1000)),
        songCount: archive.archivedSongs ? JSON.parse(archive.archivedSongs).length : 0,
        playlistCount: archive.archivedPlaylists ? JSON.parse(archive.archivedPlaylists).length : 0,
      }));
  },
});

// ============================================
// RESTORE KID PROFILE FROM ARCHIVE
// ============================================
export const restoreKidProfile = mutation({
  args: { archiveId: v.id("archivedKidProfiles") },
  handler: async (ctx, args) => {
    const archive = await ctx.db.get(args.archiveId);
    if (!archive) {
      throw new Error("Archive not found");
    }

    if (archive.expiresAt < Date.now()) {
      throw new Error("This archive has expired and cannot be restored");
    }

    // 1. Recreate the kid profile
    const newProfileId = await ctx.db.insert("kidProfiles", {
      userId: archive.userId,
      name: archive.name,
      avatar: archive.avatar,
      color: archive.color,
      pin: archive.pin,
      createdAt: Date.now(), // New creation time
      favoriteGenres: archive.favoriteGenres,
      favoriteArtists: archive.favoriteArtists,
      ageRange: archive.ageRange,
      musicPreferences: archive.musicPreferences,
      dailyTimeLimitMinutes: archive.dailyTimeLimitMinutes,
      timeLimitEnabled: archive.timeLimitEnabled,
    });

    // 2. Restore songs (with new kidProfileId)
    let songsRestored = 0;
    if (archive.archivedSongs) {
      const songs = JSON.parse(archive.archivedSongs);
      for (const song of songs) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, _creationTime, kidProfileId, ...songData } = song;
        await ctx.db.insert("approvedSongs", {
          ...songData,
          kidProfileId: newProfileId,
          approvedAt: Date.now(),
        });
        songsRestored++;
      }
    }

    // 3. Restore playlists (with new kidProfileId)
    let playlistsRestored = 0;
    if (archive.archivedPlaylists) {
      const playlists = JSON.parse(archive.archivedPlaylists);
      for (const playlist of playlists) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, _creationTime, kidProfileId, ...playlistData } = playlist;
        await ctx.db.insert("playlists", {
          ...playlistData,
          kidProfileId: newProfileId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        playlistsRestored++;
      }
    }

    // 4. Delete the archive record
    await ctx.db.delete(args.archiveId);

    return {
      success: true,
      newProfileId,
      restored: {
        songs: songsRestored,
        playlists: playlistsRestored,
      },
    };
  },
});

// ============================================
// PERMANENTLY DELETE ARCHIVE (skip restore)
// ============================================
export const permanentlyDeleteArchive = mutation({
  args: { archiveId: v.id("archivedKidProfiles") },
  handler: async (ctx, args) => {
    const archive = await ctx.db.get(args.archiveId);
    if (!archive) {
      throw new Error("Archive not found");
    }
    await ctx.db.delete(args.archiveId);
    return { success: true };
  },
});
