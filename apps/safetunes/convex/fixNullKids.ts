import { mutation } from "./_generated/server";
import { v } from "convex/values";

// MIGRATION: Fix null kidProfileId songs by copying to all kids
export const fixSongs = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .first();

    if (!user) {
      throw new Error(`User not found with email: ${args.userEmail}`);
    }

    // Get all kid profiles for this user
    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (kids.length === 0) {
      return { success: false, message: "No kid profiles found for user" };
    }

    // Get all songs
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Find songs with null kidProfileId (not featured-only)
    const nullKidProfileSongs = songs.filter(
      (s) => (s.kidProfileId === null || s.kidProfileId === undefined) && !s.featured
    );

    console.log(`Found ${nullKidProfileSongs.length} songs with null kidProfileId`);
    console.log(`Will copy to ${kids.length} kids: ${kids.map(k => k.name).join(", ")}`);

    let created = 0;
    let deleted = 0;
    let skipped = 0;

    for (const song of nullKidProfileSongs) {
      // Create a copy for each kid
      for (const kid of kids) {
        // Check if song already exists for this kid
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

        // Create song for this kid
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

      // Delete the original null kidProfileId song
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
      message: `Created ${created} kid-specific songs, deleted ${deleted} null songs, skipped ${skipped} existing`
    };
  },
});

// MIGRATION: Fix null kidProfileId albums by copying to all kids
export const fixAlbums = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .first();

    if (!user) {
      throw new Error(`User not found with email: ${args.userEmail}`);
    }

    // Get all kid profiles for this user
    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (kids.length === 0) {
      return { success: false, message: "No kid profiles found for user" };
    }

    // Get all albums
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Find albums with null kidProfileId
    const nullKidProfileAlbums = albums.filter(
      (a) => a.kidProfileId === null || a.kidProfileId === undefined
    );

    console.log(`Found ${nullKidProfileAlbums.length} albums with null kidProfileId`);

    let created = 0;
    let deleted = 0;
    let skipped = 0;

    for (const album of nullKidProfileAlbums) {
      // Create a copy for each kid
      for (const kid of kids) {
        // Check if album already exists for this kid
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

        // Create album for this kid
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

      // Delete the original null kidProfileId album
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
      message: `Created ${created} kid-specific albums, deleted ${deleted} null albums, skipped ${skipped} existing`
    };
  },
});

// Analyze how many null kidProfileId records exist
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
