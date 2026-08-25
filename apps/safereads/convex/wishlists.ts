import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { GenericDatabaseReader } from "convex/server";
import { requireKidOwner } from "./identity";
import { DataModel, Id } from "./_generated/dataModel";

/**
 * wishlistId-keyed mutations hand us a row id, not a kid id — resolve the row
 * first so the ownership check is on the kid the row actually belongs to.
 */
async function requireWishlistOwner(
  ctx: { db: GenericDatabaseReader<DataModel> },
  userToken: string | undefined,
  wishlistId: Id<"wishlists">,
  label: string,
) {
  const row = await ctx.db.get(wishlistId);
  if (!row) throw new Error("That wishlist item could not be found.");
  await requireKidOwner(ctx, userToken, row.kidId, label);
  return row;
}

type WishlistStatus = "want_to_read" | "reading" | "finished" | "not_interested";

/**
 * List all wishlist entries for a kid, with book data.
 */
export const listByKid = query({
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "wishlists.listByKid");
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
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "wishlists.countByKid");
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
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "wishlists.countByStatus");
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
  args: { kidId: v.id("kids"), bookId: v.id("books"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "wishlists.isOnWishlist");
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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "wishlists.add");
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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWishlistOwner(ctx, args.userToken, args.wishlistId, "wishlists.updateNote");
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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWishlistOwner(ctx, args.userToken, args.wishlistId, "wishlists.updateStatus");
    await ctx.db.patch(args.wishlistId, { status: args.status });
  },
});

/**
 * Remove a book from a kid's wishlist.
 */
export const remove = mutation({
  args: { wishlistId: v.id("wishlists"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireWishlistOwner(ctx, args.userToken, args.wishlistId, "wishlists.remove");
    await ctx.db.delete(args.wishlistId);
  },
});

/**
 * Remove a book from a kid's wishlist by kid+book IDs.
 */
export const removeByKidAndBook = mutation({
  args: { kidId: v.id("kids"), bookId: v.id("books"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "wishlists.removeByKidAndBook");
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
