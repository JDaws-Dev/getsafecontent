import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Play, Pause, Check, Shield, Sparkles, AlertTriangle, CheckCircle, Loader2, FileText, ChevronRight, Info } from 'lucide-react';
import musicKitService from '../../config/musickit';

// Enhanced Mock data with lyrics, flagReasons, and album summary
const MOCK_ALBUM = {
  id: 'mock-rolling-stones-1',
  name: 'Let It Bleed',
  artistName: 'The Rolling Stones',
  artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b3/8d/b9/b38db9af-8615-2161-3c4c-e01f1a164f84/00042288232421.rgb.jpg/{w}x{h}bb.jpg',
  releaseDate: '1969-12-05',
  trackCount: 10,
  // Album-level safety summary
  summary: "This classic 1969 album contains mature themes typical of late-60s rock. Two tracks have been flagged: one for mild profanity and one for violent imagery in the lyrics. The album explores themes of love, loss, and social commentary. Recommended for ages 13+ with parental guidance.",
  tracks: [
    {
      id: 't1',
      name: 'Gimme Shelter',
      artistName: 'The Rolling Stones',
      duration: 271000,
      trackNumber: 1,
      isExplicit: false,
      aiFlag: null,
      lyrics: "Oh, a storm is threatening\nMy very life today\nIf I don't get some shelter\nOh yeah I'm gonna fade away\n\nWar, children\nIt's just a shot away\nIt's just a shot away\n\nOoh, see the fire is sweeping\nOur streets today\nBurns like a red coal carpet\nMad bull lost its way\n\nWar, children\nIt's just a shot away\nIt's just a shot away",
      flagReason: null
    },
    {
      id: 't2',
      name: 'Love in Vain',
      artistName: 'The Rolling Stones',
      duration: 259000,
      trackNumber: 2,
      isExplicit: false,
      aiFlag: null,
      lyrics: "Well, I followed her to the station\nWith a suitcase in my hand\nYeah, I followed her to the station\nWith a suitcase in my hand\n\nWell, it's hard to tell, it's hard to tell\nWhen all your love's in vain\nAll my love's in vain",
      flagReason: null
    },
    {
      id: 't3',
      name: 'Country Honk',
      artistName: 'The Rolling Stones',
      duration: 187000,
      trackNumber: 3,
      isExplicit: false,
      aiFlag: null,
      lyrics: "I'm sittin' in a bar, tippling a jar\nIn Jackson\nI'm sittin' in a bar, tippling a jar\nIn Jackson\n\nShe's on the other side\nShe's been away so long\nShe's on the other side\nShe's been away so long",
      flagReason: null
    },
    {
      id: 't4',
      name: 'Live with Me',
      artistName: 'The Rolling Stones',
      duration: 213000,
      trackNumber: 4,
      isExplicit: true,
      aiFlag: { type: 'mild_lang', label: 'Mild Lang' },
      lyrics: "I got nasty habits, I take tea at three\nYes, and the meat I eat for dinner\nMust be hung up for a week\n\nMy best friend, he shoots water rats\nAnd feeds them to his geese\n[FLAGGED] Don't you think there's a place for you\nIn between the sheets?\n\nCome on now, honey\n[FLAGGED] We can build a place for three\nCome on now, honey\nDon't you want to live with me?",
      flagReason: "Contains 2 instances of suggestive language and adult innuendo. The lyrics include references to adult relationships that may not be appropriate for younger children.",
      flaggedLines: ["Don't you think there's a place for you", "We can build a place for three"]
    },
    {
      id: 't5',
      name: 'Let It Bleed',
      artistName: 'The Rolling Stones',
      duration: 327000,
      trackNumber: 5,
      isExplicit: false,
      aiFlag: null,
      lyrics: "Well, we all need someone we can lean on\nAnd if you want it, you can lean on me\nYeah, we all need someone we can lean on\nAnd if you want it, you can lean on me\n\nShe said, my breaker, my fixer\nWhen you're looking for your mixer\nI'll be there, yeah",
      flagReason: null
    },
    {
      id: 't6',
      name: 'Midnight Rambler',
      artistName: 'The Rolling Stones',
      duration: 409000,
      trackNumber: 6,
      isExplicit: true,
      aiFlag: { type: 'violence', label: 'Violence' },
      lyrics: "Did you hear about the midnight rambler?\nEverybody got to go\nDid you hear about the midnight rambler?\nThe one that shut the kitchen door?\n\n[FLAGGED] I'm called the hit-and-run raper in anger\n[FLAGGED] I'll stick my knife right down your throat, baby\nAnd it hurts!\n\nDon't you do that, oh, don't do that\nDon't you do that, oh, don't do that",
      flagReason: "Contains violent imagery and references to assault. This song was inspired by real crime events and contains disturbing lyrical content that depicts violence. Not recommended for children under 13.",
      flaggedLines: ["I'm called the hit-and-run raper in anger", "I'll stick my knife right down your throat, baby"]
    },
    {
      id: 't7',
      name: 'You Got the Silver',
      artistName: 'The Rolling Stones',
      duration: 173000,
      trackNumber: 7,
      isExplicit: false,
      aiFlag: null,
      lyrics: "Hey babe, what's in your eyes?\nI saw them flashing like airplane lights\nYou fill my cup, babe, that's for sure\nI must come back for a little more\n\nYou got my heart, you got my soul\nYou got the silver, you got the gold",
      flagReason: null
    },
    {
      id: 't8',
      name: 'Monkey Man',
      artistName: 'The Rolling Stones',
      duration: 251000,
      trackNumber: 8,
      isExplicit: false,
      aiFlag: null,
      lyrics: "I'm a cold Italian pizza\nI could use a lemon squeezer\nWhat you do?\n\nI've been bit and I've been tossed around\nBy every she-rat in this town\nHave you, babe?\n\nWell, I am just a monkey man\nI'm glad you are a monkey woman too",
      flagReason: null
    },
    {
      id: 't9',
      name: "You Can't Always Get What You Want",
      artistName: 'The Rolling Stones',
      duration: 448000,
      trackNumber: 9,
      isExplicit: false,
      aiFlag: null,
      lyrics: "I saw her today at the reception\nA glass of wine in her hand\nI knew she would meet her connection\nAt her feet was a footloose man\n\nYou can't always get what you want\nYou can't always get what you want\nYou can't always get what you want\nBut if you try sometime\nYou'll find you get what you need",
      flagReason: null
    },
    {
      id: 't10',
      name: 'Honky Tonk Women',
      artistName: 'The Rolling Stones',
      duration: 183000,
      trackNumber: 10,
      isExplicit: false,
      aiFlag: null,
      lyrics: "I met a gin-soaked bar-room queen in Memphis\nShe tried to take me upstairs for a ride\nShe had to heave me right across her shoulder\n'Cause I just can't seem to drink you off my mind\n\nIt's the honky tonk women\nGimme, gimme, gimme the honky tonk blues",
      flagReason: null
    },
  ]
};

