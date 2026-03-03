import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

/**
 * Internal Signup Mutations
 *
 * These are internal mutations for creating users during signup.
 * They handle both the users table AND the authAccounts table
 * to ensure users can log in with their password via Convex Auth.
 *
 * IMPORTANT: Password hashes must be Scrypt format (from lucia package)
 * to match what Convex Auth Password provider expects.
 */

// Constants
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ALL_APPS = ["safetunes", "safetube", "safereads"] as const;

type AppType = (typeof ALL_APPS)[number];
type SubscriptionStatus =
  | "trial"
  | "active"
  | "lifetime"
  | "canceled"
  | "past_due"
  | "incomplete"
  | "expired";

/**
 * Check if a user exists by email
 */
export const checkUserExists = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    return { exists: !!user, userId: user?._id };
  },
});

/**
 * Create a new user with password authentication
 *
 * This creates:
 * 1. A user record in the users table
 * 2. An authAccounts entry for Convex Auth password login
 *
 * @param email - User's email address
 * @param passwordHash - Scrypt hash of the password (from lucia)
 * @param name - Optional display name
 * @param selectedApps - Which apps the user is signing up for
 * @param couponCode - Optional promo code
 */
export const createUserWithPassword = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    selectedApps: v.optional(
      v.array(
        v.union(
          v.literal("safetunes"),
          v.literal("safetube"),
          v.literal("safereads")
        )
      )
    ),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      return {
        success: false,
        error: "USER_EXISTS",
        message: "An account with this email already exists",
      };
    }

    // Check if authAccounts entry already exists for this email
    const existingAuthAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();

    if (existingAuthAccount) {
      return {
        success: false,
        error: "USER_EXISTS",
        message: "An account with this email already exists",
      };
    }

    // Determine initial subscription status and entitled apps
    let subscriptionStatus: SubscriptionStatus = "trial";
    let entitledApps: AppType[] = args.selectedApps ?? [...ALL_APPS];
    let couponRedeemedAt: number | undefined;

    // Handle coupon code if provided
    if (args.couponCode) {
      const code = args.couponCode.toUpperCase().trim();

      // Check database for coupon
      const coupon = await ctx.db
        .query("couponCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (coupon && coupon.active) {
        // Check expiry
        if (!coupon.expiresAt || coupon.expiresAt > now) {
          // Check usage limit
          if (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) {
            if (coupon.type === "lifetime") {
              subscriptionStatus = "lifetime";
              entitledApps = (coupon.grantedApps ?? [...ALL_APPS]) as AppType[];
              couponRedeemedAt = now;

              // Increment usage count
              await ctx.db.patch(coupon._id, {
                usageCount: coupon.usageCount + 1,
              });
            }
          }
        }
      } else {
        // Fallback to hardcoded lifetime codes
        const HARDCODED_LIFETIME_CODES = ["DAWSFRIEND", "DEWITT"];
        if (HARDCODED_LIFETIME_CODES.includes(code)) {
          subscriptionStatus = "lifetime";
          entitledApps = [...ALL_APPS] as AppType[];
          couponRedeemedAt = now;
        }
      }
    }

    // Create the user record
    const userId = await ctx.db.insert("users", {
      email,
      name: args.name,
      subscriptionStatus,
      trialStartedAt: subscriptionStatus === "trial" ? now : undefined,
      trialExpiresAt:
        subscriptionStatus === "trial" ? now + TRIAL_DURATION_MS : undefined,
      entitledApps,
      onboardingCompleted: {
        safetunes: false,
        safetube: false,
        safereads: false,
      },
      couponCode: args.couponCode?.toUpperCase(),
      couponRedeemedAt,
      createdAt: now,
      lastLoginAt: now,
    });

    // Create the authAccounts entry for password login
    // This is required for Convex Auth Password provider to work
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email, // For password auth, this is the email
      secret: args.passwordHash, // Scrypt hash
    });

    // Log the signup event
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email,
      eventType: args.couponCode ? "coupon.applied" : "trial.started",
      eventData: JSON.stringify({
        selectedApps: args.selectedApps,
        couponCode: args.couponCode,
        subscriptionStatus,
        entitledApps,
      }),
      subscriptionStatus,
      timestamp: now,
    });

    console.log(
      `[signupInternal] Created user ${email} with status ${subscriptionStatus}`
    );

    return {
      success: true,
      userId,
      email,
      subscriptionStatus,
      entitledApps,
      trialExpiresAt:
        subscriptionStatus === "trial" ? now + TRIAL_DURATION_MS : undefined,
    };
  },
});

