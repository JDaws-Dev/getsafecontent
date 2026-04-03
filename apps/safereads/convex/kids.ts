import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * List all kids for a user.
 */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get a single kid by ID.
 */
export const getById = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.kidId);
  },
});

/**
 * Create a new kid.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    age: v.optional(v.number()),
    color: v.optional(v.string()),
    pin: v.optional(v.string()),
    readingLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kids", {
      userId: args.userId,
      name: args.name,
      age: args.age,
      color: args.color || "purple",
      pin: args.pin,
      readingLevel: args.readingLevel,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a kid's name, age, color, pin, or reading level.
 */
export const update = mutation({
  args: {
    kidId: v.id("kids"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    color: v.optional(v.string()),
    pin: v.optional(v.string()),
    readingLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { kidId, ...updates } = args;
    // Filter out undefined values
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(kidId, definedUpdates);
  },
});

/**
 * Delete a kid and all their wishlist entries, approved books, requests, and reading progress.
 */
export const remove = mutation({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    // Delete wishlist entries
    const wishlistItems = await ctx.db
      .query("wishlists")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const item of wishlistItems) {
      await ctx.db.delete(item._id);
    }

    // Delete approved books
    const approvedBooks = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const book of approvedBooks) {
      await ctx.db.delete(book._id);
    }

    // Delete book requests
    const bookRequests = await ctx.db
      .query("bookRequests")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const request of bookRequests) {
      await ctx.db.delete(request._id);
    }

    // Delete reading progress
    const readingProgress = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const progress of readingProgress) {
      await ctx.db.delete(progress._id);
    }

    await ctx.db.delete(args.kidId);
  },
});

/**
 * Verify a kid's PIN (read-only, for backward compat with query-based callers).
 * Note: Use verifyPinWithRateLimit mutation for new code — it enforces brute-force protection.
 */
export const verifyPin = query({
  args: {
    kidId: v.id("kids"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) return false;

    // Check lockout (if fields exist on the record)
    const kidRecord = kid as typeof kid & {
      pinFailedAttempts?: number;
      pinLockedUntil?: number;
    };
    if (kidRecord.pinLockedUntil && kidRecord.pinLockedUntil > Date.now()) {
      return false; // Locked out
    }

    return kid.pin === args.pin;
  },
});

/**
 * Verify a kid's PIN with brute-force protection.
 * Max 5 failed attempts, then 10-minute lockout.
 */
export const verifyPinWithRateLimit = mutation({
  args: {
    kidId: v.id("kids"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) return { success: false, locked: false };

    // Check lockout
    const kidRecord = kid as typeof kid & {
      pinFailedAttempts?: number;
      pinLockedUntil?: number;
    };
    if (kidRecord.pinLockedUntil && kidRecord.pinLockedUntil > Date.now()) {
      const remainingMs = kidRecord.pinLockedUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return { success: false, locked: true, remainingMinutes: remainingMin };
    }

    if (kid.pin === args.pin) {
      // Correct PIN — reset failed attempts
      await ctx.db.patch(args.kidId, {
        pinFailedAttempts: 0,
        pinLockedUntil: undefined,
      } as Record<string, unknown>);
      return { success: true, locked: false };
    }

    // Wrong PIN — increment failed attempts
    const failedAttempts = (kidRecord.pinFailedAttempts || 0) + 1;
    const LOCKOUT_THRESHOLD = 5;
    const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

    if (failedAttempts >= LOCKOUT_THRESHOLD) {
      await ctx.db.patch(args.kidId, {
        pinFailedAttempts: failedAttempts,
        pinLockedUntil: Date.now() + LOCKOUT_DURATION_MS,
      } as Record<string, unknown>);
      return { success: false, locked: true, remainingMinutes: 10 };
    }

    await ctx.db.patch(args.kidId, {
      pinFailedAttempts: failedAttempts,
    } as Record<string, unknown>);
    return { success: false, locked: false, attemptsRemaining: LOCKOUT_THRESHOLD - failedAttempts };
  },
});

/**
 * Clear a kid's PIN (remove PIN protection).
 */
export const clearPin = mutation({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.kidId, { pin: undefined });
  },
});

/**
 * Internal mutation to create a kid (used by HTTP endpoint for onboarding).
 */
export const createKidInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    age: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kids", {
      userId: args.userId,
      name: args.name,
      age: args.age,
    });
  },
});
