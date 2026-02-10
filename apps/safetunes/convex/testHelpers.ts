// Test helper functions for manual testing
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get first user for testing
export const getFirstUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user;
  },
});

// Get first kid profile for testing
export const getFirstKidProfile = query({
  args: {},
  handler: async (ctx) => {
    const kid = await ctx.db.query("kidProfiles").first();
    return kid;
  },
});

// MIGRATION: Analyze null kidProfileId data
export const analyzeNullKidProfiles = mutation({
  args: {},
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

    return {
      totalSongs: songs.length,
      nullKidProfileSongs: nullKidProfileSongs.length,
      totalAlbums: albums.length,
      nullKidProfileAlbums: nullKidProfileAlbums.length,
      totalKidProfiles: kids.length,
    };
  },
});

// MIGRATION: Fix null kidProfileId songs by copying to all kids
export const fixNullSongs = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .first();

    if (!user) {
      throw new Error(`User not found with email: ${args.userEmail}`);
    }

    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (kids.length === 0) {
      return { success: false, message: "No kid profiles found for user" };
    }

    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const nullKidProfileSongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && !s.featured
    );

    console.log(`Found ${nullKidProfileSongs.length} songs with null kidProfileId`);

    let created = 0;
    let deleted = 0;
    let skipped = 0;

    for (const song of nullKidProfileSongs) {
      for (const kid of kids) {
        const existing = await ctx.db
          .query("approvedSongs")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), user._id),
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
          userId: user._id,
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
      success: true,
      originalNullSongs: nullKidProfileSongs.length,
      kidsCount: kids.length,
      created,
      deleted,
      skipped,
      message: `Created ${created} kid-specific songs, deleted ${deleted} null songs`
    };
  },
});

// MIGRATION: Fix null kidProfileId albums by copying to all kids
export const fixNullAlbums = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .first();

    if (!user) {
      throw new Error(`User not found with email: ${args.userEmail}`);
    }

    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (kids.length === 0) {
      return { success: false, message: "No kid profiles found for user" };
    }

    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const nullKidProfileAlbums = albums.filter(
      (a) => a.kidProfileId === null || a.kidProfileId === undefined
    );

    console.log(`Found ${nullKidProfileAlbums.length} albums with null kidProfileId`);

    let created = 0;
    let deleted = 0;
    let skipped = 0;

    for (const album of nullKidProfileAlbums) {
      for (const kid of kids) {
        const existing = await ctx.db
          .query("approvedAlbums")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), user._id),
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
          userId: user._id,
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
      success: true,
      originalNullAlbums: nullKidProfileAlbums.length,
      kidsCount: kids.length,
      created,
      deleted,
      skipped,
      message: `Created ${created} kid-specific albums, deleted ${deleted} null albums`
    };
  },
});
