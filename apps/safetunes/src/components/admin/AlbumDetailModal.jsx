import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import musicKitService from '../../config/musickit';

function AlbumDetailModal({ isOpen, onClose, albumId, userId, mode = 'library', onReviewSong }) {
  // mode: 'library' = managing per-kid song assignments (no discover toggle)
  //       'discover' = not used here - discover has its own modal
  // Per-kid track selections: Map<kidId, Set<trackId>>
  const [kidTrackSelections, setKidTrackSelections] = useState(new Map());
  const [activeKidId, setActiveKidId] = useState(null);
  const [hideArtwork, setHideArtwork] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Album metadata from MusicKit (for new albums not in database)
  const [musicKitAlbumData, setMusicKitAlbumData] = useState(null);

  // Track if we've initialized selections for this modal session
  const hasInitializedRef = useRef(false);
  const lastAlbumIdRef = useRef(null);

  // Fetch album data with tracks
  const albumData = useQuery(
    api.albums.getAlbumWithTracks,
    isOpen && albumId && userId ? { userId, appleAlbumId: albumId } : 'skip'
  );

  const approveAlbumTracks = useMutation(api.albums.approveAlbumTracks);
  const removeAlbumTracksForKids = useMutation(api.albums.removeAlbumTracksForKids);
  const toggleAlbumArtworkEverywhere = useMutation(api.albums.toggleAlbumArtworkEverywhere);
  const removeAlbumEverywhere = useMutation(api.albums.removeAlbumEverywhere);
  const storeAlbumTracks = useMutation(api.albums.storeAlbumTracks);

  // Auto-fetch tracks and album metadata from Apple MusicKit when album has no tracks stored
  useEffect(() => {
    const fetchAndStoreTracks = async () => {
      if (!isOpen || !albumData || albumData.tracks?.length > 0 || isLoadingTracks || !albumId) {
        return;
      }

      console.log('[AlbumDetailModal] Album has no tracks, fetching from Apple Music:', albumId);
      setIsLoadingTracks(true);
      setLoadingError(null);

      try {
        await musicKitService.initialize();

        // Fetch both album metadata and tracks
        const [albumInfo, albumTracks] = await Promise.all([
          musicKitService.getAlbum(albumId),
          musicKitService.getAlbumTracks(albumId),
        ]);

        // Store album metadata for new albums
        if (albumInfo && !albumData.album) {
          console.log('[AlbumDetailModal] Storing album metadata from MusicKit:', albumInfo.attributes?.name);
          setMusicKitAlbumData({
            albumName: albumInfo.attributes?.name || 'Unknown Album',
            artistName: albumInfo.attributes?.artistName || 'Unknown Artist',
            artworkUrl: albumInfo.attributes?.artwork?.url,
            releaseYear: albumInfo.attributes?.releaseDate?.slice(0, 4),
            trackCount: albumInfo.attributes?.trackCount,
            genres: albumInfo.attributes?.genreNames || [],
            isExplicit: albumInfo.attributes?.contentRating === 'explicit',
          });
        }

        if (!albumTracks || albumTracks.length === 0) {
          console.warn('[AlbumDetailModal] No tracks found for album:', albumId);
          setLoadingError('No tracks found for this album');
          setIsLoadingTracks(false);
          return;
        }

        console.log(`[AlbumDetailModal] Found ${albumTracks.length} tracks, storing...`);

        const artistName = albumInfo?.attributes?.artistName || albumData.album?.artistName || 'Unknown Artist';
        const formattedTracks = albumTracks.map((track, index) => ({
          appleSongId: track.id || track.attributes?.playParams?.id,
          songName: track.attributes?.name || 'Unknown Track',
          artistName: track.attributes?.artistName || artistName,
          trackNumber: track.attributes?.trackNumber || index + 1,
          durationInMillis: track.attributes?.durationInMillis || 0,
          isExplicit: track.attributes?.contentRating === 'explicit',
        }));

        await storeAlbumTracks({
          userId,
          appleAlbumId: albumId,
          tracks: formattedTracks,
        });

        console.log(`[AlbumDetailModal] Successfully stored ${formattedTracks.length} tracks`);
      } catch (error) {
        console.error('[AlbumDetailModal] Failed to fetch/store tracks:', error);
        setLoadingError('Failed to load tracks. Please try again.');
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchAndStoreTracks();
  }, [isOpen, albumData, albumId, userId, isLoadingTracks, storeAlbumTracks]);

  // Reset initialization when modal closes or album changes
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      setHasUnsavedChanges(false);
      setMusicKitAlbumData(null);
    }
    if (albumId !== lastAlbumIdRef.current) {
      hasInitializedRef.current = false;
      lastAlbumIdRef.current = albumId;
      setHasUnsavedChanges(false);
      setMusicKitAlbumData(null);
    }
  }, [isOpen, albumId]);

  // Initialize per-kid track selections based on existing approvals
  // ONLY runs once per modal session to prevent losing unsaved changes
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!albumData?.tracks || !albumData?.kidProfiles) return;

    console.log('[AlbumDetailModal] Initializing selections:', {
      discoverable: albumData.discoverable,
      tracksCount: albumData.tracks.length,
      kidsCount: albumData.kidProfiles.length,
    });

    const newSelections = new Map();
    const allTrackIds = albumData.tracks.map(t => t.appleSongId);

    // For each kid, determine which tracks they have approved
    for (const kid of albumData.kidProfiles) {
      const kidTracks = new Set();

      // Check if this kid has ANY individual track approvals
      let hasAnyIndividualApprovals = false;
      for (const track of albumData.tracks) {
        const trackHasKid = track.kidProfileIds?.some(id => String(id) === String(kid._id));
        if (trackHasKid) {
          kidTracks.add(track.appleSongId);
          hasAnyIndividualApprovals = true;
        }
      }

      // If no individual approvals exist for this kid, pre-select ALL tracks
      // This handles Discover albums and newly added albums where parent wants to approve everything
      if (!hasAnyIndividualApprovals) {
        console.log(`[AlbumDetailModal] No individual approvals for ${kid.name}, pre-selecting all tracks`);
        allTrackIds.forEach(id => kidTracks.add(id));
      }

      newSelections.set(String(kid._id), kidTracks);
    }

    setKidTrackSelections(newSelections);
    setHideArtwork(albumData.album?.hideArtwork ?? musicKitAlbumData?.hideArtwork ?? false);
    setDiscoverable(albumData.discoverable || false);

    // Auto-select first kid with approvals, or first kid if none have approvals
    if (albumData.kidProfiles.length > 0) {
      const kidWithApprovals = albumData.kidProfiles.find(kid => {
        const tracks = newSelections.get(String(kid._id));
        return tracks && tracks.size > 0;
      });
      setActiveKidId(String(kidWithApprovals?._id || albumData.kidProfiles[0]._id));
    }

    hasInitializedRef.current = true;
  }, [albumData]);

  // Helper to get avatar icon
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  // Helper to get color class
  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Get current kid's track selections
  const currentKidTracks = useMemo(() => {
    if (!activeKidId) return new Set();
    return kidTrackSelections.get(activeKidId) || new Set();
  }, [activeKidId, kidTrackSelections]);

  // Calculate stats for active kid
  const stats = useMemo(() => {
    if (!albumData?.tracks) return { total: 0, approved: 0 };
    return {
      total: albumData.tracks.length,
      approved: currentKidTracks.size,
    };
  }, [albumData, currentKidTracks]);

  // Handle select all / deselect all for current kid
  const handleSelectAll = () => {
    if (!activeKidId || !albumData?.tracks) return;

    const newSelections = new Map(kidTrackSelections);
    if (currentKidTracks.size === albumData.tracks.length) {
      // Deselect all
      newSelections.set(activeKidId, new Set());
    } else {
      // Select all
      newSelections.set(activeKidId, new Set(albumData.tracks.map(t => t.appleSongId)));
    }
    setKidTrackSelections(newSelections);
    setHasUnsavedChanges(true);
  };

  // Handle track toggle for current kid
  const handleTrackToggle = (trackId) => {
    if (!activeKidId) return;

    const newSelections = new Map(kidTrackSelections);
    const kidTracks = new Set(currentKidTracks);

    if (kidTracks.has(trackId)) {
      kidTracks.delete(trackId);
    } else {
      kidTracks.add(trackId);
    }

    newSelections.set(activeKidId, kidTracks);
    setKidTrackSelections(newSelections);
    setHasUnsavedChanges(true);
  };

  // Copy current kid's selections to another kid
  const handleCopyToKid = (targetKidId) => {
    if (!activeKidId) return;

    const newSelections = new Map(kidTrackSelections);
    newSelections.set(String(targetKidId), new Set(currentKidTracks));
    setKidTrackSelections(newSelections);
    setHasUnsavedChanges(true);
  };

  // Handle save changes - saves ALL kids' selections
  const handleSave = async () => {
    if (!albumData) return;

    // Use existing album data or MusicKit data for new albums
    const albumInfo = albumData.album || musicKitAlbumData;
    if (!albumInfo) {
      alert('Album data not available. Please wait for tracks to load.');
      return;
    }

    setIsSaving(true);
    try {
      // Process each kid's selections
      for (const kid of albumData.kidProfiles) {
        const kidId = String(kid._id);
        const selectedTracks = kidTrackSelections.get(kidId) || new Set();
        const selectedTrackArray = Array.from(selectedTracks);

        // Approve selected tracks for this kid
        if (selectedTrackArray.length > 0) {
          await approveAlbumTracks({
            userId,
            appleAlbumId: albumId,
            trackIds: selectedTrackArray,
            kidProfileIds: [kid._id],
            albumMetadata: {
              albumName: albumInfo.albumName,
              artistName: albumInfo.artistName,
              artworkUrl: albumInfo.artworkUrl,
              releaseYear: albumInfo.releaseYear,
              trackCount: albumInfo.trackCount,
              genres: albumInfo.genres,
              isExplicit: albumInfo.isExplicit,
            },
            hideArtwork,
          });
        }

        // Remove unselected tracks for this kid
        const allTrackIds = albumData.tracks.map(t => t.appleSongId);
        const tracksToRemove = allTrackIds.filter(id => !selectedTracks.has(id));
        if (tracksToRemove.length > 0) {
          await removeAlbumTracksForKids({
            userId,
            trackIds: tracksToRemove,
            kidProfileIds: [kid._id],
          });
        }
      }

      // Show success message and clear unsaved changes flag
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
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

  // Handle remove album
  const handleRemoveAlbum = async () => {
    if (!confirm('Are you sure you want to remove this album from your library? This will remove it for all kids.')) {
      return;
    }

    try {
      await removeAlbumEverywhere({
        userId,
        appleAlbumId: albumId,
      });
      onClose();
    } catch (error) {
      console.error('Failed to remove album:', error);
      alert('Failed to remove album. Please try again.');
    }
  };

  // Format duration
  const formatDuration = (millis) => {
    if (!millis) return '';
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get count of how many tracks each kid has
  const getKidTrackCount = (kidId) => {
    const tracks = kidTrackSelections.get(String(kidId));
    return tracks ? tracks.size : 0;
  };

  if (!isOpen || !albumData) return null;

  const { album, tracks, kidProfiles } = albumData;
  // Use existing album data or MusicKit data for new albums
  const displayAlbum = album || musicKitAlbumData;
  const activeKid = kidProfiles.find(k => String(k._id) === activeKidId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4 overflow-hidden" onClick={handleClose}>
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl sm:max-w-4xl w-full h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden box-border" onClick={(e) => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 p-3 pt-0 sm:p-6 border-b border-gray-200">
          {/* Album Artwork */}
          <div className="flex-shrink-0">
            {hideArtwork ? (
              <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg shadow-md flex flex-col items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/70 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <span className="text-white/70 text-xs font-medium">Hidden</span>
              </div>
            ) : displayAlbum?.artworkUrl ? (
              <img
                src={displayAlbum.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                alt={displayAlbum.albumName}
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg shadow-md object-cover"
              />
            ) : (
              <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg shadow-md flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 truncate">{displayAlbum?.albumName}</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-2 truncate">{displayAlbum?.artistName}</p>
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
              {displayAlbum?.releaseYear && <span>{displayAlbum.releaseYear}</span>}
              <span>{tracks.length} tracks</span>
              {displayAlbum?.genres && displayAlbum.genres.length > 0 && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                  {displayAlbum.genres[0]}
                </span>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Kid Selector - Horizontal Scroll on Mobile */}
        <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Configure for:</span>
            <span className="text-xs text-gray-500">(tap kid to edit their songs)</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
            {kidProfiles.map((kid) => {
              const isActive = String(kid._id) === activeKidId;
              const trackCount = getKidTrackCount(kid._id);

              return (
                <button
                  key={kid._id}
                  onClick={() => setActiveKidId(String(kid._id))}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition ${
                    isActive
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-1.5`}>
                    {getAvatarIcon(kid.avatar)}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{kid.name}</div>
                    <div className="text-xs text-gray-500">
                      {trackCount} / {tracks.length} songs
                    </div>
                  </div>
                  {isActive && (
                    <svg className="w-4 h-4 text-purple-600 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tracks List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Controls Bar */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={handleSelectAll}
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                {currentKidTracks.size === tracks.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-600">
                {stats.approved} of {stats.total} for {activeKid?.name || 'kid'}
              </span>
            </div>

            {/* Copy to other kids */}
            {kidProfiles.length > 1 && currentKidTracks.size > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 mr-2">Copy to:</span>
                {kidProfiles
                  .filter(k => String(k._id) !== activeKidId)
                  .map(kid => (
                    <button
                      key={kid._id}
                      onClick={() => handleCopyToKid(kid._id)}
                      className="inline-flex items-center gap-1 px-2 py-1 mr-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition"
                    >
                      <div className={`w-4 h-4 rounded-full ${getColorClass(kid.color)} flex items-center justify-center`}>
                        {getAvatarIcon(kid.avatar)}
                      </div>
                      {kid.name}
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          {/* Track List */}
          <div className="p-3 sm:p-4">
            {isLoadingTracks ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-medium mb-1">Loading tracks...</p>
                <p className="text-sm">Fetching from Apple Music</p>
              </div>
            ) : loadingError ? (
              <div className="text-center py-12 text-red-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium mb-1">Error loading tracks</p>
                <p className="text-sm">{loadingError}</p>
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p>No tracks available</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tracks.map((track, index) => {
                  const isSelected = currentKidTracks.has(track.appleSongId);

                  // Show which other kids have this track
                  const otherKidsWithTrack = kidProfiles.filter(kid => {
                    if (String(kid._id) === activeKidId) return false;
                    const kidTracks = kidTrackSelections.get(String(kid._id));
                    return kidTracks?.has(track.appleSongId);
                  });

                  return (
                    <label
                      key={track.appleSongId}
                      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'bg-purple-50 hover:bg-purple-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTrackToggle(track.appleSongId)}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                      />
                      <div className="w-6 sm:w-8 text-xs sm:text-sm text-gray-500 text-center flex-shrink-0">
                        {track.trackNumber || index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1 sm:gap-2">
                          {track.songName}
                          {track.isExplicit && (
                            <span className="px-1 sm:px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-bold flex-shrink-0">E</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 truncate">{track.artistName}</div>
                      </div>

                      {/* Other kids with this track */}
                      {otherKidsWithTrack.length > 0 && (
                        <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
                          {otherKidsWithTrack.slice(0, 3).map(kid => (
                            <div
                              key={kid._id}
                              className={`w-5 h-5 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-0.5`}
                              title={`${kid.name} has this song`}
                            >
                              {getAvatarIcon(kid.avatar)}
                            </div>
                          ))}
                          {otherKidsWithTrack.length > 3 && (
                            <span className="text-xs text-gray-400">+{otherKidsWithTrack.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* AI Lyrics Review Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onReviewSong?.({
                            appleSongId: track.appleSongId,
                            songName: track.songName,
                            artistName: track.artistName,
                          });
                        }}
                        className="p-1.5 rounded-full bg-gray-100 text-purple-600 hover:bg-purple-100 transition flex-shrink-0"
                        title="AI Lyrics Review"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>

                      {track.durationInMillis && (
                        <div className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                          {formatDuration(track.durationInMillis)}
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 pb-6 sm:p-4 sm:pb-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleArtwork}
                className="p-2.5 sm:p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition active:bg-gray-300"
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
                onClick={handleRemoveAlbum}
                className="p-2.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition active:bg-red-100"
                title="Remove album"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm active:bg-gray-100"
              >
                {hasUnsavedChanges ? 'Discard' : 'Close'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2.5 sm:py-2 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2 active:bg-purple-800`}
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </>
                ) : (
                  'Save All'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlbumDetailModal;
