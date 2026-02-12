import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Central Accounts API
 *
 * These endpoints manage unified Safe Family accounts.
 * Individual apps (SafeTunes, SafeTube, SafeReads) call verifyAppAccess
 * to check if a user has entitlement to their app.
 *
 * Note: This file is shared between SafeReads and the Marketing site
 * since they use the same Convex deployment (exuberant-puffin-838).
 */

// Constants
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
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

// App validator for reuse
const appValidator = v.union(
  v.literal("safetunes"),
  v.literal("safetube"),
  v.literal("safereads")
);

/**
 * Create a new account
 *
 * Called during signup when a user creates their Safe Family account.
 * Initializes trial period and sets entitled apps based on selection.
 */
export const createAccount = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    // Which apps the user is signing up for
    selectedApps: v.array(appValidator),
    // Optional coupon code for lifetime access
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email, name, selectedApps, couponCode } = args;
    const now = Date.now();

    // Check if account already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      throw new Error("Account already exists with this email");
    }

    // Validate that at least one app is selected
    if (selectedApps.length === 0) {
      throw new Error("At least one app must be selected");
    }

    // Handle coupon code
    let subscriptionStatus: SubscriptionStatus = "trial";
    let entitledApps = selectedApps;
    let couponRedeemedAt: number | undefined;

    if (couponCode) {
      const coupon = await ctx.db
        .query("couponCodes")
        .withIndex("by_code", (q) => q.eq("code", couponCode.toUpperCase()))
        .first();

      if (!coupon) {
        throw new Error("Invalid coupon code");
      }

      if (!coupon.active) {
        throw new Error("This coupon code is no longer active");
      }

      if (coupon.expiresAt && coupon.expiresAt < now) {
        throw new Error("This coupon code has expired");
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error("This coupon code has reached its usage limit");
      }

      // Apply coupon benefits
      if (coupon.type === "lifetime") {
        subscriptionStatus = "lifetime";
        // If coupon grants specific apps, use those; otherwise grant all selected
        entitledApps = coupon.grantedApps ?? [...ALL_APPS];
      }

      couponRedeemedAt = now;

      // Increment usage count
      await ctx.db.patch(coupon._id, {
        usageCount: coupon.usageCount + 1,
      });
    }

    // Create the account
    const userId = await ctx.db.insert("users", {
      email,
      name,
      subscriptionStatus,
      trialStartedAt: subscriptionStatus === "trial" ? now : undefined,
      trialExpiresAt:
        subscriptionStatus === "trial" ? now + TRIAL_DURATION_MS : undefined,
      entitledApps: entitledApps as AppType[],
      onboardingCompleted: {
        safetunes: false,
        safetube: false,
        safereads: false,
      },
      couponCode: couponCode?.toUpperCase(),
      couponRedeemedAt,
      createdAt: now,
      lastLoginAt: now,
    });

    // Log the account creation event
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email,
      eventType: couponCode ? "coupon.applied" : "trial.started",
      eventData: JSON.stringify({
        selectedApps,
        couponCode,
        subscriptionStatus,
      }),
      subscriptionStatus,
      timestamp: now,
    });

    return {
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
 * Get account by email
 *
 * Returns the account details for a given email.
 * Used by individual apps to fetch user data after auth.
 */
export const getAccountByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return null;
    }

    // Check if trial has expired
    const now = Date.now();
    let effectiveStatus = user.subscriptionStatus;
    if (
      user.subscriptionStatus === "trial" &&
      user.trialExpiresAt &&
      user.trialExpiresAt < now
    ) {
      effectiveStatus = "expired";
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      subscriptionStatus: effectiveStatus,
      trialStartedAt: user.trialStartedAt,
      trialExpiresAt: user.trialExpiresAt,
      entitledApps: user.entitledApps ?? [],
      onboardingCompleted: user.onboardingCompleted,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  },
});

