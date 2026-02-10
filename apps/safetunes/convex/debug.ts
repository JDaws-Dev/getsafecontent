import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// DEBUG: Analyze songs/albums with null kidProfileId
export const analyzeNullKidProfiles = mutation({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db.query("approvedSongs").collect();
    const albums = await ctx.db.query("approvedAlbums").collect();
    const kids = await ctx.db.query("kidProfiles").collect();

    // Songs with null/undefined kidProfileId (excluding featured-only songs)
    const nullKidProfileSongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && !s.featured
    );

    // Albums with null/undefined kidProfileId
    const nullKidProfileAlbums = albums.filter(
      (a) => a.kidProfileId === null || a.kidProfileId === undefined
    );

    // Group by userId
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

// ONE-TIME MIGRATION: Fix songs with null kidProfileId
export const fixNullKidProfileSongs = mutation({
  args: {},
  handler: async (ctx) => {
    const songs = await ctx.db.query("approvedSongs").collect();
    const kids = await ctx.db.query("kidProfiles").collect();

    const nullKidProfileSongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && !s.featured
    );

    let created = 0;
    let deleted = 0;
    let skipped = 0;

    for (const song of nullKidProfileSongs) {
      const userKids = kids.filter(k => k.userId === song.userId);

      if (userKids.length === 0) {
        await ctx.db.delete(song._id);
        deleted++;
        continue;
      }

      for (const kid of userKids) {
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
          appleAlbumId: song.appleAlbumId,
          trackNumber: song.trackNumber,
          approvedAt: song.approvedAt,
        });
        created++;
      }

      await ctx.db.delete(song._id);
      deleted++;
    }

    return {
      originalNullSongs: nullKidProfileSongs.length,
      created,
      deleted,
      skipped,
    };
  },
});

// ONE-TIME MIGRATION: Fix albums with null kidProfileId
export const fixNullKidProfileAlbums = mutation({
  args: {},
  handler: async (ctx) => {
    const albums = await ctx.db.query("approvedAlbums").collect();
    const kids = await ctx.db.query("kidProfiles").collect();

    const nullKidProfileAlbums = albums.filter(
      (a) => a.kidProfileId === null || a.kidProfileId === undefined
    );

    let created = 0;
    let deleted = 0;
    let skipped = 0;

    for (const album of nullKidProfileAlbums) {
      const userKids = kids.filter(k => k.userId === album.userId);

      if (userKids.length === 0) {
        await ctx.db.delete(album._id);
        deleted++;
        continue;
      }

      for (const kid of userKids) {
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

      await ctx.db.delete(album._id);
      deleted++;
    }

    return {
      originalNullAlbums: nullKidProfileAlbums.length,
      created,
      deleted,
      skipped,
    };
  },
});

// Debug query to see all album records for an album
export const debugAlbumRecords = query({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
  },
  handler: async (ctx, args) => {
    // Use filter instead of index to get ALL records (including duplicates)
    const allAlbums = await ctx.db
      .query("approvedAlbums")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("appleAlbumId"), args.appleAlbumId)
        )
      )
      .collect();

    return allAlbums.map(album => ({
      _id: album._id,
      kidProfileId: album.kidProfileId,
      kidProfileIdString: String(album.kidProfileId),
      albumName: album.albumName,
      featured: album.featured,
      featuredForKids: album.featuredForKids,
    }));
  },
});

// Debug: Find all songs/albums matching a search term
export const findContentByName = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const searchLower = args.searchTerm.toLowerCase();

    // Find matching albums
    const albums = await ctx.db.query("approvedAlbums").collect();
    const matchingAlbums = albums.filter(
      a => a.albumName?.toLowerCase().includes(searchLower) ||
           a.artistName?.toLowerCase().includes(searchLower)
    );

    // Find matching songs
    const songs = await ctx.db.query("approvedSongs").collect();
    const matchingSongs = songs.filter(
      s => s.songName?.toLowerCase().includes(searchLower) ||
           s.albumName?.toLowerCase().includes(searchLower) ||
           s.artistName?.toLowerCase().includes(searchLower)
    );

    // Get kid profiles for reference
    const kids = await ctx.db.query("kidProfiles").collect();
    const kidMap: Record<string, string> = {};
    for (const kid of kids) {
      kidMap[kid._id] = kid.name;
    }

    return {
      albums: matchingAlbums.map(a => ({
        _id: a._id,
        albumName: a.albumName,
        artistName: a.artistName,
        appleAlbumId: a.appleAlbumId,
        trackCount: a.trackCount,
        kidProfileId: a.kidProfileId,
        kidName: a.kidProfileId ? kidMap[a.kidProfileId] : null,
      })),
      songs: matchingSongs.map(s => ({
        _id: s._id,
        songName: s.songName,
        artistName: s.artistName,
        albumName: s.albumName,
        appleSongId: s.appleSongId,
        appleAlbumId: s.appleAlbumId,
        trackNumber: s.trackNumber,
        kidProfileId: s.kidProfileId,
        kidName: s.kidProfileId ? kidMap[s.kidProfileId] : null,
      })),
      totalAlbums: matchingAlbums.length,
      totalSongs: matchingSongs.length,
    };
  },
});

// Clean up bad "cached-lyrics-only" entries from contentReviewCache
// These are fake review entries created by the lyrics caching that pollute the AI review cache
export const cleanupBadCacheEntries = mutation({
  args: {},
  handler: async (ctx) => {
    const allCache = await ctx.db.query("contentReviewCache").collect();

    // Find entries with "cached-lyrics-only" model - these are fake reviews
    const badEntries = allCache.filter(entry => entry.openAiModel === "cached-lyrics-only");

    let deleted = 0;
    for (const entry of badEntries) {
      await ctx.db.delete(entry._id);
      deleted++;
    }

    return {
      totalCacheEntries: allCache.length,
      badEntriesFound: badEntries.length,
      deleted,
    };
  },
});
