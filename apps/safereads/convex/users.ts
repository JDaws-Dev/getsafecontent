import { mutation, query, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Central accounts service URL (marketing site)
const CENTRAL_ACCOUNTS_URL = process.env.CENTRAL_ACCOUNTS_URL || "https://getsafefamily.com";

// Cache duration for central access verification (5 minutes)
const CENTRAL_ACCESS_CACHE_MS = 5 * 60 * 1000;

/**
 * Get the current authenticated user.
 * Convex Auth automatically creates users in the users table via authTables.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * Get the current user's ID (for use in components).
 */
export const currentUserId = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

/**
 * Mark onboarding as complete for the current user.
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { onboardingComplete: true });
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
    const user = await ctx.runQuery(api.users.currentUser, {});

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
      url.searchParams.set("app", "safereads");
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
        await ctx.runMutation(api.users.syncFromCentralAccess, {
          subscriptionStatus: result.subscriptionStatus,
          subscriptionEndsAt: result.subscriptionEndsAt,
          trialExpiresAt: result.trialExpiresAt,
        });
      } else {
        // Just update the cache expiry
        await ctx.runMutation(api.users.updateCentralAccessCache, {});
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

    // SafeReads uses typed union for subscriptionStatus, so we need to cast
    const validStatuses = ["trial", "active", "lifetime", "canceled", "past_due", "incomplete"] as const;
    type SubscriptionStatus = typeof validStatuses[number];

    const status = validStatuses.includes(args.subscriptionStatus as SubscriptionStatus)
      ? (args.subscriptionStatus as SubscriptionStatus)
      : "trial";

    await ctx.db.patch(userId, {
      subscriptionStatus: status,
      subscriptionCurrentPeriodEnd: args.subscriptionEndsAt,
      trialExpiresAt: args.trialExpiresAt,
      centralAccessCacheExpiry: now + CENTRAL_ACCESS_CACHE_MS,
    });

    return { success: true };
  },
});

/**
 * Internal query to get user by email (used by HTTP endpoints).
 */
export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
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
