import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { authComponent } from "./auth";
import { api } from "./_generated/api";

// Generate a random 6-character family code
function generateFamilyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get user by email (for authenticated users)
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return null;

    // Check if trial has expired
    const isTrialExpired = user.subscriptionStatus === "trial" &&
      user.trialEndsAt &&
      Date.now() > user.trialEndsAt;

    return {
      ...user,
      isTrialExpired,
    };
  },
});

// Create or sync user from auth
// Can also apply promo code to grant lifetime access
export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Valid lifetime promo codes
    const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
    const hasValidPromo = args.promoCode && lifetimeCodes.includes(args.promoCode.toUpperCase());

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // If valid promo code provided, upgrade to lifetime
      if (hasValidPromo) {
        await ctx.db.patch(existing._id, {
          subscriptionStatus: "lifetime",
          couponCode: args.promoCode!.toUpperCase(),
        });
      }
      return existing._id;
    }

    // Generate unique family code
    let familyCode = generateFamilyCode();
    let attempts = 0;
    while (attempts < 10) {
      const codeExists = await ctx.db
        .query("users")
        .withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode))
        .first();
      if (!codeExists) break;
      familyCode = generateFamilyCode();
      attempts++;
    }

    // Create new user with 7-day trial (or lifetime if valid promo code)
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      familyCode,
      subscriptionStatus: hasValidPromo ? "lifetime" : "trial",
      couponCode: hasValidPromo ? args.promoCode!.toUpperCase() : undefined,
      trialEndsAt: hasValidPromo ? undefined : now + sevenDaysMs,
      onboardingCompleted: false,
      createdAt: now,
    });

    // Schedule welcome emails from backend (guarantees correct name from DB)
    await ctx.scheduler.runAfter(0, api.emails.sendTrialSignupEmails, {
      userEmail: args.email,
      userName: args.name || "there",
    });

    return userId;
  },
});

// Get user by family code (for kid access)
export const getUserByFamilyCode = query({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", args.familyCode.toUpperCase()))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      familyCode: user.familyCode,
    };
  },
});

// Set parent PIN
export const setParentPin = mutation({
  args: {
    userId: v.id("users"),
    pinHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      parentPin: args.pinHash,
    });
  },
});

// Verify parent PIN
export const verifyParentPin = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.parentPin || null;
  },
});

// Complete onboarding
export const completeOnboarding = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      onboardingCompleted: true,
    });
  },
});

// Check if user needs onboarding
export const checkOnboardingStatus = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return { needsOnboarding: false, user: null };

    return {
      needsOnboarding: !user.onboardingCompleted,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        familyCode: user.familyCode,
        onboardingCompleted: user.onboardingCompleted,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
      },
    };
  },
});

// Set user timezone
export const setTimezone = mutation({
  args: {
    userId: v.id("users"),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      timezone: args.timezone,
    });
  },
});

// Get user timezone
export const getTimezone = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.timezone || null;
  },
});

// Grant lifetime subscription to a user by email (admin use)
export const grantLifetime = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: "lifetime",
      couponCode: "DAWSFRIEND",
      // Note: Don't patch trialEndsAt - leave it as is (undefined causes Convex error)
    });

    return { success: true, email: args.email };
  },
});

// Apply a promo code to unlock lifetime access (user-facing)
export const applyPromoCode = mutation({
  args: { userId: v.id("users"), promoCode: v.string() },
  handler: async (ctx, args) => {
    const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
    const codeUpper = args.promoCode.trim().toUpperCase();

    if (!lifetimeCodes.includes(codeUpper)) {
      return { success: false, error: "Invalid promo code" };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Set to lifetime subscription - trialEndsAt set far in future to avoid expiration checks
    await ctx.db.patch(args.userId, {
      subscriptionStatus: "lifetime",
      couponCode: codeUpper,
      trialEndsAt: Date.now() + (365 * 100 * 24 * 60 * 60 * 1000), // 100 years from now
    });

    return { success: true };
  },
});

// Update user subscription status (called from Stripe webhook)
export const updateSubscriptionStatus = mutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.string(),
    subscriptionId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.subscriptionStatus,
      subscriptionId: args.subscriptionId,
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

// Update user profile (name)
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      name: args.name.trim(),
    });

    return { success: true };
  },
});

// Update subscription by Stripe subscription ID (for webhook events that don't have email)
export const updateSubscriptionByStripeId = mutation({
  args: {
    subscriptionId: v.string(),
    subscriptionStatus: v.string(),
    subscriptionEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
      .first();

    if (!user) {
      console.error("User not found for subscription:", args.subscriptionId);
      return;
    }

    const updates: Record<string, any> = {
      subscriptionStatus: args.subscriptionStatus,
    };

    // Only include subscriptionEndsAt if it's defined
    if (args.subscriptionEndsAt !== undefined) {
      updates.subscriptionEndsAt = args.subscriptionEndsAt;
    }

    await ctx.db.patch(user._id, updates);
  },
});

