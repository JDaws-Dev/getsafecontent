import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Provision a user with authentication credentials from central auth.
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to login with their central password.
 *
 * IMPORTANT: The passwordHash must be a Scrypt hash (from Lucia) matching
 * what Convex Auth Password provider uses.
 */
export const provisionUserInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(), // Scrypt hash from central auth
    name: v.union(v.string(), v.null()),
    subscriptionStatus: v.string(),
    entitledToThisApp: v.boolean(),
    stripeCustomerId: v.union(v.string(), v.null()),
    subscriptionId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    console.log(`[provisionUser] Starting for ${args.email}`);

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

    // 2. Check if authAccounts entry exists for password provider
    // Query authAccounts using the providerAndAccountId index
    const existingAuthAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    let authAccountCreated = false;
    let authAccountUpdated = false;

    if (!existingAuthAccount) {
      // Create authAccounts entry for password authentication
      // This is the KEY step that allows login to work
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: args.email.toLowerCase(),
        secret: args.passwordHash, // The Scrypt hash from central
      });
      authAccountCreated = true;

      console.log(`[provisionUser] Created authAccount for: ${args.email}`);
    } else if (args.passwordHash !== existingAuthAccount.secret) {
      // Update password hash if different (password was changed centrally)
      await ctx.db.patch(existingAuthAccount._id, {
        secret: args.passwordHash,
      });
      authAccountUpdated = true;

      console.log(`[provisionUser] Updated password hash for: ${args.email}`);
    } else {
      console.log(`[provisionUser] authAccount already exists with same hash for: ${args.email}`);
    }

    return {
      success: true,
      userId: userId,
      provisioned: wasCreated,
      updated: !wasCreated,
      authAccountCreated,
      authAccountUpdated,
    };
  },
});

/**
 * Query to check if a user has an authAccounts entry (for debugging).
 */
export const checkAuthAccountExists = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    if (!authAccount) {
      return { exists: false, email: args.email };
    }

    // Don't return the actual secret, just confirm it exists
    return {
      exists: true,
      email: args.email,
      userId: authAccount.userId,
      provider: authAccount.provider,
      hasSecret: !!authAccount.secret,
    };
  },
});
