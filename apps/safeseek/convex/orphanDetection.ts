import { internalMutation, query } from "./_generated/server";

/**
 * Orphan Detection System for SafeStudy
 *
 * Detects data integrity issues where child records reference non-existent parent records.
 * Checks for:
 * - kidProfiles with no parent user
 * - searchHistory with no parent kid profile
 * - blockedSearches with no parent kid profile
 * - timeLimits with no parent kid profile
 * - tutorSessions with no parent kid profile
 * - topicRequests with no parent kid profile or user
 * - searchSettings with no parent user
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

    // 2. Check searchHistory with missing kid profiles
    const allSearchHistory = await ctx.db.query("searchHistory").collect();
    for (const entry of allSearchHistory) {
      const kidProfile = await ctx.db.get(entry.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "searchHistory",
          recordId: entry._id,
          missingParentId: entry.kidProfileId,
          recordInfo: `Search "${entry.query}" at ${new Date(entry.searchedAt).toISOString()}`,
          createdAt: entry.searchedAt,
        });
        summary["searchHistory"] = (summary["searchHistory"] || 0) + 1;
      }
    }

    // 3. Check blockedSearches with missing kid profiles
    const allBlockedSearches = await ctx.db.query("blockedSearches").collect();
    for (const entry of allBlockedSearches) {
      const kidProfile = await ctx.db.get(entry.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "blockedSearches",
          recordId: entry._id,
          missingParentId: entry.kidProfileId,
          recordInfo: `Blocked search "${entry.query}" (${entry.blockedReason})`,
          createdAt: entry.searchedAt,
        });
        summary["blockedSearches"] = (summary["blockedSearches"] || 0) + 1;
      }
    }

    // 4. Check timeLimits with missing kid profiles
    const allTimeLimits = await ctx.db.query("timeLimits").collect();
    for (const entry of allTimeLimits) {
      const kidProfile = await ctx.db.get(entry.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "timeLimits",
          recordId: entry._id,
          missingParentId: entry.kidProfileId,
          recordInfo: `Time limit (${entry.dailyLimitMinutes}min daily)`,
          createdAt: entry.updatedAt,
        });
        summary["timeLimits"] = (summary["timeLimits"] || 0) + 1;
      }
    }

    // 5. Check tutorSessions with missing kid profiles
    const allTutorSessions = await ctx.db.query("tutorSessions").collect();
    for (const session of allTutorSessions) {
      const kidProfile = await ctx.db.get(session.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "tutorSessions",
          recordId: session._id,
          missingParentId: session.kidProfileId,
          recordInfo: `Tutor session "${session.topic || "untitled"}" (${session.messages.length} messages)`,
          createdAt: session.startedAt,
        });
        summary["tutorSessions"] = (summary["tutorSessions"] || 0) + 1;
      }
    }

    // 6. Check topicRequests with missing kid profiles or users
    const allTopicRequests = await ctx.db.query("topicRequests").collect();
    for (const request of allTopicRequests) {
      const kidProfile = await ctx.db.get(request.kidProfileId);
      if (!kidProfile) {
        orphanedRecords.push({
          table: "topicRequests",
          recordId: request._id,
          missingParentId: request.kidProfileId,
          recordInfo: `Topic request "${request.query}" (status: ${request.status})`,
          createdAt: request.requestedAt,
        });
        summary["topicRequests"] = (summary["topicRequests"] || 0) + 1;
      } else {
        // Kid profile exists, but check if parent user exists
        const user = await ctx.db.get(request.userId);
        if (!user) {
          orphanedRecords.push({
            table: "topicRequests",
            recordId: request._id,
            missingParentId: request.userId as string,
            recordInfo: `Topic request "${request.query}" (missing parent user, status: ${request.status})`,
            createdAt: request.requestedAt,
          });
          summary["topicRequests"] = (summary["topicRequests"] || 0) + 1;
        }
      }
    }

    // 7. Check searchSettings with missing users
    const allSearchSettings = await ctx.db.query("searchSettings").collect();
    for (const setting of allSearchSettings) {
      const user = await ctx.db.get(setting.userId);
      if (!user) {
        orphanedRecords.push({
          table: "searchSettings",
          recordId: setting._id,
          missingParentId: setting.userId,
          recordInfo: `Search settings (safeSearch: ${setting.safeSearchLevel})`,
        });
        summary["searchSettings"] = (summary["searchSettings"] || 0) + 1;
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
 * Delete orphaned records (with cascading for orphaned kid profiles)
 */
