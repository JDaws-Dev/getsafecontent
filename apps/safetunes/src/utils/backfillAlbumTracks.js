/**
 * Utility to backfill album tracks for existing approved albums
 * Run this once from the admin dashboard to populate tracks for all existing albums
 */

import musicKitService from '../config/musickit';

export async function backfillAlbumTracks(approvedAlbums, approveAlbum, userId) {
  console.log('[backfillAlbumTracks] Starting backfill for', approvedAlbums.length, 'albums');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const album of approvedAlbums) {
    // Skip if this is a partial album (has no appleAlbumId)
    if (!album.appleAlbumId) {
      console.log('[backfillAlbumTracks] Skipping partial album:', album.albumName);
      continue;
    }

    try {
      console.log('[backfillAlbumTracks] Fetching tracks for:', album.albumName);

      // Fetch tracks from Apple Music
      const albumTracks = await musicKitService.getAlbumTracks(album.appleAlbumId);

      if (!albumTracks || albumTracks.length === 0) {
        console.warn('[backfillAlbumTracks] No tracks found for:', album.albumName);
        continue;
      }

      // Format tracks
      const tracks = albumTracks.map((track, index) => ({
        appleSongId: track.id || track.attributes?.playParams?.id,
        songName: track.attributes?.name || track.name,
        artistName: track.attributes?.artistName || track.artistName || album.artistName,
        trackNumber: track.attributes?.trackNumber || index + 1,
        durationInMillis: track.attributes?.durationInMillis,
        isExplicit: track.attributes?.contentRating === 'explicit',
      }));

      // Call approveAlbum again with tracks (it will update existing album)
      await approveAlbum({
        userId: userId,
        kidProfileId: album.kidProfileIds?.[0], // Use first kid profile if exists
        appleAlbumId: album.appleAlbumId,
        albumName: album.name || album.albumName,
        artistName: album.artist || album.artistName,
        artworkUrl: album.artworkUrl,
        releaseYear: album.year || album.releaseYear,
        trackCount: album.trackCount,
        genres: album.genres,
        isExplicit: album.isExplicit,
        hideArtwork: album.hideArtwork || false,
        tracks: tracks,
      });

      successCount++;
      console.log('[backfillAlbumTracks] ✓ Successfully backfilled:', album.albumName, `(${tracks.length} tracks)`);

      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      errorCount++;
      const error = `Failed to backfill ${album.albumName}: ${err.message}`;
      errors.push(error);
      console.error('[backfillAlbumTracks] ✗', error);
    }
  }

  console.log('[backfillAlbumTracks] Backfill complete!');
  console.log('[backfillAlbumTracks] Success:', successCount);
  console.log('[backfillAlbumTracks] Errors:', errorCount);

  if (errors.length > 0) {
    console.log('[backfillAlbumTracks] Error details:', errors);
  }

  return {
    success: successCount,
    errors: errorCount,
    errorDetails: errors,
  };
}