/**
 * Get user credentials for login verification
 *
 * Returns the password hash so the API can verify the password
 * before creating a session.
 */
export const getUserCredentials = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return { exists: false };
    }

    // Get auth account for password
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();

    if (!authAccount) {
      // User exists but doesn't have password auth (maybe OAuth only)
      return {
        exists: true,
        hasPasswordAuth: false,
        userId: user._id,
        email: user.email,
      };
    }

    return {
      exists: true,
      hasPasswordAuth: true,
      userId: user._id,
      email: user.email,
      name: user.name || null,
      passwordHash: authAccount.secret,
      subscriptionStatus: user.subscriptionStatus,
      entitledApps: user.entitledApps,
    };
  },
});

/**
 * Add authAccount to an existing user (for migration fix)
 *
 * Used to fix users who have a users record but no authAccount.
 * These users were created during migration but can't log in.
 */
export const addAuthAccountToExistingUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Find the existing user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return {
        success: false,
        error: "USER_NOT_FOUND",
        message: `No user found with email: ${email}`,
      };
    }

    // Check if authAccount already exists
    const existingAuthAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();

    if (existingAuthAccount) {
      return {
        success: false,
        error: "AUTH_ACCOUNT_EXISTS",
        message: `AuthAccount already exists for: ${email}`,
      };
    }

    // Create the authAccounts entry
    const authAccountId = await ctx.db.insert("authAccounts", {
      userId: user._id,
      provider: "password",
      providerAccountId: email,
      secret: args.passwordHash,
    });

    console.log(
      `[addAuthAccountToExistingUser] Created authAccount for ${email}, userId: ${user._id}`
    );

    return {
      success: true,
      userId: user._id,
      authAccountId,
      email,
    };
  },
});

/**
 * Get or create an OAuth user in the central system.
 *
 * This is called by apps when a user logs in via Google OAuth.
 * If the user exists, returns their data (subscription status, entitled apps).
 * If the user doesn't exist, creates them with trial status.
 *
 * @param email - User's email from Google OAuth
 * @param name - User's name from Google OAuth
 * @returns User data including subscription status and entitled apps
 */
export const getOrCreateOAuthUser = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const now = Date.now();

    // Check if user already exists in users table
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      // User exists - return their current data
      console.log(`[getOrCreateOAuthUser] Found existing user: ${email}`);
      return {
        success: true,
        created: false,
        userId: existingUser._id,
        email: existingUser.email,
        name: existingUser.name,
        subscriptionStatus: existingUser.subscriptionStatus || "trial",
        entitledApps: existingUser.entitledApps || [],
        trialExpiresAt: existingUser.trialExpiresAt,
      };
    }

    // User doesn't exist - create them with trial status
    // OAuth users don't have authAccounts entry for password
    const trialExpiresAt = now + TRIAL_DURATION_MS;
    const entitledApps: AppType[] = [...ALL_APPS]; // Trial gets all apps

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name,
      subscriptionStatus: "trial" as SubscriptionStatus,
      trialStartedAt: now,
      trialExpiresAt,
      entitledApps,
      onboardingCompleted: {
        safetunes: false,
        safetube: false,
        safereads: false,
      },
      createdAt: now,
      lastLoginAt: now,
    });

    // Note: We don't create authAccounts entry for OAuth users
    // They authenticate via Google, not password

    // Log the signup event
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email,
      eventType: "trial.started",
      eventData: JSON.stringify({
        authProvider: "google",
        entitledApps,
      }),
      subscriptionStatus: "trial",
      timestamp: now,
    });

    console.log(`[getOrCreateOAuthUser] Created new OAuth user: ${email}`);

    return {
      success: true,
      created: true,
      userId,
      email,
      name: args.name,
      subscriptionStatus: "trial" as SubscriptionStatus,
      entitledApps,
      trialExpiresAt,
    };
  },
});

