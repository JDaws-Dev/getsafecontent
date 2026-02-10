import { mutation } from "./_generated/server";

// REPURPOSED: Analyze null kidProfileId data (was checkClaireAlbums)
export const checkClaireAlbums = mutation({
  handler: async (ctx) => {
    const songs = await ctx.db.query("approvedSongs").collect();
    const albums = await ctx.db.query("approvedAlbums").collect();
    const kids = await ctx.db.query("kidProfiles").collect();

    const nullKidProfileSongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && !s.featured
    );
    const nullKidProfileAlbums = albums.filter(
      (a) => a.kidProfileId === null || a.kidProfileId === undefined
    );

    // Group by user
    const byUser: Record<string, { userId: string; nullSongs: number; nullAlbums: number; kidCount: number; kidNames: string[] }> = {};

    for (const song of nullKidProfileSongs) {
      if (!byUser[song.userId]) {
        const userKids = kids.filter(k => k.userId === song.userId);
        byUser[song.userId] = {
          userId: song.userId,
          nullSongs: 0,
          nullAlbums: 0,
          kidCount: userKids.length,
          kidNames: userKids.map(k => k.name),
        };
      }
      byUser[song.userId].nullSongs++;
    }

    for (const album of nullKidProfileAlbums) {
      if (!byUser[album.userId]) {
        const userKids = kids.filter(k => k.userId === album.userId);
        byUser[album.userId] = {
          userId: album.userId,
          nullSongs: 0,
          nullAlbums: 0,
          kidCount: userKids.length,
          kidNames: userKids.map(k => k.name),
        };
      }
      byUser[album.userId].nullAlbums++;
    }

    return {
      totalSongs: songs.length,
      nullKidProfileSongs: nullKidProfileSongs.length,
      totalAlbums: albums.length,
      nullKidProfileAlbums: nullKidProfileAlbums.length,
      totalKidProfiles: kids.length,
      breakdown: Object.values(byUser),
    };
  },
});
