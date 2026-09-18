import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./identity";

// The caller must prove (via the Marketing JWT) that they are `userId`.
// These took a bare user id before, so anyone could file, read, or delete
// reports as any other parent.

const reasonValues = v.union(
  v.literal("too_lenient"),
  v.literal("too_strict"),
  v.literal("factual_error"),
  v.literal("missing_content"),
  v.literal("other")
);

/**
 * Submit a report about an analysis.
 * One report per user per analysis — subsequent calls update the existing report.
 */
export const submit = mutation({
  args: {
    userId: v.id("users"),
    bookId: v.id("books"),
    analysisId: v.id("analyses"),
    reason: reasonValues,
    details: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, { userToken, ...args }) => {
    await requireOwner(ctx, userToken, args.userId, "reports.submit");
    const existing = await ctx.db
      .query("reports")
      .withIndex("by_user_and_analysis", (q) =>
        q.eq("userId", args.userId).eq("analysisId", args.analysisId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        details: args.details,
      });
      return existing._id;
    }

    return await ctx.db.insert("reports", args);
  },
});

/**
 * Get the current user's report for a specific analysis (if any).
 */
export const getByUserAndAnalysis = query({
  args: {
    userId: v.id("users"),
    analysisId: v.id("analyses"),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userToken, args.userId, "reports.getByUserAndAnalysis");
    return await ctx.db
      .query("reports")
      .withIndex("by_user_and_analysis", (q) =>
        q.eq("userId", args.userId).eq("analysisId", args.analysisId)
      )
      .unique();
  },
});

/**
 * Count reports for a specific book's analysis.
 */
export const countByBook = query({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();
    return reports.length;
  },
});

/**
 * Delete the current user's report for an analysis.
 */
export const remove = mutation({
  args: {
    userId: v.id("users"),
    analysisId: v.id("analyses"),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userToken, args.userId, "reports.remove");
    const existing = await ctx.db
      .query("reports")
      .withIndex("by_user_and_analysis", (q) =>
        q.eq("userId", args.userId).eq("analysisId", args.analysisId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
