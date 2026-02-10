import { useState, useEffect, useRef } from 'react';
import musicKitService from '../config/musickit';
import { triggerHaptic } from '../hooks/useHaptic';

// Detect if running inside SafeTunes iOS/Android app WebView
const isInNativeApp = () => /SafeTunesApp/.test(navigator.userAgent) || window.isInSafeTunesApp;

function MusicPlayer({ approvedAlbums = [], approvedSongs = [], onTrackChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showStickyPlayer, setShowStickyPlayer] = useState(false);
  const lastTrackedTrackId = useRef(null);
  const userOpenedFullScreen = useRef(false);
  const expandedPlayerRef = useRef(null);

  useEffect(() => {
    initializePlayer();
    return () => {
      // Cleanup
      if (musicKitService.music) {
        musicKitService.music.removeEventListener('playbackStateDidChange', handlePlaybackStateChange);
        musicKitService.music.removeEventListener('nowPlayingItemDidChange', handleNowPlayingItemChange);
        musicKitService.music.removeEventListener('playbackTimeDidChange', handlePlaybackTimeChange);
      }
    };
  }, []);

  // Scroll listener to show sticky player when expanded player scrolls out of view (desktop only)
  useEffect(() => {
    const handleScroll = () => {
      if (!expandedPlayerRef.current || !isFullScreen) {
        setShowStickyPlayer(false);
        return;
      }

      // Only on desktop (md breakpoint and up)
      if (window.innerWidth >= 768) {
        const rect = expandedPlayerRef.current.getBoundingClientRect();
        // Show sticky player if expanded player is scrolled out of view
        setShowStickyPlayer(rect.bottom < 0);
      } else {
        setShowStickyPlayer(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isFullScreen]);

  const initializePlayer = async () => {
    try {
      await musicKitService.initialize();

      if (musicKitService.music) {
        // Add event listeners
        musicKitService.music.addEventListener('playbackStateDidChange', handlePlaybackStateChange);
        musicKitService.music.addEventListener('nowPlayingItemDidChange', handleNowPlayingItemChange);
        musicKitService.music.addEventListener('playbackTimeDidChange', handlePlaybackTimeChange);

        // Set initial state
        const state = musicKitService.getPlaybackState();
        if (state) {
          setIsPlaying(state.isPlaying);
          setCurrentTrack(state.nowPlayingItem);
          setDuration(state.currentPlaybackDuration || 0);
          setProgress(state.currentPlaybackTime || 0);
        }
      }
    } catch (err) {
      console.error('Failed to initialize music player:', err);
    }
  };

  const handlePlaybackStateChange = () => {
    const state = musicKitService.getPlaybackState();
    if (state) {
      setIsPlaying(state.isPlaying);
    }
  };

  const handleNowPlayingItemChange = () => {
    const state = musicKitService.getPlaybackState();
    if (state && state.nowPlayingItem) {
      const track = state.nowPlayingItem;
      setCurrentTrack(track);
      setDuration(state.currentPlaybackDuration || 0);
      setProgress(0);
      // Show player when new track starts
      setIsHidden(false);

      // Only auto-expand on desktop, mobile stays at bottom
      if (!userOpenedFullScreen.current) {
        // On desktop, expand the player. On mobile, keep it minimized at bottom
        const isMobile = window.innerWidth < 768;
        setIsFullScreen(!isMobile); // Only full screen on desktop
        setIsMinimized(false);
      }

      // Track the song change if callback is provided and this is a new track
      const trackId = track.id || track.attributes?.playParams?.id;
      if (onTrackChange && trackId && trackId !== lastTrackedTrackId.current) {
        lastTrackedTrackId.current = trackId;
        onTrackChange({
          id: trackId,
          name: track.title || track.attributes?.name,
          artistName: track.artistName || track.attributes?.artistName,
          albumName: track.albumName || track.attributes?.albumName,
          artworkUrl: track.artwork?.url || track.attributes?.artwork?.url,
          durationInMillis: track.attributes?.durationInMillis
        });
      }
    }
  };

  const handlePlaybackTimeChange = () => {
    const state = musicKitService.getPlaybackState();
    if (state) {
      setProgress(state.currentPlaybackTime || 0);
      setDuration(state.currentPlaybackDuration || 0);
    }
  };

  const togglePlayPause = () => {
    triggerHaptic('medium');
    if (isPlaying) {
      musicKitService.pause();
    } else {
      musicKitService.play();
    }
  };

  const handleSkipNext = () => {
    triggerHaptic('light');
    // Safe to skip - queue only contains approved songs
    musicKitService.skipToNext();
  };

  const handleSkipPrevious = () => {
    triggerHaptic('light');
    // Safe to skip - queue only contains approved songs
    musicKitService.skipToPrevious();
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    // If running in native app, use the native volume bridge
    if (isInNativeApp() && window.setNativeVolume) {
      window.setNativeVolume(newVolume);
    } else {
      // Otherwise use MusicKit volume (works on web)
      musicKitService.setVolume(newVolume);
    }
  };

  // Listen for native volume changes (from hardware buttons in the app)
  useEffect(() => {
    const handleNativeVolumeChange = (event) => {
      if (event.detail && typeof event.detail.volume === 'number') {
        setVolume(event.detail.volume);
      }
    };

    window.addEventListener('nativeVolumeChange', handleNativeVolumeChange);
    return () => {
      window.removeEventListener('nativeVolumeChange', handleNativeVolumeChange);
    };
  }, []);

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setProgress(seekTime);
    if (musicKitService.music) {
      musicKitService.music.seekToTime(seekTime);
    }
  };

  const handleClose = () => {
    setIsHidden(true);
    // Stop playback when closing
    musicKitService.stop();
    setCurrentTrack(null);
    setProgress(0);
    setDuration(0);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getArtworkUrl = (item, size = 80) => {
    if (!item) return null;

    // Check different possible artwork locations
    const artwork = item.artwork || item.attributes?.artwork;
    if (!artwork) return null;

    const url = artwork.url;
    if (!url) return null;

    // Replace {w} and {h} with actual dimensions
    return url.replace('{w}', size.toString()).replace('{h}', size.toString());
  };

  const getTrackName = (item) => {
    if (!item) return 'No track playing';
    return item.title || item.attributes?.name || 'Unknown Track';
  };

  const getArtistName = (item) => {
    if (!item) return '';
    return item.artistName || item.attributes?.artistName || 'Unknown Artist';
  };

  // Check if artwork should be hidden for current track
  const shouldHideArtwork = () => {
    if (!currentTrack) return false;

    const trackId = currentTrack.id || currentTrack.attributes?.playParams?.id;
    if (!trackId) return false;

    // Check if this song has hideArtwork set
    const song = approvedSongs.find(s => s.appleSongId === trackId);
    if (song) return song.hideArtwork || false;

    // If not found in songs, check albums (by album name)
    const albumName = currentTrack.albumName || currentTrack.attributes?.albumName;
    if (albumName) {
      const album = approvedAlbums.find(a => a.albumName === albumName);
      if (album) return album.hideArtwork || false;
    }

    return false;
  };

  // Don't show player if no track is loaded or if hidden
  if (!currentTrack || isHidden) {
    return null;
  }

  return (
    <>
      {/* Full Screen View - Mobile fullscreen vertical, Desktop horizontal */}
      {isFullScreen && (
        <div ref={expandedPlayerRef} className="fixed inset-0 bg-gradient-to-b from-purple-600 to-pink-600 z-[60] overflow-y-auto md:relative md:inset-auto md:z-auto md:bg-gradient-to-r md:rounded-xl md:shadow-2xl md:max-w-4xl md:mx-auto md:overflow-visible md:my-4">
          {/* Mobile: Vertical Layout */}
          <div className="md:hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white">
              <button
                onClick={() => {
                  userOpenedFullScreen.current = false;
                  setIsFullScreen(false);
                }}
                className="p-2 hover:bg-white/20 rounded-full transition"
                title="Minimize player"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold">Now Playing</h2>
              <div className="w-10"></div>
            </div>

            {/* Main Content - Vertical */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
              {/* Large Album Artwork */}
              {shouldHideArtwork() ? (
                <div className="w-80 h-80 max-w-full rounded-2xl shadow-2xl mb-8 bg-white/20 flex items-center justify-center">
                  <svg className="w-32 h-32 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              ) : getArtworkUrl(currentTrack, 1200) ? (
                <img
                  src={getArtworkUrl(currentTrack, 1200)}
                  alt={getTrackName(currentTrack)}
                  className="w-80 h-80 max-w-full rounded-2xl shadow-2xl mb-8 object-cover"
                />
              ) : null}

              {/* Track Info */}
              <div className="text-center text-white mb-8 w-full">
                <h1 className="text-2xl font-bold mb-2">{getTrackName(currentTrack)}</h1>
                <p className="text-lg text-purple-100">{getArtistName(currentTrack)}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full mb-6">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-sm text-white mt-2">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-8 mb-6">
                <button
                  onClick={handleSkipPrevious}
                  className="p-3 hover:bg-white/20 rounded-full transition text-white"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                  </svg>
                </button>

                <button
                  onClick={togglePlayPause}
                  className="p-5 bg-white hover:bg-gray-100 rounded-full transition shadow-xl"
                >
                  {isPlaying ? (
                    <svg className="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleSkipNext}
                  className="p-3 hover:bg-white/20 rounded-full transition text-white"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                  </svg>
                </button>
              </div>

              {/* Volume Control - controls system volume in native app via bridge */}
              <div className="flex items-center gap-3 w-full max-w-xs">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </div>

          {/* Desktop: Horizontal Layout */}
          <div className="hidden md:flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 text-white border-b border-white/20">
              <h2 className="text-sm font-semibold">Now Playing</h2>
              <button
                onClick={() => {
                  userOpenedFullScreen.current = false;
                  setIsFullScreen(false);
                }}
                className="p-1 hover:bg-white/20 rounded-full transition"
                title="Minimize player"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Main Content - Horizontal */}
            <div className="flex items-center gap-4 p-4">
              {/* Album Artwork */}
              <div className="flex-shrink-0">
                {shouldHideArtwork() ? (
                  <div className="w-24 h-24 rounded-lg shadow-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                ) : getArtworkUrl(currentTrack, 400) ? (
                  <img
                    src={getArtworkUrl(currentTrack, 400)}
                    alt={getTrackName(currentTrack)}
                    className="w-24 h-24 rounded-lg shadow-lg object-cover"
                  />
                ) : null}
              </div>

              {/* Track Info & Controls */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                {/* Track Info */}
                <div className="text-white">
                  <h1 className="text-base font-bold truncate">{getTrackName(currentTrack)}</h1>
                  <p className="text-sm text-purple-100 truncate">{getArtistName(currentTrack)}</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-xs text-white mt-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSkipPrevious}
                    className="p-1.5 hover:bg-white/20 rounded-full transition text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                    </svg>
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="p-2 bg-white hover:bg-gray-100 rounded-full transition shadow-lg"
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={handleSkipNext}
                    className="p-1.5 hover:bg-white/20 rounded-full transition text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                    </svg>
                  </button>

                  {/* Volume Control - controls system volume in native app via bridge */}
                  <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                    <svg className="w-4 h-4 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Player - show when not fullscreen, OR when fullscreen but scrolled away on desktop */}
      {(!isFullScreen || showStickyPlayer) && (
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
        {/* Minimized gradient bar - show on desktop when minimized OR when sticky (scrolled away) */}
        {(isMinimized || showStickyPlayer) ? (
        <div
          className="hidden md:flex items-center justify-between p-2 bg-gradient-to-r from-purple-600 to-pink-600 cursor-pointer"
          onClick={() => {
            userOpenedFullScreen.current = true;
            setIsFullScreen(true);
            // Scroll to expanded player if it exists
            if (expandedPlayerRef.current) {
              expandedPlayerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0 md:cursor-default" onClick={(e) => e.stopPropagation()}>
            {shouldHideArtwork() ? (
              <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            ) : getArtworkUrl(currentTrack) ? (
              <img
                src={getArtworkUrl(currentTrack)}
                alt={getTrackName(currentTrack)}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-white font-medium text-sm truncate">{getTrackName(currentTrack)}</p>
              <p className="text-purple-100 text-xs truncate">{getArtistName(currentTrack)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-purple-100 p-2"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="text-white hover:text-purple-100 p-2"
              title="Expand player"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="text-white hover:text-purple-100 p-2"
              title="Close player"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* Simplified Player View */
        <div className="p-3">
          <div className="flex items-center justify-between gap-4">
            {/* Track Info */}
            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                // Expand to fullscreen on both mobile and desktop
                userOpenedFullScreen.current = true;
                setIsFullScreen(true);
              }}
            >
              {shouldHideArtwork() ? (
                <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              ) : getArtworkUrl(currentTrack, 200) ? (
                <div className="w-12 h-12 flex-shrink-0">
                  <img
                    src={getArtworkUrl(currentTrack, 200)}
                    alt={getTrackName(currentTrack)}
                    className="w-full h-full rounded-lg shadow-md object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate text-sm">{getTrackName(currentTrack)}</p>
                <p className="text-xs text-gray-600 truncate">{getArtistName(currentTrack)}</p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipPrevious();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Previous"
              >
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full transition text-white"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipNext();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Next"
              >
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                </svg>
              </button>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Close player"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </>
  );
}

export default MusicPlayer;
