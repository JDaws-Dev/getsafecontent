/**
 * TEMPORARY BACKFILL COMPONENT
 *
 * Instructions:
 * 1. Copy this entire component
 * 2. Open src/components/admin/AdminDashboard.jsx
 * 3. Import it at the top: import BackfillComponent from './BackfillComponent';
 * 4. Add <BackfillComponent /> anywhere in the render (e.g., at the top of the dashboard)
 * 5. Go to admin dashboard and click "Backfill Album Tracks"
 * 6. Wait for it to complete
 * 7. Remove the component from AdminDashboard.jsx and delete this file
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import musicKitService from '../config/musickit';

export default function BackfillComponent() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState(null);

  const user = useQuery(api.users.getCurrentUser);
  const approvedAlbums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  );
  const approveAlbum = useMutation(api.albums.approveAlbum);

  const handleBackfill = async () => {
    if (!user || !approvedAlbums) {
      alert('User or albums not loaded');
      return;
    }

    setIsRunning(true);
    setProgress('Starting backfill...');
    setStats({ success: 0, errors: 0, errorDetails: [] });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < approvedAlbums.length; i++) {
      const album = approvedAlbums[i];

      // Skip partial albums (no appleAlbumId)
      if (!album.appleAlbumId) {
        setProgress(`[${i + 1}/${approvedAlbums.length}] Skipping partial album: ${album.name || album.albumName}`);
        continue;
      }

      try {
        setProgress(`[${i + 1}/${approvedAlbums.length}] Fetching tracks for: ${album.name || album.albumName}`);

        // Fetch tracks from Apple Music
        const albumTracks = await musicKitService.getAlbumTracks(album.appleAlbumId);

        if (!albumTracks || albumTracks.length === 0) {
          setProgress(`[${i + 1}/${approvedAlbums.length}] No tracks found for: ${album.name || album.albumName}`);
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

        // Call approveAlbum with tracks (will update existing album)
        await approveAlbum({
          userId: user._id,
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
          tracks: tracks,
        });

        successCount++;
        setStats({ success: successCount, errors: errorCount, errorDetails: errors });

        // Small delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        errorCount++;
        const error = `${album.name || album.albumName}: ${err.message}`;
        errors.push(error);
        setStats({ success: successCount, errors: errorCount, errorDetails: errors });
        console.error('[Backfill Error]', error);
      }
    }

    setProgress('✅ Backfill complete!');
    setIsRunning(false);
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-bold text-yellow-900 mb-2">
        🔧 TEMPORARY BACKFILL TOOL
      </h3>
      <p className="text-sm text-yellow-800 mb-4">
        This will fetch and store track data for all existing approved albums.
        Remove this component after running.
      </p>

      <button
        onClick={handleBackfill}
        disabled={isRunning || !approvedAlbums}
        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
      >
        {isRunning ? 'Running...' : 'Backfill Album Tracks'}
      </button>

      {progress && (
        <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
          <p className="text-sm font-mono text-gray-700">{progress}</p>
        </div>
      )}

      {stats && (
        <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
          <p className="text-sm text-green-700">✓ Success: {stats.success}</p>
          <p className="text-sm text-red-700">✗ Errors: {stats.errors}</p>
          {stats.errorDetails.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm cursor-pointer">Error details</summary>
              <ul className="text-xs text-red-600 mt-1">
                {stats.errorDetails.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