/**
 * Get migration status: count of users needing password reset
 *
 * Returns users whose authAccounts.secret starts with "NEEDS_PASSWORD_RESET:"
 * These are users migrated from BetterAuth who need to set a new password.
 */
export const getMigrationStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all authAccounts with password provider
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("provider"), "password"))
      .collect();

    // Filter to those needing reset
    const needingReset = authAccounts.filter(
      (acc) =>
        typeof acc.secret === "string" &&
        acc.secret.startsWith("NEEDS_PASSWORD_RESET:")
    );

    // Get user details for those needing reset
    const usersNeedingReset = [];
    for (const acc of needingReset) {
      const user = await ctx.db.get(acc.userId);
      if (user) {
        usersNeedingReset.push({
          email: acc.providerAccountId,
          name: user.name || null,
          subscriptionStatus: user.subscriptionStatus || "unknown",
          createdAt: user.createdAt,
        });
      }
    }

    return {
      totalAuthAccounts: authAccounts.length,
      needingPasswordReset: needingReset.length,
      completedMigration: authAccounts.length - needingReset.length,
      usersNeedingReset,
    };
  },
});

/**
 * Grant all apps to a user (keep their current subscription status)
 *
 * Used to upgrade early adopters to have access to all apps
 * without changing their payment status.
 */
export const grantAllApps = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      console.log(`[grantAllApps] User not found: ${email}`);
      return {
        success: false,
        error: "USER_NOT_FOUND",
        email,
      };
    }

    // Update entitledApps to all apps
    await ctx.db.patch(user._id, {
      entitledApps: [...ALL_APPS] as AppType[],
    });

    console.log(`[grantAllApps] Updated ${email} to all apps (status: ${user.subscriptionStatus})`);

    return {
      success: true,
      email,
      subscriptionStatus: user.subscriptionStatus,
      entitledApps: [...ALL_APPS],
    };
  },
});

/**
 * Ensure a user exists with all apps access
 *
 * If user exists: updates their entitledApps to all apps (keeps status)
 * If user doesn't exist: creates them with active status and all apps
 *
 * Used to onboard early adopter Stripe customers to the central auth system.
 */
export const ensureUserWithAllApps = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const now = Date.now();

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      // User exists - just update entitledApps
      await ctx.db.patch(existingUser._id, {
        entitledApps: [...ALL_APPS] as AppType[],
      });

      console.log(`[ensureUserWithAllApps] Updated existing user ${email} to all apps`);

      return {
        success: true,
        action: "updated",
        email,
        subscriptionStatus: existingUser.subscriptionStatus,
        entitledApps: [...ALL_APPS],
      };
    }

    // User doesn't exist - create them
    const status = (args.subscriptionStatus || "active") as SubscriptionStatus;

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name,
      subscriptionStatus: status,
      entitledApps: [...ALL_APPS] as AppType[],
      onboardingCompleted: {
        safetunes: false,
        safetube: false,
        safereads: false,
      },
      createdAt: now,
      lastLoginAt: now,
    });

    console.log(`[ensureUserWithAllApps] Created new user ${email} with status ${status} and all apps`);

    return {
      success: true,
      action: "created",
      userId,
      email,
      subscriptionStatus: status,
      entitledApps: [...ALL_APPS],
    };
  },
});

