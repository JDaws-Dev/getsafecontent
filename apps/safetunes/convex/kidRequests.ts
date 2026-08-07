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

    // Pre-fetch this kid's approved songs once via the selective index, then
    // do existence checks in memory. Without this, each approved album request
    // walked the parent's full approvedSongs (>1k rows) and blew past the
    // 32k-document read limit for families with many albums.
    const needAlbumExistenceCheck = albumRequests.some(
      (r) => r.status === 'approved' || r.status === 'partially_approved'
    );
    const needSongExistenceCheck = songRequests.some((r) => r.status === 'approved');

    let approvedAlbumIds = new Set<string>();
    let approvedAlbumNames = new Set<string>();
    let approvedSongIds = new Set<string>();

    if (needAlbumExistenceCheck || needSongExistenceCheck) {
      const approvedForKid = await ctx.db
        .query("approvedSongs")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
        .collect();

      for (const song of approvedForKid) {
        if (song.appleAlbumId) approvedAlbumIds.add(song.appleAlbumId);
        if (song.albumName) approvedAlbumNames.add(song.albumName);
        approvedSongIds.add(song.appleSongId);
      }
    }

    // For approved album requests, check if the album still exists
    // If album was deleted after approval, don't show the request
    const validAlbumRequests = [];
    for (const request of albumRequests) {
      if (request.status === 'approved' || request.status === 'partially_approved') {
        const stillExists =
          (request.appleAlbumId && approvedAlbumIds.has(request.appleAlbumId)) ||
          (request.albumName && approvedAlbumNames.has(request.albumName));

        if (!stillExists) {
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

        if (!approvedSongIds.has(request.appleSongId)) {
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
