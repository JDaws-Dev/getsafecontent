import { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { COLORS } from '../../constants/avatars';
import musicKitService from '../../config/musickit';
import ContentReviewModal from './ContentReviewModal';
import AlbumOverviewModal from './AlbumOverviewModal';
import PlaylistImport from './PlaylistImport';
import AlbumInspector from './AlbumInspector';
import SearchResults from './SearchResults';
import { useToast } from '../../contexts/ToastContext';

// Helper to initialize MusicKit with timeout
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
    return musicKitService.music !== null;
  }
};

// Format duration
const formatDuration = (millis) => {
  if (!millis) return '';
  const minutes = Math.floor(millis / 60000);
  const seconds = Math.floor((millis % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Action Sheet Component - Mobile-friendly bottom sheet for item actions
// Redesigned to surface destination choice (Library vs Discover) upfront
function ActionSheet({ isOpen, onClose, item, onAdd, onAddToDiscover, onAIReview, onViewArtist, onQuickAdd, kidProfiles, isQuickAdding }) {
  if (!isOpen || !item) return null;

  const isAlbum = item.resultType === 'album';
  const isSong = item.resultType === 'song';
  const isArtist = item.resultType === 'artist';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Item Header */}
        <div className={`p-4 ${isArtist ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : isAlbum ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-pink-600 to-rose-600'} text-white`}>
          <div className="flex gap-3 items-center">
            {item.attributes?.artwork ? (
              <img
                src={item.attributes.artwork.url.replace('{w}', '120').replace('{h}', '120')}
                alt={item.attributes.name}
                className={`w-16 h-16 object-cover shadow-lg flex-shrink-0 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}
              />
            ) : (
              <div className={`w-16 h-16 bg-white/20 flex items-center justify-center flex-shrink-0 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}>
                {isArtist ? (
                  <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${isArtist ? 'bg-white/20' : isAlbum ? 'bg-white/20' : 'bg-white/20'}`}>
                  {isArtist ? 'ARTIST' : isAlbum ? 'ALBUM' : 'SONG'}
                </span>
                {item.attributes?.contentRating === 'explicit' && (
                  <span className="px-1.5 py-0.5 bg-white/30 rounded text-xs font-bold">E</span>
                )}
              </div>
              <h3 className="font-bold text-lg truncate mt-1">{item.attributes?.name}</h3>
              <p className="text-white/80 text-sm truncate">
                {isArtist ? 'Tap below to view albums' : item.attributes?.artistName}
              </p>
              {isSong && item.attributes?.albumName && (
                <p className="text-white/60 text-xs truncate">{item.attributes.albumName}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition self-start">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3">
          {isArtist ? (
            <button
              onClick={() => {
                onClose();
                onViewArtist(item);
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition text-left"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">View Albums</p>
                <p className="text-sm text-gray-500">Browse and add albums from this artist</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : isAlbum ? (
            <>
              {/* Album Flow - Opens Inspector */}
              <button
                onClick={() => {
                  onClose();
                  onAdd(item);
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition text-left border border-purple-200"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Review Album</p>
                  <p className="text-sm text-gray-500">Preview songs, run AI safety check, then choose destination</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Quick Add Option */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2 px-1">Quick actions</p>
                <button
                  onClick={() => onQuickAdd?.(item)}
                  disabled={isQuickAdding || kidProfiles.length === 0}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    {isQuickAdding ? (
                      <svg className="animate-spin w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {isQuickAdding ? 'Adding...' : 'Quick Add to Library'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {kidProfiles.length === 0 ? 'Add kids first' : `All songs → ${kidProfiles.length === 1 ? kidProfiles[0].name : `all ${kidProfiles.length} kids`}`}
                    </p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Song Flow - Simpler options */}
              <button
                onClick={() => onQuickAdd?.(item)}
                disabled={isQuickAdding || kidProfiles.length === 0}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition text-left border border-purple-200 disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  {isQuickAdding ? (
                    <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {isQuickAdding ? 'Adding...' : 'Add to Library'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {kidProfiles.length === 0 ? 'Add kids first' : `Add to ${kidProfiles.length === 1 ? kidProfiles[0].name : `all ${kidProfiles.length} kids`}`}
                  </p>
                </div>
              </button>

              {/* AI Review for Songs */}
              <button
                onClick={() => {
                  onClose();
                  onAIReview(item);
                }}
                className="w-full flex items-center gap-3 p-3 mt-2 hover:bg-gray-50 rounded-xl transition text-left"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Check Lyrics First</p>
                  <p className="text-xs text-gray-500">AI review for inappropriate content</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Cancel Button - More prominent on mobile */}
        <div className="p-3 pt-0">
          <button
            onClick={onClose}
            className="w-full p-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition"
          >
            Cancel
          </button>
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </div>
  );
}

// Simplified Add Modal with Progressive Disclosure
// Default: Quick add to kids' library. Destination toggle at top for visibility.
function UnifiedAddModal({ isOpen, onClose, album, user, kidProfiles, onSuccess, onOpenAIReview, initialDestination = 'library' }) {
  const [destination, setDestination] = useState(initialDestination); // 'library' or 'discover'
  const [selectedKids, setSelectedKids] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [hideArtwork, setHideArtwork] = useState(false);
  const { showToast } = useToast();

  const approveAlbum = useMutation(api.albums.approveAlbum);
  const approveSong = useMutation(api.songs.approveSong);
  const addToDiscover = useMutation(api.featured.addAlbumToDiscover);

  // Helper for color class
  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : 'bg-purple-500';
  };

  // Reset selection when modal opens - auto-select all kids for quick add
  useEffect(() => {
    if (isOpen) {
      setDestination(initialDestination);
      // Auto-select all kids for faster workflow
      setSelectedKids(kidProfiles.map(k => k._id));
      setSelectedTracks([]);
      setAlbumTracks([]);
      setHideArtwork(false);
      loadTracks();
    }
  }, [isOpen, album?.id, kidProfiles, initialDestination]);

  const loadTracks = async () => {
    if (!album?.id) return;
    setLoadingTracks(true);
    try {
      const tracks = await musicKitService.getAlbumTracks(album.id);
      setAlbumTracks(tracks || []);
      setSelectedTracks((tracks || []).map(t => t.id || t.attributes?.playParams?.id));
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const toggleKid = (kidId) => {
    setSelectedKids(prev =>
      prev.includes(kidId)
        ? prev.filter(id => id !== kidId)
        : [...prev, kidId]
    );
  };

  const toggleTrack = (trackId) => {
    setSelectedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const selectAllTracks = () => {
    setSelectedTracks(albumTracks.map(t => t.id || t.attributes?.playParams?.id));
  };

  const deselectAllTracks = () => {
    setSelectedTracks([]);
  };

  const handleAdd = async () => {
    // Require kid selection for both Library and Discover
    if (selectedKids.length === 0) {
      showToast('Please select at least one kid', 'warning');
      return;
    }

    if (destination === 'library' && selectedTracks.length === 0) {
      showToast('Please select at least one song', 'warning');
      return;
    }

    setIsAdding(true);
    try {
      const artworkUrl = album.attributes?.artwork?.url;
      const genres = album.attributes?.genreNames || [];

      if (destination === 'discover') {
        // Add to Discover Pool for selected kids
        await addToDiscover({
          userId: user._id,
          appleAlbumId: album.id,
          albumName: album.attributes?.name || 'Unknown Album',
          artistName: album.attributes?.artistName || 'Unknown Artist',
          artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '600').replace('{h}', '600') : undefined,
          trackCount: album.attributes?.trackCount || albumTracks.length,
          releaseDate: album.attributes?.releaseDate,
          genres,
          kidProfileIds: selectedKids,
          hideArtwork,
        });

        const kidNames = kidProfiles
          .filter(k => selectedKids.includes(k._id))
          .map(k => k.name)
          .join(', ');
        showToast(`Added "${album.attributes?.name}" to Discover for ${kidNames}!`, 'success');
      } else {
        // Add to Kids' Library
        const tracksToAdd = albumTracks.filter(t =>
          selectedTracks.includes(t.id || t.attributes?.playParams?.id)
        );

        // Create the album record
        await approveAlbum({
          userId: user._id,
          appleAlbumId: album.id,
          albumName: album.attributes?.name || 'Unknown Album',
          artistName: album.attributes?.artistName || 'Unknown Artist',
          artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '600').replace('{h}', '600') : undefined,
          trackCount: album.attributes?.trackCount || albumTracks.length,
          releaseYear: album.attributes?.releaseDate,
          genres,
          hideArtwork,
        });

        // Add selected tracks for each selected kid
        for (const kidId of selectedKids) {
          for (const track of tracksToAdd) {
            await approveSong({
              userId: user._id,
              kidProfileId: kidId,
              appleSongId: track.id || track.attributes?.playParams?.id,
              songName: track.attributes?.name || 'Unknown Track',
              artistName: track.attributes?.artistName || album.attributes?.artistName || 'Unknown Artist',
              albumName: album.attributes?.name,
              artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
              durationInMillis: track.attributes?.durationInMillis,
              isExplicit: track.attributes?.contentRating === 'explicit',
            });
          }
        }

        const kidNames = kidProfiles
          .filter(k => selectedKids.includes(k._id))
          .map(k => k.name)
          .join(', ');

        const trackText = selectedTracks.length === albumTracks.length
          ? 'all songs'
          : `${selectedTracks.length} song${selectedTracks.length !== 1 ? 's' : ''}`;

        showToast(`Added ${trackText} from "${album.attributes?.name}" to ${kidNames}'s library!`, 'success');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to add album:', error);
      showToast('Failed to add album. Please try again.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen || !album) return null;

  const explicitCount = albumTracks.filter(t => t.attributes?.contentRating === 'explicit').length;
  const allKidsSelected = selectedKids.length === kidProfiles.length;
  const allTracksSelected = selectedTracks.length === albumTracks.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Compact Album Header */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-4 text-white">
          <div className="flex gap-3 items-center">
            {album.attributes?.artwork ? (
              <img
                src={album.attributes.artwork.url.replace('{w}', '120').replace('{h}', '120')}
                alt={album.attributes.name}
                className="w-14 h-14 rounded-lg shadow-lg flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{album.attributes?.name}</h3>
              <p className="text-white/80 text-sm truncate">{album.attributes?.artistName}</p>
              <p className="text-white/60 text-xs">
                {loadingTracks ? 'Loading...' : `${albumTracks.length} songs`}
                {explicitCount > 0 && !loadingTracks && ` · ${explicitCount} explicit`}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {/* Destination Toggle - NOW VISIBLE AT TOP */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Where do you want to add this?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDestination('library')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  destination === 'library'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className={`w-4 h-4 ${destination === 'library' ? 'text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className={`font-medium text-sm ${destination === 'library' ? 'text-purple-700' : 'text-gray-700'}`}>
                    Library
                  </span>
                  {destination === 'library' && (
                    <svg className="w-4 h-4 text-purple-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className={`text-xs ${destination === 'library' ? 'text-purple-600' : 'text-gray-500'}`}>
                  Add directly to kids
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDestination('discover')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  destination === 'discover'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className={`w-4 h-4 ${destination === 'discover' ? 'text-pink-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className={`font-medium text-sm ${destination === 'discover' ? 'text-pink-700' : 'text-gray-700'}`}>
                    Discover
                  </span>
                  {destination === 'discover' && (
                    <svg className="w-4 h-4 text-pink-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className={`text-xs ${destination === 'discover' ? 'text-pink-600' : 'text-gray-500'}`}>
                  Kids browse & request
                </p>
              </button>
            </div>
          </div>

          {/* Kid Selection (shown for both Library and Discover) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900 text-sm">
                {destination === 'library' ? 'Add to Library for:' : 'Show in Discover for:'}
              </h4>
              {kidProfiles.length > 1 && (
                <button
                  onClick={() => setSelectedKids(allKidsSelected ? [] : kidProfiles.map(k => k._id))}
                  className={`text-xs font-medium ${destination === 'discover' ? 'text-pink-600 hover:text-pink-700' : 'text-purple-600 hover:text-purple-700'}`}
                >
                  {allKidsSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {kidProfiles.map((kid) => (
                <button
                  key={kid._id}
                  onClick={() => toggleKid(kid._id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition ${
                    selectedKids.includes(kid._id)
                      ? destination === 'discover'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white text-xs font-bold`}>
                    {kid.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900 text-sm">{kid.name}</span>
                  {selectedKids.includes(kid._id) && (
                    <svg className={`w-3.5 h-3.5 ${destination === 'discover' ? 'text-pink-600' : 'text-purple-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Hide Artwork Toggle - Prominent placement */}
          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={hideArtwork}
                  onChange={(e) => setHideArtwork(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition ${hideArtwork ? 'bg-orange-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${hideArtwork ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
              <div className="flex-1">
                <span className="font-medium text-gray-900 text-sm">Hide Album Artwork</span>
                <p className="text-xs text-gray-500">Show a music note instead of cover art</p>
              </div>
              {hideArtwork && (
                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              )}
            </label>
          </div>

          {/* Track List - Visible by default */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900 text-sm">
                Songs
                <span className="ml-2 text-gray-500 font-normal">
                  {allTracksSelected ? `All ${albumTracks.length}` : `${selectedTracks.length} of ${albumTracks.length}`}
                </span>
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={selectAllTracks}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAllTracks}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  None
                </button>
              </div>
            </div>

            {loadingTracks ? (
              <div className="flex items-center justify-center py-4">
                <svg className="animate-spin h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-2 max-h-48 overflow-y-auto">
                <div className="space-y-0.5">
                  {albumTracks.map((track, index) => {
                    const trackId = track.id || track.attributes?.playParams?.id;
                    const isSelected = selectedTracks.includes(trackId);
                    const isExplicit = track.attributes?.contentRating === 'explicit';

                    return (
                      <div
                        key={trackId}
                        className={`flex items-center gap-2 p-2 rounded-lg transition ${
                          isSelected ? 'bg-purple-100' : 'hover:bg-gray-100'
                        }`}
                      >
                        {/* Checkbox for selection */}
                        <button
                          onClick={() => toggleTrack(trackId)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <span className="text-xs text-gray-400 w-5 flex-shrink-0">{index + 1}</span>
                        {/* Clickable track name for selection */}
                        <button
                          onClick={() => toggleTrack(trackId)}
                          className={`flex-1 text-sm truncate text-left ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                        >
                          {track.attributes?.name}
                        </button>
                        {isExplicit && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold flex-shrink-0">E</span>
                        )}
                        {/* AI Review button for individual track */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onOpenAIReview?.({
                              id: trackId,
                              resultType: 'song',
                              attributes: {
                                name: track.attributes?.name,
                                artistName: track.attributes?.artistName || album.attributes?.artistName,
                                albumName: album.attributes?.name,
                                artwork: album.attributes?.artwork,
                              },
                            });
                          }}
                          className="p-1 hover:bg-blue-100 rounded transition flex-shrink-0"
                          title="AI Lyrics Review"
                        >
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Review Link */}
          <button
            onClick={() => {
              onClose();
              onOpenAIReview?.(album);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Get AI Album Overview
          </button>
        </div>

        {/* Simplified Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={
                selectedKids.length === 0 ||
                (destination === 'library' && selectedTracks.length === 0) ||
                isAdding ||
                loadingTracks
              }
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm ${
                destination === 'discover' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : destination === 'discover' ? (
                'Add to Discover'
              ) : (
                `Add ${allTracksSelected ? 'All' : selectedTracks.length} Song${selectedTracks.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main AddMusic Component
export default function AddMusic({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Track if a search has been performed
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showPlaylistImport, setShowPlaylistImport] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'albums', 'songs', 'artists'

  // Modal states
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showUnifiedAdd, setShowUnifiedAdd] = useState(false);
  const [modalInitialDestination, setModalInitialDestination] = useState('library'); // Track which destination to pre-select
  const [showAIReview, setShowAIReview] = useState(false);
  const [reviewSong, setReviewSong] = useState(null); // For song lyrics review
  const [showAlbumOverview, setShowAlbumOverview] = useState(false);
  const [albumOverviewData, setAlbumOverviewData] = useState(null); // For album overview

  // Action sheet state - for mobile-friendly tap-to-act pattern
  const [actionSheetItem, setActionSheetItem] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Album Inspector state (new redesigned flow)
  const [showAlbumInspector, setShowAlbumInspector] = useState(false);
  const [inspectorAlbum, setInspectorAlbum] = useState(null);

  // Song preview player state
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [playingTrackMeta, setPlayingTrackMeta] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  // AI Search state
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchError, setAiSearchError] = useState(null);
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiAddingIndex, setAiAddingIndex] = useState(null); // Track which suggestion is being added

  const { showToast } = useToast();

  // AI Search action
  const aiMusicSearch = useAction(api.ai.aiSearch.aiMusicSearch);

  // Get kid profiles
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles, user ? { userId: user._id } : 'skip') || [];

  // Initialize MusicKit
  useEffect(() => {
    const initMusicKit = async () => {
      try {
        await initMusicKitWithTimeout();
        setIsMusicKitReady(true);
      } catch (err) {
        console.error('Failed to initialize MusicKit:', err);
        setIsMusicKitReady(false);
        setSearchError('Apple Music is not connected');
      }
    };
    initMusicKit();
  }, []);

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
    // Initial state
    handleTimeUpdate();

    return () => {
      musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
    };
  }, [playingTrackId]);

  // Play preview handler
  const handlePlayPreview = async (song) => {
    if (!song?.id) return;

    // If same song, toggle pause
    if (playingTrackId === song.id) {
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
      setPlayingTrackId(song.id);
      setPlayingTrackMeta({
        name: song.attributes?.name || 'Unknown',
        artist: song.attributes?.artistName || 'Unknown Artist',
        artworkUrl: song.attributes?.artwork?.url
      });
      setPreviewCurrentTime(0);
      setPreviewDuration(0);

      await musicKitService.playSong(song.id);
    } catch (err) {
      console.error('Preview playback failed:', err);
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

  // Format time helper
  const formatPreviewTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!isMusicKitReady) {
      setSearchError('Apple Music is not connected. Please authorize in Settings.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      // Search for songs, albums, and artists
      const results = await musicKitService.search(searchQuery, { types: 'songs,albums,artists', limit: 25 });
      const songs = results?.data?.results?.songs?.data || [];
      let albums = results?.data?.results?.albums?.data || [];
      const artists = results?.data?.results?.artists?.data || [];

      // Smart album enrichment: If an artist matches the query, fetch their albums
      // This fixes the issue where searching "Rolling Stones" only shows albums NAMED that
      // instead of albums BY that artist
      const queryLower = searchQuery.toLowerCase().trim();

      // Helper to normalize artist names - strips common prefixes like "The", "A", "An"
      const normalizeArtistName = (name) => {
        const lower = name.toLowerCase().trim();
        return lower.replace(/^(the|a|an)\s+/i, '');
      };

      const queryNormalized = normalizeArtistName(queryLower);

      const matchingArtist = artists.find(artist => {
        const artistName = artist.attributes?.name?.toLowerCase() || '';
        const artistNormalized = normalizeArtistName(artistName);

        // Match strategies (handles "Rolling Stones" vs "The Rolling Stones"):
        // 1. Exact match
        // 2. Normalized match (strips "The/A/An")
        // 3. One starts with the other
        // 4. Query substantially contained in artist name (min 3 chars)
        return artistName === queryLower ||
               artistNormalized === queryNormalized ||
               artistName.startsWith(queryLower) ||
               artistNormalized.startsWith(queryNormalized) ||
               queryLower.startsWith(artistName) ||
               queryNormalized.startsWith(artistNormalized) ||
               (queryNormalized.length >= 3 && artistNormalized.includes(queryNormalized));
      });

      if (matchingArtist) {
        try {
          // Fetch the artist's actual albums
          const artistAlbumsData = await musicKitService.getArtistAlbums(matchingArtist.id);
          if (artistAlbumsData && artistAlbumsData.length > 0) {
            // Mark these as artist albums and prioritize them
            const artistAlbums = artistAlbumsData.map(album => ({
              ...album,
              resultType: 'album',
              isArtistAlbum: true // Flag to identify these as from the artist
            }));

            // Filter out text-matched albums that aren't by the matching artist
            // Keep only albums that are either:
            // 1. By the matching artist (artistAlbums)
            // 2. Text-matched albums that are actually by the same artist
            const matchingArtistName = matchingArtist.attributes?.name?.toLowerCase();
            const filteredTextAlbums = albums.filter(album => {
              const albumArtist = album.attributes?.artistName?.toLowerCase() || '';
              return albumArtist.includes(matchingArtistName) || matchingArtistName.includes(albumArtist);
            });

            // Merge artist albums with filtered text albums, deduplicating by ID
            const seenIds = new Set();
            albums = [];

            // Add artist albums first (prioritized)
            for (const album of artistAlbums) {
              if (!seenIds.has(album.id)) {
                seenIds.add(album.id);
                albums.push(album);
              }
            }

            // Then add any filtered text-matched albums that weren't duplicates
            for (const album of filteredTextAlbums) {
              if (!seenIds.has(album.id)) {
                seenIds.add(album.id);
                albums.push({ ...album, resultType: 'album' });
              }
            }
          }
        } catch (artistAlbumError) {
          console.warn('Failed to fetch artist albums, using text search results:', artistAlbumError);
          // Fall back to original text-matched albums
        }
      }

      // Combine into unified list - API returns results in relevance order
      // Interleave results to show most relevant of each type first
      const combined = [];
      const maxLen = Math.max(songs.length, albums.length, artists.length);

      for (let i = 0; i < maxLen; i++) {
        // Artists first (if searching for artist name, this is most relevant)
        if (artists[i]) combined.push({ ...artists[i], resultType: 'artist' });
        // Then albums
        if (albums[i]) combined.push({ ...albums[i], resultType: 'album' });
        // Then songs
        if (songs[i]) combined.push({ ...songs[i], resultType: 'song' });
      }

      setSearchResults(combined);
      setHasSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error?.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setActiveFilter('all');
    setHasSearched(false);
  };

  // AI Search handler
  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) return;

    setIsAiSearching(true);
    setAiSearchError(null);
    try {
      const result = await aiMusicSearch({ query: aiSearchQuery });
      setAiSearchResults(result);
    } catch (error) {
      console.error('AI search failed:', error);
      setAiSearchError(error?.message || 'AI search failed. Please try again.');
    } finally {
      setIsAiSearching(false);
    }
  };

  // Handle clicking a song suggestion - triggers Apple Music search for that song
  const handleAiSongClick = (song) => {
    setSearchQuery(song.searchQuery || `${song.songName} ${song.artistName}`);
    setShowAiSearch(false);
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  // Handle clicking an artist name - search and open artist inspector
  const handleAiArtistClick = async (artistName) => {
    try {
      const results = await musicKitService.search(artistName, {
        types: 'artists',
        limit: 5
      });
      const artists = results?.data?.results?.artists?.data || [];
      if (artists.length > 0) {
        // Find best match
        const artist = artists.find(a =>
          a.attributes?.name?.toLowerCase() === artistName.toLowerCase()
        ) || artists[0];
        setSelectedArtist(artist);
        setShowAiSearch(false);
        showToast(`Exploring ${artist.attributes?.name}'s music`, 'success');
      } else {
        showToast(`Couldn't find artist "${artistName}"`, 'warning');
      }
    } catch (error) {
      console.error('Failed to find artist:', error);
      showToast('Failed to load artist. Try searching manually.', 'error');
    }
  };

  // Handle adding an AI song suggestion directly to library
  const handleAiSuggestionAdd = async (song, index) => {
    if (kidProfiles.length === 0) {
      showToast('Please add a kid profile first', 'warning');
      return;
    }

    setAiAddingIndex(index);
    try {
      // Search Apple Music for this song
      const searchTerm = song.searchQuery || `${song.songName} ${song.artistName}`;
      const results = await musicKitService.search(searchTerm, {
        types: 'songs',
        limit: 5
      });

      const songs = results?.data?.results?.songs?.data || [];
      if (songs.length === 0) {
        showToast(`Couldn't find "${song.songName}" in Apple Music`, 'warning');
        setAiAddingIndex(null);
        return;
      }

      // Find the best match by comparing song and artist names
      const item = songs.find(s =>
        s.attributes?.name?.toLowerCase().includes(song.songName.toLowerCase()) ||
        song.songName.toLowerCase().includes(s.attributes?.name?.toLowerCase())
      ) || songs[0];

      // Add song to all kids' libraries
      const artworkUrl = item.attributes?.artwork?.url;
      for (const kid of kidProfiles) {
        await approveSongMutation({
          userId: user._id,
          kidProfileId: kid._id,
          appleSongId: item.id,
          songName: item.attributes?.name || 'Unknown Song',
          artistName: item.attributes?.artistName || 'Unknown Artist',
          albumName: item.attributes?.albumName,
          artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
          durationInMillis: item.attributes?.durationInMillis,
          isExplicit: item.attributes?.contentRating === 'explicit',
        });
      }
      const kidNames = kidProfiles.length === 1 ? kidProfiles[0].name : `all ${kidProfiles.length} kids`;
      showToast(`Added "${item.attributes?.name}" to ${kidNames}'s library!`, 'success');
    } catch (error) {
      console.error('Failed to add from AI suggestion:', error);
      showToast('Failed to add. Try searching manually.', 'error');
    } finally {
      setAiAddingIndex(null);
    }
  };

  // Handler for tapping a search result item - opens action sheet
  const handleItemTap = (item) => {
    setActionSheetItem(item);
    setShowActionSheet(true);
  };

  const handleAddAlbum = async (album) => {
    // Use new AlbumInspector for albums
    await handleOpenInspector(album);
  };

  // Handler to open modal with Discover pre-selected
  const handleAddToDiscover = async (album) => {
    // Use new AlbumInspector for albums
    await handleOpenInspector(album);
  };

  // Unified handler for adding items (albums or songs)
  const handleAddItem = (item) => {
    if (item.resultType === 'album') {
      handleAddAlbum(item);
    } else if (item.resultType === 'song') {
      handleAddSongToLibrary(item);
    }
  };

  // Quick add handler - adds item to all kids with one tap
  const approveAlbumMutation = useMutation(api.albums.approveAlbum);
  const approveSongMutation = useMutation(api.songs.approveSong);
  const addAlbumToDiscoverMutation = useMutation(api.featured.addAlbumToDiscover);

  const handleQuickAdd = async (item) => {
    if (kidProfiles.length === 0) {
      showToast('Please add a kid profile first', 'warning');
      return;
    }

    setIsQuickAdding(true);
    try {
      const isAlbum = item.resultType === 'album';
      const artworkUrl = item.attributes?.artwork?.url;

      if (isAlbum) {
        // Get album tracks
        const tracks = await musicKitService.getAlbumTracks(item.id);
        const genres = item.attributes?.genreNames || [];

        // Create album record
        await approveAlbumMutation({
          userId: user._id,
          appleAlbumId: item.id,
          albumName: item.attributes?.name || 'Unknown Album',
          artistName: item.attributes?.artistName || 'Unknown Artist',
          artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '600').replace('{h}', '600') : undefined,
          trackCount: item.attributes?.trackCount || (tracks || []).length,
          releaseYear: item.attributes?.releaseDate,
          genres,
        });

        // Add all tracks to all kids
        for (const kid of kidProfiles) {
          for (const track of (tracks || [])) {
            await approveSongMutation({
              userId: user._id,
              kidProfileId: kid._id,
              appleSongId: track.id || track.attributes?.playParams?.id,
              songName: track.attributes?.name || 'Unknown Track',
              artistName: track.attributes?.artistName || item.attributes?.artistName || 'Unknown Artist',
              albumName: item.attributes?.name,
              artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
              durationInMillis: track.attributes?.durationInMillis,
              isExplicit: track.attributes?.contentRating === 'explicit',
            });
          }
        }

        const kidNames = kidProfiles.length === 1 ? kidProfiles[0].name : `all ${kidProfiles.length} kids`;
        showToast(`Added "${item.attributes?.name}" (${(tracks || []).length} songs) to ${kidNames}'s library!`, 'success');
      } else {
        // Add single song to all kids
        for (const kid of kidProfiles) {
          await approveSongMutation({
            userId: user._id,
            kidProfileId: kid._id,
            appleSongId: item.id,
            songName: item.attributes?.name || 'Unknown Song',
            artistName: item.attributes?.artistName || 'Unknown Artist',
            albumName: item.attributes?.albumName,
            artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
            durationInMillis: item.attributes?.durationInMillis,
            isExplicit: item.attributes?.contentRating === 'explicit',
          });
        }

        const kidNames = kidProfiles.length === 1 ? kidProfiles[0].name : `all ${kidProfiles.length} kids`;
        showToast(`Added "${item.attributes?.name}" to ${kidNames}'s library!`, 'success');
      }

      // Close action sheet
      setShowActionSheet(false);
      setActionSheetItem(null);
    } catch (error) {
      console.error('Quick add failed:', error);
      showToast('Failed to add. Please try again.', 'error');
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleAIReview = async (item) => {
    const isAlbum = item.resultType === 'album';

    if (isAlbum) {
      // For albums, use AlbumOverviewModal which gives album-level context
      // Fetch track list for the overview
      try {
        const tracks = await musicKitService.getAlbumTracks(item.id);
        // Format trackList as objects with name, artistName, and contentRating
        const trackList = (tracks || []).map(t => ({
          name: t.attributes?.name || 'Unknown',
          artistName: t.attributes?.artistName || item.attributes?.artistName,
          contentRating: t.attributes?.contentRating || null,
        }));

        setAlbumOverviewData({
          appleAlbumId: item.id,
          albumName: item.attributes?.name,
          artistName: item.attributes?.artistName,
          trackList,
          editorialNotes: item.attributes?.editorialNotes?.standard || item.attributes?.editorialNotes?.short,
        });
        setShowAlbumOverview(true);
      } catch (error) {
        console.error('Failed to fetch tracks for album overview:', error);
        showToast('Failed to load album details', 'error');
      }
    } else {
      // For songs, use ContentReviewModal which analyzes lyrics
      setReviewSong({
        id: item.id,
        name: item.attributes?.name,
        artistName: item.attributes?.artistName,
        albumName: item.attributes?.albumName,
        artworkUrl: item.attributes?.artwork?.url?.replace('{w}', '300').replace('{h}', '300'),
      });
      setShowAIReview(true);
    }
  };

  // State for adding individual songs
  const [addingSongId, setAddingSongId] = useState(null);
  const [showSongKidSelection, setShowSongKidSelection] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songHideArtwork, setSongHideArtwork] = useState(false);
  const [songSelectedKids, setSongSelectedKids] = useState([]);
  const approveSong = useMutation(api.songs.approveSong);

  const handleAddSongToLibrary = (song) => {
    setSelectedSong(song);
    setSongHideArtwork(false);
    setSongSelectedKids(kidProfiles.map(k => k._id)); // Auto-select all kids
    setShowSongKidSelection(true);
  };

  // Handler to open Album Inspector with tracks loaded
  const handleOpenInspector = async (album) => {
    try {
      // Fetch album tracks
      const tracks = await musicKitService.getAlbumTracks(album.id);
      const formattedTracks = (tracks || []).map((t, idx) => ({
        id: t.id,
        name: t.attributes?.name || 'Unknown Track',
        artistName: t.attributes?.artistName || album.attributes?.artistName || 'Unknown Artist',
        duration: t.attributes?.durationInMillis,
        trackNumber: t.attributes?.trackNumber || idx + 1,
        isExplicit: t.attributes?.contentRating === 'explicit',
        aiFlag: null, // Will be set by AI analysis
      }));

      setInspectorAlbum({
        id: album.id,
        name: album.attributes?.name,
        artistName: album.attributes?.artistName,
        artworkUrl: album.attributes?.artwork?.url,
        releaseDate: album.attributes?.releaseDate,
        trackCount: album.attributes?.trackCount || formattedTracks.length,
        tracks: formattedTracks,
      });
      setShowAlbumInspector(true);
    } catch (error) {
      console.error('Failed to load album tracks:', error);
      showToast('Failed to load album. Please try again.', 'error');
    }
  };

  // Handler for adding songs from inspector
  const handleInspectorAddSongs = async ({ album, tracks, destination, kidIds, hideArtwork }) => {
    try {
      const artworkUrl = album.artworkUrl?.replace('{w}', '600').replace('{h}', '600');

      if (destination === 'discover') {
        // Add album to Discover
        await addAlbumToDiscoverMutation({
          userId: user._id,
          appleAlbumId: album.id,
          albumName: album.name,
          artistName: album.artistName,
          artworkUrl,
          trackCount: album.trackCount,
          releaseDate: album.releaseDate,
          kidProfileIds: kidIds,
          hideArtwork,
        });
        showToast(`Added "${album.name}" to Discover!`, 'success');
      } else {
        // Add to Library
        // Create album record first
        await approveAlbumMutation({
          userId: user._id,
          appleAlbumId: album.id,
          albumName: album.name,
          artistName: album.artistName,
          artworkUrl,
          trackCount: album.trackCount,
          releaseYear: album.releaseDate,
        });

        // Add selected songs to selected kids
        for (const kidId of kidIds) {
          for (const track of tracks) {
            await approveSongMutation({
              userId: user._id,
              kidProfileId: kidId,
              appleSongId: track.id,
              songName: track.name,
              artistName: track.artistName,
              albumName: album.name,
              artworkUrl: artworkUrl?.replace('600', '300'),
              durationInMillis: track.duration,
              isExplicit: track.isExplicit,
              hideArtwork,
            });
          }
        }

        const kidCount = kidIds.length;
        const kidText = kidCount === 1 ? '1 kid' : `${kidCount} kids`;
        showToast(`Added ${tracks.length} songs from "${album.name}" to ${kidText}'s library!`, 'success');
      }
    } catch (error) {
      console.error('Failed to add songs from inspector:', error);
      showToast('Failed to add songs. Please try again.', 'error');
    }
  };

  // Artist drill-down state
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistAlbums, setArtistAlbums] = useState([]);
  const [loadingArtistAlbums, setLoadingArtistAlbums] = useState(false);
  const [addingAllArtistAlbums, setAddingAllArtistAlbums] = useState(false);
  const approveAlbumForArtist = useMutation(api.albums.approveAlbum);
  const approveSongForArtist = useMutation(api.songs.approveSong);

  const handleViewArtist = async (artist) => {
    setSelectedArtist(artist);
    setLoadingArtistAlbums(true);
    try {
      // Fetch artist's albums
      const artistId = artist.id;
      const albums = await musicKitService.getArtistAlbums(artistId);
      setArtistAlbums(albums || []);
    } catch (error) {
      console.error('Failed to load artist albums:', error);
      showToast('Failed to load artist albums', 'error');
    } finally {
      setLoadingArtistAlbums(false);
    }
  };

  const handleBackFromArtist = () => {
    setSelectedArtist(null);
    setArtistAlbums([]);
  };

  // Add all albums from an artist at once
  const handleAddAllArtistAlbums = async () => {
    if (artistAlbums.length === 0 || kidProfiles.length === 0) return;

    setAddingAllArtistAlbums(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const album of artistAlbums) {
        try {
          const artworkUrl = album.attributes?.artwork?.url;
          const genres = album.attributes?.genreNames || [];

          // Create album record
          await approveAlbumForArtist({
            userId: user._id,
            appleAlbumId: album.id,
            albumName: album.attributes?.name || 'Unknown Album',
            artistName: album.attributes?.artistName || selectedArtist?.attributes?.name || 'Unknown Artist',
            artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '600').replace('{h}', '600') : undefined,
            trackCount: album.attributes?.trackCount || 0,
            releaseYear: album.attributes?.releaseDate,
            genres,
          });

          // Get tracks for this album
          const tracks = await musicKitService.getAlbumTracks(album.id);

          // Add all tracks for all kids
          for (const kid of kidProfiles) {
            for (const track of (tracks || [])) {
              await approveSongForArtist({
                userId: user._id,
                kidProfileId: kid._id,
                appleSongId: track.id || track.attributes?.playParams?.id,
                songName: track.attributes?.name || 'Unknown Track',
                artistName: track.attributes?.artistName || album.attributes?.artistName || 'Unknown Artist',
                albumName: album.attributes?.name,
                artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
                durationInMillis: track.attributes?.durationInMillis,
                isExplicit: track.attributes?.contentRating === 'explicit',
              });
            }
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to add album ${album.attributes?.name}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast(`Added ${successCount} album${successCount !== 1 ? 's' : ''} to all kids' libraries!`, 'success');
      }
      if (errorCount > 0) {
        showToast(`${errorCount} album${errorCount !== 1 ? 's' : ''} failed to add.`, 'warning');
      }

      handleBackFromArtist();
    } catch (error) {
      console.error('Failed to add all albums:', error);
      showToast('Failed to add albums. Please try again.', 'error');
    } finally {
      setAddingAllArtistAlbums(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Add Music</h2>
        <p className="text-gray-600 text-sm">Search Apple Music or import from playlists</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Apple Music</h3>

        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              inputMode="search"
              placeholder="Search for songs or albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching || !isMusicKitReady}
            className="px-3 sm:px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center gap-2 flex-shrink-0"
          >
            {isSearching ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </button>
        </div>

        {!isMusicKitReady && (
          <p className="text-sm text-orange-600 mt-2">Apple Music is initializing...</p>
        )}

        {searchError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{searchError}</p>
          </div>
        )}

        {/* Empty state - search performed but no results */}
        {hasSearched && searchResults.length === 0 && !isSearching && !searchError && (
          <div className="mt-6 text-center py-12 bg-gray-50 rounded-xl">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h4 className="text-lg font-medium text-gray-700 mb-2">No results found</h4>
            <p className="text-sm text-gray-500 mb-4">
              No music found for "{searchQuery}"
            </p>
            <p className="text-xs text-gray-400">
              Try a different search term or check spelling
            </p>
          </div>
        )}

        {/* Search Results - Modern "Best Match" layout */}
        {searchResults.length > 0 && (
          <SearchResults
            results={searchResults}
            searchQuery={searchQuery}
            onItemTap={handleItemTap}
            onQuickAdd={handleItemTap}
            onPlayPreview={handlePlayPreview}
            playingTrackId={playingTrackId}
            onClear={clearSearch}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        )}
      </div>

      {/* AI Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => setShowAiSearch(!showAiSearch)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">AI Music Finder</h3>
              <p className="text-sm text-gray-600">Describe what you're looking for in plain English</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showAiSearch ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAiSearch && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {/* Example queries */}
            <p className="text-sm text-gray-600 mb-3">Try asking for things like:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                "kid friendly pop hits from the 2000s",
                "calm music for bedtime",
                "upbeat songs for a dance party",
                "educational songs for toddlers"
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setAiSearchQuery(example)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition"
                >
                  "{example}"
                </button>
              ))}
            </div>

            {/* AI Search Input */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <input
                  type="text"
                  placeholder="Describe the music you're looking for..."
                  value={aiSearchQuery}
                  onChange={(e) => setAiSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>
              <button
                onClick={handleAiSearch}
                disabled={!aiSearchQuery.trim() || isAiSearching}
                className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center gap-2 flex-shrink-0"
              >
                {isAiSearching ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Thinking...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="hidden sm:inline">Find Music</span>
                  </>
                )}
              </button>
            </div>

            {aiSearchError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{aiSearchError}</p>
              </div>
            )}

            {/* AI Search Results */}
            {aiSearchResults && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Song Suggestions</h4>
                  <div className="flex items-center gap-2">
                    {aiSearchResults.fromCache && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Cached</span>
                    )}
                    {aiSearchResults.songs?.length > 0 && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded font-medium">
                        {aiSearchResults.songs.length} songs
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata pills */}
                {(aiSearchResults.ageRange || aiSearchResults.era || aiSearchResults.genres?.length > 0) && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {aiSearchResults.ageRange && (
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        Ages {aiSearchResults.ageRange}
                      </span>
                    )}
                    {aiSearchResults.era && (
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        {typeof aiSearchResults.era === 'string' ? aiSearchResults.era : ''}
                      </span>
                    )}
                    {aiSearchResults.genres?.map((genre, i) => (
                      <span key={i} className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Song list */}
                {aiSearchResults.songs?.length > 0 && (
                  <div className="space-y-2">
                    {aiSearchResults.songs.map((song, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition group"
                      >
                        {/* Song icon */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>

                        {/* Song info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAiSongClick(song)}
                              className="font-medium text-gray-900 hover:text-purple-700 truncate text-left"
                            >
                              {song.songName}
                            </button>
                            {song.year && (
                              <span className="text-xs text-gray-400 flex-shrink-0">{song.year}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleAiArtistClick(song.artistName)}
                            className="text-sm text-purple-600 hover:text-purple-800 hover:underline truncate block text-left"
                          >
                            {song.artistName}
                          </button>
                          {song.reason && (
                            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{song.reason}</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Search button */}
                          <button
                            onClick={() => handleAiSongClick(song)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition opacity-0 group-hover:opacity-100"
                            title="Search in Apple Music"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                          {/* Add button */}
                          <button
                            onClick={() => handleAiSuggestionAdd(song, i)}
                            disabled={aiAddingIndex === i}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                            title="Add to library"
                          >
                            {aiAddingIndex === i ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="hidden sm:inline">Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback for old format (suggestions array) */}
                {!aiSearchResults.songs?.length && aiSearchResults.suggestions?.length > 0 && (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    Found {aiSearchResults.suggestions.length} suggestions. Try a new search for better results.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => setShowPlaylistImport(!showPlaylistImport)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">Import from Playlist</h3>
              <p className="text-sm text-gray-600">Import albums from your Apple Music playlists</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showPlaylistImport ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showPlaylistImport && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <PlaylistImport user={user} />
          </div>
        )}
      </div>

      {/* Unified Add Modal */}
      <UnifiedAddModal
        isOpen={showUnifiedAdd}
        onClose={() => {
          setShowUnifiedAdd(false);
          setSelectedAlbum(null);
        }}
        album={selectedAlbum}
        user={user}
        kidProfiles={kidProfiles}
        initialDestination={modalInitialDestination}
        onSuccess={() => {
          // Optionally clear search or provide feedback
        }}
        onOpenAIReview={(item) => {
          // Call handleAIReview - routes albums to AlbumOverviewModal, songs to ContentReviewModal
          // Preserve the resultType if already set, otherwise default to 'album' for backwards compat
          handleAIReview({ ...item, resultType: item.resultType || 'album' });
        }}
      />

      {/* Song AI Review Modal (lyrics analysis) */}
      {showAIReview && reviewSong && (
        <ContentReviewModal
          isOpen={showAIReview}
          onClose={() => {
            setShowAIReview(false);
            setReviewSong(null);
          }}
          content={{
            type: 'song',
            appleSongId: reviewSong.id,
            songName: reviewSong.name,
            artistName: reviewSong.artistName,
            artworkUrl: reviewSong.artworkUrl,
          }}
        />
      )}

      {/* Album Overview Modal (album-level AI analysis) */}
      <AlbumOverviewModal
        isOpen={showAlbumOverview}
        onClose={() => {
          setShowAlbumOverview(false);
          setAlbumOverviewData(null);
        }}
        albumData={albumOverviewData}
      />

      {/* Song Add Modal - Redesigned with hide artwork and multi-kid selection */}
      {showSongKidSelection && selectedSong && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSongKidSelection(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Song Header */}
            <div className="bg-gradient-to-br from-pink-600 to-rose-600 p-4 text-white">
              <div className="flex gap-3 items-center">
                {selectedSong.attributes?.artwork ? (
                  <img
                    src={selectedSong.attributes.artwork.url.replace('{w}', '120').replace('{h}', '120')}
                    alt={selectedSong.attributes.name}
                    className="w-14 h-14 rounded-lg shadow-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{selectedSong.attributes?.name}</h3>
                  <p className="text-white/80 text-sm truncate">{selectedSong.attributes?.artistName}</p>
                  {selectedSong.attributes?.albumName && (
                    <p className="text-white/60 text-xs truncate">{selectedSong.attributes.albumName}</p>
                  )}
                </div>
                <button onClick={() => setShowSongKidSelection(false)} className="p-1.5 hover:bg-white/20 rounded-full transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Kid Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">Add to Library for:</h4>
                  {kidProfiles.length > 1 && (
                    <button
                      onClick={() => setSongSelectedKids(
                        songSelectedKids.length === kidProfiles.length ? [] : kidProfiles.map(k => k._id)
                      )}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {songSelectedKids.length === kidProfiles.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {kidProfiles.map((kid) => {
                    const colorClass = COLORS.find(c => c.id === kid.color)?.class || 'bg-purple-500';
                    const isSelected = songSelectedKids.includes(kid._id);
                    return (
                      <button
                        key={kid._id}
                        onClick={() => setSongSelectedKids(prev =>
                          prev.includes(kid._id)
                            ? prev.filter(id => id !== kid._id)
                            : [...prev, kid._id]
                        )}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full ${colorClass} flex items-center justify-center text-white text-xs font-bold`}>
                          {kid.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{kid.name}</span>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hide Artwork Toggle */}
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={songHideArtwork}
                      onChange={(e) => setSongHideArtwork(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition ${songHideArtwork ? 'bg-orange-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${songHideArtwork ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 text-sm">Hide Album Artwork</span>
                    <p className="text-xs text-gray-500">Show a music note instead</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSongKidSelection(false);
                    setSelectedSong(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (songSelectedKids.length === 0) {
                      showToast('Please select at least one kid', 'warning');
                      return;
                    }
                    setAddingSongId('adding');
                    try {
                      const artworkUrl = selectedSong.attributes?.artwork?.url;
                      for (const kidId of songSelectedKids) {
                        await approveSong({
                          userId: user._id,
                          kidProfileId: kidId,
                          appleSongId: selectedSong.id,
                          songName: selectedSong.attributes?.name || 'Unknown Song',
                          artistName: selectedSong.attributes?.artistName || 'Unknown Artist',
                          albumName: selectedSong.attributes?.albumName,
                          artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
                          durationInMillis: selectedSong.attributes?.durationInMillis,
                          isExplicit: selectedSong.attributes?.contentRating === 'explicit',
                          hideArtwork: songHideArtwork,
                        });
                      }
                      const kidNames = kidProfiles
                        .filter(k => songSelectedKids.includes(k._id))
                        .map(k => k.name)
                        .join(', ');
                      showToast(`Added "${selectedSong.attributes?.name}" to ${kidNames}'s library!`, 'success');
                      setShowSongKidSelection(false);
                      setSelectedSong(null);
                    } catch (error) {
                      console.error('Failed to add song:', error);
                      showToast('Failed to add song. Please try again.', 'error');
                    } finally {
                      setAddingSongId(null);
                    }
                  }}
                  disabled={addingSongId || songSelectedKids.length === 0}
                  className="flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-xl font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm"
                >
                  {addingSongId ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    `Add Song`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artist Albums Modal */}
      {selectedArtist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleBackFromArtist}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Artist Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-4">
                {selectedArtist.attributes?.artwork ? (
                  <img
                    src={selectedArtist.attributes.artwork.url.replace('{w}', '200').replace('{h}', '200')}
                    alt={selectedArtist.attributes.name}
                    className="w-20 h-20 rounded-full shadow-lg flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xl truncate">{selectedArtist.attributes?.name}</h3>
                  <p className="text-white/80 text-sm">
                    {loadingArtistAlbums ? 'Loading albums...' : `${artistAlbums.length} albums`}
                  </p>
                </div>
                <button
                  onClick={handleBackFromArtist}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Add All Banner */}
            {!loadingArtistAlbums && artistAlbums.length > 0 && kidProfiles.length > 0 && (
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-purple-700 min-w-0">
                    <span className="font-medium">Quick add:</span> {artistAlbums.length} album{artistAlbums.length !== 1 ? 's' : ''} → {kidProfiles.length === 1 ? kidProfiles[0].name : `all ${kidProfiles.length} kids`}
                  </div>
                  <button
                    onClick={handleAddAllArtistAlbums}
                    disabled={addingAllArtistAlbums}
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium flex items-center gap-1 flex-shrink-0"
                  >
                    {addingAllArtistAlbums ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add All
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Albums List */}
            <div className="overflow-y-auto max-h-[55vh]">
              {loadingArtistAlbums ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : artistAlbums.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No albums found for this artist
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {artistAlbums.map((album) => (
                    <div
                      key={album.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition"
                    >
                      {album.attributes?.artwork ? (
                        <img
                          src={album.attributes.artwork.url.replace('{w}', '100').replace('{h}', '100')}
                          alt={album.attributes.name}
                          className="w-12 h-12 rounded-lg object-cover shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 truncate">{album.attributes?.name}</h5>
                        <p className="text-sm text-gray-500">
                          {album.attributes?.releaseDate?.slice(0, 4)}
                          {album.attributes?.trackCount && ` · ${album.attributes.trackCount} tracks`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            handleBackFromArtist();
                            handleAddAlbum({ ...album, resultType: 'album' });
                          }}
                          className="px-3 py-1.5 border-2 border-purple-600 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition font-medium flex items-center gap-1"
                        >
                          Review & Add
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Sheet - Mobile-friendly bottom sheet for item actions */}
      <ActionSheet
        isOpen={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setActionSheetItem(null);
        }}
        item={actionSheetItem}
        onAdd={handleAddItem}
        onAddToDiscover={handleAddToDiscover}
        onAIReview={handleAIReview}
        onViewArtist={handleViewArtist}
        onQuickAdd={handleQuickAdd}
        kidProfiles={kidProfiles}
        isQuickAdding={isQuickAdding}
      />

      {/* Album Inspector - New redesigned flow */}
      <AlbumInspector
        isOpen={showAlbumInspector}
        onClose={() => {
          setShowAlbumInspector(false);
          setInspectorAlbum(null);
        }}
        album={inspectorAlbum}
        kidProfiles={kidProfiles}
        onAddSongs={handleInspectorAddSongs}
      />

      {/* Song Preview Popup */}
      {playingTrackId && playingTrackMeta && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => {
            musicKitService.stop();
            setPlayingTrackId(null);
            setPlayingTrackMeta(null);
          }}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-5 mx-4 max-w-xs w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Track Info */}
            <div className="flex items-center gap-3 mb-4">
              {playingTrackMeta.artworkUrl ? (
                <img
                  src={playingTrackMeta.artworkUrl.replace('{w}', '100').replace('{h}', '100')}
                  alt={playingTrackMeta.name}
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
                <p className="font-semibold text-white truncate">{playingTrackMeta.name}</p>
                <p className="text-sm text-gray-400 truncate">{playingTrackMeta.artist}</p>
              </div>
            </div>

            {/* Seekable Progress Bar */}
            {previewDuration > 0 && (
              <div className="mb-4">
                <div
                  className="h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                  onClick={handlePreviewSeek}
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
              onClick={() => {
                musicKitService.stop();
                setPlayingTrackId(null);
                setPlayingTrackMeta(null);
              }}
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
