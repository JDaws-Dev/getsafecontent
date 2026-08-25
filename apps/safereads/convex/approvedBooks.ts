import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireOwner, requireKidOwner } from "./identity";
import { isPreApprovedBookId } from "./preApprovedBooks";

/**
 * Aug 2026 IDOR closure. Every mutation here used to take `userId`/`kidId`
 * straight from the client with no proof the caller owned either — so anyone
 * who could enumerate a kid id could put a book on that child's shelf, or take
 * one off. In a parental-controls product that is the whole product inverted.
 *
 * Parent-only entry points now take `userToken` and verify ownership. The one
 * genuinely kid-initiated path (adding a PRE-APPROVED classic to your own
 * shelf, from /read/book) can't carry a parent token, so instead of trusting
 * `addedBy: "pre_approved"` from the client we check the book really is on the
 * pre-approved list server-side.
 *
 * Kid-path READS (listForKid / isApproved) stay open by the same deliberate
 * choice made for SafeTube's canWatch: the kid device has no parent JWT, and
 * failing those closed would black out the child's own bookshelf.
 */

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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) throw new Error("That child could not be found.");
    if (kid.userId !== args.userId) {
      throw new Error("You don't have access to that.");
    }

    if (args.userToken) {
      // Parent path — full authority over the shelf.
      await requireOwner(ctx, args.userToken, kid.userId, "approvedBooks.addForKid");
    } else if (!isPreApprovedBookId(args.googleBookId)) {
      // Tokenless (kid device). Only the pre-approved classics shelf is
      // self-serve; anything else needs a parent. `addedBy` is client-supplied
      // and must never be the thing that decides this.
      throw new Error("A grown-up needs to add that book for you.");
    }

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
      addedBy: args.userToken ? args.addedBy || "parent" : "pre_approved",
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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "approvedBooks.removeForKid");
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
export const removeById = internalMutation({
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
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userToken, args.userId, "approvedBooks.listForUser");
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
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "approvedBooks.countForKid");
    const books = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    return books.length;
  },
});
