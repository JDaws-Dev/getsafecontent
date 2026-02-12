import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Central Users Management
 *
 * This module provides internal functions for managing the centralUsers table,
 * which stores user credentials centrally for the Safe Family marketing site.
 *
 * Users authenticate once on getsafefamily.com, and their credentials are
 * synced to individual apps (SafeTunes, SafeTube, SafeReads).
 *
 * IMPORTANT: All password hashes use Scrypt format (from lucia package)
 * to match what Convex Auth Password provider expects.
 */

// Subscription status type
const subscriptionStatusValidator = v.union(
  v.literal("trial"),
  v.literal("active"),
  v.literal("lifetime"),
  v.literal("cancelled"),
  v.literal("expired")
);

/**
 * Create a new central user.
 * Called when a user signs up on the marketing site.
 */
export const createCentralUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(), // Scrypt hash from lucia
    name: v.optional(v.string()),
    entitledApps: v.array(v.string()),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    subscriptionStatus: subscriptionStatusValidator,
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new Error(`Central user already exists: ${args.email}`);
    }

    const now = Date.now();

    const userId = await ctx.db.insert("centralUsers", {
      email: args.email.toLowerCase(),
      passwordHash: args.passwordHash,
      name: args.name,
      createdAt: now,
      entitledApps: args.entitledApps,
      stripeCustomerId: args.stripeCustomerId,
      subscriptionId: args.subscriptionId,
      subscriptionStatus: args.subscriptionStatus,
    });

    console.log(`[centralUsers] Created central user: ${args.email}`);

    return {
      success: true,
      userId,
    };
  },
});

/**
 * Get a central user by email.
 * Returns null if user doesn't exist.
 */
export const getCentralUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    return user;
  },
});

/**
 * Get a central user by Stripe customer ID.
 * Returns null if user doesn't exist.
 */
export const getCentralUserByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("centralUsers")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return user;
  },
});

/**
 * Update a central user.
 * All fields are optional; only provided fields will be updated.
 */
export const updateCentralUser = internalMutation({
  args: {
    email: v.string(), // Used to look up the user
    passwordHash: v.optional(v.string()),
    name: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
    entitledApps: v.optional(v.array(v.string())),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(subscriptionStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error(`Central user not found: ${args.email}`);
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (args.passwordHash !== undefined) {
      updates.passwordHash = args.passwordHash;
    }
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.lastLoginAt !== undefined) {
      updates.lastLoginAt = args.lastLoginAt;
    }
    if (args.entitledApps !== undefined) {
      updates.entitledApps = args.entitledApps;
    }
    if (args.stripeCustomerId !== undefined) {
      updates.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.subscriptionId !== undefined) {
      updates.subscriptionId = args.subscriptionId;
    }
    if (args.subscriptionStatus !== undefined) {
      updates.subscriptionStatus = args.subscriptionStatus;
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, userId: user._id, noChanges: true };
    }

    await ctx.db.patch(user._id, updates);

    console.log(`[centralUsers] Updated central user: ${args.email}`);

    return {
      success: true,
      userId: user._id,
    };
  },
});

/**
 * Update a central user's entitled apps.
 * Convenience function for modifying app access.
 */
export const updateCentralUserEntitlements = internalMutation({
  args: {
    email: v.string(),
    entitledApps: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error(`Central user not found: ${args.email}`);
    }

    await ctx.db.patch(user._id, {
      entitledApps: args.entitledApps,
    });

    console.log(
      `[centralUsers] Updated entitlements for ${args.email}: ${args.entitledApps.join(", ")}`
    );

    return {
      success: true,
      userId: user._id,
      entitledApps: args.entitledApps,
    };
  },
});

/**
 * Record a login for a central user.
 * Updates the lastLoginAt timestamp.
 */
export const recordCentralUserLogin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error(`Central user not found: ${args.email}`);
    }

    const now = Date.now();

    await ctx.db.patch(user._id, {
      lastLoginAt: now,
    });

    return {
      success: true,
      userId: user._id,
      lastLoginAt: now,
    };
  },
});

/**
 * Delete a central user.
 * DANGEROUS: This permanently removes the user's central account.
 */
export const deleteCentralUser = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      return { success: false, reason: "user_not_found" };
    }

    await ctx.db.delete(user._id);

    console.log(`[centralUsers] Deleted central user: ${args.email}`);

    return {
      success: true,
      deletedUserId: user._id,
    };
  },
});

/**
 * Verify a central user's credentials.
 * This is a query that returns the user if email exists (for password verification).
 * Note: Actual password verification should be done by the caller using Scrypt.verify().
 */
export const verifyCentralUserCredentials = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      return { exists: false, email: args.email };
    }

    return {
      exists: true,
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      entitledApps: user.entitledApps,
      subscriptionStatus: user.subscriptionStatus,
    };
  },
});

/**
 * Create or update a central user (upsert).
 * Called during signup/subscription flows where user may or may not exist.
 */
export const upsertCentralUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.string()), // Optional for updates
    name: v.optional(v.string()),
    entitledApps: v.optional(v.array(v.string())),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(subscriptionStatusValidator),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      // Update existing user
      const updates: Record<string, unknown> = {};

      if (args.passwordHash !== undefined) {
        updates.passwordHash = args.passwordHash;
      }
      if (args.name !== undefined) {
        updates.name = args.name;
      }
      if (args.entitledApps !== undefined) {
        updates.entitledApps = args.entitledApps;
      }
      if (args.stripeCustomerId !== undefined) {
        updates.stripeCustomerId = args.stripeCustomerId;
      }
      if (args.subscriptionId !== undefined) {
        updates.subscriptionId = args.subscriptionId;
      }
      if (args.subscriptionStatus !== undefined) {
        updates.subscriptionStatus = args.subscriptionStatus;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingUser._id, updates);
        console.log(`[centralUsers] Updated existing central user: ${args.email}`);
      }

      return {
        success: true,
        userId: existingUser._id,
        created: false,
        updated: Object.keys(updates).length > 0,
      };
    } else {
      // Create new user - passwordHash is required for new users
      if (!args.passwordHash) {
        throw new Error("passwordHash is required when creating a new central user");
      }

      const now = Date.now();

      const userId = await ctx.db.insert("centralUsers", {
        email: args.email.toLowerCase(),
        passwordHash: args.passwordHash,
        name: args.name,
        createdAt: now,
        entitledApps: args.entitledApps ?? [],
        stripeCustomerId: args.stripeCustomerId,
        subscriptionId: args.subscriptionId,
        subscriptionStatus: args.subscriptionStatus ?? "trial",
      });

      console.log(`[centralUsers] Created new central user: ${args.email}`);

      return {
        success: true,
        userId,
        created: true,
        updated: false,
      };
    }
  },
});
