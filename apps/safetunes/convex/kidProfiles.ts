import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
// getKidProfiles + createKidProfile stay SOFT (reachable from the tokenless kid
// family-code path); all other parent-only endpoints use the hard variants.
import { requireOwnerSoft, requireOwner, requireProfileOwner } from "./identity";
import { hashPin, verifyPin, isHashedPin } from "./safeAuth";

// PINs are 4 digits (10k combinations) — the lockout is the real defense,
// hashing removes the at-rest plaintext. See safeAuth.ts.
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MS = 5 * 60 * 1000;

// Get all kid profiles for a user
export const getKidProfiles = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "kidProfiles.getKidProfiles");
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

    // Never ship the PIN (or its hash) to the kid client — the kid side only
    // needs to know whether a PIN gate exists. Verification happens
    // server-side via attemptKidPin.
    return {
      userId: user._id,
      familyName: user.name,
      profiles: profiles.map(({ pin, ...rest }) => ({
        ...rest,
        hasPin: Boolean(pin),
      })),
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

// Verify kid PIN (read-only compat shim — prefer attemptKidPin, which
// enforces the failed-attempt lockout).
export const verifyKidPin = query({
  args: {
    profileId: v.id("kidProfiles"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile?.pin) return false;
    if (profile.pinLockedUntil && profile.pinLockedUntil > Date.now()) return false;
    return await verifyPin(args.pin, profile.pin);
  },
});

// Verify kid PIN with lockout enforcement. 5 wrong attempts locks the
// profile's PIN entry for 5 minutes. Successful verification resets the
// counter and transparently upgrades legacy plaintext PINs to PBKDF2.
export const attemptKidPin = mutation({
  args: {
    profileId: v.id("kidProfiles"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile?.pin) return { valid: false, locked: false };

    const now = Date.now();
    if (profile.pinLockedUntil && profile.pinLockedUntil > now) {
      return {
        valid: false,
        locked: true,
        retryAfterSeconds: Math.ceil((profile.pinLockedUntil - now) / 1000),
      };
    }

    const valid = await verifyPin(args.pin, profile.pin);
    if (valid) {
      const patch: Record<string, unknown> = {
        pinFailedAttempts: 0,
        pinLockedUntil: undefined,
      };
      // Lazy migration: re-store legacy plaintext PINs as PBKDF2 hashes.
      if (!isHashedPin(profile.pin)) {
        patch.pin = await hashPin(args.pin);
      }
      await ctx.db.patch(args.profileId, patch);
      return { valid: true, locked: false };
    }

    const attempts = (profile.pinFailedAttempts ?? 0) + 1;
    const locked = attempts >= PIN_MAX_ATTEMPTS;
    await ctx.db.patch(args.profileId, {
      pinFailedAttempts: locked ? 0 : attempts,
      pinLockedUntil: locked ? now + PIN_LOCK_MS : undefined,
    });
    return {
      valid: false,
      locked,
      retryAfterSeconds: locked ? Math.ceil(PIN_LOCK_MS / 1000) : undefined,
    };
  },
});

// One-time migration: hash any legacy plaintext kid PINs (kidProfiles +
// archivedKidProfiles). Idempotent — already-hashed PINs are skipped.
// Run: npx convex run kidProfiles:migrateKidPinsToHash --prod
export const migrateKidPinsToHash = internalMutation({
  args: {},
  handler: async (ctx) => {
    let migrated = 0;
    const profiles = await ctx.db.query("kidProfiles").collect();
    for (const p of profiles) {
      if (p.pin && !isHashedPin(p.pin)) {
        await ctx.db.patch(p._id, { pin: await hashPin(p.pin) });
        migrated++;
      }
    }
    const archived = await ctx.db.query("archivedKidProfiles").collect();
    for (const a of archived) {
      if (a.pin && !isHashedPin(a.pin)) {
        await ctx.db.patch(a._id, { pin: await hashPin(a.pin) });
        migrated++;
      }
    }
    return { migrated };
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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "kidProfiles.createKidProfile");
    return await ctx.db.insert("kidProfiles", {
      userId: args.userId,
      name: args.name,
      avatar: args.avatar,
      color: args.color,
      pin: args.pin ? await hashPin(args.pin) : undefined,
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

// Internal mutation to create kid profile (used by HTTP endpoint for onboarding)
export const createKidProfileInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()),
    dailyLimitMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kidProfiles", {
      userId: args.userId,
      name: args.name,
      color: args.color || "purple",
      createdAt: Date.now(),
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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profileId, userToken, ...updates } = args;
    await requireProfileOwner(ctx, userToken, profileId, "kidProfiles.updateKidProfile");

    // Filter out undefined values
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    // Never store a plaintext PIN; empty string removes the PIN.
    if (typeof definedUpdates.pin === "string") {
      if (definedUpdates.pin === "") {
        delete definedUpdates.pin;
        await ctx.db.patch(profileId, { pin: undefined, pinFailedAttempts: undefined, pinLockedUntil: undefined });
      } else {
        definedUpdates.pin = await hashPin(definedUpdates.pin);
      }
    }

    await ctx.db.patch(profileId, definedUpdates);
  },
});

// Delete kid profile
export const deleteKidProfile = mutation({
  args: { profileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireProfileOwner(ctx, args.userToken, args.profileId, "kidProfiles.deleteKidProfile");
    await ctx.db.delete(args.profileId);
  },
});

// Toggle music access for a kid (used by parent to pause/unpause music)
export const setMusicPaused = mutation({
  args: {
    profileId: v.id("kidProfiles"),
    paused: v.boolean(),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProfileOwner(ctx, args.userToken, args.profileId, "kidProfiles.setMusicPaused");
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
  args: { profileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfileOwner(ctx, args.userToken, args.profileId, "kidProfiles.resetKidProfile");
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
  args: { profileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfileOwner(ctx, args.userToken, args.profileId, "kidProfiles.archiveAndDeleteKidProfile");
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
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userToken, args.userId, "kidProfiles.getArchivedProfiles");
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
  args: { archiveId: v.id("archivedKidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const archive = await ctx.db.get(args.archiveId);
    if (!archive) {
      throw new Error("Archive not found");
    }
    await requireOwner(ctx, args.userToken, archive.userId, "kidProfiles.restoreKidProfile");

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
  args: { archiveId: v.id("archivedKidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const archive = await ctx.db.get(args.archiveId);
    if (!archive) {
      throw new Error("Archive not found");
    }
    await requireOwner(ctx, args.userToken, archive.userId, "kidProfiles.permanentlyDeleteArchive");
    await ctx.db.delete(args.archiveId);
    return { success: true };
  },
});
