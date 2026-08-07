import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { cascadeDeleteKidProfile, cascadeDeleteUser } from "./lib/cascadeDelete";

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
    const email = args.email.toLowerCase().trim();
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    // Fallback: try original case if normalized didn't match
    if (!user && email !== args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .first();
    }

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
// Internal-only: called by server actions (concernAlerts, weeklyDigest).
// Was a public query returning full user rows (PII) by arbitrary id.
export const getUserById = internalQuery({
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

/**
 * Internal query: check if a user's subscription allows AI usage.
 * Returns { allowed: true } or { allowed: false, message: string }.
 * Used by search/tutor/research actions before making OpenAI calls.
 */
export const checkSubscriptionActive = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        allowed: false,
        message: "Your family's SafeStudy account was not found. Ask your parent to sign in at getsafefamily.com",
      };
    }

    const status = user.subscriptionStatus;

    // Lifetime and active are always allowed
    if (status === "lifetime" || status === "active") {
      return { allowed: true };
    }

    // Trial is allowed only if not expired
    if (status === "trial") {
      if (user.trialEndsAt && Date.now() > user.trialEndsAt) {
        return {
          allowed: false,
          message: "Your family's SafeStudy free trial has expired. Ask your parent to subscribe at getsafefamily.com",
        };
      }
      return { allowed: true };
    }

    // Everything else (cancelled, expired, inactive, etc.)
    return {
      allowed: false,
      message: "Your family's SafeStudy access has expired. Ask your parent to renew at getsafefamily.com",
    };
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
      console.log(`[setSubscriptionStatus] Created new user with status ${args.status}`);
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

    console.log(`[setSubscriptionStatus] Updated user ${user._id} to ${args.status}`);
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
    familyCode: v.optional(v.string()), // Optional: use shared family code across apps
  },
  handler: async (ctx, args) => {
    console.log(`[provisionUser] Starting (OAuth: ${args.isOAuthUser ?? false})`);

    // 1. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    let userId;
    let wasCreated = false;
    let familyCode: string;

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const resolvedStatus = args.entitledToThisApp ? args.subscriptionStatus : "inactive";

    if (existingUser) {
      userId = existingUser._id;
      familyCode = existingUser.familyCode;

      const patch: Record<string, unknown> = {
        subscriptionStatus: resolvedStatus,
        stripeCustomerId: args.stripeCustomerId ?? existingUser.stripeCustomerId,
        subscriptionId: args.subscriptionId ?? existingUser.subscriptionId,
        name: args.name ?? existingUser.name,
      };
      if (args.familyCode && args.familyCode !== existingUser.familyCode) {
        patch.familyCode = args.familyCode;
        familyCode = args.familyCode;
      }
      if (resolvedStatus === "trial" && !existingUser.trialEndsAt) {
        patch.trialEndsAt = Date.now() + sevenDaysMs;
      }
      await ctx.db.patch(userId, patch);

      console.log(`[provisionUser] Updated existing user ${userId}`);
    } else {
      // Use provided family code or generate a new one
      familyCode = args.familyCode || await generateUniqueFamilyCode(ctx);

      userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name ?? undefined,
        subscriptionStatus: resolvedStatus,
        familyCode,
        createdAt: Date.now(),
        stripeCustomerId: args.stripeCustomerId ?? undefined,
        subscriptionId: args.subscriptionId ?? undefined,
        trialEndsAt: resolvedStatus === "trial" ? Date.now() + sevenDaysMs : undefined,
      });
      wasCreated = true;

      console.log(`[provisionUser] Created new user ${userId} with familyCode: ${familyCode}`);
    }

    // Auth is handled centrally by Marketing (JWT). No local authAccounts needed.

    return {
      success: true,
      userId: userId,
      familyCode,
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
      throw new Error("User not found");
    }

    const result = await cascadeDeleteUser(ctx, user._id);

    return {
      deletedUser: args.email,
      ...result,
    };
  },
});

// Mark onboarding as complete for a user
export const completeOnboarding = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      onboardingComplete: true,
    });
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
// Internal-only: grants lifetime access with no auth and has no callers.
// Was a public mutation (anyone could grant themselves lifetime via the URL).
export const grantLifetime = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
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
export const updateSubscriptionStatus = internalMutation({
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

// Update subscription by Stripe subscription ID (used by webhook for subscription updates/deletions)
// Internal-only: called solely by the Stripe webhook (convex/stripe.ts).
// Was a public mutation — anyone could forge a subscription by Stripe id.
export const updateSubscriptionByStripeId = internalMutation({
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

export const syncFamilyCodeByEmailInternal = internalMutation({
  args: {
    email: v.string(),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      return { found: false, familyCode: null, updated: false };
    }
    if (args.code) {
      await ctx.db.patch(user._id, { familyCode: args.code });
      return { found: true, familyCode: args.code, updated: true };
    }
    return { found: true, familyCode: user.familyCode ?? null, updated: false };
  },
});

// Re-point an account's email by id. Login + concern-alert emails resolve the
// parent by email, so this moves an account off a stale address to one the
// parent actually monitors. Guarded against collisions. Internal-only; run via
// CLI: npx convex run users:setUserEmailById '{"userId":"...","email":"..."}'
export const setUserEmailById = internalMutation({
  args: { userId: v.id("users"), email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existing && existing._id !== args.userId) {
      throw new Error(`Another user (${existing._id}) already uses ${email}`);
    }
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error(`No user with id ${args.userId}`);
    const previous = user.email ?? null;
    await ctx.db.patch(args.userId, { email });
    return { userId: args.userId, previous, email };
  },
});
