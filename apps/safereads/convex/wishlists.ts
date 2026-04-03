import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type WishlistStatus = "want_to_read" | "reading" | "finished" | "not_interested";

/**
 * List all wishlist entries for a kid, with book data.
 */
export const listByKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlists")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    const withBooks = await Promise.all(
      items.map(async (item) => {
        const book = await ctx.db.get(item.bookId);
        const analysis = await ctx.db
          .query("analyses")
          .withIndex("by_book", (q) => q.eq("bookId", item.bookId))
          .order("desc")
          .first();
        return {
          ...item,
          book,
          verdict: analysis?.verdict ?? null,
          status: (item.status || "want_to_read") as WishlistStatus,
        };
      })
    );

    return withBooks;
  },
});

/**
 * Count wishlist entries for a kid.
 */
export const countByKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlists")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    return items.length;
  },
});

/**
 * Count wishlist entries grouped by status.
 */
export const countByStatus = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlists")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    const counts: Record<WishlistStatus, number> = {
      want_to_read: 0,
      reading: 0,
      finished: 0,
      not_interested: 0,
    };

    for (const item of items) {
      const status = (item.status || "want_to_read") as WishlistStatus;
      counts[status]++;
    }

    return counts;
  },
});

/**
 * Check if a book is on a kid's wishlist.
 */
export const isOnWishlist = query({
  args: { kidId: v.id("kids"), bookId: v.id("books") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("bookId", args.bookId)
      )
      .first();
    return existing !== null;
  },
});

/**
 * Add a book to a kid's wishlist.
 */
export const add = mutation({
  args: {
    kidId: v.id("kids"),
    bookId: v.id("books"),
    note: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("want_to_read"),
      v.literal("reading"),
      v.literal("finished"),
      v.literal("not_interested")
    )),
  },
  handler: async (ctx, args) => {
    // Prevent duplicates
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("bookId", args.bookId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("wishlists", {
      kidId: args.kidId,
      bookId: args.bookId,
      note: args.note,
      status: args.status || "want_to_read",
    });
  },
});

/**
 * Update the note on a wishlist entry.
 */
export const updateNote = mutation({
  args: {
    wishlistId: v.id("wishlists"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.wishlistId, { note: args.note });
  },
});

/**
 * Update the status of a wishlist entry.
 */
export const updateStatus = mutation({
  args: {
    wishlistId: v.id("wishlists"),
    status: v.union(
      v.literal("want_to_read"),
      v.literal("reading"),
      v.literal("finished"),
      v.literal("not_interested")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.wishlistId, { status: args.status });
  },
});

/**
 * Remove a book from a kid's wishlist.
 */
export const remove = mutation({
  args: { wishlistId: v.id("wishlists") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.wishlistId);
  },
});

/**
 * Remove a book from a kid's wishlist by kid+book IDs.
 */
export const removeByKidAndBook = mutation({
  args: { kidId: v.id("kids"), bookId: v.id("books") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("bookId", args.bookId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
