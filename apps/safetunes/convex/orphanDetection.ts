import { internalMutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Orphan Detection System  (rev 2026-05-21 — delta/heartbeat alerter)
 *
 * Detects data integrity issues where child records reference non-existent parent records.
 * Currently checks for:
 * - kidProfiles with no parent user
 * - approvedSongs/approvedAlbums with no parent user
 * - playlists with no parent kid profile
 * - requests with no parent kid profile
 *
 * Runs daily via cron job and sends alert email if orphans detected.
 */

export interface OrphanedRecord {
  table: string;
  recordId: string;
  missingParentId: string;
  recordInfo: string;
  createdAt?: number;
}

/**
 * Find all orphaned records in the database
 */
export const findOrphanedRecords = query({
  args: {},
  handler: async (ctx): Promise<{
    totalOrphans: number;
    orphanedRecords: OrphanedRecord[];
    summary: Record<string, number>;
  }> => {
    const orphanedRecords: OrphanedRecord[] = [];
    const summary: Record<string, number> = {};

    // 1. Check kidProfiles with missing users
    const allKidProfiles = await ctx.db.query("kidProfiles").collect();
    for (const profile of allKidProfiles) {
      const user = await ctx.db.get(profile.userId);
      if (!user) {
        orphanedRecords.push({
          table: "kidProfiles",
          recordId: profile._id,
          missingParentId: profile.userId,
          recordInfo: `Kid "${profile.name}" (color: ${profile.color || "unknown"})`,
          createdAt: profile.createdAt,
        });
        summary["kidProfiles"] = (summary["kidProfiles"] || 0) + 1;
      }
    }

    // 2. Check approvedSongs with missing users
    const allApprovedSongs = await ctx.db.query("approvedSongs").collect();
    for (const song of allApprovedSongs) {
      const user = await ctx.db.get(song.userId);
      if (!user) {
        orphanedRecords.push({
          table: "approvedSongs",
          recordId: song._id,
          missingParentId: song.userId,
          recordInfo: `"${song.songName}" by ${song.artistName}`,
          createdAt: song.approvedAt,
        });
        summary["approvedSongs"] = (summary["approvedSongs"] || 0) + 1;
      }
    }

    // 3. Check approvedAlbums with missing users
    const allApprovedAlbums = await ctx.db.query("approvedAlbums").collect();
    for (const album of allApprovedAlbums) {
      const user = await ctx.db.get(album.userId);
      if (!user) {
        orphanedRecords.push({
          table: "approvedAlbums",
          recordId: album._id,
          missingParentId: album.userId,
          recordInfo: `"${album.albumName}" by ${album.artistName}`,
          createdAt: album.approvedAt,
        });
        summary["approvedAlbums"] = (summary["approvedAlbums"] || 0) + 1;
      }
    }

    // 4. Check playlists with missing kid profiles
    const allPlaylists = await ctx.db.query("playlists").collect();
    for (const playlist of allPlaylists) {
      const kidProfile = await ctx.db.get(playlist.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "playlists",
          recordId: playlist._id,
          missingParentId: playlist.kidProfileId,
          recordInfo: `Playlist "${playlist.name}" (${playlist.songs?.length || 0} songs)`,
          createdAt: playlist.createdAt,
        });
        summary["playlists"] = (summary["playlists"] || 0) + 1;
      }
    }

    // 5. Check albumRequests with missing kid profiles
    const allAlbumRequests = await ctx.db.query("albumRequests").collect();
    for (const request of allAlbumRequests) {
      const kidProfile = await ctx.db.get(request.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "albumRequests",
          recordId: request._id,
          missingParentId: request.kidProfileId,
          recordInfo: `Album request for "${request.albumName}" (status: ${request.status})`,
          createdAt: request.requestedAt,
        });
        summary["albumRequests"] = (summary["albumRequests"] || 0) + 1;
      }
    }

    // 6. Check songRequests with missing kid profiles
    const allSongRequests = await ctx.db.query("songRequests").collect();
    for (const request of allSongRequests) {
      const kidProfile = await ctx.db.get(request.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "songRequests",
          recordId: request._id,
          missingParentId: request.kidProfileId,
          recordInfo: `Song request for "${request.songName}" (status: ${request.status})`,
          createdAt: request.requestedAt,
        });
        summary["songRequests"] = (summary["songRequests"] || 0) + 1;
      }
    }

    // 7. Check recentlyPlayed with missing kid profiles
    const allRecentlyPlayed = await ctx.db.query("recentlyPlayed").collect();
    for (const item of allRecentlyPlayed) {
      const kidProfile = await ctx.db.get(item.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "recentlyPlayed",
          recordId: item._id,
          missingParentId: item.kidProfileId,
          recordInfo: `Recently played "${item.itemName}"`,
          createdAt: item.playedAt,
        });
        summary["recentlyPlayed"] = (summary["recentlyPlayed"] || 0) + 1;
      }
    }

    // 8. Check blockedSearches with missing kid profiles
    const allBlockedSearches = await ctx.db.query("blockedSearches").collect();
    for (const search of allBlockedSearches) {
      const kidProfile = await ctx.db.get(search.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "blockedSearches",
          recordId: search._id,
          missingParentId: search.kidProfileId,
          recordInfo: `Blocked search "${search.searchQuery}"`,
          createdAt: search.searchedAt,
        });
        summary["blockedSearches"] = (summary["blockedSearches"] || 0) + 1;
      }
    }

    return {
      totalOrphans: orphanedRecords.length,
      orphanedRecords,
      summary,
    };
  },
});