/**
 * Get current authenticated user
 *
 * Returns the account details for the currently logged in user.
 * Used by the /account page to display user information.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Check if trial has expired
    const now = Date.now();
    let effectiveStatus = user.subscriptionStatus;
    if (
      user.subscriptionStatus === "trial" &&
      user.trialExpiresAt &&
      user.trialExpiresAt < now
    ) {
      effectiveStatus = "expired";
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      subscriptionStatus: effectiveStatus,
      trialStartedAt: user.trialStartedAt,
      trialExpiresAt: user.trialExpiresAt,
      entitledApps: user.entitledApps ?? [],
      onboardingCompleted: user.onboardingCompleted,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionEndsAt: user.subscriptionEndsAt,
      billingInterval: user.billingInterval,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  },
});

/**
 * Get account by ID
 *
 * Returns the account details for a given user ID.
 */
export const getAccount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    // Check if trial has expired
    const now = Date.now();
    let effectiveStatus = user.subscriptionStatus;
    if (
      user.subscriptionStatus === "trial" &&
      user.trialExpiresAt &&
      user.trialExpiresAt < now
    ) {
      effectiveStatus = "expired";
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      subscriptionStatus: effectiveStatus,
      trialStartedAt: user.trialStartedAt,
      trialExpiresAt: user.trialExpiresAt,
      entitledApps: user.entitledApps ?? [],
      onboardingCompleted: user.onboardingCompleted,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionEndsAt: user.subscriptionEndsAt,
      billingInterval: user.billingInterval,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  },
});

/**
 * Get all accounts (admin only)
 *
 * Returns all user accounts for admin dashboard.
 */
export const getAllAccounts = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    return users.map((user) => {
      // Check if trial has expired
      const now = Date.now();
      let effectiveStatus = user.subscriptionStatus;
      if (
        user.subscriptionStatus === "trial" &&
        user.trialExpiresAt &&
        user.trialExpiresAt < now
      ) {
        effectiveStatus = "expired";
      }

      return {
        id: user._id,
        email: user.email,
        name: user.name,
        subscriptionStatus: effectiveStatus,
        trialStartedAt: user.trialStartedAt,
        trialExpiresAt: user.trialExpiresAt,
        entitledApps: user.entitledApps ?? [],
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };
    });
  },
});

/**
 * Update account
 *
 * Updates account fields. Can update name, timezone, and onboarding status.
 * Subscription changes should go through dedicated endpoints (for audit trail).
 */
export const updateAccount = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    // Update onboarding status for a specific app
    onboardingCompleted: v.optional(
      v.object({
        app: appValidator,
        completed: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId, name, timezone, onboardingCompleted } = args;

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Account not found");
    }

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (timezone !== undefined) {
      updates.timezone = timezone;
    }

    if (onboardingCompleted) {
      const currentOnboarding = user.onboardingCompleted ?? {
        safetunes: false,
        safetube: false,
        safereads: false,
      };

      updates.onboardingCompleted = {
        ...currentOnboarding,
        [onboardingCompleted.app]: onboardingCompleted.completed,
      };
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }

    return { success: true };
  },
});

/**
 * Update last login timestamp
 *
 * Called when user logs into any app.
 */
export const updateLastLogin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(args.userId, {
      lastLoginAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete account
 *
 * Soft-deletes the account by removing personal data but keeping audit trail.
 * Logs the deletion event for compliance.
 */
export const deleteAccount = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()), // User-provided reason for deletion
  },
  handler: async (ctx, args) => {
    const { userId, reason } = args;
    const now = Date.now();

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Account not found");
    }

    // Log the deletion event before deleting
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email: user.email ?? "unknown",
      eventType: "account.deleted",
      eventData: JSON.stringify({
        reason,
        subscriptionStatus: user.subscriptionStatus,
        entitledApps: user.entitledApps,
        accountAge: user.createdAt ? now - user.createdAt : undefined,
      }),
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      timestamp: now,
    });

    // Delete the user record
    // Note: Auth tables will be cleaned up by Convex Auth automatically
    await ctx.db.delete(userId);

    // Clean up app sync status
    const syncRecords = await ctx.db
      .query("appSyncStatus")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const record of syncRecords) {
      await ctx.db.delete(record._id);
    }

    return { success: true, deletedAt: now };
  },
});

