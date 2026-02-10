import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AlbumSearch from './AlbumSearch';
import MusicLibrarySeparate from './MusicLibrarySeparate';
import AddMusic from './AddMusic';
import AppleMusicAuth from './AppleMusicAuth';
import KidProfileManager from './KidProfileManager';
import RequestsView from './RequestsView';
import Settings from './Settings';
import GettingStarted from './GettingStarted';
import ParentDashboardHome from './ParentDashboardHome';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import EmptyState from '../common/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import { useExpoPushToken } from '../../hooks/useExpoPushToken';

// Compact Kid Card Component - New streamlined design
function CompactKidCard({ kid, getColorClass, onViewDetails }) {
  const recentActivity = useQuery(api.recentlyPlayed.getRecentlyPlayed, kid ? { kidProfileId: kid._id } : 'skip');
  const listeningStats = useQuery(api.recentlyPlayed.getListeningStats, kid ? { kidProfileId: kid._id } : 'skip');
  const timeLimitStatus = useQuery(api.timeControls.canPlay, kid ? { kidProfileId: kid._id } : 'skip');

  const lastSong = recentActivity?.find(item => item.itemType === 'song');
  const totalPlays = listeningStats?.totalPlays || 0;

  // Format relative time
  const getRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const played = new Date(date);
    const diffMs = now - played;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const isBlocked = timeLimitStatus && !timeLimitStatus.canPlay;
  const hasTimeLimit = timeLimitStatus?.limitMinutes;

  return (
    <button
      onClick={onViewDetails}
      className={`w-full bg-white rounded-xl p-4 border transition hover:shadow-md text-left ${
        isBlocked ? 'border-red-200 bg-red-50/50' : 'border-gray-100 hover:border-purple-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`relative w-12 h-12 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
          {kid.name.charAt(0).toUpperCase()}
          {/* Status indicator */}
          {lastSong && (
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
              new Date() - new Date(lastSong.playedAt) < 300000 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{kid.name}</span>
            {kid.ageRange && (
              <span className="text-xs text-gray-500">({kid.ageRange})</span>
            )}
            {isBlocked && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                LIMIT
              </span>
            )}
          </div>
          {lastSong ? (
            <p className="text-sm text-gray-500 truncate">
              🎵 "{lastSong.itemName}" · {getRelativeTime(lastSong.playedAt)}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No recent activity</p>
          )}
        </div>

        {/* Stats & Arrow */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {totalPlays > 0 && (
            <div className="text-right">
              <div className="text-lg font-bold text-purple-600">{totalPlays}</div>
              <div className="text-xs text-gray-500">plays</div>
            </div>
          )}
          {hasTimeLimit && !isBlocked && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {timeLimitStatus.remainingMinutes}m
            </span>
          )}
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Kid Activity Card Component (Full Detail Modal)
function KidActivityCard({ kid, kidAlbums, kidTracks, getAvatarIcon, getColorClass }) {
  const [showFullActivity, setShowFullActivity] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState('recent'); // 'recent', 'top', 'artists'
  const recentActivity = useQuery(api.recentlyPlayed.getRecentlyPlayed, kid ? { kidProfileId: kid._id } : 'skip');
  const listeningStats = useQuery(api.recentlyPlayed.getListeningStats, kid ? { kidProfileId: kid._id } : 'skip');
  const timeLimitStatus = useQuery(api.timeControls.canPlay, kid ? { kidProfileId: kid._id } : 'skip');
  const recentSongs = recentActivity ? recentActivity.filter(item => item.itemType === 'song').slice(0, 3) : [];
  const allRecentSongs = recentActivity ? recentActivity.filter(item => item.itemType === 'song') : [];

  // Format listening time
  const formatListenTime = (stats) => {
    if (!stats) return '0 min';
    if (stats.totalHours >= 1) {
      return `${stats.totalHours}h ${stats.totalMinutes % 60}m`;
    }
    return `${stats.totalMinutes || 0} min`;
  };

  return (
    <>
      {/* Full Activity Modal */}
      {showFullActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowFullActivity(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-2`}>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{kid.name}'s Listening History</h3>
                  <p className="text-sm text-gray-600">
                    {listeningStats?.totalPlays || 0} plays • {formatListenTime(listeningStats)} total
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFullActivity(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Summary */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{listeningStats?.totalPlays || 0}</div>
                  <div className="text-xs text-gray-600">Total Plays</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-pink-600">{listeningStats?.uniqueSongs || 0}</div>
                  <div className="text-xs text-gray-600">Unique Songs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">{formatListenTime(listeningStats)}</div>
                  <div className="text-xs text-gray-600">Listen Time</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveStatsTab('recent')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeStatsTab === 'recent'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setActiveStatsTab('top')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeStatsTab === 'top'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Most Played
              </button>
              <button
                onClick={() => setActiveStatsTab('artists')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeStatsTab === 'artists'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Top Artists
              </button>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Recent Tab */}
              {activeStatsTab === 'recent' && (
                allRecentSongs.length > 0 ? (
                  <div className="space-y-2">
                    {allRecentSongs.map((item, index) => (
                      <div key={item._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                        <div className="w-8 text-sm text-gray-500 text-center flex-shrink-0">
                          {index + 1}
                        </div>
                        {item.artworkUrl ? (
                          <img
                            src={item.artworkUrl.replace('{w}', '60').replace('{h}', '60')}
                            alt={item.itemName}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{item.itemName}</div>
                          <div className="text-xs text-gray-600 truncate">{item.artistName}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500">
                            {new Date(item.playedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          {item.playCount > 1 && (
                            <div className="text-xs text-purple-600 font-medium">{item.playCount}x played</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p>No songs played yet</p>
                  </div>
                )
              )}

              {/* Top Songs Tab */}
              {activeStatsTab === 'top' && (
                listeningStats?.topSongs?.length > 0 ? (
                  <div className="space-y-2">
                    {listeningStats.topSongs.map((item, index) => (
                      <div key={item._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          index === 0 ? 'bg-yellow-100 text-yellow-600' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          index === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          <span className="text-sm font-bold">{index + 1}</span>
                        </div>
                        {item.artworkUrl ? (
                          <img
                            src={item.artworkUrl.replace('{w}', '60').replace('{h}', '60')}
                            alt={item.itemName}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{item.itemName}</div>
                          <div className="text-xs text-gray-600 truncate">{item.artistName}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-purple-600">{item.playCount}</div>
                          <div className="text-xs text-gray-500">plays</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No play data yet</p>
                  </div>
                )
              )}

              {/* Top Artists Tab */}
              {activeStatsTab === 'artists' && (
                listeningStats?.topArtists?.length > 0 ? (
                  <div className="space-y-3">
                    {listeningStats.topArtists.map((artist, index) => (
                      <div key={artist.name} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                          index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="text-sm font-bold">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{artist.name}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                              style={{ width: `${(artist.count / listeningStats.topArtists[0].count) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-purple-600">{artist.count}</div>
                          <div className="text-xs text-gray-500">plays</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No artist data yet</p>
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowFullActivity(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className={`bg-white rounded-xl shadow-sm p-6 border ${timeLimitStatus && !timeLimitStatus.canPlay ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`relative w-16 h-16 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white shadow-md p-3`}>
            {/* Blocked indicator overlay */}
            {timeLimitStatus && !timeLimitStatus.canPlay && (
              <div className="absolute inset-0 bg-red-500 bg-opacity-80 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{kid.name}</h3>
            {/* Blocked badge */}
            {timeLimitStatus && !timeLimitStatus.canPlay && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full animate-pulse">
                LIMIT REACHED
              </span>
            )}
            {/* Time remaining badge */}
            {timeLimitStatus && timeLimitStatus.canPlay && timeLimitStatus.limitMinutes && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                {timeLimitStatus.remainingMinutes}m left
              </span>
            )}
          </div>
          {kid.ageRange && (
            <p className="text-sm text-gray-600">Age {kid.ageRange}</p>
          )}
          {/* Time limit info when blocked */}
          {timeLimitStatus && !timeLimitStatus.canPlay && (
            <p className="text-xs text-red-600 mt-1">
              Used {timeLimitStatus.usedMinutes}/{timeLimitStatus.limitMinutes} minutes today
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600">{kidAlbums.length}</div>
          <div className="text-xs text-gray-600 mt-1">Albums</div>
        </div>
        <div className="bg-pink-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-pink-600">{kidTracks}</div>
          <div className="text-xs text-gray-600 mt-1">Tracks</div>
        </div>
      </div>

      {/* Listening Stats Summary */}
      {listeningStats && listeningStats.totalPlays > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-indigo-900">
                {listeningStats.totalPlays} plays • {formatListenTime(listeningStats)}
              </span>
            </div>
            <button
              onClick={() => setShowFullActivity(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Stats →
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentSongs.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-gray-500">Recent Activity</div>
            <button
              onClick={() => setShowFullActivity(true)}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {recentSongs.map((item) => (
              <div key={item._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                {item.artworkUrl ? (
                  <img
                    src={item.artworkUrl.replace('{w}', '80').replace('{h}', '80')}
                    alt={item.itemName}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.itemName}</div>
                  <div className="text-xs text-gray-600 truncate">{item.artistName}</div>
                </div>
                {item.playCount > 1 && (
                  <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                    {item.playCount}x
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  );
}

function AdminDashboard({ user, onLogout }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [settingsSection, setSettingsSection] = useState(null); // 'account', 'apple-music', 'kids', 'subscription', 'support'
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hideTip, setHideTip] = useState(() => localStorage.getItem('safetunes_hide_tip') === 'true');

  // Register for push notifications (mobile app)
  useExpoPushToken({ userId: user?._id });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('safetunes_admin_tab', activeTab);
  }, [activeTab]);

  // Listen for navigation events from Settings component
  useEffect(() => {
    const handleNavigateToTab = (event) => {
      setActiveTab(event.detail);
    };
    window.addEventListener('navigateToTab', handleNavigateToTab);
    return () => window.removeEventListener('navigateToTab', handleNavigateToTab);
  }, []);
  const [albumToDelete, setAlbumToDelete] = useState(null);
  const [selectedKidsForDeletion, setSelectedKidsForDeletion] = useState([]);
  const removeApprovedAlbum = useMutation(api.albums.removeApprovedAlbum);
  const removeAlbumForKids = useMutation(api.albums.removeAlbumForKids);
  const toggleArtworkMutation = useMutation(api.albums.toggleAlbumArtwork);

  // Helper function to get avatar SVG
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  // Helper function to get color class
  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Toggle artwork visibility
  const toggleArtwork = async (album) => {
    try {
      await toggleArtworkMutation({
        userId: user._id,
        appleAlbumId: album.appleAlbumId,
        hideArtwork: !album.hideArtwork,
      });
    } catch (error) {
      console.error('Failed to toggle artwork:', error);
    }
  };

  // Persisted search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Fetch real kid profiles from Convex
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Fetch approved albums from Convex
  const approvedAlbums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Fetch featured albums (Discover pool)
  const featuredAlbums = useQuery(api.featured.getFeaturedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Fetch featured songs (Discover pool)
  const featuredSongs = useQuery(api.featured.getFeaturedSongs,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Fetch full user data for family code
  const fullUser = useQuery(api.users.getUser,
    user ? { userId: user._id } : 'skip'
  );

  // Fetch pending requests from Convex
  const pendingRequests = useQuery(api.albumRequests.getPendingRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const pendingSongRequests = useQuery(api.songRequests.getPendingSongRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const unreadBlockedSearchesCount = useQuery(api.blockedSearches.getUnreadBlockedSearchesCount,
    user ? { userId: user._id } : 'skip'
  ) || 0;

  // Calculate stats from real Convex data
  // Include both Library albums and Discover albums in the count
  const totalAlbums = approvedAlbums.length + featuredAlbums.length;
  const totalTracks = approvedAlbums.reduce((sum, album) => sum + (album.trackCount || 0), 0);
  const pendingCount = pendingRequests.length + pendingSongRequests.length + unreadBlockedSearchesCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                  <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SafeTunes</h1>
                <p className="text-xs text-gray-600">Parent Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:block">
            <nav className="flex gap-1 -mb-px">
              <button
                onClick={() => setActiveTab('home')}
                className={`${
                  activeTab === 'home'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`${
                  activeTab === 'requests'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2 relative`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Requests</span>
                {pendingCount > 0 && (
                  <span className={`bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center ${
                    pendingCount > 99 ? 'px-1.5 h-5 min-w-[1.25rem]' : 'w-5 h-5'
                  }`}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`${
                  activeTab === 'add'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add</span>
              </button>
              <button
                onClick={() => setActiveTab('music')}
                className={`${
                  activeTab === 'music'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>Music</span>
              </button>
              <button
                onClick={() => setActiveTab('getting-started')}
                className={`${
                  activeTab === 'getting-started'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Getting Started</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`${
                  activeTab === 'settings'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
                } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl py-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setActiveTab('getting-started');
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-medium">Getting Started</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button>
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={() => {
                onLogout();
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-4">
          {/* Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'home' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 2.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'home' ? 'font-semibold' : 'font-normal'}`}>Home</span>
            </div>
            {activeTab === 'home' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          {/* Requests */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'requests' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700 relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'requests' ? 2.5 : 2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingCount > 0 && (
                <span className={`absolute -top-1 -right-2 bg-red-600 text-white font-bold rounded-full flex items-center justify-center ${
                  pendingCount > 99 ? 'px-1 h-4 min-w-[1rem] text-[8px]' : 'w-4 h-4 text-[10px]'
                }`}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
              <span className={`text-xs transition-all ${activeTab === 'requests' ? 'font-semibold' : 'font-normal'}`}>Requests</span>
            </div>
            {activeTab === 'requests' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          {/* Add */}
          <button
            onClick={() => setActiveTab('add')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'add' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'add' ? 2.5 : 2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'add' ? 'font-semibold' : 'font-normal'}`}>Add</span>
            </div>
            {activeTab === 'add' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          {/* Music */}
          <button
            onClick={() => setActiveTab('music')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'music' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'music' ? 2.5 : 2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'music' ? 'font-semibold' : 'font-normal'}`}>Music</span>
            </div>
            {activeTab === 'music' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Home Tab - Command Center */}
        {activeTab === 'home' && (
          <ParentDashboardHome
            user={user}
            onNavigateToTab={(tab, options) => {
              setActiveTab(tab);
              if (options?.settingsSection) {
                setSettingsSection(options.settingsSection);
              } else {
                setSettingsSection(null);
              }
            }}
          />
        )}

        {/* Add Tab - Search and Import Music */}
        {activeTab === 'add' && (
          <AddMusic user={user} />
        )}

        {/* Music Tab - Separate Library and Discover */}
        {activeTab === 'music' && (
          <MusicLibrarySeparate user={user} />
        )}

        {/* Album Requests Tab */}
        {activeTab === 'requests' && (
          <RequestsView user={user} />
        )}

        {/* Kids Tab */}
        {activeTab === 'kids' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Kids' Listening Habits</h2>
                <p className="text-gray-600 mt-1">View and manage what each child is listening to</p>
              </div>
            </div>

            {kidProfiles.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Kid Profiles Yet</h3>
                  <p className="text-gray-600 mb-6">Create kid profiles to start managing their music library</p>
                  <button
                    onClick={() => setActiveTab('home')}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create First Profile
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 max-w-lg mx-auto">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Why create profiles?</p>
                      <p className="text-xs text-blue-600 mt-1">Each kid gets their own PIN to log in. You can assign different music to each child and track what they're listening to.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {kidProfiles.map((kid) => {
                  // Calculate stats for this kid
                  const kidAlbums = approvedAlbums.filter(album =>
                    !album.kidProfileIds || album.kidProfileIds.length === 0 || album.kidProfileIds.includes(kid._id)
                  );
                  const kidTracks = kidAlbums.reduce((sum, album) => sum + (album.trackCount || 0), 0);
                  const recentAlbums = kidAlbums.slice(0, 4);

                  return (
                    <div key={kid._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Kid Header */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className={`w-20 h-20 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white shadow-lg p-4`}>
                            {getAvatarIcon(kid.avatar)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900">{kid.name}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              {kid.ageRange && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Age {kid.ageRange}
                                </span>
                              )}
                              {kid.favoriteGenres && kid.favoriteGenres.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                  Likes: {kid.favoriteGenres.slice(0, 3).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">{kidAlbums.length}</div>
                          <div className="text-sm text-gray-600 mt-1">Albums</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-pink-600">{kidTracks}</div>
                          <div className="text-sm text-gray-600 mt-1">Tracks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-indigo-600">{kid.favoriteGenres?.length || 0}</div>
                          <div className="text-sm text-gray-600 mt-1">Genres</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">{recentAlbums.length}</div>
                          <div className="text-sm text-gray-600 mt-1">Recent</div>
                        </div>
                      </div>

                      {/* Recently Added Albums */}
                      {recentAlbums.length > 0 && (
                        <div className="p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recently Added</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {recentAlbums.map((album) => (
                              <div key={album._id} className="group relative">
                                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-md group-hover:shadow-lg transition">
                                  {album.artworkUrl ? (
                                    <img
                                      src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                                      alt={album.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                                      <svg className="w-12 h-12 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <p className="mt-2 text-sm font-medium text-gray-900 truncate">{album.name}</p>
                                <p className="text-xs text-gray-600 truncate">{album.artistName}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Favorite Genres Pills */}
                      {kid.favoriteGenres && kid.favoriteGenres.length > 0 && (
                        <div className="px-6 pb-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Favorite Genres</h4>
                          <div className="flex flex-wrap gap-2">
                            {kid.favoriteGenres.map((genre) => (
                              <span key={genre} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Music Preferences */}
                      {kid.musicPreferences && (
                        <div className="px-6 pb-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">Music Preferences</h4>
                          <p className="text-gray-600 text-sm">{kid.musicPreferences}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Settings user={user} onLogout={onLogout} initialSection={settingsSection} />
        )}

        {/* Getting Started Tab */}
        {activeTab === 'getting-started' && (
          <GettingStarted user={user} onNavigateToTab={setActiveTab} />
        )}
      </div>

      {/* Kid Selection Modal for Deletion */}
      {albumToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Remove Album</h3>
              <p className="text-gray-600 mt-2">
                Select which kids to remove "{albumToDelete.name}" from:
              </p>
            </div>

            {/* Kid Selection */}
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {kidProfiles
                .filter(kid =>
                  !albumToDelete.kidProfileIds ||
                  albumToDelete.kidProfileIds.length === 0 ||
                  albumToDelete.kidProfileIds.includes(kid._id)
                )
                .map((kid) => (
                  <label
                    key={kid._id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKidsForDeletion.includes(kid._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedKidsForDeletion([...selectedKidsForDeletion, kid._id]);
                        } else {
                          setSelectedKidsForDeletion(selectedKidsForDeletion.filter(id => id !== kid._id));
                        }
                      }}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className={`w-10 h-10 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-2`}>
                      {getAvatarIcon(kid.avatar)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{kid.name}</div>
                      {kid.ageRange && (
                        <div className="text-sm text-gray-600">Age {kid.ageRange}</div>
                      )}
                    </div>
                  </label>
                ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setAlbumToDelete(null);
                  setSelectedKidsForDeletion([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedKidsForDeletion.length === 0) {
                    showToast('Please select at least one kid to remove the album from', 'warning');
                    return;
                  }

                  await removeAlbumForKids({
                    userId: user._id,
                    appleAlbumId: albumToDelete.appleAlbumId,
                    kidProfileIds: selectedKidsForDeletion,
                  });

                  setAlbumToDelete(null);
                  setSelectedKidsForDeletion([]);
                }}
                disabled={selectedKidsForDeletion.length === 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove Album
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;
