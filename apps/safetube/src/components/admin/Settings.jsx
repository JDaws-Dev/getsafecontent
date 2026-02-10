import { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import GettingStarted from './GettingStarted';

// Stripe Price ID - SafeTube Premium $4.99/month
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1Spp7oKgkIT46sg7oJIKGfMG';

// Color constants
const COLORS = [
  { id: 'red', bg: 'bg-red-500', hex: '#ef4444' },
  { id: 'orange', bg: 'bg-orange-500', hex: '#f97316' },
  { id: 'yellow', bg: 'bg-yellow-500', hex: '#eab308' },
  { id: 'green', bg: 'bg-green-500', hex: '#22c55e' },
  { id: 'blue', bg: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'purple', bg: 'bg-purple-500', hex: '#8b5cf6' },
  { id: 'pink', bg: 'bg-pink-500', hex: '#ec4899' },
];

function getColorClass(colorId) {
  const color = COLORS.find(c => c.id === colorId);
  return color ? color.bg : 'bg-red-500';
}

// Time limit presets
const TIME_PRESETS = [
  { value: 0, label: 'Unlimited' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

// Hour options for time window
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
}));

// Format minutes to human readable
function formatMinutes(mins) {
  if (mins === 0) return 'Unlimited';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
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

export default function Settings({ userData, onLogout }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [activeSection, setActiveSection] = useState('kids'); // 'kids', 'account', 'support'
  const [expandedKidId, setExpandedKidId] = useState(null);
  const [showAddKid, setShowAddKid] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Account deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteOwnAccount = useMutation(api.admin.deleteOwnAccount);

  // Account editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [editNameError, setEditNameError] = useState('');
  const [editNameSuccess, setEditNameSuccess] = useState('');
  const updateUser = useMutation(api.users.updateUser);

  // Get kid profiles
  const kidProfiles = useQuery(
    api.kidProfiles.getKidProfiles,
    userData?._id ? { userId: userData._id } : 'skip'
  );

  // Get time limits and watch history for kid cards
  const allTimeLimits = useQuery(
    api.timeLimits.getAllTimeLimits,
    userData?._id ? { userId: userData._id } : 'skip'
  );
  const recentHistory = useQuery(
    api.watchHistory.getRecentHistory,
    userData?._id ? { userId: userData._id, limit: 50 } : 'skip'
  );

  const deleteProfile = useMutation(api.kidProfiles.deleteKidProfile);

  const handleDeleteConfirm = async () => {
    if (!confirmModal) return;
    setIsLoading(true);
    try {
      await deleteProfile({ profileId: confirmModal.id });
      setConfirmModal(null);
      if (expandedKidId === confirmModal.id) {
        setExpandedKidId(null);
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing name
  const startEditingName = () => {
    setEditName(userData?.name || '');
    setIsEditingName(true);
    setEditNameError('');
    setEditNameSuccess('');
  };

  // Save name changes
  const handleSaveName = async (e) => {
    e.preventDefault();
    setEditNameError('');
    setEditNameSuccess('');

    if (!editName.trim()) {
      setEditNameError('Name is required');
      return;
    }

    setEditNameLoading(true);

    try {
      await updateUser({
        userId: userData._id,
        name: editName.trim(),
      });

      setEditNameSuccess('Name updated successfully!');
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      setEditNameError(error.message || 'Failed to update name. Please try again.');
    } finally {
      setEditNameLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your kids, account, and preferences</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveSection('kids')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition ${
            activeSection === 'kids'
              ? 'bg-white text-red-600 border border-gray-200 border-b-white -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Kids
        </button>
        <button
          onClick={() => setActiveSection('account')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition ${
            activeSection === 'account'
              ? 'bg-white text-red-600 border border-gray-200 border-b-white -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveSection('support')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition ${
            activeSection === 'support'
              ? 'bg-white text-red-600 border border-gray-200 border-b-white -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Support
        </button>
      </div>

      {/* KIDS SECTION */}
      {activeSection === 'kids' && (
        <div className="space-y-6">
          {/* Kids Management Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-500 to-orange-500">
              <div>
                <h2 className="text-lg font-semibold text-white">Kid Profiles</h2>
                <p className="text-sm text-white/80">Manage access and time limits for each child</p>
              </div>
              <button
                onClick={() => setShowAddKid(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Kid
              </button>
            </div>

            {!kidProfiles || kidProfiles.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No kids yet</h3>
                <p className="text-gray-500 text-sm mb-4">Add a profile for each child to get started</p>
                <button
                  onClick={() => setShowAddKid(true)}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-md"
                >
                  Add Your First Kid
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {kidProfiles.map((kid) => (
                  <KidCard
                    key={kid._id}
                    kid={kid}
                    userId={userData._id}
                    isExpanded={expandedKidId === kid._id}
                    onToggle={() => setExpandedKidId(expandedKidId === kid._id ? null : kid._id)}
                    onDelete={(id, name) => setConfirmModal({ id, name })}
                    allTimeLimits={allTimeLimits}
                    recentHistory={recentHistory}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Device Setup Guide</h3>
                  <p className="text-xs text-gray-500">Lock down your kid's device to only use SafeTube</p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupGuide(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-4 py-2.5 rounded-xl font-medium transition"
              >
                View Setup Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT SECTION */}
      {activeSection === 'account' && (
        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Information
              </h2>
              {!isEditingName && (
                <button
                  onClick={startEditingName}
                  className="px-3 py-1.5 text-sm font-medium text-white/90 hover:text-white bg-white/20 hover:bg-white/30 rounded-lg transition"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="p-6">
              {/* Success message */}
              {editNameSuccess && !isEditingName && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-green-700 font-medium">{editNameSuccess}</span>
                </div>
              )}

              {!isEditingName ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
                    <p className="text-lg font-medium text-gray-900">{userData?.name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</label>
                    <p className="text-lg font-medium text-gray-900">{userData?.email || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Family Code</label>
                    <p className="text-2xl font-mono font-bold text-red-600 tracking-wider">{userData?.familyCode || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Member Since</label>
                    <p className="text-lg text-gray-900">
                      {userData?.createdAt
                        ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveName} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Your name"
                      autoComplete="name"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                      {userData?.email || 'Not set'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  {editNameError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-red-700">{editNameError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={editNameLoading}
                      className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editNameLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditNameError('');
                      }}
                      disabled={editNameLoading}
                      className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Safe Family Account */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 bg-gradient-to-r from-red-500 to-orange-500 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Safe Family Account</h2>
                <p className="text-sm text-white/80">Manage your subscription and apps</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg border border-red-200">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  SafeTube
                </span>
                <span className="text-sm text-gray-600">Currently using</span>
              </div>

              <a
                href="https://getsafefamily.com/account"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium transition shadow-md"
              >
                <span>Manage Safe Family Account</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Add SafeTunes, SafeReads, or manage billing at getsafefamily.com
              </p>
            </div>
          </div>

          {/* Subscription Card */}
          <SubscriptionCard userData={userData} />

          {/* Log Out & Danger Zone */}
          <div className="space-y-4">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-200">
                <h3 className="font-semibold text-red-900 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Danger Zone
                </h3>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-3">Permanently delete your account and all data</p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT SECTION */}
      {activeSection === 'support' && (
        <div className="space-y-6">
          {/* Support Links */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help & Support
              </h2>
            </div>
            <div className="p-4 space-y-2">
              <a
                href="mailto:jeremiah@getsafefamily.com"
                className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition p-3 rounded-xl hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <span className="font-medium">Contact Support</span>
                  <p className="text-xs text-gray-500">jeremiah@getsafefamily.com</p>
                </div>
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Legal
              </h2>
            </div>
            <div className="p-4 space-y-2">
              <a
                href="/privacy"
                className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition p-3 rounded-xl hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-medium">Privacy Policy</span>
              </a>
              <a
                href="/terms"
                className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition p-3 rounded-xl hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Terms of Service</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add Kid Modal */}
      {showAddKid && (
        <AddKidModal userId={userData._id} onClose={() => setShowAddKid(false)} />
      )}

      {/* Delete Kid Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Profile?</h3>
            <p className="text-gray-600 mb-6">Delete {confirmModal.name}'s profile? This will also delete all their approved content and watch history.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Account?</h3>
            <p className="text-gray-600 text-center mb-4">
              This action cannot be undone. All your data, kid profiles, and approved content will be permanently deleted.
            </p>
            <p className="text-sm text-gray-500 text-center mb-4">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError('');
              }}
              placeholder="Type DELETE"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-center font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={deleteLoading}
            />
            {deleteError && (
              <p className="text-sm text-red-600 text-center mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'DELETE') {
                    setDeleteError('Please type DELETE to confirm');
                    return;
                  }
                  setDeleteLoading(true);
                  setDeleteError('');
                  try {
                    await deleteOwnAccount();
                    // Deletion successful, log out and redirect
                    onLogout();
                  } catch (error) {
                    console.error('Failed to delete account:', error);
                    setDeleteError(error.message || 'Failed to delete account. Please try again.');
                    setDeleteLoading(false);
                  }
                }}
                disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowSetupGuide(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Setup Guide</h2>
              <button
                onClick={() => setShowSetupGuide(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <GettingStarted userData={userData} onNavigate={() => setShowSetupGuide(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Toggle Switch component
function Toggle({ enabled, onChange, color = 'green' }) {
  const bgColor = color === 'red'
    ? (enabled ? 'bg-red-500' : 'bg-gray-300')
    : (enabled ? 'bg-green-500' : 'bg-gray-300');

  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${bgColor}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// Kid Card - expandable with full inline editing
function KidCard({ kid, userId, isExpanded, onToggle, onDelete, allTimeLimits, recentHistory }) {
  const [saving, setSaving] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateProfile = useMutation(api.kidProfiles.updateKidProfile);
  const setTimeLimit = useMutation(api.timeLimits.setTimeLimit);
  const deleteTimeLimit = useMutation(api.timeLimits.deleteTimeLimit);

  // Get current time limit data
  const timeLimit = allTimeLimits?.find(t => t.kidProfileId === kid._id);
  const kidHistory = recentHistory?.filter(h => h.kidProfileId === kid._id) || [];

  // Combined form state for profile AND time limits
  const [form, setForm] = useState({
    name: kid.name,
    color: kid.color || 'red',
    pin: kid.pin || '',
    requestsEnabled: kid.requestsEnabled !== false,
    shortsEnabled: kid.shortsEnabled !== false,
    videoPaused: kid.videoPaused === true,
    dailyLimitMinutes: 60,
    weekendLimitMinutes: undefined,
    allowedStartHour: undefined,
    allowedEndHour: undefined,
    hasTimeLimit: false,
    hasTimeWindow: false,
    hasWeekendLimit: false,
  });

  // Initialize form when expanded
  useEffect(() => {
    if (isExpanded) {
      setForm({
        name: kid.name,
        color: kid.color || 'red',
        pin: kid.pin || '',
        requestsEnabled: kid.requestsEnabled !== false,
        shortsEnabled: kid.shortsEnabled !== false,
        videoPaused: kid.videoPaused === true,
        dailyLimitMinutes: timeLimit?.dailyLimitMinutes ?? 60,
        weekendLimitMinutes: timeLimit?.weekendLimitMinutes,
        allowedStartHour: timeLimit?.allowedStartHour,
        allowedEndHour: timeLimit?.allowedEndHour,
        hasTimeLimit: !!timeLimit,
        hasTimeWindow: timeLimit?.allowedStartHour !== undefined,
        hasWeekendLimit: timeLimit?.weekendLimitMinutes !== undefined,
      });
      setHasChanges(false);
    }
  }, [isExpanded, kid, timeLimit]);

  const updateForm = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    // Validate PIN if provided (must be exactly 4 digits or empty)
    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      alert('PIN must be exactly 4 digits');
      return;
    }
    setSaving(true);
    try {
      // Save profile settings
      await updateProfile({
        profileId: kid._id,
        name: form.name.trim(),
        color: form.color,
        pin: form.pin, // Pass PIN (empty string removes it)
        requestsEnabled: form.requestsEnabled,
        shortsEnabled: form.shortsEnabled,
        videoPaused: form.videoPaused,
      });

      // Save or delete time limits
      if (form.hasTimeLimit) {
        await setTimeLimit({
          kidProfileId: kid._id,
          dailyLimitMinutes: form.dailyLimitMinutes,
          weekendLimitMinutes: form.hasWeekendLimit ? form.weekendLimitMinutes : undefined,
          allowedStartHour: form.hasTimeWindow ? form.allowedStartHour : undefined,
          allowedEndHour: form.hasTimeWindow ? form.allowedEndHour : undefined,
        });
      } else if (timeLimit) {
        await deleteTimeLimit({ kidProfileId: kid._id });
      }

      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-gray-50 rounded-xl border overflow-hidden ${kid.videoPaused ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      {/* Card Header - Always visible */}
      <div
        className={`p-4 cursor-pointer transition ${kid.videoPaused ? 'hover:bg-red-100' : 'hover:bg-gray-100'}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getColorClass(kid.color)}`}
          >
            {kid.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{kid.name}</h3>
              {kid.pin && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="PIN protected">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {kid.videoPaused && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Paused</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
              <span>{timeLimit ? formatMinutes(timeLimit.dailyLimitMinutes) : 'No limit'}</span>
              <span>•</span>
              <span>{kid.shortsEnabled !== false ? 'Shorts on' : 'Shorts off'}</span>
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content - All settings inline */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-6 bg-white">

          {/* Profile Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Profile</h4>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                maxLength={20}
              />
            </div>

            {/* Color */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((colorOption) => (
                  <button
                    key={colorOption.id}
                    type="button"
                    onClick={() => updateForm({ color: colorOption.id })}
                    className={`w-8 h-8 rounded-full ${colorOption.bg} transition-transform ${
                      form.color === colorOption.id
                        ? 'ring-2 ring-gray-400 ring-offset-2 scale-110'
                        : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                4-Digit PIN
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Kids must enter this PIN to access their profile</p>
              <div className="flex items-center gap-3">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    updateForm({ pin: val });
                  }}
                  placeholder="••••"
                  className="w-24 text-center text-xl font-mono tracking-widest bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  maxLength={4}
                />
                {form.pin && (
                  <button
                    type="button"
                    onClick={() => updateForm({ pin: '' })}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove PIN
                  </button>
                )}
                {form.pin && form.pin.length === 4 && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    PIN set
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content Controls Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Content Controls</h4>

            <div className="space-y-3">
              {/* Requests */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow Requests</p>
                  <p className="text-xs text-gray-500">Search and request new videos</p>
                </div>
                <Toggle
                  enabled={form.requestsEnabled}
                  onChange={(val) => updateForm({ requestsEnabled: val })}
                />
              </div>

              {/* Shorts */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow Shorts</p>
                  <p className="text-xs text-gray-500">Videos under 60 seconds</p>
                </div>
                <Toggle
                  enabled={form.shortsEnabled}
                  onChange={(val) => updateForm({ shortsEnabled: val })}
                />
              </div>

              {/* Video Paused - styled differently as it's a lockout */}
              <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg -mx-3">
                <div>
                  <p className="text-sm font-medium text-red-700">Pause All Videos</p>
                  <p className="text-xs text-red-600/70">Temporarily block playback</p>
                </div>
                <Toggle
                  enabled={form.videoPaused}
                  onChange={(val) => updateForm({ videoPaused: val })}
                  color="red"
                />
              </div>
            </div>
          </div>

          {/* Time Limits Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Time Limits</h4>

            {/* Enable time limit */}
            <div className="flex items-center justify-between py-2 mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Daily Limit</p>
                <p className="text-xs text-gray-500">Restrict daily watch time</p>
              </div>
              <Toggle
                enabled={form.hasTimeLimit}
                onChange={(val) => updateForm({ hasTimeLimit: val })}
              />
            </div>

            {form.hasTimeLimit && (
              <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                {/* Daily limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Limit</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {TIME_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => updateForm({ dailyLimitMinutes: preset.value })}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                          form.dailyLimitMinutes === preset.value
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weekend limit */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={form.hasWeekendLimit}
                      onChange={(e) => updateForm({
                        hasWeekendLimit: e.target.checked,
                        weekendLimitMinutes: e.target.checked ? form.dailyLimitMinutes : undefined
                      })}
                      className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Different limit on weekends</span>
                  </label>
                  {form.hasWeekendLimit && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {TIME_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => updateForm({ weekendLimitMinutes: preset.value })}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                            form.weekendLimitMinutes === preset.value
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time window */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={form.hasTimeWindow}
                      onChange={(e) => updateForm({
                        hasTimeWindow: e.target.checked,
                        allowedStartHour: e.target.checked ? 8 : undefined,
                        allowedEndHour: e.target.checked ? 20 : undefined
                      })}
                      className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Only allow during certain hours</span>
                  </label>
                  {form.hasTimeWindow && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={form.allowedStartHour ?? 8}
                        onChange={(e) => updateForm({ allowedStartHour: parseInt(e.target.value) })}
                        className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-sm focus:ring-red-500 focus:border-red-500"
                      >
                        {HOURS.map((h) => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                      <span className="text-gray-500 text-sm">to</span>
                      <select
                        value={form.allowedEndHour ?? 20}
                        onChange={(e) => updateForm({ allowedEndHour: parseInt(e.target.value) })}
                        className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-sm focus:ring-red-500 focus:border-red-500"
                      >
                        {HOURS.map((h) => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity Section */}
          {kidHistory.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h4>
              <div className="space-y-2">
                {(showAllHistory ? kidHistory : kidHistory.slice(0, 3)).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-16 h-10 object-cover rounded flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(item.watchedAt)}</p>
                    </div>
                  </div>
                ))}
                {kidHistory.length > 3 && (
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="w-full text-xs text-red-600 hover:text-red-700 font-medium py-1"
                  >
                    {showAllHistory ? 'Show less' : `+${kidHistory.length - 3} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className={`flex-1 py-2.5 rounded-lg font-medium transition ${
                hasChanges
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
            </button>
            <button
              onClick={() => onDelete(kid._id, kid.name)}
              className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Kid Modal
function AddKidModal({ userId, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('red');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createKid = useMutation(api.kidProfiles.createKidProfile);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createKid({
        userId,
        name: name.trim(),
        color,
      });
      onClose();
    } catch (err) {
      console.error('Failed to create kid profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Add Kid</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter kid's name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              maxLength={20}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((colorOption) => (
                <button
                  key={colorOption.id}
                  type="button"
                  onClick={() => setColor(colorOption.id)}
                  className={`w-10 h-10 rounded-full ${colorOption.bg} transition-transform ${
                    color === colorOption.id
                      ? 'ring-2 ring-gray-400 ring-offset-2 scale-110'
                      : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Kid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subscription Card Component with Stripe integration
function SubscriptionCard({ userData }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cancellation reason modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOtherReason, setCancelOtherReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const createCheckoutSession = useAction(api.stripeActions.createCheckoutSession);
  const createPortalSession = useAction(api.stripeActions.createPortalSession);
  const sendCancellationReason = useAction(api.emails.sendCancellationReasonEmail);

  const status = userData?.subscriptionStatus || 'trial';
  const isTrialExpired = status === 'trial' && userData?.trialEndsAt && Date.now() > userData.trialEndsAt;
  const needsSubscription = status === 'trial' || status === 'cancelled' || status === 'expired' || isTrialExpired;
  const hasActiveSubscription = status === 'active';
  const hasLifetime = status === 'lifetime';

  // Calculate days remaining in trial
  const trialDaysRemaining = userData?.trialEndsAt
    ? Math.max(0, Math.ceil((userData.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSubscribe = async () => {
    if (!userData?.email) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await createCheckoutSession({
        email: userData.email,
        priceId: STRIPE_PRICE_ID,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setError('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!userData?.stripeCustomerId) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await createPortalSession({
        stripeCustomerId: userData.stripeCustomerId,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Failed to create portal session:', err);
      setError('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancellation with reason collection
  const handleCancelWithReason = async () => {
    if (!cancelReason) return;

    setCancelLoading(true);
    try {
      // Send cancellation reason email to admin
      await sendCancellationReason({
        userEmail: userData?.email || '',
        userName: userData?.name || '',
        reason: cancelReason,
        otherReason: cancelReason === 'Other' ? cancelOtherReason : undefined,
      });

      // Close modal and reset state
      setShowCancelModal(false);
      setCancelReason('');
      setCancelOtherReason('');

      // Redirect to Stripe portal for actual cancellation
      const result = await createPortalSession({
        stripeCustomerId: userData.stripeCustomerId,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Failed to process cancellation:', err);
      setError('Failed to process. Please try again.');
      setCancelLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (hasLifetime) return { label: 'Lifetime Access', color: 'purple', description: 'You have lifetime access to SafeTube!' };
    if (hasActiveSubscription) return { label: 'Premium', color: 'green', description: 'Your subscription is active' };
    if (isTrialExpired) return { label: 'Trial Expired', color: 'red', description: 'Your free trial has ended. Subscribe to continue.' };
    if (status === 'cancelled') return { label: 'Cancelled', color: 'orange', description: 'Your subscription has been cancelled' };
    if (status === 'past_due') return { label: 'Past Due', color: 'red', description: 'Payment failed. Please update your payment method.' };
    return { label: 'Free Trial', color: 'blue', description: `${trialDaysRemaining} days remaining in your trial` };
  };

  const statusDisplay = getStatusDisplay();

  const colorClasses = {
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  };

  const colors = colorClasses[statusDisplay.color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Subscription
        </h2>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-medium text-gray-900">{statusDisplay.label}</p>
            <p className="text-sm text-gray-500">{statusDisplay.description}</p>
          </div>
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
            <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${colors.dot}`}></span>
            {statusDisplay.label}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Subscribe button for trial/expired users */}
        {needsSubscription && !hasLifetime && (
          <div className="space-y-3">
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-4 py-3 rounded-xl font-medium transition shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isTrialExpired ? 'Subscribe Now' : 'Upgrade to Premium'}
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500">$4.99/month • Cancel anytime</p>
          </div>
        )}

        {/* Manage subscription button for active subscribers */}
        {hasActiveSubscription && (
          <div className="space-y-2">
            {userData?.stripeCustomerId ? (
              <>
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Subscription
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full text-sm text-gray-500 hover:text-red-600 py-2 transition"
                >
                  Cancel Subscription
                </button>
              </>
            ) : (
              <p className="text-center text-sm text-gray-500">
                To manage or cancel, contact <a href="mailto:jeremiah@getsafefamily.com" className="text-red-600 hover:underline">jeremiah@getsafefamily.com</a>
              </p>
            )}
          </div>
        )}

        {/* Cancellation Reason Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Before you go...</h3>
                  <p className="text-sm text-gray-600">We'd love to know why</p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">
                Your feedback helps us improve SafeTube:
              </p>

              <div className="space-y-2 mb-4">
                {[
                  "Too expensive",
                  "Not using it enough",
                  "Missing features I need",
                  "Found a better alternative",
                  "Kids lost interest",
                  "Technical issues",
                  "Other"
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                      cancelReason === reason
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-3 text-gray-700">{reason}</span>
                  </label>
                ))}
              </div>

              {cancelReason === 'Other' && (
                <div className="mb-4">
                  <textarea
                    value={cancelOtherReason}
                    onChange={(e) => setCancelOtherReason(e.target.value)}
                    placeholder="Please tell us more..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setCancelOtherReason('');
                  }}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50"
                >
                  Never mind
                </button>
                <button
                  onClick={handleCancelWithReason}
                  disabled={cancelLoading || !cancelReason}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Continue to Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Past due - show update payment button */}
        {status === 'past_due' && userData?.stripeCustomerId && (
          <button
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-medium transition disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Update Payment Method'}
          </button>
        )}

        {/* Contact for lifetime users */}
        {hasLifetime && (
          <p className="text-center text-sm text-gray-500">
            Questions? Contact <a href="mailto:jeremiah@getsafefamily.com" className="text-red-600 hover:underline">jeremiah@getsafefamily.com</a>
          </p>
        )}
      </div>
    </div>
  );
}
