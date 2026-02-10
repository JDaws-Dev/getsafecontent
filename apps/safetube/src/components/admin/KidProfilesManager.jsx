import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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

export default function KidProfilesManager({ userId, kidProfiles }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: 'red', requestsEnabled: true });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const createProfile = useMutation(api.kidProfiles.createKidProfile);
  const updateProfile = useMutation(api.kidProfiles.updateKidProfile);
  const deleteProfile = useMutation(api.kidProfiles.deleteKidProfile);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setIsLoading(true);
    try {
      await createProfile({
        userId,
        name: formData.name.trim(),
        icon: 'none', // No icon, just color
        color: formData.color,
        requestsEnabled: formData.requestsEnabled,
      });
      setFormData({ name: '', color: 'red', requestsEnabled: true });
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim() || !editingId) return;
    setIsLoading(true);
    try {
      await updateProfile({
        profileId: editingId,
        name: formData.name.trim(),
        icon: 'none', // No icon, just color
        color: formData.color,
        requestsEnabled: formData.requestsEnabled,
      });
      setEditingId(null);
      setFormData({ name: '', color: 'red', requestsEnabled: true });
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (profileId, profileName) => {
    setConfirmModal({
      title: 'Delete Profile',
      message: `Delete ${profileName}'s profile? This will also delete all their approved content.`,
      onConfirm: async () => {
        try {
          await deleteProfile({ profileId });
        } catch (err) {
          console.error('Failed to delete profile:', err);
        }
        setConfirmModal(null);
      },
    });
  };

  const startEdit = (profile) => {
    setEditingId(profile._id);
    setFormData({
      name: profile.name,
      color: profile.color || 'red',
      requestsEnabled: profile.requestsEnabled !== false, // default true
    });
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)].id;
    setFormData({ name: '', color: randomColor, requestsEnabled: true });
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', color: 'red', requestsEnabled: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Kid Profiles</h2>
          <p className="text-sm sm:text-base text-gray-600">Create a profile for each of your kids</p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={startCreate}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Profile
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Profile' : 'Create New Profile'}
          </h3>

          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-md ${getColorClass(formData.color)}`}
              >
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm text-gray-500">Preview</p>
                <p className="font-semibold text-gray-900">{formData.name || 'Kid\'s Name'}</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Kid's name"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                maxLength={20}
                autoFocus
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((colorOption) => (
                  <button
                    key={colorOption.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: colorOption.id })}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${colorOption.bg} transition-transform ${
                      formData.color === colorOption.id
                        ? `ring-2 ${colorOption.ring} ring-offset-2 scale-110 shadow-lg`
                        : 'hover:scale-110'
                    }`}
                    title={colorOption.id}
                  />
                ))}
              </div>
            </div>

            {/* Content Settings */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Content Settings</h4>

              {/* Allow Requests Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Allow Content Requests</label>
                  <p className="text-xs text-gray-500">Let this kid search and request videos/channels</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, requestsEnabled: !formData.requestsEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    formData.requestsEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.requestsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={isLoading || !formData.name.trim()}
                className="flex-1 sm:flex-none bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition shadow-md"
              >
                {isLoading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Profile'}
              </button>
              <button
                onClick={cancelForm}
                className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile List */}
      {kidProfiles && kidProfiles.length > 0 ? (
        <div className="grid gap-3 sm:gap-4">
          {kidProfiles.map((profile) => (
            <div
              key={profile._id}
              className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0 shadow-sm ${getColorClass(profile.color)}`}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{profile.name}</h3>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Created {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(profile)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(profile._id, profile.name)}
                  className="bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-sm transition"
                  title="Delete profile"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !isCreating ? (
        <div className="bg-white rounded-xl p-8 sm:p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No profiles yet</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-6">
            Create a profile for each of your kids to get started
          </p>
          <button
            onClick={startCreate}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-medium transition shadow-md"
          >
            Create First Profile
          </button>
        </div>
      ) : null}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title}
        message={confirmModal?.message}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
