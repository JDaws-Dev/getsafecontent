import { internalMutation, internalQuery } from "./_generated/server";
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
    passwordHash: v.union(v.string(), v.null()), // Scrypt hash from central auth (null for OAuth users)
    name: v.union(v.string(), v.null()),
    subscriptionStatus: v.string(),
    entitledToThisApp: v.boolean(),
    stripeCustomerId: v.union(v.string(), v.null()),
    subscriptionId: v.union(v.string(), v.null()),
    isOAuthUser: v.optional(v.boolean()), // If true, skip authAccounts creation
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

    // 2. Handle auth account creation
    // For OAuth users, skip authAccounts creation - they authenticate via Google
    if (args.isOAuthUser) {
      console.log(`[provisionUser] OAuth user - skipping authAccounts creation for: ${args.email}`);
      return {
        success: true,
        userId: userId,
        provisioned: wasCreated,
        updated: !wasCreated,
        authAccountCreated: false,
        authAccountUpdated: false,
        passwordConflict: false,
        isOAuthUser: true,
      };
    }

    // For password users, check if authAccounts entry exists
    // Query authAccounts using the providerAndAccountId index
    const existingAuthAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    let authAccountCreated = false;
    let authAccountUpdated = false;
    let passwordConflict = false;

    if (!existingAuthAccount) {
      // Create authAccounts entry for password authentication
      // This is the KEY step that allows login to work
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: args.email.toLowerCase(),
        secret: args.passwordHash!, // The Scrypt hash from central
      });
      authAccountCreated = true;

      console.log(`[provisionUser] Created authAccount for: ${args.email}`);
    } else if (args.passwordHash !== existingAuthAccount.secret) {
      // PASSWORD CONFLICT HANDLING (Option B - Safety First)
      // User exists in this app with a different password than the bundle signup.
      // We KEEP the existing password to avoid surprising the user.
      // They can still log in with their original password.
      passwordConflict = true;

      console.warn(
        `[provisionUser] PASSWORD CONFLICT for ${args.email}: ` +
        `User has existing authAccount with different password hash. ` +
        `Keeping existing password. User should use their original app password to log in.`
      );

      // Note: We intentionally do NOT update the password hash here.
      // The user can:
      // 1. Log in with their original password for this app
      // 2. Use "Forgot Password" to reset if needed
      // 3. Change password in Settings after logging in
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
      passwordConflict,
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
