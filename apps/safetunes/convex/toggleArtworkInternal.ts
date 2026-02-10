import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Internal mutation to toggle artwork by email and album name
export const toggleByEmailAndName = internalMutation({
  args: {
    email: v.string(),
    albumName: v.string(),
    hideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { error: `User not found: ${args.email}` };
    }

    // Find ALL album instances with this name
    const allAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const matchingAlbums = allAlbums.filter(
      (a) => a.albumName?.toLowerCase() === args.albumName.toLowerCase()
    );

    // Update all matching album instances
    for (const album of matchingAlbums) {
      await ctx.db.patch(album._id, {
        hideArtwork: args.hideArtwork,
      });
    }

    // Also update all songs from this album
    const allSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let songsUpdated = 0;
    for (const song of allSongs) {
      if (song.albumName?.toLowerCase() === args.albumName.toLowerCase()) {
        await ctx.db.patch(song._id, {
          hideArtwork: args.hideArtwork,
        });
        songsUpdated++;
      }
    }

    return {
      success: true,
      albumsUpdated: matchingAlbums.length,
      songsUpdated,
      albumName: args.albumName,
      hideArtwork: args.hideArtwork,
    };
  },
});
