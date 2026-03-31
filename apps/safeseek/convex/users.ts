import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";

// Generate a random 6-character family code
function generateFamilyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to generate a unique family code
async function generateUniqueFamilyCode(ctx: any): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateFamilyCode();
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

// Get user by email
export const getUser = query({
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

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
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

// Create or update user by email (upsert)
export const createOrUpdateUser = mutation({
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
        });
      }
      return existing._id;
    }

    // Generate unique family code
    const familyCode = await generateUniqueFamilyCode(ctx);

    // Create new user with 7-day trial (or lifetime if valid promo code)
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      familyCode,
      subscriptionStatus: hasValidPromo ? "lifetime" : "trial",
      trialEndsAt: hasValidPromo ? undefined : now + sevenDaysMs,
      createdAt: now,
    });

    // Schedule welcome emails from backend
    await ctx.scheduler.runAfter(0, api.emails.sendTrialSignupEmails, {
      userEmail: args.email,
      userName: args.name || "there",
    });

    return userId;
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

/**
 * Internal mutation to provision a user from Marketing site.
 * Called by the /provisionUser HTTP endpoint.
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
      const familyCode = await generateUniqueFamilyCode(ctx);

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

/**
 * Internal mutation to delete a user and all their data (cascading delete)
 */
export const deleteUserInternal = internalMutation({
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

    // Delete kid profiles and all their associated data
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let deletedSearchHistory = 0;
    let deletedBlockedSearches = 0;
    let deletedTimeLimits = 0;

    for (const kid of kidProfiles) {
      // Delete search history for this kid
      const searchHistory = await ctx.db
        .query("searchHistory")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const h of searchHistory) {
        await ctx.db.delete(h._id);
        deletedSearchHistory++;
      }

      // Delete blocked searches for this kid
      const blockedSearches = await ctx.db
        .query("blockedSearches")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const b of blockedSearches) {
        await ctx.db.delete(b._id);
        deletedBlockedSearches++;
      }

      // Delete time limits for this kid
      const timeLimits = await ctx.db
        .query("timeLimits")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      for (const t of timeLimits) {
        await ctx.db.delete(t._id);
        deletedTimeLimits++;
      }

      // Delete the kid profile
      await ctx.db.delete(kid._id);
    }

    // Delete search settings
    const searchSettings = await ctx.db
      .query("searchSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of searchSettings) {
      await ctx.db.delete(s._id);
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return {
      deletedUser: args.email,
      deletedKids: kidProfiles.length,
      deletedSearchHistory,
      deletedBlockedSearches,
      deletedTimeLimits,
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
    });

    return { success: true, email: args.email };
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

// Update subscription status by email (used by Stripe webhook on checkout.session.completed)
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
      throw new Error(`User not found: ${args.email}`);
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.subscriptionStatus,
      subscriptionId: args.subscriptionId,
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

// Update subscription by Stripe subscription ID (used by webhook for subscription updates/deletions)
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

    if (args.subscriptionEndsAt !== undefined) {
      updates.subscriptionEndsAt = args.subscriptionEndsAt;
    }

    await ctx.db.patch(user._id, updates);
  },
});
