import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Play, Pause, Check, Shield, Sparkles, AlertTriangle, CheckCircle, Loader2, FileText, ChevronRight, Music, Info } from 'lucide-react';

// Import shared components from AlbumInspector
import { AssignmentSheet } from './AlbumInspector';

// Format duration from milliseconds
const formatDuration = (ms) => {
  if (!ms) return '--:--';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Lyrics & Safety Inspector Slide-Over Panel
function LyricsInspector({ isOpen, onClose, track }) {
  const [lyrics, setLyrics] = useState('');
  const [lyricsSource, setLyricsSource] = useState(null);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState('');

  // AI Actions
  const reviewContentAction = useAction(api.ai.contentReview.reviewContent);
  const fetchLyricsAction = useAction(api.ai.lyrics.fetchLyrics);

  // Auto-fetch lyrics when panel opens
  useEffect(() => {
    const autoFetchLyrics = async () => {
      if (isOpen && track && !lyrics) {
        const trackName = track.name || track.songName || '';
        const artistName = track.artistName || '';

        if (!trackName || !artistName) {
          setError('Missing track or artist information');
          return;
        }

        setFetchingLyrics(true);
        setError('');

        try {
          const result = await fetchLyricsAction({ trackName, artistName });

          if (result.success && result.lyrics) {
            setLyrics(result.lyrics);
            setLyricsSource(result.source);
          } else {
            setError('Could not find lyrics automatically. You can paste them manually.');
          }
        } catch (err) {
          console.error('[LyricsInspector] Fetch error:', err);
          setError('Failed to fetch lyrics');
        } finally {
          setFetchingLyrics(false);
        }
      }
    };

    autoFetchLyrics();
  }, [isOpen, track]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setLyrics('');
      setLyricsSource(null);
      setReview(null);
      setError('');
      setFetchingLyrics(false);
      setReviewLoading(false);
    }
  }, [isOpen]);

  // Run AI review on lyrics
  const handleRunReview = async () => {
    if (!lyrics.trim()) {
      setError('Need lyrics to analyze');
      return;
    }

    setReviewLoading(true);
    setError('');

    try {
      const result = await reviewContentAction({
        appleTrackId: track.id || track.appleSongId,
        appleAlbumId: track.albumId,
        reviewType: 'song',
        trackName: track.name || track.songName,
        artistName: track.artistName,
        lyrics: lyrics.trim(),
        lyricsSource: lyricsSource || 'manual',
      });

      // API returns { review: {...}, fromCache: bool } - extract the review object
      const reviewData = result.review || result;
      console.log('[PlaylistInspector] Review result:', { hasReview: !!result.review, summary: reviewData.summary });
      setReview(reviewData);
    } catch (err) {
      console.error('[LyricsInspector] Review error:', err);
      setError(err.message || 'Failed to analyze lyrics');
    } finally {
      setReviewLoading(false);
    }
  };

  if (!isOpen || !track) return null;

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'appropriate': return 'bg-green-100 text-green-800 border-green-200';
      case 'use-caution': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inappropriate': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'mild': return 'bg-yellow-100 text-yellow-700';
      case 'moderate': return 'bg-orange-100 text-orange-700';
      case 'severe': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs text-white/60 uppercase tracking-wide mb-1">AI Lyrics Review</p>
              <h2 className="text-xl font-bold truncate">{track.name || track.songName}</h2>
              <p className="text-white/70 text-sm truncate">{track.artistName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State - Fetching Lyrics */}
          {fetchingLyrics && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="flex gap-3 items-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Fetching lyrics from Musixmatch...</p>
                </div>
              </div>
            </div>
          )}

          {/* Lyrics Source Indicator */}
          {lyricsSource && !fetchingLyrics && !review && (
            <div className="p-3 bg-green-50 border-b border-green-200">
              <div className="flex gap-2 items-center text-sm text-green-800">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Lyrics found via {lyricsSource === 'musixmatch' ? 'Musixmatch' : lyricsSource}</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !fetchingLyrics && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Note</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Review Results */}
          {review ? (
            <div className="p-5 space-y-4">
              {/* Overall Rating */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Overall Rating</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-lg border font-medium text-sm ${getRatingColor(review.overallRating)}`}>
                    {review.overallRating?.toUpperCase().replace('-', ' ')}
                  </span>
                  {review.ageRecommendation && (
                    <span className="px-3 py-1.5 rounded-lg border bg-purple-100 text-purple-800 border-purple-200 font-medium text-sm">
                      Ages {review.ageRecommendation}
                    </span>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Summary</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{review.summary}</p>
              </div>

              {/* Positive Aspects */}
              {review.positiveAspects && review.positiveAspects.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Positive Elements</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <ul className="space-y-1.5">
                      {review.positiveAspects.map((aspect, index) => (
                        <li key={index} className="flex items-start gap-2 text-green-900 text-sm">
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                          <span>{aspect}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Content Concerns */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Content Concerns {review.inappropriateContent?.length > 0 && `(${review.inappropriateContent.length})`}
                </h3>
                {review.inappropriateContent && review.inappropriateContent.length > 0 ? (
                  <div className="space-y-2">
                    {review.inappropriateContent.map((issue, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 capitalize text-sm">
                            {issue.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mb-2">{issue.context}</p>
                        <div className="bg-white border border-red-200 rounded p-2">
                          <p className="text-xs text-gray-600 italic">"{issue.quote}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-600" />
                    <p className="text-green-800 font-medium text-sm">No concerning content found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Lyrics Input / Display */}
              {!fetchingLyrics && (
                <div className="p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Lyrics
                  </h3>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Lyrics will appear here or paste them manually..."
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2">
          {!review ? (
            <button
              key={reviewLoading ? 'loading' : 'ready'}
              onClick={handleRunReview}
              disabled={reviewLoading || !lyrics.trim()}
              className="w-full py-3 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {reviewLoading && (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              {reviewLoading && (
                <span>Analyzing...</span>
              )}
              {!reviewLoading && (
                <Sparkles className="w-5 h-5" />
              )}
              {!reviewLoading && (
                <span>Analyze with AI</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setReview(null)}
              className="w-full py-3 rounded-xl font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 transition"
            >
              View Lyrics Again
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Playlist Safety Report Modal
function PlaylistSafetyReport({ isOpen, onClose, playlist, overview, loading, error, onRetry }) {
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

  const getHeaderGradient = (recommendation) => {
    switch (recommendation) {
      case 'Likely Safe':
        return 'from-green-500 to-emerald-500';
      case 'Review Recommended':
        return 'from-amber-500 to-orange-500';
      case 'Detailed Review Required':
        return 'from-red-500 to-rose-500';
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${overview ? getHeaderGradient(overview.recommendation) : 'from-purple-500 to-pink-500'} text-white p-6`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Playlist Overview</h2>
              <p className="text-white/80 text-sm">{playlist?.attributes?.name || 'Unknown Playlist'}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
              <p className="text-gray-600">Analyzing playlist...</p>
              <p className="text-sm text-gray-500 mt-2">Reviewing track titles and artists</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-600 font-medium mb-2">Analysis Failed</p>
              <p className="text-gray-600 text-sm text-center">{error}</p>
              <button
                onClick={onRetry}
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
                  <Info className="w-4 h-4 text-gray-500" />
                  Overall Impression
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                  {overview.overallImpression}
                </p>
              </div>

              {/* Artist Profile (if available) */}
              {overview.artistProfile && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Content Profile
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                    {overview.artistProfile}
                  </p>
                </div>
              )}

              {/* Flagged Tracks */}
              {overview.flaggedTracks && overview.flaggedTracks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Tracks to Review ({overview.flaggedTracks.length})
                  </h4>
                  <div className="space-y-2">
                    {overview.flaggedTracks.map((track, index) => (
                      <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="font-medium text-gray-900 text-sm">{track.name}</p>
                        <p className="text-xs text-amber-700 mt-1">{track.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Playlist Inspector Component
function PlaylistInspector({ isOpen, onClose, playlist, tracks, kidProfiles, onAddSongs }) {
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const [playingTrack, setPlayingTrack] = useState(null);
  const [playingTrackMeta, setPlayingTrackMeta] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [audioElement, setAudioElement] = useState(null);
  const [showAssignment, setShowAssignment] = useState(false);
  const [lyricsInspectorTrack, setLyricsInspectorTrack] = useState(null);

  // AI Scan State
  const [aiScanState, setAiScanState] = useState('idle'); // 'idle' | 'scanning' | 'complete' | 'error'
  const [playlistOverview, setPlaylistOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [showPlaylistReport, setShowPlaylistReport] = useState(false);

  // Track AI review results (per track) - populated from overview
  const [trackReviews, setTrackReviews] = useState({});

  // AI Action - reuse album overview action (works for any track list)
  const reviewPlaylistOverviewAction = useAction(api.ai.contentReview.reviewAlbumOverview);

  // Initialize with all tracks selected and reset AI state
  useEffect(() => {
    if (tracks?.length > 0) {
      setSelectedTracks(new Set(tracks.map(t => t.id)));
    }
    // Reset AI state when tracks change
    setAiScanState('idle');
    setPlaylistOverview(null);
    setOverviewError('');
    setTrackReviews({});
  }, [tracks]);

  // Cleanup audio on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  // Stop playback when modal closes
  useEffect(() => {
    if (!isOpen && audioElement) {
      audioElement.pause();
      audioElement.src = '';
      setPlayingTrack(null);
      setPlayingTrackMeta(null);
      setPreviewCurrentTime(0);
      setPreviewDuration(0);
    }
  }, [isOpen, audioElement]);

  // Toggle track selection
  const toggleTrack = (trackId) => {
    setSelectedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  // Select all tracks
  const selectAll = () => {
    setSelectedTracks(new Set(tracks.map(t => t.id)));
  };

  // Deselect all tracks
  const deselectAll = () => {
    setSelectedTracks(new Set());
  };

  // Select only clean tracks (no explicit flag and not AI-flagged)
  const selectCleanOnly = () => {
    const cleanTracks = tracks.filter(t => !t.isExplicit && !trackReviews[t.id]?.hasFlags);
    setSelectedTracks(new Set(cleanTracks.map(t => t.id)));
  };

  // Run AI playlist overview scan
  const runAiScan = async () => {
    if (!playlist || !tracks?.length) return;

    setAiScanState('scanning');
    setOverviewError('');
    setPlaylistOverview(null);

    try {
      const playlistName = playlist.attributes?.name || 'Unknown Playlist';
      const curatorName = playlist.attributes?.curatorName || 'Apple Music';

      // Build trackList for the API
      const trackList = tracks.map(t => ({
        name: t.name || t.songName,
        artistName: t.artistName,
        isExplicit: t.isExplicit || false,
      }));

      const result = await reviewPlaylistOverviewAction({
        appleAlbumId: playlist.id, // Use playlist ID
        albumName: playlistName,   // Playlist name
        artistName: curatorName,   // Curator as "artist"
        editorialNotes: playlist.attributes?.description?.standard || '',
        trackList,
      });

      if (result.success) {
        setPlaylistOverview(result.overview);
        setAiScanState('complete');

        // Mark flagged tracks in trackReviews state
        if (result.overview.flaggedTracks && result.overview.flaggedTracks.length > 0) {
          const newTrackReviews = {};
          result.overview.flaggedTracks.forEach(flaggedTrack => {
            // Find matching track by name
            const matchingTrack = tracks.find(t =>
              (t.name || t.songName)?.toLowerCase() === flaggedTrack.name?.toLowerCase()
            );
            if (matchingTrack) {
              newTrackReviews[matchingTrack.id] = {
                hasFlags: true,
                reason: flaggedTrack.reason
              };
            }
          });
          setTrackReviews(newTrackReviews);
        }
      } else {
        setOverviewError(result.error || 'Failed to review playlist');
        setAiScanState('error');
      }
    } catch (err) {
      console.error('[PlaylistInspector] AI review error:', err);
      setOverviewError('Failed to analyze playlist. Please try again.');
      setAiScanState('error');
    }
  };

  // Toggle play state with preview
  const togglePlay = async (track) => {
    if (playingTrack === track.id) {
      // Toggle pause/play
      if (audioElement) {
        if (audioElement.paused) {
          audioElement.play();
        } else {
          audioElement.pause();
        }
      }
    } else {
      // Stop current audio
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }

      if (track.previewUrl) {
        const audio = new Audio(track.previewUrl);

        // Time update listener
        audio.ontimeupdate = () => {
          setPreviewCurrentTime(audio.currentTime);
          setPreviewDuration(audio.duration || 0);
        };

        audio.onloadedmetadata = () => {
          setPreviewDuration(audio.duration || 0);
        };

        audio.onended = () => {
          setPlayingTrack(null);
          setPlayingTrackMeta(null);
          setPreviewCurrentTime(0);
          setPreviewDuration(0);
        };

        audio.play().catch(err => console.error('Failed to play preview:', err));
        setAudioElement(audio);
        setPlayingTrack(track.id);
        setPlayingTrackMeta({
          name: track.name || track.songName || 'Unknown',
          artist: track.artistName || 'Unknown Artist',
          artworkUrl: track.artworkUrl || playlist?.attributes?.artwork?.url
        });
        setPreviewCurrentTime(0);
        setPreviewDuration(0);
      }
    }
  };

  // Seek handler for preview
  const handlePreviewSeek = (e) => {
    if (!previewDuration || !audioElement) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * previewDuration;
    audioElement.currentTime = newTime;
  };

  // Format time helper
  const formatPreviewTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Stop preview and cleanup
  const stopPreview = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    setPlayingTrack(null);
    setPlayingTrackMeta(null);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
  };

  // Handle assignment confirmation
  const handleAssignmentConfirm = (options) => {
    const selectedTrackData = tracks.filter(t => selectedTracks.has(t.id));
    onAddSongs?.({
      playlist,
      tracks: selectedTrackData,
      ...options
    });
    setShowAssignment(false);
    onClose();
  };

  if (!isOpen || !playlist) return null;

  const artworkUrl = playlist.attributes?.artwork?.url
    ?.replace('{w}', '400')
    .replace('{h}', '400');

  const playlistName = playlist.attributes?.name || 'Unknown Playlist';
  const curatorName = playlist.attributes?.curatorName || 'Apple Music';

  // Calculate safety stats
  const explicitCount = tracks?.filter(t => t.isExplicit).length || 0;
  const cleanCount = (tracks?.length || 0) - explicitCount;
  const hasExplicit = explicitCount > 0;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white safe-area-top">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-4 flex gap-5">
          {/* Playlist Art */}
          <div className="flex-shrink-0">
            {artworkUrl ? (
              <img
                src={artworkUrl}
                alt={playlistName}
                className="w-32 h-32 rounded-2xl shadow-2xl object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music className="w-12 h-12 text-white" />
              </div>
            )}
          </div>

          {/* Playlist Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-xs text-white/60 uppercase tracking-wide mb-1">Playlist</p>
            <h1 className="text-2xl font-bold truncate">
              {playlistName}
            </h1>
            <p className="text-white/70 text-sm truncate">
              {curatorName}
            </p>
            <p className="text-white/50 text-sm mt-1">
              {tracks?.length || 0} tracks • {selectedTracks.size} selected
            </p>
          </div>
        </div>
      </div>

      {/* Safety Banner - Explicit tag check only */}
      <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
        {hasExplicit ? (
          <div className="flex items-center gap-4 py-4 px-6 rounded-2xl border-2 bg-yellow-50 border-yellow-200">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-yellow-800">
                {explicitCount} Explicit {explicitCount === 1 ? 'Track' : 'Tracks'} Found
              </p>
              <p className="text-sm text-yellow-600">
                Use "Select Clean Only" to filter them out
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 py-4 px-6 rounded-2xl border-2 bg-green-50 border-green-200">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-800">All Clean</p>
              <p className="text-sm text-green-600">
                No explicit tracks detected in this playlist
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar - Filter Chips */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-gray-200 bg-white">
        <button
          onClick={selectAll}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        >
          Select All
        </button>
        <button
          onClick={deselectAll}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        >
          Deselect All
        </button>
        {hasExplicit && (
          <button
            onClick={selectCleanOnly}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
          >
            Select Clean Only
          </button>
        )}
      </div>

      {/* Tracklist */}
      <div className="flex-1 overflow-y-auto">
        {tracks?.map((track, index) => {
          const isSelected = selectedTracks.has(track.id);
          const isPlaying = playingTrack === track.id;
          const trackName = track.name || track.songName;

          return (
            <div
              key={track.uniqueKey || track.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition ${
                isSelected ? 'bg-purple-50/50' : 'bg-white'
              }`}
            >
              {/* Play Button */}
              <button
                onClick={() => togglePlay(track)}
                disabled={!track.previewUrl}
                className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition ${
                  isPlaying
                    ? 'bg-purple-600 text-white'
                    : track.previewUrl
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </button>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5">{index + 1}</span>
                  <p className="font-medium text-gray-900 truncate">{trackName}</p>
                  {track.isExplicit && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-200 rounded text-[10px] font-bold text-gray-600">E</span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-5">
                  <p className="text-sm text-gray-500 truncate">{track.artistName}</p>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-400">{formatDuration(track.durationInMillis)}</span>
                </div>
              </div>

              {/* Lyrics Inspector Button */}
              <button
                onClick={() => setLyricsInspectorTrack(track)}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                title="View lyrics & safety details"
              >
                <FileText className="w-4 h-4 text-gray-500" />
              </button>

              {/* AI Warning Badge (if reviewed and flagged) */}
              {trackReviews[track.id]?.hasFlags && (
                <button
                  onClick={() => setLyricsInspectorTrack(track)}
                  className="flex-shrink-0 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1 transition"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Flagged
                </button>
              )}

              {/* Checkbox */}
              <button
                onClick={() => toggleTrack(track.id)}
                className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition ${
                  isSelected
                    ? 'bg-purple-600 border-purple-600'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Sticky Footer */}
      <div className="bg-white border-t border-gray-200 p-4 safe-area-bottom">
        {/* Step indicator micro-copy */}
        <p className="text-center text-xs text-gray-500 mb-3">
          Next: Select specific kids &amp; destination (Library/Discover)
        </p>
        <button
          onClick={() => setShowAssignment(true)}
          disabled={selectedTracks.size === 0}
          className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
        >
          {selectedTracks.size === 0 ? (
            'Select Songs to Continue'
          ) : (
            <>
              Continue with {selectedTracks.size} {selectedTracks.size === 1 ? 'Song' : 'Songs'}
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Assignment Bottom Sheet */}
      <AssignmentSheet
        isOpen={showAssignment}
        onClose={() => setShowAssignment(false)}
        selectedCount={selectedTracks.size}
        kidProfiles={kidProfiles}
        onConfirm={handleAssignmentConfirm}
      />

      {/* Lyrics & Safety Inspector */}
      <LyricsInspector
        isOpen={!!lyricsInspectorTrack}
        onClose={() => setLyricsInspectorTrack(null)}
        track={lyricsInspectorTrack}
      />

      {/* Playlist Safety Report Modal */}
      <PlaylistSafetyReport
        isOpen={showPlaylistReport}
        onClose={() => setShowPlaylistReport(false)}
        playlist={playlist}
        overview={playlistOverview}
        loading={aiScanState === 'scanning'}
        error={overviewError}
        onRetry={runAiScan}
      />

      {/* Song Preview Popup */}
      {playingTrack && playingTrackMeta && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={stopPreview}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-5 mx-4 max-w-xs w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Track Info */}
            <div className="flex items-center gap-3 mb-4">
              {playingTrackMeta.artworkUrl ? (
                <img
                  src={playingTrackMeta.artworkUrl.replace('{w}', '100').replace('{h}', '100')}
                  alt={playingTrackMeta.name}
                  className="w-14 h-14 rounded-lg shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Music className="w-7 h-7 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{playingTrackMeta.name}</p>
                <p className="text-sm text-gray-400 truncate">{playingTrackMeta.artist}</p>
              </div>
            </div>

            {/* Seekable Progress Bar */}
            {previewDuration > 0 && (
              <div className="mb-4">
                <div
                  className="h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                  onClick={handlePreviewSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${(previewCurrentTime / previewDuration) * 100}%` }}
                  />
                  {/* Scrubber thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${(previewCurrentTime / previewDuration) * 100}% - 7px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                  <span>{formatPreviewTime(previewCurrentTime)}</span>
                  <span>{formatPreviewTime(previewDuration)}</span>
                </div>
              </div>
            )}

            {/* Done Button */}
            <button
              onClick={stopPreview}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaylistInspector;
