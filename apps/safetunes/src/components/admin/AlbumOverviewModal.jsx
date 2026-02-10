import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function AlbumOverviewModal({ isOpen, onClose, albumData }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reviewAlbumOverviewAction = useAction(api.ai.contentReview.reviewAlbumOverview);

  const handleReview = async () => {
    if (!albumData) return;

    setLoading(true);
    setError('');
    setOverview(null);

    try {
      const result = await reviewAlbumOverviewAction({
        appleAlbumId: albumData.appleAlbumId,
        albumName: albumData.albumName,
        artistName: albumData.artistName,
        editorialNotes: albumData.editorialNotes,
        trackList: albumData.trackList || [],
      });

      if (result.success) {
        setOverview(result.overview);
      } else {
        setError(result.error || 'Failed to review album');
      }
    } catch (err) {
      console.error('[Album Overview] Error:', err);
      setError('Failed to review album. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset state when albumData changes
  useEffect(() => {
    if (albumData) {
      setOverview(null);
      setError('');
    }
  }, [albumData?.appleAlbumId]);

  // Auto-review when modal opens
  useEffect(() => {
    if (isOpen && albumData && !overview && !loading) {
      handleReview();
    }
  }, [isOpen, albumData]);

  if (!isOpen) return null;

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'Likely Safe':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'Review Recommended':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'Detailed Review Required':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getRecommendationIcon = (recommendation) => {
    switch (recommendation) {
      case 'Likely Safe':
        return '✅';
      case 'Review Recommended':
        return '⚠️';
      case 'Detailed Review Required':
        return '🚨';
      default:
        return '📋';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold text-gray-900">Album Overview</h2>
            {albumData && (
              <>
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {albumData.albumName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {albumData.artistName} • {albumData.trackList?.length || 0} tracks
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
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
              <svg className="animate-spin h-10 w-10 text-purple-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-600">Analyzing album...</p>
              <p className="text-sm text-gray-500 mt-2">Reviewing track titles and artist profile</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 font-medium mb-2">Analysis Failed</p>
              <p className="text-gray-600 text-sm text-center">{error}</p>
              <button
                onClick={handleReview}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
              >
                Try Again
              </button>
            </div>
          ) : overview ? (
            <div className="space-y-6">
              {/* Recommendation Badge */}
              <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(overview.recommendation)}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getRecommendationIcon(overview.recommendation)}</span>
                  <div>
                    <h3 className="font-bold text-lg">{overview.recommendation}</h3>
                    <p className="text-sm mt-1">{overview.suggestedAction}</p>
                  </div>
                </div>
              </div>

              {/* Overall Impression */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Overall Impression
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                  {overview.overallImpression}
                </p>
              </div>

              {/* Artist Profile */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Artist Profile
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                  {overview.artistProfile}
                </p>
              </div>
            </div>
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

export default AlbumOverviewModal;