// Format duration from milliseconds
const formatDuration = (ms) => {
  if (!ms) return '--:--';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Lyrics & Safety Inspector Slide-Over Panel - Uses real AI API like ContentReviewModal
function LyricsInspector({ isOpen, onClose, track, albumId, flaggedLines = [] }) {
  const [lyrics, setLyrics] = useState('');
  const [lyricsSource, setLyricsSource] = useState(null);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHighlightedLyrics, setShowHighlightedLyrics] = useState(false);

  // AI Actions (same as ContentReviewModal)
  const reviewContentAction = useAction(api.ai.contentReview.reviewContent);
  const fetchLyricsAction = useAction(api.ai.lyrics.fetchLyrics);

  // Auto-fetch lyrics when panel opens
  useEffect(() => {
    const autoFetchLyrics = async () => {
      if (isOpen && track && !lyrics) {
        const trackName = track.name || '';
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
      setShowHighlightedLyrics(false);
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
        appleTrackId: track.id,
        appleAlbumId: albumId,
        reviewType: 'song',
        trackName: track.name,
        artistName: track.artistName,
        lyrics: lyrics.trim(),
        lyricsSource: lyricsSource || 'manual',
      });

      // API returns { review: {...}, fromCache: bool } - extract the review object
      const reviewData = result.review || result;
      console.log('[AlbumInspector] Review result:', { hasReview: !!result.review, summary: reviewData.summary });
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
              <h2 className="text-xl font-bold truncate">{track.name}</h2>
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

          {/* Review Results - Same format as RequestsView */}
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
                        <FileText className="w-3.5 h-3.5" />
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

                {/* No concerns found */}
                {(!review.inappropriateContent || review.inappropriateContent.length === 0) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-600" />
                    <p className="text-green-800 font-medium text-sm">No concerning content found</p>
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

// Album Safety Report Modal - Uses real AI API like AlbumOverviewModal
function AlbumSafetyReport({ isOpen, onClose, album, overview, loading, error, onRetry }) {
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
              <h2 className="text-xl font-bold">Album Overview</h2>
              <p className="text-white/80 text-sm">{album?.name || album?.attributes?.name}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
              <p className="text-gray-600">Analyzing album...</p>
              <p className="text-sm text-gray-500 mt-2">Reviewing track titles and artist profile</p>
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

              {/* Artist Profile */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
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

// Assignment Bottom Sheet Component
function AssignmentSheet({ isOpen, onClose, selectedCount, kidProfiles, onConfirm }) {
  const [destination, setDestination] = useState('library'); // 'library' or 'discover'
  const [selectedKids, setSelectedKids] = useState([]);
  const [hideArtwork, setHideArtwork] = useState(false);

  // Initialize with all kids selected
  useEffect(() => {
    if (isOpen && kidProfiles?.length > 0) {
      setSelectedKids(kidProfiles.map(k => k._id));
    }
  }, [isOpen, kidProfiles]);

  const toggleKid = (kidId) => {
    setSelectedKids(prev =>
      prev.includes(kidId)
        ? prev.filter(id => id !== kidId)
        : [...prev, kidId]
    );
  };

  const handleConfirm = () => {
    onConfirm({
      destination,
      kidIds: selectedKids,
      hideArtwork
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl animate-slide-up safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Step Indicator */}
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">2</span>
            <span>Step 2 of 2: Choose destination</span>
          </div>
        </div>

        <div className="px-6 pb-8">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-1">Where should these go?</h2>
          <p className="text-sm text-gray-500 mb-5">{selectedCount} {selectedCount === 1 ? 'song' : 'songs'} selected</p>

          {/* Segmented Control */}
          <div className="bg-gray-100 rounded-xl p-1 flex mb-2">
            <button
              onClick={() => setDestination('library')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                destination === 'library'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Library
              <span className="block text-xs font-normal opacity-70">Ready to Play</span>
            </button>
            <button
              onClick={() => setDestination('discover')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                destination === 'discover'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Discover
              <span className="block text-xs font-normal opacity-70">Browse & Explore</span>
            </button>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 mb-6">
            {destination === 'library' ? (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Songs appear in their Library tab</span> — ready to play immediately. This is their personal collection of approved music.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Albums appear in their Discover tab</span> — a curated browsing area where kids explore pre-approved music. Great for letting them feel independent while staying safe.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Kid Selector */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Which kids?</p>
            <div className="flex gap-3 flex-wrap">
              {kidProfiles?.map((kid) => {
                const isSelected = selectedKids.includes(kid._id);
                const colors = {
                  purple: 'bg-purple-500',
                  blue: 'bg-blue-500',
                  green: 'bg-green-500',
                  pink: 'bg-pink-500',
                  orange: 'bg-orange-500',
                };
                const bgColor = colors[kid.avatarColor] || 'bg-gray-500';

                return (
                  <button
                    key={kid._id}
                    onClick={() => toggleKid(kid._id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                      isSelected
                        ? 'bg-purple-50 ring-2 ring-purple-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`relative w-14 h-14 rounded-full ${bgColor} flex items-center justify-center text-white text-xl font-bold`}>
                      {kid.name?.[0]?.toUpperCase() || '?'}
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                      {kid.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hide Artwork Toggle */}
          <div className="flex items-center justify-between py-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Hide Album Artwork</p>
                <p className="text-xs text-gray-500">Replace cover with music icon</p>
              </div>
            </div>
            <button
              onClick={() => setHideArtwork(!hideArtwork)}
              className={`w-12 h-7 rounded-full transition-all relative ${
                hideArtwork ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                hideArtwork ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={selectedKids.length === 0}
            className="w-full mt-4 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
          >
            {selectedKids.length === 0
              ? 'Select at least one kid'
              : `Add ${selectedCount} ${selectedCount === 1 ? 'Song' : 'Songs'} to ${selectedKids.length === 1 ? '1 Kid' : `${selectedKids.length} Kids`}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Album Inspector Component
function AlbumInspector({ isOpen, onClose, album, kidProfiles, onAddSongs, useMockData = false }) {
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const [playingTrack, setPlayingTrack] = useState(null);
  const [playingTrackMeta, setPlayingTrackMeta] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [aiScanState, setAiScanState] = useState('idle'); // 'idle' | 'scanning' | 'complete' | 'error'
  const [albumOverview, setAlbumOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [showAssignment, setShowAssignment] = useState(false);
  const [tracks, setTracks] = useState([]);

  // New state for inspectors
  const [lyricsInspectorTrack, setLyricsInspectorTrack] = useState(null);
  const [showAlbumReport, setShowAlbumReport] = useState(false);

  // Album Overview AI Action (same as AlbumOverviewModal)
  const reviewAlbumOverviewAction = useAction(api.ai.contentReview.reviewAlbumOverview);

  // Use mock data if requested or if no album provided
  const displayAlbum = useMockData ? MOCK_ALBUM : album;

  // Load tracks when album changes and AUTO-RUN AI scan (like RequestsView)
  useEffect(() => {
    const loadTracksAndAnalyze = async () => {
      let currentTracks = [];

      if (useMockData) {
        currentTracks = MOCK_ALBUM.tracks;
        setTracks(currentTracks);
      } else if (album?.tracks) {
        currentTracks = album.tracks;
        setTracks(currentTracks);
      }

      if (currentTracks.length === 0) return;

      // Auto-select non-explicit tracks (safety first, like RequestsView)
      const cleanTracks = currentTracks.filter(t => !t.isExplicit);
      setSelectedTracks(new Set(cleanTracks.map(t => t.id)));

      // Reset AI state before new scan
      setAiScanState('idle');
      setAlbumOverview(null);
      setOverviewError('');

      // AUTO-RUN AI SCAN (cheap, ~$0.0002-0.0004 per album)
      if (!useMockData && album) {
        setAiScanState('scanning');

        try {
          const albumId = album.id || album.attributes?.id;
          const albumName = album.name || album.attributes?.name;
          const artistName = album.artistName || album.attributes?.artistName;
          const editorialNotes = album.editorialNotes || album.attributes?.editorialNotes?.standard || '';

          // Build trackList for the API
          const trackList = currentTracks.map(t => ({
            name: t.name,
            artistName: t.artistName,
            contentRating: t.isExplicit ? 'explicit' : null,
          }));

          const result = await reviewAlbumOverviewAction({
            appleAlbumId: albumId,
            albumName,
            artistName,
            editorialNotes,
            trackList,
          });

          if (result.success) {
            setAlbumOverview(result.overview);
            setAiScanState('complete');
          } else {
            setOverviewError(result.error || 'Failed to review album');
            setAiScanState('error');
          }
        } catch (err) {
          console.error('[AlbumInspector] Auto AI scan error:', err);
          setOverviewError('Failed to analyze album. Please try again.');
          setAiScanState('error');
        }
      }
    };

    loadTracksAndAnalyze();
  }, [album, useMockData, reviewAlbumOverviewAction]);

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

  // Select only clean tracks (no explicit flag)
  const selectCleanOnly = () => {
    const cleanTracks = tracks.filter(t => !t.isExplicit);
    setSelectedTracks(new Set(cleanTracks.map(t => t.id)));
  };

  // Real AI album overview scan (same as AlbumOverviewModal)
  const runAiScan = async () => {
    if (!displayAlbum) return;

    setAiScanState('scanning');
    setOverviewError('');
    setAlbumOverview(null);

    try {
      const albumId = displayAlbum.id || displayAlbum.attributes?.id;
      const albumName = displayAlbum.name || displayAlbum.attributes?.name;
      const artistName = displayAlbum.artistName || displayAlbum.attributes?.artistName;
      const editorialNotes = displayAlbum.editorialNotes || displayAlbum.attributes?.editorialNotes?.standard || '';

      // Build trackList for the API (validator expects: name, artistName, contentRating)
      const trackList = tracks.map(t => ({
        name: t.name,
        artistName: t.artistName,
        contentRating: t.isExplicit ? 'explicit' : null,
      }));

      const result = await reviewAlbumOverviewAction({
        appleAlbumId: albumId,
        albumName,
        artistName,
        editorialNotes,
        trackList,
      });

      if (result.success) {
        setAlbumOverview(result.overview);
        setAiScanState('complete');
      } else {
        setOverviewError(result.error || 'Failed to review album');
        setAiScanState('error');
      }
    } catch (err) {
      console.error('[AlbumInspector] AI review error:', err);
      setOverviewError('Failed to analyze album. Please try again.');
      setAiScanState('error');
    }
  };

  // Track playback time for preview player
  useEffect(() => {
    if (!playingTrack) return;

    const handleTimeUpdate = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        setPreviewCurrentTime(state.currentPlaybackTime || 0);
        setPreviewDuration(state.currentPlaybackDuration || 0);
      }
    };

    musicKitService.addEventListener('playbackTimeDidChange', handleTimeUpdate);
    handleTimeUpdate();

    return () => {
      musicKitService.removeEventListener('playbackTimeDidChange', handleTimeUpdate);
    };
  }, [playingTrack]);

  // Stop playback when modal closes
  useEffect(() => {
    if (!isOpen && playingTrack) {
      musicKitService.stop();
      setPlayingTrack(null);
      setPlayingTrackMeta(null);
    }
  }, [isOpen, playingTrack]);

  // Toggle play - real MusicKit playback
  const togglePlay = async (track) => {
    const trackId = track.id || track.appleSongId;

    // If same track, toggle pause
    if (playingTrack === trackId) {
      const state = musicKitService.getPlaybackState();
      if (state?.isPlaying) {
        musicKitService.pause();
      } else {
        musicKitService.play();
      }
      return;
    }

    // Play new track
    try {
      setPlayingTrack(trackId);
      setPlayingTrackMeta({
        name: track.name,
        artist: track.artistName,
        artworkUrl: displayAlbum?.artworkUrl || displayAlbum?.attributes?.artwork?.url
      });
      setPreviewCurrentTime(0);
      setPreviewDuration(0);

      await musicKitService.playSong(trackId);
    } catch (err) {
      console.error('Preview playback failed:', err);
      setPlayingTrack(null);
      setPlayingTrackMeta(null);
    }
  };

  // Seek handler for preview
  const handlePreviewSeek = (e) => {
    if (!previewDuration) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * previewDuration;
    musicKitService.seekToTime(newTime);
  };

  // Format time helper
  const formatPreviewTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle assignment confirmation
  const handleAssignmentConfirm = (options) => {
    const selectedTrackData = tracks.filter(t => selectedTracks.has(t.id));
    onAddSongs?.({
      album: displayAlbum,
      tracks: selectedTrackData,
      ...options
    });
    setShowAssignment(false);
    onClose();
  };

  if (!isOpen) return null;

  const artworkUrl = displayAlbum?.artworkUrl?.replace('{w}', '400').replace('{h}', '400')
    || displayAlbum?.attributes?.artwork?.url?.replace('{w}', '400').replace('{h}', '400');

  const flaggedCount = tracks.filter(t => t.aiFlag || t.isExplicit).length;

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
          {/* Album Art */}
          <div className="flex-shrink-0">
            {artworkUrl ? (
              <img
                src={artworkUrl}
                alt={displayAlbum?.name || displayAlbum?.attributes?.name}
                className="w-32 h-32 rounded-2xl shadow-2xl object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gray-700 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-gray-500" />
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-2xl font-bold truncate">
              {displayAlbum?.name || displayAlbum?.attributes?.name}
            </h1>
            <p className="text-white/70 text-lg truncate">
              {displayAlbum?.artistName || displayAlbum?.attributes?.artistName}
            </p>
            <p className="text-white/50 text-sm mt-1">
              {tracks.length} tracks • {selectedTracks.size} selected
            </p>
          </div>
        </div>

        {/* Flag Banner - like RequestsView */}
        {flaggedCount > 0 && (
          <div className="mx-4 mb-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <p className="text-yellow-200 text-sm font-medium">
                {flaggedCount} track{flaggedCount !== 1 ? 's' : ''} flagged in this album
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Safety Card - Auto-analyzing (like RequestsView) */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        {(aiScanState === 'idle' || aiScanState === 'scanning') && (
          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-purple-50 rounded-xl border-2 border-purple-200">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
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
          <button
            onClick={() => setShowAlbumReport(true)}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl border-2 w-full ${
              albumOverview.recommendation === 'Likely Safe'
                ? 'bg-green-50 border-green-200'
                : albumOverview.recommendation === 'Review Recommended'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              albumOverview.recommendation === 'Likely Safe' ? 'bg-green-100' :
              albumOverview.recommendation === 'Review Recommended' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className="text-xl">
                {albumOverview.recommendation === 'Likely Safe' ? '✅' :
                 albumOverview.recommendation === 'Review Recommended' ? '⚠️' : '🚨'}
              </span>
            </div>
            <div className="flex-1 text-left">
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
            <ChevronRight className={`w-4 h-4 ${
              albumOverview.recommendation === 'Likely Safe' ? 'text-green-400' :
              albumOverview.recommendation === 'Review Recommended' ? 'text-yellow-400' : 'text-red-400'
            }`} />
          </button>
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
      </div>

      {/* Tracklist */}
      <div className="flex-1 overflow-y-auto">
        {tracks.map((track, index) => {
          const isSelected = selectedTracks.has(track.id);
          const isPlaying = playingTrack === track.id;

          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition ${
                isSelected ? 'bg-purple-50/50' : 'bg-white'
              }`}
            >
              {/* Play Button */}
              <button
                onClick={() => togglePlay(track)}
                className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition ${
                  isPlaying
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  <p className="font-medium text-gray-900 truncate">{track.name}</p>
                  {track.isExplicit && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-200 rounded text-[10px] font-bold text-gray-600">E</span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-5">
                  <p className="text-sm text-gray-500 truncate">{track.artistName}</p>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-400">{formatDuration(track.duration)}</span>
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

              {/* AI Flag Badge - Also clickable */}
              {track.aiFlag && (
                <button
                  onClick={() => setLyricsInspectorTrack(track)}
                  className="flex-shrink-0 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1 transition"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {track.aiFlag.label}
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

      {/* Sticky Footer - Updated with micro-copy */}
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
        albumId={displayAlbum?.id || displayAlbum?.attributes?.id}
      />

      {/* Album Safety Report Modal */}
      <AlbumSafetyReport
        isOpen={showAlbumReport}
        onClose={() => setShowAlbumReport(false)}
        album={displayAlbum}
        overview={albumOverview}
        loading={aiScanState === 'scanning'}
        error={overviewError}
        onRetry={runAiScan}
      />

      {/* Song Preview Popup */}
      {playingTrack && playingTrackMeta && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => {
            musicKitService.stop();
            setPlayingTrack(null);
            setPlayingTrackMeta(null);
          }}
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
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
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
              onClick={() => {
                musicKitService.stop();
                setPlayingTrack(null);
                setPlayingTrackMeta(null);
              }}
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

export default AlbumInspector;
export { AssignmentSheet };
