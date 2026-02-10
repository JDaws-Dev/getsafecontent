import { mutation, query } from "./_generated/server";

// DEBUG: Analyze songs/albums with null kidProfileId
export const analyze = mutation({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db.query("approvedSongs").collect();
    const albums = await ctx.db.query("approvedAlbums").collect();
    const kids = await ctx.db.query("kidProfiles").collect();

    // Songs with null/undefined kidProfileId (excluding featured-only songs)
    const nullKidProfileSongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && !s.featured
    );
    const featuredOnlySongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && s.featured
    );

    // Albums with null/undefined kidProfileId
    const nullKidProfileAlbums = albums.filter(
      (a) => a.kidProfileId === null || a.kidProfileId === undefined
    );

    // Group by userId to show breakdown per family
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
      featuredOnlySongs: featuredOnlySongs.length,
      totalAlbums: albums.length,
      nullKidProfileAlbums: nullKidProfileAlbums.length,
      totalKidProfiles: kids.length,
      breakdown: Object.values(byUser),
      sampleNullSongs: nullKidProfileSongs.slice(0, 10).map(s => ({
        id: s._id,
        songName: s.songName,
        artistName: s.artistName,
        userId: s.userId,
      })),
    };
  },
});

// ONE-TIME MIGRATION: Fix songs with null kidProfileId
// Creates a copy of each song for EACH kid profile of that user, then deletes the original
export const fixSongs = mutation({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db.query("approvedSongs").collect();
    const kids = await ctx.db.query("kidProfiles").collect();

    // Songs with null/undefined kidProfileId (excluding featured-only songs which stay null)
    const nullKidProfileSongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && !s.featured
    );

    let created = 0;
    let deleted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const song of nullKidProfileSongs) {
      try {
        // Get all kid profiles for this user
        const userKids = kids.filter(k => k.userId === song.userId);

        if (userKids.length === 0) {
          // No kids for this user, just delete the orphaned song
          await ctx.db.delete(song._id);
          deleted++;
          continue;
        }

        // Create a copy for each kid
        for (const kid of userKids) {
          // Check if song already exists for this kid
          const existing = await ctx.db
            .query("approvedSongs")
            .filter((q) =>
              q.and(
                q.eq(q.field("userId"), song.userId),
                q.eq(q.field("appleSongId"), song.appleSongId),
                q.eq(q.field("kidProfileId"), kid._id)
              )
            )
            .first();

          if (existing) {
            skipped++;
            continue;
          }

          // Create song for this kid
          await ctx.db.insert("approvedSongs", {
            userId: song.userId,
            kidProfileId: kid._id,
            appleSongId: song.appleSongId,
            songName: song.songName,
            artistName: song.artistName,
            albumName: song.albumName,
            artworkUrl: song.artworkUrl,
            durationInMillis: song.durationInMillis,
            genres: song.genres,
            isExplicit: song.isExplicit,
            hideArtwork: song.hideArtwork,
            featured: undefined, // Not featured for library copies
            featuredForKids: undefined,
            appleAlbumId: song.appleAlbumId,
            trackNumber: song.trackNumber,
            approvedAt: song.approvedAt,
          });
          created++;
        }

        // Delete the original null kidProfileId song
        await ctx.db.delete(song._id);
        deleted++;
      } catch (err) {
        errors.push(`Song ${song.songName}: ${err}`);
      }
    }

    return {
      success: true,
      originalNullSongs: nullKidProfileSongs.length,
      created,
      deleted,
      skipped,
      errors: errors.slice(0, 20),
      message: `Created ${created} kid-specific songs, deleted ${deleted} null-kidProfileId songs, skipped ${skipped} duplicates`,
    };
  },
});

// ONE-TIME MIGRATION: Fix albums with null kidProfileId
// Creates a copy of each album for EACH kid profile of that user, then deletes the original
export const fixAlbums = mutation({
  args: {},
  handler: async (ctx) => {
    const albums = await ctx.db.query("approvedAlbums").collect();
    const kids = await ctx.db.query("kidProfiles").collect();

    // Albums with null/undefined kidProfileId
    const nullKidProfileAlbums = albums.filter(
      (a) => a.kidProfileId === null || a.kidProfileId === undefined
    );

    let created = 0;
    let deleted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const album of nullKidProfileAlbums) {
      try {
        // Get all kid profiles for this user
        const userKids = kids.filter(k => k.userId === album.userId);

        if (userKids.length === 0) {
          // No kids for this user, just delete the orphaned album
          await ctx.db.delete(album._id);
          deleted++;
          continue;
        }

        // Create a copy for each kid
        for (const kid of userKids) {
          // Check if album already exists for this kid
          const existing = await ctx.db
            .query("approvedAlbums")
            .filter((q) =>
              q.and(
                q.eq(q.field("userId"), album.userId),
                q.eq(q.field("appleAlbumId"), album.appleAlbumId),
                q.eq(q.field("kidProfileId"), kid._id)
              )
            )
            .first();

          if (existing) {
            skipped++;
            continue;
          }

          // Create album for this kid
          await ctx.db.insert("approvedAlbums", {
            userId: album.userId,
            kidProfileId: kid._id,
            appleAlbumId: album.appleAlbumId,
            albumName: album.albumName,
            artistName: album.artistName,
            artworkUrl: album.artworkUrl,
            releaseYear: album.releaseYear,
            trackCount: album.trackCount,
            genres: album.genres,
            isExplicit: album.isExplicit,
            hideArtwork: album.hideArtwork,
            featured: album.featured,
            featuredForKids: album.featuredForKids,
            approvedAt: album.approvedAt,
          });
          created++;
        }

        // Delete the original null kidProfileId album
        await ctx.db.delete(album._id);
        deleted++;
      } catch (err) {
        errors.push(`Album ${album.albumName}: ${err}`);
      }
    }

    return {
      success: true,
      originalNullAlbums: nullKidProfileAlbums.length,
      created,
      deleted,
      skipped,
      errors: errors.slice(0, 20),
      message: `Created ${created} kid-specific albums, deleted ${deleted} null-kidProfileId albums, skipped ${skipped} duplicates`,
    };
  },
});
