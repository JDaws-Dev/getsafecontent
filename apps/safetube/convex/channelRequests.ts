import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a channel request from a kid
export const createRequest = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(),
    channelTitle: v.string(),
    thumbnailUrl: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get kid profile to find parent user
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) throw new Error("Kid profile not found");

    // Check if there's already a pending request for this channel
    const existingRequest = await ctx.db
      .query("channelRequests")
      .withIndex("by_channel", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("channelId", args.channelId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      return { success: false, reason: "already_requested", requestId: existingRequest._id };
    }

    // Check if channel is already approved
    const approved = await ctx.db
      .query("approvedChannels")
      .withIndex("by_channel", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("channelId", args.channelId)
      )
      .first();

    if (approved) {
      return { success: false, reason: "already_approved" };
    }

    // Create the request
    const requestId = await ctx.db.insert("channelRequests", {
      userId: profile.userId,
      kidProfileId: args.kidProfileId,
      channelId: args.channelId,
      channelTitle: args.channelTitle,
      thumbnailUrl: args.thumbnailUrl,
      description: args.description,
      subscriberCount: args.subscriberCount,
      requestedAt: Date.now(),
      status: "pending",
    });

    return { success: true, requestId };
  },
});

// Get pending channel requests for a parent
export const getPendingRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("channelRequests")
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

// Get channel request status for a kid
export const getKidRequests = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("channelRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(20);

    return requests;
  },
});

// Approve a channel request
export const approveRequest = mutation({
  args: { requestId: v.id("channelRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      respondedAt: Date.now(),
    });

    // Add channel to approved list
    const channelDocId = await ctx.db.insert("approvedChannels", {
      userId: request.userId,
      kidProfileId: request.kidProfileId,
      channelId: request.channelId,
      channelTitle: request.channelTitle,
      thumbnailUrl: request.thumbnailUrl,
      description: request.description,
      subscriberCount: request.subscriberCount,
      addedAt: Date.now(),
    });

    return { success: true, channelDocId };
  },
});

// Deny a channel request
export const denyRequest = mutation({
  args: {
    requestId: v.id("channelRequests"),
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
