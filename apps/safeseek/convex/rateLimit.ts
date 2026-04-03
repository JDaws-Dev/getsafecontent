import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * Server-side rate limiting for AI-powered actions.
 *
 * Limits per user per action (sliding window):
 *   - search:   10 requests / 60s
 *   - tutor:    15 requests / 60s
 *   - research:  5 requests / 60s
 *   - global:   50 requests / 3600s  (all AI actions combined)
 */

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  search: { maxRequests: 10, windowMs: 60_000 },
  tutor: { maxRequests: 15, windowMs: 60_000 },
  research: { maxRequests: 5, windowMs: 60_000 },
  global: { maxRequests: 50, windowMs: 3_600_000 },
};

/**
 * Check whether a user is allowed to perform an action.
 * Also lazily prunes expired timestamps from the record.
 *
 * Returns { allowed: true } or { allowed: false, retryAfter: <ms> }.
 */
export const check = query({
  args: {
    userId: v.id("users"),
    action: v.string(),
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; retryAfter?: number }> => {
    const limit = RATE_LIMITS[args.action];
    if (!limit) return { allowed: true };

    const now = Date.now();
    const windowStart = now - limit.windowMs;

    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) =>
        q.eq("userId", args.userId).eq("action", args.action)
      )
      .unique();

    if (!record) return { allowed: true };

    // Count timestamps within the current window
    const activeTimestamps = record.timestamps.filter((t) => t > windowStart);

    if (activeTimestamps.length >= limit.maxRequests) {
      // Find the oldest timestamp in the window — that's when the first slot frees up
      const oldest = Math.min(...activeTimestamps);
      const retryAfter = oldest + limit.windowMs - now;
      return { allowed: false, retryAfter: Math.max(retryAfter, 1000) };
    }

    return { allowed: true };
  },
});

/**
 * Record a new request timestamp for rate limiting.
 * Creates the record if it doesn't exist, appends + prunes if it does.
 */
export const record = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const limit = RATE_LIMITS[args.action];
    if (!limit) return;

    const now = Date.now();
    const windowStart = now - limit.windowMs;

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) =>
        q.eq("userId", args.userId).eq("action", args.action)
      )
      .unique();

    if (existing) {
      // Prune old timestamps and append new one
      const pruned = existing.timestamps.filter((t) => t > windowStart);
      pruned.push(now);
      await ctx.db.patch(existing._id, { timestamps: pruned });
    } else {
      await ctx.db.insert("rateLimits", {
        userId: args.userId,
        action: args.action,
        timestamps: [now],
      });
    }
  },
});

/**
 * Combined check-and-record for use from actions.
 * Checks both the per-action limit AND the global hourly limit.
 * Returns { allowed: true } or { allowed: false, retryAfter, message }.
 */
export const checkAndRecord = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ allowed: boolean; retryAfter?: number; message?: string }> => {
    const now = Date.now();

    // --- Check per-action limit ---
    const actionLimit = RATE_LIMITS[args.action];
    if (actionLimit) {
      const windowStart = now - actionLimit.windowMs;
      const actionRecord = await ctx.db
        .query("rateLimits")
        .withIndex("by_user_action", (q) =>
          q.eq("userId", args.userId).eq("action", args.action)
        )
        .unique();

      if (actionRecord) {
        const active = actionRecord.timestamps.filter((t) => t > windowStart);
        if (active.length >= actionLimit.maxRequests) {
          const oldest = Math.min(...active);
          const retryAfter = oldest + actionLimit.windowMs - now;
          return {
            allowed: false,
            retryAfter: Math.max(retryAfter, 1000),
            message: `You're searching too fast! Please wait ${Math.ceil(Math.max(retryAfter, 1000) / 1000)} seconds and try again.`,
          };
        }
      }
    }

    // --- Check global hourly limit ---
    const globalLimit = RATE_LIMITS.global;
    const globalWindowStart = now - globalLimit.windowMs;
    const globalRecord = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) =>
        q.eq("userId", args.userId).eq("action", "global")
      )
      .unique();

    if (globalRecord) {
      const active = globalRecord.timestamps.filter((t) => t > globalWindowStart);
      if (active.length >= globalLimit.maxRequests) {
        const oldest = Math.min(...active);
        const retryAfter = oldest + globalLimit.windowMs - now;
        const minutes = Math.ceil(Math.max(retryAfter, 1000) / 60_000);
        return {
          allowed: false,
          retryAfter: Math.max(retryAfter, 1000),
          message: `You've used a lot of searches this hour! Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
        };
      }
    }

    // --- All checks passed — record timestamps ---
    // Record per-action timestamp
    if (actionLimit) {
      const actionRecord = await ctx.db
        .query("rateLimits")
        .withIndex("by_user_action", (q) =>
          q.eq("userId", args.userId).eq("action", args.action)
        )
        .unique();

      if (actionRecord) {
        const pruned = actionRecord.timestamps.filter(
          (t) => t > now - actionLimit.windowMs
        );
        pruned.push(now);
        await ctx.db.patch(actionRecord._id, { timestamps: pruned });
      } else {
        await ctx.db.insert("rateLimits", {
          userId: args.userId,
          action: args.action,
          timestamps: [now],
        });
      }
    }

    // Record global timestamp
    if (globalRecord) {
      const pruned = globalRecord.timestamps.filter((t) => t > globalWindowStart);
      pruned.push(now);
      await ctx.db.patch(globalRecord._id, { timestamps: pruned });
    } else {
      await ctx.db.insert("rateLimits", {
        userId: args.userId,
        action: "global",
        timestamps: [now],
      });
    }

    return { allowed: true };
  },
});

/**
 * Cleanup old rate limit records.
 * Removes records whose newest timestamp is older than 1 hour (stale).
 * Called by a daily cron.
 */
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 3_600_000; // 1 hour ago
    let deleted = 0;

    // Scan all rate limit records
    const records = await ctx.db.query("rateLimits").collect();
    for (const record of records) {
      const newest = Math.max(...record.timestamps, 0);
      if (newest < cutoff) {
        await ctx.db.delete(record._id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`[rateLimit] Cleaned up ${deleted} stale rate limit records`);
    }
  },
});
