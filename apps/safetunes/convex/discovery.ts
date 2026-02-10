import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Check if an album should be auto-approved based on pre-approved content
export const checkAutoApproval = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    genres: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get the kid profile to find userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return { autoApproved: false, reason: null, preApprovalId: null };
    }

    // Get all pre-approvals for this user
    const preApprovals = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter for this kid or all kids
    const targetKidId = String(args.kidProfileId);
    const relevantPreApprovals = preApprovals.filter((approval) => {
      if (!approval.kidProfileId) return true;
      return String(approval.kidProfileId) === targetKidId;
    });

    // Check for artist match
    const artistMatch = relevantPreApprovals.find(
      (approval) =>
        approval.contentType === "artist" &&
        approval.artistName?.toLowerCase() === args.artistName.toLowerCase()
    );

    if (artistMatch) {
      return {
        autoApproved: true,
        reason: "artist-match",
        preApprovalId: artistMatch._id,
        autoAddToLibrary: artistMatch.autoAddToLibrary,
        hideArtwork: artistMatch.hideArtwork,
      };
    }

    // Check for genre match
    if (args.genres && args.genres.length > 0) {
      for (const genre of args.genres) {
        const genreMatch = relevantPreApprovals.find(
          (approval) =>
            approval.contentType === "genre" &&
            approval.genreName?.toLowerCase() === genre.toLowerCase()
        );

        if (genreMatch) {
          return {
            autoApproved: true,
            reason: "genre-match",
            preApprovalId: genreMatch._id,
            autoAddToLibrary: genreMatch.autoAddToLibrary,
            hideArtwork: genreMatch.hideArtwork,
          };
        }
      }
    }

    // Check for album match
    const albumMatch = relevantPreApprovals.find(
      (approval) =>
        approval.contentType === "album" &&
        approval.appleAlbumId === args.appleAlbumId
    );

    if (albumMatch) {
      return {
        autoApproved: true,
        reason: "album-match",
        preApprovalId: albumMatch._id,
        autoAddToLibrary: albumMatch.autoAddToLibrary,
        hideArtwork: albumMatch.hideArtwork,
      };
    }

    return { autoApproved: false, reason: null, preApprovalId: null };
  },
});

// Auto-approve and add an album to the library
export const autoApproveAlbum = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    genres: v.optional(v.array(v.string())),
    releaseYear: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    isExplicit: v.optional(v.boolean()),
    discoveryMethod: v.string(), // "artist-match", "genre-match", "album-match", "ai-recommended"
    preApprovalId: v.optional(v.id("preApprovedContent")),
    hideArtwork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the kid profile to find userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      throw new Error("Kid profile not found");
    }

    // Check if already approved
    const existingApproval = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", kidProfile.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .filter((q) => q.eq(q.field("kidProfileId"), args.kidProfileId))
      .first();

    let approvalId = existingApproval?._id;

    // If not already approved, approve it
    if (!existingApproval) {
      approvalId = await ctx.db.insert("approvedAlbums", {
        userId: kidProfile.userId,
        kidProfileId: args.kidProfileId,
        appleAlbumId: args.appleAlbumId,
        albumName: args.albumName,
        artistName: args.artistName,
        artworkUrl: args.artworkUrl,
        releaseYear: args.releaseYear,
        trackCount: args.trackCount,
        genres: args.genres,
        isExplicit: args.isExplicit,
        hideArtwork: args.hideArtwork,
        approvedAt: Date.now(),
      });
    }

    // Record discovery history
    await ctx.db.insert("discoveryHistory", {
      userId: kidProfile.userId,
      kidProfileId: args.kidProfileId,
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
      artistName: args.artistName,
      artworkUrl: args.artworkUrl,
      genres: args.genres,
      discoveryMethod: args.discoveryMethod,
      matchedPreApprovalId: args.preApprovalId,
      autoAddedToLibrary: true,
      autoAddedAt: Date.now(),
      discoveredAt: Date.now(),
      viewedByParent: false,
    });

    return { approvalId, wasNewApproval: !existingApproval };
  },
});

// Get discovery history for a user
export const getDiscoveryHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("discoveryHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Enrich with kid profile info
    const enriched = await Promise.all(
      history.map(async (item) => {
        const kidProfile = await ctx.db.get(item.kidProfileId);
        return {
          ...item,
          kidProfile: kidProfile
            ? {
                _id: kidProfile._id,
                name: kidProfile.name,
                avatar: kidProfile.avatar,
                color: kidProfile.color,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// Get discovery history for a specific kid
export const getDiscoveryForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("discoveryHistory")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .collect();

    return history;
  },
});

// Mark discovery history as viewed by parent
export const markDiscoveryViewed = mutation({
  args: {
    discoveryIds: v.array(v.id("discoveryHistory")),
  },
  handler: async (ctx, args) => {
    for (const id of args.discoveryIds) {
      await ctx.db.patch(id, {
        viewedByParent: true,
      });
    }
  },
});

// Get pre-approved content available for discovery (for kid's discovery page)
export const getAvailableForDiscovery = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get the kid profile to find userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return {
        artists: [],
        genres: [],
        albums: [],
      };
    }

    // Get all pre-approvals for this kid
    const preApprovals = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter for this kid or all kids
    const targetKidId = String(args.kidProfileId);
    const relevantPreApprovals = preApprovals.filter((approval) => {
      if (!approval.kidProfileId) return true;
      return String(approval.kidProfileId) === targetKidId;
    });

    // Group by type
    const artists = relevantPreApprovals.filter(
      (a) => a.contentType === "artist"
    );
    const genres = relevantPreApprovals.filter(
      (a) => a.contentType === "genre"
    );
    const albums = relevantPreApprovals.filter(
      (a) => a.contentType === "album"
    );

    return {
      artists,
      genres,
      albums,
    };
  },
});
