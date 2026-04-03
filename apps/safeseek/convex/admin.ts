import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { cascadeDeleteUser } from "./lib/cascadeDelete";

// Get all users with kid counts for admin dashboard
export const getAllUsersWithKids = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const usersWithKids = await Promise.all(
      users.map(async (user) => {
        const kidProfiles = await ctx.db
          .query("kidProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        // Count total searches across all kids
        let totalSearches = 0;
        let totalBlockedSearches = 0;
        for (const kid of kidProfiles) {
          const searches = await ctx.db
            .query("searchHistory")
            .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
            .collect();
          totalSearches += searches.length;

          const blocked = await ctx.db
            .query("blockedSearches")
            .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
            .collect();
          totalBlockedSearches += blocked.length;
        }

        return {
          _id: user._id,
          email: user.email,
          name: user.name,
          familyCode: user.familyCode,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndsAt: user.subscriptionEndsAt,
          trialEndsAt: user.trialEndsAt,
          stripeCustomerId: user.stripeCustomerId,
          createdAt: user.createdAt,
          kidCount: kidProfiles.length,
          totalSearches,
          totalBlockedSearches,
        };
      })
    );

    // Sort by createdAt descending (newest first)
    return usersWithKids.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
});

// Delete a user and all their associated data by email (admin use)
export const deleteUserByEmail = internalMutation({
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

    const result = await cascadeDeleteUser(ctx, user._id);

    return {
      deletedUser: args.email,
      ...result,
    };
  },
});