/**
 * Verify app access
 *
 * This is the key endpoint that individual apps call to check if a user
 * has access to their app. Returns entitlement status and subscription info.
 *
 * This endpoint is designed to be called via HTTP from individual apps.
 */
export const verifyAppAccess = query({
  args: {
    email: v.string(),
    app: appValidator,
  },
  handler: async (ctx, args) => {
    const { email, app } = args;
    const now = Date.now();

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return {
        hasAccess: false,
        reason: "account_not_found",
        subscriptionStatus: null,
      };
    }

    // Check subscription status
    let effectiveStatus = user.subscriptionStatus;

    // Handle expired trial
    if (
      user.subscriptionStatus === "trial" &&
      user.trialExpiresAt &&
      user.trialExpiresAt < now
    ) {
      effectiveStatus = "expired";
    }

    // Check if user has access to this specific app
    const entitledApps = user.entitledApps ?? [];
    const hasAppEntitlement = entitledApps.includes(app);

    // Determine access
    let hasAccess = false;
    let reason = "";

    if (!hasAppEntitlement) {
      hasAccess = false;
      reason = "app_not_entitled";
    } else if (effectiveStatus === "trial") {
      hasAccess = true;
      reason = "trial_active";
    } else if (effectiveStatus === "active" || effectiveStatus === "lifetime") {
      hasAccess = true;
      reason = effectiveStatus;
    } else if (effectiveStatus === "expired") {
      hasAccess = false;
      reason = "trial_expired";
    } else if (effectiveStatus === "canceled") {
      // Check if still in billing period
      if (user.subscriptionEndsAt && user.subscriptionEndsAt > now) {
        hasAccess = true;
        reason = "canceled_but_active";
      } else {
        hasAccess = false;
        reason = "subscription_canceled";
      }
    } else if (effectiveStatus === "past_due") {
      // Allow limited access during grace period (3 days)
      const gracePeriod = 3 * 24 * 60 * 60 * 1000;
      if (user.subscriptionEndsAt && now - user.subscriptionEndsAt < gracePeriod) {
        hasAccess = true;
        reason = "past_due_grace_period";
      } else {
        hasAccess = false;
        reason = "payment_failed";
      }
    } else {
      hasAccess = false;
      reason = "subscription_inactive";
    }

    return {
      hasAccess,
      reason,
      subscriptionStatus: effectiveStatus,
      trialExpiresAt: user.trialExpiresAt,
      subscriptionEndsAt: user.subscriptionEndsAt,
      entitledApps,
      userName: user.name,
      userId: user._id,
      onboardingCompleted: user.onboardingCompleted?.[app] ?? false,
    };
  },
});

/**
 * Update subscription status
 *
 * Called by Stripe webhook to update subscription state.
 * This is an internal mutation - not exposed to frontend directly.
 */
