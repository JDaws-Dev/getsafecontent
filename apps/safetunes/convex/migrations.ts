import { mutation } from "./_generated/server";

// Helper function to generate a unique 6-character family code
function generateFamilyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars: 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ONE-TIME MIGRATION: Add family codes to existing users
export const addFamilyCodesToExistingUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // Skip if already has a family code
      if (user.familyCode) {
        skipped++;
        continue;
      }

      // Generate a unique family code
      let familyCode = generateFamilyCode();
      let codeExists = true;

      // Keep generating until we get a unique code
      while (codeExists) {
        const existingCode = await ctx.db
          .query("users")
          .withIndex("by_family_code", (q) => q.eq("familyCode", familyCode))
          .first();

        if (!existingCode) {
          codeExists = false;
        } else {
          familyCode = generateFamilyCode();
        }
      }

      // Update the user
      await ctx.db.patch(user._id, {
        familyCode: familyCode,
      });

      updated++;
    }

    return {
      success: true,
      updated,
      skipped,
      message: `Updated ${updated} users, skipped ${skipped} users that already had codes`,
    };
  },
});

// ONE-TIME MIGRATION: Approve all songs that are in playlists but not in approvedSongs
export const approvePlaylistSongs = mutation({
  args: {},
  handler: async (ctx) => {
    const playlists = await ctx.db.query("playlists").collect();
    let songsApproved = 0;
    let songsSkipped = 0;

    for (const playlist of playlists) {
      for (const song of playlist.songs) {
        // Check if song is already approved for this kid
        const existing = await ctx.db
          .query("approvedSongs")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), playlist.userId),
              q.eq(q.field("appleSongId"), song.appleSongId),
              q.eq(q.field("kidProfileId"), playlist.kidProfileId)
            )
          )
          .first();

        if (existing) {
          songsSkipped++;
          continue;
        }

        // Approve the song
        await ctx.db.insert("approvedSongs", {
          userId: playlist.userId,
          kidProfileId: playlist.kidProfileId,
          appleSongId: song.appleSongId,
          songName: song.songName,
          artistName: song.artistName,
          albumName: song.albumName,
          artworkUrl: song.artworkUrl,
          durationInMillis: song.durationInMillis,
          approvedAt: Date.now(),
        });

        songsApproved++;
      }
    }

    return {
      success: true,
      songsApproved,
      songsSkipped,
      message: `Approved ${songsApproved} songs from playlists, skipped ${songsSkipped} already approved songs`,
    };
  },
});

// DEBUG: Check what songs are approved for a specific kid
export const debugKidSongs = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all kid profiles
    const kids = await ctx.db.query("kidProfiles").collect();

    const results = [];
    for (const kid of kids) {
      const approvedSongs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user", (q) => q.eq("userId", kid.userId))
        .collect();

      const kidSongs = approvedSongs.filter(
        (song) =>
          song.kidProfileId === kid._id ||
          song.kidProfileId === null ||
          song.kidProfileId === undefined
      );

      results.push({
        kidName: kid.name,
        kidId: kid._id,
        userId: kid.userId,
        totalApprovedSongs: kidSongs.length,
        specificToKid: kidSongs.filter(s => s.kidProfileId === kid._id).length,
        sharedSongs: kidSongs.filter(s => !s.kidProfileId).length,
      });
    }

    return results;
  },
});

// ONE-TIME MIGRATION: Fix artwork URLs in recentlyPlayed table
export const fixRecentlyPlayedArtwork = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("recentlyPlayed").collect();
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const artworkUrl = item.artworkUrl;

      // Skip if no artwork URL or already fixed
      if (!artworkUrl || (!artworkUrl.includes('{w}') && !artworkUrl.includes('{h}'))) {
        skipped++;
        continue;
      }

      // Replace placeholders with actual dimensions
      const fixedUrl = artworkUrl.replace('{w}', '300').replace('{h}', '300');

      await ctx.db.patch(item._id, {
        artworkUrl: fixedUrl,
      });

      updated++;
    }

    return {
      success: true,
      updated,
      skipped,
      message: `Fixed ${updated} artwork URLs, skipped ${skipped} items`,
    };
  },
});

// CLEANUP: Clear all recently played data
export const clearRecentlyPlayed = mutation({
  args: {},
  handler: async (ctx) => {
    const allRecentlyPlayed = await ctx.db.query("recentlyPlayed").collect();
    let deleted = 0;

    for (const item of allRecentlyPlayed) {
      await ctx.db.delete(item._id);
      deleted++;
    }

    return {
      success: true,
      deleted,
      message: `Deleted ${deleted} recently played items`,
    };
  },
});

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

// DEBUG: Analyze songs/albums with null kidProfileId
export const analyzeNullKidProfileIds = mutation({
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
export const fixNullKidProfileSongs = mutation({
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
export const fixNullKidProfileAlbums = mutation({
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