/**
 * Check for orphans and send alert email per the noise-reduction policy:
 *   - Delegates orphan discovery to findOrphanedRecords (single source of truth — no drift)
 *   - Emails only when the count changed since last check, OR once a week on Sunday as a heartbeat
 *   - Stable counts on non-Sunday days are silent (the alert that fires every day teaches you to ignore it)
 * Called daily by cron job.
 */
export const checkAndAlertOrphans = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Use findOrphanedRecords so this can't drift from the admin view again
    const orphanData = await ctx.runQuery(api.orphanDetection.findOrphanedRecords, {});
    const { totalOrphans, orphanedRecords, summary } = orphanData;

    // Pull the most recent prior check
    const previousCheck = await ctx.db
      .query("orphanCheckHistory")
      .withIndex("by_checkedAt")
      .order("desc")
      .first();

    const previousTotal = previousCheck?.totalOrphans ?? null;
    const isFirstRun = previousCheck === null;
    const isSunday = new Date().getUTCDay() === 0;
    const countChanged = previousTotal !== null && previousTotal !== totalOrphans;

    let emailReason: "delta" | "heartbeat" | "first-run" | "silent";
    if (isFirstRun) {
      emailReason = totalOrphans > 0 ? "first-run" : "silent";
    } else if (countChanged) {
      emailReason = "delta";
    } else if (isSunday) {
      emailReason = "heartbeat";
    } else {
      emailReason = "silent";
    }

    const shouldEmail = emailReason !== "silent";

    console.log(
      `Orphan check: total=${totalOrphans} prev=${previousTotal} reason=${emailReason} email=${shouldEmail}`
    );

    if (shouldEmail) {
      await ctx.scheduler.runAfter(0, internal.emails.sendOrphanAlertEmail, {
        totalOrphans,
        summary,
        sampleRecords: orphanedRecords.slice(0, 10),
        previousTotal: previousTotal ?? undefined,
        kind: emailReason,
      });
    }

    await ctx.db.insert("orphanCheckHistory", {
      checkedAt: Date.now(),
      totalOrphans,
      summaryJson: JSON.stringify(summary),
      emailSent: shouldEmail,
      emailReason,
    });

    return {
      totalOrphans,
      summary,
      alertSent: shouldEmail,
      emailReason,
      previousTotal,
    };
  },
});

/**
 * Delete orphaned records (with confirmation)
 * Only deletes records that have no parent
 */
export const deleteOrphanedRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    let deletedCount = 0;
    const deletedByTable: Record<string, number> = {};

    // 1. Delete orphaned kidProfiles (and cascade to their children)
    const allKidProfiles = await ctx.db.query("kidProfiles").collect();
    for (const profile of allKidProfiles) {
      const user = await ctx.db.get(profile.userId);
      if (!user) {
        // First delete child records that reference this kid profile
        const playlists = await ctx.db
          .query("playlists")
          .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const playlist of playlists) {
          await ctx.db.delete(playlist._id);
          deletedByTable["playlists"] = (deletedByTable["playlists"] || 0) + 1;
        }

        const albumRequests = await ctx.db
          .query("albumRequests")
          .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const request of albumRequests) {
          await ctx.db.delete(request._id);
          deletedByTable["albumRequests"] = (deletedByTable["albumRequests"] || 0) + 1;
        }

        const songRequests = await ctx.db
          .query("songRequests")
          .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const request of songRequests) {
          await ctx.db.delete(request._id);
          deletedByTable["songRequests"] = (deletedByTable["songRequests"] || 0) + 1;
        }

        const recentlyPlayed = await ctx.db
          .query("recentlyPlayed")
          .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const item of recentlyPlayed) {
          await ctx.db.delete(item._id);
          deletedByTable["recentlyPlayed"] = (deletedByTable["recentlyPlayed"] || 0) + 1;
        }

        const blockedSearches = await ctx.db
          .query("blockedSearches")
          .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const search of blockedSearches) {
          await ctx.db.delete(search._id);
          deletedByTable["blockedSearches"] = (deletedByTable["blockedSearches"] || 0) + 1;
        }

        // Now delete the kid profile itself
        await ctx.db.delete(profile._id);
        deletedByTable["kidProfiles"] = (deletedByTable["kidProfiles"] || 0) + 1;
        deletedCount++;
      }
    }

    // 2. Delete orphaned approvedSongs (user deleted)
    const allApprovedSongs = await ctx.db.query("approvedSongs").collect();
    for (const song of allApprovedSongs) {
      const user = await ctx.db.get(song.userId);
      if (!user) {
        await ctx.db.delete(song._id);
        deletedByTable["approvedSongs"] = (deletedByTable["approvedSongs"] || 0) + 1;
        deletedCount++;
      }
    }

    // 3. Delete orphaned approvedAlbums (user deleted)
    const allApprovedAlbums = await ctx.db.query("approvedAlbums").collect();
    for (const album of allApprovedAlbums) {
      const user = await ctx.db.get(album.userId);
      if (!user) {
        await ctx.db.delete(album._id);
        deletedByTable["approvedAlbums"] = (deletedByTable["approvedAlbums"] || 0) + 1;
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} orphaned records:`, deletedByTable);

    return {
      deletedCount,
      deletedByTable,
    };
  },
});
