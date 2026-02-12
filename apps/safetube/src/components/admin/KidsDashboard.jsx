import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import KidProfilesManager from './KidProfilesManager';
import TimeLimits from './TimeLimits';
import WatchHistory from './WatchHistory';
import BlockedSearches from './BlockedSearches';

// Get color class from color name
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
  return colors[color] || 'bg-red-500';
}

export default function KidsDashboard({ userId, kidProfiles }) {
  const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'profiles', 'limits', 'history', 'blocked'
  const [selectedKidId, setSelectedKidId] = useState(null);

  // Get recent watch history for overview
  const recentHistory = useQuery(
    api.watchHistory.getRecentHistory,
    userId ? { userId, limit: 10 } : 'skip'
  );

  // Get time limits for all kids (includes watched time today)
  const allTimeLimits = useQuery(
    api.timeLimits.getTimeLimitsForUser,
    userId ? { userId } : 'skip'
  );

  // Get blocked searches count for today (for alert badge)
  const todayBlockedCount = useQuery(
    api.blockedSearches.getTodayBlockedCount,
    userId ? { userId } : 'skip'
  );

  // Overview section with kid cards
  if (activeSection === 'overview') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Kids Dashboard</h2>
          <p className="text-gray-600">Manage your kids' profiles, time limits, and watch activity</p>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveSection('profiles')}
            className="bg-white hover:bg-gray-50 rounded-xl p-5 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Manage Profiles</h3>
            <p className="text-gray-500 text-sm">Add, edit, or remove kid profiles</p>
          </button>
          <button
            onClick={() => setActiveSection('limits')}
            className="bg-white hover:bg-gray-50 rounded-xl p-5 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Time Limits</h3>
            <p className="text-gray-500 text-sm">Set daily viewing limits and hours</p>
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className="bg-white hover:bg-gray-50 rounded-xl p-5 text-left transition shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Watch History</h3>
            <p className="text-gray-500 text-sm">See what your kids have watched</p>
          </button>
          <button
            onClick={() => setActiveSection('blocked')}
            className={`bg-white hover:bg-gray-50 rounded-xl p-5 text-left transition shadow-sm border hover:shadow-md relative ${
              todayBlockedCount > 0 ? 'border-red-200 hover:border-red-300' : 'border-gray-100 hover:border-red-200'
            }`}
          >
            {/* Alert badge for today's blocked searches */}
            {todayBlockedCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {todayBlockedCount > 99 ? '99+' : todayBlockedCount}
              </div>
            )}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
              todayBlockedCount > 0 ? 'bg-red-100' : 'bg-red-50'
            }`}>
              <svg className={`w-5 h-5 ${todayBlockedCount > 0 ? 'text-red-600' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Blocked Searches</h3>
            <p className="text-gray-500 text-sm">View inappropriate search attempts</p>
          </button>
        </div>

        {/* Kid Cards */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Kids</h3>
          {!kidProfiles || kidProfiles.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">No kids yet</h4>
              <p className="text-gray-500 text-sm mb-4">Create a profile for each of your kids</p>
              <button
                onClick={() => setActiveSection('profiles')}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Add First Kid
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {kidProfiles.map((kid) => {
                const timeLimitData = allTimeLimits?.find(t => t.kidProfileId === kid._id);
                const kidHistory = recentHistory?.filter(h => h.kidProfileId === kid._id) || [];
                const hasRecentWatch = kidHistory.length > 0;
                const lastWatch = hasRecentWatch ? kidHistory[0] : null;

                // Calculate remaining time
                const dailyLimit = timeLimitData?.limit?.dailyLimitMinutes || 0;
                const watchedToday = timeLimitData?.watchedMinutesToday || 0;
                const remainingMinutes = dailyLimit > 0 ? Math.max(0, dailyLimit - watchedToday) : null;
                const isLimitReached = dailyLimit > 0 && remainingMinutes === 0;

                return (
                  <div
                    key={kid._id}
                    className={`bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition ${isLimitReached ? 'border-red-300' : 'border-gray-100'}`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 ${getColorClass(kid.color)}`}>
                        {kid.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{kid.name}</h4>

                        {/* Time Remaining Status */}
                        <div className="mt-1 sm:mt-2 flex items-center gap-2">
                          <svg className={`w-4 h-4 flex-shrink-0 ${isLimitReached ? 'text-red-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {dailyLimit > 0 ? (
                            <span className={`text-xs sm:text-sm ${isLimitReached ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                              {isLimitReached ? (
                                'Limit reached!'
                              ) : (
                                <>
                                  <span className="font-medium text-green-600">
                                    {remainingMinutes >= 60
                                      ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`
                                      : `${remainingMinutes}m`}
                                  </span>
                                  {' '}remaining today
                                </>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-400">Unlimited</span>
                          )}
                        </div>

                        {/* Daily Limit Info (smaller) */}
                        {dailyLimit > 0 && (
                          <div className="mt-0.5 text-xs text-gray-400">
                            Daily limit: {Math.floor(dailyLimit / 60)}h {dailyLimit % 60}m • Watched: {watchedToday}m
                          </div>
                        )}

                        {/* Content Settings */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${kid.shortsEnabled !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {kid.shortsEnabled !== false ? 'Shorts on' : 'Shorts off'}
                          </span>
                          <span className="text-gray-400">
                            {kid.maxVideosPerChannel || 5} videos/ch
                          </span>
                        </div>

                        {/* Last Watched */}
                        {lastWatch && (
                          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Last watched:</p>
                            <p className="text-xs sm:text-sm text-gray-700 truncate">{lastWatch.title}</p>
                            <p className="text-xs text-gray-400">{formatTimeAgo(lastWatch.watchedAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedKidId(kid._id);
                          setActiveSection('limits');
                        }}
                        className="flex-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition"
                      >
                        Set Limits
                      </button>
                      <button
                        onClick={() => {
                          setSelectedKidId(kid._id);
                          setActiveSection('history');
                        }}
                        className="flex-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition"
                      >
                        View History
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Preview */}
        {recentHistory && recentHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button
                onClick={() => setActiveSection('history')}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {recentHistory.slice(0, 5).map((item, idx) => {
                const kid = kidProfiles?.find(k => k._id === item.kidProfileId);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3">
                    {/* Kid Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${getColorClass(kid?.color)}`}>
                      {kid?.name?.charAt(0) || '?'}
                    </div>
                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {kid?.name || 'Unknown'} • {formatTimeAgo(item.watchedAt)}
                      </p>
                    </div>
                    {/* Thumbnail */}
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-16 h-10 object-cover rounded flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Back button component for sub-sections
  const BackButton = ({ label }) => (
    <button
      onClick={() => {
        setActiveSection('overview');
        setSelectedKidId(null);
      }}
      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="font-medium">{label}</span>
    </button>
  );

  // Profile management section
  if (activeSection === 'profiles') {
    return (
      <div>
        <BackButton label="Back to Kids Dashboard" />
        <KidProfilesManager userId={userId} kidProfiles={kidProfiles} />
      </div>
    );
  }

  // Time limits section
  if (activeSection === 'limits') {
    return (
      <div>
        <BackButton label="Back to Kids Dashboard" />
        <TimeLimits userId={userId} defaultKidId={selectedKidId} />
      </div>
    );
  }

  // Watch history section
  if (activeSection === 'history') {
    return (
      <div>
        <BackButton label="Back to Kids Dashboard" />
        <WatchHistory userId={userId} kidProfiles={kidProfiles} defaultKidId={selectedKidId} />
      </div>
    );
  }

  // Blocked searches section
  if (activeSection === 'blocked') {
    return (
      <div>
        <BackButton label="Back to Kids Dashboard" />
        <BlockedSearches userId={userId} kidProfiles={kidProfiles} defaultKidId={selectedKidId} />
      </div>
    );
  }

  return null;
}

// Format relative time
function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
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
