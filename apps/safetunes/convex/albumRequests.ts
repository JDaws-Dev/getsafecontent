import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Get all pending requests for a user (parent)
export const getPendingRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("albumRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// Get all denied requests for a user (parent)
export const getDeniedRequests = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("albumRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "denied"))
      .collect();
  },
});

// Get requests for a specific kid
export const getRequestsByKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
  },
});

// Alias for getRequestsByKid (used by child dashboard)
export const getRequestsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
  },
});

// Create a new album request
export const createAlbumRequest = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    kidNote: v.optional(v.string()), // Kid's note explaining why they want this
  },
  handler: async (ctx, args) => {
    // Check if request already exists
    const existingRequest = await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.eq(q.field("appleAlbumId"), args.appleAlbumId),
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
    const requestId = await ctx.db.insert("albumRequests", {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
      artistName: args.artistName,
      artworkUrl: args.artworkUrl,
      status: "pending",
      requestedAt: Date.now(),
      kidNote: args.kidNote?.trim() || undefined,
    });

    // Add to email notification batch (async, won't block request creation)
    await ctx.scheduler.runAfter(0, internal.emailNotifications.addRequestToBatch, {
      userId: args.userId,
      requestType: "album_request",
      requestId,
      kidName: kidProfile.name,
      contentName: args.albumName,
      artistName: args.artistName,
    });

    // Send web push notification (async, won't block request creation)
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushNotificationInternal, {
      userId: args.userId,
      title: `${kidProfile.name} requested an album`,
      body: `"${args.albumName}" by ${args.artistName}`,
      url: "/dashboard",
      tag: `album-request-${requestId}`,
    });

    // Send Expo push notification to mobile app (async)
    await ctx.scheduler.runAfter(0, internal.expoPushNotifications.notifyParentOfRequest, {
      userId: args.userId,
      kidName: kidProfile.name,
      contentName: args.albumName,
      contentType: "album",
    });

    return requestId;
  },
});

// Approve a request (and add to approved albums + approvedSongs for the kid)
export const approveRequest = mutation({
  args: {
    requestId: v.id("albumRequests"),
    tracks: v.optional(v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      trackNumber: v.optional(v.number()),
      durationInMillis: v.optional(v.number()),
      isExplicit: v.optional(v.boolean()),
    }))),
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

    // UNIFIED MODEL: Check if album record already exists (one per user, no kidProfileId)
    const existingAlbum = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", request.userId).eq("appleAlbumId", request.appleAlbumId)
      )
      .first();

    if (!existingAlbum) {
      // Add to approved albums (UNIFIED: no kidProfileId)
      await ctx.db.insert("approvedAlbums", {
        userId: request.userId,
        // No kidProfileId in unified model
        appleAlbumId: request.appleAlbumId,
        albumName: request.albumName,
        artistName: request.artistName,
        artworkUrl: request.artworkUrl,
        hideArtwork: args.hideArtwork || false,
        approvedAt: Date.now(),
      });
    } else if (args.hideArtwork !== undefined) {
      // Update hideArtwork on existing album if specified
      await ctx.db.patch(existingAlbum._id, { hideArtwork: args.hideArtwork });
    }

    // Store album tracks and create approvedSongs for this kid
    if (args.tracks && args.tracks.length > 0) {
      // Check if tracks already exist in albumTracks
      const existingTracks = await ctx.db
        .query("albumTracks")
        .withIndex("by_user_and_album", (q) =>
          q.eq("userId", request.userId).eq("appleAlbumId", request.appleAlbumId)
        )
        .collect();

      if (existingTracks.length === 0) {
        // Store each track in albumTracks
        for (const track of args.tracks) {
          await ctx.db.insert("albumTracks", {
            userId: request.userId,
            appleAlbumId: request.appleAlbumId,
            appleSongId: track.appleSongId,
            songName: track.songName,
            artistName: track.artistName,
            trackNumber: track.trackNumber,
            durationInMillis: track.durationInMillis,
            isExplicit: track.isExplicit,
            createdAt: Date.now(),
          });
        }
        console.log('[approveRequest] Stored', args.tracks.length, 'tracks for album', request.appleAlbumId);
      }

      // CRITICAL: Create approvedSongs entries for this kid (this is what populates their Library)
      let songsAdded = 0;
      for (const track of args.tracks) {
        // Check if song already approved for this kid
        const existingSong = await ctx.db
          .query("approvedSongs")
          .withIndex("by_user_and_song", (q) =>
            q.eq("userId", request.userId).eq("appleSongId", track.appleSongId)
          )
          .filter((q) => q.eq(q.field("kidProfileId"), request.kidProfileId))
          .first();

        if (!existingSong) {
          await ctx.db.insert("approvedSongs", {
            userId: request.userId,
            kidProfileId: request.kidProfileId,
            appleSongId: track.appleSongId,
            songName: track.songName,
            artistName: track.artistName,
            albumName: request.albumName,
            artworkUrl: request.artworkUrl,
            appleAlbumId: request.appleAlbumId,
            durationInMillis: track.durationInMillis,
            isExplicit: track.isExplicit,
            hideArtwork: args.hideArtwork || false,
            approvedAt: Date.now(),
          });
          songsAdded++;
        }
      }
      console.log('[approveRequest] Added', songsAdded, 'songs to kid library for', request.albumName);
    }

    // Send Expo push notification to kid (async)
    await ctx.scheduler.runAfter(0, internal.expoPushNotifications.notifyKidOfReview, {
      kidProfileId: request.kidProfileId,
      contentName: request.albumName,
      status: "approved",
    });

    return request;
  },
});