export const deleteOrphanedRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    let deletedCount = 0;
    const deletedByTable: Record<string, number> = {};

    // 1. Delete orphaned kidProfiles and cascade to their children
    const allKidProfiles = await ctx.db.query("kidProfiles").collect();
    for (const profile of allKidProfiles) {
      const user = await ctx.db.get(profile.userId);
      if (!user) {
        // Delete child records for this orphaned kid profile
        const searchHistory = await ctx.db
          .query("searchHistory")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const h of searchHistory) {
          await ctx.db.delete(h._id);
          deletedByTable["searchHistory"] = (deletedByTable["searchHistory"] || 0) + 1;
        }

        const blockedSearches = await ctx.db
          .query("blockedSearches")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const b of blockedSearches) {
          await ctx.db.delete(b._id);
          deletedByTable["blockedSearches"] = (deletedByTable["blockedSearches"] || 0) + 1;
        }

        const timeLimits = await ctx.db
          .query("timeLimits")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const t of timeLimits) {
          await ctx.db.delete(t._id);
          deletedByTable["timeLimits"] = (deletedByTable["timeLimits"] || 0) + 1;
        }

        const tutorSessions = await ctx.db
          .query("tutorSessions")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const s of tutorSessions) {
          await ctx.db.delete(s._id);
          deletedByTable["tutorSessions"] = (deletedByTable["tutorSessions"] || 0) + 1;
        }

        const topicRequests = await ctx.db
          .query("topicRequests")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .collect();
        for (const r of topicRequests) {
          await ctx.db.delete(r._id);
          deletedByTable["topicRequests"] = (deletedByTable["topicRequests"] || 0) + 1;
        }

        // Delete the orphaned kid profile
        await ctx.db.delete(profile._id);
        deletedByTable["kidProfiles"] = (deletedByTable["kidProfiles"] || 0) + 1;
        deletedCount++;
      }
    }

    // 2. Delete remaining orphaned searchHistory (kid profile deleted but records left)
    const allSearchHistory = await ctx.db.query("searchHistory").collect();
    for (const entry of allSearchHistory) {
      const kidProfile = await ctx.db.get(entry.kidProfileId);
      if (!kidProfile) {
        await ctx.db.delete(entry._id);
        deletedByTable["searchHistory"] = (deletedByTable["searchHistory"] || 0) + 1;
        deletedCount++;
      }
    }

    // 3. Delete remaining orphaned blockedSearches
    const allBlockedSearches = await ctx.db.query("blockedSearches").collect();
    for (const entry of allBlockedSearches) {
      const kidProfile = await ctx.db.get(entry.kidProfileId);
      if (!kidProfile) {
        await ctx.db.delete(entry._id);
        deletedByTable["blockedSearches"] = (deletedByTable["blockedSearches"] || 0) + 1;
        deletedCount++;
      }
    }

    // 4. Delete remaining orphaned timeLimits
    const allTimeLimits = await ctx.db.query("timeLimits").collect();
    for (const entry of allTimeLimits) {
      const kidProfile = await ctx.db.get(entry.kidProfileId);
      if (!kidProfile) {
        await ctx.db.delete(entry._id);
        deletedByTable["timeLimits"] = (deletedByTable["timeLimits"] || 0) + 1;
        deletedCount++;
      }
    }

    // 5. Delete remaining orphaned tutorSessions
    const allTutorSessions = await ctx.db.query("tutorSessions").collect();
    for (const session of allTutorSessions) {
      const kidProfile = await ctx.db.get(session.kidProfileId);
      if (!kidProfile) {
        await ctx.db.delete(session._id);
        deletedByTable["tutorSessions"] = (deletedByTable["tutorSessions"] || 0) + 1;
        deletedCount++;
      }
    }

    // 6. Delete remaining orphaned topicRequests
    const allTopicRequests = await ctx.db.query("topicRequests").collect();
    for (const request of allTopicRequests) {
      const kidProfile = await ctx.db.get(request.kidProfileId);
      const user = await ctx.db.get(request.userId);
      if (!kidProfile || !user) {
        await ctx.db.delete(request._id);
        deletedByTable["topicRequests"] = (deletedByTable["topicRequests"] || 0) + 1;
        deletedCount++;
      }
    }

    // 7. Delete orphaned searchSettings
    const allSearchSettings = await ctx.db.query("searchSettings").collect();
    for (const setting of allSearchSettings) {
      const user = await ctx.db.get(setting.userId);
      if (!user) {
        await ctx.db.delete(setting._id);
        deletedByTable["searchSettings"] = (deletedByTable["searchSettings"] || 0) + 1;
        deletedCount++;
      }
    }

    console.log(`[SafeStudy] Deleted ${deletedCount} orphaned records:`, deletedByTable);

    return {
      deletedCount,
      deletedByTable,
    };
  },
});
