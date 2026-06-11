import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * DB-backed sliding-window rate limiter for HTTP actions.
 *
 * The in-memory limiter in httpRateLimit.ts does NOT work on Convex — each
 * HTTP action invocation gets a fresh isolate, so the Map never accumulates
 * (verified live 2026-06-11: 13 rapid requests, zero 429s). This version
 * counts in the httpRateLimits table, which is shared across invocations.
 *
 * One small mutation per request — fine at SafeTube's scale; revisit with
 * a sharded counter if any endpoint sees real volume.
 */
export const checkAndCount = internalMutation({
  args: {
    identifier: v.string(), // e.g. "ext-kids:<ip>"
    maxRequests: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - args.windowMs;

    const row = await ctx.db
      .query("httpRateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();

    const recent = (row?.timestamps ?? []).filter((t) => t > cutoff);

    if (recent.length >= args.maxRequests) {
      const oldest = Math.min(...recent);
      return {
        limited: true,
        retryAfter: Math.max(1, Math.ceil((oldest + args.windowMs - now) / 1000)),
      };
    }

    recent.push(now);
    if (row) {
      await ctx.db.patch(row._id, { timestamps: recent });
    } else {
      await ctx.db.insert("httpRateLimits", {
        identifier: args.identifier,
        timestamps: recent,
      });
    }
    return { limited: false, retryAfter: 0 };
  },
});