// Deny a request
export const denyRequest = mutation({
  args: {
    requestId: v.id("albumRequests"),
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
      contentName: request.albumName,
      status: "denied",
    });
  },
});

// Undo album approval (revert to pending)
export const undoApproval = mutation({
  args: { requestId: v.id("albumRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Revert request status back to pending
    await ctx.db.patch(args.requestId, {
      status: "pending",
      reviewedAt: undefined,
    });

    // Remove from approved albums
    const approvedAlbum = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", request.userId).eq("appleAlbumId", request.appleAlbumId)
      )
      .first();

    if (approvedAlbum) {
      await ctx.db.delete(approvedAlbum._id);
    }

    return request;
  },
});

// Undo album denial (revert to pending)
export const undoDenial = mutation({
  args: { requestId: v.id("albumRequests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: "pending",
      reviewedAt: undefined,
      denialReason: undefined,
    });
  },
});

// Approve a previously denied request (goes directly from denied to approved)
export const approveDeniedRequest = mutation({
  args: {
    requestId: v.id("albumRequests"),
    tracks: v.optional(v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      trackNumber: v.optional(v.number()),
      durationInMillis: v.optional(v.number()),
      isExplicit: v.optional(v.boolean()),
    }))),
    hideArtwork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "denied") throw new Error("Request is not denied");

    // Validate that appleAlbumId exists
    if (!request.appleAlbumId) {
      console.error('[approveDeniedRequest] Missing appleAlbumId:', {
        requestId: args.requestId,
        albumName: request.albumName,
        artistName: request.artistName,
        fullRequest: request
      });
      throw new Error(`Cannot approve album "${request.albumName}" - missing Apple Music ID. Please re-request this album.`);
    }

    // Update request status to approved
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: Date.now(),
      denialReason: undefined, // Clear the denial reason
    });

    // UNIFIED MODEL: Check if album record already exists (one per user, no kidProfileId)
    const existingAlbum = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", request.userId).eq("appleAlbumId", request.appleAlbumId)
      )
      .first();

    if (!existingAlbum) {
      // Add to approved albums (UNIFIED: no kidProfileId)
      await ctx.db.insert("approvedAlbums", {
        userId: request.userId,
        // No kidProfileId in unified model
        appleAlbumId: request.appleAlbumId,
        albumName: request.albumName,
        artistName: request.artistName,
        artworkUrl: request.artworkUrl,
        hideArtwork: args.hideArtwork || false,
        approvedAt: Date.now(),
      });
    } else if (args.hideArtwork !== undefined) {
      // Update hideArtwork on existing album if specified
      await ctx.db.patch(existingAlbum._id, { hideArtwork: args.hideArtwork });
    }

    // Store album tracks and create approvedSongs for this kid
    if (args.tracks && args.tracks.length > 0) {
      // Check if tracks already exist in albumTracks
      const existingTracks = await ctx.db
        .query("albumTracks")
        .withIndex("by_user_and_album", (q) =>
          q.eq("userId", request.userId).eq("appleAlbumId", request.appleAlbumId)
        )
        .collect();

      if (existingTracks.length === 0) {
        // Store each track in albumTracks
        for (const track of args.tracks) {
          await ctx.db.insert("albumTracks", {
            userId: request.userId,
            appleAlbumId: request.appleAlbumId,
            appleSongId: track.appleSongId,
            songName: track.songName,
            artistName: track.artistName,
            trackNumber: track.trackNumber,
            durationInMillis: track.durationInMillis,
            isExplicit: track.isExplicit,
            createdAt: Date.now(),
          });
        }
        console.log('[approveDeniedRequest] Stored', args.tracks.length, 'tracks for album', request.appleAlbumId);
      }

      // CRITICAL: Create approvedSongs entries for this kid (this is what populates their Library)
      let songsAdded = 0;
      for (const track of args.tracks) {
        // Check if song already approved for this kid
        const existingSong = await ctx.db
          .query("approvedSongs")
          .withIndex("by_user_and_song", (q) =>
            q.eq("userId", request.userId).eq("appleSongId", track.appleSongId)
          )
          .filter((q) => q.eq(q.field("kidProfileId"), request.kidProfileId))
          .first();

        if (!existingSong) {
          await ctx.db.insert("approvedSongs", {
            userId: request.userId,
            kidProfileId: request.kidProfileId,
            appleSongId: track.appleSongId,
            songName: track.songName,
            artistName: track.artistName,
            albumName: request.albumName,
            artworkUrl: request.artworkUrl,
            appleAlbumId: request.appleAlbumId,
            durationInMillis: track.durationInMillis,
            isExplicit: track.isExplicit,
            hideArtwork: args.hideArtwork || false,
            approvedAt: Date.now(),
          });
          songsAdded++;
        }
      }
      console.log('[approveDeniedRequest] Added', songsAdded, 'songs to kid library for', request.albumName);
    }

    return request;
  },
});

// Mark album request as partially approved (some songs approved, not the full album)
export const markAsPartiallyApproved = mutation({
  args: {
    requestId: v.id("albumRequests"),
    partialApprovalNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Update request status to partially_approved
    await ctx.db.patch(args.requestId, {
      status: "partially_approved",
      reviewedAt: Date.now(),
      partialApprovalNote: args.partialApprovalNote,
      viewedByKid: false, // Kid hasn't seen this review yet
    });

    return request;
  },
});
