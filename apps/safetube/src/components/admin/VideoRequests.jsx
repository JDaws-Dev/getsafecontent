import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { formatDuration, getChannelVideos, getChannelDetails } from '../../config/youtube';

// Format timestamp to relative time
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Get Tailwind color class from color name
function getColorClass(color) {
  const colors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500',
  };
  return colors[color] || 'bg-gray-500';
}

// Format subscriber count
function formatSubscribers(count) {
  if (!count) return '';
  const num = parseInt(count, 10);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return count;
}

// Format date for video publish dates
function formatPublishedDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default function VideoRequests({ userId }) {
  const [filter, setFilter] = useState('pending'); // 'pending', 'all'
  const [requestType, setRequestType] = useState('all'); // 'all', 'videos', 'channels'
  const [processingId, setProcessingId] = useState(null);

  // Channel preview state
  const [expandedChannelId, setExpandedChannelId] = useState(null);
  const [channelVideos, setChannelVideos] = useState([]);
  const [channelDetails, setChannelDetails] = useState(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState(null);

  // Video playback state
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [playingVideoMeta, setPlayingVideoMeta] = useState(null);

  // AI Review state
  const [isReviewingChannel, setIsReviewingChannel] = useState(false);
  const [channelReview, setChannelReview] = useState(null);
  const [reviewingChannelId, setReviewingChannelId] = useState(null);
  const reviewChannel = useAction(api.ai.channelReview.reviewChannel);

  // Video requests
  const pendingVideoRequests = useQuery(
    api.videoRequests.getPendingRequests,
    userId ? { userId } : 'skip'
  );

  const allVideoRequests = useQuery(
    api.videoRequests.getAllRequests,
    filter === 'all' && userId ? { userId, limit: 50 } : 'skip'
  );

  // Channel requests
  const pendingChannelRequests = useQuery(
    api.channelRequests.getPendingRequests,
    userId ? { userId } : 'skip'
  );

  // Mutations
  const approveVideoRequest = useMutation(api.videoRequests.approveRequest);
  const denyVideoRequest = useMutation(api.videoRequests.denyRequest);
  const approveChannelRequest = useMutation(api.channelRequests.approveRequest);
  const denyChannelRequest = useMutation(api.channelRequests.denyRequest);

  const handleApprove = async (request) => {
    setProcessingId(request._id);
    try {
      if (request.type === 'channel') {
        await approveChannelRequest({ requestId: request._id });
      } else {
        await approveVideoRequest({ requestId: request._id });
      }
    } catch (err) {
      console.error('Failed to approve request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (request) => {
    setProcessingId(request._id);
    try {
      if (request.type === 'channel') {
        await denyChannelRequest({ requestId: request._id });
      } else {
        await denyVideoRequest({ requestId: request._id });
      }
    } catch (err) {
      console.error('Failed to deny request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Clear AI review when collapsing channel
  const handleCollapseChannel = () => {
    setExpandedChannelId(null);
    setChannelVideos([]);
    setChannelDetails(null);
    setChannelReview(null);
  };

  // Handle expanding channel to preview videos
  const handleExpandChannel = async (channelId) => {
    // Toggle off if already expanded
    if (expandedChannelId === channelId) {
      handleCollapseChannel();
      return;
    }

    setExpandedChannelId(channelId);
    setLoadingVideos(true);
    setVideoError(null);
    setChannelVideos([]);
    setChannelReview(null); // Clear any previous review

    try {
      // Fetch channel details and videos in parallel
      const [details, videosResult] = await Promise.all([
        getChannelDetails(channelId),
        getChannelVideos(channelId, 20), // Get 20 recent videos for preview
      ]);

      setChannelDetails(details[0] || null);
      setChannelVideos(videosResult.videos || []);
    } catch (err) {
      console.error('Failed to load channel videos:', err);
      setVideoError('Failed to load channel videos');
    } finally {
      setLoadingVideos(false);
    }
  };

  // AI Review channel
  const handleAIReview = async (request) => {
    if (!request.channelId) return;

    setIsReviewingChannel(true);
    setReviewingChannelId(request.channelId);
    try {
      const result = await reviewChannel({
        channelId: request.channelId,
        channelTitle: request.channelTitle,
        description: request.description || '',
        subscriberCount: request.subscriberCount || '',
        recentVideoTitles: channelVideos.slice(0, 20).map(v => v.title || '').filter(Boolean),
      });
      setChannelReview(result.review);
    } catch (err) {
      console.error('AI review failed:', err);
      setVideoError('AI review failed. Please try again.');
    } finally {
      setIsReviewingChannel(false);
      setReviewingChannelId(null);
    }
  };

  // Combine and tag requests
  const videoRequests = (filter === 'pending' ? pendingVideoRequests : allVideoRequests) || [];
  const channelRequests = pendingChannelRequests || [];

  // Tag requests with their type
  const taggedVideoRequests = videoRequests.map(r => ({ ...r, type: 'video' }));
  const taggedChannelRequests = channelRequests
    .filter(r => filter === 'pending' ? r.status === 'pending' : true)
    .map(r => ({ ...r, type: 'channel' }));

  // Filter by type
  let requests = [];
  if (requestType === 'all') {
    requests = [...taggedVideoRequests, ...taggedChannelRequests];
  } else if (requestType === 'videos') {
    requests = taggedVideoRequests;
  } else {
    requests = taggedChannelRequests;
  }

  // Sort by request time
  requests.sort((a, b) => b.requestedAt - a.requestedAt);

  // Count pending for badge
  const totalPending = (pendingVideoRequests?.length || 0) + (pendingChannelRequests?.length || 0);
  const pendingVideosCount = pendingVideoRequests?.length || 0;
  const pendingChannelsCount = pendingChannelRequests?.length || 0;

  if (!pendingVideoRequests && !pendingChannelRequests) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Requests</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                filter === 'pending'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending {totalPending > 0 && (
                <span className="ml-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                  {totalPending}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setRequestType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
              requestType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setRequestType('videos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition flex items-center gap-1 ${
              requestType === 'videos'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Videos {pendingVideosCount > 0 && filter === 'pending' && (
              <span className="bg-white/30 px-1 rounded text-xs">{pendingVideosCount}</span>
            )}
          </button>
          <button
            onClick={() => setRequestType('channels')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition flex items-center gap-1 ${
              requestType === 'channels'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Channels {pendingChannelsCount > 0 && filter === 'pending' && (
              <span className="bg-white/30 px-1 rounded text-xs">{pendingChannelsCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {requests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filter === 'pending' ? 'No Pending Requests' : 'No Requests Yet'}
          </h3>
          <p className="text-gray-500">
            {filter === 'pending'
              ? 'All requests have been handled.'
              : 'When your kids request videos or channels, they will appear here.'}
          </p>
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideoId && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setPlayingVideoId(null);
            setPlayingVideoMeta(null);
          }}
        >
          <div
            className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video Player Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm truncate">
                  {playingVideoMeta?.title || 'Video Preview'}
                </h3>
                {playingVideoMeta?.channelTitle && (
                  <p className="text-gray-400 text-xs truncate">{playingVideoMeta.channelTitle}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setPlayingVideoId(null);
                  setPlayingVideoMeta(null);
                }}
                className="ml-4 p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* YouTube Embed */}
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playingVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title={playingVideoMeta?.title || 'Video Preview'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Video Info Footer */}
            <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {playingVideoMeta?.durationSeconds && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDuration(playingVideoMeta.durationSeconds)}
                  </span>
                )}
                <a
                  href={`https://www.youtube.com/watch?v=${playingVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-red-400 transition"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Open on YouTube
                </a>
              </div>
              <button
                onClick={() => {
                  setPlayingVideoId(null);
                  setPlayingVideoMeta(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request list */}
      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request._id}
            className={`bg-white rounded-xl shadow-sm border overflow-hidden transition ${
              request.status === 'pending'
                ? request.type === 'channel' ? 'border-purple-200' : 'border-orange-200'
                : request.status === 'approved'
                ? 'border-green-200'
                : 'border-gray-200'
            }`}
          >
            <div className="flex gap-3 p-3">
              {/* Thumbnail */}
              <div className="relative flex-shrink-0">
                {request.type === 'channel' ? (
                  // Channel thumbnail (circular) - hide for denied requests
                  <div className="w-16 h-16">
                    {request.thumbnailUrl && request.status !== 'denied' ? (
                      <img
                        src={request.thumbnailUrl}
                        alt={request.channelTitle}
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full h-full rounded-full flex items-center justify-center ${
                        request.status === 'denied'
                          ? 'bg-gray-300'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  // Video thumbnail (rectangular) - hide for denied requests
                  <div className="w-32">
                    {request.thumbnailUrl && request.status !== 'denied' ? (
                      <img
                        src={request.thumbnailUrl}
                        alt={request.title}
                        className="w-full aspect-video object-cover rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full aspect-video rounded-lg flex items-center justify-center ${
                        request.status === 'denied'
                          ? 'bg-gray-300'
                          : 'bg-gradient-to-br from-red-500 to-orange-500'
                      }`}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    {request.durationSeconds && (
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
                        {formatDuration(request.durationSeconds)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Type badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                    request.type === 'channel'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {request.type === 'channel' ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Channel
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Video
                      </>
                    )}
                  </span>
                </div>

                {request.type === 'channel' ? (
                  <>
                    <h4 className="font-medium text-gray-900 line-clamp-1 text-sm">{request.channelTitle}</h4>
                    {request.subscriberCount && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {formatSubscribers(request.subscriberCount)} subscribers
                      </p>
                    )}
                    {request.description && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{request.description}</p>
                    )}
                  </>
                ) : (
                  <>
                    <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">{request.title}</h4>
                    <p className="text-gray-500 text-xs mt-0.5">{request.channelTitle}</p>
                  </>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {/* Kid indicator */}
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${getColorClass(request.kidColor)}`}
                    >
                      {request.kidIcon}
                    </div>
                    <span className="text-xs text-gray-600">{request.kidName}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">{formatTimeAgo(request.requestedAt)}</span>
                </div>

                {/* Status badge for non-pending */}
                {request.status !== 'pending' && (
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {request.status === 'approved' ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approved
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Denied
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Watch Video button for video requests */}
            {request.type === 'video' && request.videoId && (
              <button
                onClick={() => {
                  setPlayingVideoId(request.videoId);
                  setPlayingVideoMeta({
                    title: request.title,
                    channelTitle: request.channelTitle,
                    thumbnailUrl: request.thumbnailUrl,
                    durationSeconds: request.durationSeconds,
                  });
                }}
                className="w-full py-2 text-sm font-medium border-t border-gray-100 text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Video
              </button>
            )}

            {/* Preview Videos button for channel requests */}
            {request.type === 'channel' && (
              <button
                onClick={() => handleExpandChannel(request.channelId)}
                className={`w-full py-2 text-sm font-medium border-t transition flex items-center justify-center gap-2 ${
                  expandedChannelId === request.channelId
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'text-purple-600 hover:bg-purple-50 border-gray-100'
                }`}
              >
                {loadingVideos && expandedChannelId === request.channelId ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                    Loading videos...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedChannelId === request.channelId ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                    {expandedChannelId === request.channelId ? 'Hide Videos' : 'Preview Videos'}
                  </>
                )}
              </button>
            )}

            {/* Expanded Channel Videos Preview */}
            {request.type === 'channel' && expandedChannelId === request.channelId && (
              <div className="border-t border-purple-200 bg-purple-50/50">
                {/* Channel Stats Header with AI Review Button */}
                <div className="px-3 py-2 bg-purple-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-purple-700">
                    {channelDetails && (
                      <>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {formatSubscribers(channelDetails.statistics?.subscriberCount)} subscribers
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {parseInt(channelDetails.statistics?.videoCount || 0).toLocaleString()} videos
                        </span>
                      </>
                    )}
                  </div>
                  {/* AI Review Button */}
                  <button
                    onClick={() => handleAIReview(request)}
                    disabled={isReviewingChannel || channelVideos.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition shadow-sm"
                  >
                    {isReviewingChannel && reviewingChannelId === request.channelId ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Reviewing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Review
                      </>
                    )}
                  </button>
                </div>

                {/* AI Review Results */}
                {channelReview && expandedChannelId === request.channelId && (
                  <div className="mx-3 mt-3 p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        channelReview.recommendation === 'Recommended' ? 'bg-green-100' :
                        channelReview.recommendation === 'Not Recommended' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {channelReview.recommendation === 'Recommended' ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : channelReview.recommendation === 'Not Recommended' ? (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold text-sm ${
                            channelReview.recommendation === 'Recommended' ? 'text-green-700' :
                            channelReview.recommendation === 'Not Recommended' ? 'text-red-700' :
                            'text-yellow-700'
                          }`}>
                            {channelReview.recommendation}
                          </span>
                          <span className="text-gray-500 text-xs">Ages {channelReview.ageRecommendation}</span>
                        </div>
                        <p className="text-gray-600 text-xs mb-2">{channelReview.summary}</p>
                        {channelReview.concerns?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-gray-700 text-xs font-medium mb-1">Potential Concerns:</p>
                            <div className="flex flex-wrap gap-1">
                              {channelReview.concerns.map((concern, idx) => (
                                <span key={idx} className={`text-xs px-2 py-0.5 rounded-full ${
                                  concern.severity === 'significant' ? 'bg-red-100 text-red-700' :
                                  concern.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {concern.category}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Error */}
                {videoError && (
                  <div className="px-3 py-4 text-center text-red-600 text-sm">
                    {videoError}
                  </div>
                )}

                {/* Videos Grid */}
                {!loadingVideos && channelVideos.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs text-purple-600 font-medium mb-2">
                      Recent uploads ({channelVideos.length} videos)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {channelVideos.slice(0, 12).map((video) => (
                        <div
                          key={video.videoId}
                          className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer group"
                          onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                        >
                          <div className="relative">
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full aspect-video object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {video.durationSeconds && (
                              <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-white text-[10px] font-medium">
                                {formatDuration(video.durationSeconds)}
                              </div>
                            )}
                            {/* Play overlay on hover */}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                            {/* Made for Kids / Age Restricted badges */}
                            {video.madeForKids && (
                              <div className="absolute top-1 left-1 bg-green-500 px-1 py-0.5 rounded text-white text-[9px] font-medium">
                                Kids
                              </div>
                            )}
                            {video.ageRestricted && (
                              <div className="absolute top-1 left-1 bg-red-500 px-1 py-0.5 rounded text-white text-[9px] font-medium">
                                18+
                              </div>
                            )}
                          </div>
                          <div className="p-1.5">
                            <p className="text-[10px] font-medium text-gray-900 line-clamp-2 leading-tight">{video.title}</p>
                            <p className="text-[9px] text-gray-500 mt-0.5">{formatPublishedDate(video.publishedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {channelVideos.length > 12 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        + {channelVideos.length - 12} more videos
                      </p>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {!loadingVideos && channelVideos.length === 0 && !videoError && (
                  <div className="px-3 py-6 text-center text-gray-500 text-sm">
                    No videos found for this channel
                  </div>
                )}
              </div>
            )}

            {/* Action buttons for pending requests */}
            {request.status === 'pending' && (
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => handleDeny(request)}
                  disabled={processingId === request._id}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Deny
                </button>
                <div className="w-px bg-gray-100" />
                <button
                  onClick={() => handleApprove(request)}
                  disabled={processingId === request._id}
                  className={`flex-1 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                    request.type === 'channel'
                      ? 'text-purple-600 hover:bg-purple-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {processingId === request._id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
