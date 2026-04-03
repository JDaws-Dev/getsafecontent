import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a book request from a kid.
 * Prevents duplicate pending requests for the same book.
 */
export const create = mutation({
  args: {
    kidId: v.id("kids"),
    googleBookId: v.string(),
    title: v.string(),
    author: v.string(),
    coverUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the kid to find the parent userId
    const kid = await ctx.db.get(args.kidId);
    if (!kid) {
      throw new Error("Kid profile not found");
    }

    // Check for existing pending request for this book
    const existing = await ctx.db
      .query("bookRequests")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();

    if (existing && existing.status === "pending") {
      return existing._id; // Already requested
    }

    // Check if already approved
    const approved = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();

    if (approved) {
      return null; // Already on their shelf
    }

    return await ctx.db.insert("bookRequests", {
      kidId: args.kidId,
      userId: kid.userId,
      googleBookId: args.googleBookId,
      title: args.title,
      author: args.author,
      coverUrl: args.coverUrl,
      status: "pending",
      requestedAt: Date.now(),
    });
  },
});

/**
 * Approve a book request.
 * Creates an approved book entry and updates request status.
 */
export const approve = mutation({
  args: {
    requestId: v.id("bookRequests"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is no longer pending");
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      respondedAt: Date.now(),
    });

    // Add to approved books (prevent duplicate)
    const existing = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", request.kidId).eq("googleBookId", request.googleBookId)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("approvedBooks", {
        userId: request.userId,
        kidId: request.kidId,
        googleBookId: request.googleBookId,
        title: request.title,
        author: request.author,
        coverUrl: request.coverUrl,
        addedAt: Date.now(),
        addedBy: "request_approved",
        notes: args.notes,
      });
    }

    return { success: true };
  },
});

/**
 * Deny a book request with optional reason.
 */
export const deny = mutation({
  args: {
    requestId: v.id("bookRequests"),
    denyReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is no longer pending");
    }

    await ctx.db.patch(args.requestId, {
      status: "denied",
      respondedAt: Date.now(),
      denyReason: args.denyReason,
    });

    return { success: true };
  },
});

/**
 * List all pending requests for a parent.
 */
export const listPendingByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("bookRequests")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    // Enrich with kid names
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const kid = await ctx.db.get(request.kidId);
        return {
          ...request,
          kidName: kid?.name || "Unknown",
          kidColor: kid?.color || "purple",
        };
      })
    );

    return enriched;
  },
});

/**
 * Count pending requests for a parent (for notification badge).
 */
export const countPendingByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("bookRequests")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();
    return requests.length;
  },
});

/**
 * List all requests for a kid (all statuses).
 */
export const listByKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookRequests")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
  },
});

/**
 * List all requests for a parent (all statuses).
 */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("bookRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrich with kid names
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const kid = await ctx.db.get(request.kidId);
        return {
          ...request,
          kidName: kid?.name || "Unknown",
          kidColor: kid?.color || "purple",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get request status for a specific kid + book (used by kid search).
 */
export const getRequestStatus = query({
  args: {
    kidId: v.id("kids"),
    googleBookId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("bookRequests")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("googleBookId", args.googleBookId)
      )
      .first();

    if (!request) return null;
    return { status: request.status, denyReason: request.denyReason };
  },
});
