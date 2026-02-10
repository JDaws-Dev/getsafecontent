import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { formatDuration } from '../../config/youtube';

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

export default function WatchHistory({ userId, kidProfiles, defaultKidId }) {
  const [filterKidId, setFilterKidId] = useState(defaultKidId || 'all');

  const watchHistory = useQuery(
    api.watchHistory.getWatchHistoryForUser,
    userId ? { userId, limit: 100 } : 'skip'
  );

  // Auto-select kid if defaultKidId is provided
  useEffect(() => {
    if (defaultKidId) {
      setFilterKidId(defaultKidId);
    }
  }, [defaultKidId]);

  // Filter history by selected kid
  const filteredHistory = useMemo(() => {
    if (!watchHistory) return [];
    if (filterKidId === 'all') return watchHistory;
    return watchHistory.filter(item => item.kidProfileId === filterKidId);
  }, [watchHistory, filterKidId]);

  if (!watchHistory) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (watchHistory.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Watch History Yet</h3>
        <p className="text-gray-500">
          When your kids watch videos, their activity will appear here.
        </p>
      </div>
    );
  }

  // Group by date
  const groupedHistory = filteredHistory.reduce((groups, item) => {
    const date = new Date(item.watchedAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Watch History</h2>
        <div className="flex items-center gap-3">
          {/* Kid Filter */}
          {kidProfiles && kidProfiles.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterKidId('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  filterKidId === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Kids
              </button>
              {kidProfiles.map((kid) => (
                <button
                  key={kid._id}
                  onClick={() => setFilterKidId(kid._id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium transition ring-2 ring-offset-2 ${
                    filterKidId === kid._id
                      ? `${getColorClass(kid.color)} ring-gray-900`
                      : `${getColorClass(kid.color)} ring-transparent opacity-50 hover:opacity-100`
                  }`}
                  title={kid.name}
                >
                  {kid.name.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <span className="text-sm text-gray-500">
            {filteredHistory.length} video{filteredHistory.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Empty filter state */}
      {filteredHistory.length === 0 && watchHistory.length > 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500">No watch history for this kid yet.</p>
        </div>
      )}

      {/* Grouped by date */}
      {Object.entries(groupedHistory).map(([date, items]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {date === today ? 'Today' : date === yesterday ? 'Yesterday' : date}
          </h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item._id}
                className="flex gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-32">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full aspect-video object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  {/* Watch duration badge */}
                  {item.watchDurationSeconds && (
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
                      {formatDuration(item.watchDurationSeconds)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">{item.title}</h4>
                  <p className="text-gray-500 text-xs mt-0.5">{item.channelTitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {/* Kid indicator */}
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${getColorClass(item.kidColor)}`}
                      >
                        {item.kidIcon}
                      </div>
                      <span className="text-xs text-gray-600">{item.kidName}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(item.watchedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
