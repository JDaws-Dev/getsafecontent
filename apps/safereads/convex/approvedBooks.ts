import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Add a book to a kid's approved shelf.
 * Prevents duplicates.
 */
export const addForKid = mutation({
  args: {
    userId: v.id("users"),
    kidId: v.id("kids"),
    googleBookId: v.string(),
    title: v.string(),
    author: v.string(),
    coverUrl: v.optional(v.string()),
    addedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
    gutenbergId: v.optional(v.string()),
    storyWeaverId: v.optional(v.string()),
    isFreeBook: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("approvedBooks", {
      userId: args.userId,
      kidId: args.kidId,
      googleBookId: args.googleBookId,
      title: args.title,
      author: args.author,
      coverUrl: args.coverUrl,
      addedAt: Date.now(),
      addedBy: args.addedBy || "parent",
      notes: args.notes,
      gutenbergId: args.gutenbergId,
      storyWeaverId: args.storyWeaverId,
      isFreeBook: args.isFreeBook,
    });
  },
});

/**
 * Remove a book from a kid's approved shelf.
 */
export const removeForKid = mutation({
  args: {
    kidId: v.id("kids"),
    googleBookId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Remove an approved book by its ID.
 */
export const removeById = mutation({
  args: { approvedBookId: v.id("approvedBooks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.approvedBookId);
  },
});

/**
 * List all approved books for a kid.
 */
export const listForKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
  },
});

/**
 * List all approved books for a parent (across all kids).
 */
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvedBooks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Check if a specific book is approved for a kid.
 */
export const isApproved = query({
  args: {
    kidId: v.id("kids"),
    googleBookId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();
    return existing !== null;
  },
});

/**
 * Count approved books for a kid.
 */
export const countForKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const books = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    return books.length;
  },
});
