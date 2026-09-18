import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireOwnerSoft, requireProfileOwner } from "./identity";

/**
 * Parent-facing query: list concern alerts for the parent dashboard.
 * Newest first; defaults to unacknowledged only.
 */
export const listForUser = query({
  args: {
    userId: v.id("users"),
    includeAcknowledged: v.optional(v.boolean()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // These rows carry a child's own words at the worst moment they have had
    // on the product. Soft for now (warn + allow) only because it matches how
    // every other parent read in this app is staged; it should go hard as soon
    // as the dashboard reliably threads the token.
    await requireOwnerSoft(ctx, args.userToken, args.userId, "concernAlertQueries.listForUser");
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
  args: { alertId: v.id("kidConcernAlerts"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId);
    if (!alert) return;
    // Hard check: acknowledging is a WRITE, and silently marking another
    // family's alert as seen would take the one escalation this product makes
    // and quietly bury it.
    await requireProfileOwner(
      ctx,
      args.userToken,
      alert.kidProfileId,
      "concernAlertQueries.acknowledge",
    );
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
