import { useState, useEffect } from 'react';
import musicKitService from '../../config/musickit';

function PersistentPlayer({ onAuthRequired }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);

  useEffect(() => {
    const initMusicKit = async () => {
      try {
        await musicKitService.initialize();
        setIsMusicKitReady(true);
      } catch (err) {
        console.error('Failed to initialize MusicKit:', err);
        setError('MusicKit not configured');
      }
    };

    initMusicKit();

    const handlePlaybackStateChange = () => {
      const state = musicKitService.getPlaybackState();
      if (state && state.nowPlayingItem) {
        setIsPlaying(state.isPlaying);
        setCurrentTime(state.currentPlaybackTime || 0);
        setDuration(state.currentPlaybackDuration || 0);
        setCurrentTrack({
          id: state.nowPlayingItem.id,
          name: state.nowPlayingItem.attributes?.name || 'Unknown',
          artist: state.nowPlayingItem.attributes?.artistName || 'Unknown Artist',
          artwork: state.nowPlayingItem.attributes?.artwork
        });
      } else {
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    };

    musicKitService.addEventListener('playbackStateDidChange', handlePlaybackStateChange);
    musicKitService.addEventListener('playbackTimeDidChange', handlePlaybackStateChange);
    musicKitService.addEventListener('nowPlayingItemDidChange', handlePlaybackStateChange);

    return () => {
      musicKitService.removeEventListener('playbackStateDidChange', handlePlaybackStateChange);
      musicKitService.removeEventListener('playbackTimeDidChange', handlePlaybackStateChange);
      musicKitService.removeEventListener('nowPlayingItemDidChange', handlePlaybackStateChange);
    };
  }, []);

  const handlePlayPause = async () => {
    if (!isMusicKitReady || !currentTrack) return;

    const isAuthorized = musicKitService.checkAuthorization();
    if (!isAuthorized) {
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (isPlaying) {
        musicKitService.pause();
      } else {
        musicKitService.play();
      }
    } catch (err) {
      console.error('Failed to play/pause:', err);
      setError(err.message || 'Failed to play');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    if (!duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;

    musicKitService.seekToTime(newTime);
  };

  if (!isMusicKitReady || !currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress Bar - thin line at top */}
        {duration > 0 && (
          <div
            className="h-1 bg-gray-700 cursor-pointer"
            onClick={handleProgressClick}
            title="Click to seek"
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        )}

        <div className="p-3 flex items-center gap-3">
          {/* Album Artwork */}
          {currentTrack.artwork ? (
            <img
              src={currentTrack.artwork.url.replace('{w}', '80').replace('{h}', '80')}
              alt={currentTrack.name}
              className="w-12 h-12 rounded-lg shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">
              {currentTrack.name}
            </h4>
            <p className="text-xs text-gray-400 truncate">
              {currentTrack.artist}
            </p>
          </div>

          {/* Time Display */}
          <span className="text-xs text-gray-500 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="flex-shrink-0 w-10 h-10 bg-white hover:bg-gray-100 text-gray-900 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Stop/Close Button */}
          <button
            onClick={() => {
              musicKitService.stop();
              setCurrentTrack(null);
            }}
            className="flex-shrink-0 w-8 h-8 text-gray-500 hover:text-white rounded-full transition flex items-center justify-center"
            title="Stop"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="px-3 pb-2 text-xs text-red-400 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default PersistentPlayer;
