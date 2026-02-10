import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all requests for a specific kid (pending, approved, denied)
// Filters out "approved" requests where the content was subsequently deleted
export const getKidRequests = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get the kid profile to find the userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) return [];

    const albumRequests = await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    const songRequests = await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // For approved album requests, check if the album still exists
    // If album was deleted after approval, don't show the request
    const validAlbumRequests = [];
    for (const request of albumRequests) {
      if (request.status === 'approved' || request.status === 'partially_approved') {
        // Check if ANY approved songs exist for this kid from this album
        // This is the authoritative check - albums with null kidProfileId don't count
        let songsFromAlbum = null;

        // Check by appleAlbumId first (more reliable)
        if (request.appleAlbumId) {
          songsFromAlbum = await ctx.db
            .query("approvedSongs")
            .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
            .filter((q) =>
              q.and(
                q.eq(q.field("kidProfileId"), args.kidProfileId),
                q.eq(q.field("appleAlbumId"), request.appleAlbumId)
              )
            )
            .first();
        }

        // Fallback: check by album name
        if (!songsFromAlbum && request.albumName) {
          songsFromAlbum = await ctx.db
            .query("approvedSongs")
            .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
            .filter((q) =>
              q.and(
                q.eq(q.field("kidProfileId"), args.kidProfileId),
                q.eq(q.field("albumName"), request.albumName)
              )
            )
            .first();
        }

        if (!songsFromAlbum) {
          // No approved songs exist for this kid from this album - skip
          continue;
        }
      }
      validAlbumRequests.push(request);
    }

    // For approved song requests, check if the song still exists
    const validSongRequests = [];
    for (const request of songRequests) {
      if (request.status === 'approved') {
        // Skip check if appleSongId is missing (legacy data)
        if (!request.appleSongId) {
          // Can't verify without appleSongId - skip this request as deleted
          continue;
        }

        // Check if song still exists in approvedSongs for this kid
        const songExists = await ctx.db
          .query("approvedSongs")
          .withIndex("by_user_and_song", (q) =>
            q.eq("userId", kidProfile.userId).eq("appleSongId", request.appleSongId)
          )
          .filter((q) => q.eq(q.field("kidProfileId"), args.kidProfileId))
          .first();

        if (!songExists) {
          // Song was deleted - skip this request
          continue;
        }
      }
      validSongRequests.push(request);
    }

    // Combine and sort by most recent
    const allRequests = [
      ...validAlbumRequests.map(r => ({ ...r, requestType: 'album' as const })),
      ...validSongRequests.map(r => ({ ...r, requestType: 'song' as const }))
    ].sort((a, b) => b.requestedAt - a.requestedAt);

    return allRequests;
  },
});

// Get count of unviewed reviewed requests (approved or denied but not yet viewed)
export const getUnviewedCount = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const albumRequests = await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.or(
            q.eq(q.field("viewedByKid"), undefined),
            q.eq(q.field("viewedByKid"), false)
          )
        )
      )
      .collect();

    const songRequests = await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.or(
            q.eq(q.field("viewedByKid"), undefined),
            q.eq(q.field("viewedByKid"), false)
          )
        )
      )
      .collect();

    return albumRequests.length + songRequests.length;
  },
});

// Mark album request as viewed by kid
export const markAlbumRequestAsViewed = mutation({
  args: { requestId: v.id("albumRequests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      viewedByKid: true,
    });
  },
});

// Mark song request as viewed by kid
export const markSongRequestAsViewed = mutation({
  args: { requestId: v.id("songRequests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      viewedByKid: true,
    });
  },
});

// Mark all requests as viewed for a kid
export const markAllRequestsAsViewed = mutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const albumRequests = await ctx.db
      .query("albumRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.or(
            q.eq(q.field("viewedByKid"), undefined),
            q.eq(q.field("viewedByKid"), false)
          )
        )
      )
      .collect();

    const songRequests = await ctx.db
      .query("songRequests")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.or(
            q.eq(q.field("viewedByKid"), undefined),
            q.eq(q.field("viewedByKid"), false)
          )
        )
      )
      .collect();

    // Mark all as viewed
    for (const request of albumRequests) {
      await ctx.db.patch(request._id, { viewedByKid: true });
    }
    for (const request of songRequests) {
      await ctx.db.patch(request._id, { viewedByKid: true });
    }

    return { marked: albumRequests.length + songRequests.length };
  },
});
