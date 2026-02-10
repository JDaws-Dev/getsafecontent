import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import musicKitService from '../../config/musickit';
import { useToast } from '../common/Toast';
import EmptyState from '../common/EmptyState';
import { useConvex } from 'convex/react';
import { SafeTunesLogo } from '../shared/SafeTunesLogo';

// ============================================================
// ICONS (inline SVGs to avoid lucide-react dependency issues)
// ============================================================
const PlayIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
  </svg>
);

const PauseIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DocumentIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SparklesIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const AlertIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LoaderIcon = ({ className }) => (
  <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Format duration from milliseconds
const formatDuration = (ms) => {
  if (!ms) return '--:--';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================================
// LYRICS INSPECTOR SLIDE-OVER
// ============================================================
function LyricsInspector({ isOpen, onClose, track, albumId, flaggedLines = [] }) {
  const [lyrics, setLyrics] = useState('');
  const [lyricsSource, setLyricsSource] = useState(null);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHighlightedLyrics, setShowHighlightedLyrics] = useState(false);

  const reviewContentAction = useAction(api.ai.contentReview.reviewContent);
  const fetchLyricsAction = useAction(api.ai.lyrics.fetchLyrics);

  // Auto-fetch lyrics when panel opens
  useEffect(() => {
    const autoFetchLyrics = async () => {
      if (isOpen && track && !lyrics) {
        const trackName = track.name || track.songName || '';
        const artistName = track.artistName || '';

        if (!trackName || !artistName) {
          setError('Missing track info');
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
            setError('Could not find lyrics. Paste them manually.');
          }
        } catch (err) {
          setError('Failed to fetch lyrics');
        } finally {
          setFetchingLyrics(false);
        }
      }
    };

    autoFetchLyrics();
  }, [isOpen, track]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setLyrics('');
      setLyricsSource(null);
      setReview(null);
      setError('');
      setFetchingLyrics(false);
      setReviewLoading(false);
      setShowHighlightedLyrics(false);
    }
  }, [isOpen]);

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
        appleAlbumId: albumId,
        reviewType: 'song',
        trackName: track.name || track.songName,
        artistName: track.artistName,
        lyrics: lyrics.trim(),
        lyricsSource: lyricsSource || 'manual',
      });

      // API returns { review: {...}, fromCache: bool } - extract the review object
      console.log('[LyricsInspector] AI review result:', JSON.stringify(result, null, 2));
      // Handle both nested { review: {...} } and flat { summary: ... } structures
      const reviewData = result.review || result;
      console.log('[LyricsInspector] Extracted review data:', JSON.stringify(reviewData, null, 2));
      console.log('[LyricsInspector] Summary:', reviewData.summary);
      setReview(reviewData);
    } catch (err) {
      setError(err.message || 'Failed to analyze');
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

  // Collect all flagged quotes from AI review
  const getFlaggedQuotes = () => {
    const quotes = [...flaggedLines];
    if (review?.inappropriateContent) {
      review.inappropriateContent.forEach(issue => {
        if (issue.quote) {
          quotes.push(issue.quote);
        }
      });
    }
    return quotes;
  };

  // Highlight flagged lines in lyrics
  const renderLyricsWithHighlights = () => {
    if (!lyrics) return null;

    const flaggedQuotes = getFlaggedQuotes();
    const lines = lyrics.split('\n');

    return lines.map((line, idx) => {
      // Check if this line matches any flagged quote
      const matchingIssue = review?.inappropriateContent?.find(issue =>
        issue.quote && line.toLowerCase().includes(issue.quote.toLowerCase().substring(0, 20))
      );
      const isFlagged = flaggedQuotes.some(fl =>
        fl && line.toLowerCase().includes(fl.toLowerCase().substring(0, 20))
      );

      // Get severity color
      let bgColor = '';
      let borderColor = '';
      if (matchingIssue) {
        switch (matchingIssue.severity) {
          case 'severe':
            bgColor = 'bg-red-100';
            borderColor = 'border-red-500';
            break;
          case 'moderate':
            bgColor = 'bg-orange-100';
            borderColor = 'border-orange-500';
            break;
          case 'mild':
            bgColor = 'bg-yellow-100';
            borderColor = 'border-yellow-500';
            break;
          default:
            bgColor = 'bg-red-100';
            borderColor = 'border-red-500';
        }
      } else if (isFlagged) {
        bgColor = 'bg-yellow-100';
        borderColor = 'border-yellow-500';
      }

      return (
        <div
          key={idx}
          className={`py-0.5 px-1 -mx-1 rounded ${
            isFlagged || matchingIssue ? `${bgColor} border-l-2 ${borderColor} pl-2` : ''
          }`}
        >
          {line || '\u00A0'}
          {matchingIssue && (
            <span className="ml-2 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              {matchingIssue.category}
            </span>
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
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
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {fetchingLyrics && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="flex gap-3 items-center">
                <LoaderIcon className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-800 font-medium">Fetching lyrics...</p>
              </div>
            </div>
          )}

          {lyricsSource && !fetchingLyrics && !review && (
            <div className="p-3 bg-green-50 border-b border-green-200">
              <div className="flex gap-2 items-center text-sm text-green-800">
                <CheckIcon className="w-4 h-4 text-green-600" />
                <span>Lyrics found via {lyricsSource}</span>
              </div>
            </div>
          )}

          {error && !fetchingLyrics && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex gap-3">
                <AlertIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
            </div>
          )}

          {review ? (
            showHighlightedLyrics ? (
              // Highlighted lyrics view
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-sm">Lyrics with Highlights</h3>
                  <button
                    onClick={() => setShowHighlightedLyrics(false)}
                    className="text-xs text-purple-600 font-medium hover:text-purple-700"
                  >
                    Back to Summary
                  </button>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded-sm"></span>
                    Severe
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-orange-100 border-l-2 border-orange-500 rounded-sm"></span>
                    Moderate
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-100 border-l-2 border-yellow-500 rounded-sm"></span>
                    Mild
                  </span>
                </div>
                <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap">
                  {renderLyricsWithHighlights()}
                </div>
              </div>
            ) : (
              // Review summary view
              <div className="p-5 space-y-4">
                {/* Overall Rating */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Overall Rating</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1.5 rounded-lg border font-semibold text-sm ${getRatingColor(review.overallRating)}`}>
                      {review.overallRating?.toUpperCase().replace('-', ' ')}
                    </span>
                    {review.ageRecommendation && (
                      <span className="px-3 py-1.5 rounded-lg border bg-purple-100 text-purple-800 border-purple-200 font-semibold text-sm">
                        Ages {review.ageRecommendation}
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary - improved contrast */}
                {review.summary && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Summary</h3>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">{review.summary}</p>
                  </div>
                )}

                {/* Content Concerns */}
                {review.inappropriateContent?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Content Concerns ({review.inappropriateContent.length})
                      </h3>
                      <button
                        onClick={() => setShowHighlightedLyrics(true)}
                        className="text-xs text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
                      >
                        <DocumentIcon className="w-3.5 h-3.5" />
                        View in Lyrics
                      </button>
                    </div>
                    <div className="space-y-2">
                      {review.inappropriateContent.map((issue, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 capitalize text-sm">{issue.category}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 mb-2">{issue.context}</p>
                          <div className="bg-white border border-red-200 rounded p-2">
                            <p className="text-sm text-gray-700 italic">"{issue.quote}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            !fetchingLyrics && (
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lyrics</h3>
                {flaggedLines.length > 0 ? (
                  <div className="font-mono text-sm text-gray-700 whitespace-pre-wrap">
                    {renderLyricsWithHighlights()}
                  </div>
                ) : (
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Lyrics will appear here..."
                    rows={14}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                )}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2">
          {!review ? (
            <button
              key={reviewLoading ? 'loading' : 'ready'}
              onClick={handleRunReview}
              disabled={reviewLoading || !lyrics.trim()}
              className="w-full py-3 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {reviewLoading && (
                <LoaderIcon className="w-5 h-5 animate-spin" />
              )}
              {reviewLoading && (
                <span>Analyzing...</span>
              )}
              {!reviewLoading && (
                <SparklesIcon className="w-5 h-5" />
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

// ============================================================
// REQUEST INSPECTOR MODAL (Album Track Selection)
// ============================================================
function RequestInspectorModal({
  isOpen,
  onClose,
  request,
  kidProfile,
  onApproveSelected,
  onDenyAll,
  onToggleArtwork,
  isArtworkHidden,
}) {
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aiScanState, setAiScanState] = useState('idle');
  const [albumOverview, setAlbumOverview] = useState(null);
  const [lyricsTrack, setLyricsTrack] = useState(null);
  const [approving, setApproving] = useState(false);
  const [showDenySheet, setShowDenySheet] = useState(false);

  const reviewAlbumOverviewAction = useAction(api.ai.contentReview.reviewAlbumOverview);

  // Listen to playback time updates
  useEffect(() => {
    if (!isOpen) return;

    const handleTimeUpdate = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setCurrentTime(state.currentPlaybackTime || 0);
        setDuration(state.currentPlaybackDuration || 0);
      }
    };

    musicKitService.addEventListener('playbackTimeDidChange', handleTimeUpdate);
    return () => {
      musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
    };
  }, [isOpen]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (!duration) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    musicKitService.seekToTime(newTime);
  };

  // Load tracks and AUTO-RUN AI scan when modal opens
  useEffect(() => {
    const loadTracksAndAnalyze = async () => {
      if (!isOpen || !request?.appleAlbumId) return;

      setLoadingTracks(true);
      try {
        await musicKitService.initialize();
        const albumTracks = await musicKitService.getAlbumTracks(request.appleAlbumId);

        const formattedTracks = albumTracks.map((track, index) => ({
          id: track.id,
          name: track.attributes?.name || '',
          artistName: track.attributes?.artistName || request.artistName,
          trackNumber: index + 1,
          duration: track.attributes?.durationInMillis,
          isExplicit: track.attributes?.contentRating === 'explicit',
          aiFlag: null,
        }));

        setTracks(formattedTracks);

        // Auto-select non-explicit tracks (safety first)
        const cleanTracks = formattedTracks.filter(t => !t.isExplicit);
        setSelectedTracks(new Set(cleanTracks.map(t => t.id)));

        // AUTO-RUN AI SCAN (cheap, ~$0.0002-0.0004 per album)
        setAiScanState('scanning');
        try {
          const trackList = formattedTracks.map(t => ({
            name: t.name,
            artistName: t.artistName,
            contentRating: t.isExplicit ? 'explicit' : null,
          }));

          const result = await reviewAlbumOverviewAction({
            appleAlbumId: request.appleAlbumId,
            albumName: request.albumName,
            artistName: request.artistName,
            editorialNotes: '',
            trackList,
          });

          if (result.success) {
            setAlbumOverview(result.overview);
            setAiScanState('complete');
          } else {
            setAiScanState('error');
          }
        } catch (aiErr) {
          console.error('Auto AI scan error:', aiErr);
          setAiScanState('error');
        }
      } catch (err) {
        console.error('Failed to load tracks:', err);
      } finally {
        setLoadingTracks(false);
      }
    };

    loadTracksAndAnalyze();
  }, [isOpen, request?.appleAlbumId]);

  // Reset state on close and stop any playing music
  useEffect(() => {
    if (!isOpen) {
      // Stop music when modal closes to prevent duplicate players
      musicKitService.stop();
      setTracks([]);
      setSelectedTracks(new Set());
      setAiScanState('idle');
      setAlbumOverview(null);
      setLyricsTrack(null);
      setPlayingTrackId(null);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [isOpen]);

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

  const selectAll = () => {
    console.log('selectAll called, tracks:', tracks.length);
    setSelectedTracks(new Set(tracks.map(t => t.id)));
  };
  const deselectAll = () => {
    console.log('deselectAll called');
    setSelectedTracks(new Set());
  };
  const selectCleanOnly = () => {
    const clean = tracks.filter(t => !t.isExplicit);
    console.log('selectCleanOnly called, clean tracks:', clean.length, 'of', tracks.length);
    setSelectedTracks(new Set(clean.map(t => t.id)));
  };

  const handlePlayTrack = async (trackId) => {
    if (playingTrackId === trackId) {
      musicKitService.pause();
      setPlayingTrackId(null);
      return;
    }

    try {
      await musicKitService.playSong(trackId);
      setPlayingTrackId(trackId);
    } catch (err) {
      console.error('Play error:', err);
    }
  };

  const handleApprove = async () => {
    if (selectedTracks.size === 0) return;

    setApproving(true);
    const selectedTrackData = tracks.filter(t => selectedTracks.has(t.id));
    const skippedCount = tracks.length - selectedTracks.size;

    await onApproveSelected(request, selectedTrackData, skippedCount);
    setApproving(false);
    onClose();
  };

  if (!isOpen || !request) return null;

  const flaggedCount = tracks.filter(t => t.isExplicit || t.aiFlag).length;
  const artworkUrl = request.artworkUrl?.replace('{w}', '300').replace('{h}', '300');

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <div className="p-5 pt-4 flex gap-4">
          {artworkUrl ? (
            <img src={artworkUrl} alt={request.albumName} className="w-24 h-24 rounded-xl shadow-2xl object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gray-700 flex items-center justify-center">
              <SparklesIcon className="w-10 h-10 text-gray-500" />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-xs text-purple-300 font-medium mb-1">ALBUM REQUEST</p>
            <h1 className="text-xl font-bold truncate">{request.albumName}</h1>
            <p className="text-white/70 truncate">{request.artistName}</p>
            {kidProfile && (
              <p className="text-white/50 text-sm mt-1">
                Requested by {kidProfile.name.split(' ')[0]}
              </p>
            )}
          </div>
        </div>

        {/* Flag Banner */}
        {flaggedCount > 0 && (
          <div className="mx-4 mb-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertIcon className="w-4 h-4 text-yellow-400" />
              <p className="text-yellow-200 text-sm font-medium">
                {flaggedCount} track{flaggedCount !== 1 ? 's' : ''} flagged in this album
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Scan Card - Auto-analyzing */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        {(aiScanState === 'idle' || aiScanState === 'scanning') && (
          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-purple-50 rounded-xl border-2 border-purple-200">
            <LoaderIcon className="w-5 h-5 text-purple-600 animate-spin" />
            <div>
              <p className="font-medium text-purple-700 text-sm">AI Safety Scan</p>
              <p className="text-xs text-purple-500">Analyzing album automatically...</p>
            </div>
          </div>
        )}

        {aiScanState === 'error' && (
          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-gray-100 rounded-xl border-2 border-gray-200">
            <span className="text-xl">❓</span>
            <div>
              <p className="font-medium text-gray-700 text-sm">Scan Unavailable</p>
              <p className="text-xs text-gray-500">Review tracks manually</p>
            </div>
          </div>
        )}

        {aiScanState === 'complete' && albumOverview && (
          <div className={`flex items-center gap-3 py-3 px-4 rounded-xl border-2 ${
            albumOverview.recommendation === 'Likely Safe'
              ? 'bg-green-50 border-green-200'
              : albumOverview.recommendation === 'Review Recommended'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              albumOverview.recommendation === 'Likely Safe' ? 'bg-green-100' :
              albumOverview.recommendation === 'Review Recommended' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className="text-xl">
                {albumOverview.recommendation === 'Likely Safe' ? '✅' :
                 albumOverview.recommendation === 'Review Recommended' ? '⚠️' : '🚨'}
              </span>
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${
                albumOverview.recommendation === 'Likely Safe' ? 'text-green-800' :
                albumOverview.recommendation === 'Review Recommended' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {albumOverview.recommendation}
              </p>
              <p className={`text-xs ${
                albumOverview.recommendation === 'Likely Safe' ? 'text-green-600' :
                albumOverview.recommendation === 'Review Recommended' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {albumOverview.suggestedAction}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-200 bg-white">
        <button onClick={selectAll} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
          Select All
        </button>
        <button onClick={deselectAll} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
          Deselect All
        </button>
        {/* Hide Artwork Toggle */}
        <button
          onClick={() => onToggleArtwork && onToggleArtwork({ ...request, requestType: 'album' }, isArtworkHidden)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
            isArtworkHidden
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isArtworkHidden ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
          {isArtworkHidden ? 'Show Artwork' : 'Hide Artwork'}
        </button>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        {loadingTracks ? (
          <div className="flex items-center justify-center py-12">
            <LoaderIcon className="w-8 h-8 text-purple-600" />
          </div>
        ) : (
          tracks.map((track, index) => {
            const isSelected = selectedTracks.has(track.id);
            const isPlaying = playingTrackId === track.id;
            const isFlagged = track.isExplicit || track.aiFlag;

            return (
              <div
                key={track.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition ${
                  isSelected ? 'bg-purple-50/50' : isFlagged ? 'bg-red-50/30' : 'bg-white'
                }`}
              >
                {/* Play Button */}
                <button
                  onClick={() => handlePlayTrack(track.id)}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
                    isPlaying
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isPlaying ? (
                    <PauseIcon className="w-5 h-5" />
                  ) : (
                    <PlayIcon className="w-5 h-5" />
                  )}
                </button>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                    <p className="font-medium text-gray-900 text-sm truncate">{track.name}</p>
                    {track.isExplicit && (
                      <span className="flex-shrink-0 px-1 py-0.5 bg-red-100 rounded text-[9px] font-bold text-red-600">E</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-gray-500 truncate">{track.artistName}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{formatDuration(track.duration)}</span>
                  </div>
                </div>

                {/* Lyrics Button */}
                <button
                  onClick={() => setLyricsTrack(track)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-purple-100 flex items-center gap-1.5 transition text-xs font-medium text-gray-600 hover:text-purple-700"
                >
                  <DocumentIcon className="w-3.5 h-3.5" />
                  Lyrics
                </button>

                {/* AI Flag Badge */}
                {track.aiFlag && (
                  <span className="flex-shrink-0 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium flex items-center gap-1">
                    <AlertIcon className="w-3 h-3" />
                    {track.aiFlag.label}
                  </span>
                )}

                {/* Checkbox */}
                <button
                  onClick={() => toggleTrack(track.id)}
                  className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Preview Popup - centered modal when track is playing */}
      {playingTrackId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => {
            musicKitService.stop();
            setPlayingTrackId(null);
          }}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-5 mx-4 max-w-xs w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Track Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {tracks.find(t => t.id === playingTrackId)?.name || 'Playing...'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {tracks.find(t => t.id === playingTrackId)?.artistName}
                </p>
              </div>
            </div>

            {/* Seekable Progress Bar */}
            <div className="mb-4">
              <div
                className="h-2 bg-gray-700 rounded-full cursor-pointer group relative"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all relative"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-500 tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-xs text-gray-500 tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Done Button */}
            <button
              onClick={() => {
                musicKitService.stop();
                setPlayingTrackId(null);
              }}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4 space-y-2">
        <p className="text-center text-xs text-gray-500">
          {selectedTracks.size} of {tracks.length} songs selected
          {tracks.length - selectedTracks.size > 0 && (
            <span className="text-orange-600"> • {tracks.length - selectedTracks.size} will be skipped</span>
          )}
        </p>
        <button
          onClick={handleApprove}
          disabled={selectedTracks.size === 0 || approving}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {approving ? (
            <>
              <LoaderIcon className="w-5 h-5 animate-spin" />
              Approving...
            </>
          ) : selectedTracks.size === 0 ? (
            'Select Songs to Approve'
          ) : (
            <>
              <CheckIcon className="w-5 h-5" />
              Approve {selectedTracks.size} Selected Song{selectedTracks.size !== 1 ? 's' : ''}
            </>
          )}
        </button>
        <button
          onClick={() => setShowDenySheet(true)}
          className="w-full py-3 rounded-xl font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
        >
          Deny Entire Album
        </button>
      </div>

      {/* Lyrics Inspector */}
      <LyricsInspector
        isOpen={!!lyricsTrack}
        onClose={() => setLyricsTrack(null)}
        track={lyricsTrack}
        albumId={request?.appleAlbumId}
        flaggedLines={lyricsTrack?.flaggedLines || []}
      />

      {/* Quick Deny Bottom Sheet for Album */}
      <QuickDenySheet
        isOpen={showDenySheet}
        onClose={() => setShowDenySheet(false)}
        onSelectReason={(reason) => {
          setShowDenySheet(false);
          onDenyAll(request, reason);
        }}
        requestName={request?.albumName}
        suggestedReason={
          albumOverview?.recommendation === 'Not Recommended'
            ? 'not-age-appropriate'
            : flaggedCount > 0
            ? 'explicit'
            : null
        }
      />
    </div>
  );
}

// ============================================================
// QUICK DENY BOTTOM SHEET
// ============================================================
function QuickDenySheet({ isOpen, onClose, onSelectReason, requestName, suggestedReason = null }) {
  const [customNote, setCustomNote] = useState('');
  const [selectedReason, setSelectedReason] = useState(null);

  // Reset selected reason when sheet opens with a suggestion
  useEffect(() => {
    if (isOpen && suggestedReason) {
      setSelectedReason(suggestedReason);
    } else if (!isOpen) {
      setSelectedReason(null);
      setCustomNote('');
    }
  }, [isOpen, suggestedReason]);

  const reasons = [
    { id: 'explicit', label: 'Explicit Content' },
    { id: 'not-age-appropriate', label: 'Not Age Appropriate' },
    { id: 'parental-discretion', label: 'Parental Discretion' },
    { id: 'talk-to-me', label: 'Let\'s Talk First' },
  ];

  const handleSubmit = (reason) => {
    const fullReason = customNote.trim()
      ? `${reason}: ${customNote.trim()}`
      : reason;
    onSelectReason(fullReason);
    setCustomNote('');
    setSelectedReason(null);
  };

  const handleCustomSubmit = () => {
    if (customNote.trim()) {
      onSelectReason(customNote.trim());
      setCustomNote('');
      setSelectedReason(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[70] transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-3xl shadow-2xl animate-slide-up safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Why are you denying this?</h3>
          <p className="text-sm text-gray-500 truncate">"{requestName}"</p>
        </div>

        {/* Quick Reason Chips */}
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {reasons.map((reason) => {
            const isPreSelected = selectedReason === reason.id;
            return (
              <button
                key={reason.id}
                onClick={() => handleSubmit(reason.label)}
                className={`px-3 py-2 border rounded-lg transition-all active:scale-95 text-sm font-medium ${
                  isPreSelected
                    ? 'bg-red-100 border-red-300 text-red-700 ring-2 ring-red-200'
                    : 'bg-gray-100 hover:bg-red-50 border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-700'
                }`}
              >
                {isPreSelected && <span className="mr-1">→</span>}
                {reason.label}
              </button>
            );
          })}
        </div>

        {/* Pre-selection hint */}
        {selectedReason && (
          <div className="px-5 pt-2">
            <p className="text-xs text-red-600 italic">
              Suggested based on content flags
            </p>
          </div>
        )}

        {/* Custom Note Input */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add a note for your child (optional)..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
          >
            Cancel
          </button>
          {customNote.trim() && (
            <button
              onClick={handleCustomSubmit}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition"
            >
              Deny with Note
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// SAFETY BADGE COMPONENT
// ============================================================
function SafetyBadge({ status, isExplicit, albumRecommendation }) {
  // Explicit from Apple Music API
  if (isExplicit) {
    return (
      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-full">
        Explicit
      </span>
    );
  }

  // Album AI scan recommendation (from cached album overview)
  if (albumRecommendation === 'Likely Safe') {
    return (
      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">
        Safe
      </span>
    );
  }

  if (albumRecommendation === 'Review Recommended') {
    return (
      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-semibold rounded-full">
        Review
      </span>
    );
  }

  if (albumRecommendation === 'Detailed Review Required' || albumRecommendation === 'Not Recommended') {
    return (
      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-full">
        Caution
      </span>
    );
  }

  // Song AI scan results (from lyrics review)
  if (status === 'clean' || status === 'appropriate') {
    return (
      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">
        Clean
      </span>
    );
  }

  if (status === 'moderate' || status === 'use-caution') {
    return (
      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-semibold rounded-full">
        Review
      </span>
    );
  }

  if (status === 'flagged' || status === 'inappropriate') {
    return (
      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-full">
        Flagged
      </span>
    );
  }

  // Unknown/pending - don't show any badge
  return null;
}

// ============================================================
// REQUEST CARD COMPONENT
// ============================================================
function RequestCard({
  request,
  isSelected,
  onSelect,
  onApprove,
  onDeny,
  onInspect,
  onPlayPreview,
  onViewLyrics,
  onToggleArtwork,
  kidProfile,
  isExplicit,
  aiSafetyStatus,
  albumRecommendation,
  isNew,
  waitingDays,
  playingTrackId,
  isArtworkHidden,
}) {
  const [showDenySheet, setShowDenySheet] = useState(false);

  const isAlbum = request.requestType === 'album';
  const name = isAlbum ? request.albumName : request.songName;
  const isFlagged = aiSafetyStatus?.status === 'flagged' || aiSafetyStatus?.status === 'inappropriate' || isExplicit ||
    albumRecommendation === 'Detailed Review Required' || albumRecommendation === 'Not Recommended';
  const isClean = (aiSafetyStatus?.status === 'clean' || aiSafetyStatus?.status === 'appropriate' ||
    albumRecommendation === 'Likely Safe') && !isExplicit;
  const isPlaying = playingTrackId === (isAlbum ? request.appleAlbumId : request.appleSongId);

  const artworkUrl = request.artworkUrl?.replace('{w}', '200').replace('{h}', '200');

  const handleDenyWithReason = (reason) => {
    setShowDenySheet(false);
    if (isAlbum) {
      onDeny(request._id, 'album', request.albumName, request.appleAlbumId, reason);
    } else {
      onDeny(request._id, 'song', request.songName, null, reason);
    }
  };

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition-all ${
        isSelected ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200'
      }`}>
        <div className="flex gap-3">
          {/* Checkbox */}
          <div className="flex-shrink-0 flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(request._id)}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Artwork with Play Overlay */}
          <button
            className="flex-shrink-0 relative group"
            onClick={(e) => {
              e.stopPropagation();
              const songId = isAlbum ? null : request.appleSongId;
              if (songId) {
                onPlayPreview(songId, { songName: request.songName, artistName: request.artistName });
              } else if (isAlbum) {
                onInspect(request);
              }
            }}
          >
            {isArtworkHidden ? (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-md">
                <SafeTunesLogo className="w-10 h-10 text-white/70" />
              </div>
            ) : artworkUrl ? (
              <img src={artworkUrl} alt={name} className="w-20 h-20 rounded-xl shadow-md object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                <SparklesIcon className="w-8 h-8 text-white/50" />
              </div>
            )}

            {/* Play Button */}
            <div className={`absolute bottom-1.5 right-1.5 transition-all ${
              isPlaying ? 'scale-100' : 'scale-90 opacity-80 group-hover:scale-100 group-hover:opacity-100'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg ${
                isPlaying ? 'bg-purple-500' : 'bg-white/95'
              }`}>
                {isPlaying ? (
                  <PauseIcon className="w-3.5 h-3.5 text-white" />
                ) : (
                  <PlayIcon className="w-3.5 h-3.5 text-purple-600 ml-0.5" />
                )}
              </div>
            </div>
          </button>

          {/* Content + Actions Column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            {/* Top: Title row with action button */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base truncate">{name}</h3>
                  {isNew && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded">NEW</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{request.artistName}</p>
              </div>

              {/* Primary Action */}
              {isAlbum ? (
                <button
                  onClick={() => onInspect(request)}
                  className="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition flex items-center gap-1.5 shadow-sm"
                >
                  <ShieldIcon className="w-4 h-4" />
                  Inspect
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (isFlagged) {
                      onViewLyrics(request);
                    } else {
                      onApprove(request._id, 'song');
                    }
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-1.5 shadow-sm ${
                    isFlagged
                      ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isFlagged ? (
                    <><AlertIcon className="w-4 h-4" /> Review</>
                  ) : (
                    <><CheckIcon className="w-4 h-4" /> Approve</>
                  )}
                </button>
              )}
            </div>

            {/* Bottom: Meta row with secondary actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
              {/* Left: Simplified meta info */}
              <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0 flex-wrap">
                <SafetyBadge status={aiSafetyStatus?.status} isExplicit={isExplicit} albumRecommendation={albumRecommendation} />
                <span className={`font-medium ${isAlbum ? 'text-blue-600' : 'text-purple-600'}`}>
                  {isAlbum ? 'Album' : 'Song'}
                </span>
                {kidProfile && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-4 h-4 rounded-full ${
                        COLORS.find(c => c.id === kidProfile.color)?.class || COLORS[0].class
                      } flex items-center justify-center text-white p-0.5 flex-shrink-0`}>
                        {AVATAR_ICONS.find(a => a.id === kidProfile.avatar)?.svg || AVATAR_ICONS[0].svg}
                      </div>
                      <span className="truncate max-w-[60px] sm:max-w-none">{kidProfile.name.split(' ')[0]}</span>
                    </div>
                  </>
                )}
                <span className="text-gray-300">•</span>
                <span className={`whitespace-nowrap ${waitingDays > 3 ? 'text-orange-500 font-medium' : ''}`}>
                  {waitingDays > 0 ? `${waitingDays}d` : 'Today'}
                </span>
              </div>

              {/* Right: Action buttons - always visible */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Hide Artwork Toggle */}
                <button
                  onClick={() => onToggleArtwork(request, isArtworkHidden)}
                  className={`p-1.5 rounded-lg transition flex items-center gap-1 ${
                    isArtworkHidden
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isArtworkHidden ? 'Show artwork to kids' : 'Hide artwork from kids'}
                >
                  {isArtworkHidden ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                  <span className="text-[10px] font-medium hidden sm:inline">{isArtworkHidden ? 'Show' : 'Hide'}</span>
                </button>
                {!isAlbum && (
                  <button
                    onClick={() => onViewLyrics(request)}
                    className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-purple-100 transition text-xs font-medium text-gray-600 hover:text-purple-700 whitespace-nowrap"
                  >
                    Lyrics
                  </button>
                )}
                <button
                  onClick={() => setShowDenySheet(true)}
                  className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-medium text-xs transition whitespace-nowrap"
                >
                  Deny
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Kid's Note */}
        {request.kidNote && (
          <div className="mt-3 ml-[108px] bg-purple-50 rounded-lg px-3 py-1.5">
            <p className="text-xs text-purple-700 italic">&ldquo;{request.kidNote}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Quick Deny Bottom Sheet */}
      <QuickDenySheet
        isOpen={showDenySheet}
        onClose={() => setShowDenySheet(false)}
        onSelectReason={handleDenyWithReason}
        requestName={name}
        suggestedReason={isExplicit ? 'explicit' : isFlagged ? 'not-age-appropriate' : null}
      />
    </>
  );
}

// ============================================================
// MAIN REQUESTS VIEW COMPONENT
// ============================================================
function RequestsView({ user }) {
  const { showToast, ToastContainer } = useToast();
  const convex = useConvex();

  // Queries
  const pendingAlbumRequests = useQuery(api.albumRequests.getPendingRequests, user ? { userId: user._id } : 'skip') || [];
  const pendingSongRequests = useQuery(api.songRequests.getPendingSongRequests, user ? { userId: user._id } : 'skip') || [];
  const deniedAlbumRequests = useQuery(api.albumRequests.getDeniedRequests, user ? { userId: user._id } : 'skip') || [];
  const deniedSongRequests = useQuery(api.songRequests.getDeniedSongRequests, user ? { userId: user._id } : 'skip') || [];
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles, user ? { userId: user._id } : 'skip') || [];
  const blockedSearches = useQuery(api.blockedSearches.getBlockedSearches, user ? { userId: user._id } : 'skip') || [];
  const unreadBlockedSearchesCount = useQuery(api.blockedSearches.getUnreadBlockedSearchesCount, user ? { userId: user._id } : 'skip') || 0;

  // Get album IDs for cached AI scan lookup
  const albumIds = useMemo(() => {
    return pendingAlbumRequests.map(r => r.appleAlbumId).filter(Boolean);
  }, [pendingAlbumRequests]);

  // Query cached album overviews for badge display
  const cachedAlbumOverviews = useQuery(
    api.ai.contentReview.getCachedAlbumOverviews,
    albumIds.length > 0 ? { appleAlbumIds: albumIds } : 'skip'
  ) || {};

  // Mutations
  const approveAlbumRequest = useMutation(api.albumRequests.approveRequest);
  const denyAlbumRequest = useMutation(api.albumRequests.denyRequest);
  const approveSongRequest = useMutation(api.songRequests.approveSongRequest);
  const denySongRequest = useMutation(api.songRequests.denySongRequest);
  const approveSong = useMutation(api.songs.approveSong);
  const deleteBlockedSearch = useMutation(api.blockedSearches.deleteBlockedSearch);
  const clearAllBlockedSearches = useMutation(api.blockedSearches.clearAllBlockedSearches);
  const markAllBlockedSearchesAsRead = useMutation(api.blockedSearches.markAllBlockedSearchesAsRead);
  const toggleAlbumArtworkEverywhere = useMutation(api.albums.toggleAlbumArtworkEverywhere);
  const toggleSongArtworkEverywhere = useMutation(api.songs.toggleSongArtworkEverywhere);

  // State
  const [activeTab, setActiveTab] = useState('albums');
  const [showDeniedArchive, setShowDeniedArchive] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterByKid, setFilterByKid] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [explicitInfo, setExplicitInfo] = useState({});
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [playingTrackMeta, setPlayingTrackMeta] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [artworkHiddenState, setArtworkHiddenState] = useState({}); // Track local artwork hide state

  // Modal states
  const [inspectorRequest, setInspectorRequest] = useState(null);
  const [lyricsRequest, setLyricsRequest] = useState(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Helpers
  const isNewRequest = (timestamp) => Date.now() - timestamp < 86400000;
  const getDaysWaiting = (timestamp) => Math.floor((Date.now() - timestamp) / 86400000);
  const getKidProfile = (kidProfileId) => kidProfiles.find(k => k._id === kidProfileId);

  // Combined requests
  const allRequests = useMemo(() => {
    return [
      ...pendingAlbumRequests.map(r => ({ ...r, requestType: 'album' })),
      ...pendingSongRequests.map(r => ({ ...r, requestType: 'song' }))
    ]
      .filter(r => filterByKid === 'all' || r.kidProfileId === filterByKid)
      .sort((a, b) => sortOrder === 'newest' ? b.requestedAt - a.requestedAt : a.requestedAt - b.requestedAt);
  }, [pendingAlbumRequests, pendingSongRequests, filterByKid, sortOrder]);

  const allDeniedRequests = useMemo(() => {
    return [
      ...deniedAlbumRequests.map(r => ({ ...r, requestType: 'album' })),
      ...deniedSongRequests.map(r => ({ ...r, requestType: 'song' }))
    ].sort((a, b) => b.reviewedAt - a.reviewedAt);
  }, [deniedAlbumRequests, deniedSongRequests]);

  const currentTabRequests = useMemo(() => {
    if (activeTab === 'albums') return allRequests.filter(r => r.requestType === 'album');
    if (activeTab === 'songs') return allRequests.filter(r => r.requestType === 'song');
    return [];
  }, [allRequests, activeTab]);

  // Fetch explicit info
  useEffect(() => {
    const fetchExplicitInfo = async () => {
      if (!musicKitService.isInitialized) return;

      const allReqs = [
        ...pendingAlbumRequests.map(r => ({ id: r.appleAlbumId, type: 'album' })),
        ...pendingSongRequests.map(r => ({ id: r.appleSongId, type: 'song' }))
      ];

      const toFetch = allReqs.filter(r => explicitInfo[r.id] === undefined);
      if (toFetch.length === 0) return;

      const newInfo = { ...explicitInfo };

      for (const request of toFetch) {
        try {
          const music = musicKitService.getMusicKitInstance();
          if (music) {
            const endpoint = request.type === 'album'
              ? `/v1/catalog/us/albums/${request.id}`
              : `/v1/catalog/us/songs/${request.id}`;
            try {
              const data = await music.api.music(endpoint);
              newInfo[request.id] = data?.data?.data?.[0]?.attributes?.contentRating === 'explicit';
            } catch {
              newInfo[request.id] = false;
            }
          }
        } catch {
          newInfo[request.id] = false;
        }
      }

      setExplicitInfo(newInfo);
    };

    fetchExplicitInfo();
  }, [pendingAlbumRequests, pendingSongRequests]);

  // Mark blocked as read
  useEffect(() => {
    if (activeTab === 'blocked' && unreadBlockedSearchesCount > 0) {
      markAllBlockedSearchesAsRead({ userId: user._id });
    }
  }, [activeTab, unreadBlockedSearchesCount]);

  // Listen to playback time for song preview popup
  useEffect(() => {
    if (!playingTrackId || inspectorRequest) return; // Skip if in album inspector (it has its own)

    const handleTimeUpdate = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setPreviewCurrentTime(state.currentPlaybackTime || 0);
        setPreviewDuration(state.currentPlaybackDuration || 0);
      }
    };

    musicKitService.addEventListener('playbackTimeDidChange', handleTimeUpdate);
    return () => {
      musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
    };
  }, [playingTrackId, inspectorRequest]);

  const formatPreviewTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreviewSeek = (e) => {
    if (!previewDuration) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * previewDuration;
    musicKitService.seekToTime(newTime);
  };

  // Handlers
  const handlePlaySong = async (songId, songMeta) => {
    const isAuthorized = musicKitService.checkAuthorization();
    if (!isAuthorized) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      if (playingTrackId === songId) {
        musicKitService.stop();
        setPlayingTrackId(null);
        setPlayingTrackMeta(null);
      } else {
        setPlayingTrackId(songId);
        setPlayingTrackMeta(songMeta);
        setPreviewCurrentTime(0);
        setPreviewDuration(0);
        await musicKitService.playSong(songId, songMeta);
      }
    } catch (err) {
      showToast('Failed to play', 'error');
      setPlayingTrackId(null);
    }
  };

  const handleApprove = async (requestId, requestType) => {
    const request = requestType === 'album'
      ? pendingAlbumRequests.find(r => r._id === requestId)
      : pendingSongRequests.find(r => r._id === requestId);
    const requestName = requestType === 'album' ? request?.albumName : request?.songName;

    // Get the hideArtwork state for this request
    const id = requestType === 'album' ? request?.appleAlbumId : request?.appleSongId;
    const hideArtwork = artworkHiddenState[id] || false;

    try {
      if (requestType === 'album') {
        let tracks = null;

        if (request?.appleAlbumId) {
          try {
            await musicKitService.initialize();
            const musicKitTracks = await musicKitService.getAlbumTracks(request.appleAlbumId);
            tracks = musicKitTracks.map((track, index) => ({
              appleSongId: track.id,
              songName: track.attributes?.name || '',
              artistName: track.attributes?.artistName || request.artistName,
              trackNumber: index + 1,
              durationInMillis: track.attributes?.durationInMillis,
              isExplicit: track.attributes?.contentRating === 'explicit',
            }));
          } catch (err) {
            console.error('Failed to fetch tracks:', err);
          }
        }

        await approveAlbumRequest({ requestId, tracks, hideArtwork });
      } else {
        await approveSongRequest({ requestId, hideArtwork });
      }

      showToast(`${requestName || 'Request'} approved ✓`, 'success');
    } catch (error) {
      showToast('Failed to approve', 'error');
    }
  };

  const handleApproveSelectedTracks = async (request, selectedTracks, skippedCount) => {
    try {
      // Get the hideArtwork state for this request
      const hideArtwork = artworkHiddenState[request.appleAlbumId] || false;

      // Approve album with only selected tracks
      const tracks = selectedTracks.map((track, index) => ({
        appleSongId: track.id,
        songName: track.name,
        artistName: track.artistName,
        trackNumber: index + 1,
        durationInMillis: track.duration,
        isExplicit: track.isExplicit,
      }));

      await approveAlbumRequest({ requestId: request._id, tracks, hideArtwork });

      if (skippedCount > 0) {
        showToast(`Approved ${selectedTracks.length} songs. ${skippedCount} restricted songs were skipped.`, 'success');
      } else {
        showToast(`${request.albumName} approved ✓`, 'success');
      }
    } catch (error) {
      showToast('Failed to approve', 'error');
    }
  };

  // Quick deny with reason - called directly from QuickDenySheet
  const handleDeny = async (requestId, requestType, requestName, appleAlbumId = null, reason = '') => {
    try {
      if (requestType === 'album') {
        await denyAlbumRequest({
          requestId,
          denialReason: reason || undefined
        });
      } else {
        await denySongRequest({
          requestId,
          denialReason: reason || undefined
        });
      }

      showToast(`${requestName} denied`, 'success');
    } catch (error) {
      showToast('Failed to deny', 'error');
    }
  };

  const toggleSelection = (requestId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  };

  // Batch actions for selected items
  const [batchApproving, setBatchApproving] = useState(false);
  const [batchDenying, setBatchDenying] = useState(false);
  const [showBatchDenySheet, setShowBatchDenySheet] = useState(false);

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;

    setBatchApproving(true);
    let approved = 0;
    let failed = 0;

    for (const requestId of selectedIds) {
      const request = currentTabRequests.find(r => r._id === requestId);
      if (!request) continue;

      // Get the hideArtwork state for this request
      const id = request.requestType === 'song' ? request.appleSongId : request.appleAlbumId;
      const hideArtwork = artworkHiddenState[id] || false;

      try {
        if (request.requestType === 'song') {
          await approveSongRequest({ requestId: request._id, hideArtwork });
          approved++;
        } else {
          // For albums, we need tracks - fetch them first
          await musicKitService.initialize();
          const albumTracks = await musicKitService.getAlbumTracks(request.appleAlbumId);
          const tracks = albumTracks.map((track, index) => ({
            appleSongId: track.id,
            songName: track.attributes?.name || '',
            artistName: track.attributes?.artistName || request.artistName,
            trackNumber: index + 1,
            durationInMillis: track.attributes?.durationInMillis,
            isExplicit: track.attributes?.contentRating === 'explicit',
          }));
          await approveAlbumRequest({ requestId: request._id, tracks, hideArtwork });
          approved++;
        }
      } catch (err) {
        console.error('Failed to approve:', request.songName || request.albumName, err);
        failed++;
      }
    }

    setBatchApproving(false);
    setSelectedIds(new Set());

    if (failed === 0) {
      showToast(`Approved ${approved} item${approved !== 1 ? 's' : ''}!`, 'success');
    } else {
      showToast(`Approved ${approved}, ${failed} failed`, 'warning');
    }
  };

  const handleBatchDeny = async (reason) => {
    if (selectedIds.size === 0) return;

    setBatchDenying(true);
    let denied = 0;
    let failed = 0;

    for (const requestId of selectedIds) {
      const request = currentTabRequests.find(r => r._id === requestId);
      if (!request) continue;

      try {
        if (request.requestType === 'song') {
          await denySongRequest({ requestId: request._id, denialReason: reason || undefined });
        } else {
          await denyAlbumRequest({ requestId: request._id, denialReason: reason || undefined });
        }
        denied++;
      } catch (err) {
        console.error('Failed to deny:', request.songName || request.albumName, err);
        failed++;
      }
    }

    setBatchDenying(false);
    setSelectedIds(new Set());
    setShowBatchDenySheet(false);

    if (failed === 0) {
      showToast(`Denied ${denied} item${denied !== 1 ? 's' : ''}`, 'success');
    } else {
      showToast(`Denied ${denied}, ${failed} failed`, 'warning');
    }
  };

  const handleDeleteBlockedSearch = async (searchId) => {
    try {
      await deleteBlockedSearch({ searchId });
      showToast('Removed', 'success');
    } catch {
      showToast('Failed to remove', 'error');
    }
  };

  // Toggle artwork visibility for a request (used during review)
  const handleToggleArtwork = async (request, currentHidden) => {
    const isAlbum = request.requestType === 'album';
    const id = isAlbum ? request.appleAlbumId : request.appleSongId;
    const newHidden = !currentHidden;

    // Optimistic update
    setArtworkHiddenState(prev => ({ ...prev, [id]: newHidden }));

    try {
      if (isAlbum) {
        await toggleAlbumArtworkEverywhere({
          userId: user._id,
          appleAlbumId: request.appleAlbumId,
          hideArtwork: newHidden,
        });
      } else {
        await toggleSongArtworkEverywhere({
          userId: user._id,
          appleSongId: request.appleSongId,
          hideArtwork: newHidden,
        });
      }
      showToast(newHidden ? 'Artwork will be hidden' : 'Artwork will be shown', 'success');
    } catch (error) {
      // Revert on error
      setArtworkHiddenState(prev => ({ ...prev, [id]: currentHidden }));
      showToast('Failed to update artwork setting', 'error');
    }
  };

  // Empty state
  if (allRequests.length === 0 && allDeniedRequests.length === 0 && blockedSearches.length === 0) {
    return (
      <div className="space-y-4">
        {ToastContainer}
        <EmptyState
          icon="checkmark"
          title="All Caught Up!"
          description="No pending requests from your kids."
        />
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Music Requests</h2>
            <p className="text-gray-600 text-sm">Review and approve content from your kids</p>
          </div>

          {allDeniedRequests.length > 0 && (
            <button
              onClick={() => setShowDeniedArchive(!showDeniedArchive)}
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 text-xs font-medium ${
                showDeniedArchive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Denied ({allDeniedRequests.length})
            </button>
          )}
        </div>

        {/* Denied Archive (collapsible) */}
        {showDeniedArchive && allDeniedRequests.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <h3 className="text-sm font-bold text-red-900">Denied History</h3>
              </div>
              <button
                onClick={() => setShowDeniedArchive(false)}
                className="text-red-600 hover:text-red-800"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allDeniedRequests.slice(0, 10).map((request) => (
                <div key={request._id} className="bg-white rounded-lg border border-red-100 p-3 flex items-center gap-3">
                  {request.artworkUrl ? (
                    <img
                      src={request.artworkUrl.replace('{w}', '60').replace('{h}', '60')}
                      alt={request.albumName || request.songName}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                      <SparklesIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{request.albumName || request.songName}</p>
                    <p className="text-xs text-gray-500 truncate">{request.artistName}</p>
                  </div>
                  <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    {request.requestType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => { setActiveTab('albums'); setSelectedIds(new Set()); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'albums' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Albums ({pendingAlbumRequests.length})
            </button>
            <button
              onClick={() => { setActiveTab('songs'); setSelectedIds(new Set()); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'songs' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Songs ({pendingSongRequests.length})
            </button>
            <button
              onClick={() => { setActiveTab('blocked'); setSelectedIds(new Set()); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition relative ${
                activeTab === 'blocked' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Blocked ({blockedSearches.length})
              {unreadBlockedSearchesCount > 0 && activeTab !== 'blocked' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Select Actions */}
        {activeTab !== 'blocked' && currentTabRequests.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-2">
            <span className="text-xs text-gray-500">
              {selectedIds.size > 0 ? `${selectedIds.size} of ${currentTabRequests.length} selected` : `${currentTabRequests.length} ${activeTab}`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(new Set(currentTabRequests.map(r => r._id)))}
                className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
              >
                Select All
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Request Cards */}
        <div className="space-y-3">
          {activeTab === 'blocked' ? (
            blockedSearches.length === 0 ? (
              <EmptyState icon="checkmark" title="No Blocked Searches" description="Great job!" />
            ) : (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 text-orange-600" />
                  <p className="text-xs text-orange-800 flex-1">Blocked searches - use as conversation starters</p>
                  <button
                    onClick={async () => {
                      if (window.confirm('Clear all?')) {
                        await clearAllBlockedSearches({ userId: user._id });
                      }
                    }}
                    className="text-xs text-red-600 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                {blockedSearches.map((search) => (
                  <div key={search._id} className="bg-white rounded-xl shadow-sm border border-red-100 p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <XIcon className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm">"{search.searchQuery}"</h3>
                        <p className="text-xs text-gray-600">{search.kidName}</p>
                        <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">{search.blockedReason}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteBlockedSearch(search._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )
          ) : currentTabRequests.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <p className="text-gray-500 text-sm">No {activeTab} requests</p>
            </div>
          ) : (
            currentTabRequests.map((request) => {
              const id = request.requestType === 'album' ? request.appleAlbumId : request.appleSongId;
              const albumOverview = request.requestType === 'album' ? cachedAlbumOverviews[request.appleAlbumId] : null;
              return (
                <RequestCard
                  key={request._id}
                  request={request}
                  isSelected={selectedIds.has(request._id)}
                  onSelect={toggleSelection}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  onInspect={setInspectorRequest}
                  onPlayPreview={handlePlaySong}
                  onViewLyrics={setLyricsRequest}
                  onToggleArtwork={handleToggleArtwork}
                  kidProfile={getKidProfile(request.kidProfileId)}
                  isExplicit={explicitInfo[id] === true}
                  aiSafetyStatus={{ status: 'unknown' }}
                  albumRecommendation={albumOverview?.recommendation}
                  isNew={isNewRequest(request.requestedAt)}
                  waitingDays={getDaysWaiting(request.requestedAt)}
                  playingTrackId={playingTrackId}
                  isArtworkHidden={artworkHiddenState[id] || false}
                />
              );
            })
          )}
        </div>

        {/* Batch Actions Bar - Shows when items are selected */}
        {/* Position above mobile nav bar (~70px) and mini player if playing */}
        {selectedIds.size > 0 && activeTab !== 'blocked' && (
          <div className={`fixed left-4 right-4 z-50 animate-slide-up transition-all ${playingTrackId ? 'bottom-36' : 'bottom-20'}`}>
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 flex items-center gap-3">
              {/* Selection info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{selectedIds.size} selected</p>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-gray-500 hover:text-purple-600"
                >
                  Clear
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBatchDenySheet(true)}
                  disabled={batchApproving || batchDenying}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-medium text-sm transition disabled:opacity-50"
                >
                  {batchDenying ? 'Denying...' : 'Deny'}
                </button>
                <button
                  onClick={handleBatchApprove}
                  disabled={batchApproving || batchDenying}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {batchApproving ? (
                    <>
                      <LoaderIcon className="w-4 h-4" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Approve
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inspector Modal */}
      <RequestInspectorModal
        isOpen={!!inspectorRequest}
        onClose={() => setInspectorRequest(null)}
        request={inspectorRequest}
        kidProfile={inspectorRequest ? getKidProfile(inspectorRequest.kidProfileId) : null}
        onApproveSelected={handleApproveSelectedTracks}
        onDenyAll={(req, reason) => {
          setInspectorRequest(null);
          handleDeny(req._id, 'album', req.albumName, req.appleAlbumId, reason);
        }}
        onToggleArtwork={handleToggleArtwork}
        isArtworkHidden={inspectorRequest ? (artworkHiddenState[inspectorRequest.appleAlbumId] || false) : false}
      />

      {/* Lyrics Inspector for Songs */}
      <LyricsInspector
        isOpen={!!lyricsRequest}
        onClose={() => setLyricsRequest(null)}
        track={lyricsRequest ? {
          id: lyricsRequest.appleSongId,
          name: lyricsRequest.songName,
          artistName: lyricsRequest.artistName,
        } : null}
        albumId={lyricsRequest?.appleAlbumId}
      />

      {/* Auth Prompt */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Apple Music</h3>
            <p className="text-gray-600 mb-6">Sign in to preview songs.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await musicKitService.authorize();
                    setShowAuthPrompt(false);
                  } catch {
                    showToast('Auth failed', 'error');
                  }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Deny Sheet */}
      <QuickDenySheet
        isOpen={showBatchDenySheet}
        onClose={() => setShowBatchDenySheet(false)}
        onSelectReason={(reason) => {
          handleBatchDeny(reason);
        }}
        requestName={`${selectedIds.size} selected item${selectedIds.size !== 1 ? 's' : ''}`}
      />

      {/* Song Preview Popup - for song tab previews (not in inspector modal) */}
      {playingTrackId && !inspectorRequest && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => {
            musicKitService.stop();
            setPlayingTrackId(null);
            setPlayingTrackMeta(null);
          }}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-5 mx-4 max-w-xs w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Track Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {playingTrackMeta?.songName || playingTrackMeta?.name || 'Playing...'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {playingTrackMeta?.artistName || ''}
                </p>
              </div>
            </div>

            {/* Seekable Progress Bar */}
            <div className="mb-4">
              <div
                className="h-2 bg-gray-700 rounded-full cursor-pointer group relative"
                onClick={handlePreviewSeek}
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all relative"
                  style={{ width: `${previewDuration ? (previewCurrentTime / previewDuration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-500 tabular-nums">{formatPreviewTime(previewCurrentTime)}</span>
                <span className="text-xs text-gray-500 tabular-nums">{formatPreviewTime(previewDuration)}</span>
              </div>
            </div>

            {/* Done Button */}
            <button
              onClick={() => {
                musicKitService.stop();
                setPlayingTrackId(null);
                setPlayingTrackMeta(null);
              }}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default RequestsView;
