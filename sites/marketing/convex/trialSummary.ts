import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const APP_LITERAL = v.union(
  v.literal("safetunes"),
  v.literal("safetube"),
  v.literal("safereads"),
  v.literal("safestudy")
);

/**
 * Store a trial summary report from an individual app.
 * Called via the /reportTrialSummary HTTP endpoint.
 */
export const storeReport = internalMutation({
  args: {
    app: APP_LITERAL,
    expiredCount: v.number(),
    expiredEmails: v.array(v.string()),
    warningCount: v.number(),
    warningEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("trialSummaryReports", {
      app: args.app,
      expiredCount: args.expiredCount,
      expiredEmails: args.expiredEmails,
      warningCount: args.warningCount,
      warningEmails: args.warningEmails,
      reportedAt: Date.now(),
    });
  },
});

/**
 * Get all trial summary reports from the last 24 hours.
 * Used by the digest cron to build one combined email.
 */
export const getTodaysReports = internalQuery({
  args: {},
  handler: async (ctx) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const reports = await ctx.db
      .query("trialSummaryReports")
      .withIndex("by_reportedAt", (q) => q.gt("reportedAt", twentyFourHoursAgo))
      .collect();
    return reports;
  },
});

/**
 * Clean up reports older than 7 days to prevent table bloat.
 */
export const cleanupOldReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldReports = await ctx.db
      .query("trialSummaryReports")
      .withIndex("by_reportedAt", (q) => q.lt("reportedAt", sevenDaysAgo))
      .collect();

    for (const report of oldReports) {
      await ctx.db.delete(report._id);
    }

    if (oldReports.length > 0) {
      console.log(`[TrialSummary] Cleaned up ${oldReports.length} old reports`);
    }
  },
});
