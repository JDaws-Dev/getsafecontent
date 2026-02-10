import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { formatDuration } from '../../config/youtube';

// Confirm Modal component
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentLibrary({ userId, kidProfiles, selectedKidId, onSelectKid }) {
  const [viewMode, setViewMode] = useState('channels'); // 'channels', 'partial', or 'videos'
  const [expandedChannel, setExpandedChannel] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Get approved content for selected kid
  const channels = useQuery(
    api.channels.getApprovedChannels,
    selectedKidId ? { kidProfileId: selectedKidId } : 'skip'
  );

  const videos = useQuery(
    api.videos.getApprovedVideos,
    selectedKidId ? { kidProfileId: selectedKidId } : 'skip'
  );

  // Mutations
  const removeChannel = useMutation(api.channels.removeApprovedChannel);
  const removeVideo = useMutation(api.videos.removeApprovedVideo);

  const handleRemoveChannel = async (channelId, channelTitle) => {
    setConfirmModal({
      title: 'Remove Channel',
      message: `Remove ${channelTitle}? This will NOT remove videos from this channel that were individually added.`,
      onConfirm: async () => {
        try {
          await removeChannel({ kidProfileId: selectedKidId, channelId });
        } catch (err) {
          console.error('Failed to remove channel:', err);
        }
        setConfirmModal(null);
      },
    });
  };

  const handleRemoveVideo = async (videoId, videoTitle) => {
    setConfirmModal({
      title: 'Remove Video',
      message: `Remove "${videoTitle}"?`,
      onConfirm: async () => {
        try {
          await removeVideo({ kidProfileId: selectedKidId, videoId });
        } catch (err) {
          console.error('Failed to remove video:', err);
        }
        setConfirmModal(null);
      },
    });
  };

  const selectedProfile = kidProfiles?.find((p) => p._id === selectedKidId);

  // Get set of fully approved channel IDs
  const approvedChannelIds = useMemo(() => {
    return new Set(channels?.map(c => c.channelId) || []);
  }, [channels]);

  // Group videos by channel
  const videosByChannel = useMemo(() => {
    return videos?.reduce((acc, video) => {
      if (!acc[video.channelId]) {
        acc[video.channelId] = {
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl, // Use first video's thumbnail as fallback
          videos: [],
        };
      }
      acc[video.channelId].videos.push(video);
      return acc;
    }, {}) || {};
  }, [videos]);

  // Partial channels = channels with approved videos but NOT fully approved
  const partialChannels = useMemo(() => {
    if (!videosByChannel) return [];
    return Object.values(videosByChannel)
      .filter(ch => !approvedChannelIds.has(ch.channelId))
      .sort((a, b) => b.videos.length - a.videos.length); // Sort by video count desc
  }, [videosByChannel, approvedChannelIds]);

  return (
    <div className="space-y-6">
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        onConfirm={confirmModal?.onConfirm || (() => {})}
        onCancel={() => setConfirmModal(null)}
      />

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Content Library</h2>
        <p className="text-gray-600">View and manage approved content for each kid</p>
      </div>

      {/* Kid Selector */}
      {kidProfiles && kidProfiles.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Viewing library for:</label>
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
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: profile.color || '#ef4444' }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </span>
                <span>{profile.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          Create a kid profile first to see their library.
        </div>
      )}

      {selectedKidId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-gray-900">{channels?.length || 0}</div>
              <div className="text-gray-500">Approved Channels</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-gray-900">{videos?.length || 0}</div>
              <div className="text-gray-500">Approved Videos</div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('channels')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                viewMode === 'channels'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
              }`}
            >
              Full Channels ({channels?.length || 0})
            </button>
            <button
              onClick={() => setViewMode('partial')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                viewMode === 'partial'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-yellow-300'
              }`}
            >
              Partial ({partialChannels.length})
            </button>
            <button
              onClick={() => setViewMode('videos')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                viewMode === 'videos'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
              }`}
            >
              All Videos ({videos?.length || 0})
            </button>
          </div>

          {/* Content */}
          {viewMode === 'channels' ? (
            <div className="space-y-4">
              {channels?.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No approved channels yet.</p>
                  <p className="text-gray-400 text-sm mt-2">Search for channels to add to {selectedProfile?.name}'s library.</p>
                </div>
              ) : (
                channels?.map((channel) => {
                  const channelVideos = videosByChannel?.[channel.channelId]?.videos || [];
                  const isExpanded = expandedChannel === channel.channelId;

                  return (
                    <div key={channel.channelId} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                      <div className="p-4 flex items-center gap-4">
                        {channel.thumbnailUrl ? (
                          <img
                            src={channel.thumbnailUrl}
                            alt={channel.channelTitle}
                            className="w-14 h-14 rounded-full object-cover shadow-sm"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 items-center justify-center shadow-sm ${channel.thumbnailUrl ? 'hidden' : 'flex'}`}>
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{channel.channelTitle}</h4>
                          <p className="text-gray-500 text-sm">
                            {channel.videoCount ? `${channel.videoCount} videos` : 'Full channel approved'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveChannel(channel.channelId, channel.channelTitle);
                          }}
                          className="text-gray-400 hover:text-red-500 transition p-2"
                          title="Remove channel"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {channelVideos.length > 0 && isExpanded && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {channelVideos.map((video) => (
                            <div key={video.videoId} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
                              <div className="relative">
                                {video.thumbnailUrl ? (
                                  <img
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    className="w-full aspect-video object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full aspect-video bg-gradient-to-br from-red-500 to-orange-500 items-center justify-center ${video.thumbnailUrl ? 'hidden' : 'flex'}`}>
                                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs">
                                  {formatDuration(video.durationSeconds)}
                                </div>
                              </div>
                              <div className="p-2">
                                <h5 className="text-gray-900 text-sm line-clamp-2">{video.title}</h5>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : viewMode === 'partial' ? (
            /* Partial Channels View */
            <div className="space-y-4">
              {partialChannels.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No partial channels yet.</p>
                  <p className="text-gray-400 text-sm mt-2">When you add individual videos from a channel, they'll appear here.</p>
                </div>
              ) : (
                partialChannels.map((channel) => {
                  const isExpanded = expandedChannel === channel.channelId;
                  return (
                    <div key={channel.channelId} className="bg-white rounded-xl overflow-hidden shadow-sm border border-yellow-200">
                      <div
                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-yellow-50 transition"
                        onClick={() => setExpandedChannel(isExpanded ? null : channel.channelId)}
                      >
                        {/* Channel avatar from first video thumbnail or fallback */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-sm overflow-hidden">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{channel.channelTitle}</h4>
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              Partial
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm">
                            {channel.videos.length} video{channel.videos.length !== 1 ? 's' : ''} approved
                          </p>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-yellow-100 p-4 bg-yellow-50 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {channel.videos.map((video) => (
                            <div key={video.videoId} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 group">
                              <div className="relative">
                                {video.thumbnailUrl ? (
                                  <img
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    className="w-full aspect-video object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full aspect-video bg-gradient-to-br from-red-500 to-orange-500 items-center justify-center ${video.thumbnailUrl ? 'hidden' : 'flex'}`}>
                                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs">
                                  {formatDuration(video.durationSeconds)}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveVideo(video.videoId, video.title);
                                  }}
                                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <div className="p-2">
                                <h5 className="text-gray-900 text-sm line-clamp-2">{video.title}</h5>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* All Videos View */
            <div className="space-y-4">
              {videos?.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No approved videos yet.</p>
                  <p className="text-gray-400 text-sm mt-2">Search for videos to add to {selectedProfile?.name}'s library.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos?.map((video) => (
                    <div key={video.videoId} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-md transition">
                      <div className="relative">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full aspect-video object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full aspect-video bg-gradient-to-br from-red-500 to-orange-500 items-center justify-center ${video.thumbnailUrl ? 'hidden' : 'flex'}`}>
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-white text-xs font-medium">
                          {formatDuration(video.durationSeconds)}
                        </div>
                        <button
                          onClick={() => handleRemoveVideo(video.videoId, video.title)}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">{video.title}</h4>
                        <p className="text-gray-500 text-xs mt-1">{video.channelTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
