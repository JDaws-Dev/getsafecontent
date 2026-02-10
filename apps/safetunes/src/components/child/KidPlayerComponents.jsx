import { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Clock,
  Check,
  XCircle,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume1,
  Volume2,
  ListMusic,
  Music,
  MoreHorizontal,
  Disc3,
  Disc,
  User,
  Grid3X3,
  Moon,
  Timer
} from 'lucide-react';
import { SafeTunesLogo } from '../shared/SafeTunesLogo';

// ============================================
// BRAND COLORS & CONSTANTS
// ============================================
// Brand: Purple (#9333ea) to Pink (#ec4899) gradient
// Tailwind: from-purple-600 to-pink-500

// ============================================
// MARQUEE TEXT COMPONENT (for long titles)
// ============================================
export function MarqueeText({ text, className = '', pixelsPerSecond = 50 }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(5);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    // Reset when text changes
    setScrollOffset(0);

    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        const isOverflowing = textWidth > containerWidth;
        setShouldScroll(isOverflowing);
        if (isOverflowing) {
          // Calculate how far to scroll: just enough to reveal the hidden part
          const overflow = textWidth - containerWidth;
          setScrollOffset(overflow + 20); // +20px padding
          // Calculate duration based on scroll distance
          const duration = (overflow + 20) / pixelsPerSecond;
          setAnimationDuration(Math.max(2, duration)); // Minimum 2 seconds
        }
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, pixelsPerSecond]);

  // Animation: scroll to end (40%), pause (20%), scroll back to start (40%)
  // This way the title rests at the BEGINNING where it's readable
  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div
        ref={textRef}
        className="inline-block"
        style={shouldScroll ? {
          animation: `marquee-bounce ${animationDuration * 2.5}s ease-in-out 3`,
        } : {}}
      >
        {text}
      </div>
      <style>{`
        @keyframes marquee-bounce {
          0%, 10% { transform: translateX(0); }
          40%, 60% { transform: translateX(-${scrollOffset}px); }
          90%, 100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 1. REQUEST ROW COMPONENT (iOS-style list item)
// ============================================
export function RequestRow({
  item,
  status = 'pending', // 'pending' | 'approved' | 'denied'
  hideArtwork = false,
  denialReason = null,
  partialApprovalNote = null,
  reviewedAt = null,
  onClick
}) {
  // Safe item access
  const safeItem = item || {};
  const artworkUrl = safeItem.artworkUrl ? safeItem.artworkUrl.replace('{w}', '120').replace('{h}', '120') : '';
  const itemName = safeItem.name || safeItem.songName || safeItem.albumName || 'Unknown';
  const artistName = safeItem.artistName || 'Unknown Artist';

  const statusConfig = {
    pending: {
      icon: Clock,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      label: 'Pending'
    },
    approved: {
      icon: Check,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      label: 'Approved'
    },
    partially_approved: {
      icon: Check,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      label: 'Partially Approved'
    },
    denied: {
      icon: XCircle,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-500',
      label: 'Denied'
    }
  };

  // Ensure we have a valid status string
  const validStatus = typeof status === 'string' && statusConfig[status] ? status : 'pending';
  const config = statusConfig[validStatus];
  const StatusIcon = config.icon;

  // Format date
  const formatDate = function(timestamp) {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  // Early return if somehow config is invalid
  if (!config || !StatusIcon) {
    return (
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <p className="text-gray-500">Unable to display request</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white active:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Album Art */}
        {hideArtwork || !artworkUrl ? (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <SafeTunesLogo className="w-7 h-7 text-white/70" />
          </div>
        ) : (
          <img
            src={artworkUrl}
            alt={itemName}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm"
          />
        )}

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-[15px] truncate leading-tight">
            {String(itemName || 'Unknown')}
          </h3>
          <p className="text-sm text-gray-500 font-medium truncate mt-0.5">
            {String(artistName || 'Unknown Artist')}
          </p>
          {reviewedAt && config && typeof config.label === 'string' && (
            <p className="text-xs text-gray-400 mt-0.5">
              {config.label} {formatDate(reviewedAt)}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <div className={`w-8 h-8 rounded-full ${config.bgColor || 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-4 h-4 ${config.iconColor || 'text-gray-600'}`} />
        </div>
      </div>

      {/* Denial Reason - shown below the row */}
      {validStatus === 'denied' && denialReason && typeof denialReason === 'string' && (
        <div className="px-4 pb-3 -mt-1">
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 ml-[calc(3.5rem+0.75rem)]">
            <p className="text-xs font-medium text-red-800 mb-1">Parent's note:</p>
            <p className="text-sm text-red-700">{String(denialReason)}</p>
          </div>
        </div>
      )}

      {/* Partial Approval Note */}
      {validStatus === 'partially_approved' && partialApprovalNote && typeof partialApprovalNote === 'string' && (
        <div className="px-4 pb-3 -mt-1">
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 ml-[calc(3.5rem+0.75rem)]">
            <p className="text-xs font-medium text-yellow-800 mb-1">Parent's note:</p>
            <p className="text-sm text-yellow-700">{String(partialApprovalNote)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 2. FILTER PILLS COMPONENT
// ============================================
export function FilterPills({
  options = ['All', 'Pending', 'Approved', 'Denied'],
  selected = 'All',
  onChange,
  counts = {} // { All: 10, Pending: 3, Approved: 5, Denied: 2 }
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-1 -mx-1 scrollbar-hide">
      {options.map((option) => {
        const isActive = selected === option;
        const count = counts[option];

        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option}
            {count !== undefined && (
              <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// 3. SEARCH BAR COMPONENT (iOS-style sticky)
// ============================================
export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = "Search Apple Music...",
  isSearching = false
}) {
  return (
    <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-md px-4 py-3 -mx-4 -mt-4 mb-4 border-b border-gray-200/50">
      <form onSubmit={onSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl
                     text-[16px] text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     transition-shadow shadow-sm"
        />
        {value && !isSearching && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent" />
          </div>
        )}
      </form>
    </div>
  );
}

// ============================================
// 4. MINI PLAYER COMPONENT (Frosted Glass)
// ============================================
export function MiniPlayer({
  track,
  isPlaying,
  progress = 0,
  duration = 0,
  onPlayPause,
  onExpand,
  onClose,
  hideArtwork = false
}) {
  if (!track) return null;

  const artworkUrl = track?.artwork?.url?.replace('{w}', '100').replace('{h}', '100')
    || track?.artworkUrl?.replace('{w}', '100').replace('{h}', '100');

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed bottom-16 left-2 right-2 z-50 md:bottom-20 md:left-4 md:right-4">
      <div
        className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <div className="flex items-center gap-2 p-3">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}

          {/* Album Art & Track Info */}
          <div
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            onClick={onExpand}
          >
            {hideArtwork || !artworkUrl ? (
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0">
                <SafeTunesLogo className="w-6 h-6 text-white/70" />
              </div>
            ) : (
              <img
                src={artworkUrl}
                alt={track?.title || track?.name || track?.songName || track?.attributes?.name}
                className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-md"
              />
            )}

            {/* Track Info - with marquee for long titles */}
            <div className="flex-1 min-w-0">
              <MarqueeText
                text={track?.title || track?.name || track?.songName || track?.attributes?.name || 'Unknown Track'}
                className="font-semibold text-gray-900 text-sm"
              />
              <p className="text-xs text-gray-500 truncate">
                {track?.artistName || track?.attributes?.artistName || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" fill="white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              )}
            </button>
            <button
              onClick={onExpand}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Progress indicator line */}
        <div className="h-0.5 bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// 5. FULL SCREEN PLAYER COMPONENT
// ============================================
export function FullScreenPlayer({
  track,
  isPlaying,
  isOpen,
  progress = 0,
  duration = 0,
  volume = 1,
  isShuffleOn = false,
  isRepeatOn = false,
  hideArtwork = false,
  playbackSource = null, // 'discover' | 'library' | null
  // New props for inline content
  queue = [],
  currentQueueIndex = 0,
  lyrics = null,
  lyricsLoading = false,
  // Sleep timer props
  sleepTimer = null, // { minutes: number, endTime: Date } or null
  onSetSleepTimer,
  onCancelSleepTimer,
  onPlayQueueItem,
  onClose,
  onPlayPause,
  onSkipNext,
  onSkipPrevious,
  onSeek,
  onVolumeChange,
  onShuffleToggle,
  onRepeatToggle,
  onOpenLyrics,
  onOpenQueue,
  onMoreOptions
}) {
  const [localProgress, setLocalProgress] = useState(progress);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // null | 'lyrics' | 'queue'
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);

  // Handle animation on open/close
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimatingOut(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  // Handle close with animation
  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimatingOut(false);
      onClose?.();
    }, 300);
  };

  if (!isOpen && !isVisible) return null;

  const artworkUrl = track?.artwork?.url?.replace('{w}', '600').replace('{h}', '600')
    || track?.artworkUrl?.replace('{w}', '600').replace('{h}', '600');

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekStart = () => setIsDragging(true);
  const handleSeekEnd = (e) => {
    setIsDragging(false);
    onSeek?.(parseFloat(e.target.value));
  };
  const handleSeekChange = (e) => setLocalProgress(parseFloat(e.target.value));

  // Get ALL upcoming tracks from queue (not just first 5)
  const upNextTracks = queue.slice(currentQueueIndex + 1);

  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden lg:flex lg:items-center lg:justify-center lg:p-8 transition-all duration-300 ${
      isAnimatingOut ? 'bg-black/0' : 'lg:bg-black/50'
    }`}>
      {/* Container - full screen on mobile, centered modal on desktop */}
      <div className={`w-full h-full lg:w-[480px] lg:h-[90vh] lg:max-h-[800px] lg:rounded-3xl lg:overflow-hidden lg:shadow-2xl relative transition-all duration-300 ease-out ${
        isAnimatingOut
          ? 'translate-y-full opacity-0'
          : 'translate-y-0 opacity-100 animate-player-slide-up'
      }`}>
        {/* Background - blurred artwork or gradient */}
        <div className="absolute inset-0">
          {artworkUrl && !hideArtwork ? (
            <>
              <img
                src={artworkUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110"
              />
              <div className="absolute inset-0 backdrop-blur-3xl bg-black/60" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-purple-800 to-gray-900" />
          )}
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col text-white safe-area-inset overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button
              onClick={handleClose}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition active:scale-95"
            >
              <ChevronDown className="w-7 h-7" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                Now Playing
              </span>
              {playbackSource === 'discover' && (
                <span className="mt-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                  From Discover
                </span>
              )}
            </div>
            <button
              onClick={onMoreOptions}
              className="p-2 -mr-2 hover:bg-white/10 rounded-full transition"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>

          {/* Main Content - scrollable area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            <div className="flex flex-col items-center px-6 flex-1 justify-center pb-4">
              {/* Large Album Artwork - Apple Music style (bigger) */}
              <div className="w-full aspect-square transition-all duration-300 max-w-[85vw] lg:max-w-[320px] mb-6">
                {hideArtwork || !artworkUrl ? (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                    <SafeTunesLogo className="w-28 h-28 text-white/70" />
                  </div>
                ) : (
                  <img
                    src={artworkUrl}
                    alt={track?.title || track?.name}
                    className="w-full h-full rounded-xl object-cover shadow-2xl"
                    style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                  />
                )}
              </div>

              {/* Track Info - with marquee for long titles */}
              <div className="w-full max-w-[85vw] lg:max-w-[350px] mx-auto text-left mb-4">
                <MarqueeText
                  text={track?.title || track?.name || track?.songName || track?.attributes?.name || 'Unknown Track'}
                  className="text-2xl font-bold text-white mb-1"
                />
                <p className="text-lg text-white/70 truncate">
                  {track?.artistName || track?.attributes?.artistName || 'Unknown Artist'}
                </p>
              </div>

              {/* Progress Bar - with larger touch target and visible thumb */}
              <div className="w-full max-w-[85vw] lg:max-w-[350px] mx-auto mb-4">
                <div className="relative group">
                  {/* Invisible larger touch target */}
                  <div className="absolute -top-3 -bottom-3 left-0 right-0 cursor-pointer" />
                  {/* Track background */}
                  <div className="relative h-1 bg-white/30 rounded-full overflow-visible">
                    {/* Progress fill */}
                    <div
                      className="absolute top-0 left-0 h-full bg-white/90 rounded-full transition-all duration-100"
                      style={{ width: `${(localProgress / (duration || 100)) * 100}%` }}
                    />
                    {/* Thumb indicator - visible on drag/hover */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-150 ${
                        isDragging ? 'scale-125 shadow-xl' : 'scale-0 group-hover:scale-100'
                      }`}
                      style={{
                        left: `calc(${(localProgress / (duration || 100)) * 100}% - 8px)`,
                      }}
                    />
                  </div>
                  {/* Actual range input - invisible but captures interaction */}
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={localProgress}
                    onChange={handleSeekChange}
                    onMouseDown={handleSeekStart}
                    onMouseUp={handleSeekEnd}
                    onTouchStart={handleSeekStart}
                    onTouchEnd={handleSeekEnd}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ margin: '-12px 0', height: 'calc(100% + 24px)' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-white/50 mt-2 font-medium">
                  <span>{formatTime(localProgress)}</span>
                  <span>-{formatTime((duration || 0) - localProgress)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="w-full max-w-[85vw] lg:max-w-[350px] mx-auto flex items-center justify-between mb-6">
                {(() => {
                  // Determine if skip buttons should be enabled
                  const canSkipPrevious = currentQueueIndex > 0 || localProgress > 3; // Can go back if there's a previous track or we're >3s into current
                  const canSkipNext = queue.length > 1 && currentQueueIndex < queue.length - 1;

                  return (
                    <>
                      <button
                        onClick={(e) => { onShuffleToggle(); e.currentTarget.blur(); }}
                        className={`player-button p-2 rounded-full transition ${isShuffleOn ? 'text-purple-400' : 'text-white/50 hover:text-white'}`}
                      >
                        <Shuffle className="w-6 h-6" />
                      </button>

                      <button
                        onClick={(e) => { if (canSkipPrevious) { onSkipPrevious(); } e.currentTarget.blur(); }}
                        disabled={!canSkipPrevious}
                        className={`player-button p-2 rounded-full transition ${
                          canSkipPrevious
                            ? 'active:scale-95 text-white'
                            : 'text-white/30 cursor-not-allowed'
                        }`}
                      >
                        <SkipBack className="w-9 h-9" fill={canSkipPrevious ? 'white' : 'rgba(255,255,255,0.3)'} />
                      </button>

                      <button
                        onClick={(e) => { onPlayPause(); e.currentTarget.blur(); }}
                        className="player-button w-18 h-18 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                      >
                        {isPlaying ? (
                          <Pause className="w-14 h-14 text-white" fill="white" />
                        ) : (
                          <Play className="w-14 h-14 text-white ml-1" fill="white" />
                        )}
                      </button>

                      <button
                        onClick={(e) => { if (canSkipNext) { onSkipNext(); } e.currentTarget.blur(); }}
                        disabled={!canSkipNext}
                        className={`player-button p-2 rounded-full transition ${
                          canSkipNext
                            ? 'active:scale-95 text-white'
                            : 'text-white/30 cursor-not-allowed'
                        }`}
                      >
                        <SkipForward className="w-9 h-9" fill={canSkipNext ? 'white' : 'rgba(255,255,255,0.3)'} />
                      </button>

                      <button
                        onClick={(e) => { onRepeatToggle(); e.currentTarget.blur(); }}
                        className={`player-button p-2 rounded-full transition ${isRepeatOn ? 'text-purple-400' : 'text-white/50 hover:text-white'}`}
                      >
                        <Repeat className="w-6 h-6" />
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Volume Slider - Apple Music style with speakers on both ends */}
              <div className="w-full max-w-[85vw] lg:max-w-[350px] flex items-center gap-3 mx-auto mb-6">
                <Volume1 className="w-4 h-4 text-white/50 flex-shrink-0" />
                <div className="flex-1 relative py-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="h-1.5 bg-white/30 rounded-full pointer-events-none"
                    style={{
                      background: `linear-gradient(to right, rgba(255,255,255,0.9) ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%)`
                    }}
                  />
                </div>
                <Volume2 className="w-4 h-4 text-white/50 flex-shrink-0" />
              </div>

              {/* Bottom Icon Row - Apple Music style */}
              <div className="w-full max-w-[85vw] lg:max-w-[350px] mx-auto flex items-center justify-center gap-4 mb-2">
                <button
                  onClick={() => {
                    const newTab = activeTab === 'lyrics' ? null : 'lyrics';
                    setActiveTab(newTab);
                    if (newTab === 'lyrics' && onOpenLyrics) {
                      onOpenLyrics();
                    }
                  }}
                  className={`player-button px-3 py-2 rounded-full transition flex items-center gap-1.5 ${
                    activeTab === 'lyrics'
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Lyrics</span>
                </button>
                <button
                  onClick={() => {
                    const newTab = activeTab === 'queue' ? null : 'queue';
                    setActiveTab(newTab);
                    if (newTab === 'queue' && onOpenQueue) {
                      onOpenQueue();
                    }
                  }}
                  className={`player-button px-3 py-2 rounded-full transition flex items-center gap-1.5 ${
                    activeTab === 'queue'
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <ListMusic className="w-5 h-5" />
                  <span className="text-sm font-medium">Queue</span>
                </button>
                <button
                  onClick={() => setShowSleepTimerModal(true)}
                  className={`player-button px-3 py-2 rounded-full transition flex items-center gap-1.5 ${
                    sleepTimer
                      ? 'bg-indigo-500/30 text-indigo-200'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {sleepTimer ? `${Math.ceil((new Date(sleepTimer.endTime) - new Date()) / 60000)}m` : 'Sleep'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Sheet for Lyrics/Queue - Apple Music style */}
          {activeTab && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
              style={{ maxHeight: '60vh' }}
            >
              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {activeTab === 'lyrics' ? 'Lyrics' : 'Up Next'}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {track?.title || track?.name} • {track?.artistName}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 80px)' }}>
                {activeTab === 'lyrics' && (
                  <div className="p-5">
                    {lyricsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    ) : lyrics ? (
                      <pre className="text-gray-800 text-base whitespace-pre-wrap font-sans leading-relaxed">
                        {lyrics}
                      </pre>
                    ) : (
                      <div className="text-center py-8">
                        <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No lyrics available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'queue' && (
                  <div className="py-2">
                    {upNextTracks.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {upNextTracks.map((item, index) => {
                          const itemArtwork = item?.artwork?.url?.replace('{w}', '80').replace('{h}', '80')
                            || item?.artworkUrl?.replace('{w}', '80').replace('{h}', '80');
                          // Get track name from various possible locations
                          const trackName = item?.title || item?.name || item?.songName || item?.attributes?.name;
                          const artistName = item?.artistName || item?.attributes?.artistName;
                          // Use stable key combining ID with position to prevent DOM reconciliation errors during rapid queue updates
                          const stableKey = `${item.id || item._id || item.appleSongId || 'track'}-pos${index}`;
                          return (
                            <button
                              key={stableKey}
                              onClick={() => onPlayQueueItem?.(currentQueueIndex + 1 + index)}
                              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
                            >
                              {itemArtwork ? (
                                <img
                                  src={itemArtwork}
                                  alt=""
                                  className="w-12 h-12 rounded-lg object-cover shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                  <Music className="w-6 h-6 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-gray-900 font-medium truncate">
                                  {trackName || 'Untitled Track'}
                                </p>
                                <p className="text-gray-500 text-sm truncate">
                                  {artistName || 'Unknown Artist'}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 px-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
                          <ListMusic className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-gray-900 font-semibold mb-1">No songs queued</p>
                        <p className="text-gray-500 text-sm">Play an album or playlist to fill up your queue</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sleep Timer Modal */}
          <SleepTimerModal
            isOpen={showSleepTimerModal}
            onClose={() => setShowSleepTimerModal(false)}
            onSetTimer={onSetSleepTimer}
            activeTimer={sleepTimer}
            onCancelTimer={onCancelSleepTimer}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// 6. LIBRARY TABS COMPONENT (iOS-style pill tabs)
// ============================================
export function LibraryTabs({
  tabs = ['Playlists', 'Artists', 'Albums', 'Songs', 'Genres'],
  selected = 'Albums',
  onChange
}) {
  return (
    <div className="flex flex-wrap gap-2 pb-2">
      {tabs.map((tab) => {
        const isActive = selected === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// 7. ALBUM GRID COMPONENT (2-column grid)
// ============================================
export function AlbumGrid({
  albums = [],
  onAlbumClick,
  onPlayAlbum,
  emptyMessage = "No albums yet"
}) {
  if (albums.length === 0) {
    return (
      <EmptyState
        icon={Disc}
        title="No albums yet"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {albums.map((album) => {
        const artworkUrl = album.artworkUrl?.replace('{w}', '300').replace('{h}', '300');
        return (
          <div
            key={album._id || album.appleAlbumId}
            onClick={() => onAlbumClick?.(album)}
            className="group bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.98]"
          >
            <div className="relative mb-3">
              {album.hideArtwork || !artworkUrl ? (
                <div className="w-full aspect-square bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                  <SafeTunesLogo className="w-12 h-12 text-white/70" />
                </div>
              ) : (
                <img
                  src={artworkUrl}
                  alt={album.albumName}
                  className="w-full aspect-square object-cover rounded-xl shadow-md"
                />
              )}
              {onPlayAlbum && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAlbum(album);
                  }}
                  className="absolute bottom-2 right-2 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                >
                  <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                </button>
              )}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {album.albumName}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {album.artistName}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 8. ARTIST LIST COMPONENT (List with circles)
// ============================================
export function ArtistList({
  artists = [],
  onArtistClick,
  emptyMessage = "No artists yet"
}) {
  if (artists.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="No artists yet"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {artists.map((artist, index) => (
        <div
          key={artist.name}
          onClick={() => onArtistClick?.(artist)}
          className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition cursor-pointer active:bg-gray-100 ${
            index !== artists.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          {/* Circular Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white font-bold text-lg">
              {artist.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>

          {/* Artist Name */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{artist.name}</h3>
            <p className="text-sm text-gray-500">
              {artist.count} {artist.count === 1 ? 'album' : 'albums'}
            </p>
          </div>

          {/* Chevron */}
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// 9. SONG LIST COMPONENT (Standard list)
// ============================================
export function SongList({
  songs = [],
  onPlaySong,
  onSongMenu,
  showShuffleAll = true,
  onShuffleAll,
  emptyMessage = "No songs yet"
}) {
  if (songs.length === 0) {
    return (
      <EmptyState
        icon={Music}
        title="No songs yet"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Shuffle All Button */}
      {showShuffleAll && songs.length > 1 && (
        <button
          onClick={onShuffleAll}
          className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Shuffle className="w-5 h-5" />
          Shuffle All ({songs.length})
        </button>
      )}

      {/* Songs List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {songs.map((song, index) => {
          const artworkUrl = song.artworkUrl?.replace('{w}', '80').replace('{h}', '80');
          return (
            <div
              key={song._id || song.appleSongId || index}
              className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition ${
                index !== songs.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {/* Album Art */}
              {song.hideArtwork || !artworkUrl ? (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0">
                  <SafeTunesLogo className="w-6 h-6 text-white/70" />
                </div>
              ) : (
                <img
                  src={artworkUrl}
                  alt={song.songName || song.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-sm"
                />
              )}

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[15px] text-gray-900 truncate">
                  {song.songName || song.name}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {song.artistName}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {onSongMenu && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSongMenu(song);
                    }}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => onPlaySong?.(song)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-md active:scale-95 transition-transform"
                >
                  <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// 10. GENRE LIST COMPONENT
// ============================================
export function GenreList({
  genres = [],
  onGenreClick,
  emptyMessage = "No genres yet"
}) {
  if (genres.length === 0) {
    return (
      <EmptyState
        icon={Grid3X3}
        title="No genres yet"
        description={emptyMessage}
      />
    );
  }

  // Genre color palette
  const genreColors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
    'from-teal-500 to-cyan-500',
    'from-amber-500 to-orange-500',
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {genres.map((genre, index) => (
        <div
          key={genre.name}
          onClick={() => onGenreClick?.(genre)}
          className={`relative overflow-hidden rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform bg-gradient-to-br ${genreColors[index % genreColors.length]}`}
          style={{ minHeight: '80px' }}
        >
          <h3 className="font-bold text-white text-lg truncate">{genre.name}</h3>
          <p className="text-white/80 text-sm">
            {genre.count} {genre.count === 1 ? 'album' : 'albums'}
          </p>
          {/* Decorative circle */}
          <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// 11. PLAYLIST LIST COMPONENT
// ============================================
export function PlaylistList({
  playlists = [],
  onPlaylistClick,
  onPlayPlaylist,
  emptyMessage = "No playlists yet",
  shouldHidePlaylistArtwork
}) {
  if (playlists.length === 0) {
    return (
      <EmptyState
        icon={ListMusic}
        title="No playlists yet"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-3">
      {playlists.map((playlist) => {
        // Get first song's artwork for playlist cover
        const artworkUrl = playlist.songs?.[0]?.artworkUrl?.replace('{w}', '120').replace('{h}', '120');
        const hideArtwork = shouldHidePlaylistArtwork?.(playlist) || false;

        return (
          <div
            key={playlist._id}
            onClick={() => onPlaylistClick?.(playlist)}
            className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition cursor-pointer active:scale-[0.99]"
          >
            {/* Playlist Cover */}
            {artworkUrl && !hideArtwork ? (
              <img
                src={artworkUrl}
                alt={playlist.name}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0">
                <SafeTunesLogo className="w-7 h-7 text-white/70" />
              </div>
            )}

            {/* Playlist Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{playlist.name}</h3>
              <p className="text-sm text-gray-500">
                {playlist.songs?.length || 0} songs
              </p>
            </div>

            {/* Play Button */}
            {onPlayPlaylist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPlaylist(playlist);
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-md active:scale-95 transition-transform flex-shrink-0"
              >
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 12. EMPTY STATE COMPONENT
// ============================================
export function EmptyState({
  icon: Icon = Music,
  title = "No items found",
  description = "Try searching for something else",
  action,
  actionLabel,
  variant = 'default' // 'default' | 'music' | 'playlist' | 'search' | 'queue'
}) {
  // Check if icon is already a rendered JSX element (not a component reference)
  // React elements have $$typeof === Symbol.for('react.element')
  // forwardRef components have $$typeof === Symbol.for('react.forward_ref') - these should be rendered as <Icon />
  const isRenderedElement = Icon && typeof Icon === 'object' && Icon.$$typeof === Symbol.for('react.element');

  // Choose illustration based on variant
  const renderIllustration = () => {
    switch (variant) {
      case 'music':
        return (
          <div className="relative w-24 h-24 mb-2">
            {/* Animated music notes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Music className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="absolute -top-1 -right-1 animate-bounce" style={{ animationDelay: '0s' }}>
              <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center">
                <span className="text-purple-600 text-xs">♪</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -left-1 animate-bounce" style={{ animationDelay: '0.3s' }}>
              <div className="w-5 h-5 rounded-full bg-pink-200 flex items-center justify-center">
                <span className="text-pink-600 text-xs">♫</span>
              </div>
            </div>
          </div>
        );
      case 'playlist':
        return (
          <div className="relative w-24 h-24 mb-2">
            {/* Stacked cards effect */}
            <div className="absolute top-2 left-2 w-16 h-16 rounded-xl bg-purple-200 transform rotate-6" />
            <div className="absolute top-1 left-1 w-16 h-16 rounded-xl bg-pink-200 transform -rotate-3" />
            <div className="absolute top-0 left-0 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <ListMusic className="w-8 h-8 text-white" />
            </div>
          </div>
        );
      case 'search':
        return (
          <div className="relative w-24 h-24 mb-2">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-dashed border-purple-300 flex items-center justify-center animate-pulse">
                <Search className="w-7 h-7 text-purple-400" />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xs">?</span>
            </div>
          </div>
        );
      case 'queue':
        return (
          <div className="relative w-24 h-24 mb-2">
            {/* Empty queue visual */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <div className="w-14 h-2 rounded-full bg-purple-100" />
              <div className="w-12 h-2 rounded-full bg-pink-100" />
              <div className="w-10 h-2 rounded-full bg-purple-100" />
              <div className="w-8 h-2 rounded-full bg-pink-100 opacity-50" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <ListMusic className="w-4 h-4 text-white" />
            </div>
          </div>
        );
      default:
        return (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
            {isRenderedElement ? (
              // Icon is already a rendered JSX element, render it directly
              Icon
            ) : Icon && typeof Icon === 'function' ? (
              // Icon is a component reference (function), render it as a component
              <Icon className="w-10 h-10 text-purple-400" />
            ) : (
              // Fallback - use Music icon
              <Music className="w-10 h-10 text-purple-400" />
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {renderIllustration()}
      <h3 className="text-lg font-semibold text-gray-900 mb-1 mt-4">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">{description}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-semibold text-sm shadow-lg shadow-purple-200 active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ============================================
// 13. LYRICS MODAL COMPONENT
// ============================================
export function LyricsModal({
  isOpen,
  onClose,
  lyrics,
  isLoading,
  error,
  track
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Lyrics</h2>
              {track && (
                <p className="text-sm text-gray-500">
                  {track.title || track.name} • {track.artistName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-3" />
              <p className="text-gray-500 text-sm">Loading lyrics...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MicVocal className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm text-center">{error}</p>
            </div>
          ) : lyrics ? (
            <div className="whitespace-pre-wrap text-gray-800 text-base leading-relaxed">
              {lyrics}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <MicVocal className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No lyrics available</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================
// 14. QUEUE MODAL COMPONENT (Up Next)
// ============================================
export function QueueModal({
  isOpen,
  onClose,
  queue = [],
  currentIndex = 0,
  onPlayTrack,
  hideArtwork = false
}) {
  if (!isOpen) return null;

  const upNext = queue.slice(currentIndex + 1);
  const currentTrack = queue[currentIndex];

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Up Next</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Now Playing */}
          {currentTrack && (
            <div className="px-6 py-3 bg-purple-50 border-b border-purple-100">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Now Playing</p>
              <div className="flex items-center gap-3">
                {hideArtwork ? (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <img
                    src={currentTrack.attributes?.artwork?.url?.replace('{w}', '100').replace('{h}', '100') || currentTrack.artworkUrl?.replace('{w}', '100').replace('{h}', '100')}
                    alt={currentTrack.attributes?.name || currentTrack.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {currentTrack.attributes?.name || currentTrack.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {currentTrack.attributes?.artistName || currentTrack.artistName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Up Next List */}
          {upNext.length > 0 ? (
            <div className="px-6 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Up Next ({upNext.length})
              </p>
              <div className="space-y-2">
                {upNext.map((track, index) => {
                  const artworkUrl = track.attributes?.artwork?.url?.replace('{w}', '80').replace('{h}', '80')
                    || track.artworkUrl?.replace('{w}', '80').replace('{h}', '80');
                  // Use stable key combining ID with position to prevent DOM reconciliation errors
                  const stableKey = `${track.id || 'track'}-pos${index}`;
                  return (
                    <div
                      key={stableKey}
                      onClick={() => onPlayTrack?.(currentIndex + 1 + index)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                    >
                      <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
                      {hideArtwork || !artworkUrl ? (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0">
                          <SafeTunesLogo className="w-5 h-5 text-white/70" />
                        </div>
                      ) : (
                        <img
                          src={artworkUrl}
                          alt={track.attributes?.name || track.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">
                          {track.attributes?.name || track.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {track.attributes?.artistName || track.artistName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <ListMusic className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm text-center">No more songs in queue</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================
// 15. SONG ACTIONS MODAL (Context Menu)
// ============================================
export function SongActionsModal({
  isOpen,
  onClose,
  track,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onViewAlbum,
  onViewArtist,
  hideArtwork = false,
  // Discover-specific options
  playbackSource = null,
  onAddSongToLibrary,
  onAddAlbumToLibrary,
  onAddArtistToLibrary,
}) {
  if (!isOpen || !track) return null;

  const artworkUrl = track?.artwork?.url?.replace('{w}', '120').replace('{h}', '120')
    || track?.artworkUrl?.replace('{w}', '120').replace('{h}', '120');

  const isFromDiscover = playbackSource === 'discover';

  const actions = [
    // Discover-specific: Add to Library options
    {
      label: 'Add Song to Library',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: () => { onAddSongToLibrary?.(); onClose(); },
      show: isFromDiscover && !!onAddSongToLibrary,
      highlight: true,
    },
    {
      label: 'Add Album to Library',
      icon: <Disc className="w-5 h-5" />,
      onClick: () => { onAddAlbumToLibrary?.(); onClose(); },
      show: isFromDiscover && !!onAddAlbumToLibrary,
      highlight: true,
    },
    {
      label: 'Add Artist to Library',
      icon: <User className="w-5 h-5" />,
      onClick: () => { onAddArtistToLibrary?.(); onClose(); },
      show: isFromDiscover && !!onAddArtistToLibrary,
      highlight: true,
    },
    // Standard options
    {
      label: 'Play Next',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
        </svg>
      ),
      onClick: () => { onPlayNext?.(); onClose(); },
      show: !!onPlayNext
    },
    {
      label: 'Add to Queue',
      icon: <ListMusic className="w-5 h-5" />,
      onClick: () => { onAddToQueue?.(); onClose(); },
      show: !!onAddToQueue
    },
    {
      label: 'Add to Playlist',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => { onAddToPlaylist?.(); onClose(); },
      show: !!onAddToPlaylist
    },
    {
      label: 'View Album',
      icon: <Disc className="w-5 h-5" />,
      onClick: () => { onViewAlbum?.(); onClose(); },
      show: !!onViewAlbum && !isFromDiscover // Hide when playing from Discover (use Add instead)
    },
    {
      label: 'View Artist',
      icon: <User className="w-5 h-5" />,
      onClick: () => { onViewArtist?.(); onClose(); },
      show: !!onViewArtist && !isFromDiscover // Hide when playing from Discover (use Add instead)
    }
  ].filter(action => action.show);

  return (
    <div className="fixed inset-0 z-[160] flex items-end lg:items-center justify-center lg:p-8 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - bottom sheet on mobile, centered on desktop */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl lg:rounded-3xl animate-slide-up lg:animate-scale-in">
        {/* Handle - only on mobile */}
        <div className="flex justify-center py-3 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Track Info Header */}
        <div className="px-6 pb-4 lg:pt-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {hideArtwork || !artworkUrl ? (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <SafeTunesLogo className="w-8 h-8 text-white/70" />
              </div>
            ) : (
              <img
                src={artworkUrl}
                alt={track?.title || track?.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-lg">
                {track?.title || track?.name || 'Unknown Track'}
              </h3>
              <p className="text-gray-500 truncate">
                {track?.artistName || 'Unknown Artist'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions List */}
        <div className="py-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => { action.onClick(); e.currentTarget.blur(); }}
              className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition focus:outline-none focus:ring-0 ${
                action.highlight ? 'bg-purple-50' : ''
              }`}
            >
              <span className={action.highlight ? 'text-purple-600' : 'text-gray-600'}>{action.icon}</span>
              <span className={`font-medium ${action.highlight ? 'text-purple-700' : 'text-gray-900'}`}>{action.label}</span>
              {action.highlight && (
                <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-bold rounded">
                  ADD
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={(e) => { onClose(); e.currentTarget.blur(); }}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition focus:outline-none focus:ring-0"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .lg\\:animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================
// 16. SLEEP TIMER MODAL
// ============================================
export function SleepTimerModal({
  isOpen,
  onClose,
  onSetTimer,
  activeTimer = null, // { minutes: number, endTime: Date } or null
  onCancelTimer
}) {
  if (!isOpen) return null;

  const timerOptions = [
    { label: '5 minutes', minutes: 5 },
    { label: '15 minutes', minutes: 15 },
    { label: '30 minutes', minutes: 30 },
    { label: '45 minutes', minutes: 45 },
    { label: '1 hour', minutes: 60 },
    { label: 'End of track', minutes: -1 }, // Special case
  ];

  // Calculate remaining time if timer is active
  const getRemainingTime = () => {
    if (!activeTimer?.endTime) return null;
    const remaining = Math.max(0, Math.ceil((new Date(activeTimer.endTime) - new Date()) / 1000 / 60));
    return remaining;
  };

  const remainingMinutes = getRemainingTime();

  return (
    <div className="fixed inset-0 z-[170] flex items-end lg:items-center justify-center lg:p-8 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl lg:rounded-3xl animate-slide-up">
        {/* Handle - only on mobile */}
        <div className="flex justify-center py-3 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 lg:pt-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Sleep Timer</h3>
              <p className="text-gray-500 text-sm">
                {activeTimer ? `${remainingMinutes} min remaining` : 'Stop playing after...'}
              </p>
            </div>
          </div>
        </div>

        {/* Timer Options */}
        <div className="py-2">
          {activeTimer ? (
            // Show active timer with cancel option
            <div className="px-6 py-4">
              <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-indigo-600" />
                  <div className="flex-1">
                    <p className="text-indigo-900 font-semibold">Timer Active</p>
                    <p className="text-indigo-600 text-sm">
                      Music will stop in {remainingMinutes} {remainingMinutes === 1 ? 'minute' : 'minutes'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { onCancelTimer?.(); onClose(); }}
                className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition"
              >
                Cancel Timer
              </button>
            </div>
          ) : (
            // Show timer options
            timerOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => { onSetTimer?.(option.minutes); onClose(); }}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-900">{option.label}</span>
              </button>
            ))
          )}
        </div>

        {/* Cancel Button */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
          >
            {activeTimer ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================
// 17. DEMO/PREVIEW COMPONENT
// ============================================
export function KidPlayerDemo() {
  const [activeView, setActiveView] = useState('requests'); // 'requests' | 'library'
  const [filter, setFilter] = useState('All');
  const [searchValue, setSearchValue] = useState('');
  const [librarySearchValue, setLibrarySearchValue] = useState('');
  const [libraryTab, setLibraryTab] = useState('Albums');
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(45);
  const [volume, setVolume] = useState(0.7);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isRepeatOn, setIsRepeatOn] = useState(false);

  // Demo data - Requests
  const demoRequests = [
    { id: 1, name: 'Blinding Lights', artistName: 'The Weeknd', status: 'approved', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3e/04/a5/3e04a5cd-2074-a8fc-1a25-ea9b9a53ce20/20UMGIM02628.rgb.jpg/{w}x{h}bb.jpg', reviewedAt: Date.now() - 86400000 },
    { id: 2, name: 'Anti-Hero', artistName: 'Taylor Swift', status: 'pending', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/93/1133939d-f461-91f6-d309-d5c72a72f26d/22UM1IM00869.rgb.jpg/{w}x{h}bb.jpg' },
    { id: 3, name: 'Flowers', artistName: 'Miley Cyrus', status: 'denied', artworkUrl: null, denialReason: 'This song has some inappropriate lyrics. Maybe when you\'re a bit older!', reviewedAt: Date.now() - 172800000 },
    { id: 4, name: 'Midnights (Album)', artistName: 'Taylor Swift', status: 'partially_approved', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/93/1133939d-f461-91f6-d309-d5c72a72f26d/22UM1IM00869.rgb.jpg/{w}x{h}bb.jpg', partialApprovalNote: 'I approved most songs but skipped a few that weren\'t appropriate.', reviewedAt: Date.now() - 43200000 },
    { id: 5, name: 'Bad Habit', artistName: 'Steve Lacy', status: 'pending', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/eb/2c/b5/eb2cb5e4-6378-23a3-5e91-b2e9a65e7e19/196589245724.jpg/{w}x{h}bb.jpg' },
  ];

  // Demo data - Library
  const demoAlbums = [
    { _id: '1', albumName: 'After Hours', artistName: 'The Weeknd', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3e/04/a5/3e04a5cd-2074-a8fc-1a25-ea9b9a53ce20/20UMGIM02628.rgb.jpg/{w}x{h}bb.jpg' },
    { _id: '2', albumName: 'Midnights', artistName: 'Taylor Swift', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/93/1133939d-f461-91f6-d309-d5c72a72f26d/22UM1IM00869.rgb.jpg/{w}x{h}bb.jpg' },
    { _id: '3', albumName: 'Gemini Rights', artistName: 'Steve Lacy', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/eb/2c/b5/eb2cb5e4-6378-23a3-5e91-b2e9a65e7e19/196589245724.jpg/{w}x{h}bb.jpg' },
    { _id: '4', albumName: 'Endless Summer Vacation', artistName: 'Miley Cyrus', hideArtwork: true },
    { _id: '5', albumName: 'SOS', artistName: 'SZA', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/7c/0e/08/7c0e08be-8c5d-9c94-3dfc-ba5f1e0b8ad0/196589440259.jpg/{w}x{h}bb.jpg' },
    { _id: '6', albumName: 'Un Verano Sin Ti', artistName: 'Bad Bunny', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/3e/04/eb/3e04ebf6-370f-f59d-ec84-2c2643db92f1/196626945068.jpg/{w}x{h}bb.jpg' },
  ];

  const demoArtists = [
    { name: 'The Weeknd', count: 3 },
    { name: 'Taylor Swift', count: 5 },
    { name: 'Steve Lacy', count: 1 },
    { name: 'SZA', count: 2 },
    { name: 'Bad Bunny', count: 4 },
  ];

  const demoSongs = [
    { _id: 's1', songName: 'Blinding Lights', artistName: 'The Weeknd', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3e/04/a5/3e04a5cd-2074-a8fc-1a25-ea9b9a53ce20/20UMGIM02628.rgb.jpg/{w}x{h}bb.jpg' },
    { _id: 's2', songName: 'Anti-Hero', artistName: 'Taylor Swift', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/93/1133939d-f461-91f6-d309-d5c72a72f26d/22UM1IM00869.rgb.jpg/{w}x{h}bb.jpg' },
    { _id: 's3', songName: 'Bad Habit', artistName: 'Steve Lacy', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/eb/2c/b5/eb2cb5e4-6378-23a3-5e91-b2e9a65e7e19/196589245724.jpg/{w}x{h}bb.jpg' },
    { _id: 's4', songName: 'Kill Bill', artistName: 'SZA', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/7c/0e/08/7c0e08be-8c5d-9c94-3dfc-ba5f1e0b8ad0/196589440259.jpg/{w}x{h}bb.jpg' },
    { _id: 's5', songName: 'Flowers', artistName: 'Miley Cyrus', hideArtwork: true },
  ];

  const demoGenres = [
    { name: 'Pop', count: 12 },
    { name: 'R&B/Soul', count: 8 },
    { name: 'Hip-Hop', count: 6 },
    { name: 'Rock', count: 4 },
    { name: 'Latin', count: 5 },
    { name: 'Electronic', count: 3 },
  ];

  const demoPlaylists = [
    { _id: 'p1', name: 'My Favorites', songs: demoSongs.slice(0, 3) },
    { _id: 'p2', name: 'Chill Vibes', songs: demoSongs.slice(2, 5) },
    { _id: 'p3', name: 'Workout Mix', songs: [] },
  ];

  const demoTrack = {
    title: 'Blinding Lights',
    artistName: 'The Weeknd',
    artwork: {
      url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3e/04/a5/3e04a5cd-2074-a8fc-1a25-ea9b9a53ce20/20UMGIM02628.rgb.jpg/{w}x{h}bb.jpg'
    }
  };

  const counts = {
    All: demoRequests.length,
    Pending: demoRequests.filter(r => r.status === 'pending').length,
    Approved: demoRequests.filter(r => r.status === 'approved' || r.status === 'partially_approved').length,
    Denied: demoRequests.filter(r => r.status === 'denied').length,
  };

  const filteredRequests = filter === 'All'
    ? demoRequests
    : filter === 'Approved'
      ? demoRequests.filter(r => r.status === 'approved' || r.status === 'partially_approved')
      : demoRequests.filter(r => r.status === filter.toLowerCase());

  // Simulate progress
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress(p => (p >= 200 ? 0 : p + 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Render Library content based on selected tab
  const renderLibraryContent = () => {
    switch (libraryTab) {
      case 'Albums':
        return (
          <AlbumGrid
            albums={demoAlbums}
            onAlbumClick={(album) => console.log('Album clicked:', album.albumName)}
            onPlayAlbum={(album) => console.log('Play album:', album.albumName)}
          />
        );
      case 'Artists':
        return (
          <ArtistList
            artists={demoArtists}
            onArtistClick={(artist) => console.log('Artist clicked:', artist.name)}
          />
        );
      case 'Songs':
        return (
          <SongList
            songs={demoSongs}
            onPlaySong={(song) => console.log('Play song:', song.songName)}
            onSongMenu={(song) => console.log('Song menu:', song.songName)}
            onShuffleAll={() => console.log('Shuffle all')}
          />
        );
      case 'Genres':
        return (
          <GenreList
            genres={demoGenres}
            onGenreClick={(genre) => console.log('Genre clicked:', genre.name)}
          />
        );
      case 'Playlists':
        return (
          <PlaylistList
            playlists={demoPlaylists}
            onPlaylistClick={(playlist) => console.log('Playlist clicked:', playlist.name)}
            onPlayPlaylist={(playlist) => console.log('Play playlist:', playlist.name)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter',sans-serif] pb-32">
      {/* View Toggle */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={() => setActiveView('requests')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeView === 'requests'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Requests
          </button>
          <button
            onClick={() => setActiveView('library')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeView === 'library'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Library
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* REQUESTS VIEW */}
        {activeView === 'requests' && (
          <>
            {/* Page Title */}
            <div className="px-4 pt-4 pb-2">
              <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            </div>

            {/* Search Bar */}
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              onSubmit={(e) => { e.preventDefault(); console.log('Search:', searchValue); }}
              onClear={() => setSearchValue('')}
            />

            {/* Filter Pills */}
            <div className="px-4 mb-4">
              <FilterPills
                options={['All', 'Pending', 'Approved', 'Denied']}
                selected={filter}
                onChange={setFilter}
                counts={counts}
              />
            </div>

            {/* Request List */}
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <RequestRow
                    key={request.id}
                    item={request}
                    status={request.status}
                    hideArtwork={!request.artworkUrl}
                    denialReason={request.denialReason}
                    partialApprovalNote={request.partialApprovalNote}
                    reviewedAt={request.reviewedAt}
                    onClick={() => console.log('Clicked:', request.name)}
                  />
                ))
              ) : (
                <EmptyState
                  title="No requests found"
                  description="Try changing your filter or search for new music"
                />
              )}
            </div>
          </>
        )}

        {/* LIBRARY VIEW */}
        {activeView === 'library' && (
          <>
            {/* Page Title */}
            <div className="px-4 pt-4 pb-2">
              <h1 className="text-2xl font-bold text-gray-900">Library</h1>
            </div>

            {/* Library Search */}
            <div className="px-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your library..."
                  value={librarySearchValue}
                  onChange={(e) => setLibrarySearchValue(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                />
                {librarySearchValue && (
                  <button
                    onClick={() => setLibrarySearchValue('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Library Tabs */}
            <div className="px-4 mb-4">
              <LibraryTabs
                tabs={['Playlists', 'Artists', 'Albums', 'Songs', 'Genres']}
                selected={libraryTab}
                onChange={setLibraryTab}
              />
            </div>

            {/* Library Content */}
            <div className="px-4">
              {renderLibraryContent()}
            </div>
          </>
        )}
      </div>

      {/* Mini Player */}
      <MiniPlayer
        track={demoTrack}
        isPlaying={isPlaying}
        progress={progress}
        duration={200}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onExpand={() => setShowFullPlayer(true)}
      />

      {/* Full Screen Player */}
      <FullScreenPlayer
        track={demoTrack}
        isPlaying={isPlaying}
        isOpen={showFullPlayer}
        progress={progress}
        duration={200}
        volume={volume}
        isShuffleOn={isShuffleOn}
        isRepeatOn={isRepeatOn}
        onClose={() => setShowFullPlayer(false)}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onSkipNext={() => console.log('Skip next')}
        onSkipPrevious={() => console.log('Skip previous')}
        onSeek={(val) => setProgress(val)}
        onVolumeChange={setVolume}
        onShuffleToggle={() => setIsShuffleOn(!isShuffleOn)}
        onRepeatToggle={() => setIsRepeatOn(!isRepeatOn)}
        onOpenLyrics={() => console.log('Open lyrics')}
        onOpenQueue={() => console.log('Open queue')}
        onAirplay={() => console.log('Airplay')}
        onMoreOptions={() => console.log('More options')}
      />
    </div>
  );
}

// Add animations and utility styles
const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 3s linear infinite;
  }
  @keyframes player-slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  .animate-player-slide-up {
    animation: player-slide-up 0.3s ease-out forwards;
  }
  .safe-area-inset {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-kid-player-styles]')) {
  styleTag.setAttribute('data-kid-player-styles', '');
  document.head.appendChild(styleTag);
}

export default KidPlayerDemo;
