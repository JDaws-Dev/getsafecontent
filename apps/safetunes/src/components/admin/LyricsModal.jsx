import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
// Lyrics Modal - fetches lyrics from Musixmatch via Convex

function LyricsModal({ isOpen, onClose, trackName, artistName }) {
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lyricsSource, setLyricsSource] = useState(null);

  const fetchLyricsAction = useAction(api.ai.lyrics.fetchLyrics);

  useEffect(() => {
    const fetchLyrics = async () => {
      if (isOpen && trackName && artistName) {
        setLoading(true);
        setError('');
        setLyrics('');

        try {
          const result = await fetchLyricsAction({
            trackName,
            artistName,
          });

          if (result.success && result.lyrics) {
            setLyrics(result.lyrics);
            setLyricsSource(result.source);
          } else {
            setError(result.error || 'Lyrics not found');
          }
        } catch (err) {
          console.error('[Lyrics] Fetch error:', err);
          setError('Failed to fetch lyrics. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchLyrics();
  }, [isOpen, trackName, artistName, fetchLyricsAction]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLyrics('');
      setError('');
      setLoading(false);
      setLyricsSource(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lyrics</h2>
            <p className="text-sm text-gray-600 mt-1">
              {trackName} • {artistName}
            </p>
            {lyricsSource && (
              <p className="text-xs text-gray-500 mt-1">
                Source: {lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-purple-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-600">Fetching lyrics from Musixmatch...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 font-medium mb-2">Lyrics Not Available</p>
              <p className="text-gray-600 text-sm text-center">{error}</p>
            </div>
          ) : lyrics ? (
            <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
              {lyrics}
            </pre>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LyricsModal;
