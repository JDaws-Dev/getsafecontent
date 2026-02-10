import { useState, useEffect } from 'react';
import musicKitService from '../../config/musickit';
import { useToast } from '../../contexts/ToastContext';

function MusicPlayer({ album }) {
  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);

  useEffect(() => {
    const initMusicKit = async () => {
      try {
        await musicKitService.initialize();
        setIsMusicKitReady(true);
        setIsAuthorized(musicKitService.checkAuthorization());
      } catch (err) {
        console.error('Failed to initialize MusicKit:', err);
      }
    };

    initMusicKit();

    // Set up event listeners
    const handlePlaybackStateChange = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setIsPlaying(state.isPlaying);
        setCurrentTime(state.currentPlaybackTime || 0);
        setDuration(state.currentPlaybackDuration || 0);
        setNowPlaying(state.nowPlayingItem);
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

  const handleAuthorize = async () => {
    try {
      await musicKitService.authorize();
      setIsAuthorized(true);
    } catch (err) {
      console.error('Authorization failed:', err);
      showToast('Failed to authorize with Apple Music. Please try again.', 'error');
    }
  };

  const handlePlayAlbum = async () => {
    if (!album) return;

    // IMPORTANT: On iOS, we must NOT call authorize() here because it breaks the user gesture chain
    // and Safari will block the popup. Users must click "Sign in with Apple Music" button first.
    if (!isAuthorized) {
      showToast('Please sign in with Apple Music first by clicking the "Sign in with Apple Music" button.', 'warning');
      return;
    }

    try {
      // Use appleAlbumId from database or id from search results
      const albumId = album.appleAlbumId || album.id;
      if (!albumId) {
        console.error('Album object:', album);
        showToast('Album ID is missing. Cannot play this album.', 'error');
        return;
      }

      await musicKitService.playAlbum(albumId);
    } catch (err) {
      console.error('Failed to play album:', err);

      if (err.message && err.message.includes('active Apple Music subscription')) {
        showToast(err.message, 'error');
      } else {
        showToast('Failed to play album. Make sure you have an active Apple Music subscription.', 'error');
      }
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      musicKitService.pause();
    } else {
      musicKitService.play();
    }
  };

  const handleSkipNext = () => {
    musicKitService.skipToNext();
  };

  const handleSkipPrevious = () => {
    musicKitService.skipToPrevious();
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    musicKitService.setVolume(newVolume);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isMusicKitReady) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-600">MusicKit is not configured</p>
        <p className="text-sm text-gray-500 mt-2">
          Add VITE_MUSICKIT_DEVELOPER_TOKEN to your .env file
        </p>
      </div>
    );
  }

  if (!isAuthorized && !nowPlaying) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect to Apple Music
        </h3>
        <p className="text-gray-600 mb-4">
          Sign in with your Apple Music account to start listening
        </p>
        <button
          onClick={handleAuthorize}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
        >
          Sign in with Apple Music
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Now Playing Info */}
      {nowPlaying && (
        <div className="flex items-center p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50">
          {nowPlaying.artwork && (
            <img
              src={nowPlaying.artwork.url.replace('{w}', '60').replace('{h}', '60')}
              alt="Album artwork"
              className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg shadow-md mr-3 sm:mr-4"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              {nowPlaying.title || nowPlaying.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {nowPlaying.artistName}
            </p>
            <p className="text-xs text-gray-500 truncate hidden sm:block">
              {nowPlaying.albumName}
            </p>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="p-4 sm:p-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={handleSkipPrevious}
            disabled={!nowPlaying}
            className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
            </svg>
          </button>

          {!nowPlaying ? (
            <button
              onClick={handlePlayAlbum}
              className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full text-white shadow-lg transition"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handlePlayPause}
              className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full text-white shadow-lg transition"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={handleSkipNext}
            disabled={!nowPlaying}
            className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
            </svg>
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

export default MusicPlayer;
