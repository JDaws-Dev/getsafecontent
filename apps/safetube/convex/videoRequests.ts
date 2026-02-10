import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a video request from a kid
export const createRequest = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelId: v.string(),
    channelTitle: v.string(),
    duration: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get kid profile to find parent user
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) throw new Error("Kid profile not found");

    // Check if there's already a pending request for this video
    const existingRequest = await ctx.db
      .query("videoRequests")
      .withIndex("by_video", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("videoId", args.videoId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      return { success: false, reason: "already_requested", requestId: existingRequest._id };
    }

    // Check if video is already approved
    const approved = await ctx.db
      .query("approvedVideos")
      .withIndex("by_video", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("videoId", args.videoId)
      )
      .first();

    if (approved) {
      return { success: false, reason: "already_approved" };
    }

    // Create the request
    const requestId = await ctx.db.insert("videoRequests", {
      userId: profile.userId,
      kidProfileId: args.kidProfileId,
      videoId: args.videoId,
      title: args.title,
      thumbnailUrl: args.thumbnailUrl,
      channelId: args.channelId,
      channelTitle: args.channelTitle,
      duration: args.duration,
      durationSeconds: args.durationSeconds,
      requestedAt: Date.now(),
      status: "pending",
    });

    return { success: true, requestId };
  },
});

// Get pending requests for a parent
export const getPendingRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("videoRequests")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    // Add kid profile info
    const requestsWithKids = await Promise.all(
      requests.map(async (r) => {
        const kid = await ctx.db.get(r.kidProfileId);
        return {
          ...r,
          kidName: kid?.name || "Unknown",
          kidIcon: kid?.icon || "👤",
          kidColor: kid?.color || "gray",
        };
      })
    );

    return requestsWithKids.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

// Get all requests for a parent (with pagination)
export const getAllRequests = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const requests = await ctx.db
      .query("videoRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Add kid profile info
    const requestsWithKids = await Promise.all(
      requests.map(async (r) => {
        const kid = await ctx.db.get(r.kidProfileId);
        return {
          ...r,
          kidName: kid?.name || "Unknown",
          kidIcon: kid?.icon || "👤",
          kidColor: kid?.color || "gray",
        };
      })
    );

    return requestsWithKids;
  },
});

// Get request status for a kid (to show them their pending requests)
export const getKidRequests = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("videoRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(20);

    return requests;
  },
});

// Approve a request
export const approveRequest = mutation({
  args: { requestId: v.id("videoRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      respondedAt: Date.now(),
    });

    // Add video to approved list
    const videoDocId = await ctx.db.insert("approvedVideos", {
      userId: request.userId,
      kidProfileId: request.kidProfileId,
      videoId: request.videoId,
      title: request.title,
      thumbnailUrl: request.thumbnailUrl,
      channelId: request.channelId,
      channelTitle: request.channelTitle,
      duration: request.duration || "PT0S",
      durationSeconds: request.durationSeconds || 0,
      madeForKids: false, // Default - parent can modify later
      addedAt: Date.now(),
    });

    return { success: true, videoDocId };
  },
});

// Deny a request
export const denyRequest = mutation({
  args: {
    requestId: v.id("videoRequests"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    await ctx.db.patch(args.requestId, {
      status: "denied",
      respondedAt: Date.now(),
      denyReason: args.reason,
    });

    return { success: true };
  },
});

// Bulk approve all pending requests from a kid
export const bulkApproveForKid = mutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const pendingRequests = await ctx.db
      .query("videoRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let approved = 0;
    for (const request of pendingRequests) {
      await ctx.db.patch(request._id, {
        status: "approved",
        respondedAt: Date.now(),
      });

      await ctx.db.insert("approvedVideos", {
        userId: request.userId,
        kidProfileId: request.kidProfileId,
        videoId: request.videoId,
        title: request.title,
        thumbnailUrl: request.thumbnailUrl,
        channelId: request.channelId,
        channelTitle: request.channelTitle,
        duration: request.duration || "PT0S",
        durationSeconds: request.durationSeconds || 0,
        madeForKids: false,
        addedAt: Date.now(),
      });

      approved++;
    }

    return { approved };
  },
});

// Bulk deny all pending requests from a kid
export const bulkDenyForKid = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pendingRequests = await ctx.db
      .query("videoRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let denied = 0;
    for (const request of pendingRequests) {
      await ctx.db.patch(request._id, {
        status: "denied",
        respondedAt: Date.now(),
        denyReason: args.reason,
      });
      denied++;
    }

    return { denied };
  },
});

// Clear old processed requests (cleanup)
export const clearOldRequests = mutation({
  args: {
    userId: v.id("users"),
    daysToKeep: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.daysToKeep * 24 * 60 * 60 * 1000;

    const oldRequests = await ctx.db
      .query("videoRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.lt(q.field("requestedAt"), cutoffTime)
        )
      )
      .collect();

    for (const req of oldRequests) {
      await ctx.db.delete(req._id);
    }

    return { deleted: oldRequests.length };
  },
});
