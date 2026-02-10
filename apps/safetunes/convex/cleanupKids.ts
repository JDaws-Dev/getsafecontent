import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Delete all music data for specific kid profiles
export const deleteAllMusicForKids = mutation({
  args: {
    userEmail: v.string(),
    kidNames: v.array(v.string()),
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

    console.log(`Found user: ${user.email} (${user._id})`);

    // Find kid profiles with the specified names
    const allKids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const kidsToDelete = allKids.filter((kid) =>
      args.kidNames.includes(kid.name)
    );

    if (kidsToDelete.length === 0) {
      throw new Error(
        `No kids found with names: ${args.kidNames.join(", ")}`
      );
    }

    console.log(
      `Found ${kidsToDelete.length} kids to clean up:`,
      kidsToDelete.map((k) => k.name)
    );

    let totalDeleted = {
      songs: 0,
      albums: 0,
      playlists: 0,
    };

    for (const kid of kidsToDelete) {
      console.log(`\nCleaning up data for: ${kid.name}`);

      // Delete approved songs for this kid
      const songs = await ctx.db
        .query("approvedSongs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const kidSongs = songs.filter(
        (s) => s.kidProfileId && String(s.kidProfileId) === String(kid._id)
      );

      for (const song of kidSongs) {
        await ctx.db.delete(song._id);
        totalDeleted.songs++;
      }
      console.log(`  Deleted ${kidSongs.length} songs`);

      // Delete approved albums for this kid
      const albums = await ctx.db
        .query("approvedAlbums")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const kidAlbums = albums.filter(
        (a) => a.kidProfileId && String(a.kidProfileId) === String(kid._id)
      );

      for (const album of kidAlbums) {
        await ctx.db.delete(album._id);
        totalDeleted.albums++;
      }
      console.log(`  Deleted ${kidAlbums.length} albums`);

      // Delete playlists for this kid
      const playlists = await ctx.db
        .query("playlists")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const kidPlaylists = playlists.filter(
        (p) => p.kidProfileId && String(p.kidProfileId) === String(kid._id)
      );

      for (const playlist of kidPlaylists) {
        await ctx.db.delete(playlist._id);
        totalDeleted.playlists++;
      }
      console.log(`  Deleted ${kidPlaylists.length} playlists`);
    }

    console.log("\n=== CLEANUP COMPLETE ===");
    console.log(`Total deleted:`);
    console.log(`  Songs: ${totalDeleted.songs}`);
    console.log(`  Albums: ${totalDeleted.albums}`);
    console.log(`  Playlists: ${totalDeleted.playlists}`);

    return {
      success: true,
      kidsProcessed: kidsToDelete.map((k) => k.name),
      deleted: totalDeleted,
    };
  },
});

// MIGRATION: Fix null kidProfileId songs by copying to all kids
export const fixNullKidProfileSongs = mutation({
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
export const fixNullKidProfileAlbums = mutation({
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

// Also delete orphaned songs/albums (those without a kidProfileId)
export const deleteOrphanedMusic = mutation({
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

    console.log(`Found user: ${user.email} (${user._id})`);

    let totalDeleted = {
      songs: 0,
      albums: 0,
    };

    // Delete songs without kidProfileId
    const songs = await ctx.db
      .query("approvedSongs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const orphanedSongs = songs.filter(
      (s) => !s.kidProfileId || s.kidProfileId === null
    );

    for (const song of orphanedSongs) {
      await ctx.db.delete(song._id);
      totalDeleted.songs++;
    }
    console.log(`Deleted ${orphanedSongs.length} orphaned songs`);

    // Delete albums without kidProfileId
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const orphanedAlbums = albums.filter(
      (a) => !a.kidProfileId || a.kidProfileId === null
    );

    for (const album of orphanedAlbums) {
      await ctx.db.delete(album._id);
      totalDeleted.albums++;
    }
    console.log(`Deleted ${orphanedAlbums.length} orphaned albums`);

    console.log("\n=== CLEANUP COMPLETE ===");
    console.log(`Total deleted:`);
    console.log(`  Orphaned Songs: ${totalDeleted.songs}`);
    console.log(`  Orphaned Albums: ${totalDeleted.albums}`);

    return {
      success: true,
      deleted: totalDeleted,
    };
  },
});
// Force rebuild: Fri Dec 12 17:30:00 EST 2025
