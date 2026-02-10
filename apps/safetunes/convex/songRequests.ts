import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Get all pending song requests for a user (parent)
export const getPendingSongRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("songRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// Get all denied song requests for a user (parent)
export const getDeniedSongRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("songRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "denied"))
      .collect();
  },
});

// Get song requests for a specific kid
export const getSongRequestsByKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
  },
});

// Alias for getSongRequestsByKid (used by child dashboard)
export const getSongRequestsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
  },
});

// Create a new song request
export const createSongRequest = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    appleSongId: v.string(),
    songName: v.string(),
    artistName: v.string(),
    albumName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    kidNote: v.optional(v.string()), // Kid's note explaining why they want this
  },
  handler: async (ctx, args) => {
    // Check if request already exists
    const existingRequest = await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.eq(q.field("appleSongId"), args.appleSongId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingRequest) {
      // Request already exists, just return it
      return existingRequest._id;
    }

    // Get kid profile for name
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) throw new Error("Kid profile not found");

    // Create new request
    const requestId = await ctx.db.insert("songRequests", {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      appleSongId: args.appleSongId,
      songName: args.songName,
      artistName: args.artistName,
      albumName: args.albumName,
      artworkUrl: args.artworkUrl,
      status: "pending",
      requestedAt: Date.now(),
      kidNote: args.kidNote?.trim() || undefined,
    });

    // Add to email notification batch (async, won't block request creation)
    await ctx.scheduler.runAfter(0, internal.emailNotifications.addRequestToBatch, {
      userId: args.userId,
      requestType: "song_request",
      requestId,
      kidName: kidProfile.name,
      contentName: args.songName,
      artistName: args.artistName,
    });

    // Send web push notification (async, won't block request creation)
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotificationInternal, {
      userId: args.userId,
      title: `${kidProfile.name} requested a song`,
      body: `"${args.songName}" by ${args.artistName}`,
      url: "/dashboard",
      tag: `song-request-${requestId}`,
    });

    // Send Expo push notification to mobile app (async)
    await ctx.scheduler.runAfter(0, internal.expoPushNotifications.notifyParentOfRequest, {
      userId: args.userId,
      kidName: kidProfile.name,
      contentName: args.songName,
      contentType: "song",
    });

    return requestId;
  },
});

// Approve a song request (and add to approved songs)
export const approveSongRequest = mutation({
  args: {
    requestId: v.id("songRequests"),
    hideArtwork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: Date.now(),
    });

    // Add to approved songs
    await ctx.db.insert("approvedSongs", {
      userId: request.userId,
      kidProfileId: request.kidProfileId,
      appleSongId: request.appleSongId,
      songName: request.songName,
      artistName: request.artistName,
      albumName: request.albumName,
      artworkUrl: request.artworkUrl,
      hideArtwork: args.hideArtwork || false,
      approvedAt: Date.now(),
    });

    // Send Expo push notification to kid (async)
    await ctx.scheduler.runAfter(0, internal.expoPushNotifications.notifyKidOfReview, {
      kidProfileId: request.kidProfileId,
      contentName: request.songName,
      status: "approved",
    });

    return request;
  },
});

// Deny a song request
export const denySongRequest = mutation({
  args: {
    requestId: v.id("songRequests"),
    denialReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    await ctx.db.patch(args.requestId, {
      status: "denied",
      reviewedAt: Date.now(),
      denialReason: args.denialReason,
    });

    // Send Expo push notification to kid (async)
    await ctx.scheduler.runAfter(0, internal.expoPushNotifications.notifyKidOfReview, {
      kidProfileId: request.kidProfileId,
      contentName: request.songName,
      status: "denied",
    });
  },
});

// Undo song approval (revert to pending)
export const undoApproval = mutation({
  args: { requestId: v.id("songRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Revert request status back to pending
    await ctx.db.patch(args.requestId, {
      status: "pending",
      reviewedAt: undefined,
    });

    // Remove from approved songs
    const approvedSong = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user_and_song", (q) =>
        q.eq("userId", request.userId).eq("appleSongId", request.appleSongId)
      )
      .first();

    if (approvedSong) {
      await ctx.db.delete(approvedSong._id);
    }

    return request;
  },
});

// Undo song denial (revert to pending)
export const undoDenial = mutation({
  args: { requestId: v.id("songRequests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: "pending",
      reviewedAt: undefined,
      denialReason: undefined,
    });
  },
});

// Approve a previously denied song request (goes directly from denied to approved)
export const approveDeniedSongRequest = mutation({
  args: {
    requestId: v.id("songRequests"),
    hideArtwork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "denied") throw new Error("Request is not denied");

    // Validate that appleSongId exists
    if (!request.appleSongId) {
      console.error('[approveDeniedSongRequest] Missing appleSongId:', {
        requestId: args.requestId,
        songName: request.songName,
        artistName: request.artistName,
        fullRequest: request
      });
      throw new Error(`Cannot approve song "${request.songName}" - missing Apple Music ID. Please re-request this song.`);
    }

    // Update request status to approved
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: Date.now(),
      denialReason: undefined, // Clear the denial reason
    });

    // Add to approved songs
    await ctx.db.insert("approvedSongs", {
      userId: request.userId,
      kidProfileId: request.kidProfileId,
      appleSongId: request.appleSongId,
      songName: request.songName,
      artistName: request.artistName,
      albumName: request.albumName,
      artworkUrl: request.artworkUrl,
      hideArtwork: args.hideArtwork || false,
      approvedAt: Date.now(),
    });

    return request;
  },
});
