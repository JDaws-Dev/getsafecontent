import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import musicKitService from '../../config/musickit';
import LyricsModal from './LyricsModal';
import { useToast } from '../../contexts/ToastContext';

function AlbumTracksModal({ album, user, onClose, onAuthRequired }) {
  const { showToast } = useToast();
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nowPlayingId, setNowPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyricsModalOpen, setLyricsModalOpen] = useState(false);
  const [lyricsTrack, setLyricsTrack] = useState(null);

  const approveSongMutation = useMutation(api.songs.approveSong);
  const approvedSongs = useQuery(api.songs.getApprovedSongs,
    user ? { userId: user._id } : 'skip'
  ) || [];

  useEffect(() => {
    const loadTracks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await musicKitService.initialize();
        const albumId = album.appleAlbumId || album.id;
        const albumTracks = await musicKitService.getAlbumTracks(albumId);
        setTracks(albumTracks);
      } catch (err) {
        console.error('Failed to load album tracks:', err);
        setError('Failed to load tracks. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTracks();

    const handlePlaybackStateChange = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setIsPlaying(state.isPlaying);
        setNowPlayingId(state.nowPlayingItem?.id || null);
      }
    };

    musicKitService.addEventListener('playbackStateDidChange', handlePlaybackStateChange);
    musicKitService.addEventListener('nowPlayingItemDidChange', handlePlaybackStateChange);

    return () => {
      musicKitService.removeEventListener('playbackStateDidChange', handlePlaybackStateChange);
      musicKitService.removeEventListener('nowPlayingItemDidChange', handlePlaybackStateChange);
    };
  }, [album]);

  const handlePlayTrack = async (trackIndex) => {
    const isAuthorized = musicKitService.checkAuthorization();
    if (!isAuthorized) {
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }

    try {
      await musicKitService.playApprovedSongs(tracks, trackIndex);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to play track:', err);
      showToast(err.message || 'Failed to play track. Please try again.', 'error');
    }
  };

  const handleApproveSong = async (track) => {
    try {
      await approveSongMutation({
        userId: user._id,
        appleSongId: track.id,
        songName: track.attributes?.name,
        artistName: track.attributes?.artistName,
        albumName: album.albumName,
        artworkUrl: album.artworkUrl,
      });
      showToast(`"${track.attributes?.name}" has been approved!`, 'success', { duration: 3000 });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to approve song:', err);
      showToast('Failed to approve song. Please try again.', 'error');
    }
  };

  const isSongApproved = (songId) => {
    return approvedSongs.some(song => song.appleSongId === songId);
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return '--:--';
    const totalSeconds = Math.floor(durationMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-200">
          {album.artworkUrl ? (
            <img
              src={album.artworkUrl.replace('{w}', '150').replace('{h}', '150')}
              alt={album.albumName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-10 h-10 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 truncate">{album.albumName}</h3>
            <p className="text-gray-600 truncate">{album.artistName}</p>
            {tracks.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{tracks.length} tracks</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-12 h-12 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading tracks...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600">{error}</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-gray-600">No tracks found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track, index) => {
                const isCurrentTrack = track.id === nowPlayingId;
                const isApproved = isSongApproved(track.id);
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition ${
                      isCurrentTrack
                        ? 'bg-purple-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    {/* Track Number */}
                    <div className="w-8 flex-shrink-0 text-center">
                      <span className={`text-sm ${isCurrentTrack ? 'text-purple-700 font-semibold' : 'text-gray-500'}`}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-purple-900' : 'text-gray-900'}`}>
                        {track.attributes?.name}
                      </div>
                      {track.attributes?.artistName && (
                        <div className={`text-xs truncate ${isCurrentTrack ? 'text-purple-700' : 'text-gray-600'}`}>
                          {track.attributes.artistName}
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div className={`text-xs flex-shrink-0 ${isCurrentTrack ? 'text-purple-700' : 'text-gray-500'}`}>
                      {formatDuration(track.attributes?.durationInMillis)}
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayTrack(index)}
                      className="flex-shrink-0 p-2 hover:bg-purple-100 text-purple-600 rounded-full transition"
                      title="Play this track"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Lyrics Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLyricsTrack({ name: track.attributes?.name, artistName: track.attributes?.artistName });
                        setLyricsModalOpen(true);
                      }}
                      className="flex-shrink-0 p-2 hover:bg-blue-100 text-blue-600 rounded transition"
                      title="View lyrics"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>

                    {/* Approve Button */}
                    {isApproved ? (
                      <div className="flex-shrink-0 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                        Approved
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApproveSong(track)}
                        className="flex-shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition flex items-center gap-1"
                        title="Approve this song"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Approve
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lyrics Modal */}
      <LyricsModal
        isOpen={lyricsModalOpen}
        onClose={() => setLyricsModalOpen(false)}
        trackName={lyricsTrack?.name}
        artistName={lyricsTrack?.artistName}
      />
    </div>
  );
}

export default AlbumTracksModal;
