import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Cleanup function to remove broken Star Wars song approvals
export const removeStarWarsSongs = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find all Star Wars songs in approvedSongs
    const allSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const starWarsSongs = allSongs.filter(song =>
      song.albumName?.includes("Star Wars")
    );

    console.log(`Found ${starWarsSongs.length} Star Wars songs to remove`);

    // Delete them
    for (const song of starWarsSongs) {
      await ctx.db.delete(song._id);
      console.log(`Deleted: ${song.songName} from ${song.albumName}`);
    }

    return {
      removed: starWarsSongs.length,
      songs: starWarsSongs.map(s => ({ name: s.songName, album: s.albumName }))
    };
  },
});
