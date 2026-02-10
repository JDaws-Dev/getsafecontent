import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';

function ListeningStats({ user }) {
  const allKidsStats = useQuery(api.listeningStats.getAllKidsStats, user ? { userId: user._id } : 'skip');
  const [selectedKidId, setSelectedKidId] = useState(null);
  const [detailDays, setDetailDays] = useState(30);

  const detailedStats = useQuery(
    api.listeningStats.getKidDetailedStats,
    selectedKidId ? { kidProfileId: selectedKidId, days: detailDays } : 'skip'
  );

  // Helper functions for avatar and color
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : 'bg-purple-500';
  };

  const getColorHex = (colorId) => {
    const colorMap = {
      purple: '#8B5CF6',
      blue: '#3B82F6',
      green: '#10B981',
      yellow: '#F59E0B',
      pink: '#EC4899',
      red: '#EF4444',
      indigo: '#6366F1',
      orange: '#F97316',
      teal: '#14B8A6',
      cyan: '#06B6D4',
    };
    return colorMap[colorId] || colorMap.purple;
  };

  if (!allKidsStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (allKidsStats.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No listening data yet</h3>
        <p className="text-gray-600">Stats will appear here once your kids start listening to music.</p>
      </div>
    );
  }

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getMaxMinutes = (breakdown) => {
    return Math.max(...breakdown.map(d => d.minutes), 1);
  };

  // Overview Mode (all kids)
  if (!selectedKidId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Listening Stats</h2>
          <p className="text-gray-600 mt-1">See what your kids have been listening to</p>
        </div>

        {/* Kids Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allKidsStats.map((kidStats) => {
            const avatarColor = getColorHex(kidStats.kidColor);
            const maxMinutes = getMaxMinutes(kidStats.dailyBreakdown);

            return (
              <div
                key={kidStats.kidId}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedKidId(kidStats.kidId)}
              >
                {/* Kid Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white p-2"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getAvatarIcon(kidStats.kidAvatar)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{kidStats.kidName}</h3>
                    <p className="text-sm text-gray-500">
                      {kidStats.weeklyListenTimeMinutes > 0
                        ? `${formatMinutes(kidStats.weeklyListenTimeMinutes)} this week`
                        : 'No activity this week'}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-purple-600">{kidStats.totalPlays}</div>
                    <div className="text-xs text-gray-500">Plays</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{kidStats.uniqueSongs}</div>
                    <div className="text-xs text-gray-500">Songs</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{kidStats.topArtists.length}</div>
                    <div className="text-xs text-gray-500">Artists</div>
                  </div>
                </div>

                {/* Mini Weekly Chart */}
                <div className="mb-4">
                  <div className="flex items-end justify-between gap-1 h-12">
                    {kidStats.dailyBreakdown.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-purple-200 rounded-t transition-all"
                          style={{
                            height: `${Math.max((day.minutes / maxMinutes) * 100, 4)}%`,
                            backgroundColor: day.minutes > 0 ? avatarColor : '#E5E7EB',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {kidStats.dailyBreakdown.map((day, i) => (
                      <div key={i} className="flex-1 text-center text-[10px] text-gray-400">
                        {day.dayName}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Artist Preview */}
                {kidStats.topArtists.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400">Top artist:</span>
                    <span className="font-medium">{kidStats.topArtists[0].name}</span>
                    <span className="text-gray-400">({kidStats.topArtists[0].count} plays)</span>
                  </div>
                )}

                {/* Most Recent */}
                {kidStats.mostRecentPlay && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    {kidStats.mostRecentPlay.artworkUrl && (
                      <img
                        src={kidStats.mostRecentPlay.artworkUrl.replace('{w}', '40').replace('{h}', '40')}
                        alt=""
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {kidStats.mostRecentPlay.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {kidStats.mostRecentPlay.artistName}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTimeAgo(kidStats.mostRecentPlay.playedAt)}
                    </div>
                  </div>
                )}

                {/* View Details Link */}
                <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                  <span className="text-sm text-purple-600 font-medium">View Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Detailed Stats for Selected Kid
  if (!detailedStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const avatarColor = getColorHex(detailedStats.kidColor);
  const maxDailyMinutes = getMaxMinutes(detailedStats.dailyBreakdown);

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedKidId(null)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white p-2"
            style={{ backgroundColor: avatarColor }}
          >
            {getAvatarIcon(detailedStats.kidAvatar)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{detailedStats.kidName}'s Stats</h2>
            <p className="text-gray-600">Detailed listening activity</p>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map((days) => (
          <button
            key={days}
            onClick={() => setDetailDays(days)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              detailDays === days
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {days} Days
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="text-3xl font-bold text-purple-600">{detailedStats.summary.totalPlays}</div>
          <div className="text-sm text-gray-500">Total Plays</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="text-3xl font-bold text-blue-600">
            {formatMinutes(detailedStats.summary.totalListenTimeMinutes)}
          </div>
          <div className="text-sm text-gray-500">Listen Time</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="text-3xl font-bold text-green-600">{detailedStats.summary.uniqueSongs}</div>
          <div className="text-sm text-gray-500">Unique Songs</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="text-3xl font-bold text-orange-600">
            {formatMinutes(detailedStats.summary.avgDailyMinutes)}
          </div>
          <div className="text-sm text-gray-500">Daily Average</div>
        </div>
      </div>

      {/* Daily Listening Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Listening Time</h3>
        {detailedStats.dailyBreakdown && detailedStats.dailyBreakdown.length > 0 ? (
          <div className="h-48">
            <div className="flex items-end justify-between gap-2 h-full pb-6">
              {detailedStats.dailyBreakdown.slice(-14).map((day, i) => {
                const barHeight = maxDailyMinutes > 0
                  ? Math.max((day.minutes / maxDailyMinutes) * 100, 5)
                  : 5;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                    <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">
                      {day.minutes > 0 ? formatMinutes(day.minutes) : '0m'}
                    </div>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: day.minutes > 0 ? avatarColor : '#E5E7EB',
                        minHeight: '8px',
                      }}
                    />
                    <div className="text-[10px] text-gray-400 mt-1">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400">
            No listening data for this period
          </div>
        )}
      </div>

      {/* Top Songs & Artists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Songs */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Top Songs</h3>
          <div className="space-y-3">
            {detailedStats.topSongs.length === 0 ? (
              <p className="text-gray-500 text-sm">No songs played yet</p>
            ) : (
              detailedStats.topSongs.map((song, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-400 w-5">{i + 1}</div>
                  {song.artworkUrl && (
                    <img
                      src={song.artworkUrl.replace('{w}', '40').replace('{h}', '40')}
                      alt=""
                      className="w-10 h-10 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{song.name}</div>
                    <div className="text-sm text-gray-500 truncate">{song.artistName}</div>
                  </div>
                  <div className="text-sm text-gray-400">{song.playCount}×</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Artists */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Top Artists</h3>
          <div className="space-y-3">
            {detailedStats.topArtists.length === 0 ? (
              <p className="text-gray-500 text-sm">No artists played yet</p>
            ) : (
              detailedStats.topArtists.map((artist, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-400 w-5">{i + 1}</div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {artist.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{artist.name}</div>
                    <div className="text-sm text-gray-500">{artist.count} plays</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Peak Listening Hours */}
      {detailedStats.peakHours.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">When They Listen Most</h3>
          <div className="flex gap-4">
            {detailedStats.peakHours.map((peak, i) => {
              const hour = peak.hour;
              const period = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              return (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {displayHour}
                    <span className="text-sm font-normal text-gray-500">{period}</span>
                  </div>
                  <div className="text-sm text-gray-500">{peak.count} plays</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {detailedStats.recentActivity.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity</p>
          ) : (
            detailedStats.recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.artworkUrl && (
                  <img
                    src={item.artworkUrl.replace('{w}', '40').replace('{h}', '40')}
                    alt=""
                    className="w-10 h-10 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="text-sm text-gray-500 truncate">{item.artistName}</div>
                </div>
                <div className="text-sm text-gray-400">{formatTimeAgo(item.playedAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ListeningStats;
