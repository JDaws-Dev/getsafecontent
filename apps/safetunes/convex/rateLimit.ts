import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";

/**
 * Rate Limiting Configuration
 *
 * Prevents abuse of critical endpoints:
 * - Login: 5 attempts per 15 minutes (prevents brute force)
 * - Signup: 3 attempts per hour (prevents spam signups)
 * - Requests: 20 per minute per user (prevents spam requests)
 * - Search: 30 per minute per user (prevents DoS)
 */

export const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  request: {
    maxAttempts: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  search: {
    maxAttempts: 30,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Check if an action is rate limited
 * Returns true if rate limit exceeded, false if allowed
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  identifier: string,
  action: RateLimitAction
): Promise<{ limited: boolean; remainingAttempts: number; resetAt: number }> {
  const now = Date.now();
  const config = RATE_LIMITS[action];

  // Find existing rate limit record
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier_and_action", (q) =>
      q.eq("identifier", identifier).eq("action", action)
    )
    .filter((q) => q.gte(q.field("expiresAt"), now))
    .first();

  if (!existing) {
    // No existing record, create new one
    await ctx.db.insert("rateLimits", {
      identifier,
      action,
      attempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
      expiresAt: now + config.windowMs,
    });

    return {
      limited: false,
      remainingAttempts: config.maxAttempts - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Check if we're still within the time window
  const windowAge = now - existing.firstAttemptAt;

  if (windowAge > config.windowMs) {
    // Window expired, reset the counter
    await ctx.db.patch(existing._id, {
      attempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
      expiresAt: now + config.windowMs,
    });

    return {
      limited: false,
      remainingAttempts: config.maxAttempts - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Increment attempts
  const newAttempts = existing.attempts + 1;
  await ctx.db.patch(existing._id, {
    attempts: newAttempts,
    lastAttemptAt: now,
  });

  // Check if rate limited
  const limited = newAttempts > config.maxAttempts;
  const remainingAttempts = Math.max(0, config.maxAttempts - newAttempts);

  return {
    limited,
    remainingAttempts,
    resetAt: existing.expiresAt,
  };
}

/**
 * Clean up expired rate limit records (can be called periodically)
 */
export const cleanupExpiredRateLimits = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired records
    const expired = await ctx.db
      .query("rateLimits")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Delete them
    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    return { deleted: expired.length };
  },
});

/**
 * Reset rate limit for a specific identifier/action (admin use)
 */
export const resetRateLimit = mutation({
  args: {
    identifier: v.string(),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_and_action", (q) =>
        q.eq("identifier", args.identifier).eq("action", args.action)
      )
      .first();

    if (record) {
      await ctx.db.delete(record._id);
    }

    return { success: true };
  },
});
