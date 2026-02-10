import { mutation } from "./_generated/server";

// DEBUG: Find songs with library IDs (i.xxx) that won't work for other users
export const findBrokenSongIds = mutation({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db.query("approvedSongs").collect();
    const albums = await ctx.db.query("approvedAlbums").collect();

    // Songs with library IDs
    const brokenSongs = songs.filter(s => s.appleSongId.startsWith("i."));
    const brokenAlbums = albums.filter(a => a.appleAlbumId.startsWith("l."));

    return {
      totalSongs: songs.length,
      brokenSongs: brokenSongs.length,
      brokenSongExamples: brokenSongs.slice(0, 10).map(s => ({
        id: s.appleSongId,
        name: s.songName,
        artist: s.artistName,
      })),
      totalAlbums: albums.length,
      brokenAlbums: brokenAlbums.length,
      brokenAlbumExamples: brokenAlbums.slice(0, 10).map(a => ({
        id: a.appleAlbumId,
        name: a.albumName,
        artist: a.artistName,
      })),
    };
  },
});