// Internal query to get user by email (used by HTTP endpoints)
export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Internal mutation to set subscription status by email (for admin HTTP endpoint)
// Creates user if they don't exist (for promo code signups from marketing site)
export const setSubscriptionStatusByEmailInternal = internalMutation({
  args: {
    email: v.string(),
    status: v.string(),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      // Create new user with the specified status
      const userId = await ctx.db.insert("users", {
        email: args.email,
        subscriptionStatus: args.status,
        createdAt: Date.now(),
        stripeCustomerId: args.stripeCustomerId,
        subscriptionId: args.subscriptionId,
      });
      console.log(`[setSubscriptionStatus] Created new user with status ${args.status}: ${args.email}`);
      return { userId, email: args.email, status: args.status, created: true };
    }

    // Update existing user
    const updates: Record<string, string> = {
      subscriptionStatus: args.status,
    };

    if (args.stripeCustomerId) {
      updates.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.subscriptionId) {
      updates.subscriptionId = args.subscriptionId;
    }

    await ctx.db.patch(user._id, updates);

    console.log(`[setSubscriptionStatus] Updated ${args.email} to ${args.status}`);
    return { userId: user._id, email: args.email, status: args.status, created: false };
  },
});

// Helper function to generate a unique family code
async function generateUniqueFamilyCodeInternal(ctx: any): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars: 0, O, I, 1
  let attempts = 0;

  while (attempts < 10) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q: any) => q.eq("familyCode", code))
      .first();

    if (!existing) {
      return code;
    }
    attempts++;
  }

  throw new Error("Failed to generate unique family code after 10 attempts");
}

/**
 * Internal mutation to provision a user with both:
 * 1. User record (with subscription status)
 * 2. Auth credentials (password hash in authAccounts table)
 *
 * This is called by the /provisionUser HTTP endpoint.
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

    if (existingUser) {
      userId = existingUser._id;

      // Update subscription status
      await ctx.db.patch(userId, {
        subscriptionStatus: args.entitledToThisApp
          ? args.subscriptionStatus
          : "inactive",
        stripeCustomerId: args.stripeCustomerId ?? existingUser.stripeCustomerId,
        subscriptionId: args.subscriptionId ?? existingUser.subscriptionId,
        name: args.name ?? existingUser.name,
      });

      console.log(`[provisionUser] Updated existing user: ${args.email}`);
    } else {
      // Create new user with family code
      const familyCode = await generateUniqueFamilyCodeInternal(ctx);

      userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name ?? undefined,
        subscriptionStatus: args.entitledToThisApp
          ? args.subscriptionStatus
          : "inactive",
        familyCode,
        createdAt: Date.now(),
        stripeCustomerId: args.stripeCustomerId ?? undefined,
        subscriptionId: args.subscriptionId ?? undefined,
      });
      wasCreated = true;

      console.log(`[provisionUser] Created new user: ${args.email} with familyCode: ${familyCode}`);
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

// ============================================================================
// PASSWORD CHANGE - User-facing mutation
// ============================================================================

/**
 * Change user's password.
 * Called from Settings page when user wants to change their password.
 *
 * Note: This updates only the local app's authAccounts table.
 * The passwordSync action (if enabled) will sync to other apps.
 */
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPasswordHash: v.string(),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user to verify they exist
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Find the authAccount for this user
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .first();

    if (!authAccount) {
      throw new Error("No password authentication found for this account. You may have signed up with Google.");
    }

    // Verify current password matches
    if (authAccount.secret !== args.currentPasswordHash) {
      throw new Error("Current password is incorrect");
    }

    // Update to new password
    await ctx.db.patch(authAccount._id, {
      secret: args.newPasswordHash,
    });

    console.log(`[changePassword] Password updated for user: ${user.email}`);

    return { success: true };
  },
});

// ============================================================================
// PASSWORD SYNC - Update password hash from central sync
// ============================================================================

/**
 * Update a user's password hash in the authAccounts table.
 * Called by the marketing site /api/auth/sync-password endpoint.
 *
 * This allows password changes to propagate across all apps.
 */
export const updatePasswordInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(), // Scrypt hash from central auth
  },
  handler: async (ctx, args) => {
    console.log(`[updatePasswordInternal] Starting for ${args.email}`);

    // Find the authAccount for this email
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    if (!authAccount) {
      console.log(`[updatePasswordInternal] No authAccount found for: ${args.email}`);
      return {
        updated: false,
        reason: "no_auth_account",
        email: args.email,
      };
    }

    // Check if password is already the same
    if (authAccount.secret === args.passwordHash) {
      console.log(`[updatePasswordInternal] Password already matches for: ${args.email}`);
      return {
        updated: false,
        reason: "already_matches",
        email: args.email,
      };
    }

    // Update the password hash
    await ctx.db.patch(authAccount._id, {
      secret: args.passwordHash,
    });

    console.log(`[updatePasswordInternal] Password updated for: ${args.email}`);

    return {
      updated: true,
      email: args.email,
    };
  },
});
