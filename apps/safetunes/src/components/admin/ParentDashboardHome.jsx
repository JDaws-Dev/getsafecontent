import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { COLORS } from '../../constants/avatars';
import { useToast } from '../../contexts/ToastContext';
import {
  Music,
  ChevronRight,
  ChevronDown,
  Plus,
  Copy,
  Users,
  AlertCircle,
  Activity,
  Lock,
  Moon,
  X,
  ShieldAlert,
  Settings
} from 'lucide-react';


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getColorClass = (colorId) => {
  const color = COLORS.find(c => c.id === colorId);
  return color ? color.class : COLORS[0].class;
};

const getRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatTime = (minutes) => {
  if (!minutes || minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

// Check if a timestamp is during "late night" hours (10PM - 6AM)
const isLateNightTime = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Alert Banner for pending requests
function AlertBanner({ count, onDismiss, onNavigate }) {
  if (count === 0) return null;

  return (
    <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl overflow-hidden shadow-lg">
      <button
        onClick={onNavigate}
        className="w-full p-4 flex items-center justify-between hover:from-orange-600 hover:to-amber-600 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold">{count} Request{count !== 1 ? 's' : ''} waiting for review</p>
            <p className="text-sm text-white/80">Tap to review and respond</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </button>
      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-2 right-2 p-1.5 hover:bg-white/20 rounded-full transition"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Kid Card - Smart Accordion with Safety-First Design
function KidCard({ kid, onPauseToggle, onManageProfile }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMusicEnabled = !kid.isPaused;

  // Real data queries
  const recentActivity = useQuery(api.recentlyPlayed.getRecentlyPlayed, kid ? { kidProfileId: kid._id } : 'skip');
  const listeningStats = useQuery(api.recentlyPlayed.getListeningStats, kid ? { kidProfileId: kid._id } : 'skip');

  // Compute values from real data or use mock/defaults
  const lastSong = recentActivity?.find(item => item.itemType === 'song');
  const isRecentlyActive = lastSong && (new Date() - new Date(lastSong.playedAt) < 300000);

  const isListening = isMusicEnabled && (kid.isListening ?? isRecentlyActive);
  const timeToday = kid.timeToday ?? (listeningStats?.totalMinutes || 0);
  const blockedCount = kid.blockedCount ?? 0;

  // Blocked events for this kid (from real data or mock)
  const blockedEvents = kid.blockedEvents || [];

  // Check for late night activity (10PM - 6AM)
  const hasLateNightActivity = kid.hasLateNightActivity ??
    (recentActivity?.some(item => isLateNightTime(item.playedAt)) || false);

  // Now playing info
  const nowPlaying = kid.nowPlaying || (lastSong ? {
    songName: lastSong.itemName,
    artistName: lastSong.artistName,
    artworkUrl: lastSong.artworkUrl,
    playedAt: lastSong.playedAt
  } : null);

  // Recent plays for expanded view - exclude the currently playing song
  const recentPlaysRaw = kid.recentPlays || recentActivity?.filter(item => item.itemType === 'song') || [];
  const recentPlays = nowPlaying
    ? recentPlaysRaw.filter(p => p.itemName !== nowPlaying.songName || p._id !== lastSong?._id).slice(0, 4)
    : recentPlaysRaw.slice(0, 4);

  // Top artists from listening stats
  const topArtists = listeningStats?.topArtists?.slice(0, 3) || [];

  // Total plays count
  const totalPlays = listeningStats?.totalPlays || recentActivity?.length || 0;

  const handleToggle = (e) => {
    e.stopPropagation();
    onPauseToggle?.(kid._id, isMusicEnabled);
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleManageProfile = (e) => {
    e.stopPropagation();
    onManageProfile?.(kid._id);
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        !isMusicEnabled
          ? 'border-gray-300 bg-gray-100'
          : blockedCount > 0
            ? 'border-red-200 bg-white shadow-sm hover:shadow-md'
            : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
      }`}
    >
      {/* Card content wrapper - dims when locked */}
      <div className={!isMusicEnabled ? 'opacity-60' : ''}>
        {/* Top Row: Avatar + Name + Toggle */}
        <div
          className="p-4 cursor-pointer"
          onClick={handleCardClick}
        >
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Name */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                  {kid.name.charAt(0).toUpperCase()}
                </div>
                {/* Live status dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  !isMusicEnabled ? 'bg-gray-400' :
                  isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{kid.name}</h3>
                {/* Status text based on music enabled state */}
                {!isMusicEnabled ? (
                  <p className="text-sm text-red-500 font-medium">Paused</p>
                ) : null}
              </div>
            </div>

            {/* Right: Music Access Toggle Switch */}
            <button
              onClick={handleToggle}
              className={`relative w-14 h-8 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isMusicEnabled
                  ? 'bg-green-500 focus:ring-green-500'
                  : 'bg-gray-300 focus:ring-gray-400'
              }`}
              title={isMusicEnabled ? 'Music enabled - tap to pause' : 'Music paused - tap to enable'}
              aria-label={isMusicEnabled ? 'Disable music access' : 'Enable music access'}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 flex items-center justify-center ${
                  isMusicEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isMusicEnabled ? (
                  <Music className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                )}
              </span>
            </button>
          </div>

          {/* 3 Key Metrics Row */}
          <div className="mt-4 flex items-center gap-3 text-sm">
            {/* Metric 1: Time Today with Late Night indicator */}
            <div className="flex items-center gap-1.5 text-gray-600">
              <span className="text-base">🕒</span>
              <span className="font-medium">{formatTime(timeToday)}</span>
              {hasLateNightActivity && isMusicEnabled && (
                <Moon className="w-3.5 h-3.5 text-orange-500" title="Late night activity" />
              )}
            </div>

            <span className="text-gray-300">•</span>

            {/* Metric 2: Safety Status */}
            <div className={`flex items-center gap-1.5 ${blockedCount > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              <span className="text-base">{blockedCount > 0 ? '🛑' : '🛡️'}</span>
              <span>{blockedCount > 0 ? `${blockedCount} Blocked` : 'Safe'}</span>
            </div>

            <span className="text-gray-300">•</span>

            {/* Metric 3: Now Playing or Last Active */}
            <div className="flex items-center gap-1.5 text-gray-600 min-w-0 flex-1">
              {isListening && nowPlaying ? (
                <>
                  <span className="text-base flex-shrink-0">▶️</span>
                  <span className="truncate text-green-600 font-medium">{nowPlaying.songName}</span>
                </>
              ) : (
                <span className="truncate text-gray-500">
                  {kid.lastActive || lastSong?.playedAt
                    ? `Active ${getRelativeTime(kid.lastActive || lastSong?.playedAt)}`
                    : 'No activity'}
                </span>
              )}
            </div>

            {/* Expand/Collapse Chevron */}
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Expanded Details Section - Smart Accordion */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">

            {/* SECTION 1: Safety Alert (Conditional - Shows FIRST if blocked) */}
            {blockedCount > 0 && blockedEvents.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    Blocked Activity
                  </span>
                </div>
                <div className="space-y-1.5">
                  {blockedEvents.slice(0, 3).map((event, index) => (
                    <div key={event._id || index} className="flex items-center justify-between text-sm">
                      <span className="text-red-700">
                        🛑 Search for "<span className="font-medium">{event.searchQuery}</span>"
                      </span>
                      <span className="text-red-400 text-xs flex-shrink-0">
                        {getRelativeTime(event.searchedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: Quick Stats Row */}
            {(totalPlays > 0 || topArtists.length > 0) && (
              <div className="flex items-center gap-4 py-2 px-3 bg-purple-50/50 rounded-xl">
                {totalPlays > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{totalPlays}</div>
                    <div className="text-xs text-gray-500">plays</div>
                  </div>
                )}
                {topArtists.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">Top Artists</div>
                    <div className="flex flex-wrap gap-1">
                      {topArtists.map((artist, index) => (
                        <span
                          key={artist.name || index}
                          className="px-2 py-0.5 bg-white text-purple-700 rounded-full text-xs font-medium border border-purple-100 truncate max-w-[120px]"
                        >
                          {artist.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: Recent History with Now Playing integrated */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Recent History
              </h4>
              <div className="space-y-1">
                {/* Now Playing / Last Played - Highlighted Row */}
                {nowPlaying && (
                  <div className={`flex items-center gap-3 p-2 rounded-lg ${
                    isListening
                      ? 'bg-green-50 border border-green-100'
                      : 'bg-gray-50'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isListening && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            LIVE
                          </span>
                        )}
                        <span className="font-semibold text-gray-900 truncate">{nowPlaying.songName}</span>
                      </div>
                      <span className="text-sm text-gray-500">{nowPlaying.artistName}</span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {isListening ? 'now' : getRelativeTime(nowPlaying.playedAt)}
                    </span>
                  </div>
                )}

                {/* Previous Plays */}
                {recentPlays.map((play, index) => (
                  <div key={play._id || index} className="flex items-center gap-3 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{play.itemName}</p>
                      <p className="text-sm text-gray-500 truncate">{play.artistName}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {getRelativeTime(play.playedAt)}
                    </span>
                  </div>
                ))}

                {/* Empty state if no activity */}
                {!nowPlaying && recentPlays.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Music className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                    <p className="text-sm">No listening history yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: Quick Admin Action */}
            <button
              onClick={handleManageProfile}
              className="w-full mt-2 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Manage Profile & Limits
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Activity Feed Item with emoji icons and late night indicator
function ActivityItem({ activity }) {
  const getEmoji = () => {
    switch (activity.type) {
      case 'played': return '🎵';
      case 'blocked': return '🛑';
      case 'request': return '📩';
      default: return '📋';
    }
  };

  const getLabel = () => {
    switch (activity.type) {
      case 'played': return 'Played';
      case 'blocked': return 'Blocked';
      case 'request': return 'Request';
      default: return 'Activity';
    }
  };

  const getTextColor = () => {
    switch (activity.type) {
      case 'blocked': return 'text-red-700';
      case 'request': return 'text-blue-700';
      default: return 'text-gray-900';
    }
  };

  const getBadgeStyle = () => {
    switch (activity.type) {
      case 'blocked': return 'bg-red-100 text-red-700';
      case 'request': return 'bg-blue-100 text-blue-700';
      default: return 'bg-purple-100 text-purple-700';
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition">
      {/* Emoji Icon */}
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
        {getEmoji()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getBadgeStyle()}`}>
            {getLabel()}
          </span>
          <span className={`text-sm font-medium ${getTextColor()} truncate`}>
            {activity.content}
          </span>
          {activity.isLateNight && (
            <Moon className="w-4 h-4 text-orange-500 flex-shrink-0" />
          )}
        </div>
        {activity.subtitle && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{activity.subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`w-2 h-2 rounded-full ${getColorClass(activity.kidColor)}`} />
          <span className="text-xs text-gray-500">{activity.kidName}</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-400 flex-shrink-0">
        {getRelativeTime(activity.timestamp)}
      </div>
    </div>
  );
}

// Floating Action Bar
function FloatingActionBar({ onAddMusic }) {
  return (
    <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-40 pointer-events-none">
      <div className="max-w-md mx-auto">
        <button
          onClick={onAddMusic}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl px-6 py-4 flex items-center justify-center gap-2 font-semibold transition shadow-xl shadow-purple-300/50 pointer-events-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add Music</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ParentDashboardHome({ user, onNavigateToTab }) {
  const { showToast } = useToast();
  const [dismissedAlert, setDismissedAlert] = useState(false);

  // Mutation to pause/unpause music for a kid
  const setMusicPaused = useMutation(api.kidProfiles.setMusicPaused);

  // Convex Queries - Real data
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const fullUser = useQuery(api.users.getUser,
    user ? { userId: user._id } : 'skip'
  );

  const pendingRequests = useQuery(api.albumRequests.getPendingRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const pendingSongRequests = useQuery(api.songRequests.getPendingSongRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const unreadBlockedSearchesCount = useQuery(api.blockedSearches.getUnreadBlockedSearchesCount,
    user ? { userId: user._id } : 'skip'
  ) || 0;

  const blockedSearches = useQuery(api.blockedSearches.getBlockedSearches,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Calculate totals
  const pendingCount = pendingRequests.length + pendingSongRequests.length + unreadBlockedSearchesCount;
  const familyCode = fullUser?.familyCode;
  const parentName = user?.name?.split(' ')[0] || 'Parent';

  // Build kids list from real data
  const kids = kidProfiles.map(kid => {
    const kidBlockedSearches = blockedSearches.filter(s => s.kidProfileId === kid._id);
    return {
      ...kid,
      isPaused: kid.musicPaused || false,
      blockedCount: kidBlockedSearches.length,
      blockedEvents: kidBlockedSearches.map(s => ({
        _id: s._id,
        searchQuery: s.searchQuery,
        searchedAt: s.searchedAt,
      })),
    };
  });

  // Build activity feed
  const buildActivityFeed = () => {
    const activities = [];

    // Add blocked searches
    blockedSearches.slice(0, 3).forEach((search) => {
      activities.push({
        id: `blocked-${search._id}`,
        type: 'blocked',
        kidName: search.kidName,
        kidColor: kids.find(k => k._id === search.kidProfileId)?.color || 'gray',
        content: `"${search.searchQuery}"`,
        timestamp: new Date(search.searchedAt),
        isLateNight: isLateNightTime(search.searchedAt),
      });
    });

    // Add pending album requests
    pendingRequests.slice(0, 2).forEach((req) => {
      const hasArtist = req.artistName && req.artistName.trim();
      activities.push({
        id: `album-request-${req._id}`,
        type: 'request',
        kidName: kids.find(k => k._id === req.kidProfileId)?.name || 'Unknown',
        kidColor: kids.find(k => k._id === req.kidProfileId)?.color || 'gray',
        content: hasArtist ? req.artistName : req.albumName,
        subtitle: hasArtist ? req.albumName : null,
        timestamp: new Date(req.requestedAt || Date.now()),
        isLateNight: isLateNightTime(req.requestedAt),
      });
    });

    // Add pending song requests
    pendingSongRequests.slice(0, 2).forEach((req) => {
      const hasArtist = req.artistName && req.artistName.trim();
      activities.push({
        id: `song-request-${req._id}`,
        type: 'request',
        kidName: kids.find(k => k._id === req.kidProfileId)?.name || 'Unknown',
        kidColor: kids.find(k => k._id === req.kidProfileId)?.color || 'gray',
        content: hasArtist ? req.artistName : req.songName,
        subtitle: hasArtist ? req.songName : null,
        timestamp: new Date(req.requestedAt || Date.now()),
        isLateNight: isLateNightTime(req.requestedAt),
      });
    });

    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  const activityFeed = buildActivityFeed();

  // Handlers
  const handlePauseToggle = async (kidId, isPaused) => {
    try {
      await setMusicPaused({ profileId: kidId, paused: isPaused });
      showToast(
        isPaused ? 'Music access paused' : 'Music access restored',
        isPaused ? 'info' : 'success'
      );
    } catch (error) {
      console.error('Failed to toggle music access:', error);
      showToast('Failed to update music access', 'error');
    }
  };

  const handleNavigateToRequests = () => {
    onNavigateToTab?.('requests');
  };

  const handleAddMusic = () => {
    onNavigateToTab?.('add');
  };

  const handleManageKidProfile = (kidId) => {
    // Navigate to settings tab, kid profiles section
    onNavigateToTab?.('settings', { settingsSection: 'kids' });
  };

  const handleCopyFamilyCode = async () => {
    if (!familyCode) return;
    try {
      await navigator.clipboard.writeText(familyCode);
      showToast('Copied! Go to getsafetunes.com/play on your kid\'s device and enter this code.', 'success');
    } catch (err) {
      showToast(`Code: ${familyCode} — enter at getsafetunes.com/play`, 'info');
    }
  };

  // Loading state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* ================================================================== */}
      {/* SECTION 1: Header */}
      {/* ================================================================== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {getGreeting()}, {parentName}
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your family's music</p>
        </div>

        {/* Family Code - Top Right Corner with Helper */}
        {familyCode && (
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <button
              onClick={handleCopyFamilyCode}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 border border-purple-200 rounded-lg transition group"
              title="Copy family code - share with your kids"
            >
              <span className="text-sm font-mono font-bold text-purple-700">{familyCode}</span>
              <Copy className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
            </button>
            <span className="text-xs text-gray-500">Your kid's login code</span>
          </div>
        )}
      </div>

      {/* Alert Banner - Pending Requests */}
      {pendingCount > 0 && !dismissedAlert && (
        <AlertBanner
          count={pendingCount}
          onDismiss={() => setDismissedAlert(true)}
          onNavigate={handleNavigateToRequests}
        />
      )}

      {/* ================================================================== */}
      {/* SECTION 2: Supercharged Kid Cards */}
      {/* ================================================================== */}
      {kids.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Your Kids
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {kids.map((kid) => (
              <KidCard
                key={kid._id}
                kid={kid}
                onPauseToggle={handlePauseToggle}
                onManageProfile={handleManageKidProfile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State - No Kids */}
      {kids.length === 0 && kidProfiles.length === 0 && (
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Add Your First Kid</h2>
              <p className="text-white/80 text-sm">Create a profile for each child to start managing their music</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab?.('settings')}
            className="w-full bg-white/20 hover:bg-white/30 rounded-xl p-4 flex items-center justify-between transition group"
          >
            <span className="font-medium">Create Kid Profile</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 3: Live Activity Feed */}
      {/* ================================================================== */}
      {activityFeed.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Live Family Activity
            </h2>
          </div>

          <div className="divide-y divide-gray-50 px-2">
            {activityFeed.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SECTION 4: Floating Action Bar */}
      {/* ================================================================== */}
      <FloatingActionBar onAddMusic={handleAddMusic} />
    </div>
  );
}
