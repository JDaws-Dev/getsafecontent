import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Check whether the current user can run an analysis.
 * Trial users get 7 days; subscribed/lifetime users get unlimited.
 */
export const checkAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        hasAccess: false,
        isSubscribed: false,
        status: null,
        trialDaysRemaining: 0,
        analysisCount: 0,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        hasAccess: false,
        isSubscribed: false,
        status: null,
        trialDaysRemaining: 0,
        analysisCount: 0,
      };
    }

    const now = Date.now();
    const analysisCount = user.analysisCount ?? 0;
    const status = user.subscriptionStatus ?? "trial";
    // Fall back to _creationTime + 7 days if trialExpiresAt not set
    const trialExpiresAt = user.trialExpiresAt ?? (user._creationTime + TRIAL_DURATION_MS);

    // Determine access
    const isSubscribed = status === "active" || status === "lifetime";
    const isTrialValid = status === "trial" && now < trialExpiresAt;
    const hasAccess = isSubscribed || isTrialValid;

    // Calculate days remaining in trial
    const trialDaysRemaining = isTrialValid
      ? Math.ceil((trialExpiresAt - now) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      hasAccess,
      isSubscribed,
      status,
      trialDaysRemaining,
      analysisCount,
    };
  },
});

/**
 * Get subscription details for the settings/account UI.
 */
export const getDetails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        isSubscribed: false,
        status: null,
        currentPeriodEnd: null,
        trialExpiresAt: null,
        trialDaysRemaining: 0,
        analysisCount: 0,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        isSubscribed: false,
        status: null,
        currentPeriodEnd: null,
        trialExpiresAt: null,
        trialDaysRemaining: 0,
        analysisCount: 0,
      };
    }

    const now = Date.now();
    const analysisCount = user.analysisCount ?? 0;
    const status = user.subscriptionStatus ?? "trial";
    const trialExpiresAt = user.trialExpiresAt ?? (user._creationTime + TRIAL_DURATION_MS);

    const isSubscribed = status === "active" || status === "lifetime";
    const isTrialValid = status === "trial" && now < trialExpiresAt;
    const trialDaysRemaining = isTrialValid
      ? Math.ceil((trialExpiresAt - now) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      isSubscribed,
      status,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd ?? null,
      trialExpiresAt,
      trialDaysRemaining,
      analysisCount,
    };
  },
});

/**
 * Increment the analysis count for the current user after a successful analysis.
 */
export const incrementAnalysisCount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userId, {
      analysisCount: (user.analysisCount ?? 0) + 1,
    });
  },
});

/**
 * Update subscription status fields from Stripe webhook.
 * Looks up user by stripeCustomerId.
 */
export const updateSubscription = mutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete")
    ),
    subscriptionCurrentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique();

    if (!user) throw new Error("User not found for Stripe customer");

    await ctx.db.patch(user._id, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: args.subscriptionStatus,
      subscriptionCurrentPeriodEnd: args.subscriptionCurrentPeriodEnd,
    });
  },
});

/**
 * Store the Stripe customer ID on the current user's record.
 * Called after creating a Stripe customer during checkout.
 */
export const setStripeCustomerId = mutation({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

/**
 * Internal mutation to update subscription by email (for manual activation).
 */
export const updateSubscriptionByEmail = mutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete")
    ),
    subscriptionCurrentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) throw new Error(`User not found: ${args.email}`);

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.subscriptionStatus,
      subscriptionCurrentPeriodEnd: args.subscriptionCurrentPeriodEnd,
    });

    return { success: true, userId: user._id };
  },
});

/**
 * Internal mutation to grant lifetime access by email.
 * Called from HTTP admin endpoint.
 * Creates user if they don't exist (pre-provisioning for bundle purchases).
 */
export const grantLifetimeInternal = internalMutation({
  args: { email: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      // Create a new user with lifetime access (pre-provisioning)
      const userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        subscriptionStatus: "lifetime",
        analysisCount: 0,
      });
      return { success: true, email: args.email, created: true, userId };
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: "lifetime",
    });

    return { success: true, email: args.email, created: false };
  },
});
