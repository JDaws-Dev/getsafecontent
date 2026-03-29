import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import TimeLimits from '../components/admin/TimeLimits';
import KidProfileEditor from '../components/admin/KidProfileEditor';
import Toast from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  Search, History, Users, Clock, Settings, LogOut, Shield,
  AlertTriangle, ExternalLink, Copy, Check, Plus, Pencil, Trash2
} from 'lucide-react';

const TABS = [
  { id: 'history', label: 'Search History', icon: History },
  { id: 'profiles', label: 'Kid Profiles', icon: Users },
  { id: 'limits', label: 'Time Limits', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('history');
  const [toast, setToast] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  const handleDeleteProfile = async (profileId) => {
    setConfirmDelete(profileId);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm sm:text-base">SafeSeek</h1>
              <p className="text-xs text-gray-500">Parent Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Family Code */}
            {userData?.familyCode && (
              <button
                onClick={copyFamilyCode}
                className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
              >
                <Shield className="w-4 h-4" />
                <span>Code: {userData.familyCode}</span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Family Code */}
      {userData?.familyCode && (
        <div className="sm:hidden px-4 pt-3">
          <button
            onClick={copyFamilyCode}
            className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Shield className="w-4 h-4" />
            <span>Family Code: {userData.familyCode}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Search History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Searches</h2>
              <p className="text-sm text-gray-500">
                {searchHistory?.length ?? 0} searches
              </p>
            </div>

            {!searchHistory || searchHistory.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No searches yet</h3>
                <p className="text-gray-500">
                  When your kids search, their queries will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {searchHistory.map((entry) => (
                  <div
                    key={entry._id}
                    className={`px-5 py-4 flex items-start gap-4 ${
                      entry.flagged ? 'bg-red-50 border-l-4 border-l-red-400' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${
                        entry.kidColor ? `bg-${entry.kidColor}-500` : 'bg-gray-400'
                      }`}
                    >
                      {entry.kidIcon || entry.kidName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm">{entry.kidName || 'Unknown'}</p>
                        {entry.flagged && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Flagged
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-0.5 ${entry.flagged ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                        {entry.query}
                      </p>
                      {entry.blockedReason && (
                        <p className="text-xs text-red-500 mt-1">
                          Blocked: {entry.blockedReason}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {new Date(entry._creationTime).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kid Profiles Tab */}
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Kid Profiles</h2>
              <button
                onClick={() => {
                  setEditingProfile(null);
                  setShowEditor(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Add Profile
              </button>
            </div>

            {!kidProfiles || kidProfiles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No profiles yet</h3>
                <p className="text-gray-500 mb-6">
                  Create a profile for each of your kids to customize their search experience.
                </p>
                <button
                  onClick={() => {
                    setEditingProfile(null);
                    setShowEditor(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2.5 rounded-lg font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create First Profile
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kidProfiles.map((profile) => (
                  <div
                    key={profile._id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-${profile.color || 'blue'}-500`}
                        >
                          {profile.icon || profile.name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{profile.name}</h3>
                          <p className="text-xs text-gray-500">
                            Ages {profile.ageMin || 4}-{profile.ageMax || 18} &middot; {profile.strictness || 'moderate'}
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
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {profile.blockedTopics?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {profile.blockedTopics.slice(0, 4).map((topic) => (
                          <span
                            key={topic}
                            className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                        {profile.blockedTopics.length > 4 && (
                          <span className="text-gray-400 text-xs">
                            +{profile.blockedTopics.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
        )}

        {/* Time Limits Tab */}
        {activeTab === 'limits' && (
          <TimeLimits userId={userData?._id} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            {/* Account Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Account</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Name</span>
                  <span className="text-sm font-medium text-gray-900">{user?.name || 'Not set'}</span>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Subscription</h3>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {userData?.subscriptionStatus === 'lifetime'
                      ? 'Lifetime Access'
                      : userData?.subscriptionStatus === 'active'
                        ? 'Premium'
                        : userData?.subscriptionStatus === 'trial'
                          ? 'Free Trial'
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
              {userData?.stripeCustomerId && (
                <a
                  href="https://getsafefamily.com/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Manage Subscription
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {!userData?.stripeCustomerId && (
                <p className="text-sm text-gray-500">
                  To manage or cancel, contact jeremiah@getsafefamily.com
                </p>
              )}
            </div>

            {/* Family Code */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">Family Code</h3>
              <p className="text-sm text-gray-500 mb-4">
                Share this code with your kids so they can access SafeSeek.
              </p>
              {userData?.familyCode ? (
                <div className="flex items-center gap-3">
                  <code className="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono font-bold text-gray-900 tracking-wider">
                    {userData.familyCode}
                  </code>
                  <button
                    onClick={copyFamilyCode}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No family code generated yet.</p>
              )}
            </div>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
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
            // Would call a Convex mutation here
            setConfirmDelete(null);
            showToast('Profile deleted', 'success');
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
