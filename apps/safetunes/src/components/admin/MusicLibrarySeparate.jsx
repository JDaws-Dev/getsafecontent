import { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import musicKitService from '../../config/musickit';
import AlbumDetailModal from './AlbumDetailModal';
import ContentReviewModal from './ContentReviewModal';
import AlbumOverviewModal from './AlbumOverviewModal';
import SafeTunesLogo from '../shared/SafeTunesLogo';
import PlaylistImport from './PlaylistImport';
import {
  KidSelector,
  DiscoverList,
  PlaylistsList,
} from './MusicTabAccordion';

// Helper to initialize MusicKit with timeout (prevents iOS blocking)
const initMusicKitWithTimeout = async (timeoutMs = 8000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('MusicKit init timeout')), timeoutMs)
  );

  try {
    await Promise.race([
      musicKitService.initialize(),
      timeoutPromise
    ]);
    return true;
  } catch (err) {
    console.warn('MusicKit initialization issue:', err.message);
    // Try to continue anyway - MusicKit might still work
    return musicKitService.music !== null;
  }
};

// Album Modal Component - Shows all tracks with checkboxes and preview
function AlbumModal({ isOpen, onClose, album, userId, selectedKidId, selectedKid, kidProfiles, onReviewSong }) {
  const [tracks, setTracks] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [hideArtwork, setHideArtwork] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [playingTrackMeta, setPlayingTrackMeta] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  // Mutations
  const toggleSongForKid = useMutation(api.songs.toggleSongForKid);
  const toggleAlbumArtworkEverywhere = useMutation(api.albums.toggleAlbumArtworkEverywhere);
  const bulkAssignSongsToKid = useMutation(api.songs.bulkAssignSongsToKid);

  // Get song access by kid
  const songAccessByKid = useQuery(api.songs.getSongAccessByKid,
    userId ? { userId } : 'skip'
  ) || {};

  // Helper functions
  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  const kidHasAccessToSong = (appleSongId, kidProfileId) => {
    const kidsWithAccess = songAccessByKid[appleSongId] || [];
    return kidsWithAccess.includes(kidProfileId);
  };

  // Initialize hideArtwork from album data
  useEffect(() => {
    if (album) {
      setHideArtwork(album.hideArtwork || false);
    }
  }, [album]);

  // Helper to normalize artist names for comparison (strip "The", "A", "An" prefixes, lowercase)
  const normalizeArtist = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/^(the|a|an)\s+/i, '').trim();
  };

  // Fetch tracks when modal opens
  // Try to fetch ALL tracks from Apple Music so parents can check/uncheck all songs
  useEffect(() => {
    const fetchTracks = async () => {
      if (!isOpen || !album) return;


      setIsLoadingTracks(true);
      setTracks([]);
      setPlayingTrackId(null);
      setPlayingTrackMeta(null);

      try {
        await initMusicKitWithTimeout();
        let albumTracks = null;

        // Method 1: Use appleAlbumId if available (most reliable)
        if (album.appleAlbumId) {
          albumTracks = await musicKitService.getAlbumTracks(album.appleAlbumId);
        }

        // Method 2: If no appleAlbumId or fetch failed, search by album name WITH artist verification
        if (!albumTracks || albumTracks.length === 0) {
          const searchResults = await musicKitService.searchAlbums(album.albumName);

          if (searchResults && searchResults.length > 0) {
            // Find the album that matches the artist name (to prevent Cars/Rascal Flatts bug)
            const normalizedExpectedArtist = normalizeArtist(album.artistName);

            const matchingAlbum = searchResults.find(result => {
              const resultArtist = normalizeArtist(result.attributes?.artistName || '');
              const albumNameMatches = (result.attributes?.name || '').toLowerCase().trim() === album.albumName.toLowerCase().trim();
              const artistMatches = resultArtist === normalizedExpectedArtist ||
                                   resultArtist.includes(normalizedExpectedArtist) ||
                                   normalizedExpectedArtist.includes(resultArtist);
              return albumNameMatches && artistMatches;
            });

            if (matchingAlbum) {
              const matchingAlbumId = matchingAlbum.id;
              albumTracks = await musicKitService.getAlbumTracks(matchingAlbumId);
            }
          }
        }

        // If we got tracks from Apple Music, format them
        if (albumTracks && albumTracks.length > 0) {
          const formattedTracks = albumTracks.map((track, index) => {
            const appleSongId = track.id || track.attributes?.playParams?.id;
            const isApproved = album.approvedSongs?.some(s => s.appleSongId === appleSongId);

            return {
              appleSongId,
              songName: track.attributes?.name || 'Unknown Track',
              artistName: track.attributes?.artistName || album.artistName,
              trackNumber: track.attributes?.trackNumber || index + 1,
              durationInMillis: track.attributes?.durationInMillis || 0,
              isExplicit: track.attributes?.contentRating === 'explicit',
              artworkUrl: track.attributes?.artwork?.url || album.artworkUrl,
              isApproved,
            };
          });

          // Sort by track number
          formattedTracks.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
          setTracks(formattedTracks);
          setIsLoadingTracks(false);
          return;
        }

        // Fallback: show only approved songs if Apple Music fetch failed completely
        if (album.approvedSongs && album.approvedSongs.length > 0) {
          const formattedTracks = album.approvedSongs.map((song, index) => ({
            appleSongId: song.appleSongId,
            songName: song.songName || 'Unknown Track',
            artistName: song.artistName || album.artistName,
            trackNumber: song.trackNumber || index + 1,
            durationInMillis: song.durationInMillis || 0,
            isExplicit: song.isExplicit || false,
            artworkUrl: song.artworkUrl || album.artworkUrl,
            isApproved: true,
          }));
          formattedTracks.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
          setTracks(formattedTracks);
        }
      } catch (error) {
        console.error('Failed to fetch tracks:', error);
        // Fallback to approved songs on error
        if (album.approvedSongs && album.approvedSongs.length > 0) {
          const formattedTracks = album.approvedSongs.map((song, index) => ({
            appleSongId: song.appleSongId,
            songName: song.songName || 'Unknown Track',
            artistName: song.artistName || album.artistName,
            trackNumber: song.trackNumber || index + 1,
            durationInMillis: song.durationInMillis || 0,
            isExplicit: song.isExplicit || false,
            artworkUrl: song.artworkUrl || album.artworkUrl,
            isApproved: true,
          }));
          formattedTracks.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
          setTracks(formattedTracks);
        }
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchTracks();
  }, [isOpen, album]);

  // Track playback time for preview player
  useEffect(() => {
    if (!playingTrackId) return;

    const handleTimeUpdate = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setPreviewCurrentTime(state.currentPlaybackTime || 0);
        setPreviewDuration(state.currentPlaybackDuration || 0);
      }
    };

    musicKitService.addEventListener('playbackTimeDidChange', handleTimeUpdate);
    handleTimeUpdate();

    return () => {
      musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
    };
  }, [playingTrackId]);

  // Format duration
  const formatDuration = (millis) => {
    if (!millis) return '';
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Play preview handler - matches AddMusic implementation
  const handlePlayPreview = async (track) => {
    if (!track?.appleSongId) return;

    // If same song, toggle pause
    if (playingTrackId === track.appleSongId) {
      const state = musicKitService.getPlaybackState();
      if (state?.isPlaying) {
        musicKitService.pause();
      } else {
        musicKitService.play();
      }
      return;
    }

    // Play new song
    try {
      setPlayingTrackId(track.appleSongId);
      setPlayingTrackMeta({
        songName: track.songName,
        artistName: track.artistName,
        artworkUrl: track.artworkUrl,
      });
      setPreviewCurrentTime(0);
      setPreviewDuration(0);

      await musicKitService.playSong(track.appleSongId);
    } catch (error) {
      console.error('Failed to play preview:', error);
      setPlayingTrackId(null);
      setPlayingTrackMeta(null);
    }
  };

  // Seek handler for preview
  const handlePreviewSeek = (e) => {
    if (!previewDuration) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * previewDuration;
    musicKitService.seekToTime(newTime);
  };

  // Format preview time
  const formatPreviewTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Stop preview
  const handleStopPreview = async () => {
    await musicKitService.stop();
    setPlayingTrackId(null);
    setPlayingTrackMeta(null);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
  };

  // Toggle artwork - works even without appleAlbumId by using album name
  const handleToggleArtwork = async () => {
    const newValue = !hideArtwork;
    // Optimistic update
    setHideArtwork(newValue);

    try {
      if (album.appleAlbumId) {
        await toggleAlbumArtworkEverywhere({
          userId,
          appleAlbumId: album.appleAlbumId,
          hideArtwork: newValue,
        });
      }
    } catch (error) {
      console.error('Failed to toggle artwork:', error);
      setHideArtwork(!newValue); // Revert on error
    }
  };

  // Toggle song approval
  const handleToggleSong = async (track) => {
    if (!selectedKidId) return;

    // Check if kid already has access
    const kidHasAccess = kidHasAccessToSong(track.appleSongId, selectedKidId);

    if (kidHasAccess) {
      // Kid has access, toggle it off
      try {
        await toggleSongForKid({
          userId,
          kidProfileId: selectedKidId,
          appleSongId: track.appleSongId,
          songName: track.songName,
          artistName: track.artistName,
          albumName: album.albumName,
          artworkUrl: track.artworkUrl,
          durationInMillis: track.durationInMillis,
        });
      } catch (error) {
        console.error('Failed to toggle song access:', error);
      }
    } else {
      // Kid doesn't have access, add it via toggleSongForKid (which creates if needed)
      try {
        await toggleSongForKid({
          userId,
          kidProfileId: selectedKidId,
          appleSongId: track.appleSongId,
          songName: track.songName,
          artistName: track.artistName,
          albumName: album.albumName,
          artworkUrl: track.artworkUrl,
          durationInMillis: track.durationInMillis,
          isExplicit: track.isExplicit,
          appleAlbumId: album.appleAlbumId,
          trackNumber: track.trackNumber,
        });
        // Update local track state to show as approved
        setTracks(prev => prev.map(t =>
          t.appleSongId === track.appleSongId ? { ...t, isApproved: true } : t
        ));
      } catch (error) {
        console.error('Failed to toggle song access:', error);
      }
    }
  };

  // Select all tracks for selected kid
  const handleSelectAll = async () => {
    if (!selectedKidId) return;

    const tracksToApprove = tracks.filter(t => !kidHasAccessToSong(t.appleSongId, selectedKidId));
    if (tracksToApprove.length === 0) return;

    try {
      // Bulk assign all tracks to kid (bulkAssignSongsToKid handles creation with kidProfileId)
      const songs = tracksToApprove.map(t => ({
        appleSongId: t.appleSongId,
        songName: t.songName,
        artistName: t.artistName,
        albumName: album.albumName,
        artworkUrl: t.artworkUrl,
        durationInMillis: t.durationInMillis,
        isExplicit: t.isExplicit,
        appleAlbumId: album.appleAlbumId,
        trackNumber: t.trackNumber,
      }));

      await bulkAssignSongsToKid({
        userId,
        kidProfileId: selectedKidId,
        songs,
      });

      // Update local state
      setTracks(prev => prev.map(t => ({ ...t, isApproved: true })));
    } catch (error) {
      console.error('Failed to select all:', error);
    }
  };

  // Deselect all tracks for selected kid
  const handleDeselectAll = async () => {
    if (!selectedKidId) return;

    const tracksToRemove = tracks.filter(t => kidHasAccessToSong(t.appleSongId, selectedKidId));
    if (tracksToRemove.length === 0) return;

    try {
      for (const track of tracksToRemove) {
        await toggleSongForKid({
          userId,
          kidProfileId: selectedKidId,
          appleSongId: track.appleSongId,
          songName: track.songName,
          artistName: track.artistName,
          albumName: album.albumName,
          artworkUrl: track.artworkUrl,
          durationInMillis: track.durationInMillis,
        });
      }
    } catch (error) {
      console.error('Failed to deselect all:', error);
    }
  };

  // Seek in preview
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const seekTime = percent * previewDuration;
    musicKitService.seekToTime(seekTime);
  };

  if (!isOpen || !album) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-hidden" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-2 bg-white">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          {/* Album Artwork - Clickable to toggle */}
          <button
            onClick={handleToggleArtwork}
            className="flex-shrink-0 group relative"
            title={hideArtwork ? 'Click to show artwork' : 'Click to hide artwork'}
          >
            {hideArtwork ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl shadow-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            ) : album.artworkUrl ? (
              <img
                src={album.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
                alt={album.albumName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shadow-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl shadow-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
            {/* Eye icon overlay on hover */}
            <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {hideArtwork ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                )}
              </svg>
            </div>
          </button>

          {/* Album Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{album.albumName}</h2>
            <p className="text-sm text-gray-600 truncate">{album.artistName}</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-gray-500">{tracks.length} tracks</p>
              {/* Hide Artwork Toggle Button */}
              <button
                onClick={handleToggleArtwork}
                className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition ${
                  hideArtwork
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {hideArtwork ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  )}
                </svg>
                {hideArtwork ? 'Artwork Hidden' : 'Hide Artwork'}
              </button>
            </div>
            {selectedKid && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Managing for:</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getColorClass(selectedKid.color)} text-white`}>
                  {selectedKid.name}
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition flex-shrink-0"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedKid && (
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {tracks.filter(t => kidHasAccessToSong(t.appleSongId, selectedKidId)).length} of {tracks.length} tracks approved
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Track List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingTracks ? (
            <div className="p-12 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500">Loading tracks...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No tracks found for this album</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tracks.map((track, index) => {
                const isPlaying = playingTrackId === track.appleSongId;
                const hasAccess = selectedKidId && kidHasAccessToSong(track.appleSongId, selectedKidId);

                return (
                  <div
                    key={track.appleSongId}
                    className={`flex items-center gap-3 p-3 sm:p-4 transition-colors ${
                      hasAccess ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Track Number */}
                    <span className="w-6 text-sm text-gray-400 text-right flex-shrink-0">
                      {track.trackNumber || index + 1}
                    </span>

                    {/* Clickable Artwork */}
                    <button
                      onClick={() => handlePlayPreview(track)}
                      className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden relative group"
                      title={isPlaying ? 'Pause' : 'Play preview'}
                    >
                      {track.artworkUrl ? (
                        <img
                          src={track.artworkUrl.replace('{w}', '80').replace('{h}', '80')}
                          alt={track.songName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}
                      {/* Play/Pause overlay */}
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                        isPlaying ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'
                      }`}>
                        {isPlaying ? (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* Checkbox */}
                    {selectedKidId && (
                      <button
                        onClick={() => handleToggleSong(track)}
                        className={`w-6 h-6 flex-shrink-0 rounded border-2 flex items-center justify-center transition ${
                          hasAccess
                            ? `${getColorClass(selectedKid?.color)} border-transparent`
                            : 'border-gray-300 hover:border-purple-400 bg-white'
                        }`}
                        title={hasAccess ? 'Approved - click to remove' : 'Click to approve'}
                      >
                        {hasAccess && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{track.songName}</p>
                        {track.isExplicit && (
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-bold flex-shrink-0">E</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{track.artistName}</p>
                    </div>

                    {/* Duration */}
                    {track.durationInMillis && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDuration(track.durationInMillis)}
                      </span>
                    )}

                    {/* AI Lyrics Review Button */}
                    <button
                      onClick={() => onReviewSong?.(track)}
                      className="p-2 rounded-full bg-gray-100 text-purple-600 hover:bg-purple-100 transition flex-shrink-0"
                      title="AI Lyrics Review"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Song Preview Popup - Matches AddMusic style */}
        {playingTrackId && playingTrackMeta && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
            onClick={handleStopPreview}
          >
            <div
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-5 mx-4 max-w-xs w-full animate-scale-in"
              onClick={e => e.stopPropagation()}
            >
              {/* Track Info */}
              <div className="flex items-center gap-3 mb-4">
                {playingTrackMeta.artworkUrl && !hideArtwork ? (
                  <img
                    src={playingTrackMeta.artworkUrl.replace('{w}', '100').replace('{h}', '100')}
                    alt={playingTrackMeta.songName}
                    className="w-14 h-14 rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{playingTrackMeta.songName}</p>
                  <p className="text-sm text-gray-400 truncate">{playingTrackMeta.artistName}</p>
                </div>
              </div>

              {/* Seekable Progress Bar */}
              {previewDuration > 0 && (
                <div className="mb-4">
                  <div
                    className="h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${(previewCurrentTime / previewDuration) * 100}%` }}
                    />
                    {/* Scrubber thumb */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `calc(${(previewCurrentTime / previewDuration) * 100}% - 7px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                    <span>{formatPreviewTime(previewCurrentTime)}</span>
                    <span>{formatPreviewTime(previewDuration)}</span>
                  </div>
                </div>
              )}

              {/* Done Button */}
              <button
                onClick={handleStopPreview}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal for editing/viewing existing Discover album
function EditDiscoverAlbumModal({ isOpen, onClose, albumId, userId, onRemove, kidProfiles = [] }) {
  const [hideArtwork, setHideArtwork] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [selectedKids, setSelectedKids] = useState([]); // Empty = all kids
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  // Preview player state
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [playingTrackMeta, setPlayingTrackMeta] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  // Fetch album data with tracks
  const albumData = useQuery(
    api.albums.getAlbumWithTracks,
    isOpen && albumId && userId ? { userId, appleAlbumId: albumId } : 'skip'
  );

  const toggleAlbumArtworkEverywhere = useMutation(api.albums.toggleAlbumArtworkEverywhere);
  const setAlbumDiscoverable = useMutation(api.featured.setAlbumDiscoverable);
  const storeAlbumTracks = useMutation(api.albums.storeAlbumTracks);

  // Auto-fetch tracks if none stored
  useEffect(() => {
    const fetchTracks = async () => {
      if (!isOpen || !albumData || albumData.tracks?.length > 0 || isLoadingTracks || !albumId) {
        return;
      }

      setIsLoadingTracks(true);
      try {
        await initMusicKitWithTimeout();
        const albumTracks = await musicKitService.getAlbumTracks(albumId);

        if (albumTracks && albumTracks.length > 0) {
          const formattedTracks = albumTracks.map((track, index) => ({
            appleSongId: track.id || track.attributes?.playParams?.id,
            songName: track.attributes?.name || 'Unknown Track',
            artistName: track.attributes?.artistName || albumData.album?.artistName || 'Unknown Artist',
            trackNumber: track.attributes?.trackNumber || index + 1,
            durationInMillis: track.attributes?.durationInMillis || 0,
            isExplicit: track.attributes?.contentRating === 'explicit',
          }));

          await storeAlbumTracks({
            userId,
            appleAlbumId: albumId,
            tracks: formattedTracks,
          });
        }
      } catch (error) {
        console.error('Failed to fetch tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchTracks();
  }, [isOpen, albumData, albumId, userId, isLoadingTracks, storeAlbumTracks]);

  // Initialize hideArtwork and selectedKids from album data
  useEffect(() => {
    if (albumData?.album) {
      setHideArtwork(albumData.album.hideArtwork || false);
      // Initialize kid selection from stored data (empty array = all kids)
      setSelectedKids(albumData.album.featuredForKids || []);
    }
  }, [albumData?.album]);

  // Format duration
  const formatDuration = (millis) => {
    if (!millis) return '';
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format seconds for preview player
  const formatSeconds = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Preview playback time tracking
  useEffect(() => {
    if (!playingTrackId) return;
    const handleTimeUpdate = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setPreviewCurrentTime(state.currentPlaybackTime || 0);
        setPreviewDuration(state.currentPlaybackDuration || 0);
      }
    };
    musicKitService.addEventListener('playbackTimeDidChange', handleTimeUpdate);
    return () => musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
  }, [playingTrackId]);

  // Stop preview when modal closes
  useEffect(() => {
    if (!isOpen && playingTrackId) {
      musicKitService.stop();
      setPlayingTrackId(null);
      setPlayingTrackMeta(null);
    }
  }, [isOpen, playingTrackId]);

  // Handle preview track
  const handlePreviewTrack = async (track) => {
    if (playingTrackId === track.appleSongId) {
      // Stop current track
      musicKitService.stop();
      setPlayingTrackId(null);
      setPlayingTrackMeta(null);
    } else {
      // Play new track
      try {
        setPlayingTrackId(track.appleSongId);
        setPlayingTrackMeta({
          name: track.songName,
          artist: track.artistName,
          artwork: albumData?.album?.artworkUrl,
        });
        await musicKitService.playSong(track.appleSongId);
      } catch (error) {
        console.error('Preview failed:', error);
        setPlayingTrackId(null);
        setPlayingTrackMeta(null);
      }
    }
  };

  // Stop preview and close popup
  const handleStopPreview = () => {
    musicKitService.stop();
    setPlayingTrackId(null);
    setPlayingTrackMeta(null);
  };

  // Seek in preview
  const handlePreviewSeek = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * previewDuration;
    try {
      await musicKitService.seekToTime(newTime);
    } catch (error) {
      console.error('Seek failed:', error);
    }
  };

  // Handle toggle artwork
  const handleToggleArtwork = async () => {
    try {
      await toggleAlbumArtworkEverywhere({
        userId,
        appleAlbumId: albumId,
        hideArtwork: !hideArtwork,
      });
      setHideArtwork(!hideArtwork);
    } catch (error) {
      console.error('Failed to toggle artwork:', error);
    }
  };

  // Handle remove from Discover
  const handleRemove = () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemove = async () => {
    try {
      await setAlbumDiscoverable({
        userId,
        appleAlbumId: albumId,
        discoverable: false,
      });
      onRemove?.();
      onClose();
    } catch (error) {
      console.error('Failed to remove from Discover:', error);
    }
    setShowRemoveConfirm(false);
  };

  if (!isOpen || !albumData) return null;

  const { album, tracks } = albumData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4 overflow-hidden" onClick={onClose}>
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl sm:max-w-2xl w-full h-[85vh] sm:h-auto sm:max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 border-b border-gray-200">
          {/* Album Artwork */}
          <div className="flex-shrink-0">
            {hideArtwork ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg shadow-md flex flex-col items-center justify-center">
                <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </div>
            ) : album?.artworkUrl ? (
              <img
                src={album.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
                alt={album.albumName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shadow-md object-cover"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg shadow-md flex items-center justify-center">
                <svg className="w-10 h-10 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">In Discover</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{album?.albumName}</h2>
            <p className="text-sm text-gray-600 truncate">{album?.artistName}</p>
            <p className="text-xs text-gray-500 mt-1">{tracks.length} tracks</p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Album Tracks</h4>

          {isLoadingTracks ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-3 animate-spin text-pink-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm">Loading tracks...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No track information available</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tracks.map((track, index) => {
                const isTrackPlaying = playingTrackId === track.appleSongId;
                return (
                  <div
                    key={track.appleSongId}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 ${isTrackPlaying ? 'bg-purple-50' : ''}`}
                  >
                    {/* Play button or track number */}
                    <button
                      onClick={() => handlePreviewTrack(track)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isTrackPlaying
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                      }`}
                      title={isTrackPlaying ? 'Stop' : 'Preview'}
                    >
                      {isTrackPlaying ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                        {track.songName}
                        {track.isExplicit && (
                          <span className="px-1 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-bold flex-shrink-0">E</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{track.artistName}</div>
                    </div>
                    {track.durationInMillis && (
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {formatDuration(track.durationInMillis)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 pb-6 sm:pb-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleArtwork}
                className="p-2.5 sm:p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                title={hideArtwork ? 'Show artwork' : 'Hide artwork'}
              >
                {hideArtwork ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleRemove}
                className="p-2.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Remove from Discover"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Preview Player Popup */}
      {playingTrackId && playingTrackMeta && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
          onClick={handleStopPreview}
        >
          <div
            className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Track Info */}
            <div className="flex items-center gap-4 mb-6">
              {playingTrackMeta.artwork ? (
                <img
                  src={playingTrackMeta.artwork.replace('{w}', '120').replace('{h}', '120')}
                  alt={playingTrackMeta.name}
                  className="w-16 h-16 rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{playingTrackMeta.name}</p>
                <p className="text-gray-400 text-sm truncate">{playingTrackMeta.artist}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div
                className="h-2 bg-gray-700 rounded-full cursor-pointer group"
                onClick={handlePreviewSeek}
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full relative"
                  style={{ width: `${previewDuration > 0 ? (previewCurrentTime / previewDuration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatSeconds(previewCurrentTime)}</span>
                <span>{formatSeconds(previewDuration)}</span>
              </div>
            </div>

            {/* Done Button */}
            <button
              onClick={handleStopPreview}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setShowRemoveConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove from Discover</h3>
            <p className="text-gray-600 mb-6">Remove this album from Discover? Kids will no longer see it in their Discover tab.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
function MusicLibrarySeparate({ user }) {
  const [activeTab, setActiveTab] = useState('library');
  const [successMessage, setSuccessMessage] = useState('');
  // For album modal (used by Library tab - full editing with checkboxes)
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [selectedAlbumForModal, setSelectedAlbumForModal] = useState(null);
  // For Discover album modal (simplified - just view tracks and remove)
  const [discoverAlbumModalOpen, setDiscoverAlbumModalOpen] = useState(false);
  const [discoverAlbumId, setDiscoverAlbumId] = useState(null);
  // Expanded artists state (for collapsible artist rows)
  const [expandedArtists, setExpandedArtists] = useState(new Set());
  // Collapsible sections state (Artists list, Albums list, Songs list)
  const [artistsSectionExpanded, setArtistsSectionExpanded] = useState(true);
  const [albumsSectionExpanded, setAlbumsSectionExpanded] = useState(false);
  const [songsSectionExpanded, setSongsSectionExpanded] = useState(false);
  // Song playback state
  const [playingSongId, setPlayingSongId] = useState(null);
  const [playingSongMeta, setPlayingSongMeta] = useState(null);
  const [songPreviewTime, setSongPreviewTime] = useState(0);
  const [songPreviewDuration, setSongPreviewDuration] = useState(0);
  // Delete song confirmation
  const [deleteConfirmSong, setDeleteConfirmSong] = useState(null);
  // AI Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingContent, setReviewingContent] = useState(null);
  // Album Overview modal state
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [overviewAlbumData, setOverviewAlbumData] = useState(null);
  const [loadingTracks, setLoadingTracks] = useState({});
  // Playlist management state
  const [expandedPlaylistId, setExpandedPlaylistId] = useState(null);
  // Profile-based management: Parent selects ONE kid at a time
  const [selectedKidId, setSelectedKidId] = useState(null);
  // Optimistic state for album artwork toggles (keyed by appleAlbumId)
  const [localHideArtwork, setLocalHideArtwork] = useState({});
  // Delete confirmation modal state
  const [deleteConfirmAlbum, setDeleteConfirmAlbum] = useState(null);
  // Library search state
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  // Discover search state
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState('');
  // Playlist import modal state (for adding playlists to Discover)
  const [showPlaylistImport, setShowPlaylistImport] = useState(false);
  // Playlist detail view state (for kid playlists in Playlists tab)
  const [selectedPlaylistView, setSelectedPlaylistView] = useState(null);
  // Discover playlist detail view (for featured playlists in Discover tab)
  const [selectedDiscoverPlaylist, setSelectedDiscoverPlaylist] = useState(null);
  // Meatball menu state - tracks which song's menu is open
  const [openSongMenuId, setOpenSongMenuId] = useState(null);
  // Discover removal confirmation modal state
  const [discoverRemoveConfirm, setDiscoverRemoveConfirm] = useState(null); // { album, kidName }
  // Playlist removal confirmation modal state
  const [playlistRemoveConfirm, setPlaylistRemoveConfirm] = useState(null); // playlist object

  // Mutations for quick actions on album cards
  const toggleAlbumArtworkEverywhere = useMutation(api.albums.toggleAlbumArtworkEverywhere);
  const toggleAlbumArtworkByName = useMutation(api.albums.toggleAlbumArtworkByName);
  const removeAlbumForKid = useMutation(api.albums.removeAlbumForKid);
  const removeAlbumForKidByName = useMutation(api.albums.removeAlbumForKidByName);
  const toggleSongForKid = useMutation(api.songs.toggleSongForKid);
  const setAlbumDiscoverable = useMutation(api.featured.setAlbumDiscoverable);
  const removeAlbumFromDiscoverForKid = useMutation(api.featured.removeAlbumFromDiscoverForKid);
  const removeFeaturedPlaylist = useMutation(api.featuredPlaylists.removeFeaturedPlaylist);
  const removeTrackFromFeaturedPlaylist = useMutation(api.featuredPlaylists.removeTrackFromFeaturedPlaylist);
  // Playlist management mutations
  const deletePlaylist = useMutation(api.playlists.deletePlaylist);
  const updatePlaylist = useMutation(api.playlists.updatePlaylist);
  const removeSongFromPlaylist = useMutation(api.playlists.removeSongFromPlaylist);

  // Fetch data
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const approvedAlbums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const featuredAlbums = useQuery(api.featured.getFeaturedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const featuredPlaylists = useQuery(api.featuredPlaylists.getFeaturedPlaylistsForUser,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Fetch albums with songs (for hierarchical view)
  const albumsWithSongs = useQuery(api.albums.getAlbumsWithApprovedSongsForUser,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const playlists = useQuery(api.playlists.getPlaylists,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Fetch tracks for selected Discover playlist
  const discoverPlaylistTracks = useQuery(api.featuredPlaylists.getFeaturedPlaylistTracks,
    selectedDiscoverPlaylist ? { playlistId: selectedDiscoverPlaylist._id } : 'skip'
  ) || [];

  // Auto-select first kid when kidProfiles loads (for profile-based management)
  useEffect(() => {
    if (kidProfiles?.length > 0 && !selectedKidId) {
      setSelectedKidId(kidProfiles[0]._id);
    }
  }, [kidProfiles, selectedKidId]);

  // Get the currently selected kid object
  const selectedKid = kidProfiles?.find(k => k._id === selectedKidId);

  // Helper functions
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Helper to check if playlist artwork should be hidden (first song's album has hideArtwork)
  const shouldHidePlaylistArtwork = (playlist) => {
    if (!playlist?.songs || playlist.songs.length === 0) return false;
    const firstSong = playlist.songs[0];

    // First try to find by appleAlbumId (most accurate)
    if (firstSong.appleAlbumId) {
      const albumById = approvedAlbums?.find(a => a.appleAlbumId === firstSong.appleAlbumId);
      if (albumById?.hideArtwork) return true;

      const albumWithSongsById = albumsWithSongs?.find(a => a.appleAlbumId === firstSong.appleAlbumId);
      if (albumWithSongsById?.hideArtwork) return true;
    }

    // Fallback: check by album name
    if (firstSong.albumName) {
      const albumByName = approvedAlbums?.find(a => a.albumName === firstSong.albumName);
      if (albumByName?.hideArtwork) return true;

      const albumWithSongsByName = albumsWithSongs?.find(a => a.albumName === firstSong.albumName);
      if (albumWithSongsByName?.hideArtwork) return true;
    }

    return false;
  };

  // Consolidate duplicate albums by APPLE ALBUM ID (preferred) or ALBUM NAME
  // For soundtracks/compilations like "The Little Mermaid", songs have different artist names
  // but should still be grouped under the same album.
  // IMPORTANT: Filter songs by selectedKidId so we only show albums with songs for THIS kid
  const consolidatedAlbumsMap = new Map();
  albumsWithSongs.forEach(album => {
    // Filter songs to only include those for the selected kid
    const kidSongs = (album.approvedSongs || []).filter(song =>
      selectedKidId && String(song.kidProfileId) === String(selectedKidId)
    );

    // Skip this album if it has no songs for the selected kid
    if (kidSongs.length === 0) return;

    // ALWAYS use album name as the primary key for consolidation
    // This ensures soundtracks, compilations, and albums with multiple versions
    // are grouped together regardless of their appleAlbumId
    const key = `name:${album.albumName.toLowerCase().trim()}`;

    if (!consolidatedAlbumsMap.has(key)) {
      consolidatedAlbumsMap.set(key, {
        ...album,
        // Track all artist names associated with this album
        allArtists: [album.artistName],
        // Track all appleAlbumIds associated with this album
        allAppleAlbumIds: album.appleAlbumId ? [album.appleAlbumId] : [],
        approvedSongs: [...kidSongs],
      });
    } else {
      const existing = consolidatedAlbumsMap.get(key);
      // Add this artist to the list if not already there
      if (!existing.allArtists.includes(album.artistName)) {
        existing.allArtists.push(album.artistName);
      }
      // Track all appleAlbumIds for this album
      if (album.appleAlbumId && !existing.allAppleAlbumIds?.includes(album.appleAlbumId)) {
        existing.allAppleAlbumIds = existing.allAppleAlbumIds || [];
        existing.allAppleAlbumIds.push(album.appleAlbumId);
      }
      // Merge songs (avoiding duplicates)
      const existingSongIds = new Set(existing.approvedSongs.map(s => s.appleSongId));
      kidSongs.forEach(song => {
        if (!existingSongIds.has(song.appleSongId)) {
          existing.approvedSongs.push(song);
          existingSongIds.add(song.appleSongId);
        }
      });
      // Keep appleAlbumId if we find one
      if (!existing.appleAlbumId && album.appleAlbumId) {
        existing.appleAlbumId = album.appleAlbumId;
      }
      // Keep the better artwork (prefer non-null)
      if (!existing.artworkUrl && album.artworkUrl) {
        existing.artworkUrl = album.artworkUrl;
      }
    }
  });
  // Sort albums alphabetically by album name
  const consolidatedAlbums = Array.from(consolidatedAlbumsMap.values())
    .sort((a, b) => a.albumName.localeCompare(b.albumName));

  // Build artist hierarchy - use the FIRST artist name for each album (primary artist)
  // This prevents duplicate entries like "Alan Menken" AND "Alan Menken & Howard Ashman"
  const artistsMap = new Map();
  consolidatedAlbums.forEach(album => {
    // Extract the primary artist (first name before any &, comma, or "feat")
    const primaryArtist = album.artistName
      .split(/[&,]|feat\.?/i)[0]
      .trim();

    if (!artistsMap.has(primaryArtist)) {
      artistsMap.set(primaryArtist, []);
    }
    // Only add if album not already there
    const existingAlbumNames = artistsMap.get(primaryArtist).map(a => a.albumName.toLowerCase());
    if (!existingAlbumNames.includes(album.albumName.toLowerCase())) {
      artistsMap.get(primaryArtist).push(album);
    }
  });
  const artists = Array.from(artistsMap.entries())
    .map(([name, albums]) => ({ name, albums, count: albums.length }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter artists/albums based on search query
  const searchLower = librarySearchQuery.toLowerCase().trim();
  const filteredArtists = searchLower
    ? artists.map(artist => {
        // Check if artist name matches
        const artistMatches = artist.name.toLowerCase().includes(searchLower);
        // Filter albums that match (by album name or song names)
        const matchingAlbums = artist.albums.filter(album => {
          const albumMatches = album.albumName.toLowerCase().includes(searchLower);
          const songMatches = album.approvedSongs?.some(song =>
            song.songName?.toLowerCase().includes(searchLower)
          );
          return albumMatches || songMatches;
        });
        // Include artist if name matches OR has matching albums
        if (artistMatches) {
          return artist; // Show all albums for matching artist
        } else if (matchingAlbums.length > 0) {
          return { ...artist, albums: matchingAlbums, count: matchingAlbums.length };
        }
        return null;
      }).filter(Boolean)
    : artists;

  // Also filter consolidated albums for the Albums section
  const filteredAlbums = searchLower
    ? consolidatedAlbums.filter(album => {
        const albumMatches = album.albumName.toLowerCase().includes(searchLower);
        const artistMatches = album.artistName.toLowerCase().includes(searchLower);
        const songMatches = album.approvedSongs?.some(song =>
          song.songName?.toLowerCase().includes(searchLower)
        );
        return albumMatches || artistMatches || songMatches;
      })
    : consolidatedAlbums;

  // Build flat list of all songs for the selected kid, sorted alphabetically
  const allSongsForKid = consolidatedAlbums.flatMap(album =>
    (album.approvedSongs || []).map(song => ({
      ...song,
      albumName: album.albumName,
      artistName: song.artistName || album.artistName,
      artworkUrl: song.artworkUrl || album.artworkUrl,
      hideArtwork: album.hideArtwork,
    }))
  ).sort((a, b) => (a.songName || '').localeCompare(b.songName || ''));

  // Filter songs based on search query
  const filteredSongs = searchLower
    ? allSongsForKid.filter(song => {
        const songMatches = song.songName?.toLowerCase().includes(searchLower);
        const artistMatches = song.artistName?.toLowerCase().includes(searchLower);
        const albumMatches = song.albumName?.toLowerCase().includes(searchLower);
        return songMatches || artistMatches || albumMatches;
      })
    : allSongsForKid;

  // Consolidate featured albums (same logic as library albums)
  // This removes duplicates that might exist in the database
  console.log('[Discover] featuredAlbums from query:', featuredAlbums?.length, 'albums');
  const consolidatedFeaturedMap = new Map();
  featuredAlbums.forEach(album => {
    const primaryArtist = (album.artistName || '').split(/[&,]|feat\.?/i)[0].trim().toLowerCase();
    const key = album.appleAlbumId
      ? `id:${album.appleAlbumId}`
      : `name:${(album.albumName || '').toLowerCase().trim()}:${primaryArtist}`;

    if (!consolidatedFeaturedMap.has(key)) {
      consolidatedFeaturedMap.set(key, album);
    } else {
      // Keep the one with better data (prefer non-null artwork, etc.)
      const existing = consolidatedFeaturedMap.get(key);
      if (!existing.artworkUrl && album.artworkUrl) {
        consolidatedFeaturedMap.set(key, { ...existing, artworkUrl: album.artworkUrl });
      }
    }
  });
  const consolidatedFeaturedAlbums = Array.from(consolidatedFeaturedMap.values())
    .sort((a, b) => (a.albumName || '').localeCompare(b.albumName || ''));
  console.log('[Discover] consolidatedFeaturedAlbums:', consolidatedFeaturedAlbums?.length, 'albums');

  // Filter featured albums by selected kid's access
  // If featuredForKids is empty/null, album is available to all kids
  // Otherwise, only show if selected kid is in the featuredForKids array
  const kidFilteredFeaturedAlbums = selectedKidId
    ? consolidatedFeaturedAlbums.filter(album => {
        if (!album.featuredForKids || album.featuredForKids.length === 0) {
          return true; // Available to all kids
        }
        return album.featuredForKids.includes(selectedKidId);
      })
    : consolidatedFeaturedAlbums;
  console.log('[Discover] kidFilteredFeaturedAlbums for kid', selectedKidId, ':', kidFilteredFeaturedAlbums?.length, 'albums');
  console.log('[Discover] Album IDs in Discover:', kidFilteredFeaturedAlbums?.map(a => a.appleAlbumId).join(', '));

  // Filter featured albums based on discover search query
  const discoverSearchLower = discoverSearchQuery.toLowerCase().trim();
  const filteredFeaturedAlbums = discoverSearchLower
    ? kidFilteredFeaturedAlbums.filter(album => {
        const albumMatches = (album.albumName || '').toLowerCase().includes(discoverSearchLower);
        const artistMatches = (album.artistName || '').toLowerCase().includes(discoverSearchLower);
        return albumMatches || artistMatches;
      })
    : kidFilteredFeaturedAlbums;

  // Filter featured playlists by selected kid's access (same logic as albums)
  const kidFilteredFeaturedPlaylists = selectedKidId
    ? featuredPlaylists.filter(playlist => {
        if (!playlist.featuredForKids || playlist.featuredForKids.length === 0) {
          return true; // Available to all kids
        }
        return playlist.featuredForKids.includes(selectedKidId);
      })
    : featuredPlaylists;

  // Filter featured playlists based on discover search query
  const filteredFeaturedPlaylists = discoverSearchLower
    ? kidFilteredFeaturedPlaylists.filter(playlist => {
        const nameMatches = (playlist.playlistName || '').toLowerCase().includes(discoverSearchLower);
        const curatorMatches = (playlist.curatorName || '').toLowerCase().includes(discoverSearchLower);
        return nameMatches || curatorMatches;
      })
    : kidFilteredFeaturedPlaylists;

  // Build artist hierarchy for Discover view (uses kid-filtered albums)
  const discoverArtistsMap = new Map();
  kidFilteredFeaturedAlbums.forEach(album => {
    if (!discoverArtistsMap.has(album.artistName)) {
      discoverArtistsMap.set(album.artistName, []);
    }
    discoverArtistsMap.get(album.artistName).push(album);
  });
  const discoverArtists = Array.from(discoverArtistsMap.entries())
    .map(([name, albums]) => ({ name, albums, count: albums.length }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Success message helper
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Toggle artist expansion
  const toggleArtist = (artistName) => {
    setExpandedArtists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artistName)) {
        newSet.delete(artistName);
      } else {
        newSet.add(artistName);
      }
      return newSet;
    });
  };

  // Open album modal
  const handleOpenAlbumModal = (album) => {
    setSelectedAlbumForModal(album);
    setAlbumModalOpen(true);
  };

  // Open song review modal
  const handleReviewSong = (song) => {
    setReviewingContent({
      type: 'song',
      appleSongId: song.appleSongId,
      songName: song.songName,
      artistName: song.artistName,
    });
    setReviewModalOpen(true);
  };

  // Quick hide artwork toggle (from album card)
  const handleQuickToggleArtwork = async (e, album) => {
    e.stopPropagation(); // Prevent opening the album modal
    const albumId = album.appleAlbumId || `${album.albumName}-${album.artistName}`;
    const currentHidden = localHideArtwork[albumId] ?? album.hideArtwork ?? false;
    const newValue = !currentHidden;

    // Optimistic update
    setLocalHideArtwork(prev => ({ ...prev, [albumId]: newValue }));

    try {
      if (album.appleAlbumId) {
        // Use appleAlbumId if available
        await toggleAlbumArtworkEverywhere({
          userId: user._id,
          appleAlbumId: album.appleAlbumId,
          hideArtwork: newValue,
        });
      } else if (album.albumName) {
        // Fall back to album name
        await toggleAlbumArtworkByName({
          userId: user._id,
          albumName: album.albumName,
          hideArtwork: newValue,
        });
      }
      showSuccess(newValue ? 'Artwork hidden' : 'Artwork visible');
    } catch (err) {
      console.error('Failed to toggle artwork:', err);
      // Revert on error
      setLocalHideArtwork(prev => ({ ...prev, [albumId]: currentHidden }));
    }
  };

  // Quick delete album (from album card) - opens confirmation modal
  const handleQuickDeleteAlbum = (e, album) => {
    e.stopPropagation(); // Prevent opening the album modal
    setDeleteConfirmAlbum(album);
  };

  // Confirm delete album (called from modal) - removes for SELECTED KID only
  const confirmDeleteAlbum = async () => {
    if (!deleteConfirmAlbum || !selectedKidId) {
      console.error('Cannot delete: missing album or kid selection', { deleteConfirmAlbum, selectedKidId });
      return;
    }

    try {
      // Always try both methods - first by appleAlbumId, then by name
      if (deleteConfirmAlbum.appleAlbumId) {
        await removeAlbumForKid({
          userId: user._id,
          kidProfileId: selectedKidId,
          appleAlbumId: deleteConfirmAlbum.appleAlbumId,
        });
      }

      // Also try by name to catch any songs that might have different/missing appleAlbumId
      if (deleteConfirmAlbum.albumName) {
        await removeAlbumForKidByName({
          userId: user._id,
          kidProfileId: selectedKidId,
          albumName: deleteConfirmAlbum.albumName,
        });
      }

      showSuccess(`Removed "${deleteConfirmAlbum.albumName}" for ${selectedKid?.name || 'this kid'}`);
    } catch (err) {
      console.error('Failed to remove album:', err);
      showSuccess(`Failed to remove album: ${err.message}`);
    } finally {
      setDeleteConfirmAlbum(null);
    }
  };

  // Play a song preview
  const handlePlaySong = async (song) => {
    if (!song?.appleSongId) return;

    // If same song is playing, toggle pause/play
    if (playingSongId === song.appleSongId) {
      const state = musicKitService.getPlaybackState();
      if (state?.isPlaying) {
        musicKitService.pause();
      } else {
        musicKitService.play();
      }
      return;
    }

    try {
      setPlayingSongId(song.appleSongId);
      setPlayingSongMeta({
        songName: song.songName,
        artistName: song.artistName,
        artworkUrl: song.artworkUrl,
      });
      await musicKitService.playSong(song.appleSongId);
    } catch (error) {
      console.error('Failed to play song:', error);
      setPlayingSongId(null);
      setPlayingSongMeta(null);
    }
  };

  // Stop song playback
  const handleStopSong = () => {
    musicKitService.stop();
    setPlayingSongId(null);
    setPlayingSongMeta(null);
    setSongPreviewTime(0);
    setSongPreviewDuration(0);
  };

  // Seek handler for song preview (click on progress bar to jump)
  const handleSongSeek = (e) => {
    if (!songPreviewDuration) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * songPreviewDuration;
    musicKitService.seekToTime(newTime);
  };

  // Delete a single song for the selected kid
  const confirmDeleteSong = async () => {
    if (!deleteConfirmSong || !selectedKidId) {
      console.error('Cannot delete: missing song or kid selection');
      return;
    }

    try {
      await toggleSongForKid({
        userId: user._id,
        kidProfileId: selectedKidId,
        appleSongId: deleteConfirmSong.appleSongId,
        songName: deleteConfirmSong.songName,
        artistName: deleteConfirmSong.artistName,
        albumName: deleteConfirmSong.albumName,
        forceRemove: true,
      });
      showSuccess(`Removed "${deleteConfirmSong.songName}" for ${selectedKid?.name || 'this kid'}`);
    } catch (err) {
      console.error('Failed to remove song:', err);
    } finally {
      setDeleteConfirmSong(null);
    }
  };

  // Track playback time
  useEffect(() => {
    if (!playingSongId) return;

    const handleTimeUpdate = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setSongPreviewTime(state.currentPlaybackTime || 0);
        setSongPreviewDuration(state.currentPlaybackDuration || 0);
      }
    };

    musicKitService.addEventListener('playbackTimeDidChange', handleTimeUpdate);
    return () => {
      musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
    };
  }, [playingSongId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Manage Music</h2>
        <p className="text-gray-600 text-sm">View and manage your family's approved music library</p>
      </div>

      {/* Sticky Tab Navigation - Pill Segmented Control */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-0 z-40">

        {/* Tab Navigation - Pill Style */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-medium whitespace-nowrap transition-all rounded-lg ${
                activeTab === 'library'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Library
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-medium whitespace-nowrap transition-all rounded-lg ${
                activeTab === 'discover'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-medium whitespace-nowrap transition-all rounded-lg ${
                activeTab === 'playlists'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Playlists
            </button>
          </div>
        </div>
      </div>

      {/* Kid Selector - Always visible above tabs */}
      <KidSelector
        kidProfiles={kidProfiles}
        selectedKidId={selectedKidId}
        onSelectKid={setSelectedKidId}
      />

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-green-500 text-white rounded-full shadow-lg animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* LIBRARY TAB */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Library Explanation Banner */}
          <div className="bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-2xl">
            <p className="text-indigo-700 font-semibold text-sm">Library</p>
            <p className="text-gray-600 text-sm mt-0.5">
              Music {selectedKid ? `${selectedKid.name}` : "your kids"} specifically requested and you approved
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search artists, albums, or songs..."
              value={librarySearchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setLibrarySearchQuery(query);
                // Auto-expand all sections when searching
                if (query.trim()) {
                  setArtistsSectionExpanded(true);
                  setAlbumsSectionExpanded(true);
                  setSongsSectionExpanded(true);
                }
              }}
              className="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
            {librarySearchQuery && (
              <button
                onClick={() => setLibrarySearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results Summary */}
          {librarySearchQuery && (
            <div className="text-sm text-gray-600 px-1">
              Found {filteredArtists.length} artist{filteredArtists.length !== 1 ? 's' : ''}, {filteredAlbums.length} album{filteredAlbums.length !== 1 ? 's' : ''}, and {filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''} matching "{librarySearchQuery}"
            </div>
          )}

          {/* ARTISTS Section - Collapsible */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => setArtistsSectionExpanded(!artistsSectionExpanded)}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Artists</h2>
                  <p className="text-sm text-gray-600">{filteredArtists.length} artists{librarySearchQuery && ` (filtered)`}</p>
                </div>
              </div>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform ${artistsSectionExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {artistsSectionExpanded && (
              <>
                {filteredArtists.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="font-medium">{librarySearchQuery ? 'No matching artists' : 'No music in library yet'}</p>
                    <p className="text-sm mt-1">{librarySearchQuery ? 'Try a different search term' : 'Add albums to get started'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                {filteredArtists.map((artist) => {
                  const isExpanded = expandedArtists.has(artist.name);
                  const firstAlbum = artist.albums[0];

                  return (
                    <div key={artist.name}>
                      {/* Artist Row - Collapsible */}
                      <button
                        onClick={() => toggleArtist(artist.name)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-purple-50 transition-colors group"
                      >
                        {/* Artist Avatar */}
                        <div className="flex-shrink-0">
                          {firstAlbum?.artworkUrl ? (
                            <img
                              src={firstAlbum.artworkUrl.replace('{w}', '80').replace('{h}', '80')}
                              alt={artist.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-md">
                              <span className="text-white font-bold text-lg">
                                {artist.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Artist Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-gray-900 truncate">{artist.name}</p>
                          <p className="text-sm text-gray-500">
                            {artist.count} {artist.count === 1 ? 'album' : 'albums'}
                          </p>
                        </div>

                        {/* Chevron */}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Albums List (when expanded) */}
                      {isExpanded && (
                        <div className="bg-gray-50 px-4 pb-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                            {artist.albums.map((album) => {
                              const albumKey = album.appleAlbumId || `${album.albumName}-${album.artistName}`;
                              const isHidden = localHideArtwork[albumKey] ?? album.hideArtwork ?? false;

                              return (
                                <div
                                  key={albumKey}
                                  className="group relative bg-white rounded-xl p-3 hover:shadow-lg transition-all cursor-pointer"
                                  onClick={() => handleOpenAlbumModal(album)}
                                >
                                  {/* Album Artwork */}
                                  <div className="relative mb-2">
                                    {isHidden ? (
                                      <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md">
                                        <SafeTunesLogo className="w-12 h-12 text-white/70" />
                                      </div>
                                    ) : album.artworkUrl ? (
                                      <img
                                        src={album.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
                                        alt={album.albumName}
                                        className="w-full aspect-square rounded-lg object-cover shadow-md"
                                      />
                                    ) : (
                                      <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-md">
                                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                        </svg>
                                      </div>
                                    )}

                                    {/* Quick Action Buttons (always visible for touch devices) */}
                                    <div className="absolute top-1 right-1 flex gap-1">
                                      {/* Hide Artwork Button */}
                                      <button
                                        onClick={(e) => handleQuickToggleArtwork(e, album)}
                                        className={`p-1.5 rounded-full shadow-md transition ${
                                          isHidden
                                            ? 'bg-green-500 text-white'
                                            : 'bg-white/90 text-gray-600'
                                        }`}
                                        title={isHidden ? 'Show artwork' : 'Hide artwork'}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          {isHidden ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                          )}
                                        </svg>
                                      </button>
                                      {/* Delete Album Button */}
                                      <button
                                        onClick={(e) => handleQuickDeleteAlbum(e, album)}
                                        className="p-1.5 rounded-full bg-white/90 text-red-500 shadow-md transition"
                                        title="Remove album"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  {/* Album Info */}
                                  <p className="font-medium text-sm text-gray-900 truncate">{album.albumName}</p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {album.approvedSongs?.length || 0} songs
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ALBUMS Section - Collapsible */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => setAlbumsSectionExpanded(!albumsSectionExpanded)}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-pink-50 to-orange-50 hover:from-pink-100 hover:to-orange-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Albums</h2>
                  <p className="text-sm text-gray-600">{filteredAlbums.length} albums{librarySearchQuery && ` (filtered)`}</p>
                </div>
              </div>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform ${albumsSectionExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {albumsSectionExpanded && (
              <>
                {filteredAlbums.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                    <p className="font-medium">{librarySearchQuery ? 'No matching albums' : 'No albums in library yet'}</p>
                    <p className="text-sm mt-1">{librarySearchQuery ? 'Try a different search term' : 'Add albums to get started'}</p>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {filteredAlbums.map((album) => {
                      const albumKey = album.appleAlbumId || `${album.albumName}-${album.artistName}`;
                      const isHidden = localHideArtwork[albumKey] ?? album.hideArtwork ?? false;

                      return (
                        <div
                          key={albumKey}
                          className="group relative bg-gray-50 rounded-xl p-3 hover:shadow-lg hover:bg-white transition-all cursor-pointer"
                          onClick={() => handleOpenAlbumModal(album)}
                        >
                          {/* Album Artwork */}
                          <div className="relative mb-2">
                            {isHidden ? (
                              <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md">
                                <SafeTunesLogo className="w-12 h-12 text-white/70" />
                              </div>
                            ) : album.artworkUrl ? (
                              <img
                                src={album.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
                                alt={album.albumName}
                                className="w-full aspect-square rounded-lg object-cover shadow-md"
                              />
                            ) : (
                              <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-md">
                                <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                              </div>
                            )}

                            {/* Quick Action Buttons */}
                            <div className="absolute top-1 right-1 flex gap-1">
                              <button
                                onClick={(e) => handleQuickToggleArtwork(e, album)}
                                className={`p-1.5 rounded-full shadow-md transition ${
                                  isHidden
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white/90 text-gray-600'
                                }`}
                                title={isHidden ? 'Show artwork' : 'Hide artwork'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {isHidden ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  )}
                                </svg>
                              </button>
                              <button
                                onClick={(e) => handleQuickDeleteAlbum(e, album)}
                                className="p-1.5 rounded-full bg-white/90 text-red-500 shadow-md transition"
                                title="Remove album"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {/* Album Info */}
                          <p className="font-medium text-sm text-gray-900 truncate">{album.albumName}</p>
                          <p className="text-xs text-gray-500 truncate">{album.artistName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {album.approvedSongs?.length || 0} songs
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Songs Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => setSongsSectionExpanded(!songsSectionExpanded)}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Songs</h3>
                  <p className="text-sm text-gray-500">{filteredSongs.length} songs</p>
                </div>
              </div>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform ${songsSectionExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {songsSectionExpanded && (
              <>
                {filteredSongs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="font-medium">No songs found</p>
                    {librarySearchQuery && (
                      <p className="text-sm mt-1">Try a different search term</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    {filteredSongs.map((song, idx) => {
                      const isPlaying = playingSongId === song.appleSongId;
                      const artworkUrl = song.artworkUrl?.replace('{w}', '80').replace('{h}', '80');
                      const shouldHideArtwork = song.hideArtwork;

                      return (
                        <div
                          key={`${song.appleSongId}-${idx}`}
                          className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition ${isPlaying ? 'bg-purple-50' : ''}`}
                        >
                          {/* Artwork - clickable to play/pause */}
                          <button
                            onClick={() => handlePlaySong(song)}
                            className="relative flex-shrink-0 group"
                            title={isPlaying ? 'Pause' : 'Play preview'}
                          >
                            {shouldHideArtwork ? (
                              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                                <SafeTunesLogo className="w-6 h-6 text-white/70" />
                              </div>
                            ) : artworkUrl ? (
                              <img
                                src={artworkUrl}
                                alt={song.songName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                              </div>
                            )}
                            {/* Hover play overlay (when not playing) */}
                            {!isPlaying && (
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {/* Playing indicator */}
                            {isPlaying && (
                              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                                <div className="flex items-end gap-0.5 h-4">
                                  <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '60%' }}></div>
                                  <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }}></div>
                                  <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }}></div>
                                </div>
                              </div>
                            )}
                          </button>

                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{song.songName}</p>
                            <p className="text-sm text-gray-500 truncate">{song.artistName}</p>
                            <p className="text-xs text-gray-400 truncate">{song.albumName}</p>
                          </div>

                          {/* AI Lyrics Review Button */}
                          <button
                            onClick={() => handleReviewSong(song)}
                            className="p-2 rounded-full bg-gray-100 text-purple-600 hover:bg-purple-100 transition flex-shrink-0"
                            title="AI Lyrics Review"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmSong(song)}
                            className="p-2 rounded-full bg-gray-100 text-red-500 hover:bg-red-100 transition flex-shrink-0"
                            title="Remove song"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* DISCOVER TAB */}
      {activeTab === 'discover' && (
        <div className="space-y-4">
          {/* Show Discover Playlist Detail View OR regular Discover List */}
          {selectedDiscoverPlaylist ? (
            /* Discover Playlist Detail View */
            <div className="space-y-4">
              {/* Back Button & Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDiscoverPlaylist(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{selectedDiscoverPlaylist.playlistName}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedDiscoverPlaylist.curatorName || 'Apple Music'} • {discoverPlaylistTracks.length} songs
                  </p>
                </div>
                {/* Delete Playlist Button */}
                <button
                  onClick={() => setPlaylistRemoveConfirm(selectedDiscoverPlaylist)}
                  className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition"
                  title="Remove from Discover"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Playlist Artwork */}
              {selectedDiscoverPlaylist.artworkUrl && !selectedDiscoverPlaylist.hideArtwork && (
                <div className="flex justify-center">
                  <img
                    src={selectedDiscoverPlaylist.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                    alt={selectedDiscoverPlaylist.playlistName}
                    className="w-40 h-40 rounded-xl shadow-lg object-cover"
                  />
                </div>
              )}

              {/* Track List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                {discoverPlaylistTracks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p>No tracks in this playlist</p>
                  </div>
                ) : (
                  discoverPlaylistTracks.map((track, index) => (
                    <div
                      key={track.appleSongId || index}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                    >
                      {/* Track Number */}
                      <span className="text-sm text-gray-400 w-6 text-right flex-shrink-0">{track.trackNumber || index + 1}</span>

                      {/* Artwork - Clickable to Play */}
                      <button
                        onClick={async () => {
                          if (playingSongId === track.appleSongId) {
                            musicKitService.stop();
                            setPlayingSongId(null);
                            setPlayingSongMeta(null);
                          } else {
                            try {
                              setPlayingSongId(track.appleSongId);
                              setPlayingSongMeta({ songName: track.songName, artistName: track.artistName, artworkUrl: track.artworkUrl });
                              await musicKitService.playSong(track.appleSongId);
                            } catch (err) {
                              console.error('Play failed:', err);
                              setPlayingSongId(null);
                            }
                          }
                        }}
                        className="relative flex-shrink-0 group"
                        title={playingSongId === track.appleSongId ? 'Stop' : 'Play'}
                      >
                        {track.artworkUrl ? (
                          <img
                            src={track.artworkUrl.replace('{w}', '80').replace('{h}', '80')}
                            alt={track.songName}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-200 to-pink-200 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                        {/* Play/Pause overlay */}
                        <div className={`absolute inset-0 rounded flex items-center justify-center transition-opacity ${
                          playingSongId === track.appleSongId ? 'bg-black/50' : 'bg-black/0 group-hover:bg-black/40'
                        }`}>
                          {playingSongId === track.appleSongId ? (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{track.songName}</p>
                        <p className="text-sm text-gray-500 truncate">{track.artistName}</p>
                      </div>

                      {/* Explicit Badge */}
                      {track.isExplicit && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded flex-shrink-0">E</span>
                      )}

                      {/* Action Buttons - AI Review and Remove */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* AI Review Button */}
                        <button
                          onClick={() => {
                            setReviewingContent({
                              type: 'song',
                              songName: track.songName,
                              artistName: track.artistName,
                              appleSongId: track.appleSongId,
                            });
                            setReviewModalOpen(true);
                          }}
                          className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition"
                          title="AI Review"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </button>

                        {/* Remove Button */}
                        <button
                          onClick={async () => {
                            try {
                              await removeTrackFromFeaturedPlaylist({
                                playlistId: selectedDiscoverPlaylist._id,
                                appleSongId: track.appleSongId,
                              });
                              showSuccess(`Removed "${track.songName}" from playlist`);
                            } catch (err) {
                              console.error('Failed to remove track:', err);
                            }
                          }}
                          className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition"
                          title="Remove from playlist"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Regular Discover List View */
            <>
              {/* Discover Pool Banner */}
              <div className="bg-purple-50 border border-purple-100 px-4 py-3 rounded-2xl">
                <p className="text-purple-700 font-semibold text-sm">Discover Pool</p>
                <p className="text-gray-600 text-sm mt-0.5">
                  Music you make available for {selectedKid ? selectedKid.name : "your kids"} to explore on their own — giving them autonomy to choose what they listen to
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search albums or playlists..."
                  value={discoverSearchQuery}
                  onChange={(e) => setDiscoverSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                {discoverSearchQuery && (
                  <button
                    onClick={() => setDiscoverSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <DiscoverList
                albums={filteredFeaturedAlbums}
                playlists={filteredFeaturedPlaylists}
                selectedKid={selectedKid}
                user={user}
                localHideArtwork={localHideArtwork}
                onToggleArtwork={handleQuickToggleArtwork}
                searchQuery={discoverSearchQuery}
                onEditAlbum={(album) => {
                  // Use simplified Discover modal (no checkboxes, just view and remove)
                  setDiscoverAlbumId(album.appleAlbumId);
                  setDiscoverAlbumModalOpen(true);
                }}
                onEditPlaylist={(playlist) => {
                  setSelectedDiscoverPlaylist(playlist);
                }}
                onRemoveFromDiscover={(album) => {
                  if (!selectedKidId) {
                    showSuccess('Please select a kid first');
                    return;
                  }
                  // Show confirmation modal instead of browser confirm
                  setDiscoverRemoveConfirm({
                    album,
                    kidName: selectedKid?.name || 'this kid',
                  });
                }}
                onRemovePlaylistFromDiscover={async (playlist) => {
                  try {
                    await removeFeaturedPlaylist({ playlistId: playlist._id });
                    showSuccess(`Removed "${playlist.playlistName}" from Discover`);
                  } catch (err) {
                    console.error('Failed to remove playlist from Discover:', err);
                  }
                }}
                showSuccess={showSuccess}
              />
            </>
          )}
        </div>
      )}

      {/* PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
        <div className="space-y-4">
          {/* Show playlist detail view OR grid */}
          {selectedPlaylistView ? (
            /* Playlist Detail View */
            <div className="space-y-4">
              {/* Back Button & Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedPlaylistView(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900 flex-1 truncate">{selectedPlaylistView.name}</h2>
              </div>

              {/* Playlist Info Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  {(() => {
                    const firstSongArt = selectedPlaylistView.songs?.find(s => s.artworkUrl)?.artworkUrl;
                    return firstSongArt && !shouldHidePlaylistArtwork(selectedPlaylistView) ? (
                      <img
                        src={firstSongArt.replace('{w}', '120').replace('{h}', '120')}
                        alt={selectedPlaylistView.name}
                        className="w-24 h-24 rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <SafeTunesLogo className="w-12 h-12 text-white/70" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedPlaylistView.name}</h3>
                    <p className="text-sm text-gray-500">{selectedPlaylistView.songs?.length || 0} songs</p>
                    <p className="text-xs text-gray-400 mt-1">Created by {selectedKid?.name || 'kid'}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newName = prompt('Enter new playlist name:', selectedPlaylistView.name);
                      if (newName && newName.trim() && newName !== selectedPlaylistView.name) {
                        updatePlaylist({ playlistId: selectedPlaylistView._id, name: newName.trim() })
                          .then(() => {
                            showSuccess(`Renamed to "${newName.trim()}"`);
                            setSelectedPlaylistView({ ...selectedPlaylistView, name: newName.trim() });
                          })
                          .catch(err => console.error('Failed to rename:', err));
                      }
                    }}
                    className="flex-1 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${selectedPlaylistView.name}"? This cannot be undone.`)) {
                        deletePlaylist({ playlistId: selectedPlaylistView._id })
                          .then(() => {
                            showSuccess(`Deleted "${selectedPlaylistView.name}"`);
                            setSelectedPlaylistView(null);
                          })
                          .catch(err => console.error('Failed to delete:', err));
                      }
                    }}
                    className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Songs List */}
              {selectedPlaylistView.songs && selectedPlaylistView.songs.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {selectedPlaylistView.songs.map((song, index) => (
                    <div
                      key={song.appleSongId || index}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition ${
                        index !== selectedPlaylistView.songs.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <span className="w-6 text-center text-sm font-medium text-gray-400 flex-shrink-0">
                        {index + 1}
                      </span>
                      {song.artworkUrl ? (
                        <img
                          src={song.artworkUrl.replace('{w}', '60').replace('{h}', '60')}
                          alt={song.songName}
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <SafeTunesLogo className="w-6 h-6 text-white/70" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">{song.songName}</h3>
                        <p className="text-xs text-gray-500 truncate">{song.artistName}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Remove "${song.songName}" from this playlist?`)) {
                            removeSongFromPlaylist({
                              playlistId: selectedPlaylistView._id,
                              appleSongId: song.appleSongId
                            })
                              .then(() => {
                                showSuccess(`Removed "${song.songName}"`);
                                // Update local state to reflect removal
                                setSelectedPlaylistView({
                                  ...selectedPlaylistView,
                                  songs: selectedPlaylistView.songs.filter(s => s.appleSongId !== song.appleSongId)
                                });
                              })
                              .catch(err => console.error('Failed to remove song:', err));
                          }
                        }}
                        className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition flex-shrink-0"
                        title="Remove from playlist"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-500">No songs in this playlist</p>
                </div>
              )}
            </div>
          ) : (
            /* Playlists Grid View */
            <>
              {/* Playlists Explanation Banner */}
              <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl">
                <p className="text-amber-700 font-semibold text-sm">Playlists</p>
                <p className="text-gray-600 text-sm mt-0.5">
                  Custom playlists {selectedKid ? `${selectedKid.name}` : "your kids"} created from their approved music
                </p>
              </div>

              {/* Playlists Grid */}
              {(() => {
                const kidPlaylists = playlists?.filter(p => p.kidProfileId === selectedKidId) || [];

                if (kidPlaylists.length === 0) {
                  return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                      <svg className="w-16 h-16 mx-auto text-orange-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <p className="text-gray-500 font-medium">No Playlists Yet</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {selectedKid?.name || 'Your kid'} can create playlists in their player
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {kidPlaylists.map((playlist) => {
                        const firstSongArt = playlist.songs?.find(s => s.artworkUrl)?.artworkUrl;

                        return (
                          <div
                            key={playlist._id}
                            className="group cursor-pointer"
                            onClick={() => setSelectedPlaylistView(playlist)}
                          >
                            {/* Playlist Artwork */}
                            <div className="relative aspect-square mb-2">
                              {firstSongArt && !shouldHidePlaylistArtwork(playlist) ? (
                                <img
                                  src={firstSongArt.replace('{w}', '300').replace('{h}', '300')}
                                  alt={playlist.name}
                                  className="w-full h-full object-cover rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                                  <SafeTunesLogo className="w-12 h-12 text-white/70" />
                                </div>
                              )}

                              {/* Quick action buttons - always visible */}
                              <div className="absolute top-1 right-1 flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt('Enter new playlist name:', playlist.name);
                                    if (newName && newName.trim() && newName !== playlist.name) {
                                      updatePlaylist({ playlistId: playlist._id, name: newName.trim() })
                                        .then(() => showSuccess(`Renamed to "${newName.trim()}"`))
                                        .catch(err => console.error('Failed to rename:', err));
                                    }
                                  }}
                                  className="p-1.5 rounded-full bg-white/90 text-gray-600 shadow-md transition hover:bg-white"
                                  title="Rename playlist"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete "${playlist.name}"?`)) {
                                      deletePlaylist({ playlistId: playlist._id })
                                        .then(() => showSuccess(`Deleted "${playlist.name}"`))
                                        .catch(err => console.error('Failed to delete:', err));
                                    }
                                  }}
                                  className="p-1.5 rounded-full bg-white/90 text-red-500 shadow-md transition hover:bg-white"
                                  title="Delete playlist"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {/* Playlist Info */}
                            <p className="font-medium text-sm text-gray-900 truncate">{playlist.name}</p>
                            <p className="text-xs text-gray-500 truncate">{playlist.songs?.length || 0} songs</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Album Modal */}
      <AlbumModal
        isOpen={albumModalOpen}
        onClose={() => {
          setAlbumModalOpen(false);
          setSelectedAlbumForModal(null);
        }}
        album={selectedAlbumForModal}
        userId={user?._id}
        selectedKidId={selectedKidId}
        selectedKid={selectedKid}
        kidProfiles={kidProfiles}
        onReviewSong={handleReviewSong}
      />

      {/* Content Review Modal */}
      <ContentReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setReviewingContent(null);
        }}
        content={reviewingContent}
        userId={user?._id}
      />

      {/* Album Overview Modal */}
      <AlbumOverviewModal
        isOpen={overviewModalOpen}
        onClose={() => {
          setOverviewModalOpen(false);
          setOverviewAlbumData(null);
        }}
        albumData={overviewAlbumData}
        userId={user?._id}
      />

      {/* Simplified Discover Album Modal */}
      <EditDiscoverAlbumModal
        isOpen={discoverAlbumModalOpen}
        onClose={() => {
          setDiscoverAlbumModalOpen(false);
          setDiscoverAlbumId(null);
        }}
        albumId={discoverAlbumId}
        userId={user?._id}
        kidProfiles={kidProfiles}
        onRemove={() => {
          showSuccess('Removed from Discover');
        }}
      />

      {/* Delete Album Confirmation Modal */}
      {deleteConfirmAlbum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Album for {selectedKid?.name || 'Kid'}?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Remove <span className="font-medium">"{deleteConfirmAlbum.albumName}"</span> from <span className="font-medium">{selectedKid?.name || 'this kid'}'s</span> library? This will remove all songs from this album for them only.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmAlbum(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAlbum}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Song Confirmation Modal */}
      {deleteConfirmSong && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Song for {selectedKid?.name || 'Kid'}?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Remove <span className="font-medium">"{deleteConfirmSong.songName}"</span> by <span className="font-medium">{deleteConfirmSong.artistName}</span> from <span className="font-medium">{selectedKid?.name || 'this kid'}'s</span> library?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmSong(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSong}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discover Remove Confirmation Modal */}
      {discoverRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove from Discover?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Remove <span className="font-medium">"{discoverRemoveConfirm.album?.albumName}"</span> from <span className="font-medium">{discoverRemoveConfirm.kidName}'s</span> Discover pool?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDiscoverRemoveConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('[Discover Remove] Calling with:', {
                        userId: user._id,
                        appleAlbumId: discoverRemoveConfirm.album.appleAlbumId,
                        kidProfileId: selectedKidId,
                        album: discoverRemoveConfirm.album,
                      });
                      const result = await removeAlbumFromDiscoverForKid({
                        userId: user._id,
                        appleAlbumId: discoverRemoveConfirm.album.appleAlbumId,
                        kidProfileId: selectedKidId,
                      });
                      console.log('[Discover Remove] Result:', result);
                      if (result.success) {
                        showSuccess(`Removed "${discoverRemoveConfirm.album.albumName}" from ${discoverRemoveConfirm.kidName}'s Discover`);
                      } else {
                        showSuccess(`Error: ${result.error || 'Unknown error'}`);
                      }
                    } catch (err) {
                      console.error('Failed to remove album from Discover:', err);
                      showSuccess(`Error: ${err.message}`);
                    }
                    setDiscoverRemoveConfirm(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-pink-600 text-white font-medium hover:bg-pink-700 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Remove Confirmation Modal */}
      {playlistRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Playlist from Discover?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Remove <span className="font-medium">"{playlistRemoveConfirm.playlistName}"</span> from Discover pool?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPlaylistRemoveConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await removeFeaturedPlaylist({ playlistId: playlistRemoveConfirm._id });
                      showSuccess(`Removed "${playlistRemoveConfirm.playlistName}" from Discover`);
                      setSelectedDiscoverPlaylist(null);
                    } catch (err) {
                      console.error('Failed to remove playlist:', err);
                      showSuccess(`Error: ${err.message}`);
                    }
                    setPlaylistRemoveConfirm(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Song Preview Popup - Matches AddMusic/AlbumInspector style */}
      {playingSongId && playingSongMeta && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={handleStopSong}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-5 mx-4 max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Track Info */}
            <div className="flex items-center gap-3 mb-4">
              {playingSongMeta.artworkUrl ? (
                <img
                  src={playingSongMeta.artworkUrl.replace('{w}', '100').replace('{h}', '100')}
                  alt={playingSongMeta.songName}
                  className="w-14 h-14 rounded-lg shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{playingSongMeta.songName}</p>
                <p className="text-sm text-gray-400 truncate">{playingSongMeta.artistName}</p>
              </div>
            </div>

            {/* Seekable Progress Bar */}
            {songPreviewDuration > 0 && (
              <div className="mb-4">
                <div
                  className="h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                  onClick={handleSongSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${(songPreviewTime / songPreviewDuration) * 100}%` }}
                  />
                  {/* Scrubber thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${(songPreviewTime / songPreviewDuration) * 100}% - 7px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                  <span>{Math.floor(songPreviewTime / 60)}:{String(Math.floor(songPreviewTime % 60)).padStart(2, '0')}</span>
                  <span>{Math.floor(songPreviewDuration / 60)}:{String(Math.floor(songPreviewDuration % 60)).padStart(2, '0')}</span>
                </div>
              </div>
            )}

            {/* Done Button */}
            <button
              onClick={handleStopSong}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MusicLibrarySeparate;
