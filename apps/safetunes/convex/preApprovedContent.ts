import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Pre-approve an artist
export const preApproveArtist = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.optional(v.id("kidProfiles")),
    artistName: v.string(),
    autoAddToLibrary: v.boolean(),
    hideArtwork: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    preApprovedBy: v.string(), // Parent name
  },
  handler: async (ctx, args) => {
    // Check if already pre-approved
    const existing = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_artist", (q) =>
        q.eq("userId", args.userId).eq("artistName", args.artistName)
      )
      .filter((q) => q.eq(q.field("kidProfileId"), args.kidProfileId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        autoAddToLibrary: args.autoAddToLibrary,
        hideArtwork: args.hideArtwork,
        notes: args.notes,
        preApprovedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new pre-approval
    return await ctx.db.insert("preApprovedContent", {
      userId: args.userId,
      kidProfileId: args.kidProfileId,
      contentType: "artist",
      artistName: args.artistName,
      autoAddToLibrary: args.autoAddToLibrary,
      hideArtwork: args.hideArtwork,
      preApprovedAt: Date.now(),
      preApprovedBy: args.preApprovedBy,
      notes: args.notes,
    });
  },
});

// Pre-approve a genre
export const preApproveGenre = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.optional(v.id("kidProfiles")),
    genreName: v.string(),
    autoAddToLibrary: v.boolean(),
    hideArtwork: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    preApprovedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already pre-approved
    const existing = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_genre", (q) =>
        q.eq("userId", args.userId).eq("genreName", args.genreName)
      )
      .filter((q) => q.eq(q.field("kidProfileId"), args.kidProfileId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        autoAddToLibrary: args.autoAddToLibrary,
        hideArtwork: args.hideArtwork,
        notes: args.notes,
        preApprovedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new pre-approval
    return await ctx.db.insert("preApprovedContent", {
      userId: args.userId,
      kidProfileId: args.kidProfileId,
      contentType: "genre",
      genreName: args.genreName,
      autoAddToLibrary: args.autoAddToLibrary,
      hideArtwork: args.hideArtwork,
      preApprovedAt: Date.now(),
      preApprovedBy: args.preApprovedBy,
      notes: args.notes,
    });
  },
});

// Pre-approve an album
export const preApproveAlbum = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.optional(v.id("kidProfiles")),
    appleAlbumId: v.string(),
    albumName: v.string(),
    autoAddToLibrary: v.boolean(),
    hideArtwork: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    preApprovedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already pre-approved
    const existing = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("appleAlbumId"), args.appleAlbumId),
          q.eq(q.field("kidProfileId"), args.kidProfileId)
        )
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        autoAddToLibrary: args.autoAddToLibrary,
        hideArtwork: args.hideArtwork,
        notes: args.notes,
        preApprovedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new pre-approval
    return await ctx.db.insert("preApprovedContent", {
      userId: args.userId,
      kidProfileId: args.kidProfileId,
      contentType: "album",
      appleAlbumId: args.appleAlbumId,
      albumName: args.albumName,
      autoAddToLibrary: args.autoAddToLibrary,
      hideArtwork: args.hideArtwork,
      preApprovedAt: Date.now(),
      preApprovedBy: args.preApprovedBy,
      notes: args.notes,
    });
  },
});

// Remove a pre-approval
export const removePreApproval = mutation({
  args: {
    preApprovalId: v.id("preApprovedContent"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.preApprovalId);
  },
});

// Get all pre-approved content for a user
export const getPreApprovedContent = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const preApprovals = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrich with kid profile info
    const enriched = await Promise.all(
      preApprovals.map(async (approval) => {
        let kidProfile = null;
        if (approval.kidProfileId) {
          kidProfile = await ctx.db.get(approval.kidProfileId);
        }

        return {
          ...approval,
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

// Get pre-approved content for a specific kid
export const getPreApprovedForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get the kid profile to find userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return [];
    }

    // Get pre-approvals for this kid or all kids (null kidProfileId)
    const allPreApprovals = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter for this specific kid OR approved for all kids
    const targetKidId = String(args.kidProfileId);
    return allPreApprovals.filter((approval) => {
      if (!approval.kidProfileId) {
        // Approved for all kids
        return true;
      }
      // Compare as strings
      return String(approval.kidProfileId) === targetKidId;
    });
  },
});

// Get pre-approved content by type
export const getPreApprovedByType = query({
  args: {
    userId: v.id("users"),
    contentType: v.string(), // "artist", "genre", "album"
  },
  handler: async (ctx, args) => {
    const allPreApprovals = await ctx.db
      .query("preApprovedContent")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("contentType"), args.contentType))
      .collect();

    // Enrich with kid profile info
    const enriched = await Promise.all(
      allPreApprovals.map(async (approval) => {
        let kidProfile = null;
        if (approval.kidProfileId) {
          kidProfile = await ctx.db.get(approval.kidProfileId);
        }

        return {
          ...approval,
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
