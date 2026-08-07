import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

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
 * Get user by email - for use with JWT auth where email comes from the token
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

/**
 * Internal query to get user by email (for use by actions)
 */
export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

/**
 * Apply a coupon code to user's account
 * With JWT auth, email is passed from authenticated frontend
 */
export const applyCouponCode = internalMutation({
  args: {
    email: v.string(),
    couponCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

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
    await ctx.db.patch(user._id, {
      subscriptionStatus: "lifetime",
      couponCode: couponUpper,
    });

    return { success: true, status: "lifetime" };
  },
});

/**
 * Get SafeTube user data by email
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
 * This catches any users who were created in central but not provisioned locally
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

    // User doesn't exist locally, create them
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
      onboardingCompleted: false,
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
export const updateSafeTubeUserSubscription = internalMutation({
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
 * With JWT auth, the email is passed from the authenticated frontend.
 *
 * Returns cached result if within 5-minute window.
 */
export const verifyCentralAccess = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args): Promise<{
    hasAccess: boolean;
    reason: string;
    subscriptionStatus: string | null;
    cached: boolean;
  }> => {
    // Get user by email
    const user = await ctx.runQuery(internal.userSync.getUserByEmailInternal, { email: args.email });

    if (!user) {
      return {
        hasAccess: false,
        reason: "user_not_found",
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
      url.searchParams.set("email", args.email);
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
          email: args.email,
          subscriptionStatus: result.subscriptionStatus,
          subscriptionEndsAt: result.subscriptionEndsAt,
          trialExpiresAt: result.trialExpiresAt,
        });
      } else {
        // Just update the cache expiry
        await ctx.runMutation(api.userSync.updateCentralAccessCache, {
          email: args.email,
        });
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
 * With JWT auth, email is passed from the action.
 */
export const syncFromCentralAccess = mutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.string(),
    subscriptionEndsAt: v.optional(v.number()),
    trialExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
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
 * With JWT auth, email is passed from the action.
 */
export const updateCentralAccessCache = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
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

      // Check if user is entitled to SafeTube
      const isEntitled = centralUser.entitledApps?.includes("safetube") ?? false;
      const effectiveStatus = isEntitled ? centralUser.subscriptionStatus : "inactive";

      // Sync the subscription status to local user
      await ctx.runMutation(api.userSync.syncOAuthUserStatus, {
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

    // Update subscription status
    const now = Date.now();
    await ctx.db.patch(user._id, {
      subscriptionStatus: args.subscriptionStatus,
      centralAccessCacheExpiry: now + CENTRAL_ACCESS_CACHE_MS,
    });

    console.log(`[syncOAuthUserStatus] Updated ${args.email} to ${args.subscriptionStatus}`);
    return { success: true };
  },
});
