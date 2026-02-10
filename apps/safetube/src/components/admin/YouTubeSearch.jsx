import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { formatDuration, formatSubscribers, formatViewCount, formatTimeAgo, decodeHtmlEntities } from '../../config/youtube';

// Video Preview Modal Component
function VideoPreviewModal({ video, onClose, onAdd, isAdded, isAdding, canAdd }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* YouTube Embed */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
            title={video.title}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video Info */}
        <div className="p-4">
          <h3 className="font-bold text-white text-lg mb-1 line-clamp-2">{decodeHtmlEntities(video.title)}</h3>
          <p className="text-gray-400 text-sm mb-4">{decodeHtmlEntities(video.channelTitle)} • {formatDuration(video.durationSeconds)}</p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isAdded ? (
              <div className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-lg font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added to Library
              </div>
            ) : !canAdd ? (
              <div className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-gray-300 py-3 rounded-lg font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Can't Add (Not Embeddable)
              </div>
            ) : (
              <button
                onClick={() => onAdd(video)}
                disabled={isAdding}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg font-medium transition"
              >
                {isAdding ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add to Library
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast notification component
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-gray-800 text-white'
    }`}>
      {type === 'success' && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {type === 'error' && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function YouTubeSearch({ userId, kidProfiles, selectedKidId, onSelectKid }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('channels'); // 'channels' or 'videos'
  const [videoDuration, setVideoDuration] = useState('any'); // 'any', 'short', 'medium', 'long'
  const [channelFilter, setChannelFilter] = useState(null); // { channelId, channelTitle } or null
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set()); // Track successfully added items

  // Channel preview state
  const [previewChannel, setPreviewChannel] = useState(null);
  const [channelVideos, setChannelVideos] = useState([]);
  const [isLoadingChannelVideos, setIsLoadingChannelVideos] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState(new Set()); // For multi-select
  const [isAddingMultiple, setIsAddingMultiple] = useState(false);
  const [channelVideoSearch, setChannelVideoSearch] = useState(''); // Search within channel

  // Video preview state
  const [previewVideo, setPreviewVideo] = useState(null);

  // AI Review state
  const [isReviewingChannel, setIsReviewingChannel] = useState(false);
  const [channelReview, setChannelReview] = useState(null);
  const reviewChannel = useAction(api.ai.channelReview.reviewChannel);

  // YouTube API caching actions
  const searchChannelsCached = useAction(api.youtubeCache.searchChannelsCached);
  const searchVideosCached = useAction(api.youtubeCache.searchVideosCached);
  const getChannelVideosCached = useAction(api.youtubeCache.getChannelVideosCached);

  // Clear added IDs when selected kid changes
  useEffect(() => {
    setAddedIds(new Set());
  }, [selectedKidId]);

  // Load channel videos when preview channel is set
  useEffect(() => {
    if (!previewChannel) {
      setChannelVideos([]);
      setSelectedVideos(new Set());
      setChannelReview(null);
      setChannelVideoSearch('');
      return;
    }

    const loadChannelVideos = async () => {
      setIsLoadingChannelVideos(true);
      try {
        // Use cached version to reduce API quota usage
        const result = await getChannelVideosCached({
          channelId: previewChannel.channelId,
          maxVideos: 50
        });

        // Check for API errors (quota exceeded, etc.)
        if (result.error) {
          setToast({ message: result.error, type: 'error' });
          setChannelVideos([]);
          return;
        }

        setChannelVideos(result.videos || []);

        // Show cache indicator if from cache
        if (result.fromCache) {
          console.log('[Cache] Loaded channel videos from cache');
        }
      } catch (err) {
        console.error('Failed to load channel videos:', err);
        setToast({ message: 'Failed to load channel videos', type: 'error' });
      } finally {
        setIsLoadingChannelVideos(false);
      }
    };

    loadChannelVideos();
  }, [previewChannel]);

  // Query existing approved content for selected kid
  const existingChannels = useQuery(
    api.channels.getApprovedChannels,
    selectedKidId ? { kidProfileId: selectedKidId } : 'skip'
  );
  const existingVideos = useQuery(
    api.videos.getApprovedVideos,
    selectedKidId ? { kidProfileId: selectedKidId } : 'skip'
  );

  // Create sets for quick lookup
  const existingChannelIds = new Set(existingChannels?.map(c => c.channelId) || []);
  const existingVideoIds = new Set(existingVideos?.map(v => v.videoId) || []);

  // Mutations
  const addChannel = useMutation(api.channels.addApprovedChannel);
  const addVideo = useMutation(api.videos.addApprovedVideo);

  const handleSearch = async (forceRefresh = false) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setResults([]);

    try {
      if (searchType === 'channels') {
        // Use cached version to reduce API quota usage
        const result = await searchChannelsCached({ query: searchQuery, forceRefresh });

        // Check for API errors (quota exceeded, etc.)
        if (result.error) {
          setToast({ message: result.error, type: 'error' });
          setResults([]);
          return;
        }

        setResults(result.results);

        // Show cache indicator if from cache
        if (result.fromCache) {
          setToast({ message: 'Results loaded from cache', type: 'success' });
        }
      } else {
        // Use cached version to reduce API quota usage
        const result = await searchVideosCached({
          query: searchQuery,
          forceRefresh,
          videoDuration: videoDuration !== 'any' ? videoDuration : undefined,
          channelId: channelFilter?.channelId || undefined,
        });

        // Check for API errors (quota exceeded, etc.)
        if (result.error) {
          setToast({ message: result.error, type: 'error' });
          setResults([]);
          return;
        }

        setResults(result.results);

        // Show cache indicator if from cache
        if (result.fromCache) {
          setToast({ message: 'Results loaded from cache', type: 'success' });
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      setToast({ message: `Search failed: ${err.message}`, type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddChannel = async (channel) => {
    if (!selectedKidId) {
      setToast({ message: 'Please select a kid profile first', type: 'error' });
      return;
    }

    setAddingId(channel.channelId);
    try {
      // Add the channel (videos are fetched live when kid browses)
      await addChannel({
        userId,
        kidProfileId: selectedKidId,
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        thumbnailUrl: channel.thumbnailUrl,
        description: channel.description,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount,
      });

      setAddedIds(prev => new Set([...prev, channel.channelId]));
      setToast({ message: `Added ${channel.channelTitle}! All videos are now approved.`, type: 'success' });
    } catch (err) {
      console.error('Failed to add channel:', err);
      setToast({ message: 'Failed to add channel', type: 'error' });
    } finally {
      setAddingId(null);
    }
  };

  const handleAddVideo = async (video) => {
    if (!selectedKidId) {
      setToast({ message: 'Please select a kid profile first', type: 'error' });
      return;
    }

    setAddingId(video.videoId);
    try {
      await addVideo({
        userId,
        kidProfileId: selectedKidId,
        videoId: video.videoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        duration: video.duration,
        durationSeconds: video.durationSeconds,
        madeForKids: video.madeForKids,
        publishedAt: video.publishedAt,
      });

      setAddedIds(prev => new Set([...prev, video.videoId]));
      setToast({ message: `Added "${video.title}"!`, type: 'success' });
    } catch (err) {
      console.error('Failed to add video:', err);
      setToast({ message: 'Failed to add video', type: 'error' });
    } finally {
      setAddingId(null);
    }
  };

  // Toggle video selection for multi-add
  const toggleVideoSelection = (videoId) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  // Add multiple selected videos
  const handleAddSelectedVideos = async () => {
    if (!selectedKidId) {
      setToast({ message: 'Please select a kid profile first', type: 'error' });
      return;
    }

    if (selectedVideos.size === 0) {
      setToast({ message: 'Select at least one video', type: 'error' });
      return;
    }

    setIsAddingMultiple(true);
    const videosToAdd = channelVideos.filter(v => selectedVideos.has(v.videoId));
    let addedCount = 0;

    for (const video of videosToAdd) {
      if (existingVideoIds.has(video.videoId) || addedIds.has(video.videoId)) continue;
      if (video.embeddable === false) continue;

      try {
        await addVideo({
          userId,
          kidProfileId: selectedKidId,
          videoId: video.videoId,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          duration: video.duration,
          durationSeconds: video.durationSeconds,
          madeForKids: video.madeForKids,
          publishedAt: video.publishedAt,
        });
        setAddedIds(prev => new Set([...prev, video.videoId]));
        addedCount++;
      } catch (err) {
        console.error('Failed to add video:', video.title, err);
      }
    }

    setIsAddingMultiple(false);
    setSelectedVideos(new Set());
    setToast({ message: `Added ${addedCount} videos!`, type: 'success' });
  };

  // AI Review channel
  const handleAIReview = async () => {
    if (!previewChannel) return;

    setIsReviewingChannel(true);
    try {
      const result = await reviewChannel({
        channelId: previewChannel.channelId,
        channelTitle: previewChannel.channelTitle,
        description: previewChannel.description || '',
        subscriberCount: previewChannel.subscriberCount || '',
        recentVideoTitles: channelVideos.slice(0, 20).map(v => v.title || '').filter(Boolean),
      });
      setChannelReview(result.review);
      if (result.fromCache) {
        setToast({ message: 'Loaded cached review', type: 'success' });
      }
    } catch (err) {
      console.error('AI review failed:', err);
      setToast({ message: 'AI review failed', type: 'error' });
    } finally {
      setIsReviewingChannel(false);
    }
  };

  const selectedProfile = kidProfiles?.find((p) => p._id === selectedKidId);

  // Filter channel videos by search term
  const filteredChannelVideos = useMemo(() => {
    if (!channelVideoSearch.trim()) return channelVideos;
    const search = channelVideoSearch.toLowerCase();
    return channelVideos.filter(v =>
      v.title?.toLowerCase().includes(search)
    );
  }, [channelVideos, channelVideoSearch]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Add Content</h2>
        <p className="text-gray-600">Search YouTube and add channels or videos to your kids' approved list</p>
      </div>

      {/* Kid Selector */}
      {kidProfiles && kidProfiles.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Adding to:</label>
          <div className="flex flex-wrap gap-2">
            {kidProfiles.map((profile) => (
              <button
                key={profile._id}
                onClick={() => onSelectKid(profile._id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition border ${
                  selectedKidId === profile._id
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white border-transparent shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:shadow-sm'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: profile.color || '#ef4444' }}
                />
                <span>{profile.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          You need to create a kid profile first before adding content.
        </div>
      )}

      {/* Search Type Toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setSearchType('channels')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            searchType === 'channels'
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
          }`}
        >
          Channels
        </button>
        <button
          onClick={() => setSearchType('videos')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            searchType === 'videos'
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
          }`}
        >
          Videos
        </button>

        {/* Duration filter - only show for video search */}
        {searchType === 'videos' && (
          <>
            <span className="text-gray-400 mx-2">|</span>
            <select
              value={videoDuration}
              onChange={(e) => setVideoDuration(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="any">Any length</option>
              <option value="short">Shorts (&lt; 4 min)</option>
              <option value="medium">Medium (4-20 min)</option>
              <option value="long">Long (&gt; 20 min)</option>
            </select>
          </>
        )}

        {/* Channel filter badge - show when filtering by channel */}
        {searchType === 'videos' && channelFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <span className="text-blue-700">
              Channel: <span className="font-medium">{decodeHtmlEntities(channelFilter.channelTitle)}</span>
            </span>
            <button
              onClick={() => setChannelFilter(null)}
              className="text-blue-500 hover:text-blue-700 p-0.5"
              title="Clear channel filter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={`Search for ${searchType}...`}
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={isSearching || !searchQuery.trim()}
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-lg font-medium transition shadow-md"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
        {/* Refresh button to bypass cache */}
        {results.length > 0 && (
          <button
            onClick={() => handleSearch(true)}
            disabled={isSearching}
            title="Refresh results (bypass cache)"
            className="bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-50 text-gray-600 px-3 py-3 rounded-lg transition shadow-sm"
          >
            <svg className={`w-5 h-5 ${isSearching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {results.length} Results
            {selectedProfile && (
              <span className="text-gray-500 font-normal ml-2">
                - Adding to {selectedProfile.name}
              </span>
            )}
          </h3>

          {searchType === 'channels' ? (
            <div className="space-y-3">
              {results.map((channel) => (
                <div
                  key={channel.channelId}
                  className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  {channel.thumbnailUrl ? (
                    <>
                      <img
                        src={channel.thumbnailUrl}
                        alt={channel.channelTitle}
                        className="w-16 h-16 rounded-full object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 items-center justify-center shadow-sm hidden">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{channel.channelTitle}</h4>
                    <p className="text-gray-500 text-sm truncate">{channel.description}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {channel.subscriberCount && `${formatSubscribers(channel.subscriberCount)} subscribers`}
                      {channel.videoCount && ` - ${channel.videoCount} videos`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Preview Videos Button */}
                    <button
                      onClick={() => setPreviewChannel(channel)}
                      className="bg-white border border-gray-200 hover:border-red-300 text-gray-700 px-3 py-2 rounded-lg font-medium transition whitespace-nowrap shadow-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview
                    </button>

                    {addedIds.has(channel.channelId) || existingChannelIds.has(channel.channelId) ? (
                      <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {existingChannelIds.has(channel.channelId) ? 'In Library' : 'Added'}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddChannel(channel)}
                        disabled={addingId === channel.channelId || !selectedKidId}
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-2 rounded-lg font-medium transition whitespace-nowrap shadow-sm"
                      >
                        {addingId === channel.channelId ? 'Adding...' : '+ Add All'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* YouTube-style horizontal list layout */
            <div className="space-y-4">
              {results.map((video) => (
                <div
                  key={video.videoId}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col sm:flex-row"
                >
                  {/* Thumbnail - fixed width on desktop */}
                  <button
                    onClick={() => setPreviewVideo(video)}
                    className="relative flex-shrink-0 sm:w-80 group"
                  >
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full sm:w-80 aspect-video object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full sm:w-80 aspect-video bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    {/* Play button overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-7 h-7 text-red-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-white text-xs font-medium">
                      {formatDuration(video.durationSeconds)}
                    </div>
                    {/* Warning badges */}
                    {(video.embeddable === false || video.ageRestricted) && (
                      <div className="absolute top-2 left-2 flex gap-1">
                        {video.embeddable === false && (
                          <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded font-medium">
                            Can't Embed
                          </span>
                        )}
                        {video.ageRestricted && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-medium">
                            Age Restricted
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Video info - YouTube style */}
                  <div className="flex-1 p-4 flex flex-col min-w-0">
                    {/* Title */}
                    <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1 text-base">{decodeHtmlEntities(video.title)}</h4>

                    {/* View count and time ago */}
                    <p className="text-gray-500 text-xs mb-2">
                      {video.viewCount && formatViewCount(video.viewCount)}
                      {video.viewCount && video.publishedAt && ' • '}
                      {video.publishedAt && formatTimeAgo(video.publishedAt)}
                    </p>

                    {/* Channel name - clickable to filter by this channel */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChannelFilter({ channelId: video.channelId, channelTitle: video.channelTitle });
                      }}
                      className="text-gray-500 text-sm mb-2 hover:text-red-600 hover:underline transition text-left"
                      title={`Search only in ${decodeHtmlEntities(video.channelTitle)}`}
                    >
                      {decodeHtmlEntities(video.channelTitle)}
                    </button>

                    {/* Description snippet */}
                    {video.description && (
                      <p className="text-gray-400 text-xs line-clamp-2 mb-3">{decodeHtmlEntities(video.description)}</p>
                    )}

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1" />

                    {/* Warning message for non-playable videos */}
                    {(video.embeddable === false || video.ageRestricted) && (
                      <p className="text-yellow-600 text-xs mb-2">
                        {video.embeddable === false
                          ? "This video can't be played in SafeTube"
                          : "Requires YouTube login to watch"}
                      </p>
                    )}

                    {/* Action button */}
                    {addedIds.has(video.videoId) || existingVideoIds.has(video.videoId) ? (
                      <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {existingVideoIds.has(video.videoId) ? 'In Library' : 'Added'}
                      </div>
                    ) : video.embeddable === false ? (
                      <div className="flex items-center gap-2 text-gray-400 font-medium text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Can't Add
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddVideo(video)}
                        disabled={addingId === video.videoId || !selectedKidId}
                        className={`self-start px-4 py-2 rounded-lg font-medium transition text-sm ${
                          video.ageRestricted
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white'
                        }`}
                      >
                        {addingId === video.videoId ? 'Adding...' : video.ageRestricted ? '+ Add (Login Required)' : '+ Add Video'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && results.length === 0 && searchQuery && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-500">No results found. Try a different search term.</p>
        </div>
      )}

      {/* Initial State */}
      {!isSearching && results.length === 0 && !searchQuery && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Search YouTube</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchType === 'channels'
              ? 'Search for YouTube channels. Click "Preview" to browse videos or "Add All" to add the entire channel.'
              : 'Search for individual YouTube videos to add to your kids\' library.'}
          </p>
        </div>
      )}

      {/* Channel Preview Modal */}
      {previewChannel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreviewChannel(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-4">
                {previewChannel.thumbnailUrl && (
                  <img
                    src={previewChannel.thumbnailUrl}
                    alt={previewChannel.channelTitle}
                    className="w-12 h-12 rounded-full object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{previewChannel.channelTitle}</h3>
                  <p className="text-gray-500 text-sm">
                    {formatSubscribers(previewChannel.subscriberCount)} subscribers
                    {selectedProfile && ` - Adding to ${selectedProfile.name}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setPreviewChannel(null)} className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                {/* AI Review Button */}
                <button
                  onClick={handleAIReview}
                  disabled={isReviewingChannel || channelVideos.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-sm"
                >
                  {isReviewingChannel ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Review
                    </>
                  )}
                </button>

                {/* Add Entire Channel */}
                <button
                  onClick={() => {
                    handleAddChannel(previewChannel);
                    setPreviewChannel(null);
                  }}
                  disabled={!selectedKidId || addedIds.has(previewChannel.channelId) || existingChannelIds.has(previewChannel.channelId)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-medium transition shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Entire Channel
                </button>
              </div>

              {/* Add Selected Videos */}
              {selectedVideos.size > 0 && (
                <button
                  onClick={handleAddSelectedVideos}
                  disabled={isAddingMultiple || !selectedKidId}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition shadow-sm"
                >
                  {isAddingMultiple ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    `Add ${selectedVideos.size} Selected Videos`
                  )}
                </button>
              )}
            </div>

            {/* AI Review Results */}
            {channelReview && (
              <div className="p-4 bg-purple-50 border-b border-purple-100">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    channelReview.recommendation === 'Recommended' ? 'bg-green-100' :
                    channelReview.recommendation === 'Not Recommended' ? 'bg-red-100' :
                    'bg-yellow-100'
                  }`}>
                    {channelReview.recommendation === 'Recommended' ? (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : channelReview.recommendation === 'Not Recommended' ? (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${
                        channelReview.recommendation === 'Recommended' ? 'text-green-700' :
                        channelReview.recommendation === 'Not Recommended' ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        {channelReview.recommendation}
                      </span>
                      <span className="text-gray-500 text-sm">- Ages {channelReview.ageRecommendation}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{channelReview.summary}</p>
                    {channelReview.concerns?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-gray-700 text-xs font-medium mb-1">Potential Concerns:</p>
                        <div className="flex flex-wrap gap-1">
                          {channelReview.concerns.map((concern, idx) => (
                            <span key={idx} className={`text-xs px-2 py-1 rounded-full ${
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

            {/* Search within channel */}
            {channelVideos.length > 0 && (
              <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                <div className="relative">
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={channelVideoSearch}
                    onChange={(e) => setChannelVideoSearch(e.target.value)}
                    placeholder="Search videos in this channel..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {channelVideoSearch && (
                    <button
                      onClick={() => setChannelVideoSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {channelVideoSearch && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing {filteredChannelVideos.length} of {channelVideos.length} videos
                  </p>
                )}
              </div>
            )}

            {/* Video List */}
            <div className="overflow-y-auto max-h-[50vh] p-4">
              {isLoadingChannelVideos ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Loading videos...</p>
                </div>
              ) : filteredChannelVideos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {channelVideoSearch ? 'No videos match your search.' : 'No videos found for this channel.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredChannelVideos.map((video) => {
                    const isSelected = selectedVideos.has(video.videoId);
                    const isAlreadyAdded = addedIds.has(video.videoId) || existingVideoIds.has(video.videoId);
                    const isDisabled = video.embeddable === false;

                    return (
                      <div
                        key={video.videoId}
                        className={`bg-white rounded-lg overflow-hidden shadow-sm border transition ${
                          isDisabled ? 'opacity-50 border-gray-200' :
                          isAlreadyAdded ? 'border-green-300 bg-green-50' :
                          isSelected ? 'border-red-400 ring-2 ring-red-200' :
                          'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {/* Clickable thumbnail for preview */}
                        <button
                          onClick={() => setPreviewVideo(video)}
                          className="relative w-full group"
                        >
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full aspect-video object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {/* Play button overlay on hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-5 h-5 text-red-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs">
                            {formatDuration(video.durationSeconds)}
                          </div>
                          {isAlreadyAdded && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              Added
                            </div>
                          )}
                          {isDisabled && (
                            <div className="absolute top-2 left-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              Can't embed
                            </div>
                          )}
                        </button>
                        <div className="p-2 flex items-center gap-2">
                          {/* Selection checkbox */}
                          {!isDisabled && !isAlreadyAdded && (
                            <button
                              onClick={() => toggleVideoSelection(video.videoId)}
                              className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition ${
                                isSelected ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-300 hover:border-red-400'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )}
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">{video.title}</h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
          onAdd={handleAddVideo}
          isAdded={addedIds.has(previewVideo.videoId) || existingVideoIds.has(previewVideo.videoId)}
          isAdding={addingId === previewVideo.videoId}
          canAdd={previewVideo.embeddable !== false && selectedKidId}
        />
      )}
    </div>
  );
}
