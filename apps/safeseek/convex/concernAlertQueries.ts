import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * Parent-facing query: list concern alerts for the parent dashboard.
 * Newest first; defaults to unacknowledged only.
 */
export const listForUser = query({
  args: { userId: v.id("users"), includeAcknowledged: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("kidConcernAlerts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);
    if (args.includeAcknowledged) return all;
    return all.filter((a) => !a.acknowledgedAt);
  },
});

/**
 * Parent-facing mutation: dismiss an alert ("I've seen this").
 */
export const acknowledge = mutation({
  args: { alertId: v.id("kidConcernAlerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { acknowledgedAt: Date.now() });
  },
});

/**
 * Internal: mark alert as notified after parent email is sent.
 */
export const markNotified = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recent = await ctx.db
      .query("kidConcernAlerts")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("createdAt"), fiveMinAgo))
      .collect();
    const match = recent.find(
      (r) =>
        r.query === args.query &&
        r.category === args.category &&
        !r.notifiedAt
    );
    if (match) {
      await ctx.db.patch(match._id, { notifiedAt: Date.now() });
    }
  },
});
