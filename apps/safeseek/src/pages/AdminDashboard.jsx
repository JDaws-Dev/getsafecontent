import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import TimeLimits from '../components/admin/TimeLimits';
import KidProfileEditor from '../components/admin/KidProfileEditor';
import Toast from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  Search, History, Users, Clock, Settings, LogOut, Shield,
  AlertTriangle, ExternalLink, Copy, Check, Plus, Pencil, Trash2,
  Home, Activity, UserCog, Mail, ChevronRight, Filter,
  Image, MessageSquare, ShieldAlert, CheckCircle2, Eye, EyeOff,
} from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'activity', label: 'Activity', icon: Activity },
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
function HomeTab({ userData, kidProfiles, searchHistory, blockedSearches, onNavigate, onCopyCode, codeCopied }) {
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Searches Today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{todaySearches.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Blocked Today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{todayBlocked.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-cyan-50 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-sm text-gray-500">Kid Profiles</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{kidProfiles?.length || 0}</p>
        </div>
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
              <p className="text-xs text-white/60 mt-1">Share this code so your kids can access SafeSeek</p>
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
                        Ages {profile.ageRange?.min || 4}&ndash;{profile.ageRange?.max || 18}
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
                          {lastSearch.query}
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
                Set up SafeSeek in just a few steps.
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
function ActivityTab({ searchHistory, blockedSearches, kidProfiles }) {
  const [filterKid, setFilterKid] = useState('all');
  const [showBlocked, setShowBlocked] = useState(false);

  const filteredHistory = useMemo(() => {
    if (!searchHistory) return [];
    if (filterKid === 'all') return searchHistory;
    const profile = kidProfiles?.find((p) => p._id === filterKid);
    if (!profile) return searchHistory;
    return searchHistory.filter((s) => s.kidName === profile.name);
  }, [searchHistory, filterKid, kidProfiles]);

  const filteredBlocked = useMemo(() => {
    if (!blockedSearches) return [];
    if (filterKid === 'all') return blockedSearches;
    const profile = kidProfiles?.find((p) => p._id === filterKid);
    if (!profile) return blockedSearches;
    return blockedSearches.filter((b) => b.kidName === profile.name);
  }, [blockedSearches, filterKid, kidProfiles]);

  const displayData = showBlocked ? filteredBlocked : filteredHistory;

  return (
    <div className="space-y-4">
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
          {/* Kid filter */}
          {kidProfiles && kidProfiles.length > 1 && (
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterKid}
                onChange={(e) => setFilterKid(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="all">All kids</option>
                {kidProfiles.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

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
                </p>
                {showBlocked && entry.blockedReason && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {entry.blockedReason}
                  </p>
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
                        Ages {profile.ageRange?.min || 4}&ndash;{profile.ageRange?.max || 18}
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
            <p className="text-sm text-gray-500">SafeSeek</p>
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
        {userData?.stripeCustomerId ? (
          <a
            href="https://getsafefamily.com/account"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage Subscription
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <p className="text-sm text-gray-500">
            To manage or cancel, contact jeremiah@getsafefamily.com
          </p>
        )}
      </div>

      {/* Family Code */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Family Code
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Share this code with your kids so they can access SafeSeek on their own devices. Each kid selects their profile after entering the code.
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

      {/* Support */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-400" />
          Support
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Need help? Reach out and we will get back to you within 24 hours.
        </p>
        <a
          href="mailto:jeremiah@getsafefamily.com"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Mail className="w-4 h-4" />
          jeremiah@getsafefamily.com
        </a>
      </div>

      {/* Sign Out */}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm px-1 py-2"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
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

  // Convex mutations
  const deleteProfileMutation = useMutation(api.kidProfiles.deleteProfile);

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
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
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
                <h1 className="font-bold text-gray-900 text-sm sm:text-base">SafeSeek</h1>
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
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {tab.label}
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
        <div className="grid grid-cols-4 safe-area-inset-bottom">
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
