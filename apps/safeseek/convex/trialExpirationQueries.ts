import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Get all users with trial status (used by trial expiration cron)
 */
export const getTrialUsers = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subscriptionStatus"), "trial"))
      .collect();
  },
});

/**
 * Mark a user as expired
 */
export const expireUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      subscriptionStatus: "expired",
    });
    console.log(`[TrialExpiration] Expired user ${args.userId}`);
  },
});

/**
 * Mark that the trial warning email has been sent
 */
export const markWarningEmailSent = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      trialWarningEmailSent: true,
    });
  },
});
