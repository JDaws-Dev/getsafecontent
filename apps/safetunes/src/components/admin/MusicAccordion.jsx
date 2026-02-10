import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import musicKitService from '../../config/musickit';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getAvatarIcon = (avatarId) => {
  const icon = AVATAR_ICONS.find(a => a.id === avatarId);
  return icon ? icon.svg : AVATAR_ICONS[0].svg;
};

const getColorClass = (colorId) => {
  const color = COLORS.find(c => c.id === colorId);
  return color ? color.class : COLORS[0].class;
};

const formatDuration = (ms) => {
  if (!ms) return '';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================
// KID STATUS PILLS - Shows which kids have access
// ============================================
function KidStatusPills({ kidProfiles, accessibleKidIds = [], size = 'sm' }) {
  const hasAccess = accessibleKidIds.length > 0;
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm';

  if (!hasAccess || kidProfiles.length === 0) {
    return (
      <div className="flex items-center gap-0.5">
        <span className={`${sizeClass} rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold`}>
          —
        </span>
      </div>
    );
  }

  // Show up to 3 kid initials
  const kidsToShow = kidProfiles.filter(kid => accessibleKidIds.includes(kid._id)).slice(0, 3);
  const remaining = accessibleKidIds.length - kidsToShow.length;

  return (
    <div className="flex items-center -space-x-1">
      {kidsToShow.map((kid) => (
        <div
          key={kid._id}
          className={`${sizeClass} rounded-full ${getColorClass(kid.color)} flex items-center justify-center font-bold text-white ring-2 ring-white shadow-sm`}
          title={kid.name}
        >
          {kid.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {remaining > 0 && (
        <span className={`${sizeClass} rounded-full bg-gray-500 text-white flex items-center justify-center font-bold ring-2 ring-white`}>
          +{remaining}
        </span>
      )}
    </div>
  );
}

// ============================================
// KID TOGGLE MATRIX - Per-kid access toggles
// ============================================
function KidToggleMatrix({ kidProfiles, accessibleKidIds = [], onToggle, isLoading = false }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kid Access</p>
      <div className="space-y-2">
        {kidProfiles.map((kid) => {
          const hasAccess = accessibleKidIds.includes(kid._id);
          return (
            <button
              key={kid._id}
              onClick={() => !isLoading && onToggle(kid._id, !hasAccess)}
              disabled={isLoading}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                hasAccess
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200'
                  : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
              } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-1.5 shadow-sm`}>
                  {getAvatarIcon(kid.avatar)}
                </div>
                <span className="font-medium text-gray-900">{kid.name}</span>
              </div>
              {/* Toggle Switch */}
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  hasAccess ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    hasAccess ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// AUDIO PREVIEW PLAYER
// ============================================
function AudioPreviewPlayer({ songId, songName, artworkUrl, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const progressInterval = useRef(null);

  const startPlayback = useCallback(async () => {
    setIsLoading(true);
    try {
      await musicKitService.playSong(songId);
      setIsPlaying(true);

      // Start progress tracking
      progressInterval.current = setInterval(() => {
        const state = musicKitService.getPlaybackState();
        if (state) {
          setCurrentTime(state.currentPlaybackTime || 0);
          setDuration(state.currentPlaybackDuration || 0);
        }
      }, 500);
    } catch (error) {
      console.error('Playback failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [songId]);

  const stopPlayback = useCallback(() => {
    musicKitService.stop();
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;
    musicKitService.seekTo(newTime);
    setCurrentTime(newTime);
  }, [duration]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-4">
        {/* Artwork */}
        {artworkUrl ? (
          <img
            src={artworkUrl.replace('{w}', '80').replace('{h}', '80')}
            alt={songName}
            className="w-14 h-14 rounded-lg object-cover shadow-md"
          />
        ) : (
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}

        {/* Controls & Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate text-sm">{songName}</p>

          {/* Progress Bar */}
          <div
            onClick={handleSeek}
            className="mt-2 h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden group"
          >
            <div
              className="h-full bg-purple-400 rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md transition" />
            </div>
          </div>

          {/* Time */}
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{formatDuration(currentTime * 1000)}</span>
            <span>{formatDuration(duration * 1000)}</span>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={isPlaying ? stopPlayback : startPlayback}
          disabled={isLoading}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="w-5 h-5 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isPlaying ? (
            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-purple-600 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={() => {
            stopPlayback();
            onClose?.();
          }}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// SMART ROW - Collapsed accordion state
// ============================================
export function SmartRow({
  id,
  type = 'song', // 'song', 'album', 'playlist', 'discover'
  title,
  subtitle,
  artworkUrl,
  hideArtwork = false,
  kidProfiles = [],
  accessibleKidIds = [],
  isExpanded = false,
  onClick,
  badge = null,
  rightContent = null,
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
        isExpanded
          ? 'bg-purple-50 border-l-4 border-purple-500'
          : 'hover:bg-gray-50 border-l-4 border-transparent'
      }`}
      style={{ minHeight: '60px', maxHeight: '60px' }}
    >
      {/* Artwork (40px) */}
      <div className="flex-shrink-0">
        {hideArtwork ? (
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        ) : artworkUrl ? (
          <img
            src={artworkUrl.replace('{w}', '80').replace('{h}', '80')}
            alt={title}
            className="w-10 h-10 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}
      </div>

      {/* Title & Subtitle (truncated) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 truncate text-sm">{title}</p>
          {badge && (
            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-bold flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>

      {/* Right: Kid Status Pills or custom content */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {rightContent || (
          <KidStatusPills
            kidProfiles={kidProfiles}
            accessibleKidIds={accessibleKidIds}
          />
        )}

        {/* Chevron indicator */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );
}

// ============================================
// CONTROL PANEL - Expanded accordion state
// ============================================
export function ControlPanel({
  type = 'song', // 'song', 'album', 'discover'
  item,
  user,
  kidProfiles = [],
  accessibleKidIds = [],
  onToggleKid,
  onToggleArtwork,
  onDelete,
  onAddToDiscover, // For library items
  onRemoveFromDiscover, // For discover items
  showPreview = true,
  isLoading = false,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreviewPlayer, setShowPreviewPlayer] = useState(false);
  const [localHideArtwork, setLocalHideArtwork] = useState(item?.hideArtwork || false);

  // Sync local state with item prop
  useEffect(() => {
    setLocalHideArtwork(item?.hideArtwork || false);
  }, [item?.hideArtwork]);

  const handleToggleArtwork = async () => {
    const newValue = !localHideArtwork;
    setLocalHideArtwork(newValue); // Optimistic update
    try {
      await onToggleArtwork?.(newValue);
    } catch (error) {
      setLocalHideArtwork(!newValue); // Revert on error
      console.error('Failed to toggle artwork:', error);
    }
  };

  return (
    <div className="bg-gray-50 border-l-4 border-purple-500 px-4 py-4 space-y-4">
      {/* Top Section: Larger artwork + Preview */}
      <div className="flex items-start gap-4">
        {/* Larger Artwork (100px) */}
        <div className="flex-shrink-0">
          {localHideArtwork ? (
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          ) : item?.artworkUrl ? (
            <img
              src={item.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
              alt={item.songName || item.albumName}
              className="w-24 h-24 rounded-xl object-cover shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}
        </div>

        {/* Song Metadata + Play Button */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg leading-tight">
            {item?.songName || item?.albumName}
          </h3>
          <p className="text-gray-600 text-sm mt-0.5">{item?.artistName}</p>
          {item?.albumName && type === 'song' && (
            <p className="text-gray-500 text-xs mt-1 truncate">{item.albumName}</p>
          )}
          {item?.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.genres.filter(g => g !== 'Music').slice(0, 2).map(genre => (
                <span key={genre} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Preview Button */}
          {showPreview && type === 'song' && (
            <button
              onClick={() => setShowPreviewPlayer(!showPreviewPlayer)}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play Preview
            </button>
          )}
        </div>
      </div>

      {/* Audio Preview Player (conditionally shown) */}
      {showPreviewPlayer && type === 'song' && (
        <AudioPreviewPlayer
          songId={item?.appleSongId}
          songName={item?.songName}
          artworkUrl={item?.artworkUrl}
          onClose={() => setShowPreviewPlayer(false)}
        />
      )}

      {/* Middle Section: Kid Access Matrix */}
      {kidProfiles.length > 0 && (
        <KidToggleMatrix
          kidProfiles={kidProfiles}
          accessibleKidIds={accessibleKidIds}
          onToggle={onToggleKid}
          isLoading={isLoading}
        />
      )}

      {/* Bottom Section: Global Actions */}
      <div className="space-y-2 pt-2 border-t border-gray-200">
        {/* Toggle Artwork Button */}
        <button
          onClick={handleToggleArtwork}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors ${
            localHideArtwork
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {localHideArtwork ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Show Artwork
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hide Artwork
            </>
          )}
        </button>

        {/* Delete Button */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete {type === 'song' ? 'Song' : type === 'album' ? 'Album' : 'Item'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDelete?.();
                setShowDeleteConfirm(false);
              }}
              className="flex-1 py-3 rounded-lg font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// DISCOVER CONTROL PANEL - For Discover tab items
// ============================================
export function DiscoverControlPanel({
  item,
  user,
  kidProfiles = [],
  accessibleKidIds = [],
  onToggleKid,
  onToggleArtwork,
  onRemoveFromDiscover,
  showPreview = true,
  isLoading = false,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreviewPlayer, setShowPreviewPlayer] = useState(false);
  const [localHideArtwork, setLocalHideArtwork] = useState(item?.hideArtwork || false);
  const [localKids, setLocalKids] = useState(accessibleKidIds);

  // Sync local state
  useEffect(() => {
    setLocalHideArtwork(item?.hideArtwork || false);
    setLocalKids(accessibleKidIds);
  }, [item?.hideArtwork, accessibleKidIds]);

  const handleToggleArtwork = async () => {
    const newValue = !localHideArtwork;
    setLocalHideArtwork(newValue);
    try {
      await onToggleArtwork?.(newValue);
    } catch (error) {
      setLocalHideArtwork(!newValue);
    }
  };

  const handleToggleKid = async (kidId, add) => {
    // Optimistic update
    const newKids = add
      ? [...localKids, kidId]
      : localKids.filter(id => id !== kidId);
    setLocalKids(newKids);

    try {
      await onToggleKid?.(kidId, add, newKids);
    } catch (error) {
      // Revert on error
      setLocalKids(localKids);
    }
  };

  return (
    <div className="bg-pink-50 border-l-4 border-pink-500 px-4 py-4 space-y-4">
      {/* Top Section: Larger artwork + Preview */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {localHideArtwork ? (
            <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-rose-400 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          ) : item?.artworkUrl ? (
            <img
              src={item.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
              alt={item.albumName}
              className="w-24 h-24 rounded-xl object-cover shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-pink-200 text-pink-700 rounded-full text-xs font-medium">In Discover</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg leading-tight mt-1">
            {item?.albumName}
          </h3>
          <p className="text-gray-600 text-sm">{item?.artistName}</p>
          {item?.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.genres.filter(g => g !== 'Music').slice(0, 2).map(genre => (
                <span key={genre} className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs">
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kid Access Section with "All Kids" option */}
      {kidProfiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Who can see this in Discover?</p>
          <div className="space-y-2">
            {/* All Kids Toggle */}
            <button
              onClick={() => handleToggleKid(null, localKids.length !== kidProfiles.length)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                localKids.length === 0 || localKids.length === kidProfiles.length
                  ? 'bg-gradient-to-r from-pink-100 to-rose-100 border border-pink-300'
                  : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold shadow-sm">
                  *
                </div>
                <span className="font-medium text-gray-900">All Kids</span>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  localKids.length === 0 || localKids.length === kidProfiles.length ? 'bg-pink-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    localKids.length === 0 || localKids.length === kidProfiles.length ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Individual Kid Toggles */}
            {kidProfiles.map((kid) => {
              const hasAccess = localKids.length === 0 || localKids.includes(kid._id);
              return (
                <button
                  key={kid._id}
                  onClick={() => handleToggleKid(kid._id, !localKids.includes(kid._id))}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    hasAccess
                      ? 'bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200'
                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                  } ${isLoading ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-1.5 shadow-sm`}>
                      {getAvatarIcon(kid.avatar)}
                    </div>
                    <span className="font-medium text-gray-900">{kid.name}</span>
                  </div>
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      hasAccess ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        hasAccess ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="space-y-2 pt-2 border-t border-pink-200">
        <button
          onClick={handleToggleArtwork}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors ${
            localHideArtwork
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          {localHideArtwork ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Show Artwork
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hide Artwork
            </>
          )}
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove from Discover
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-3 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onRemoveFromDiscover?.();
                setShowDeleteConfirm(false);
              }}
              className="flex-1 py-3 rounded-lg font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ACCORDION LIST - Container for Smart Rows
// ============================================
export function AccordionList({ children, className = '', hasHeader = false }) {
  return (
    <div className={`bg-white shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden ${
      hasHeader ? 'rounded-b-xl border-t-0' : 'rounded-xl'
    } ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// ACCORDION ITEM - Wrapper that handles expand/collapse
// ============================================
export function AccordionItem({
  id,
  expandedId,
  onToggle,
  smartRowProps,
  controlPanelProps,
  type = 'library', // 'library' or 'discover'
}) {
  const isExpanded = expandedId === id;

  return (
    <div>
      <SmartRow
        {...smartRowProps}
        isExpanded={isExpanded}
        onClick={() => onToggle(isExpanded ? null : id)}
      />
      {isExpanded && (
        type === 'discover' ? (
          <DiscoverControlPanel {...controlPanelProps} />
        ) : (
          <ControlPanel {...controlPanelProps} />
        )
      )}
    </div>
  );
}

// ============================================
// PLAYLIST ACCORDION ITEM - With nested song list
// ============================================
export function PlaylistAccordionItem({
  playlist,
  user,
  kidProfiles,
  expandedId,
  onToggle,
  onRename,
  onDelete,
  onRemoveSong,
  onAddSongs,
}) {
  const isExpanded = expandedId === playlist._id;
  const kid = kidProfiles.find(k => k._id === playlist.kidProfileId);
  const firstSongWithArt = playlist.songs?.find(s => s.artworkUrl);

  return (
    <div>
      {/* Collapsed Row */}
      <button
        onClick={() => onToggle(isExpanded ? null : playlist._id)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          isExpanded
            ? 'bg-green-50 border-l-4 border-green-500'
            : 'hover:bg-gray-50 border-l-4 border-transparent'
        }`}
        style={{ minHeight: '60px', maxHeight: '60px' }}
      >
        {/* Artwork */}
        {firstSongWithArt?.artworkUrl ? (
          <img
            src={firstSongWithArt.artworkUrl.replace('{w}', '80').replace('{h}', '80')}
            alt={playlist.name}
            className="w-10 h-10 rounded-lg object-cover shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
        )}

        {/* Title & Subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate text-sm">{playlist.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {playlist.songs?.length || 0} songs • {kid?.name || 'Unknown'}
          </p>
        </div>

        {/* Kid Badge */}
        {kid && (
          <div className={`w-7 h-7 rounded-full ${getColorClass(kid.color)} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-xs">{kid.name.charAt(0)}</span>
          </div>
        )}

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-green-50 border-l-4 border-green-500">
          {/* Playlist Actions */}
          <div className="px-4 py-3 flex items-center gap-2 border-b border-green-200">
            <button
              onClick={() => onAddSongs?.(playlist)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Songs
            </button>
            <button
              onClick={() => {
                const newName = prompt('Enter new playlist name:', playlist.name);
                if (newName && newName.trim() && newName !== playlist.name) {
                  onRename?.(playlist._id, newName.trim());
                }
              }}
              className="p-2.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg transition-colors border border-gray-200"
              title="Rename"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete?.(playlist)}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
              title="Delete Playlist"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Song List */}
          {playlist.songs && playlist.songs.length > 0 ? (
            <div className="divide-y divide-green-100 max-h-72 overflow-y-auto">
              {playlist.songs.map((song, index) => (
                <div
                  key={song.appleSongId}
                  className="group flex items-center gap-3 px-4 py-2 hover:bg-green-100/50"
                >
                  <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{index + 1}</span>
                  {song.artworkUrl ? (
                    <img
                      src={song.artworkUrl.replace('{w}', '40').replace('{h}', '40')}
                      alt={song.songName}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-green-200 to-emerald-200 rounded flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{song.songName}</p>
                    <p className="text-xs text-gray-500 truncate">{song.artistName}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSong?.(playlist._id, song.appleSongId, song.songName);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all flex-shrink-0"
                    title="Remove from playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <svg className="w-12 h-12 mx-auto text-green-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-sm text-gray-500">No songs yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap "Add Songs" to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export helper components that aren't already exported inline
export { KidStatusPills, KidToggleMatrix, AudioPreviewPlayer };
