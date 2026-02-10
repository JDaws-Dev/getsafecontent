import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Central accounts service URL (marketing site)
const CENTRAL_ACCOUNTS_URL = process.env.CENTRAL_ACCOUNTS_URL || "https://getsafefamily.com";

// Cache duration for central access verification (5 minutes)
const CENTRAL_ACCESS_CACHE_MS = 5 * 60 * 1000;

// Helper function to generate a unique 6-character family code
function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars: 0, O, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get the current authenticated user from Convex Auth
 * Use this in queries/mutations to get the logged-in user's SafeTube data
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Apply a coupon code to the current user's account
 * Called after signup if user enters a coupon code
 */
export const applyCouponCode = mutation({
  args: {
    couponCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if coupon code is valid (lifetime free codes)
    const lifetimeCodes = ["DAWSFRIEND", "DEWITT"];
    const couponUpper = args.couponCode.trim().toUpperCase();
    const hasValidCoupon = lifetimeCodes.includes(couponUpper);

    if (!hasValidCoupon) {
      throw new Error("Invalid coupon code");
    }

    // Apply lifetime status
    await ctx.db.patch(userId, {
      subscriptionStatus: "lifetime",
      couponCode: couponUpper,
    });

    return { success: true, status: "lifetime" };
  },
});

/**
 * LEGACY: Sync Better Auth user to SafeTube users table
 * @deprecated Use Convex Auth's afterUserCreatedOrUpdated callback instead
 * Kept for backward compatibility during migration
 */
export const syncBetterAuthUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if SafeTube user already exists for this email
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // User already exists, just return the existing user ID
      return existing._id;
    }

    // Generate a unique family code
    let familyCode = generateFamilyCode();
    let codeExists = true;

    // Keep generating until we get a unique code
    while (codeExists) {
      const existingCode = await ctx.db
        .query("users")
        .withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode))
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

    // Create SafeTube user record
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      familyCode: familyCode,
      createdAt: Date.now(),
      subscriptionStatus: subscriptionStatus,
      couponCode: args.couponCode?.trim().toUpperCase(),
    });

    return userId;
  },
});

/**
 * Get SafeTube user data by email (linked to auth user)
 */
export const getSafeTubeUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Ensure SafeTube user exists - called on EVERY login as a safety net
 * This catches any users who authenticated but didn't sync
 */
export const ensureSafeTubeUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if SafeTube user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // User already exists, all good
      return { userId: existing._id, wasCreated: false };
    }

    // User is missing - create them now to prevent the app from breaking
    console.warn(`[ensureSafeTubeUser] Creating missing user: ${args.email}`);

    // Generate a unique family code
    let familyCode = "";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let codeExists = true;

    while (codeExists) {
      familyCode = "";
      for (let i = 0; i < 6; i++) {
        familyCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existingCode = await ctx.db
        .query("users")
        .withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode))
        .first();
      codeExists = !!existingCode;
    }

    // Create the missing user with trial status
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      familyCode: familyCode,
      createdAt: Date.now(),
      subscriptionStatus: "trial",
    });

    console.log(
      `[ensureSafeTubeUser] Created missing user: ${args.email} -> ${userId}`
    );

    return { userId, wasCreated: true };
  },
});

/**
 * Update SafeTube user subscription from Stripe
 * (This maintains compatibility with existing Stripe integration)
 */
export const updateSafeTubeUserSubscription = mutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.string(),
    subscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("SafeTube user not found for email: " + args.email);
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.subscriptionStatus,
      subscriptionId: args.subscriptionId,
      stripeCustomerId: args.stripeCustomerId,
    });

    return user._id;
  },
});

/**
 * Verify access with central Safe Family accounts service.
 *
 * This action calls the central verifyAppAccess endpoint and syncs
 * the local user's subscriptionStatus with the central service.
 *
 * Returns cached result if within 5-minute window.
 */
