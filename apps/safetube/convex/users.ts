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
export const setSubscriptionStatusByEmailInternal = internalMutation({
  args: {
    email: v.string(),
    status: v.string(),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

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

    console.log(`Set subscription status for ${args.email} to ${args.status}`);
  },
});