export const updateSubscription = mutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("lifetime"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("expired")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionEndsAt: v.optional(v.number()),
    billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
    entitledApps: v.optional(v.array(appValidator)),
    stripeEventId: v.optional(v.string()), // For deduplication
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for duplicate webhook event
    if (args.stripeEventId) {
      const existingEvent = await ctx.db
        .query("subscriptionEvents")
        .withIndex("by_stripe_event_id", (q) =>
          q.eq("stripeEventId", args.stripeEventId)
        )
        .first();

      if (existingEvent) {
        return { success: true, duplicate: true };
      }
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      // Log event even if user not found
      await ctx.db.insert("subscriptionEvents", {
        email: args.email,
        eventType: "subscription.update_failed",
        eventData: JSON.stringify(args),
        errorMessage: "User not found",
        stripeEventId: args.stripeEventId,
        timestamp: now,
      });
      throw new Error("Account not found for email: " + args.email);
    }

    // Update user
    const updates: Record<string, unknown> = {
      subscriptionStatus: args.subscriptionStatus,
    };

    if (args.stripeCustomerId) {
      updates.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.stripeSubscriptionId) {
      updates.stripeSubscriptionId = args.stripeSubscriptionId;
    }
    if (args.subscriptionEndsAt) {
      updates.subscriptionEndsAt = args.subscriptionEndsAt;
    }
    if (args.billingInterval) {
      updates.billingInterval = args.billingInterval;
    }
    if (args.entitledApps) {
      updates.entitledApps = args.entitledApps;
    }

    await ctx.db.patch(user._id, updates);

    // Log the event
    await ctx.db.insert("subscriptionEvents", {
      userId: user._id,
      email: args.email,
      eventType: "subscription.updated",
      eventData: JSON.stringify(args),
      subscriptionStatus: args.subscriptionStatus,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeEventId: args.stripeEventId,
      timestamp: now,
    });

    return { success: true, userId: user._id };
  },
});

/**
 * Add app to subscription
 *
 * Adds a new app to user's entitled apps list.
 * Used when user upgrades to add more apps.
 */
export const addAppEntitlement = mutation({
  args: {
    userId: v.id("users"),
    app: appValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Account not found");
    }

    const entitledApps = user.entitledApps ?? [];

    if (entitledApps.includes(args.app)) {
      return { success: true, alreadyEntitled: true };
    }

    const newEntitledApps = [...entitledApps, args.app] as AppType[];

    await ctx.db.patch(args.userId, {
      entitledApps: newEntitledApps,
    });

    // Log the event
    await ctx.db.insert("subscriptionEvents", {
      userId: args.userId,
      email: user.email ?? "unknown",
      eventType: "entitlement.granted",
      eventData: JSON.stringify({ app: args.app }),
      subscriptionStatus: user.subscriptionStatus,
      timestamp: Date.now(),
    });

    return { success: true, entitledApps: newEntitledApps };
  },
});

/**
 * Remove app from subscription
 *
 * Removes an app from user's entitled apps list.
 * Used when user downgrades or removes an app.
 */
export const removeAppEntitlement = mutation({
  args: {
    userId: v.id("users"),
    app: appValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Account not found");
    }

    const entitledApps = user.entitledApps ?? [];

    if (!entitledApps.includes(args.app)) {
      return { success: true, wasNotEntitled: true };
    }

    const newEntitledApps = entitledApps.filter(
      (a) => a !== args.app
    ) as AppType[];

    await ctx.db.patch(args.userId, {
      entitledApps: newEntitledApps,
    });

    // Log the event
    await ctx.db.insert("subscriptionEvents", {
      userId: args.userId,
      email: user.email ?? "unknown",
      eventType: "entitlement.revoked",
      eventData: JSON.stringify({ app: args.app }),
      subscriptionStatus: user.subscriptionStatus,
      timestamp: Date.now(),
    });

    return { success: true, entitledApps: newEntitledApps };
  },
});

/**
 * Request subscription app change
 *
 * Prepares the data needed to update subscription apps via Stripe.
 * Returns the current subscription ID and validates the request.
 * The actual Stripe update is done client-side via /api/subscription/update-apps.
 */