/**
 * Create or update a central user from Stripe webhook
 *
 * This is called by the webhook when a user completes checkout WITHOUT
 * first creating a central account (legacy flow). It creates a user record
 * in the central database so their subscription can be tracked.
 *
 * NOTE: This does NOT create an authAccounts entry because the user
 * hasn't set a password yet. They will need to use "Forgot Password"
 * or sign up again with email/password to set one.
 *
 * @param email - User's email from Stripe
 * @param name - User's name from Stripe (optional)
 * @param subscriptionStatus - active, trial, lifetime
 * @param entitledApps - Which apps the user has access to
 * @param stripeCustomerId - Stripe customer ID
 * @param subscriptionId - Stripe subscription ID
 */
export const createOrUpdateUserFromWebhook = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("lifetime")
    ),
    entitledApps: v.array(
      v.union(
        v.literal("safetunes"),
        v.literal("safetube"),
        v.literal("safereads")
      )
    ),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      // User exists - update their subscription info
      await ctx.db.patch(existingUser._id, {
        subscriptionStatus: args.subscriptionStatus,
        entitledApps: args.entitledApps as AppType[],
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.subscriptionId,
        // Clear trial fields if now active/lifetime
        ...(args.subscriptionStatus !== "trial" && {
          trialStartedAt: undefined,
          trialExpiresAt: undefined,
        }),
      });

      // Log the event
      await ctx.db.insert("subscriptionEvents", {
        userId: existingUser._id,
        email,
        eventType: "subscription.updated",
        eventData: JSON.stringify({
          source: "webhook",
          subscriptionStatus: args.subscriptionStatus,
          entitledApps: args.entitledApps,
        }),
        subscriptionStatus: args.subscriptionStatus,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.subscriptionId,
        timestamp: now,
      });

      console.log(
        `[createOrUpdateUserFromWebhook] Updated existing user: ${email} to ${args.subscriptionStatus}`
      );

      return {
        success: true,
        action: "updated",
        userId: existingUser._id,
        email,
        subscriptionStatus: args.subscriptionStatus,
        entitledApps: args.entitledApps,
      };
    }

    // User doesn't exist - create them
    // Note: No authAccounts entry since they haven't set a password
    const userId = await ctx.db.insert("users", {
      email,
      name: args.name,
      subscriptionStatus: args.subscriptionStatus,
      // Trial gets trial timestamps
      ...(args.subscriptionStatus === "trial" && {
        trialStartedAt: now,
        trialExpiresAt: now + TRIAL_DURATION_MS,
      }),
      entitledApps: args.entitledApps as AppType[],
      onboardingCompleted: {
        safetunes: false,
        safetube: false,
        safereads: false,
      },
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.subscriptionId,
      createdAt: now,
    });

    // Log the event
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email,
      eventType: "signup.from_webhook",
      eventData: JSON.stringify({
        source: "webhook",
        subscriptionStatus: args.subscriptionStatus,
        entitledApps: args.entitledApps,
      }),
      subscriptionStatus: args.subscriptionStatus,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.subscriptionId,
      timestamp: now,
    });

    console.log(
      `[createOrUpdateUserFromWebhook] Created new user: ${email} with ${args.subscriptionStatus}`
    );

    return {
      success: true,
      action: "created",
      userId,
      email,
      subscriptionStatus: args.subscriptionStatus,
      entitledApps: args.entitledApps,
      trialExpiresAt:
        args.subscriptionStatus === "trial"
          ? now + TRIAL_DURATION_MS
          : undefined,
    };
  },
});

/**
 * Update a user's password hash
 *
 * Used during password sync when a user changes their password on any app.
 * Updates the authAccounts.secret field so /verifyCentralCredentials works.
 */
export const updatePassword = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Find the authAccount for this email
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();

    if (!authAccount) {
      console.log(`[updatePassword] No authAccount found for: ${email}`);
      return {
        success: false,
        updated: false,
        reason: "user_not_found",
      };
    }

    // Update the password hash
    await ctx.db.patch(authAccount._id, {
      secret: args.passwordHash,
    });

    console.log(`[updatePassword] Updated password hash for: ${email}`);

    return {
      success: true,
      updated: true,
      email,
    };
  },
});
