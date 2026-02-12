import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import { formatDuration, getChannelVideos, searchVideos, searchChannels, formatSubscribers } from '../../config/youtube';
import { validateSearchQuery, filterVideoResults, filterChannelResults } from '../../utils/contentFilter';

// Decode HTML entities from YouTube API responses
function decodeHtmlEntities(text) {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// Format timestamp to relative time like YouTube
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

export default function KidHome({ profile, channels, videos, onBack, onPlayVideo, userId, canWatchStatus, onSwitchProfile }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'channels', 'mylist', 'requests'
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveChannelVideos, setLiveChannelVideos] = useState([]);
  const [isLoadingChannelVideos, setIsLoadingChannelVideos] = useState(false);
  const [channelVideoCache, setChannelVideoCache] = useState({}); // Cache videos by channel ID
  const [hasMoreVideos, setHasMoreVideos] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(null); // Video to add to playlist (for channel detail view)
  const profileMenuRef = useRef(null);

  // Mutation for adding videos to playlists
  const addVideoToPlaylistMutation = useMutation(api.kidPlaylists.addVideoToPlaylist);

  const handleAddVideoToPlaylist = async (playlistId, video) => {
    if (!profile?._id) return;
    try {
      await addVideoToPlaylistMutation({
        playlistId,
        kidProfileId: profile._id,
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        channelTitle: video.channelTitle,
        durationSeconds: video.durationSeconds,
      });
      setShowAddToPlaylistModal(null);
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Navigate to family code entry (clears the current session)
    navigate('/play');
    // Force page reload to clear state
    window.location.reload();
  };

  // Filter content based on search
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const query = searchQuery.toLowerCase();
    return channels.filter(c =>
      c.channelTitle.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    const query = searchQuery.toLowerCase();
    return videos.filter(v =>
      v.title.toLowerCase().includes(query) ||
      v.channelTitle.toLowerCase().includes(query)
    );
  }, [videos, searchQuery]);

  const handleChannelClick = (channel) => {
    setSelectedChannel(channel);
    setLiveChannelVideos([]);
    setIsLoadingChannelVideos(true);
  };

  const handleBackFromChannel = () => {
    setSelectedChannel(null);
    setLiveChannelVideos([]);
  };

  // Fetch videos live from YouTube when a channel is selected (with caching)
  // For PARTIAL channels, only show approved videos (don't fetch from YouTube)
  useEffect(() => {
    if (!selectedChannel) return;

    const channelId = selectedChannel.channelId;

    // PARTIAL CHANNEL: Only show approved videos, don't fetch from YouTube
    if (selectedChannel.isPartial) {
      const approvedVideosForChannel = videos.filter(v => v.channelId === channelId);
      setLiveChannelVideos(approvedVideosForChannel);
      setHasMoreVideos(false); // No "load more" for partial channels
      setIsLoadingChannelVideos(false);
      return;
    }

    // FULL CHANNEL: Fetch all videos from YouTube
    // Check cache first - instant loading for revisited channels
    if (channelVideoCache[channelId]) {
      setLiveChannelVideos(channelVideoCache[channelId].videos);
      setHasMoreVideos(channelVideoCache[channelId].hasMore);
      setIsLoadingChannelVideos(false);
      return;
    }

    let cancelled = false;

    const fetchVideos = async () => {
      try {
        // Only fetch 50 videos initially (1 API batch = fast)
        const { videos: fetchedVideos, totalResults } = await getChannelVideos(channelId, 50);
        if (!cancelled) {
          setLiveChannelVideos(fetchedVideos);
          const hasMore = totalResults > fetchedVideos.length;
          setHasMoreVideos(hasMore);
          // Cache the results
          setChannelVideoCache(prev => ({
            ...prev,
            [channelId]: { videos: fetchedVideos, hasMore, totalResults }
          }));
        }
      } catch (err) {
        console.error('Failed to fetch channel videos:', err);
      } finally {
        if (!cancelled) {
          setIsLoadingChannelVideos(false);
        }
      }
    };

    fetchVideos();

    return () => {
      cancelled = true;
    };
  }, [selectedChannel, channelVideoCache, videos]);

  // Filter channel videos based on search (now using live-fetched videos)
  const [channelSearchQuery, setChannelSearchQuery] = useState('');

  // Get kid's pending requests
  const kidRequests = useQuery(
    api.videoRequests.getKidRequests,
    profile?._id ? { kidProfileId: profile._id } : 'skip'
  );

  // Get kid's playlists
  const kidPlaylists = useQuery(
    api.kidPlaylists.getPlaylists,
    profile?._id ? { kidProfileId: profile._id } : 'skip'
  );

  const filteredChannelVideos = useMemo(() => {
    if (!channelSearchQuery) return liveChannelVideos;
    const query = channelSearchQuery.toLowerCase();
    return liveChannelVideos.filter(v =>
      v.title.toLowerCase().includes(query)
    );
  }, [liveChannelVideos, channelSearchQuery]);

  // Guard: if profile is not available, show loading state
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Load more videos for current channel
  const handleLoadMoreVideos = async () => {
    if (!selectedChannel || isLoadingMore) return;

    const channelId = selectedChannel.channelId;
    const currentCount = liveChannelVideos.length;

    setIsLoadingMore(true);
    try {
      // Fetch next batch (current + 50 more)
      const { videos: fetchedVideos, totalResults } = await getChannelVideos(channelId, currentCount + 50);
      setLiveChannelVideos(fetchedVideos);
      const hasMore = totalResults > fetchedVideos.length;
      setHasMoreVideos(hasMore);
      // Update cache
      setChannelVideoCache(prev => ({
        ...prev,
        [channelId]: { videos: fetchedVideos, hasMore, totalResults }
      }));
    } catch (err) {
      console.error('Failed to load more videos:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Channel detail view
  if (selectedChannel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        {/* Header */}
        <header className="px-4 py-3 flex items-center gap-4 bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => {
              handleBackFromChannel();
              setChannelSearchQuery('');
            }}
            className="text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-3 flex-1">
            {selectedChannel.thumbnailUrl ? (
              <img
                src={selectedChannel.thumbnailUrl}
                alt={selectedChannel.channelTitle}
                className="w-10 h-10 rounded-full object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-gray-900 font-semibold truncate">{selectedChannel.channelTitle}</h1>
              {selectedChannel.isPartial && (
                <span className="flex-shrink-0 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {selectedChannel.videoCount || liveChannelVideos.length} videos
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Search Bar for Channel Videos */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="relative">
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={channelSearchQuery}
              onChange={(e) => setChannelSearchQuery(e.target.value)}
              placeholder={`Search ${selectedChannel.channelTitle} videos...`}
              className="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {channelSearchQuery && (
              <button
                onClick={() => setChannelSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Channel Videos */}
        <main className="p-4">
          {isLoadingChannelVideos ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Loading videos...</p>
            </div>
          ) : liveChannelVideos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No videos from this channel yet.</p>
            </div>
          ) : filteredChannelVideos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No videos matching "{channelSearchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-6 lg:max-w-6xl">
              {channelSearchQuery && (
                <p className="text-gray-500 text-sm">
                  {filteredChannelVideos.length} video{filteredChannelVideos.length !== 1 ? 's' : ''} found
                </p>
              )}

              {/* Separate Shorts/Vertical from regular videos */}
              {/* Detect vertical videos by: isVertical flag from API OR duration <=180s OR #shorts in title */}
              {(() => {
                const isVerticalVideo = (v) => {
                  // API detected vertical aspect ratio (height > width)
                  if (v.isVertical === true) return true;
                  // Short duration (3 minutes or less) - max YouTube Shorts length
                  if (v.durationSeconds && v.durationSeconds <= 180) return true;
                  // Title contains #shorts or #short
                  if (v.title && /#shorts?/i.test(v.title)) return true;
                  return false;
                };
                // Only show shorts if enabled for this kid's profile
                const shorts = profile?.shortsEnabled === false ? [] : filteredChannelVideos.filter(isVerticalVideo);
                const regularVideos = profile?.shortsEnabled === false
                  ? filteredChannelVideos // Show all videos as regular when shorts disabled
                  : filteredChannelVideos.filter(v => !isVerticalVideo(v));

                return (
                  <>
                    {/* Shorts Section - Horizontal carousel */}
                    {shorts.length > 0 && (
                      <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.77 10.32c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z"/>
                          </svg>
                          Shorts
                          <span className="text-sm font-normal text-gray-500">({shorts.length})</span>
                        </h2>
                        <div className="flex flex-wrap sm:flex-nowrap gap-3 lg:gap-4 sm:overflow-x-auto pb-2">
                          {shorts.map((video) => (
                            <div key={video.videoId} className="relative group">
                              <ShortsCard
                                video={video}
                                onPlay={() => onPlayVideo(video, { shortsList: shorts, isFromChannel: true })}
                              />
                              {/* Add to playlist button */}
                              {kidPlaylists && kidPlaylists.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddToPlaylistModal(video);
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10"
                                  title="Add to playlist"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Regular Videos Section - Grid */}
                    {regularVideos.length > 0 && (
                      <section>
                        {shorts.length > 0 && (
                          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Videos
                            <span className="text-sm font-normal text-gray-500">({regularVideos.length})</span>
                          </h2>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                          {regularVideos.map((video) => (
                            <div key={video.videoId} className="relative group">
                              <VideoCard
                                video={video}
                                onPlay={() => onPlayVideo(video)}
                                showChannel={false}
                              />
                              {/* Add to playlist button */}
                              {kidPlaylists && kidPlaylists.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddToPlaylistModal(video);
                                  }}
                                  className="absolute top-2 right-2 p-2 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10"
                                  title="Add to playlist"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                );
              })()}
              {/* Load More Button */}
              {hasMoreVideos && !channelSearchQuery && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleLoadMoreVideos}
                    disabled={isLoadingMore}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isLoadingMore ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </span>
                    ) : (
                      'Load More Videos'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Add to Playlist Modal */}
        {showAddToPlaylistModal && kidPlaylists && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
              {/* Video preview header */}
              <div className="relative bg-gradient-to-br from-cyan-500 to-teal-500 p-4">
                <button
                  onClick={() => setShowAddToPlaylistModal(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  {showAddToPlaylistModal.thumbnailUrl ? (
                    <img
                      src={showAddToPlaylistModal.thumbnailUrl}
                      alt={showAddToPlaylistModal.title}
                      className="w-16 h-12 rounded-lg object-cover shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm line-clamp-2">{showAddToPlaylistModal.title}</p>
                    <p className="text-white/70 text-xs">{showAddToPlaylistModal.channelTitle}</p>
                  </div>
                </div>
              </div>

              {/* Playlist list */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose a playlist</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {kidPlaylists.map((playlist) => {
                    // Get color class from playlist.emoji (which stores color name)
                    const colorMap = {
                      red: 'from-red-400 to-red-600',
                      orange: 'from-orange-400 to-orange-600',
                      yellow: 'from-yellow-400 to-yellow-600',
                      green: 'from-green-400 to-green-600',
                      teal: 'from-teal-400 to-teal-600',
                      blue: 'from-blue-400 to-blue-600',
                      indigo: 'from-indigo-400 to-indigo-600',
                      purple: 'from-purple-400 to-purple-600',
                      pink: 'from-pink-400 to-pink-600',
                    };
                    const colorClass = colorMap[playlist.emoji] || 'from-cyan-400 to-teal-600';

                    return (
                      <button
                        key={playlist._id}
                        onClick={() => handleAddVideoToPlaylist(playlist._id, showAddToPlaylistModal)}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-cyan-50 hover:border-cyan-300 border-2 border-transparent rounded-xl transition text-left group active:scale-[0.98]"
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 block group-hover:text-cyan-700 transition">{playlist.name}</span>
                          <span className="text-gray-400 text-xs">{playlist.videoCount} videos</span>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    );
                  })}
                </div>

                {kidPlaylists.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">No playlists yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Format remaining time for display
  const formatRemainingTime = (minutes) => {
    if (minutes === null || minutes === undefined) return null;
    if (minutes <= 0) return 'Time up!';
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h left`;
    return `${hours}h ${mins}m left`;
  };

  const remainingTimeDisplay = canWatchStatus?.remainingMinutes !== null && canWatchStatus?.remainingMinutes !== undefined
    ? formatRemainingTime(canWatchStatus.remainingMinutes)
    : null;

  const isTimeLow = canWatchStatus?.remainingMinutes !== null && canWatchStatus?.remainingMinutes <= 15;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 shadow-sm z-20">
        {/* Logo/Brand */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xl">SafeTube</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
            <div
              className="w-10 h-10 rounded-full shadow-sm flex-shrink-0"
              style={{ backgroundColor: profile?.color || '#ef4444' }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{profile?.name}</p>
              {remainingTimeDisplay && (
                <p className={`text-xs font-medium ${isTimeLow ? 'text-orange-600' : 'text-green-600'}`}>
                  {remainingTimeDisplay}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: 'home', label: 'Home', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
            { id: 'channels', label: 'Channels', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
            { id: 'mylist', label: 'My List', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
            // Only show Requests tab if requests are enabled for this profile
            ...(profile?.requestsEnabled !== false ? [{ id: 'requests', label: 'Requests', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>, badge: kidRequests?.filter(r => r.status === 'pending').length || 0 }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  activeTab === item.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <button
            onClick={onSwitchProfile}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Switch Profile</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Mobile Header - Hidden on desktop */}
        <header className="lg:hidden px-4 py-3 flex items-center justify-between bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          {/* Profile (left) */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full shadow-sm flex-shrink-0"
              style={{ backgroundColor: profile?.color || '#ef4444' }}
            />
            <span className="text-gray-900 font-semibold">{profile?.name}</span>
            {/* Time remaining badge */}
            {remainingTimeDisplay && (
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ml-1 ${
                isTimeLow ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {remainingTimeDisplay}
              </div>
            )}
          </div>

          {/* Hamburger Menu (right) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Menu"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onSwitchProfile();
                  }}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Switch Profile
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <a
                    href="/login"
                    className="w-full px-4 py-2.5 text-left text-gray-500 hover:bg-gray-50 flex items-center gap-3 transition text-sm"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Parent Login
                  </a>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content - with bottom padding for mobile nav, no padding on desktop */}
        {/* Max-width container prevents content from stretching too wide on large screens */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8 lg:max-w-6xl">
        {activeTab === 'home' && (
          <HomeTab
            channels={filteredChannels}
            videos={filteredVideos}
            onPlayVideo={onPlayVideo}
            onChannelClick={handleChannelClick}
            profileId={profile?._id}
            playlists={kidPlaylists || []}
            shortsEnabled={profile?.shortsEnabled !== false}
          />
        )}

        {activeTab === 'channels' && (
          <ChannelsTab
            channels={channels}
            onChannelClick={handleChannelClick}
            onPlayVideo={onPlayVideo}
          />
        )}

        {activeTab === 'mylist' && (
          <MyListTab
            requests={kidRequests || []}
            videos={filteredVideos}
            playlists={kidPlaylists || []}
            profileId={profile?._id}
            onPlayVideo={onPlayVideo}
            onGoToRequests={() => setActiveTab('requests')}
            requestsEnabled={profile?.requestsEnabled !== false}
          />
        )}

        {activeTab === 'requests' && profile?.requestsEnabled !== false && (
          <RequestsTab
            requests={kidRequests || []}
            profileId={profile?._id}
            userId={userId}
          />
        )}
      </main>
      </div>{/* End Main Content Area */}

      {/* Fixed Bottom Navigation - Hidden on desktop */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe z-50">
        <div className={`grid gap-1 ${profile?.requestsEnabled !== false ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {[
            {
              id: 'home',
              label: 'Home',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
            },
            {
              id: 'channels',
              label: 'Channels',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              id: 'mylist',
              label: 'My List',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            // Only include Requests tab if requests are enabled for this profile
            ...(profile?.requestsEnabled !== false ? [{
              id: 'requests',
              label: 'Requests',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ),
              badge: kidRequests?.filter(r => r.status === 'pending').length || 0,
            }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-1 transition relative ${
                activeTab === tab.id
                  ? 'text-red-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-medium">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// Kid-friendly topic filters
const TOPIC_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'gaming', label: 'Gaming', keywords: ['game', 'gaming', 'minecraft', 'roblox', 'fortnite', 'play'] },
  { id: 'music', label: 'Music', keywords: ['music', 'song', 'dance', 'sing', 'concert'] },
  { id: 'science', label: 'Science', keywords: ['science', 'experiment', 'space', 'nature', 'animal', 'dinosaur'] },
  { id: 'crafts', label: 'DIY & Crafts', keywords: ['craft', 'diy', 'make', 'build', 'create', 'art'] },
  { id: 'stories', label: 'Stories', keywords: ['story', 'tale', 'adventure', 'episode'] },
  { id: 'learning', label: 'Learning', keywords: ['learn', 'teach', 'how to', 'tutorial', 'education', 'school'] },
];

// Topic Filter Pills with arrow navigation
function TopicFilterPills({ selectedFilter, onFilterChange }) {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -150 : 150;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="sticky top-0 z-10 bg-gradient-to-br from-red-50 via-white to-orange-50 pt-4 pb-2">
      <div className="relative flex items-center px-4">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Scrollable Pills */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TOPIC_FILTERS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onFilterChange(topic.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                selectedFilter === topic.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Home Tab - YouTube-style feed with latest videos from channels
function HomeTab({ channels, videos, onPlayVideo, onChannelClick, profileId, playlists, shortsEnabled = true }) {
  const [feedVideos, setFeedVideos] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' or topic id
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(null); // Video to add to playlist

  // Playlist mutation
  const addVideoToPlaylistMutation = useMutation(api.kidPlaylists.addVideoToPlaylist);

  const handleAddToPlaylist = async (playlistId, video) => {
    try {
      await addVideoToPlaylistMutation({
        playlistId,
        kidProfileId: profileId,
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        channelTitle: video.channelTitle,
        durationSeconds: video.durationSeconds,
      });
      setShowAddToPlaylist(null);
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    }
  };

  // Get recent watch history for this kid
  const watchHistory = useQuery(
    api.watchHistory.getWatchHistory,
    profileId ? { kidProfileId: profileId, limit: 10 } : 'skip'
  );

  // Fetch latest videos from approved channels on mount
  // IMPORTANT: Only fetch from YouTube for FULL channel approvals
  // For PARTIAL channels (individual video approvals), only show the approved videos
  useEffect(() => {
    if (channels.length === 0) {
      setIsLoadingFeed(false);
      return;
    }

    let cancelled = false;

    const fetchFeedVideos = async () => {
      try {
        setIsLoadingFeed(true);
        setLoadError(null);

        // Separate full vs partial channels
        const fullChannels = channels.filter(c => !c.isPartial);
        const partialChannelIds = new Set(channels.filter(c => c.isPartial).map(c => c.channelId));

        // Only fetch from YouTube for FULL channel approvals
        const fullChannelVideos = await Promise.all(
          fullChannels.map(async (channel) => {
            try {
              const { videos: channelVids } = await getChannelVideos(channel.channelId, 15);
              return channelVids.map(v => ({
                ...v,
                channelThumbnailUrl: channel.thumbnailUrl,
              }));
            } catch (err) {
              console.error(`Failed to fetch videos for ${channel.channelTitle}:`, err);
              return [];
            }
          })
        );

        if (cancelled) return;

        // For partial channels, ONLY use the pre-approved videos (from `videos` prop)
        // These are the specifically approved individual videos
        const partialChannelVideos = videos
          .filter(v => partialChannelIds.has(v.channelId))
          .map(v => ({
            ...v,
            channelThumbnailUrl: channels.find(c => c.channelId === v.channelId)?.thumbnailUrl,
          }));

        // Combine full channel videos + approved partial videos
        const allVideos = [...fullChannelVideos.flat(), ...partialChannelVideos];

        // Dedupe and sort by publish date
        const uniqueVideos = Array.from(
          new Map(allVideos.map(v => [v.videoId, v])).values()
        );
        const sortedVideos = uniqueVideos.sort((a, b) => {
          // Handle missing publishedAt - put items without dates at the end
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        });

        setFeedVideos(sortedVideos);
      } catch (err) {
        console.error('Failed to fetch feed videos:', err);
        if (!cancelled) {
          setLoadError('Failed to load latest videos');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFeed(false);
        }
      }
    };

    fetchFeedVideos();

    return () => {
      cancelled = true;
    };
  }, [channels, videos]);

  // Separate shorts (up to 3 minutes / 180 seconds - max YouTube Shorts length) from regular videos
  // Sort shorts by publish date (most recent first)
  const shorts = useMemo(() =>
    feedVideos
      .filter(v => v.durationSeconds > 0 && v.durationSeconds <= 180)
      .sort((a, b) => {
        // Handle missing publishedAt - put items without dates at the end
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      }),
    [feedVideos]
  );

  const regularVideos = useMemo(() =>
    feedVideos.filter(v => v.durationSeconds > 180 || v.durationSeconds === 0),
    [feedVideos]
  );

  // Helper to check if video matches topic filter
  const matchesTopic = (video, filterId) => {
    if (filterId === 'all') return true;
    const topic = TOPIC_FILTERS.find(t => t.id === filterId);
    if (!topic || !topic.keywords) return true;
    const title = (video.title || '').toLowerCase();
    const channelTitle = (video.channelTitle || '').toLowerCase();
    return topic.keywords.some(kw => title.includes(kw) || channelTitle.includes(kw));
  };

  // Also include individually approved videos that might not be from channel feeds
  // Sort by publish date (newest first) across ALL approved channels
  const combinedVideos = useMemo(() => {
    const feedVideoIds = new Set(feedVideos.map(v => v.videoId));
    const extraVideos = videos.filter(v => !feedVideoIds.has(v.videoId));
    let allVideos = [...regularVideos, ...extraVideos];

    // Apply topic filter if not "all"
    if (selectedFilter !== 'all') {
      allVideos = allVideos.filter(v => matchesTopic(v, selectedFilter));
    }

    // Sort by publish date (newest first)
    allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return allVideos.slice(0, 50);
  }, [regularVideos, videos, feedVideos, selectedFilter]);

  // Sort channels by most recently posted video and dedupe
  const sortedChannels = useMemo(() => {
    // Create a map of channelId -> most recent publish date
    const channelLastPost = new Map();
    feedVideos.forEach(v => {
      const current = channelLastPost.get(v.channelId);
      const videoDate = new Date(v.publishedAt).getTime();
      if (!current || videoDate > current) {
        channelLastPost.set(v.channelId, videoDate);
      }
    });

    // Dedupe channels by channelId
    const seen = new Set();
    const uniqueChannels = channels.filter(ch => {
      if (seen.has(ch.channelId)) return false;
      seen.add(ch.channelId);
      return true;
    });

    // Sort by most recently posted (channels with videos first, then by date)
    return uniqueChannels.sort((a, b) => {
      const aDate = channelLastPost.get(a.channelId) || 0;
      const bDate = channelLastPost.get(b.channelId) || 0;
      return bDate - aDate;
    });
  }, [channels, feedVideos]);

  // Filter shorts by topic and check if shorts are enabled for this kid
  const filteredShorts = useMemo(() => {
    // If shorts are disabled for this kid, return empty array
    if (!shortsEnabled) return [];
    if (selectedFilter === 'all') return shorts;
    return shorts.filter(v => matchesTopic(v, selectedFilter));
  }, [shorts, selectedFilter, shortsEnabled]);

  const featuredChannels = channels.slice(0, 6);

  // Recently added channels (within last 7 days) - for the "New Channels" section
  // Only shows channels from approvedChannels table (full channel approvals, not individual videos)
  const recentlyAddedChannels = useMemo(() => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const seen = new Set();
    return channels
      .filter(ch => {
        if (seen.has(ch.channelId)) return false;
        seen.add(ch.channelId);
        return ch.addedAt && ch.addedAt > sevenDaysAgo;
      })
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, 12); // Show up to 12 recently added channels
  }, [channels]);

  // Random suggestions - pick 3 random videos from different channels (refreshes each visit)
  const suggestedVideos = useMemo(() => {
    // Get regular videos only (no shorts) from the feed
    const regularFeedVideos = feedVideos.filter(v => v.durationSeconds > 180 || v.durationSeconds === 0);
    if (regularFeedVideos.length === 0) return [];

    // Shuffle videos randomly
    const shuffled = [...regularFeedVideos].sort(() => Math.random() - 0.5);

    // Pick videos ensuring no duplicate channels
    const result = [];
    const usedChannels = new Set();

    for (const video of shuffled) {
      if (result.length >= 3) break;
      if (!usedChannels.has(video.channelId)) {
        result.push(video);
        usedChannels.add(video.channelId);
      }
    }

    return result;
  }, [feedVideos]);

  if (videos.length === 0 && channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Nothing here yet!</h2>
        <p className="text-gray-500">
          Ask your parent to add some channels and videos for you to watch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topic Filter Pills - Sticky at top with arrow navigation */}
      <TopicFilterPills
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      <div className="px-4 space-y-6 lg:max-w-6xl">
      {/* Subscribed Channels - Horizontal scroll, sorted by most recently posted */}
      {selectedFilter === 'all' && sortedChannels.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Channels</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {sortedChannels.map((channel) => (
              <button
                key={channel.channelId}
                onClick={() => onChannelClick(channel)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16"
              >
                {channel.thumbnailUrl ? (
                  <img
                    src={channel.thumbnailUrl}
                    alt={channel.channelTitle}
                    className="w-14 h-14 rounded-full object-cover border-2 border-red-500 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center border-2 border-red-500 shadow-md">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <span className="text-gray-700 text-[11px] text-center line-clamp-1 font-medium w-full">
                  {channel.channelTitle}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* New Channels - Recently added by parent (within last 7 days) */}
      {selectedFilter === 'all' && recentlyAddedChannels.length > 0 && (
        <section className="bg-gradient-to-r from-green-50 to-emerald-50 -mx-4 px-4 py-4 rounded-xl border border-green-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Channels
            <span className="text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Just Added!</span>
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {recentlyAddedChannels.map((channel) => (
              <button
                key={`new-${channel.channelId}`}
                onClick={() => onChannelClick(channel)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 w-20"
              >
                {channel.thumbnailUrl ? (
                  <img
                    src={channel.thumbnailUrl}
                    alt={channel.channelTitle}
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-400 shadow-md ring-2 ring-green-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center border-2 border-green-400 shadow-md ring-2 ring-green-200">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <span className="text-gray-700 text-[11px] text-center line-clamp-2 font-medium w-full">
                  {channel.channelTitle}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Suggested For You - 3 random videos from channels, refreshes each visit */}
      {selectedFilter === 'all' && suggestedVideos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Suggested For You
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            {suggestedVideos.map((video) => (
              <div key={video.videoId} className="relative group">
                <button
                  onClick={() => onPlayVideo(video)}
                  className="w-full text-left"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 shadow-sm mb-1.5">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </div>
                    )}
                    {/* Duration badge */}
                    {video.durationSeconds && (
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
                        {formatDuration(video.durationSeconds)}
                      </div>
                    )}
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-900 text-sm font-medium line-clamp-2">{video.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{video.channelTitle}</p>
                </button>
                {/* Add to playlist button */}
                {playlists.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddToPlaylist(video);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10"
                    title="Add to playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New For You - Individually approved videos (sorted by when added) */}
      {selectedFilter === 'all' && videos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            New For You
          </h2>
          {/* Mobile: horizontal scroll, Desktop: grid */}
          <div className="flex lg:grid lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
            {videos.slice(0, 8).map((video) => (
              <div key={video.videoId} className="flex-shrink-0 w-40 lg:w-auto relative group">
                <button
                  onClick={() => onPlayVideo(video)}
                  className="w-full"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 shadow-sm mb-1.5">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </div>
                    )}
                    {/* Duration badge */}
                    {video.durationSeconds && (
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-white text-[10px] font-medium">
                        {formatDuration(video.durationSeconds)}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-900 text-xs font-medium line-clamp-2 text-left">{video.title}</p>
                  <p className="text-gray-500 text-[10px] text-left">{video.channelTitle}</p>
                </button>
                {/* Add to playlist button */}
                {playlists.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddToPlaylist(video);
                    }}
                    className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10"
                    title="Add to playlist"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Watched - Only show when filter is "all" and has history */}
      {selectedFilter === 'all' && watchHistory && watchHistory.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recently Watched
          </h2>
          {/* Horizontal scroll on all screen sizes - dedupe by videoId to avoid repeats */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {Array.from(new Map(watchHistory.map(item => [item.videoId, item])).values()).slice(0, 6).map((item) => (
              <div key={item._id} className="flex-shrink-0 w-40 relative group">
                <button
                  onClick={() => onPlayVideo({
                    videoId: item.videoId,
                    title: item.title,
                    thumbnailUrl: item.thumbnailUrl,
                    channelTitle: item.channelTitle,
                  })}
                  className="w-full"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 shadow-sm mb-1.5">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-900 text-xs font-medium line-clamp-2 text-left">{item.title}</p>
                  <p className="text-gray-500 text-[10px] text-left">{item.channelTitle}</p>
                </button>
                {/* Add to playlist button */}
                {playlists.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddToPlaylist({
                        videoId: item.videoId,
                        title: item.title,
                        thumbnailUrl: item.thumbnailUrl,
                        channelTitle: item.channelTitle,
                      });
                    }}
                    className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10"
                    title="Add to playlist"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shorts Section - Horizontal scroll on mobile, constrained grid on desktop */}
      {filteredShorts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.77 10.32c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z"/>
            </svg>
            Shorts
          </h2>
          {/* On mobile: 2 columns wrapped. On desktop: horizontal row with fixed-width cards */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 lg:gap-4 sm:overflow-x-auto pb-2">
            {filteredShorts.slice(0, 12).map((video) => (
              <div key={video.videoId} className="relative group">
                <ShortsCard
                  video={video}
                  onPlay={() => onPlayVideo(video, { shortsList: filteredShorts, isFromChannel: false })}
                />
                {/* Add to playlist button */}
                {playlists.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddToPlaylist(video);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition z-10"
                    title="Add to playlist"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loading State */}
      {isLoadingFeed && channels.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-500 border-t-transparent"></div>
            <span className="text-sm">Loading latest videos...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">{loadError}</p>
        </div>
      )}

      {/* More Videos - Show remaining videos after the featured section */}
      {combinedVideos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Latest Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {combinedVideos.slice(0, 24).map((video) => (
              <div key={video.videoId} className="relative group">
                <VideoCard
                  video={video}
                  onPlay={() => onPlayVideo(video)}
                />
                {/* Add to playlist button */}
                {playlists.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddToPlaylist(video);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    title="Add to playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fallback to approved videos if no feed loaded */}
      {!isLoadingFeed && combinedVideos.length === 0 && videos.length > 0 && selectedFilter === 'all' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {videos.slice(0, 10).map((video) => (
              <div key={video.videoId} className="relative group">
                <VideoCard
                  video={video}
                  onPlay={() => onPlayVideo(video)}
                />
                {/* Add to playlist button */}
                {playlists.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddToPlaylist(video);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    title="Add to playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State for Category Filters */}
      {!isLoadingFeed && combinedVideos.length === 0 && filteredShorts.length === 0 && selectedFilter !== 'all' && (
        <div className="py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {TOPIC_FILTERS.find(t => t.id === selectedFilter)?.label || 'matching'} videos yet
          </h3>
          <p className="text-gray-500 text-sm mb-4 px-8">
            Ask your parent to approve some {TOPIC_FILTERS.find(t => t.id === selectedFilter)?.label?.toLowerCase() || ''} channels!
          </p>
          <button
            onClick={() => setSelectedFilter('all')}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-5 py-2 rounded-full font-medium text-sm transition"
          >
            Show All Videos
          </button>
        </div>
      )}
      </div>{/* End of px-4 wrapper */}

      {/* Add to Playlist Modal - Improved with video preview */}
      {showAddToPlaylist && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            {/* Video preview header */}
            <div className="relative bg-gradient-to-br from-cyan-500 to-teal-500 p-4">
              <button
                onClick={() => setShowAddToPlaylist(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                {showAddToPlaylist.thumbnailUrl ? (
                  <img
                    src={showAddToPlaylist.thumbnailUrl}
                    alt={showAddToPlaylist.title}
                    className="w-16 h-12 rounded-lg object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm line-clamp-2">{showAddToPlaylist.title}</p>
                  <p className="text-white/70 text-xs">{showAddToPlaylist.channelTitle}</p>
                </div>
              </div>
            </div>

            {/* Playlist list */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose a playlist</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {playlists.map((playlist) => {
                  // Get color class from playlist.emoji (which stores color name)
                  const colorMap = {
                    red: 'from-red-400 to-red-600',
                    orange: 'from-orange-400 to-orange-600',
                    yellow: 'from-yellow-400 to-yellow-600',
                    green: 'from-green-400 to-green-600',
                    teal: 'from-teal-400 to-teal-600',
                    blue: 'from-blue-400 to-blue-600',
                    indigo: 'from-indigo-400 to-indigo-600',
                    purple: 'from-purple-400 to-purple-600',
                    pink: 'from-pink-400 to-pink-600',
                  };
                  const colorClass = colorMap[playlist.emoji] || 'from-cyan-400 to-teal-600';

                  return (
                    <button
                      key={playlist._id}
                      onClick={() => handleAddToPlaylist(playlist._id, showAddToPlaylist)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-cyan-50 hover:border-cyan-300 border-2 border-transparent rounded-xl transition text-left group active:scale-[0.98]"
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 block group-hover:text-cyan-700 transition">{playlist.name}</span>
                        <span className="text-gray-400 text-xs">{playlist.videoCount} videos</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  );
                })}
              </div>

              {playlists.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">No playlists yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shorts Card - Vertical format for short videos
function ShortsCard({ video, onPlay }) {
  return (
    <button
      onClick={onPlay}
      className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[140px] lg:w-[160px] group"
    >
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 shadow-md">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
          {formatDuration(video.durationSeconds)}
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-900 font-medium line-clamp-2 text-left">
        {decodeHtmlEntities(video.title)}
      </p>
    </button>
  );
}

// Channels Tab with cross-channel video search
function ChannelsTab({ channels, onChannelClick, onPlayVideo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [allVideosCache, setAllVideosCache] = useState(null); // Cache all channel videos
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // Fetch videos from all channels and search them
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const searchLower = query.toLowerCase();

    try {
      let allVideos = allVideosCache;

      // If we haven't cached all videos yet, fetch them
      if (!allVideos) {
        setLoadingProgress({ current: 0, total: channels.length });
        const videosFromAllChannels = [];

        // Fetch videos from each channel
        for (let i = 0; i < channels.length; i++) {
          const channel = channels[i];
          setLoadingProgress({ current: i + 1, total: channels.length });

          try {
            const { videos: channelVideos } = await getChannelVideos(channel.channelId, 100);
            // Add channel info to each video
            const videosWithChannel = channelVideos.map(v => ({
              ...v,
              channelThumbnailUrl: channel.thumbnailUrl,
            }));
            videosFromAllChannels.push(...videosWithChannel);
          } catch (err) {
            console.error(`Failed to fetch videos for ${channel.channelTitle}:`, err);
          }
        }

        allVideos = videosFromAllChannels;
        setAllVideosCache(allVideos);
      }

      // Filter videos by search query (only match video titles, not channel names)
      // Also match with/without spaces (e.g., "tree house" matches "treehouse" and vice versa)
      const searchNoSpaces = searchLower.replace(/\s+/g, '');
      const matches = allVideos.filter(video => {
        const titleLower = video.title.toLowerCase();
        const titleNoSpaces = titleLower.replace(/\s+/g, '');
        return titleLower.includes(searchLower) ||
               titleNoSpaces.includes(searchNoSpaces);
      });

      // Group by channel, then interleave to show variety
      const byChannel = {};
      matches.forEach(video => {
        if (!byChannel[video.channelId]) {
          byChannel[video.channelId] = [];
        }
        byChannel[video.channelId].push(video);
      });

      // Sort each channel's videos by date (newest first)
      Object.values(byChannel).forEach(channelVideos => {
        channelVideos.sort((a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });

      // Interleave: take one video from each channel in round-robin fashion
      const interleaved = [];
      const channelArrays = Object.values(byChannel);
      let maxLen = Math.max(...channelArrays.map(arr => arr.length));
      for (let i = 0; i < maxLen && interleaved.length < 50; i++) {
        for (const channelVideos of channelArrays) {
          if (channelVideos[i] && interleaved.length < 50) {
            interleaved.push(channelVideos[i]);
          }
        }
      }

      setSearchResults(interleaved);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500">No channels found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar - Sticky */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-red-50 via-white to-orange-50 px-4 pt-4 pb-2">
        <div className="relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos across all channels..."
            className="w-full bg-white border border-gray-200 rounded-full pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Loading state while searching */}
      {isSearching && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
            <span className="text-sm">
              {loadingProgress.total > 0 && !allVideosCache
                ? `Loading channels (${loadingProgress.current}/${loadingProgress.total})...`
                : 'Searching...'}
            </span>
          </div>
        </div>
      )}

      {/* Search Results - Videos */}
      {searchQuery && !isSearching && searchResults.length > 0 && (
        <div className="p-4 pt-2 lg:max-w-6xl">
          <p className="text-sm text-gray-500 mb-3">
            {searchResults.length} video{searchResults.length !== 1 ? 's' : ''} found
          </p>
          {/* Mobile: single column, Desktop: grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchResults.map((video) => (
              <VideoCard
                key={video.videoId}
                video={video}
                onPlay={() => onPlayVideo(video)}
                showChannel={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* No search results */}
      {searchQuery && !isSearching && searchResults.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-500">No videos matching "{searchQuery}"</p>
          <p className="text-gray-400 text-sm mt-1">Try different keywords</p>
        </div>
      )}

      {/* Channels List - Only show when not searching */}
      {!searchQuery && (
        <div className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:max-w-6xl">
          {channels.map((channel) => (
            <button
              key={channel.channelId}
              onClick={() => onChannelClick(channel)}
              className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition text-left"
            >
              {channel.thumbnailUrl ? (
                <img
                  src={channel.thumbnailUrl}
                  alt={channel.channelTitle}
                  className="w-14 h-14 rounded-full object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{channel.channelTitle}</h3>
                  {channel.isPartial && (
                    <span className="flex-shrink-0 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded font-medium">
                      Partial
                    </span>
                  )}
                </div>
                {channel.videoCount && (
                  <p className="text-gray-500 text-sm">{channel.videoCount} video{channel.videoCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// My List Tab - Shows kid's playlists and approved videos
function MyListTab({ requests, videos, playlists, profileId, onPlayVideo, onGoToRequests, requestsEnabled = true }) {
  const [activeView, setActiveView] = useState('playlists'); // 'playlists', 'all', 'playlist-detail'
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistColor, setNewPlaylistColor] = useState('red');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(null); // video to add to playlist
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null); // video to confirm removal
  const [isCreating, setIsCreating] = useState(false);

  // Mutations
  const createPlaylist = useMutation(api.kidPlaylists.createPlaylist);
  const deletePlaylist = useMutation(api.kidPlaylists.deletePlaylist);
  const addVideoToPlaylist = useMutation(api.kidPlaylists.addVideoToPlaylist);
  const removeVideoFromPlaylist = useMutation(api.kidPlaylists.removeVideoFromPlaylist);

  // Get playlist videos when viewing a playlist
  const playlistVideos = useQuery(
    api.kidPlaylists.getPlaylistVideos,
    selectedPlaylist ? { playlistId: selectedPlaylist._id } : 'skip'
  );

  // Get approved video requests (videos the kid specifically asked for)
  const approvedRequests = requests.filter(r => r.status === 'approved');

  // Combine approved requests with individually approved videos (not from channels)
  const myVideos = useMemo(() => {
    const requestVideoIds = new Set(approvedRequests.map(r => r.videoId));
    const individualVideos = videos.filter(v => !requestVideoIds.has(v.videoId));
    return [...approvedRequests, ...individualVideos];
  }, [approvedRequests, videos]);

  // Color options for playlists (cleaner than emojis)
  const colorOptions = [
    { name: 'red', bg: 'from-red-400 to-red-600' },
    { name: 'orange', bg: 'from-orange-400 to-orange-600' },
    { name: 'yellow', bg: 'from-yellow-400 to-yellow-600' },
    { name: 'green', bg: 'from-green-400 to-green-600' },
    { name: 'teal', bg: 'from-teal-400 to-teal-600' },
    { name: 'blue', bg: 'from-blue-400 to-blue-600' },
    { name: 'indigo', bg: 'from-indigo-400 to-indigo-600' },
    { name: 'purple', bg: 'from-purple-400 to-purple-600' },
    { name: 'pink', bg: 'from-pink-400 to-pink-600' },
  ];

  // Helper to get playlist color gradient
  const getPlaylistColorClass = (colorName) => {
    const color = colorOptions.find(c => c.name === colorName);
    return color ? color.bg : 'from-red-400 to-red-600';
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await createPlaylist({
        kidProfileId: profileId,
        name: newPlaylistName.trim(),
        emoji: newPlaylistColor, // Using color name instead of emoji
      });
      setNewPlaylistName('');
      setNewPlaylistColor('red');
      setShowCreatePlaylist(false);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm('Delete this playlist?')) return;
    try {
      await deletePlaylist({ playlistId });
      if (selectedPlaylist?._id === playlistId) {
        setSelectedPlaylist(null);
        setActiveView('playlists');
      }
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };

  const handleAddToPlaylist = async (playlistId, video) => {
    try {
      await addVideoToPlaylist({
        playlistId,
        kidProfileId: profileId,
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        channelTitle: video.channelTitle,
        durationSeconds: video.durationSeconds,
      });
      setShowAddToPlaylist(null);
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    }
  };

  const handleRemoveFromPlaylist = async (video) => {
    if (!selectedPlaylist) return;
    try {
      await removeVideoFromPlaylist({
        playlistId: selectedPlaylist._id,
        videoId: video.videoId,
      });
      setShowRemoveConfirm(null);
    } catch (err) {
      console.error('Failed to remove from playlist:', err);
    }
  };

  // Playlist Detail View
  if (activeView === 'playlist-detail' && selectedPlaylist) {
    return (
      <div className="p-4 lg:max-w-6xl">
        {/* Back button and playlist header */}
        <button
          onClick={() => {
            setSelectedPlaylist(null);
            setActiveView('playlists');
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Playlists
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlaylistColorClass(selectedPlaylist.emoji)} flex items-center justify-center shadow-md`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedPlaylist.name}</h2>
              <p className="text-gray-500 text-sm">{playlistVideos?.length || 0} videos</p>
            </div>
          </div>
          <button
            onClick={() => handleDeletePlaylist(selectedPlaylist._id)}
            className="p-2 text-gray-400 hover:text-red-500 transition"
            title="Delete playlist"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Playlist videos */}
        {!playlistVideos || playlistVideos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No videos in this playlist yet</p>
            <button
              onClick={() => setActiveView('all')}
              className="text-red-500 font-medium hover:text-red-600"
            >
              Add videos from your list →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playlistVideos.map((video) => (
              <div key={video.videoId} className="relative group">
                <VideoCard
                  video={video}
                  onPlay={() => onPlayVideo({
                    videoId: video.videoId,
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl,
                    channelTitle: video.channelTitle,
                  })}
                />
                <button
                  onClick={() => setShowRemoveConfirm(video)}
                  className="absolute top-2 right-2 p-2 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                  title="Remove from playlist"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main view with tabs
  return (
    <div className="p-4 lg:max-w-6xl">
      {/* Tab buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveView('playlists')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            activeView === 'playlists'
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          My Playlists
        </button>
        <button
          onClick={() => setActiveView('all')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            activeView === 'all'
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Videos ({myVideos.length})
        </button>
      </div>

      {/* Playlists View */}
      {activeView === 'playlists' && (
        <div>
          {/* Create playlist button */}
          <button
            onClick={() => setShowCreatePlaylist(true)}
            className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-red-400 hover:text-red-500 transition flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Playlist
          </button>

          {/* Playlists grid */}
          {playlists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Create your first playlist to organize your favorite videos!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlists.map((playlist) => (
                <button
                  key={playlist._id}
                  onClick={() => {
                    setSelectedPlaylist(playlist);
                    setActiveView('playlist-detail');
                  }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition text-left"
                >
                  {/* Playlist cover */}
                  <div className={`aspect-video bg-gradient-to-br ${getPlaylistColorClass(playlist.emoji)} flex items-center justify-center relative`}>
                    {playlist.coverThumbnail ? (
                      <img
                        src={playlist.coverThumbnail}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-12 h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {playlist.videoCount} videos
                    </div>
                  </div>
                  <div className="p-3">
                    <span className="font-medium text-gray-900 truncate block">{playlist.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Videos View */}
      {activeView === 'all' && (
        <div>
          {myVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No videos yet</h2>
              <p className="text-gray-500 text-sm mb-4">Ask your parent to approve some videos!</p>
              {requestsEnabled && (
                <button
                  onClick={onGoToRequests}
                  className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-full font-medium"
                >
                  Find Videos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myVideos.map((video) => (
                <div key={video.videoId} className="relative group">
                  <VideoCard
                    video={video}
                    onPlay={() => onPlayVideo({
                      videoId: video.videoId,
                      title: video.title,
                      thumbnailUrl: video.thumbnailUrl,
                      channelTitle: video.channelTitle,
                    })}
                  />
                  {/* Add to playlist button */}
                  {playlists.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddToPlaylist(video);
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/70 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                      title="Add to playlist"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Playlist</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Playlist Name</label>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Favorites"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose a Color</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setNewPlaylistColor(color.name)}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.bg} transition ${
                      newPlaylistColor === color.name
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                        : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName('');
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || isCreating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Playlist Modal - Improved with video preview */}
      {showAddToPlaylist && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            {/* Video preview header */}
            <div className="relative bg-gradient-to-br from-red-500 to-orange-500 p-4">
              <button
                onClick={() => setShowAddToPlaylist(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                {showAddToPlaylist.thumbnailUrl ? (
                  <img
                    src={showAddToPlaylist.thumbnailUrl}
                    alt={showAddToPlaylist.title}
                    className="w-16 h-12 rounded-lg object-cover shadow-md"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm line-clamp-2">{showAddToPlaylist.title}</p>
                  <p className="text-white/70 text-xs">{showAddToPlaylist.channelTitle}</p>
                </div>
              </div>
            </div>

            {/* Playlist list */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose a playlist</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {playlists.map((playlist) => (
                  <button
                    key={playlist._id}
                    onClick={() => handleAddToPlaylist(playlist._id, showAddToPlaylist)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-red-50 hover:border-red-300 border-2 border-transparent rounded-xl transition text-left group active:scale-[0.98]"
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${getPlaylistColorClass(playlist.emoji)} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 block group-hover:text-red-600 transition">{playlist.name}</span>
                      <span className="text-gray-400 text-xs">{playlist.videoCount} videos</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                ))}
              </div>

              {playlists.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">No playlists yet</p>
                  <button
                    onClick={() => {
                      setShowAddToPlaylist(null);
                      setShowCreatePlaylist(true);
                    }}
                    className="mt-2 text-red-500 font-medium text-sm hover:text-red-600"
                  >
                    Create your first playlist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove from Playlist Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            {/* Video preview */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {showRemoveConfirm.thumbnailUrl ? (
                  <img
                    src={showRemoveConfirm.thumbnailUrl}
                    alt={showRemoveConfirm.title}
                    className="w-16 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm line-clamp-2">{showRemoveConfirm.title}</p>
                </div>
              </div>
            </div>

            {/* Confirmation content */}
            <div className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Remove from playlist?</h3>
              <p className="text-gray-500 text-sm mb-4">
                This will remove the video from "{selectedPlaylist?.name}"
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveConfirm(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveFromPlaylist(showRemoveConfirm)}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Requests Tab - Kid's video AND channel requests with SEARCH functionality
function RequestsTab({ requests, profileId, userId }) {
  const [activeView, setActiveView] = useState('search'); // 'search' or 'history'
  const [searchType, setSearchType] = useState('videos'); // 'videos' or 'channels'
  const [searchQuery, setSearchQuery] = useState('');
  const [videoResults, setVideoResults] = useState([]);
  const [channelResults, setChannelResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestingId, setRequestingId] = useState(null);
  const [requestedVideoIds, setRequestedVideoIds] = useState(new Set());
  const [requestedChannelIds, setRequestedChannelIds] = useState(new Set());
  const [searchError, setSearchError] = useState(null); // For blocked search queries

  // Request mutations
  const createVideoRequest = useMutation(api.videoRequests.createRequest);
  const createChannelRequest = useMutation(api.channelRequests.createRequest);
  const logBlockedSearch = useMutation(api.blockedSearches.logBlockedSearch);

  // Get channel requests for this kid
  const channelRequests = useQuery(
    api.channelRequests.getKidRequests,
    profileId ? { kidProfileId: profileId } : 'skip'
  );

  // Group video requests by status
  const pendingVideoRequests = requests.filter(r => r.status === 'pending');
  const approvedVideoRequests = requests.filter(r => r.status === 'approved');
  const deniedVideoRequests = requests.filter(r => r.status === 'denied');

  // Group channel requests by status
  const pendingChannelRequests = (channelRequests || []).filter(r => r.status === 'pending');
  const approvedChannelRequests = (channelRequests || []).filter(r => r.status === 'approved');
  const deniedChannelRequests = (channelRequests || []).filter(r => r.status === 'denied');

  const totalPending = pendingVideoRequests.length + pendingChannelRequests.length;

  // Track already-requested IDs
  useEffect(() => {
    const videoIds = new Set(requests.map(r => r.videoId));
    setRequestedVideoIds(videoIds);
  }, [requests]);

  useEffect(() => {
    const channelIds = new Set((channelRequests || []).map(r => r.channelId));
    setRequestedChannelIds(channelIds);
  }, [channelRequests]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Validate search query for inappropriate content
    const validation = validateSearchQuery(searchQuery);
    if (!validation.isValid) {
      setSearchError(validation.message);
      setVideoResults([]);
      setChannelResults([]);
      // Log the blocked search to notify parents
      if (profileId && validation.blockedKeyword) {
        try {
          await logBlockedSearch({
            kidProfileId: profileId,
            query: searchQuery.trim(),
            blockedKeyword: validation.blockedKeyword,
          });
        } catch (err) {
          console.error('Failed to log blocked search:', err);
        }
      }
      return;
    }

    setSearchError(null);
    setIsSearching(true);
    try {
      // Search both videos and channels in parallel
      const [videos, channels] = await Promise.all([
        searchVideos(searchQuery, 20),
        searchChannels(searchQuery, 20),
      ]);
      // Filter results for inappropriate content
      setVideoResults(filterVideoResults(videos));
      // Sort channels by subscriber count (highest first)
      const filteredChannels = filterChannelResults(channels);
      filteredChannels.sort((a, b) => {
        const countA = parseInt(a.subscriberCount || '0', 10);
        const countB = parseInt(b.subscriberCount || '0', 10);
        return countB - countA;
      });
      setChannelResults(filteredChannels);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestVideo = async (video) => {
    if (!profileId) return;
    setRequestingId(video.videoId);

    try {
      await createVideoRequest({
        kidProfileId: profileId,
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        duration: video.duration,
        durationSeconds: video.durationSeconds,
      });
      setRequestedVideoIds(prev => new Set([...prev, video.videoId]));
    } catch (err) {
      console.error('Failed to request video:', err);
    } finally {
      setRequestingId(null);
    }
  };

  const handleRequestChannel = async (channel) => {
    if (!profileId) return;
    setRequestingId(channel.channelId);

    try {
      await createChannelRequest({
        kidProfileId: profileId,
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        thumbnailUrl: channel.thumbnailUrl,
        description: channel.description,
        subscriberCount: channel.subscriberCount,
      });
      setRequestedChannelIds(prev => new Set([...prev, channel.channelId]));
    } catch (err) {
      console.error('Failed to request channel:', err);
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => setActiveView('search')}
          className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
            activeView === 'search'
              ? 'text-red-600 border-red-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex-1 py-3 text-sm font-medium transition border-b-2 relative ${
            activeView === 'history'
              ? 'text-red-600 border-red-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          My Requests
          {totalPending > 0 && (
            <span className="absolute top-2 ml-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {totalPending}
            </span>
          )}
        </button>
      </div>

      {/* Search View */}
      {activeView === 'search' && (
        <div className="flex-1 p-4 overflow-y-auto lg:max-w-6xl">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos or channels..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-16 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-1.5 rounded-full text-sm font-medium transition"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Search Error (blocked query) */}
          {searchError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-800 font-medium text-sm">Oops!</p>
                  <p className="text-red-600 text-xs">{searchError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
            </div>
          ) : (videoResults.length > 0 || channelResults.length > 0) ? (
            <div className="space-y-6">
              {/* Search Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchType('videos')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    searchType === 'videos'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Videos ({videoResults.length})
                </button>
                <button
                  onClick={() => setSearchType('channels')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    searchType === 'channels'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Channels ({channelResults.length})
                </button>
              </div>

              {/* Video Results - NO thumbnails to avoid inappropriate content */}
              {searchType === 'videos' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {videoResults.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No videos found</p>
                  ) : (
                    videoResults.map((video) => {
                      const isRequested = requestedVideoIds.has(video.videoId);
                      const isRequesting = requestingId === video.videoId;
                      return (
                        <div
                          key={video.videoId}
                          className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm items-center"
                        >
                          {/* Generic play icon instead of thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">{decodeHtmlEntities(video.title)}</h4>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {decodeHtmlEntities(video.channelTitle)}
                              {video.durationSeconds > 0 && ` • ${formatDuration(video.durationSeconds)}`}
                              {video.publishedAt && ` • ${formatTimeAgo(video.publishedAt)}`}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {isRequested ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRequestVideo(video)}
                                disabled={isRequesting}
                                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-full text-xs font-medium transition"
                              >
                                {isRequesting ? '...' : 'Request'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Channel Results */}
              {searchType === 'channels' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channelResults.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No channels found</p>
                  ) : (
                    channelResults.map((channel) => {
                      const isRequested = requestedChannelIds.has(channel.channelId);
                      const isRequesting = requestingId === channel.channelId;
                      return (
                        <div
                          key={channel.channelId}
                          className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
                        >
                          {/* Generic channel icon - don't show actual thumbnails to avoid inappropriate content */}
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <h4 className="font-semibold text-gray-900 truncate">{decodeHtmlEntities(channel.channelTitle)}</h4>
                            {channel.subscriberCount && (
                              <p className="text-gray-500 text-xs mt-0.5">
                                {formatSubscribers(channel.subscriberCount)} subscribers
                              </p>
                            )}
                            {channel.description && (
                              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{decodeHtmlEntities(channel.description)}</p>
                            )}
                            <div className="mt-auto pt-2">
                              {isRequested ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Requested!
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRequestChannel(channel)}
                                  disabled={isRequesting}
                                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-1.5 rounded-full text-xs font-medium transition"
                                >
                                  {isRequesting ? 'Requesting...' : 'Request Channel'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-12 text-gray-500">
              <p>No results found for "{searchQuery}"</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-medium mb-1">Find something to watch</h3>
              <p className="text-gray-500 text-sm">
                Search for videos or channels and ask your parent to approve them!
              </p>
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <div className="flex-1 p-4 space-y-6 overflow-y-auto lg:max-w-6xl">
          {requests.length === 0 && (!channelRequests || channelRequests.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No requests yet</h2>
              <p className="text-gray-500 text-sm">
                Search for videos and request them!
              </p>
            </div>
          ) : (
            <>
              {/* Pending Requests */}
              {(pendingVideoRequests.length > 0 || pendingChannelRequests.length > 0) && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                    Waiting for approval
                  </h2>
                  <div className="space-y-3">
                    {pendingChannelRequests.map((request) => (
                      <ChannelRequestCard key={request._id} request={request} />
                    ))}
                    {pendingVideoRequests.map((request) => (
                      <RequestCard key={request._id} request={request} />
                    ))}
                  </div>
                </section>
              )}

              {/* Approved Requests */}
              {(approvedVideoRequests.length > 0 || approvedChannelRequests.length > 0) && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approved
                  </h2>
                  <div className="space-y-3">
                    {approvedChannelRequests.slice(0, 5).map((request) => (
                      <ChannelRequestCard key={request._id} request={request} />
                    ))}
                    {approvedVideoRequests.slice(0, 5).map((request) => (
                      <RequestCard key={request._id} request={request} />
                    ))}
                  </div>
                </section>
              )}

              {/* Denied Requests */}
              {(deniedVideoRequests.length > 0 || deniedChannelRequests.length > 0) && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Not approved
                  </h2>
                  <div className="space-y-3">
                    {deniedChannelRequests.slice(0, 5).map((request) => (
                      <ChannelRequestCard key={request._id} request={request} />
                    ))}
                    {deniedVideoRequests.slice(0, 5).map((request) => (
                      <RequestCard key={request._id} request={request} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Request Card
function RequestCard({ request }) {
  const statusColors = {
    pending: 'border-orange-200 bg-orange-50',
    approved: 'border-green-200 bg-green-50',
    denied: 'border-gray-200 bg-gray-50',
  };

  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${statusColors[request.status] || 'border-gray-200 bg-white'}`}>
      <div className="relative flex-shrink-0 w-28">
        {/* Hide thumbnail for denied requests */}
        {request.thumbnailUrl && request.status !== 'denied' ? (
          <img
            src={request.thumbnailUrl}
            alt={request.title}
            className="w-full aspect-video object-cover rounded-lg"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-full aspect-video rounded-lg flex items-center justify-center ${
            request.status === 'denied' ? 'bg-gray-300' : 'bg-gradient-to-br from-red-500 to-orange-500'
          }`}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        {request.durationSeconds && request.status !== 'denied' && (
          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
            {formatDuration(request.durationSeconds)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">{request.title}</h4>
        <p className="text-gray-500 text-xs mt-0.5">{request.channelTitle}</p>
        <div className="mt-2">
          {request.status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
              Waiting for parent
            </span>
          )}
          {request.status === 'approved' && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Added to your videos!
            </span>
          )}
          {request.status === 'denied' && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Not this time
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Channel Request Card
function ChannelRequestCard({ request }) {
  const statusColors = {
    pending: 'border-orange-200 bg-orange-50',
    approved: 'border-green-200 bg-green-50',
    denied: 'border-gray-200 bg-gray-50',
  };

  return (
    <div className={`flex gap-3 p-3 rounded-xl border items-center ${statusColors[request.status] || 'border-gray-200 bg-white'}`}>
      {/* Hide thumbnail for denied requests */}
      {request.thumbnailUrl && request.status !== 'denied' ? (
        <img
          src={request.thumbnailUrl}
          alt={request.channelTitle}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          request.status === 'denied' ? 'bg-gray-300' : 'bg-gradient-to-br from-red-500 to-orange-500'
        }`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">CHANNEL</span>
        </div>
        <h4 className="font-medium text-gray-900 truncate text-sm mt-0.5">{request.channelTitle}</h4>
        <div className="mt-1">
          {request.status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
              Waiting for parent
            </span>
          )}
          {request.status === 'approved' && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Added to your channels!
            </span>
          )}
          {request.status === 'denied' && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Not this time
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Video Card - YouTube style with full-width thumbnail
function VideoCard({ video, onPlay, showChannel = true }) {
  return (
    <button
      onClick={onPlay}
      className="w-full text-left group"
    >
      {/* Full-width thumbnail */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        {/* Duration badge */}
        {video.durationSeconds && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
            {formatDuration(video.durationSeconds)}
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Video info row with channel avatar */}
      <div className="flex gap-3 mt-3">
        {/* Channel avatar */}
        {showChannel && video.channelThumbnailUrl ? (
          <img
            src={video.channelThumbnailUrl}
            alt={video.channelTitle}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : showChannel ? (
          <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 text-sm font-medium">
              {video.channelTitle?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        ) : null}

        {/* Title and metadata */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-2 text-sm leading-tight">
            {decodeHtmlEntities(video.title)}
          </h3>
          {showChannel && (
            <p className="text-gray-500 text-xs mt-1">
              {video.channelTitle}
              {video.publishedAt && (
                <span> · {formatTimeAgo(video.publishedAt)}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