export const prepareSubscriptionChange = mutation({
  args: {
    userId: v.id("users"),
    newApps: v.array(appValidator),
  },
  handler: async (ctx, args) => {
    const { userId, newApps } = args;
    const now = Date.now();

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Account not found");
    }

    // Validate subscription status
    if (
      user.subscriptionStatus !== "active" &&
      user.subscriptionStatus !== "trial"
    ) {
      throw new Error(
        "Cannot modify apps - subscription is not active. Status: " +
          user.subscriptionStatus
      );
    }

    // Validate new apps
    if (newApps.length === 0) {
      throw new Error("At least one app must be selected");
    }

    // Check for Stripe subscription ID
    if (!user.stripeSubscriptionId) {
      // Trial users without Stripe subscription
      // They can change apps freely during trial (just update entitledApps)
      if (user.subscriptionStatus === "trial") {
        await ctx.db.patch(userId, {
          entitledApps: newApps as AppType[],
        });

        await ctx.db.insert("subscriptionEvents", {
          userId,
          email: user.email ?? "unknown",
          eventType: "subscription.apps_changed",
          eventData: JSON.stringify({
            previousApps: user.entitledApps,
            newApps,
            duringTrial: true,
          }),
          subscriptionStatus: user.subscriptionStatus,
          timestamp: now,
        });

        return {
          success: true,
          stripeSubscriptionId: null,
          trialChange: true,
          newApps,
          message: "Trial apps updated successfully",
        };
      }

      throw new Error(
        "No Stripe subscription found. Please contact support."
      );
    }

    // Return the subscription ID for the client to use with Stripe API
    return {
      success: true,
      stripeSubscriptionId: user.stripeSubscriptionId,
      trialChange: false,
      currentApps: user.entitledApps ?? [],
      newApps,
      billingInterval: user.billingInterval,
    };
  },
});

/**
 * Confirm subscription app change
 *
 * Called after the Stripe API update succeeds.
 * Updates the user's entitled apps in our database.
 */
export const confirmSubscriptionChange = mutation({
  args: {
    userId: v.id("users"),
    newApps: v.array(appValidator),
    newPriceId: v.optional(v.string()),
    priceChanged: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, newApps, newPriceId, priceChanged } = args;
    const now = Date.now();

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Account not found");
    }

    const previousApps = user.entitledApps ?? [];

    // Update entitled apps
    await ctx.db.patch(userId, {
      entitledApps: newApps as AppType[],
    });

    // Log the event
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email: user.email ?? "unknown",
      eventType: "subscription.apps_changed",
      eventData: JSON.stringify({
        previousApps,
        newApps,
        priceChanged,
        newPriceId,
      }),
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
      timestamp: now,
    });

    return {
      success: true,
      previousApps,
      newApps,
    };
  },
});

/**
 * Grant lifetime access
 *
 * Admin function to grant lifetime access to all apps.
 * Used for special users (friends, family, etc.).
 */
export const grantLifetimeAccess = mutation({
  args: {
    email: v.string(),
    adminKey: v.string(), // For authentication
    apps: v.optional(v.array(appValidator)), // Which apps to grant (default: all)
  },
  handler: async (ctx, args) => {
    // Verify admin key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || args.adminKey !== expectedKey) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    const appsToGrant = args.apps ?? ([...ALL_APPS] as AppType[]);

    if (!user) {
      // Create the user with lifetime access
      const userId = await ctx.db.insert("users", {
        email: args.email,
        subscriptionStatus: "lifetime",
        entitledApps: appsToGrant,
        onboardingCompleted: {
          safetunes: false,
          safetube: false,
          safereads: false,
        },
        createdAt: now,
      });

      // Log the event
      await ctx.db.insert("subscriptionEvents", {
        userId,
        email: args.email,
        eventType: "entitlement.granted",
        eventData: JSON.stringify({
          type: "lifetime_grant",
          apps: appsToGrant,
          created: true
        }),
        subscriptionStatus: "lifetime",
        timestamp: now,
      });

      return { success: true, userId, created: true };
    }

    // Update existing user
    await ctx.db.patch(user._id, {
      subscriptionStatus: "lifetime",
      entitledApps: appsToGrant,
    });

    // Log the event
    await ctx.db.insert("subscriptionEvents", {
      userId: user._id,
      email: args.email,
      eventType: "entitlement.granted",
      eventData: JSON.stringify({
        type: "lifetime_grant",
        apps: appsToGrant,
        previousStatus: user.subscriptionStatus
      }),
      subscriptionStatus: "lifetime",
      timestamp: now,
    });

    return { success: true, userId: user._id, created: false };
  },
});

