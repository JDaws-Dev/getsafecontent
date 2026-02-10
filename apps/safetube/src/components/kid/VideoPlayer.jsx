import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { createPortal } from 'react-dom';
import { api } from '../../../convex/_generated/api';

// Custom YouTube player using postMessage API (no youtube.com/iframe_api script needed)
// This allows playback on Family Link devices without whitelisting youtube.com
// Props:
// - video: the current video object
// - kidProfileId: for recording watch history
// - onClose: called when user closes player
// - shortsList: optional array of shorts for "next short" functionality
// - isFromChannel: if true, next short stays in same channel; if false, random from all shorts
// - onPlayNext: callback to play next video (receives video object)
export default function VideoPlayer({ video, kidProfileId, onClose, shortsList = [], isFromChannel = false, onPlayNext }) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const watchIdRef = useRef(null);
  const watchStartTimeRef = useRef(null);
  const endTriggeredRef = useRef(false); // Prevent multiple end triggers

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Watch history mutations
  const recordWatch = useMutation(api.watchHistory.recordWatch);
  const updateWatchDuration = useMutation(api.watchHistory.updateWatchDuration);

  // Format time as M:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Save watch duration
  const saveWatchDuration = useCallback(async () => {
    if (watchIdRef.current && watchStartTimeRef.current) {
      const watchDurationSeconds = Math.round((Date.now() - watchStartTimeRef.current) / 1000);
      try {
        await updateWatchDuration({
          watchId: watchIdRef.current,
          watchDurationSeconds,
        });
      } catch (err) {
        console.error('Failed to update watch duration:', err);
      }
    }
  }, [updateWatchDuration]);

  // Auto-hide controls after 3 seconds
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Send command to YouTube iframe via postMessage
  const sendCommand = useCallback((func, args = '') => {
    if (iframeRef.current?.contentWindow) {
      const message = JSON.stringify({ event: 'command', func, args });
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  // Initialize player and set up message listener
  useEffect(() => {
    // Create container outside React's DOM
    const container = document.createElement('div');
    container.id = 'yt-player-portal';
    container.style.cssText = 'position:fixed;inset:0;z-index:9998;background:black;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(container);
    containerRef.current = container;

    // Create iframe directly (no API script needed!)
    const iframe = document.createElement('iframe');
    iframe.id = 'yt-player-inner';
    // pointer-events:none blocks ALL clicks on the iframe - kids can't click anything
    iframe.style.cssText = 'width:100%;height:100%;border:none;pointer-events:none;';
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = false;
    // Sandbox to prevent navigation - allow scripts and same-origin for playback
    iframe.sandbox = 'allow-scripts allow-same-origin';

    // Use youtube-nocookie.com with maximum lockdown parameters:
    // - enablejsapi=1: allows postMessage control
    // - autoplay=1: start playing immediately
    // - controls=0: hide YouTube's controls completely
    // - disablekb=1: disable keyboard shortcuts
    // - fs=0: disable fullscreen button
    // - iv_load_policy=3: hide annotations
    // - modestbranding=1: minimal YouTube branding
    // - rel=0: don't show related videos from other channels
    // - showinfo=0: hide video title/uploader (deprecated but still helps)
    // - playsinline=1: play inline on mobile
    // - cc_load_policy=0: don't auto-show captions
    // NOTE: pointer-events:none on iframe blocks all clicks, so end-screen suggestions can't be tapped
    iframe.src = `https://www.youtube-nocookie.com/embed/${video.videoId}?enablejsapi=1&autoplay=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&rel=0&showinfo=0&playsinline=1&cc_load_policy=0&origin=${encodeURIComponent(window.location.origin)}`;

    container.appendChild(iframe);
    iframeRef.current = iframe;

    // Add CSS to hide any YouTube branding/watermark that might show through
    const style = document.createElement('style');
    style.id = 'yt-player-hide-branding';
    style.textContent = `
      #yt-player-portal iframe {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    // Handle messages from YouTube iframe
    const handleMessage = (event) => {
      // Only accept messages from youtube-nocookie.com
      if (!event.origin.includes('youtube')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data.event === 'onReady') {
          setIsReady(true);
          setIsPlaying(true);
          watchStartTimeRef.current = Date.now();

          // Record watch
          if (kidProfileId) {
            recordWatch({
              kidProfileId,
              videoId: video.videoId,
              title: video.title,
              thumbnailUrl: video.thumbnailUrl,
              channelTitle: video.channelTitle,
            }).then(watchId => {
              watchIdRef.current = watchId;
            }).catch(err => {
              console.error('Failed to record watch:', err);
            });
          }
        }

        if (data.event === 'onStateChange') {
          const state = data.info;
          console.log('[VideoPlayer] State change:', state);
          if (state === 1) { // PLAYING
            setIsPlaying(true);
            setHasEnded(false);
            endTriggeredRef.current = false; // Reset end trigger when playing
          } else if (state === 2) { // PAUSED
            setIsPlaying(false);
          } else if (state === 0) { // ENDED
            if (!endTriggeredRef.current) {
              console.log('%c[VideoPlayer] End detected via state change', 'color: lime; font-weight: bold;');
              endTriggeredRef.current = true;
              setIsPlaying(false);
              setHasEnded(true);
              saveWatchDuration();
            }
          }
        }

        if (data.event === 'infoDelivery' && data.info) {
          if (data.info.currentTime !== undefined) {
            setCurrentTime(data.info.currentTime);
            // Fallback end detection: if currentTime is within 1.5 seconds of duration, consider video ended
            // This catches cases where YouTube doesn't send the ENDED state
            if (!endTriggeredRef.current && data.info.duration && data.info.duration > 0 &&
                data.info.currentTime >= data.info.duration - 1.5) {
              console.log('%c[VideoPlayer] End detected via time check:', 'color: lime; font-weight: bold;', data.info.currentTime, '/', data.info.duration);
              endTriggeredRef.current = true;
              setIsPlaying(false);
              setHasEnded(true);
              saveWatchDuration();
            }
          }
          if (data.info.duration !== undefined && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
        }
      } catch (e) {
        // Ignore parse errors from non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);

    // When iframe loads, start listening for events
    iframe.onload = () => {
      // Send listening command to start receiving events
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage('{"event":"listening"}', '*');
          setIsReady(true);
          setIsPlaying(true);
          watchStartTimeRef.current = Date.now();

          // Record watch
          if (kidProfileId) {
            recordWatch({
              kidProfileId,
              videoId: video.videoId,
              title: video.title,
              thumbnailUrl: video.thumbnailUrl,
              channelTitle: video.channelTitle,
            }).then(watchId => {
              watchIdRef.current = watchId;
            }).catch(err => {
              console.error('Failed to record watch:', err);
            });
          }
        }
      }, 500);

      // Start progress polling
      progressIntervalRef.current = setInterval(() => {
        if (iframe.contentWindow) {
          // Request current time info
          iframe.contentWindow.postMessage('{"event":"listening"}', '*');
        }
      }, 1000);
    };

    return () => {
      window.removeEventListener('message', handleMessage);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      container.remove();
      // Clean up the style element
      const styleEl = document.getElementById('yt-player-hide-branding');
      if (styleEl) styleEl.remove();
    };
  }, [video.videoId, kidProfileId, recordWatch, saveWatchDuration]);

  // Control handlers
  const togglePlayPause = () => {
    if (isPlaying) {
      sendCommand('pauseVideo');
    } else {
      sendCommand('playVideo');
    }
    resetControlsTimeout();
  };

  const handleSeek = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!duration || duration <= 0) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;

    sendCommand('seekTo', [newTime, true]);
    setCurrentTime(newTime);

    setTimeout(() => sendCommand('playVideo'), 100);
    resetControlsTimeout();
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 10, duration);
    sendCommand('seekTo', [newTime, true]);
    setCurrentTime(newTime);
    setTimeout(() => sendCommand('playVideo'), 100);
    resetControlsTimeout();
  };

  const skipBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    sendCommand('seekTo', [newTime, true]);
    setCurrentTime(newTime);
    setTimeout(() => sendCommand('playVideo'), 100);
    resetControlsTimeout();
  };

  const handleClose = async () => {
    sendCommand('pauseVideo');
    await saveWatchDuration();
    onClose();
  };

  const handleReplay = () => {
    setHasEnded(false);
    endTriggeredRef.current = false; // Reset so end can trigger again
    sendCommand('seekTo', [0, true]);
    sendCommand('playVideo');
    resetControlsTimeout();
  };

  const handleOverlayClick = () => {
    if (hasEnded) return;
    togglePlayPause();
  };

  const handleOverlayMove = () => {
    resetControlsTimeout();
  };

  // Get next short to play - memoized so random selection is stable
  // This ensures the preview and the button both show/play the same video
  const nextShortCandidate = useMemo(() => {
    if (!shortsList || shortsList.length === 0) return null;

    if (isFromChannel) {
      // From channel page: get next short from same channel (sequential)
      const channelShorts = shortsList.filter(s => s.channelId === video.channelId);
      const currentIndex = channelShorts.findIndex(s => s.videoId === video.videoId);
      if (currentIndex >= 0 && currentIndex < channelShorts.length - 1) {
        return channelShorts[currentIndex + 1];
      }
      // If at end, loop back to first
      if (channelShorts.length > 1) {
        return channelShorts[0];
      }
      return null;
    } else {
      // From main page: get random short (excluding current)
      // Random is picked ONCE and cached for this video session
      const otherShorts = shortsList.filter(s => s.videoId !== video.videoId);
      if (otherShorts.length === 0) return null;
      return otherShorts[Math.floor(Math.random() * otherShorts.length)];
    }
  }, [shortsList, isFromChannel, video.channelId, video.videoId]);

  const handleNextShort = async () => {
    // Use the memoized nextShortCandidate so it matches the preview
    if (nextShortCandidate && onPlayNext) {
      sendCommand('pauseVideo');
      await saveWatchDuration();
      onPlayNext(nextShortCandidate);
    }
  };

  // Check if this is a short (<=180 seconds or has #shorts in title)
  // Need to check durationSeconds exists and is > 0 before comparing, otherwise undefined <= 180 returns false
  const isShort = (video.durationSeconds > 0 && video.durationSeconds <= 180) || (video.title && /#shorts?/i.test(video.title));
  const hasNextShort = isShort && shortsList.length > 0 && nextShortCandidate !== null;

  // Debug logging for shorts navigation
  console.log('%c[VideoPlayer] Shorts debug:', 'color: yellow; font-weight: bold;', {
    videoId: video.videoId,
    durationSeconds: video.durationSeconds,
    title: video.title?.substring(0, 40),
    isShort,
    shortsListLength: shortsList.length,
    isFromChannel,
    hasNextShort,
    nextShortId: nextShortCandidate?.videoId,
    shortsList: shortsList.slice(0, 3).map(s => ({ id: s.videoId, dur: s.durationSeconds })),
  });

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 9999 }}
      onMouseMove={handleOverlayMove}
      onTouchStart={handleOverlayMove}
    >
      {/* Click overlay for play/pause */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ zIndex: 10000 }}
        onClick={handleOverlayClick}
      />

      {/* Close button - always visible */}
      <button
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        className="absolute top-4 left-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition shadow-lg"
        style={{ zIndex: 10002, minWidth: '48px', minHeight: '48px' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Video title - top */}
      <div
        className={`absolute top-4 left-20 right-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 10001 }}
      >
        <h2 className="text-white font-semibold text-lg line-clamp-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{video.title}</h2>
        <p className="text-gray-300 text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{video.channelTitle}</p>
      </div>

      {/* Center play/pause indicator */}
      {showControls && !hasEnded && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10001 }}
        >
          <div className="flex items-center gap-8">
            {/* Skip backward */}
            <button
              onClick={(e) => { e.stopPropagation(); skipBackward(); }}
              className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full transition pointer-events-auto"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold">10</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
              className="bg-black/50 hover:bg-black/70 text-white p-6 rounded-full transition pointer-events-auto"
            >
              {isPlaying ? (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={(e) => { e.stopPropagation(); skipForward(); }}
              className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full transition pointer-events-auto"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold">10</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom progress bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 10001 }}
      >
        {/* Time display */}
        <div className="flex items-center justify-between text-white text-sm mb-2 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress bar */}
        <div
          className="h-6 bg-transparent rounded-full cursor-pointer relative flex items-center"
          onClick={handleSeek}
          style={{ touchAction: 'none' }}
        >
          {/* Track background */}
          <div className="absolute inset-x-0 h-2 bg-white/30 rounded-full pointer-events-none" />
          {/* Filled progress */}
          <div
            className="absolute left-0 h-2 bg-red-500 rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
      </div>

      {/* End screen - show when video ends */}
      {hasEnded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 px-4"
          style={{ zIndex: 10003 }}
        >
          {/* Show "Up Next" preview if there's a next short */}
          {hasNextShort && nextShortCandidate && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm text-center mb-2">Up Next</p>
              <button
                onClick={handleNextShort}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl p-3 transition group"
              >
                {nextShortCandidate.thumbnailUrl && (
                  <img
                    src={nextShortCandidate.thumbnailUrl}
                    alt={nextShortCandidate.title}
                    className="w-20 h-20 object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="text-left max-w-[200px]">
                  <p className="text-white font-medium text-sm line-clamp-2">{nextShortCandidate.title}</p>
                  <p className="text-gray-400 text-xs mt-1">{nextShortCandidate.channelTitle}</p>
                </div>
                <div className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2 group-hover:scale-110 transition">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* Current video info (smaller when next short preview is shown) */}
          {!hasNextShort && video.thumbnailUrl && (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-48 h-auto rounded-xl mb-4 opacity-70"
              referrerPolicy="no-referrer"
            />
          )}
          <p className={`text-white font-semibold mb-1 text-center ${hasNextShort ? 'text-base' : 'text-xl'}`}>
            {video.title}
          </p>
          <p className="text-gray-400 text-sm mb-6">{video.channelTitle}</p>

          <div className="flex flex-wrap justify-center gap-3">
            {/* Next Short button */}
            {hasNextShort && (
              <button
                onClick={handleNextShort}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-full font-semibold transition flex items-center gap-2 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                Play Next
              </button>
            )}
            <button
              onClick={handleReplay}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-full font-semibold transition flex items-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Watch Again
            </button>
            <button
              onClick={handleClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-semibold transition shadow-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!isReady && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black"
          style={{ zIndex: 10003 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
        </div>
      )}

    </div>,
    document.body
  );
}
