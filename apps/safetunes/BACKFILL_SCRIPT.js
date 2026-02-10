/**
 * ONE-TIME BACKFILL SCRIPT
 *
 * Instructions:
 * 1. Open your app in the browser and log in as admin
 * 2. Go to Library page (so Apple Music is authorized)
 * 3. Open browser console (F12 or Cmd+Option+I)
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter and wait for it to complete
 */

(async function backfillAllAlbumTracks() {
  console.log('🔄 Starting album tracks backfill...');

  // Get Convex client from window
  const convex = window.__CONVEX_CLIENT__;
  if (!convex) {
    console.error('❌ Convex client not found. Make sure you\'re on the app page.');
    return;
  }

  // Get MusicKit instance
  const music = window.MusicKit?.getInstance();
  if (!music) {
    console.error('❌ MusicKit not found. Make sure Apple Music is authorized.');
    return;
  }

  try {
    // Get user from localStorage or session
    const userStr = localStorage.getItem('convex:userId');
    if (!userStr) {
      console.error('❌ User not found. Please log in first.');
      return;
    }

    const userId = JSON.parse(userStr);
    console.log('✓ Found user:', userId);

    // Fetch all approved albums
    console.log('📥 Fetching approved albums...');
    const albums = await convex.query('albums:getApprovedAlbums', { userId });
    console.log(`✓ Found ${albums.length} albums`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];

      // Skip partial albums (no appleAlbumId)
      if (!album.appleAlbumId) {
        console.log(`⊘ Skipping partial album: ${album.name || album.albumName}`);
        continue;
      }

      try {
        console.log(`[${i + 1}/${albums.length}] Fetching tracks for: ${album.name || album.albumName}`);

        // Fetch album from Apple Music
        const response = await music.api.music(`/v1/catalog/us/albums/${album.appleAlbumId}`, {
          include: 'tracks'
        });

        const albumData = response.data?.data?.[0];
        if (!albumData || !albumData.relationships?.tracks?.data) {
          console.warn(`⚠️  No tracks found for: ${album.name || album.albumName}`);
          continue;
        }

        const trackData = albumData.relationships.tracks.data;
        const tracks = trackData.map((track, index) => ({
          appleSongId: track.id,
          songName: track.attributes.name,
          artistName: track.attributes.artistName,
          trackNumber: track.attributes.trackNumber || index + 1,
          durationInMillis: track.attributes.durationInMillis,
          isExplicit: track.attributes.contentRating === 'explicit',
        }));

        // Store tracks via approveAlbum mutation (will skip if already exists)
        await convex.mutation('albums:approveAlbum', {
          userId,
          kidProfileId: album.kidProfileIds?.[0],
          appleAlbumId: album.appleAlbumId,
          albumName: album.name || album.albumName,
          artistName: album.artist || album.artistName,
          artworkUrl: album.artworkUrl,
          releaseYear: album.year || album.releaseYear,
          trackCount: album.trackCount,
          genres: album.genres,
          isExplicit: album.isExplicit,
          hideArtwork: album.hideArtwork || false,
          tracks,
        });

        successCount++;
        console.log(`✓ Stored ${tracks.length} tracks`);

        // Small delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        errorCount++;
        const error = `${album.name || album.albumName}: ${err.message}`;
        errors.push(error);
        console.error(`✗ Error:`, error);
      }
    }

    console.log('\n🎉 Backfill complete!');
    console.log(`✓ Success: ${successCount}`);
    console.log(`✗ Errors: ${errorCount}`);
    if (errors.length > 0) {
      console.log('\nError details:', errors);
    }

  } catch (err) {
    console.error('❌ Backfill failed:', err);
  }
})();
