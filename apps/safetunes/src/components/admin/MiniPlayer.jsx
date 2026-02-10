import { useState, useEffect } from 'react';
import musicKitService from '../../config/musickit';

function MiniPlayer({ songId, songName, artistName, onAuthRequired }) {
  const [isCurrentSong, setIsCurrentSong] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      setIsCurrentSong(state && state.nowPlayingItem?.id === songId);
    };

    musicKitService.addEventListener('playbackStateDidChange', handlePlaybackStateChange);
    musicKitService.addEventListener('nowPlayingItemDidChange', handlePlaybackStateChange);

    return () => {
      musicKitService.removeEventListener('playbackStateDidChange', handlePlaybackStateChange);
      musicKitService.removeEventListener('nowPlayingItemDidChange', handlePlaybackStateChange);
    };
  }, [songId]);

  const handlePlay = async () => {
    if (!isMusicKitReady) {
      setError('MusicKit not ready');
      return;
    }

    const isAuthorized = musicKitService.checkAuthorization();
    if (!isAuthorized) {
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        setError('Apple Music authorization required');
      }
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await musicKitService.playSong(songId, { songName, artistName });
    } catch (err) {
      console.error('Failed to play song:', err);
      setError(err.message || 'Failed to play song');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMusicKitReady) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handlePlay}
        disabled={isLoading}
        className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
          isCurrentSong
            ? 'bg-purple-600 text-white'
            : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
        }`}
        title="Play this song"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
        <span className="text-sm">
          {isCurrentSong ? 'Now Playing' : 'Play'}
        </span>
      </button>

      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}

export default MiniPlayer;
