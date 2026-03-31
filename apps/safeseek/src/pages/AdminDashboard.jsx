import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import TimeLimits from '../components/admin/TimeLimits';
import KidProfileEditor from '../components/admin/KidProfileEditor';
// KidProfileCustomize merged into KidProfileEditor
import OnboardingWizard from '../components/admin/OnboardingWizard';
import Toast from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  Search, History, Users, Clock, Settings, LogOut, Shield,
  AlertTriangle, ExternalLink, Copy, Check, Plus, Pencil, Trash2,
  Home, Activity, UserCog, Mail, ChevronRight, Filter,
  Image, MessageSquare, ShieldAlert, CheckCircle2, Eye, EyeOff,
  MessageCircle, X,
} from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'requests', label: 'Requests', icon: MessageSquare },
  { id: 'profiles', label: 'Kid Profiles', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Color utility - maps color names to Tailwind classes
const COLOR_MAP = {
  red: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600' },
  yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600' },
  green: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
  pink: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-600' },
  teal: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600' },
  gray: { bg: 'bg-gray-400', light: 'bg-gray-50', text: 'text-gray-600' },
};

function getColor(colorName) {
  return COLOR_MAP[colorName] || COLOR_MAP.blue;
}

function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isToday(ts) {
  const date = new Date(ts);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

// --- Kid Avatar Component ---
function KidAvatar({ name, color, size = 'md' }) {
  const initial = (name || '?')[0].toUpperCase();
  const c = getColor(color);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-14 h-14 text-2xl',
  };

  return (
    <div className={`${sizeClasses[size]} ${c.bg} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initial}
    </div>
  );
}

// --- Home Tab ---
function HomeTab({ userData, kidProfiles, searchHistory, blockedSearches, onNavigate, onShowBlocked, onCopyCode, codeCopied }) {
  const todaySearches = useMemo(() => {
    if (!searchHistory) return [];
    return searchHistory.filter((s) => isToday(s.searchedAt));
  }, [searchHistory]);

  const todayBlocked = useMemo(() => {
    if (!blockedSearches) return [];
    return blockedSearches.filter((b) => isToday(b.searchedAt));
  }, [blockedSearches]);

  const hasProfiles = kidProfiles && kidProfiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back{userData?.name ? `, ${userData.name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-gray-500 mt-1">
          Here is an overview of your family's search activity.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('activity')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Searches Today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{todaySearches.length}</p>
        </button>

        <button
          onClick={() => { onNavigate('activity'); onShowBlocked?.(); }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-red-200 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Blocked Today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{todayBlocked.length}</p>
        </button>

        <button
          onClick={() => onNavigate('profiles')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left col-span-2 sm:col-span-1 hover:border-cyan-200 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-cyan-50 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-sm text-gray-500">Kid Profiles</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{kidProfiles?.length || 0}</p>
        </button>
      </div>

      {/* Family Code Card */}
      {userData?.familyCode && (
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-white/80" />
                <span className="text-sm font-medium text-white/80">Family Code</span>
              </div>
              <p className="text-2xl font-mono font-bold tracking-wider">{userData.familyCode}</p>
              <p className="text-xs text-white/60 mt-1">Share this code so your kids can access SafeStudy</p>
            </div>
            <button
              onClick={onCopyCode}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-xl transition"
              title="Copy code"
            >
              {codeCopied ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Copy className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Kid Profile Cards */}
      {hasProfiles ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Your Kids</h3>
            <button
              onClick={() => onNavigate('profiles')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Manage
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kidProfiles.map((profile) => {
              const profileSearches = searchHistory
                ? searchHistory.filter((s) => s.kidName === profile.name && isToday(s.searchedAt))
                : [];
              const lastSearch = searchHistory
                ? searchHistory.find((s) => s.kidName === profile.name)
                : null;

              return (
                <div
                  key={profile._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <KidAvatar name={profile.name} color={profile.color} size="lg" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{profile.name}</h4>
                      <p className="text-xs text-gray-500">
                        {profile.ageRange?.min === profile.ageRange?.max
                          ? `Age ${profile.ageRange?.min || 4}`
                          : `Ages ${profile.ageRange?.min || 4}\u2013${profile.ageRange?.max || 18}`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Searches today</span>
                      <span className="font-semibold text-gray-900">{profileSearches.length}</span>
                    </div>
                    {lastSearch && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 truncate mr-2">Last search</span>
                        <span className="text-gray-700 truncate max-w-[140px] text-right font-medium" title={lastSearch.query}>
                          {lastSearch.query} <span className="text-gray-400 font-normal">&middot; {formatTimestamp(lastSearch.searchedAt)}</span>
                        </span>
                      </div>
                    )}
                    {!lastSearch && (
                      <p className="text-xs text-gray-400 italic">No searches yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Getting Started Checklist */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Getting Started</h3>
              <p className="text-sm text-gray-500 mb-4">
                Set up SafeStudy in just a few steps.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600 line-through">Create your account</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">2</span>
                  </div>
                  <span className="text-sm text-gray-900 font-medium">Create a kid profile</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">3</span>
                  </div>
                  <span className="text-sm text-gray-600">Share your family code with your kids</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">4</span>
                  </div>
                  <span className="text-sm text-gray-600">Your kids search safely!</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('profiles')}
                className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create First Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Preview */}
      {searchHistory && searchHistory.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <button
              onClick={() => onNavigate('activity')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {searchHistory.slice(0, 5).map((entry) => (
              <div key={entry._id} className="px-4 py-3 flex items-center gap-3">
                <KidAvatar name={entry.kidName} color={entry.kidColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{entry.kidName}</span>
                    {entry.flagged && (
                      <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{entry.query}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  {formatTimestamp(entry.searchedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Activity Tab ---
function ActivityTab({ searchHistory, blockedSearches, kidProfiles, initialShowBlocked, pendingRequests, onApproveRequest, onDenyRequest }) {
  const [filterKid, setFilterKid] = useState('all');
  const [showBlocked, setShowBlocked] = useState(initialShowBlocked || false);
  const [activityFilter, setActivityFilter] = useState('');
  const [activityDateFilter, setActivityDateFilter] = useState('all');
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [talkTooltipId, setTalkTooltipId] = useState(null);
  const updateProfile = useMutation(api.kidProfiles.updateProfile);

  const handleAllowTopic = async (entry) => {
    const profile = kidProfiles?.find((p) => p._id === entry.kidProfileId);
    if (!profile) return;
    const currentAllowed = profile.allowedTopics || [];
    if (currentAllowed.includes(entry.query.toLowerCase())) return;
    await updateProfile({
      kidProfileId: entry.kidProfileId,
      allowedTopics: [...currentAllowed, entry.query.toLowerCase()],
    });
    setDismissedIds((prev) => new Set([...prev, entry._id]));
  };

  const handleDismiss = (entryId) => {
    setDismissedIds((prev) => new Set([...prev, entryId]));
  };

  const filteredHistory = useMemo(() => {
    if (!searchHistory) return [];
    let result = searchHistory;
    if (filterKid !== 'all') {
      const profile = kidProfiles?.find((p) => p._id === filterKid);
      if (profile) result = result.filter((s) => s.kidName === profile.name);
    }
    if (activityFilter.trim()) {
      const q = activityFilter.trim().toLowerCase();
      result = result.filter((s) => s.query?.toLowerCase().includes(q));
    }
    if (activityDateFilter === 'today') {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      result = result.filter((s) => s.searchedAt >= cutoff);
    } else if (activityDateFilter === 'week') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((s) => s.searchedAt >= cutoff);
    }
    return result;
  }, [searchHistory, filterKid, kidProfiles, activityFilter, activityDateFilter]);

  const filteredBlocked = useMemo(() => {
    if (!blockedSearches) return [];
    let result = blockedSearches;
    if (filterKid !== 'all') {
      const profile = kidProfiles?.find((p) => p._id === filterKid);
      if (profile) result = result.filter((b) => b.kidName === profile.name);
    }
    if (activityFilter.trim()) {
      const q = activityFilter.trim().toLowerCase();
      result = result.filter((b) => b.query?.toLowerCase().includes(q));
    }
    if (activityDateFilter === 'today') {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      result = result.filter((b) => b.searchedAt >= cutoff);
    } else if (activityDateFilter === 'week') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((b) => b.searchedAt >= cutoff);
    }
    result = result.filter((b) => !dismissedIds.has(b._id));
    return result;
  }, [blockedSearches, filterKid, kidProfiles, activityFilter, activityDateFilter, dismissedIds]);

  const rawDisplayData = showBlocked ? filteredBlocked : filteredHistory;

  // Collapse consecutive identical queries into one entry with a count
  const displayData = useMemo(() => {
    if (!rawDisplayData || rawDisplayData.length === 0) return [];
    const result = [];
    for (let i = 0; i < rawDisplayData.length; i++) {
      const entry = rawDisplayData[i];
      const prev = result[result.length - 1];
      if (prev && prev.query === entry.query && prev.kidName === entry.kidName) {
        prev._consecutiveCount = (prev._consecutiveCount || 1) + 1;
      } else {
        result.push({ ...entry, _consecutiveCount: 1 });
      }
    }
    return result;
  }, [rawDisplayData]);

  return (
    <div className="space-y-4">
      {/* Pending Topic Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">
              Topic Requests
              <span className="ml-2 bg-red-500 text-white text-[10px] w-5 h-5 inline-flex items-center justify-center rounded-full font-semibold align-middle">
                {pendingRequests.length}
              </span>
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Your kids are asking permission to search these topics.
          </p>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req._id} className="bg-white rounded-xl border border-amber-100 px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{req.kidName || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(req.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 font-medium">&ldquo;{req.query}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{req.reason}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onApproveRequest(req._id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
                  >
                    <Check className="w-3 h-3" />
                    Approve
                  </button>
                  <button
                    onClick={() => onDenyRequest(req._id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
                  >
                    <X className="w-3 h-3" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {showBlocked ? 'Blocked Searches' : 'Search History'}
          </h2>
          <p className="text-sm text-gray-500">
            {displayData.length} {showBlocked ? 'blocked searches' : 'searches'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle blocked */}
          <button
            onClick={() => setShowBlocked(!showBlocked)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              showBlocked
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {showBlocked ? 'Blocked' : 'Show Blocked'}
            {blockedSearches && blockedSearches.length > 0 && !showBlocked && (
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-semibold">
                {blockedSearches.length > 99 ? '99+' : blockedSearches.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            placeholder="Filter searches..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          {kidProfiles && kidProfiles.length > 1 && (
            <select
              value={filterKid}
              onChange={(e) => setFilterKid(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="all">All Kids</option>
              {kidProfiles.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'all', label: 'All Time' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActivityDateFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activityDateFilter === opt.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search entries */}
      {!displayData || displayData.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {showBlocked ? (
            <>
              <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No blocked searches</h3>
              <p className="text-gray-500">
                No inappropriate search attempts have been detected.
              </p>
            </>
          ) : (
            <>
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No searches yet</h3>
              <p className="text-gray-500">
                When your kids search, their queries will appear here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {displayData.map((entry) => (
            <div
              key={entry._id}
              className={`px-5 py-4 flex items-start gap-4 transition ${
                showBlocked
                  ? 'bg-red-50/50 border-l-4 border-l-red-400'
                  : entry.flagged
                    ? 'bg-amber-50/50 border-l-4 border-l-amber-400'
                    : 'hover:bg-gray-50/50'
              }`}
            >
              <KidAvatar name={entry.kidName} color={entry.kidColor} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{entry.kidName || 'Unknown'}</span>
                  {entry.flagged && !showBlocked && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Flagged
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${
                  showBlocked ? 'text-red-700 font-medium' : entry.flagged ? 'text-amber-800 font-medium' : 'text-gray-700'
                }`}>
                  {entry.query}
                  {entry._consecutiveCount > 1 && (
                    <span className="ml-1.5 inline-flex items-center bg-gray-100 text-gray-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {entry._consecutiveCount}x
                    </span>
                  )}
                </p>
                {showBlocked && entry.blockedReason && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {entry.blockedReason}
                  </p>
                )}
                {showBlocked && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button
                      onClick={() => handleAllowTopic(entry)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
                    >
                      <Check className="w-3 h-3" />
                      Allow this topic
                    </button>
                    <button
                      onClick={() => handleDismiss(entry._id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                    >
                      <X className="w-3 h-3" />
                      Dismiss
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setTalkTooltipId(talkTooltipId === entry._id ? null : entry._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Talk to them
                      </button>
                      {talkTooltipId === entry._id && (
                        <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg w-56">
                          Have a conversation with your child about why they searched for this.
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!showBlocked && entry.flagReason && (
                  <p className="text-xs text-amber-600 mt-1">{entry.flagReason}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                {formatTimestamp(entry.searchedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Profiles Tab ---
function ProfilesTab({ kidProfiles, userData, showEditor, setShowEditor, editingProfile, setEditingProfile, onDeleteProfile, showToast }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Kid Profiles</h2>
        <button
          onClick={() => {
            setEditingProfile(null);
            setShowEditor(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Profile
        </button>
      </div>

      {!kidProfiles || kidProfiles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No profiles yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create a profile for each of your kids to customize their search experience.
          </p>
          <button
            onClick={() => {
              setEditingProfile(null);
              setShowEditor(true);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Profile
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kidProfiles.map((profile) => {
            const strictnessLabels = {
              strict: { label: 'Strict', color: 'bg-red-100 text-red-700' },
              moderate: { label: 'Moderate', color: 'bg-amber-100 text-amber-700' },
              light: { label: 'Light', color: 'bg-green-100 text-green-700' },
            };
            const strictness = strictnessLabels[profile.contentStrictness] || strictnessLabels.moderate;

            return (
              <div
                key={profile._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <KidAvatar name={profile.name} color={profile.color} size="lg" />
                    <div>
                      <h3 className="font-bold text-gray-900">{profile.name}</h3>
                      <p className="text-xs text-gray-500">
                        {profile.ageRange?.min === profile.ageRange?.max
                          ? `Age ${profile.ageRange?.min || 4}`
                          : `Ages ${profile.ageRange?.min || 4}\u2013${profile.ageRange?.max || 18}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingProfile(profile);
                        setShowEditor(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit profile"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteProfile(profile._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Profile details */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Strictness</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${strictness.color}`}>
                      {strictness.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Blocked topics</span>
                    <span className="text-xs font-medium text-gray-700">
                      {profile.blockedTopics?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Image search</span>
                    <span className="text-xs font-medium">
                      {profile.allowImageSearch ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Eye className="w-3 h-3" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <EyeOff className="w-3 h-3" />
                          Disabled
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Blocked topics */}
                {profile.blockedTopics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                    {profile.blockedTopics.slice(0, 4).map((topic) => (
                      <span
                        key={topic}
                        className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                    {profile.blockedTopics.length > 4 && (
                      <span className="text-gray-400 text-[10px] px-1 py-0.5">
                        +{profile.blockedTopics.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Customize button */}
                <button
                  onClick={() => { setEditingProfile(profile); setShowEditor(true); }}
                  className="w-full mt-3 pt-3 border-t border-gray-100 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 py-2 hover:bg-blue-50 rounded-lg transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Customize search settings
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Editor Modal */}
      {showEditor && (
        <KidProfileEditor
          profile={editingProfile}
          userId={userData?._id}
          onClose={() => {
            setShowEditor(false);
            setEditingProfile(null);
          }}
          onSave={() => {
            setShowEditor(false);
            setEditingProfile(null);
            showToast(editingProfile ? 'Profile updated!' : 'Profile created!');
          }}
        />
      )}

    </div>
  );
}

// --- Settings Tab ---
function SettingsTab({ user, userData, onLogout, onCopyCode, codeCopied, onNavigate }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-gray-400" />
          Account
        </h3>
        <div className="space-y-1 divide-y divide-gray-50">
          <div className="flex justify-between items-center py-3">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{user?.name || userData?.name || 'Not set'}</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100">
          <a
            href="https://getsafefamily.com/forgot-password"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Change Password
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Subscription
        </h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-medium text-gray-900">
              {userData?.subscriptionStatus === 'lifetime'
                ? 'Lifetime Access'
                : userData?.subscriptionStatus === 'active'
                  ? 'Premium'
                  : 'Free Trial'}
            </p>
            <p className="text-sm text-gray-500">SafeStudy</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              userData?.subscriptionStatus === 'lifetime' || userData?.subscriptionStatus === 'active'
                ? 'bg-green-100 text-green-700'
                : userData?.subscriptionStatus === 'trial'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {(userData?.subscriptionStatus || 'trial').toUpperCase()}
          </span>
        </div>
        {userData?.subscriptionStatus === 'lifetime' ? (
          <p className="text-sm text-gray-500">Lifetime access — no billing.</p>
        ) : userData?.subscriptionStatus === 'trial' ? (
          <div className="space-y-2">
            {userData?.trialEndsAt && (
              <p className="text-sm text-gray-500">
                Trial ends {new Date(userData.trialEndsAt).toLocaleDateString()}
              </p>
            )}
            <a
              href="https://getsafefamily.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Upgrade to Premium
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <a
            href="mailto:jeremiah@getsafefamily.com?subject=SafeStudy%20Subscription"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Mail className="w-3.5 h-3.5" />
            Manage Subscription
          </a>
        )}
      </div>

      {/* Family Code */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Family Code
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Share this code with your kids so they can access SafeStudy on their own devices. Each kid selects their profile after entering the code.
        </p>
        {userData?.familyCode ? (
          <div className="flex items-center gap-3">
            <code className="bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-xl text-lg font-mono font-bold text-gray-900 tracking-wider">
              {userData.familyCode}
            </code>
            <button
              onClick={onCopyCode}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition"
            >
              {codeCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No family code generated yet.</p>
        )}
      </div>

      {/* Time Limits */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          Time Limits
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Set daily search limits and allowed hours for each kid profile.
        </p>
        {userData?._id && (
          <TimeLimits userId={userData._id} />
        )}
      </div>

      {/* Help & Support */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-400" />
          Help & Support
        </h3>
        <div className="space-y-3">
          <a
            href="/#faq"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ChevronRight className="w-4 h-4" />
            FAQ
          </a>
          <a
            href="mailto:jeremiah@getsafefamily.com"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Mail className="w-4 h-4" />
            Email Support
          </a>
          <a
            href="mailto:safety@getsafefamily.com"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ShieldAlert className="w-4 h-4" />
            Report a Safety Issue
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-4">We typically respond within 24 hours</p>
      </div>

      {/* Sign Out */}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm px-1 py-2"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-6">
        <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Danger Zone
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
        >
          Delete my account and all data
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Delete Account?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              This action is <span className="font-semibold">irreversible</span>. All your data, kid profiles, search history, and settings will be permanently deleted.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              To delete your account, please contact{' '}
              <a href="mailto:jeremiah@getsafefamily.com" className="text-blue-600 hover:text-blue-700 font-medium">
                jeremiah@getsafefamily.com
              </a>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Requests Tab ---
function RequestsTab({ allRequests, pendingRequests, onApprove, onDeny }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Topic Requests</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">When your kids search for a blocked topic, they can request permission.</p>
      </div>

      {pendingRequests && pendingRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            Needs your attention ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req._id} className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{req.kidName || 'Unknown'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">Wants to search: <strong>"{req.query}"</strong></p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => onApprove(req._id)} className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition">Approve</button>
                    <button onClick={() => onDeny(req._id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition">Deny</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">All Requests</h3>
        {allRequests && allRequests.length > 0 ? (
          <div className="space-y-2">
            {allRequests.map((req) => (
              <div key={req._id} className={`bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 flex items-center gap-3 ${
                req.status === 'approved' ? 'border-green-200' : req.status === 'denied' ? 'border-red-200' : 'border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  req.status === 'approved' ? 'bg-green-500' : req.status === 'denied' ? 'bg-red-500' : 'bg-orange-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    <span className="font-medium">{req.kidName}</span>: "{req.query}"
                  </p>
                </div>
                <span className={`text-xs font-medium ${
                  req.status === 'approved' ? 'text-green-600' : req.status === 'denied' ? 'text-red-500' : 'text-orange-500'
                }`}>
                  {req.status === 'approved' ? 'Approved' : req.status === 'denied' ? 'Denied' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-gray-400">No requests yet. When your kids try to search for blocked topics, their requests will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// Main AdminDashboard Component
// =============================================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activityShowBlocked, setActivityShowBlocked] = useState(false);

  // Reset blocked filter flag when leaving activity tab
  useEffect(() => {
    if (activeTab !== 'activity') setActivityShowBlocked(false);
  }, [activeTab]);

  // Convex mutations
  const deleteProfileMutation = useMutation(api.kidProfiles.deleteProfile);
  const approveRequestMutation = useMutation(api.topicRequests.approveRequest);
  const denyRequestMutation = useMutation(api.topicRequests.denyRequest);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Convex queries
  const userData = useQuery(
    api.users.getUser,
    user?.email ? { email: user.email } : 'skip'
  );

  const kidProfiles = useQuery(
    api.kidProfiles.getProfiles,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  const searchHistory = useQuery(
    api.searchQueries.getAllSearchHistory,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  const blockedSearches = useQuery(
    api.searchQueries.getBlockedSearches,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  const pendingRequestCount = useQuery(
    api.topicRequests.getPendingCount,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  const pendingRequests = useQuery(
    api.topicRequests.getPendingRequests,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  const allRequests = useQuery(
    api.topicRequests.getAllRequests,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const copyFamilyCode = () => {
    if (userData?.familyCode) {
      navigator.clipboard.writeText(userData.familyCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleDeleteProfile = (profileId) => {
    setConfirmDelete(profileId);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <Search className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <Search className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding wizard for first-time users
  const showOnboarding = kidProfiles && kidProfiles.length === 0
    && !localStorage.getItem('safestudy_onboarding_complete');

  if (showOnboarding) {
    return (
      <OnboardingWizard
        userId={userData._id}
        familyCode={userData.familyCode}
        onComplete={(action) => {
          localStorage.setItem('safestudy_onboarding_complete', 'true');
          if (action === 'trySearch') {
            navigate(`/search/${userData.familyCode}`);
          } else if (action === 'addKid') {
            setShowEditor(true);
          }
          // 'dashboard' just falls through to normal render
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                <Search className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-sm sm:text-base">SafeStudy</h1>
                <p className="text-[11px] text-gray-500 leading-tight">Parent Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Family Code - Desktop */}
              {userData?.familyCode && (
                <button
                  onClick={copyFamilyCode}
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-3.5 py-2 rounded-lg text-sm transition group"
                  title="Click to copy"
                >
                  <Shield className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white/80 text-xs">Code:</span>
                  <span className="font-mono font-bold tracking-wider text-sm">{userData.familyCode}</span>
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition" />
                  )}
                </button>
              )}

              {/* User name - Desktop */}
              <span className="hidden md:block text-sm text-gray-600">
                {user?.name || userData?.name || user?.email}
              </span>

              {/* Logout - Desktop */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              {/* Hamburger - Mobile */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex gap-1 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {tab.label}
                  {tab.id === 'requests' && pendingRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-semibold">
                      {pendingRequestCount > 99 ? '99+' : pendingRequestCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setShowMobileMenu(false)}>
          <div
            className="absolute top-14 right-4 bg-white rounded-xl shadow-xl py-2 min-w-[220px] border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Family Code */}
            {userData?.familyCode && (
              <button
                onClick={() => {
                  copyFamilyCode();
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition"
              >
                <p className="text-xs text-gray-500">Family Code (tap to copy)</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="font-mono font-bold text-blue-600 tracking-wider">{userData.familyCode}</p>
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>
            )}

            {/* User Info */}
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user?.name || userData?.name || 'Parent'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>

            {/* Settings link */}
            <button
              onClick={() => {
                setActiveTab('settings');
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center gap-3 text-gray-700"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                handleLogout();
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center gap-3 text-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-5 safe-area-inset-bottom">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
                  isActive ? 'bg-blue-50' : ''
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] ${isActive ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                  {tab.label === 'Kid Profiles' ? 'Profiles' : tab.label}
                </span>
                {tab.id === 'requests' && pendingRequestCount > 0 && (
                  <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-semibold">
                    {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <HomeTab
            userData={userData}
            kidProfiles={kidProfiles}
            searchHistory={searchHistory}
            blockedSearches={blockedSearches}
            onNavigate={setActiveTab}
            onShowBlocked={() => setActivityShowBlocked(true)}
            onCopyCode={copyFamilyCode}
            codeCopied={copiedCode}
          />
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <ActivityTab
            searchHistory={searchHistory}
            blockedSearches={blockedSearches}
            kidProfiles={kidProfiles}
            initialShowBlocked={activityShowBlocked}
            pendingRequests={pendingRequests}
            onApproveRequest={async (requestId) => {
              await approveRequestMutation({ requestId });
              showToast('Topic approved! Your child can now search this.');
            }}
            onDenyRequest={async (requestId) => {
              await denyRequestMutation({ requestId });
              showToast('Request denied.', 'info');
            }}
          />
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <RequestsTab
            allRequests={allRequests}
            pendingRequests={pendingRequests}
            onApprove={async (id) => {
              await approveRequestMutation({ requestId: id });
              showToast('Topic approved! They can now search for this.');
            }}
            onDeny={async (id) => {
              await denyRequestMutation({ requestId: id });
              showToast('Request denied.', 'info');
            }}
          />
        )}

        {/* Profiles Tab */}
        {activeTab === 'profiles' && (
          <ProfilesTab
            kidProfiles={kidProfiles}
            userData={userData}
            showEditor={showEditor}
            setShowEditor={setShowEditor}
            editingProfile={editingProfile}
            setEditingProfile={setEditingProfile}
            onDeleteProfile={handleDeleteProfile}
            showToast={showToast}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            userData={userData}
            onLogout={handleLogout}
            onCopyCode={copyFamilyCode}
            codeCopied={copiedCode}
            onNavigate={setActiveTab}
          />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Profile"
          message="Are you sure you want to delete this profile? All search history and settings for this kid will be permanently removed."
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={async () => {
            try {
              await deleteProfileMutation({ kidProfileId: confirmDelete });
              setConfirmDelete(null);
              showToast('Profile deleted', 'success');
            } catch (err) {
              setConfirmDelete(null);
              showToast('Failed to delete profile', 'error');
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
