import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// Internal query to get user's music data
export const getUserMusicData = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { error: `User not found: ${args.email}` };
    }

    // Get kid profiles
    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get albums for this user
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get songs for this user
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get recently played for each kid
    const recentlyPlayedByKid: Record<string, any[]> = {};
    for (const kid of kids) {
      const recent = await ctx.db
        .query("recentlyPlayed")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
        .order("desc")
        .take(10);
      recentlyPlayedByKid[kid.name] = recent.map(r => ({
        itemName: r.itemName,
        artistName: r.artistName,
        playedAt: new Date(r.playedAt).toISOString(),
      }));
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscriptionStatus,
        familyCode: user.familyCode,
        appleMusicAuthorized: user.appleMusicAuthorized,
      },
      kids: kids.map(k => ({
        id: k._id,
        name: k.name,
        color: k.color,
      })),
      musicLibrary: {
        albumCount: albums.length,
        songCount: songs.length,
        albums: albums.slice(0, 15).map(a => ({
          name: a.albumName,
          artist: a.artistName,
          hideArtwork: a.hideArtwork,
        })),
        songs: songs.slice(0, 15).map(s => ({
          name: s.songName,
          artist: s.artistName,
          albumName: s.albumName,
          kidProfileId: s.kidProfileId,
        })),
        // Search for specific artists
        mariahSongs: songs.filter(s =>
          s.artistName?.toLowerCase().includes('mariah') ||
          s.albumName?.toLowerCase().includes('mariah')
        ).map(s => ({
          name: s.songName,
          artist: s.artistName,
          albumName: s.albumName,
          hideArtwork: s.hideArtwork,
        })),
      },
      recentlyPlayed: recentlyPlayedByKid,
    };
  },
});
