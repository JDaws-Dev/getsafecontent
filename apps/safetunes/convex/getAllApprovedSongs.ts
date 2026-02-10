import { v } from "convex/values";
import { query } from "./_generated/server";

// Get ALL approved songs for a kid (from both full albums and individual song approvals)
export const getAllApprovedSongsForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Get the kid profile to find the userId
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return [];
    }

    // Get all approved songs (individual approvals)
    const individualSongs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter for this kid or all kids
    const kidSongs = individualSongs.filter(
      (song) =>
        song.kidProfileId === args.kidProfileId ||
        song.kidProfileId === null ||
        song.kidProfileId === undefined
    );

    // Get all approved albums for this kid
    const approvedAlbums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", kidProfile.userId))
      .collect();

    // Filter for this kid or all kids
    const kidAlbums = approvedAlbums.filter(
      (album) =>
        album.kidProfileId === args.kidProfileId ||
        album.kidProfileId === null ||
        album.kidProfileId === undefined
    );

    // Check which albums have individual song management
    const albumsWithIndividualSongs = new Set(
      kidSongs.map(s => s.albumName).filter(Boolean)
    );

    // For each full album (no individual song management), we can't include its songs here
    // because we don't store the full tracklist in Convex
    // Instead, we'll just return the individually approved songs
    // The UI will need to handle displaying "full album" songs differently

    // Return just the individual songs for now
    // Note: Full albums should be shown in the Albums section, not Songs section
    return kidSongs.map(song => ({
      _id: song._id,
      appleSongId: song.appleSongId,
      songName: song.songName,
      artistName: song.artistName,
      albumName: song.albumName,
      artworkUrl: song.artworkUrl,
      durationInMillis: song.durationInMillis,
      isExplicit: song.isExplicit,
      hideArtwork: song.hideArtwork,
      approvedAt: song.approvedAt,
      source: 'individual' as const,
    }));
  },
});