/**
 * Validate a coupon code
 *
 * Checks if a coupon code is valid and returns its details.
 * Used by the signup page to validate codes before form submission.
 */
export const validateCouponCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();

    if (!code) {
      return { valid: false, reason: "Code is required" };
    }

    // Check database first
    const coupon = await ctx.db
      .query("couponCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (coupon) {
      const now = Date.now();

      if (!coupon.active) {
        return { valid: false, reason: "This code is no longer active" };
      }

      if (coupon.expiresAt && coupon.expiresAt < now) {
        return { valid: false, reason: "This code has expired" };
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, reason: "This code has reached its usage limit" };
      }

      return {
        valid: true,
        type: coupon.type,
        grantedApps: coupon.grantedApps ?? [...ALL_APPS],
      };
    }

    // Fallback to hardcoded lifetime codes (for backwards compatibility)
    const HARDCODED_LIFETIME_CODES = ["DAWSFRIEND", "DEWITT"];
    if (HARDCODED_LIFETIME_CODES.includes(code)) {
      return {
        valid: true,
        type: "lifetime" as const,
        grantedApps: [...ALL_APPS],
      };
    }

    return { valid: false, reason: "Invalid code" };
  },
});

/**
 * Apply a lifetime coupon code to the current user
 *
 * Called after user signs up with a valid lifetime code.
 * Updates their status from trial to lifetime and grants access to all apps.
 */
export const applyLifetimeCode = mutation({
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

    const code = args.couponCode.trim().toUpperCase();
    const now = Date.now();

    // Validate the coupon code
    let isValidLifetimeCode = false;
    let grantedApps: AppType[] = [...ALL_APPS];

    // Check database first
    const coupon = await ctx.db
      .query("couponCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (coupon) {
      if (!coupon.active) {
        throw new Error("This code is no longer active");
      }

      if (coupon.expiresAt && coupon.expiresAt < now) {
        throw new Error("This code has expired");
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error("This code has reached its usage limit");
      }

      if (coupon.type === "lifetime") {
        isValidLifetimeCode = true;
        grantedApps = (coupon.grantedApps ?? [...ALL_APPS]) as AppType[];

        // Increment usage count
        await ctx.db.patch(coupon._id, {
          usageCount: coupon.usageCount + 1,
        });
      }
    } else {
      // Fallback to hardcoded lifetime codes
      const HARDCODED_LIFETIME_CODES = ["DAWSFRIEND", "DEWITT"];
      if (HARDCODED_LIFETIME_CODES.includes(code)) {
        isValidLifetimeCode = true;
        grantedApps = [...ALL_APPS] as AppType[];
      }
    }

    if (!isValidLifetimeCode) {
      throw new Error("Invalid or non-lifetime coupon code");
    }

    // Update user to lifetime status
    await ctx.db.patch(userId, {
      subscriptionStatus: "lifetime",
      entitledApps: grantedApps,
      couponCode: code,
      couponRedeemedAt: now,
      // Clear trial fields since they're now lifetime
      trialStartedAt: undefined,
      trialExpiresAt: undefined,
    });

    // Log the event
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email: user.email ?? "unknown",
      eventType: "coupon.applied",
      eventData: JSON.stringify({
        code,
        previousStatus: user.subscriptionStatus,
        grantedApps,
      }),
      subscriptionStatus: "lifetime",
      timestamp: now,
    });

    return {
      success: true,
      subscriptionStatus: "lifetime",
      entitledApps: grantedApps,
    };
  },
});
