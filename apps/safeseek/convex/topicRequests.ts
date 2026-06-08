import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwnerSoft } from "./identity";

/**
 * Create a topic request when a kid's search is blocked
 */
export const createRequest = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      throw new Error("Kid profile not found");
    }

    // Check for duplicate pending request for same query
    const existing = await ctx.db
      .query("topicRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.eq(q.field("query"), args.query),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existing) {
      return { alreadyExists: true, requestId: existing._id };
    }

    const requestId = await ctx.db.insert("topicRequests", {
      kidProfileId: args.kidProfileId,
      userId: kidProfile.userId,
      query: args.query,
      reason: args.reason,
      status: "pending",
      kidName: kidProfile.name,
      requestedAt: Date.now(),
    });

    return { alreadyExists: false, requestId };
  },
});

/**
 * Get all pending requests for a parent
 */
export const getPendingRequests = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "topicRequests.getPendingRequests");
    return await ctx.db
      .query("topicRequests")
      .withIndex("by_user", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();
  },
});

/**
 * Get all requests (pending, approved, denied) for a parent, most recent first
 */
export const getAllRequests = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "topicRequests.getAllRequests");
    const requests = await ctx.db
      .query("topicRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Sort by most recent first
    return requests.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

/**
 * Approve a topic request — sets status and adds query to kid's allowedTopics
 */
export const approveRequest = mutation({
  args: { requestId: v.id("topicRequests"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }
    await requireOwnerSoft(ctx, args.userToken, request.userId, "topicRequests.approveRequest");
    if (request.status !== "pending") {
      throw new Error("Request already responded to");
    }

    // Update the request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      respondedAt: Date.now(),
    });

    // Add the query to the kid's allowedTopics
    const kidProfile = await ctx.db.get(request.kidProfileId);
    if (kidProfile) {
      const currentAllowed = kidProfile.allowedTopics || [];
      const topicLower = request.query.toLowerCase();
      if (!currentAllowed.includes(topicLower)) {
        await ctx.db.patch(request.kidProfileId, {
          allowedTopics: [...currentAllowed, topicLower],
        });
      }
    }

    return { success: true };
  },
});

/**
 * Deny a topic request
 */
export const denyRequest = mutation({
  args: { requestId: v.id("topicRequests"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }
    await requireOwnerSoft(ctx, args.userToken, request.userId, "topicRequests.denyRequest");
    if (request.status !== "pending") {
      throw new Error("Request already responded to");
    }

    await ctx.db.patch(args.requestId, {
      status: "denied",
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get count of pending requests for a parent (for badge display)
 */
export const getPendingCount = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "topicRequests.getPendingCount");
    const pending = await ctx.db
      .query("topicRequests")
      .withIndex("by_user", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    return pending.length;
  },
});

/**
 * Check if a pending request already exists for a given kid + query
 */
export const hasPendingRequest = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("topicRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.eq(q.field("query"), args.query),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    return !!existing;
  },
});

/**
 * Get recently approved requests for a kid (last 7 days)
 * Used to show "Your parent approved!" notification on kid's search page
 */
export const getRecentlyApproved = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const requests = await ctx.db
      .query("topicRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    return requests
      .filter((r) => r.status === "approved" && (r.respondedAt || 0) > sevenDaysAgo)
      .sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0))
      .slice(0, 5);
  },
});

/**
 * Get all requests for a specific kid (for kid-facing inbox)
 */
export const getRequestsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("topicRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    return requests
      .sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0))
      .slice(0, 20);
  },
});
