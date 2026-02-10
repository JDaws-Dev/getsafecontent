import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Delete a user and all their associated data by email (admin use via HTTP endpoint)
export const deleteUserByEmailInternal = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Get kid profiles first (needed for cascade deletes)
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Delete data for each kid profile
    for (const kid of kidProfiles) {
      // Delete playlists
      const playlists = await ctx.db
        .query("playlists")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const p of playlists) {
        await ctx.db.delete(p._id);
      }

      // Delete recently played
      const recentlyPlayed = await ctx.db
        .query("recentlyPlayed")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const rp of recentlyPlayed) {
        await ctx.db.delete(rp._id);
      }

      // Delete daily listening time
      const dailyTime = await ctx.db
        .query("dailyListeningTime")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const dt of dailyTime) {
        await ctx.db.delete(dt._id);
      }

      // Delete blocked searches
      const blockedSearches = await ctx.db
        .query("blockedSearches")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const bs of blockedSearches) {
        await ctx.db.delete(bs._id);
      }

      // Delete album requests
      const albumRequests = await ctx.db
        .query("albumRequests")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const ar of albumRequests) {
        await ctx.db.delete(ar._id);
      }

      // Delete song requests
      const songRequests = await ctx.db
        .query("songRequests")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const sr of songRequests) {
        await ctx.db.delete(sr._id);
      }

      // Delete the kid profile
      await ctx.db.delete(kid._id);
    }

    // Delete approved albums
    const approvedAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const aa of approvedAlbums) {
      await ctx.db.delete(aa._id);
    }

    // Delete approved songs
    const approvedSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const as of approvedSongs) {
      await ctx.db.delete(as._id);
    }

    // Delete album tracks
    const albumTracks = await ctx.db
      .query("albumTracks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const at of albumTracks) {
      await ctx.db.delete(at._id);
    }

    // Delete featured playlists and their tracks
    const featuredPlaylists = await ctx.db
      .query("featuredPlaylists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const fp of featuredPlaylists) {
      // Delete tracks for this playlist
      const tracks = await ctx.db
        .query("featuredPlaylistTracks")
        .withIndex("by_playlist", (q) => q.eq("playlistId", fp._id))
        .collect();
      for (const t of tracks) {
        await ctx.db.delete(t._id);
      }
      await ctx.db.delete(fp._id);
    }

    // Delete pre-approved content
    const preApproved = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const pa of preApproved) {
      await ctx.db.delete(pa._id);
    }

    // Delete discovery history
    const discovery = await ctx.db
      .query("discoveryHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const d of discovery) {
      await ctx.db.delete(d._id);
    }

    // Delete subscription events
    const subEvents = await ctx.db
      .query("subscriptionEvents")
      .withIndex("email", (q) => q.eq("email", args.email))
      .collect();
    for (const se of subEvents) {
      await ctx.db.delete(se._id);
    }

    // Delete email notification batches
    const emailBatches = await ctx.db
      .query("emailNotificationBatch")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const eb of emailBatches) {
      await ctx.db.delete(eb._id);
    }

    // Delete push subscriptions
    const pushSubs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const ps of pushSubs) {
      await ctx.db.delete(ps._id);
    }

    // Delete archived kid profiles
    const archivedKids = await ctx.db
      .query("archivedKidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const ak of archivedKids) {
      await ctx.db.delete(ak._id);
    }

    // Finally, delete the user
    await ctx.db.delete(user._id);

    return {
      deletedUser: args.email,
      deletedKids: kidProfiles.length,
      deletedAlbums: approvedAlbums.length,
      deletedSongs: approvedSongs.length,
      deletedPlaylists: featuredPlaylists.length,
    };
  },
});

// Get all users with kid profile counts, song/album counts, and recent activity (admin only)
export const getAllUsersWithKids = query({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("users").collect();

    // For each user, get detailed stats
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Get kid profiles
        const kidProfiles = await ctx.db
          .query("kidProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        // Get approved songs count
        const approvedSongs = await ctx.db
          .query("approvedSongs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        // Get approved albums count
        const approvedAlbums = await ctx.db
          .query("approvedAlbums")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        // Get most recent activity (last played item across all kids)
        let lastActivity = null;
        for (const kid of kidProfiles) {
          const recentPlays = await ctx.db
            .query("recentlyPlayed")
            .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
            .order("desc")
            .take(1);

          if (recentPlays.length > 0) {
            const play = recentPlays[0];
            if (!lastActivity || play.playedAt > lastActivity.playedAt) {
              lastActivity = {
                playedAt: play.playedAt,
                itemName: play.itemName,
                kidName: kid.name,
              };
            }
          }
        }

        return {
          ...user,
          kidCount: kidProfiles.length,
          songCount: approvedSongs.length,
          albumCount: approvedAlbums.length,
          lastActivity,
        };
      })
    );

    return usersWithStats;
  },
});
