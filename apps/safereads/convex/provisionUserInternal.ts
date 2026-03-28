import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Provision a user with authentication credentials from central auth.
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to login with their central password.
 *
 * For OAuth users (isOAuthUser=true), passwordHash can be null and
 * authAccounts creation is skipped - user logs in via Google OAuth.
 *
 * IMPORTANT: The passwordHash must be a Scrypt hash (from Lucia) matching
 * what Convex Auth Password provider uses.
 */
export const provisionUserInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.union(v.string(), v.null())), // Accepted but ignored (auth handled by Marketing)
    name: v.union(v.string(), v.null()),
    subscriptionStatus: v.string(),
    entitledToThisApp: v.boolean(),
    stripeCustomerId: v.union(v.string(), v.null()),
    subscriptionId: v.union(v.string(), v.null()),
    isOAuthUser: v.optional(v.boolean()), // Accepted but ignored (auth handled by Marketing)
  },
  handler: async (ctx, args) => {
    console.log(`[provisionUser] Starting for ${args.email} (OAuth: ${args.isOAuthUser ?? false})`);

    // 1. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    let userId;
    let wasCreated = false;

    // Determine subscription status based on entitlement
    const effectiveStatus = args.entitledToThisApp
      ? args.subscriptionStatus
      : "inactive";

    // Map subscription status to SafeReads typed union
    const validStatuses = ["trial", "active", "lifetime", "canceled", "past_due", "incomplete"] as const;
    type SubscriptionStatus = (typeof validStatuses)[number];

    const mappedStatus = validStatuses.includes(effectiveStatus as SubscriptionStatus)
      ? (effectiveStatus as SubscriptionStatus)
      : "active";

    if (existingUser) {
      userId = existingUser._id;

      // Update subscription status and other fields
      await ctx.db.patch(userId, {
        subscriptionStatus: mappedStatus,
        stripeCustomerId: args.stripeCustomerId ?? existingUser.stripeCustomerId,
        stripeSubscriptionId: args.subscriptionId ?? existingUser.stripeSubscriptionId,
        name: args.name ?? existingUser.name,
      });

      console.log(`[provisionUser] Updated existing user: ${args.email}`);
    } else {
      // Create new user
      userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name ?? undefined,
        subscriptionStatus: mappedStatus,
        stripeCustomerId: args.stripeCustomerId ?? undefined,
        stripeSubscriptionId: args.subscriptionId ?? undefined,
        trialExpiresAt: mappedStatus === "trial" ? Date.now() + TRIAL_DURATION_MS : undefined,
        analysisCount: 0,
        onboardingComplete: false,
      });
      wasCreated = true;

      console.log(`[provisionUser] Created new user: ${args.email}`);
    }

    // Auth is handled centrally by Marketing (JWT). No local authAccounts needed.

    return {
      success: true,
      userId: userId,
      provisioned: wasCreated,
      updated: !wasCreated,
      authAccountCreated: false,
      authAccountUpdated: false,
      passwordConflict: false,
    };
  },
});

