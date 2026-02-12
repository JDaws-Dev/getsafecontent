import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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

export default function BlockedSearches({ userId, kidProfiles, defaultKidId }) {
  const [filterKidId, setFilterKidId] = useState(defaultKidId || 'all');

  const blockedSearches = useQuery(
    api.blockedSearches.getBlockedSearches,
    userId ? { userId, limit: 100 } : 'skip'
  );

  // Auto-select kid if defaultKidId is provided
  useEffect(() => {
    if (defaultKidId) {
      setFilterKidId(defaultKidId);
    }
  }, [defaultKidId]);

  // Filter by selected kid
  const filteredSearches = useMemo(() => {
    if (!blockedSearches) return [];
    if (filterKidId === 'all') return blockedSearches;
    return blockedSearches.filter(item => item.kidProfileId === filterKidId);
  }, [blockedSearches, filterKidId]);

  if (!blockedSearches) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (blockedSearches.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Blocked Searches</h3>
        <p className="text-gray-500">
          Great news! No inappropriate search attempts have been detected.
        </p>
      </div>
    );
  }

  // Group by date
  const groupedSearches = filteredSearches.reduce((groups, item) => {
    const date = new Date(item.timestamp).toDateString();
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
        <div>
          <h2 className="text-xl font-bold text-gray-900">Blocked Searches</h2>
          <p className="text-sm text-gray-500 mt-1">
            Search attempts that were blocked for inappropriate content
          </p>
        </div>
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
            {filteredSearches.length} blocked search{filteredSearches.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      {/* Empty filter state */}
      {filteredSearches.length === 0 && blockedSearches.length > 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500">No blocked searches for this kid.</p>
        </div>
      )}

      {/* Grouped by date */}
      {Object.entries(groupedSearches).map(([date, items]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {date === today ? 'Today' : date === yesterday ? 'Yesterday' : date}
          </h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item._id}
                className="flex gap-3 bg-white rounded-xl p-4 shadow-sm border border-red-100 hover:shadow-md transition"
              >
                {/* Warning Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Kid indicator */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getColorClass(item.kidColor)}`}
                    >
                      {item.kidIcon}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.kidName}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">{formatTimeAgo(item.timestamp)}</span>
                  </div>
                  <p className="text-gray-700">
                    Searched for: <span className="font-medium">"{item.query}"</span>
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    Blocked keyword: <code className="bg-red-50 px-1.5 py-0.5 rounded text-red-700">{item.blockedKeyword}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
