import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AppleMusicAuth from './AppleMusicAuth';
import { COLORS } from '../../constants/avatars';
import bcrypt from 'bcryptjs';
import { useToast } from '../common/Toast';
import BillingHistory from './BillingHistory';
import { useIsNativeApp } from '../../hooks/useIsNativeApp';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeSelector } from '../common/ThemeToggle';

// Chevron Right Icon Component
const ChevronRight = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Back Button Component
const BackButton = ({ onClick, label = 'Back' }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-4"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
    {label}
  </button>
);

function Settings({ user, onLogout, initialSection }) {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const isNativeApp = useIsNativeApp();
  const fullUser = useQuery(api.users.getUser, user ? { userId: user._id } : 'skip');
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles, user ? { userId: user._id } : 'skip') || [];
  const updateKidProfile = useMutation(api.kidProfiles.updateKidProfile);
  const createKidProfile = useMutation(api.kidProfiles.createKidProfile);
  const archiveAndDeleteKidProfile = useMutation(api.kidProfiles.archiveAndDeleteKidProfile);
  const resetKidProfileMutation = useMutation(api.kidProfiles.resetKidProfile);
  const restoreKidProfileMutation = useMutation(api.kidProfiles.restoreKidProfile);
  const permanentlyDeleteArchiveMutation = useMutation(api.kidProfiles.permanentlyDeleteArchive);
  const archivedProfiles = useQuery(api.kidProfiles.getArchivedProfiles, user ? { userId: user._id } : 'skip') || [];
  const createPortalSession = useAction(api.stripeActions.createPortalSession);
  const sendCancellationReason = useAction(api.emails.sendCancellationReasonEmail);
  const changePasswordMutation = useMutation(api.users.changePassword);
  const updateUserMutation = useMutation(api.users.updateUser);
  const deleteUserMutation = useMutation(api.deleteUser.deleteUserByEmail);
  const setGlobalHideArtwork = useMutation(api.users.setGlobalHideArtwork);

  // View state: 'menu' shows the main list, others show specific sections
  const [activeSection, setActiveSection] = useState(initialSection || 'menu');

  // Update active section when initialSection prop changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const [editingKidId, setEditingKidId] = useState(null);
  const [isCreatingKid, setIsCreatingKid] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Account editing state
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
  });
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Kid profile deletion state
  const [showDeleteKidModal, setShowDeleteKidModal] = useState(false);
  const [kidToDelete, setKidToDelete] = useState(null);
  const [deleteKidLoading, setDeleteKidLoading] = useState(false);

  // Kid profile reset state
  const [showResetKidModal, setShowResetKidModal] = useState(false);
  const [kidToReset, setKidToReset] = useState(null);
  const [resetKidLoading, setResetKidLoading] = useState(false);

  // Archived profiles state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [archiveToRestore, setArchiveToRestore] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Cancellation reason state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOtherReason, setCancelOtherReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Form state for editing/creating kids - SIMPLIFIED
  const [formData, setFormData] = useState({
    name: '',
    color: 'purple',
    pin: '',
    confirmPin: '',
    timeLimitEnabled: false,
    dailyTimeLimitMinutes: 60,
    // Time-of-day restrictions
    timeOfDayEnabled: false,
    allowedStartTime: '08:00',
    allowedEndTime: '20:00',
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Helper function to get color class
  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Password change handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);

    try {
      const currentPasswordHash = await bcrypt.hash(passwordForm.currentPassword, 10);
      const newPasswordHash = await bcrypt.hash(passwordForm.newPassword, 10);

      await changePasswordMutation({
        userId: user._id,
        currentPasswordHash,
        newPasswordHash,
      });

      setPasswordSuccess('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError(error.message || 'Failed to update password. Please check your current password and try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Account update handler
  const startEditingAccount = () => {
    setAccountForm({
      name: fullUser?.name || user?.name || '',
      email: fullUser?.email || user?.email || '',
    });
    setIsEditingAccount(true);
    setAccountError('');
    setAccountSuccess('');
  };

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    if (!accountForm.name.trim()) {
      setAccountError('Name is required');
      return;
    }

    if (!accountForm.email.trim()) {
      setAccountError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountForm.email)) {
      setAccountError('Please enter a valid email address');
      return;
    }

    setAccountLoading(true);

    try {
      await updateUserMutation({
        userId: user._id,
        name: accountForm.name.trim(),
        email: accountForm.email.trim().toLowerCase(),
      });

      setAccountSuccess('Account updated successfully!');
      setIsEditingAccount(false);
    } catch (error) {
      console.error('Account update error:', error);
      setAccountError(error.message || 'Failed to update account. Please try again.');
    } finally {
      setAccountLoading(false);
    }
  };

  // Cancellation reason handler
  const handleCancelWithReason = async () => {
    if (!cancelReason) {
      showToast('Please select a reason for cancelling', 'error');
      return;
    }

    setCancelLoading(true);
    try {
      await sendCancellationReason({
        userEmail: fullUser?.email || user?.email || '',
        userName: fullUser?.name || user?.name || '',
        reason: cancelReason,
        otherReason: cancelReason === 'Other' ? cancelOtherReason : undefined,
      });

      setShowCancelModal(false);
      setCancelReason('');
      setCancelOtherReason('');

      const { url } = await createPortalSession({
        stripeCustomerId: fullUser.stripeCustomerId,
      });
      window.location.href = url;
    } catch (error) {
      console.error('Failed to process cancellation:', error);
      showToast('Failed to process. Please try again.', 'error');
      setCancelLoading(false);
    }
  };

  // Account deletion handler
  const handleDeleteAccount = async () => {
    setDeleteError('');

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setDeleteLoading(true);

    try {
      const userEmail = fullUser?.email || user?.email;

      if (!userEmail) {
        throw new Error('User email not found');
      }

      await deleteUserMutation({ email: userEmail });
      onLogout();
      navigate('/');
    } catch (error) {
      console.error('Account deletion error:', error);
      setDeleteError(error.message || 'Failed to delete account. Please try again or contact support.');
      setDeleteLoading(false);
    }
  };

  // Kid profile deletion handler (now archives for 30 days)
  const handleDeleteKidProfile = async () => {
    if (!kidToDelete) return;

    setDeleteKidLoading(true);
    try {
      const result = await archiveAndDeleteKidProfile({ profileId: kidToDelete._id });
      showToast(`${kidToDelete.name}'s profile has been archived. You can restore it within 30 days.`, 'success');
      setShowDeleteKidModal(false);
      setKidToDelete(null);
      cancelEditing();
    } catch (error) {
      console.error('Failed to delete kid profile:', error);
      showToast('Failed to delete profile. Please try again.', 'error');
    } finally {
      setDeleteKidLoading(false);
    }
  };

  // Kid profile reset handler (clears all data, keeps profile)
  const handleResetKidProfile = async () => {
    if (!kidToReset) return;

    setResetKidLoading(true);
    try {
      const result = await resetKidProfileMutation({ profileId: kidToReset._id });
      const counts = result.deletedCounts;
      showToast(
        `${kidToReset.name}'s profile has been reset. Cleared ${counts.songs} songs, ${counts.playlists} playlists, and all history.`,
        'success'
      );
      setShowResetKidModal(false);
      setKidToReset(null);
    } catch (error) {
      console.error('Failed to reset kid profile:', error);
      showToast('Failed to reset profile. Please try again.', 'error');
    } finally {
      setResetKidLoading(false);
    }
  };

  // Restore archived profile handler
  const handleRestoreProfile = async () => {
    if (!archiveToRestore) return;

    setRestoreLoading(true);
    try {
      const result = await restoreKidProfileMutation({ archiveId: archiveToRestore._id });
      showToast(
        `${archiveToRestore.name}'s profile has been restored with ${result.restored.songs} songs and ${result.restored.playlists} playlists!`,
        'success'
      );
      setShowRestoreModal(false);
      setArchiveToRestore(null);
    } catch (error) {
      console.error('Failed to restore profile:', error);
      showToast('Failed to restore profile. Please try again.', 'error');
    } finally {
      setRestoreLoading(false);
    }
  };

  // Permanently delete archive handler
  const handlePermanentlyDeleteArchive = async (archive) => {
    try {
      await permanentlyDeleteArchiveMutation({ archiveId: archive._id });
      showToast(`${archive.name}'s archived data has been permanently deleted.`, 'success');
    } catch (error) {
      console.error('Failed to permanently delete archive:', error);
      showToast('Failed to delete archive. Please try again.', 'error');
    }
  };

  const startEditingKid = (kid) => {
    setEditingKidId(kid._id);
    setIsCreatingKid(false);
    setFormData({
      name: kid.name,
      color: kid.color || 'purple',
      pin: '',
      confirmPin: '',
      timeLimitEnabled: kid.timeLimitEnabled || false,
      dailyTimeLimitMinutes: kid.dailyTimeLimitMinutes || 60,
      timeOfDayEnabled: kid.timeOfDayEnabled || false,
      allowedStartTime: kid.allowedStartTime || '08:00',
      allowedEndTime: kid.allowedEndTime || '20:00',
    });
    setFormError('');
    setFormSuccess('');
  };

  const startCreatingKid = () => {
    setIsCreatingKid(true);
    setEditingKidId(null);
    setFormData({
      name: '',
      color: 'purple',
      pin: '',
      confirmPin: '',
      timeLimitEnabled: false,
      dailyTimeLimitMinutes: 60,
      timeOfDayEnabled: false,
      allowedStartTime: '08:00',
      allowedEndTime: '20:00',
    });
    setFormError('');
    setFormSuccess('');
  };

  const cancelEditing = () => {
    setEditingKidId(null);
    setIsCreatingKid(false);
    setFormError('');
    setFormSuccess('');
  };

  const handleSaveKid = async () => {
    setFormError('');
    setFormSuccess('');

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    if (formData.pin) {
      if (formData.pin.length !== 4) {
        setFormError('PIN must be exactly 4 digits (or leave blank for no PIN)');
        return;
      }

      if (formData.pin !== formData.confirmPin) {
        setFormError('PINs do not match');
        return;
      }
    }

    try {
      if (isCreatingKid) {
        await createKidProfile({
          userId: user._id,
          name: formData.name,
          color: formData.color,
          pin: formData.pin || undefined,
        });
        setFormSuccess('Kid profile created successfully!');
      } else {
        const updates = {
          profileId: editingKidId,
          name: formData.name,
          color: formData.color,
          timeLimitEnabled: formData.timeLimitEnabled,
          dailyTimeLimitMinutes: formData.timeLimitEnabled ? formData.dailyTimeLimitMinutes : undefined,
          // Time-of-day restrictions
          timeOfDayEnabled: formData.timeOfDayEnabled,
          allowedStartTime: formData.timeOfDayEnabled ? formData.allowedStartTime : undefined,
          allowedEndTime: formData.timeOfDayEnabled ? formData.allowedEndTime : undefined,
        };

        if (formData.pin) {
          updates.pin = formData.pin;
        }

        await updateKidProfile(updates);
        setFormSuccess('Profile updated successfully!');
      }

      setTimeout(() => {
        setFormSuccess('');
        cancelEditing();
      }, 1500);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setFormError('Failed to save. Please try again.');
    }
  };

  // Check if trial is expired for iOS users
  const isTrialExpired = () => {
    if (fullUser?.subscriptionStatus === 'trial') {
      const trialEndDate = new Date((fullUser?.createdAt || Date.now()) + 7 * 24 * 60 * 60 * 1000);
      return Date.now() > trialEndDate.getTime();
    }
    return fullUser?.subscriptionStatus !== 'active' && fullUser?.subscriptionStatus !== 'lifetime';
  };

  // Menu items for the main settings list
  const menuItems = [
    {
      id: 'kids',
      label: 'Family Management',
      sublabel: `${kidProfiles.length} kid profile${kidProfiles.length !== 1 ? 's' : ''}`,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
    {
      id: 'content',
      label: 'Content Controls',
      sublabel: fullUser?.globalHideArtwork ? 'All artwork hidden' : 'Per-item artwork settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      sublabel: 'Theme & display',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Account & Security',
      sublabel: fullUser?.email || user?.email || '',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'apple-music',
      label: 'Integrations',
      sublabel: (fullUser?.appleMusicAuthorized || user?.appleMusicAuthorized) ? 'Apple Music connected' : 'Connect Apple Music',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      ),
    },
    {
      id: 'support',
      label: 'Support',
      sublabel: 'Get help',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  // Only add subscription if NOT in native iOS app
  if (!isNativeApp) {
    menuItems.push({
      id: 'subscription',
      label: 'Subscription',
      sublabel: fullUser?.subscriptionStatus === 'lifetime' ? 'Lifetime access' :
                fullUser?.subscriptionStatus === 'active' ? 'Active' :
                fullUser?.subscriptionStatus === 'trial' ? 'Trial' : 'Inactive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* iOS Trial Expired Message */}
      {isNativeApp && isTrialExpired() && fullUser?.subscriptionStatus !== 'lifetime' && fullUser?.subscriptionStatus !== 'active' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-amber-900">Access Paused</p>
              <p className="text-sm text-amber-700 mt-1">
                Please check your email for updates on how to continue using SafeTunes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu View */}
      {activeSection === 'menu' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  {item.icon}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.sublabel}</p>
                </div>
              </div>
              <ChevronRight />
            </button>
          ))}

          {/* Logout at bottom of menu */}
          <div className="border-t border-gray-200 mt-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-4 px-4 py-4 text-red-600 hover:bg-red-50 transition"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Content Controls Section */}
      {activeSection === 'content' && (
        <div className="space-y-6">
          <BackButton onClick={() => setActiveSection('menu')} label="Settings" />

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Content Controls</h2>

            {/* Global Hide Artwork Toggle */}
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <p className="font-medium text-gray-900">Hide All Album Artwork</p>
                <p className="text-sm text-gray-500 mt-1">
                  Master switch to hide all album and song artwork across the app. Individual visibility settings will be preserved.
                </p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !fullUser?.globalHideArtwork;
                  try {
                    await setGlobalHideArtwork({
                      userId: user._id,
                      globalHideArtwork: newValue,
                    });
                    showToast(newValue ? 'All artwork is now hidden' : 'Artwork visibility restored to individual settings', 'success');
                  } catch (err) {
                    console.error('Failed to update artwork setting:', err);
                    showToast('Failed to update setting', 'error');
                  }
                }}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  fullUser?.globalHideArtwork ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    fullUser?.globalHideArtwork ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Info box explaining the feature */}
            <div className="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-purple-800">
                  <p className="font-medium mb-1">How this works</p>
                  <p>When enabled, all album artwork will be replaced with a music note placeholder. Your individual "hide artwork" settings for specific albums are preserved - when you turn this off, those individual settings will take effect again.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Section */}
      {activeSection === 'appearance' && (
        <div className="space-y-6">
          <BackButton onClick={() => setActiveSection('menu')} label="Settings" />

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Appearance</h2>

            {/* Theme Selection */}
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-1">Theme</p>
                <p className="text-sm text-gray-500 mb-4">
                  Choose how SafeTunes looks on your device
                </p>
                <ThemeSelector />
              </div>
            </div>

            {/* Info box */}
            <div className="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-purple-800">
                  <p className="font-medium mb-1">System theme</p>
                  <p>When set to System, SafeTunes will automatically switch between light and dark mode based on your device settings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account & Security Section */}
      {activeSection === 'account' && (
        <div className="space-y-6">
          <BackButton onClick={() => setActiveSection('menu')} label="Settings" />

          {/* Profile Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              {!isEditingAccount && (
                <button
                  onClick={startEditingAccount}
                  className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300 rounded-lg transition"
                >
                  Edit
                </button>
              )}
            </div>

            {accountSuccess && !isEditingAccount && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-700 font-medium">{accountSuccess}</span>
              </div>
            )}

            {!isEditingAccount ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                    {fullUser?.name || user?.name || ''}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                    {fullUser?.email || user?.email || ''}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAccountUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                </div>

                {accountError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-red-700">{accountError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={accountLoading}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {accountLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAccount(false);
                      setAccountError('');
                    }}
                    disabled={accountLoading}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Safe Family Account */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Safe Family Account</h2>
                <p className="text-sm text-gray-600">Manage your subscription and apps</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg border border-purple-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                SafeTunes
              </span>
              <span className="text-sm text-gray-600">Currently using</span>
            </div>

            <a
              href="https://getsafefamily.com/account"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
            >
              <span>Manage Safe Family Account</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Add SafeTube, SafeReads, or manage billing at getsafefamily.com
            </p>
          </div>

          {/* Family Code Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Family Code</h2>

            {fullUser?.familyCode ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Your Family Code</p>
                    <div className="text-3xl font-bold text-purple-600 tracking-widest">
                      {fullUser.familyCode}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(fullUser.familyCode);
                        showToast('Family code copied!', 'success');
                      } catch (err) {
                        showToast(`Your family code is: ${fullUser.familyCode}`, 'info');
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Kids use this code at getsafetunes.com/play to access their music.
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>Loading your family code...</p>
              </div>
            )}
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>

            {!showChangePassword ? (
              <div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                >
                  Change Password
                </button>
                {passwordSuccess && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-green-700 font-medium">{passwordSuccess}</span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                  />
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-red-700">{passwordError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                    }}
                    disabled={passwordLoading}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Danger Zone - Account Deletion */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Delete Account</h2>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account and all data.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
            >
              Delete My Account
            </button>
          </div>
        </div>
      )}

      {/* Apple Music / Integrations Section */}
      {activeSection === 'apple-music' && (
        <div className="space-y-6">
          <BackButton onClick={() => setActiveSection('menu')} label="Settings" />

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Apple Music Integration</h2>

            {(fullUser?.appleMusicAuthorized || user?.appleMusicAuthorized) && (fullUser?.appleMusicAuthDate || user?.appleMusicAuthDate) && (
              <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-purple-900">Account Connected</p>
                    <p className="text-sm text-purple-700">
                      Connected on {new Date(fullUser?.appleMusicAuthDate || user?.appleMusicAuthDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-gray-600 mb-6">
                Connect your Apple Music account to search, preview, and play music.
              </p>
              <AppleMusicAuth user={user} />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">About Apple Music</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Required for searching and playing music
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Needs an active Apple Music subscription
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Securely handled by Apple
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Kid Profiles Section */}
      {activeSection === 'kids' && (
        <div className="space-y-6">
          <BackButton onClick={() => setActiveSection('menu')} label="Settings" />

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Kid Profiles</h2>
              {!isCreatingKid && !editingKidId && (
                <button
                  onClick={startCreatingKid}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Kid
                </button>
              )}
            </div>

            {formSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                {formSuccess}
              </div>
            )}

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {formError}
              </div>
            )}

            {/* Create/Edit Form - SIMPLIFIED */}
            {(isCreatingKid || editingKidId) && (
              <div className="border border-purple-300 rounded-lg p-6 mb-6 bg-purple-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isCreatingKid ? 'Create New Kid Profile' : 'Edit Kid Profile'}
                </h3>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="Kid's name"
                    />
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <div className="grid grid-cols-5 gap-3">
                      {COLORS.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: color.id }))}
                          className={`h-12 rounded-lg border-2 transition ${color.class} ${
                            formData.color === color.id
                              ? 'border-gray-900 ring-2 ring-gray-400'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Time Limit Controls */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Daily Listening Limit</label>
                        <p className="text-xs text-gray-500">Set a maximum daily listening time</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, timeLimitEnabled: !prev.timeLimitEnabled }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.timeLimitEnabled ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.timeLimitEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {formData.timeLimitEnabled && (
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Daily limit: {formData.dailyTimeLimitMinutes} minutes ({Math.floor(formData.dailyTimeLimitMinutes / 60)}h {formData.dailyTimeLimitMinutes % 60}m)
                        </label>
                        <input
                          type="range"
                          min="15"
                          max="480"
                          step="15"
                          value={formData.dailyTimeLimitMinutes}
                          onChange={(e) => setFormData(prev => ({ ...prev, dailyTimeLimitMinutes: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>15 min</span>
                          <span>2 hours</span>
                          <span>4 hours</span>
                          <span>8 hours</span>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {[30, 60, 120, 180].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, dailyTimeLimitMinutes: mins }))}
                              className={`px-2 py-1 text-xs font-medium rounded-lg transition ${
                                formData.dailyTimeLimitMinutes === mins
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time-of-Day Restrictions */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Allowed Hours</label>
                        <p className="text-xs text-gray-500">Set when music can be played</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, timeOfDayEnabled: !prev.timeOfDayEnabled }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.timeOfDayEnabled ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.timeOfDayEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {formData.timeOfDayEnabled && (
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={formData.allowedStartTime}
                              onChange={(e) => setFormData(prev => ({ ...prev, allowedStartTime: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                            <input
                              type="time"
                              value={formData.allowedEndTime}
                              onChange={(e) => setFormData(prev => ({ ...prev, allowedEndTime: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Music can only be played between {formData.allowedStartTime} and {formData.allowedEndTime}
                        </p>
                        {/* Quick presets */}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {[
                            { label: '8am-8pm', start: '08:00', end: '20:00' },
                            { label: '7am-9pm', start: '07:00', end: '21:00' },
                            { label: '9am-7pm', start: '09:00', end: '19:00' },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                allowedStartTime: preset.start,
                                allowedEndTime: preset.end
                              }))}
                              className={`px-2 py-1 text-xs font-medium rounded-lg transition ${
                                formData.allowedStartTime === preset.start && formData.allowedEndTime === preset.end
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PIN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isCreatingKid ? 'PIN (Optional)' : 'New PIN (Optional - leave blank to keep current)'}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">4-digit PIN protects this profile from siblings.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="password"
                        value={formData.pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setFormData(prev => ({ ...prev, pin: value }));
                        }}
                        maxLength={4}
                        placeholder="••••"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-center text-lg font-bold tracking-widest"
                      />
                      <input
                        type="password"
                        value={formData.confirmPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setFormData(prev => ({ ...prev, confirmPin: value }));
                        }}
                        maxLength={4}
                        placeholder="Confirm"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-center text-lg font-bold tracking-widest"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={cancelEditing}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveKid}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                    >
                      {isCreatingKid ? 'Create Profile' : 'Save Changes'}
                    </button>
                  </div>

                  {/* Reset & Delete Profile Buttons - Only show when editing */}
                  {!isCreatingKid && editingKidId && (
                    <div className="pt-4 border-t border-gray-200 mt-4 space-y-3">
                      {/* Reset Profile Button */}
                      <button
                        onClick={() => {
                          const kid = kidProfiles.find(k => k._id === editingKidId);
                          if (kid) {
                            setKidToReset(kid);
                            setShowResetKidModal(true);
                          }
                        }}
                        className="w-full px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg font-medium transition border border-orange-200 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset Profile (Fresh Start)
                      </button>
                      {/* Delete Profile Button */}
                      <button
                        onClick={() => {
                          const kid = kidProfiles.find(k => k._id === editingKidId);
                          if (kid) {
                            setKidToDelete(kid);
                            setShowDeleteKidModal(true);
                          }
                        }}
                        className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition border border-red-200 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kid Profiles List */}
            <div className="space-y-3">
              {kidProfiles.map((kid) => {
                if (editingKidId === kid._id) return null;

                return (
                  <button
                    key={kid._id}
                    onClick={() => startEditingKid(kid)}
                    className="w-full border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white font-bold text-lg`}>
                        {kid.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{kid.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {kid.timeLimitEnabled && kid.dailyTimeLimitMinutes && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {kid.dailyTimeLimitMinutes < 60
                                ? `${kid.dailyTimeLimitMinutes}m limit`
                                : `${Math.floor(kid.dailyTimeLimitMinutes / 60)}h limit`}
                            </span>
                          )}
                          {kid.pin && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              PIN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight />
                  </button>
                );
              })}

              {kidProfiles.length === 0 && !isCreatingKid && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="font-medium mb-1">No kid profiles yet</p>
                  <p className="text-sm">Click "Add Kid" to create your first profile</p>
                </div>
              )}
            </div>
          </div>

          {/* Archived Profiles Section */}
          {archivedProfiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Recently Deleted Profiles
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                These profiles can be restored within 30 days of deletion.
              </p>
              <div className="space-y-3">
                {archivedProfiles.map((archive) => (
                  <div
                    key={archive._id}
                    className="border border-amber-200 bg-amber-50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${getColorClass(archive.color)} flex items-center justify-center text-white font-bold opacity-60`}>
                          {archive.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{archive.name}</h3>
                          <p className="text-sm text-amber-700">
                            {archive.songCount} songs, {archive.playlistCount} playlists • Expires in {archive.daysRemaining} days
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setArchiveToRestore(archive);
                            setShowRestoreModal(true);
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Permanently delete ${archive.name}'s archived data? This cannot be undone.`)) {
                              handlePermanentlyDeleteArchive(archive);
                            }
                          }}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg font-medium transition"
                        >
                          Delete Forever
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscription Section */}
      {activeSection === 'subscription' && !isNativeApp && (
        <div className="space-y-6">
          <BackButton onClick={() => setActiveSection('menu')} label="Settings" />

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Subscription</h2>

            {/* Subscription Status */}
            <div className={`border rounded-lg p-6 mb-6 ${
              fullUser?.subscriptionStatus === 'active' ? 'bg-green-50 border-green-200' :
              fullUser?.subscriptionStatus === 'lifetime' ? 'bg-purple-50 border-purple-200' :
              fullUser?.subscriptionStatus === 'trial' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-lg font-semibold ${
                    fullUser?.subscriptionStatus === 'active' ? 'text-green-900' :
                    fullUser?.subscriptionStatus === 'lifetime' ? 'text-purple-900' :
                    fullUser?.subscriptionStatus === 'trial' ? 'text-blue-900' :
                    'text-gray-900'
                  }`}>
                    {fullUser?.subscriptionStatus === 'lifetime' ? 'Lifetime Access' :
                     fullUser?.subscriptionStatus === 'active' ? 'Active Subscription' :
                     fullUser?.subscriptionStatus === 'trial' ? 'Trial Period' :
                     fullUser?.subscriptionStatus === 'past_due' ? 'Payment Failed' :
                     fullUser?.subscriptionStatus === 'cancelled' ? 'Cancelled' :
                     'Inactive'}
                  </h3>
                  <p className={`text-sm ${
                    fullUser?.subscriptionStatus === 'active' ? 'text-green-700' :
                    fullUser?.subscriptionStatus === 'lifetime' ? 'text-purple-700' :
                    fullUser?.subscriptionStatus === 'trial' ? 'text-blue-700' :
                    'text-gray-700'
                  }`}>
                    {fullUser?.subscriptionStatus === 'lifetime' ? 'No recurring payments' :
                     fullUser?.subscriptionStatus === 'active' ? (
                       fullUser?.subscriptionEndsAt ? (
                         `Cancels on ${new Date(fullUser.subscriptionEndsAt).toLocaleDateString()}`
                       ) : (
                         'Renews monthly'
                       )
                     ) :
                     fullUser?.subscriptionStatus === 'trial' ? (
                       (() => {
                         const trialEndDate = new Date((fullUser?.createdAt || Date.now()) + 7 * 24 * 60 * 60 * 1000);
                         const daysLeft = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                         return `Trial ends ${trialEndDate.toLocaleDateString()} • ${daysLeft} days left`;
                       })()
                     ) :
                     fullUser?.subscriptionStatus === 'past_due' ? 'Please update payment method' :
                     fullUser?.subscriptionStatus === 'cancelled' ? 'Subscription ended' :
                     'No active subscription'}
                  </p>
                </div>
                <div className={`text-2xl font-bold ${
                  fullUser?.subscriptionStatus === 'lifetime' ? 'text-purple-900' :
                  fullUser?.subscriptionStatus === 'active' ? 'text-green-900' :
                  'text-gray-900'
                }`}>
                  {fullUser?.subscriptionStatus === 'lifetime' ? 'FREE' : '$4.99'}
                </div>
              </div>

              {fullUser?.subscriptionStatus === 'trial' && (
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-sm text-blue-800">
                    {(() => {
                      const trialEndDate = new Date((fullUser?.createdAt || Date.now()) + 7 * 24 * 60 * 60 * 1000);
                      return `You'll be charged $4.99 on ${trialEndDate.toLocaleDateString()} when your trial ends.`;
                    })()}
                  </p>
                </div>
              )}

              {fullUser?.couponCode && (
                <div className={`mt-3 pt-3 border-t ${
                  fullUser?.subscriptionStatus === 'lifetime' ? 'border-purple-300' : 'border-green-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 ${
                      fullUser?.subscriptionStatus === 'lifetime' ? 'text-purple-700' : 'text-green-700'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
                    </svg>
                    <span className={`text-sm ${
                      fullUser?.subscriptionStatus === 'lifetime' ? 'text-purple-800' : 'text-green-800'
                    }`}>
                      <strong>Coupon used:</strong> {fullUser.couponCode}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Manage Subscription Button */}
            {fullUser?.subscriptionStatus !== 'lifetime' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                {fullUser?.stripeCustomerId ? (
                  <>
                    <button
                      onClick={async () => {
                        setPortalLoading(true);
                        try {
                          const { url } = await createPortalSession({
                            stripeCustomerId: fullUser.stripeCustomerId,
                          });
                          window.location.href = url;
                        } catch (error) {
                          console.error('Failed to create portal session:', error);
                          showToast('Failed to open subscription management. Please try again.', 'error');
                          setPortalLoading(false);
                        }
                      }}
                      disabled={portalLoading}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {portalLoading ? 'Loading...' : 'Manage Subscription'}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Update payment method or view invoices
                    </p>

                    {/* Cancel Subscription Link */}
                    {fullUser?.subscriptionStatus !== 'cancelled' && !fullUser?.subscriptionEndsAt && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="text-sm text-gray-500 hover:text-red-600 transition"
                        >
                          Cancel subscription
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-800">
                      Processing your subscription... This usually takes a few seconds.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Refresh this page in a moment to manage your subscription.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Billing History Section */}
          {fullUser?.stripeCustomerId && (
            <BillingHistory stripeCustomerId={fullUser.stripeCustomerId} />
          )}
        </div>
      )}

      {/* Support Section */}
      {activeSection === 'support' && (
        <div className="space-y-6">
          <BackButton onClick={() => setActiveSection('menu')} label="Settings" />

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Support</h2>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Need Help?</h3>
                  <p className="text-gray-700 mb-4">
                    If you're having trouble or have questions, we're here to help!
                  </p>
                  <a
                    href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Account?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900 font-medium mb-2">This will permanently delete:</p>
              <ul className="text-sm text-red-800 space-y-1 ml-4 list-disc">
                <li>Your account and all settings</li>
                <li>All kid profiles and their PINs</li>
                <li>Your approved music library</li>
                <li>Music requests and history</li>
              </ul>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoComplete="off"
                disabled={deleteLoading}
              />
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700">{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                  setDeleteError('');
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmation !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Forever'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kid Profile Deletion Modal - Now archives for 30 days */}
      {showDeleteKidModal && kidToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete {kidToDelete.name}'s Profile?</h3>
                <p className="text-sm text-gray-600">Can be restored within 30 days</p>
              </div>
            </div>

            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium mb-2">This will archive:</p>
              <ul className="text-sm text-amber-700 space-y-1 ml-4 list-disc">
                <li>Profile settings (name, PIN, time limits)</li>
                <li>All approved songs for this kid</li>
                <li>Their playlists</li>
                <li>Listening history and requests</li>
              </ul>
            </div>

            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You can restore this profile from Settings &gt; Kid Profiles within 30 days.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteKidModal(false);
                  setKidToDelete(null);
                }}
                disabled={deleteKidLoading}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteKidProfile}
                disabled={deleteKidLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleteKidLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Profile'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kid Profile Reset Modal */}
      {showResetKidModal && kidToReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reset {kidToReset.name}'s Profile?</h3>
                <p className="text-sm text-gray-600">Give them a fresh start</p>
              </div>
            </div>

            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 font-medium mb-2">This will permanently delete:</p>
              <ul className="text-sm text-orange-700 space-y-1 ml-4 list-disc">
                <li>All approved songs for this kid</li>
                <li>Their playlists</li>
                <li>Listening history</li>
                <li>Pending requests</li>
                <li>Blocked search history</li>
              </ul>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                The profile (name, PIN, time limits) will be kept. Only the music data is cleared.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetKidModal(false);
                  setKidToReset(null);
                }}
                disabled={resetKidLoading}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleResetKidProfile}
                disabled={resetKidLoading}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetKidLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting...
                  </>
                ) : (
                  'Reset Profile'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Archive Modal */}
      {showRestoreModal && archiveToRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Restore {archiveToRestore.name}'s Profile?</h3>
                <p className="text-sm text-gray-600">Bring back their data</p>
              </div>
            </div>

            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-2">This will restore:</p>
              <ul className="text-sm text-green-700 space-y-1 ml-4 list-disc">
                <li>Profile settings (name, PIN, time limits)</li>
                <li>{archiveToRestore.songCount} approved songs</li>
                <li>{archiveToRestore.playlistCount} playlists</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setArchiveToRestore(null);
                }}
                disabled={restoreLoading}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreProfile}
                disabled={restoreLoading}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {restoreLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Restoring...
                  </>
                ) : (
                  'Restore Profile'
                )}
              </button>
            </div>
          </div>
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
              Your feedback helps us improve SafeTunes:
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
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

      {ToastContainer}
    </div>
  );
}

export default Settings;
