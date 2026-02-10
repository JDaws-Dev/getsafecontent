import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Color constants
const COLORS = [
  { id: 'red', bg: 'bg-red-500', ring: 'ring-red-400' },
  { id: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-400' },
  { id: 'yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-400' },
  { id: 'green', bg: 'bg-green-500', ring: 'ring-green-400' },
  { id: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-400' },
  { id: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-400' },
  { id: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-400' },
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

// Confirm Modal component
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
          >
            Delete
          </button>
        </div>
      </div>
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

// Expandable Kid Card component - simplified with inline editing
function KidCard({ kid, userId, allTimeLimits, recentHistory, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Combined form state for profile AND time limits
  const [form, setForm] = useState({
    name: kid.name,
    color: kid.color || 'red',
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

  const updateProfile = useMutation(api.kidProfiles.updateKidProfile);
  const setTimeLimit = useMutation(api.timeLimits.setTimeLimit);
  const deleteTimeLimit = useMutation(api.timeLimits.deleteTimeLimit);

  // Get current time limit data
  const timeLimit = allTimeLimits?.find(t => t.kidProfileId === kid._id);
  const kidHistory = recentHistory?.filter(h => h.kidProfileId === kid._id) || [];

  // Initialize form when expanded
  useEffect(() => {
    if (isExpanded) {
      setForm({
        name: kid.name,
        color: kid.color || 'red',
        requestsEnabled: kid.requestsEnabled !== false,
        shortsEnabled: kid.shortsEnabled !== false,
        videoPaused: kid.videoPaused === true,
        dailyLimitMinutes: timeLimit?.limit?.dailyLimitMinutes ?? 60,
        weekendLimitMinutes: timeLimit?.limit?.weekendLimitMinutes,
        allowedStartHour: timeLimit?.limit?.allowedStartHour,
        allowedEndHour: timeLimit?.limit?.allowedEndHour,
        hasTimeLimit: !!timeLimit?.limit,
        hasTimeWindow: timeLimit?.limit?.allowedStartHour !== undefined,
        hasWeekendLimit: timeLimit?.limit?.weekendLimitMinutes !== undefined,
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
    setSaving(true);
    try {
      // Save profile settings
      await updateProfile({
        profileId: kid._id,
        name: form.name.trim(),
        icon: 'none',
        color: form.color,
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
      } else if (timeLimit?.limit) {
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getColorClass(kid.color)}`}>
              {kid.name.charAt(0).toUpperCase()}
            </div>
            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{kid.name}</h3>
                {kid.videoPaused && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">Paused</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                <span>{timeLimit?.limit ? formatMinutes(timeLimit.limit.dailyLimitMinutes) : 'No limit'}</span>
                <span>•</span>
                <span>{kid.shortsEnabled !== false ? 'Shorts on' : 'Shorts off'}</span>
              </div>
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
        <div className="border-t border-gray-100 p-4 space-y-6">

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((colorOption) => (
                  <button
                    key={colorOption.id}
                    type="button"
                    onClick={() => updateForm({ color: colorOption.id })}
                    className={`w-8 h-8 rounded-full ${colorOption.bg} transition-transform ${
                      form.color === colorOption.id
                        ? `ring-2 ${colorOption.ring} ring-offset-2 scale-110`
                        : 'hover:scale-110'
                    }`}
                  />
                ))}
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

// Main KidsManager component
export default function KidsManager({ userId, kidProfiles }) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: 'red' });

  const createProfile = useMutation(api.kidProfiles.createKidProfile);
  const deleteProfile = useMutation(api.kidProfiles.deleteKidProfile);

  // Get recent watch history
  const recentHistory = useQuery(
    api.watchHistory.getRecentHistory,
    userId ? { userId, limit: 50 } : 'skip'
  );

  const allTimeLimits = useQuery(
    api.timeLimits.getAllTimeLimits,
    userId ? { userId } : 'skip'
  );

  const handleCreate = async () => {
    if (!formData.name.trim() || !userId) return;
    setIsLoading(true);
    try {
      await createProfile({
        userId,
        name: formData.name.trim(),
        color: formData.color,
      });
      setFormData({ name: '', color: 'red' });
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmModal) return;
    setIsLoading(true);
    try {
      await deleteProfile({ profileId: confirmModal.id });
      setConfirmModal(null);
    } catch (err) {
      console.error('Failed to delete profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kid Profiles</h2>
          <p className="text-sm text-gray-500">Manage profiles and settings for each child</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium text-sm transition"
          >
            + Add Kid
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Create new profile form */}
        {isCreating && (
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-200">
            <h3 className="font-medium text-gray-900 mb-4">New Kid Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                      onClick={() => setFormData({ ...formData, color: colorOption.id })}
                      className={`w-8 h-8 rounded-full ${colorOption.bg} transition-transform ${
                        formData.color === colorOption.id
                          ? `ring-2 ${colorOption.ring} ring-offset-2 scale-110`
                          : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={isLoading || !formData.name.trim()}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {isLoading ? 'Creating...' : 'Create Profile'}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ name: '', color: 'red' });
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing profiles */}
        {kidProfiles && kidProfiles.length > 0 ? (
          <div className="space-y-3">
            {kidProfiles.map((kid) => (
              <KidCard
                key={kid._id}
                kid={kid}
                userId={userId}
                allTimeLimits={allTimeLimits}
                recentHistory={recentHistory}
                onDelete={(id, name) => setConfirmModal({ id, name })}
              />
            ))}
          </div>
        ) : (
          !isCreating && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Kids Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Add a profile for each child to get started</p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium text-sm transition"
              >
                Add Your First Kid
              </button>
            </div>
          )
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!confirmModal}
        title="Delete Profile?"
        message={`Delete ${confirmModal?.name}'s profile? This will also delete all their approved content and watch history.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
