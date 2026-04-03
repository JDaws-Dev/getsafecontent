import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Update or create reading progress for a kid + book.
 */
export const update = mutation({
  args: {
    kidId: v.id("kids"),
    googleBookId: v.string(),
    currentPage: v.optional(v.number()),
    totalPages: v.optional(v.number()),
    percentComplete: v.number(),
    finished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentPage: args.currentPage ?? existing.currentPage,
        totalPages: args.totalPages ?? existing.totalPages,
        percentComplete: args.percentComplete,
        lastReadAt: now,
        finishedAt: args.finished ? now : existing.finishedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("readingProgress", {
      kidId: args.kidId,
      googleBookId: args.googleBookId,
      currentPage: args.currentPage,
      totalPages: args.totalPages,
      percentComplete: args.percentComplete,
      lastReadAt: now,
      startedAt: now,
      finishedAt: args.finished ? now : undefined,
    });
  },
});

/**
 * Get all reading progress for a kid (sorted by most recently read).
 */
export const getForKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    // Sort by lastReadAt descending
    return progress.sort((a, b) => b.lastReadAt - a.lastReadAt);
  },
});

/**
 * Get reading progress for a specific kid + book.
 */
export const getForBook = query({
  args: {
    kidId: v.id("kids"),
    googleBookId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("readingProgress")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();
  },
});

/**
 * Get currently reading books (started but not finished).
 */
export const getCurrentlyReading = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    return progress
      .filter((p) => !p.finishedAt && p.percentComplete > 0 && p.percentComplete < 100)
      .sort((a, b) => b.lastReadAt - a.lastReadAt);
  },
});

/**
 * Get reading stats for a kid.
 */
export const getStats = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    const totalBooks = progress.length;
    const finishedBooks = progress.filter((p) => p.finishedAt).length;
    const currentlyReading = progress.filter(
      (p) => !p.finishedAt && p.percentComplete > 0 && p.percentComplete < 100
    ).length;
    const totalPages = progress.reduce((sum, p) => sum + (p.currentPage || 0), 0);

    return {
      totalBooks,
      finishedBooks,
      currentlyReading,
      totalPages,
    };
  },
});