export const verifyCentralAccess = action({
  args: {},
  handler: async (ctx): Promise<{
    hasAccess: boolean;
    reason: string;
    subscriptionStatus: string | null;
    cached: boolean;
  }> => {
    // Get current user
    const user = await ctx.runQuery(api.userSync.getCurrentUser, {});

    if (!user || !user.email) {
      return {
        hasAccess: false,
        reason: "not_authenticated",
        subscriptionStatus: null,
        cached: false,
      };
    }

    // Check if we have a valid cache
    const now = Date.now();
    if (user.centralAccessCacheExpiry && user.centralAccessCacheExpiry > now) {
      // Return cached result based on local subscriptionStatus
      const hasAccess = ["trial", "active", "lifetime"].includes(user.subscriptionStatus || "");
      return {
        hasAccess,
        reason: "cached_" + (user.subscriptionStatus || "unknown"),
        subscriptionStatus: user.subscriptionStatus || null,
        cached: true,
      };
    }

    // Call central service
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
      console.error("[verifyCentralAccess] ADMIN_KEY not configured");
      // Fall back to local status if we can't verify
      const hasAccess = ["trial", "active", "lifetime"].includes(user.subscriptionStatus || "");
      return {
        hasAccess,
        reason: "central_unavailable",
        subscriptionStatus: user.subscriptionStatus || null,
        cached: false,
      };
    }

    try {
      const url = new URL("/verifyAppAccess", CENTRAL_ACCOUNTS_URL);
      url.searchParams.set("email", user.email);
      url.searchParams.set("app", "safetube");
      url.searchParams.set("key", adminKey);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("[verifyCentralAccess] Central service returned error:", response.status);
        // Fall back to local status
        const hasAccess = ["trial", "active", "lifetime"].includes(user.subscriptionStatus || "");
        return {
          hasAccess,
          reason: "central_error",
          subscriptionStatus: user.subscriptionStatus || null,
          cached: false,
        };
      }

      const result = await response.json() as {
        hasAccess: boolean;
        reason: string;
        subscriptionStatus: string | null;
        trialExpiresAt?: number;
        subscriptionEndsAt?: number;
        entitledApps?: string[];
        userName?: string;
        userId?: string;
        onboardingCompleted?: boolean;
      };

      // Sync local subscription status with central if different
      if (result.subscriptionStatus && result.subscriptionStatus !== user.subscriptionStatus) {
        await ctx.runMutation(api.userSync.syncFromCentralAccess, {
          subscriptionStatus: result.subscriptionStatus,
          subscriptionEndsAt: result.subscriptionEndsAt,
          trialExpiresAt: result.trialExpiresAt,
        });
      } else {
        // Just update the cache expiry
        await ctx.runMutation(api.userSync.updateCentralAccessCache, {});
      }

      return {
        hasAccess: result.hasAccess,
        reason: result.reason,
        subscriptionStatus: result.subscriptionStatus,
        cached: false,
      };
    } catch (error) {
      console.error("[verifyCentralAccess] Error calling central service:", error);
      // Fall back to local status
      const hasAccess = ["trial", "active", "lifetime"].includes(user.subscriptionStatus || "");
      return {
        hasAccess,
        reason: "central_unavailable",
        subscriptionStatus: user.subscriptionStatus || null,
        cached: false,
      };
    }
  },
});

/**
 * Sync local subscription status from central service response.
 * Called by verifyCentralAccess action when central status differs.
 */
export const syncFromCentralAccess = mutation({
  args: {
    subscriptionStatus: v.string(),
    subscriptionEndsAt: v.optional(v.number()),
    trialExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    await ctx.db.patch(userId, {
      subscriptionStatus: args.subscriptionStatus,
      subscriptionEndsAt: args.subscriptionEndsAt,
      trialEndsAt: args.trialExpiresAt,
      centralAccessCacheExpiry: now + CENTRAL_ACCESS_CACHE_MS,
    });

    return { success: true };
  },
});

/**
 * Update the central access cache expiry without changing subscription status.
 */
export const updateCentralAccessCache = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    await ctx.db.patch(userId, {
      centralAccessCacheExpiry: now + CENTRAL_ACCESS_CACHE_MS,
    });

    return { success: true };
  },
});
