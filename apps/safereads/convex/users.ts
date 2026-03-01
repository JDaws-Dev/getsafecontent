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
 * Public query to check if a user has an authAccounts entry.
 * Used by forgot password page to show helpful message if user doesn't exist.
 */
export const checkAuthAccountExistsPublic = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    // Only return exists boolean - don't leak any other info
    return { exists: !!authAccount, email: args.email };
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

// Central auth URL for OAuth user sync
const CENTRAL_AUTH_URL = "https://adamant-crow-705.convex.site";

/**
 * Sync an OAuth user with the central Safe Family system.
 *
 * This action is called after a user logs in via Google OAuth.
 * It creates or retrieves the user from central and syncs their subscription status.
 *
 * Flow:
 * 1. Call central /getOrCreateOAuthUser endpoint
 * 2. If user exists in central, sync their subscription status locally
 * 3. If user is new, they get trial status (already set by central)
 * 4. If user exists but not entitled to this app, set status to "inactive"
 */
export const syncOAuthUserWithCentral = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    entitled: boolean;
    subscriptionStatus: string;
    created: boolean;
    error?: string;
  }> => {
    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey) {
      console.error("[syncOAuthUserWithCentral] ADMIN_KEY not configured");
      return {
        success: false,
        entitled: true, // Assume entitled if we can't check
        subscriptionStatus: "trial",
        created: false,
        error: "Server configuration error",
      };
    }

    try {
      // Call central to get or create OAuth user
      const url = `${CENTRAL_AUTH_URL}/getOrCreateOAuthUser?key=${encodeURIComponent(adminKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: args.email,
          name: args.name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[syncOAuthUserWithCentral] Central returned error:", response.status, errorText);
        return {
          success: false,
          entitled: true,
          subscriptionStatus: "trial",
          created: false,
          error: `Central error: ${response.status}`,
        };
      }

      const centralUser = await response.json() as {
        success: boolean;
        created: boolean;
        email: string;
        name?: string;
        subscriptionStatus: string;
        entitledApps: string[];
        trialExpiresAt?: number;
      };

      if (!centralUser.success) {
        console.error("[syncOAuthUserWithCentral] Central returned failure");
        return {
          success: false,
          entitled: true,
          subscriptionStatus: "trial",
          created: false,
          error: "Central returned failure",
        };
      }

      // Check if user is entitled to SafeReads
      const isEntitled = centralUser.entitledApps?.includes("safereads") ?? false;
      const effectiveStatus = isEntitled ? centralUser.subscriptionStatus : "inactive";

      // Sync the subscription status to local user
      await ctx.runMutation(api.users.syncOAuthUserStatus, {
        email: args.email,
        subscriptionStatus: effectiveStatus,
        trialExpiresAt: centralUser.trialExpiresAt,
      });

      console.log(`[syncOAuthUserWithCentral] Synced ${args.email}: status=${effectiveStatus}, entitled=${isEntitled}, created=${centralUser.created}`);

      return {
        success: true,
        entitled: isEntitled,
        subscriptionStatus: effectiveStatus,
        created: centralUser.created,
      };
    } catch (error) {
      console.error("[syncOAuthUserWithCentral] Error:", error);
      return {
        success: false,
        entitled: true,
        subscriptionStatus: "trial",
        created: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Sync OAuth user's subscription status from central.
 * Called by syncOAuthUserWithCentral action.
 */
export const syncOAuthUserStatus = mutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.string(),
    trialExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      console.error("[syncOAuthUserStatus] User not found:", args.email);
      return { success: false, reason: "user_not_found" };
    }

    // SafeReads uses typed union for subscriptionStatus
    const validStatuses = ["trial", "active", "lifetime", "canceled", "past_due", "incomplete", "inactive"] as const;
    type SubscriptionStatus = typeof validStatuses[number];

    const status = validStatuses.includes(args.subscriptionStatus as SubscriptionStatus)
      ? (args.subscriptionStatus as SubscriptionStatus)
      : "trial";

    // Update subscription status
    const now = Date.now();
    await ctx.db.patch(user._id, {
      subscriptionStatus: status,
      trialExpiresAt: args.trialExpiresAt,
      centralAccessCacheExpiry: now + CENTRAL_ACCESS_CACHE_MS,
    });

    console.log(`[syncOAuthUserStatus] Updated ${args.email} to ${status}`);
    return { success: true };
  },
});
