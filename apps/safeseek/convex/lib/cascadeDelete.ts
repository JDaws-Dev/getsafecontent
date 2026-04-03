import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

/**
 * Delete all child records associated with a kid profile.
 * Call this before deleting the kid profile itself.
 */
export async function cascadeDeleteKidProfile(
  ctx: MutationCtx,
  kidProfileId: Id<"kidProfiles">
): Promise<{
  deletedSearchHistory: number;
  deletedBlockedSearches: number;
  deletedTimeLimits: number;
  deletedTutorSessions: number;
  deletedTopicRequests: number;
}> {
  let deletedSearchHistory = 0;
  let deletedBlockedSearches = 0;
  let deletedTimeLimits = 0;
  let deletedTutorSessions = 0;
  let deletedTopicRequests = 0;

  // Delete search history
  const searchHistory = await ctx.db
    .query("searchHistory")
    .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
    .collect();
  for (const h of searchHistory) {
    await ctx.db.delete(h._id);
    deletedSearchHistory++;
  }

  // Delete blocked searches
  const blockedSearches = await ctx.db
    .query("blockedSearches")
    .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
    .collect();
  for (const b of blockedSearches) {
    await ctx.db.delete(b._id);
    deletedBlockedSearches++;
  }

  // Delete time limits
  const timeLimits = await ctx.db
    .query("timeLimits")
    .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
    .collect();
  for (const t of timeLimits) {
    await ctx.db.delete(t._id);
    deletedTimeLimits++;
  }

  // Delete tutor sessions
  const tutorSessions = await ctx.db
    .query("tutorSessions")
    .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
    .collect();
  for (const s of tutorSessions) {
    await ctx.db.delete(s._id);
    deletedTutorSessions++;
  }

  // Delete topic requests
  const topicRequests = await ctx.db
    .query("topicRequests")
    .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
    .collect();
  for (const r of topicRequests) {
    await ctx.db.delete(r._id);
    deletedTopicRequests++;
  }

  return {
    deletedSearchHistory,
    deletedBlockedSearches,
    deletedTimeLimits,
    deletedTutorSessions,
    deletedTopicRequests,
  };
}

/**
 * Delete a user and all their associated data (kid profiles + child records + search settings).
 * Returns summary of what was deleted.
 */
export async function cascadeDeleteUser(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<{
  deletedKids: number;
  deletedSearchHistory: number;
  deletedBlockedSearches: number;
  deletedTimeLimits: number;
  deletedTutorSessions: number;
  deletedTopicRequests: number;
  deletedSearchSettings: number;
}> {
  // Delete kid profiles and all their associated data
  const kidProfiles = await ctx.db
    .query("kidProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  let totalSearchHistory = 0;
  let totalBlockedSearches = 0;
  let totalTimeLimits = 0;
  let totalTutorSessions = 0;
  let totalTopicRequests = 0;

  for (const kid of kidProfiles) {
    const result = await cascadeDeleteKidProfile(ctx, kid._id);
    totalSearchHistory += result.deletedSearchHistory;
    totalBlockedSearches += result.deletedBlockedSearches;
    totalTimeLimits += result.deletedTimeLimits;
    totalTutorSessions += result.deletedTutorSessions;
    totalTopicRequests += result.deletedTopicRequests;

    // Delete the kid profile itself
    await ctx.db.delete(kid._id);
  }

  // Delete search settings
  const searchSettings = await ctx.db
    .query("searchSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const s of searchSettings) {
    await ctx.db.delete(s._id);
  }

  // Delete the user
  await ctx.db.delete(userId);

  return {
    deletedKids: kidProfiles.length,
    deletedSearchHistory: totalSearchHistory,
    deletedBlockedSearches: totalBlockedSearches,
    deletedTimeLimits: totalTimeLimits,
    deletedTutorSessions: totalTutorSessions,
    deletedTopicRequests: totalTopicRequests,
    deletedSearchSettings: searchSettings.length,
  };
}
