import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

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

// Internal mutation to grant lifetime subscription by email (used by HTTP endpoint)
export const grantLifetimeByEmailInternal = internalMutation({
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

    return { userId: user._id, email: args.email, status: "lifetime" };
  },
});

// Internal mutation to set subscription status by email (used by HTTP endpoint)
export const setSubscriptionStatusByEmailInternal = internalMutation({
  args: {
    email: v.string(),
    status: v.string(),
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
      subscriptionStatus: args.status,
    });

    return { userId: user._id, email: args.email, status: args.status };
  },
});
