import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Helper function to generate a unique 6-character family code
function generateFamilyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars: 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User with this email already exists");
    }

    // Generate a unique family code
    let familyCode = generateFamilyCode();
    let codeExists = true;

    // Keep generating until we get a unique code (very unlikely to need more than 1 iteration)
    while (codeExists) {
      const existingCode = await ctx.db
        .query("users")
        .withIndex("by_family_code", (q) => q.eq("familyCode", familyCode))
        .first();

      if (!existingCode) {
        codeExists = false;
      } else {
        familyCode = generateFamilyCode();
      }
    }

    // Check if coupon code is valid (lifetime free codes)
    const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
    const couponUpper = args.couponCode?.trim().toUpperCase();
    const hasValidCoupon = couponUpper && lifetimeCodes.includes(couponUpper);
    const subscriptionStatus = hasValidCoupon ? "lifetime" : "trial";

    return await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
      familyCode: familyCode,
      createdAt: Date.now(),
      subscriptionStatus: subscriptionStatus,
      couponCode: args.couponCode?.trim().toUpperCase(),
    });
  },
});

// Update user subscription status
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

// Update subscription by Stripe subscription ID
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

    const updates: any = {
      subscriptionStatus: args.subscriptionStatus,
    };

    // Only include subscriptionEndsAt if it's defined
    if (args.subscriptionEndsAt !== undefined) {
      updates.subscriptionEndsAt = args.subscriptionEndsAt;
    }

    await ctx.db.patch(user._id, updates);
  },
});

// Update user profile
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    appleMusicAuthorized: v.optional(v.boolean()),
    appleMusicAuthDate: v.optional(v.number()),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    // Filter out undefined values
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    // If updating email, check it's not taken
    if (definedUpdates.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", definedUpdates.email as string))
        .first();

      if (existing && existing._id !== userId) {
        throw new Error("Email already in use");
      }
    }

    await ctx.db.patch(userId, definedUpdates);
  },
});

// Change user password
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPasswordHash: v.string(),
    newPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password matches
    if (user.passwordHash !== args.currentPasswordHash) {
      throw new Error("Current password is incorrect");
    }

    // Update to new password
    await ctx.db.patch(args.userId, {
      passwordHash: args.newPasswordHash,
    });

    return { success: true };
  },
});

// Regenerate family code for a user
export const regenerateFamilyCode = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Generate a new unique family code
    let familyCode = generateFamilyCode();
    let codeExists = true;

    while (codeExists) {
      const existingCode = await ctx.db
        .query("users")
        .withIndex("by_family_code", (q) => q.eq("familyCode", familyCode))
        .first();

      if (!existingCode) {
        codeExists = false;
      } else {
        familyCode = generateFamilyCode();
      }
    }

    await ctx.db.patch(args.userId, { familyCode });

    return { success: true, newCode: familyCode };
  },
});

// Regenerate family code for a user by email
export const regenerateFamilyCodeByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Generate a new unique family code
    let familyCode = generateFamilyCode();
    let codeExists = true;

    while (codeExists) {
      const existingCode = await ctx.db
        .query("users")
        .withIndex("by_family_code", (q) => q.eq("familyCode", familyCode))
        .first();

      if (!existingCode) {
        codeExists = false;
      } else {
        familyCode = generateFamilyCode();
      }
    }

    await ctx.db.patch(user._id, { familyCode });

    return { success: true, newCode: familyCode, oldCode: user.familyCode };
  },
});

// Update notification preferences
export const updateNotificationPreferences = mutation({
  args: {
    userId: v.id("users"),
    notifyOnRequest: v.optional(v.boolean()),
    notifyOnWeeklyDigest: v.optional(v.boolean()),
    notifyOnProductUpdates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...preferences } = args;

    // Filter out undefined values
    const definedPreferences = Object.fromEntries(
      Object.entries(preferences).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(userId, definedPreferences);

    return { success: true };
  },
});

// Toggle global hide artwork setting (master switch for all artwork)
export const setGlobalHideArtwork = mutation({
  args: {
    userId: v.id("users"),
    globalHideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      globalHideArtwork: args.globalHideArtwork,
    });

    return { success: true };
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

// Internal mutation to grant lifetime subscription by email (used by HTTP endpoint)
// Creates user if they don't exist (for promo code signups from marketing site)
export const grantLifetimeByEmailInternal = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      // Create new user with lifetime status
      const userId = await ctx.db.insert("users", {
        email: args.email,
        subscriptionStatus: "lifetime",
        createdAt: Date.now(),
      });
      console.log(`[grantLifetime] Created new user with lifetime: ${args.email}`);
      return { userId, email: args.email, status: "lifetime", created: true };
    }

    // Update existing user
    await ctx.db.patch(user._id, {
      subscriptionStatus: "lifetime",
    });
    console.log(`[grantLifetime] Updated existing user to lifetime: ${args.email}`);

    return { userId: user._id, email: args.email, status: "lifetime", created: false };
  },
});

// Internal mutation to set subscription status by email (used by HTTP endpoint)
// Creates user if they don't exist (for bundle purchases from marketing site)
export const setSubscriptionStatusByEmailInternal = internalMutation({
  args: {
    email: v.string(),
    status: v.string(),
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
      });
      console.log(`[setSubscriptionStatus] Created new user with status ${args.status}: ${args.email}`);
      return { userId, email: args.email, status: args.status, created: true };
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
    });
    console.log(`[setSubscriptionStatus] Updated ${args.email} to ${args.status}`);

    return { userId: user._id, email: args.email, status: args.status, created: false };
  },
});

// ============================================================================
// UNIFIED AUTH PROVISIONING - Write to authAccounts for central auth
// ============================================================================

// Helper to generate unique family code
async function generateUniqueFamilyCodeInternal(ctx: any): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let attempts = 0;

  while (attempts < 10) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q: any) => q.eq("familyCode", code))
      .first();

    if (!existing) {
      return code;
    }
    attempts++;
  }

  throw new Error("Failed to generate unique family code");
}

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
