import { useState, useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function ContentReviewModal({ isOpen, onClose, content, onApprove, onDeny }) {
  const [lyrics, setLyrics] = useState('');
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);
  const [error, setError] = useState('');
  const [showLyricsInput, setShowLyricsInput] = useState(false);
  const [lyricsSource, setLyricsSource] = useState(null);
  const [showLyricsModal, setShowLyricsModal] = useState(false);

  // Actions
  const reviewContentAction = useAction(api.ai.contentReview.reviewContent);
  const fetchLyricsAction = useAction(api.ai.lyrics.fetchLyrics);

  // Check if there's a cached review when modal opens
  const cachedReview = useQuery(
    api.ai.contentReview.getCachedReview,
    isOpen && content
      ? {
          reviewType: content.type || 'song',
          trackId: content.appleSongId,
          albumId: content.appleAlbumId,
        }
      : 'skip'
  );

  useEffect(() => {
    if (cachedReview) {
      setReview({
        summary: cachedReview.summary,
        positiveAspects: cachedReview.positiveAspects || [],
        inappropriateContent: cachedReview.inappropriateContent,
        overallRating: cachedReview.overallRating,
        ageRecommendation: cachedReview.ageRecommendation,
        fromCache: true,
        cacheHitCount: cachedReview.timesReused + 1,
      });
      // Load lyrics from cached review if available
      if (cachedReview.lyrics) {
        setLyrics(cachedReview.lyrics);
        setLyricsSource(cachedReview.lyricsSource);
      }
      setShowLyricsInput(false);
    } else {
      setReview(null);
      setShowLyricsInput(false);
    }
  }, [cachedReview, isOpen]);

  // Auto-fetch lyrics when modal opens (if no cached review)
  useEffect(() => {
    const autoFetchLyrics = async () => {
      if (isOpen && content && !cachedReview && !lyrics) {
        const trackName = content.songName || content.trackName || '';
        const artistName = content.artistName || '';

        console.log('[Lyrics] Starting auto-fetch for:', { trackName, artistName, content });

        if (!trackName || !artistName) {
          console.error('[Lyrics] Missing track or artist name:', { trackName, artistName });
          setShowLyricsInput(true);
          return;
        }

        setFetchingLyrics(true);
        setError('');

        try {
          console.log('[Lyrics] Calling fetchLyricsAction...');
          const result = await fetchLyricsAction({
            trackName,
            artistName,
          });
          console.log('[Lyrics] fetchLyricsAction result:', result);

          if (result.success && result.lyrics) {
            setLyrics(result.lyrics);
            setLyricsSource(result.source);
            console.log(`[Lyrics] Auto-fetched from ${result.source} (${result.lyrics.length} chars)`);
          } else {
            console.log('[Lyrics] Auto-fetch failed:', result.error || 'No lyrics returned');
            setShowLyricsInput(true);
          }
        } catch (err) {
          console.error('[Lyrics] Auto-fetch error:', err);
          setShowLyricsInput(true);
        } finally {
          setFetchingLyrics(false);
        }
      }
    };

    autoFetchLyrics();
  }, [isOpen, content, cachedReview, lyrics, fetchLyricsAction]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLyrics('');
      setReview(null);
      setError('');
      setShowLyricsInput(false);
      setLoading(false);
      setFetchingLyrics(false);
      setLyricsSource(null);
      setShowLyricsModal(false);
    }
  }, [isOpen]);

  if (!isOpen || !content) return null;

  const handleReview = async () => {
    if (!lyrics.trim() && !cachedReview) {
      setError('Please provide lyrics to analyze');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await reviewContentAction({
        appleTrackId: content.appleSongId,
        appleAlbumId: content.appleAlbumId,
        reviewType: content.type || 'song',
        trackName: content.songName || content.trackName,
        albumName: content.albumName,
        artistName: content.artistName,
        lyrics: lyrics.trim() || undefined,
        lyricsSource: lyricsSource || 'manual',
      });

      // API returns { review: {...}, fromCache: bool } - extract the review object
      const reviewData = result.review || result;
      console.log('[ContentReviewModal] Review result:', { hasReview: !!result.review, summary: reviewData.summary });
      setReview(reviewData);
    } catch (err) {
      console.error('Review error:', err);
      setError(err.message || 'Failed to review content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'appropriate':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'use-caution':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inappropriate':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'mild':
        return 'bg-yellow-100 text-yellow-700';
      case 'moderate':
        return 'bg-orange-100 text-orange-700';
      case 'severe':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">AI Content Review</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">
                {content.songName || content.trackName || content.albumName}
              </span>
              <span>•</span>
              <span>{content.artistName}</span>
            </div>
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Review Results */}
          {review ? (
            <div className="space-y-4">

              {/* Overall Rating */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Overall Rating</h3>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-lg border font-medium ${getRatingColor(review.overallRating)}`}>
                    {review.overallRating?.toUpperCase().replace('-', ' ')}
                  </span>
                  {review.ageRecommendation && (
                    <span className="px-4 py-2 rounded-lg border bg-purple-100 text-purple-800 border-purple-200 font-medium">
                      Ages {review.ageRecommendation}
                    </span>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Summary</h3>
                  {lyrics && (
                    <button
                      onClick={() => setShowLyricsModal(true)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Lyrics
                    </button>
                  )}
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{review.summary}</p>
              </div>

              {/* Positive Aspects */}
              {review.positiveAspects && review.positiveAspects.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Positive Elements {review.positiveAspects.length > 0 && `(${review.positiveAspects.length})`}
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {review.positiveAspects.map((aspect, index) => (
                        <li key={index} className="flex items-start gap-2 text-green-900">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm">{aspect}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Inappropriate Content */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Content Concerns {review.inappropriateContent?.length > 0 && `(${review.inappropriateContent.length})`}
                </h3>
                {review.inappropriateContent && review.inappropriateContent.length > 0 ? (
                  <div className="space-y-3">
                    {review.inappropriateContent.map((issue, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 capitalize">
                                {issue.category}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{issue.context}</p>
                          </div>
                        </div>
                        <div className="bg-white border border-red-200 rounded p-3">
                          <p className="text-sm text-gray-600 italic">"{issue.quote}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <svg className="w-12 h-12 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-800 font-medium">No concerning content found</p>
                    <p className="text-green-700 text-sm mt-1">This appears to be appropriate for the target audience</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Fetching Lyrics Indicator */}
              {fetchingLyrics && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex gap-3 items-center">
                    <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Fetching lyrics from Musixmatch...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lyrics Source Indicator */}
              {lyricsSource && !fetchingLyrics && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex gap-2 items-center text-sm text-green-800">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Lyrics automatically retrieved from {lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}</span>
                  </div>
                </div>
              )}

              {/* Lyrics Input */}
              {!cachedReview && (
                <>
                  {showLyricsInput && !fetchingLyrics && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Lyrics Not Found</p>
                          <p>Automatic lyrics retrieval failed. Please paste the lyrics manually for AI analysis.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lyrics
                    </label>
                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Paste the song lyrics here..."
                      rows={12}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3 justify-end">
            {!review ? (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-500 hover:text-gray-700 transition font-medium"
                >
                  Not Now
                </button>
                <button
                  key={loading ? 'loading' : 'ready'}
                  onClick={handleReview}
                  disabled={loading || (!lyrics.trim() && !cachedReview)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl hover:from-purple-700 hover:to-pink-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                >
                  {loading && (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading && (
                    <span>Analyzing...</span>
                  )}
                  {!loading && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {!loading && (
                    <span>Review with AI</span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-500 hover:text-gray-700 transition font-medium"
                >
                  Close
                </button>
                {onDeny && (
                  <button
                    onClick={() => {
                      onDeny();
                      onClose();
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    Deny
                  </button>
                )}
                {onApprove && (
                  <button
                    onClick={() => {
                      onApprove();
                      onClose();
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Approve Anyway
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lyrics Modal */}
      {showLyricsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Lyrics</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {content.songName || content.trackName} • {content.artistName}
                </p>
                {lyricsSource && (
                  <p className="text-xs text-gray-500 mt-1">
                    Source: {lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowLyricsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Lyrics Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                {lyrics}
              </pre>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowLyricsModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentReviewModal;
