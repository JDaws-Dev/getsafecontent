import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireKidOwner } from "./identity";

/**
 * Record what a child searched for.
 *
 * Called from the kid search action, which has no parent token — so this is an
 * internalMutation and the kid path reaches it only via that action, never
 * directly from a browser.
 */
export const record = internalMutation({
  args: {
    kidId: v.id("kids"),
    query: v.string(),
    resultCount: v.number(),
  },
  handler: async (ctx, args) => {
    const q = args.query.trim().slice(0, 300);
    if (!q) return;
    await ctx.db.insert("kidSearchHistory", {
      kidId: args.kidId,
      query: q,
      resultCount: args.resultCount,
      searchedAt: Date.now(),
    });
  },
});

/**
 * Parent-facing: what has this child been looking for lately?
 */
export const listForKid = query({
  args: {
    kidId: v.id("kids"),
    limit: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "kidSearchHistory.listForKid");
    return await ctx.db
      .query("kidSearchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidId", args.kidId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
