import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../hooks/useAuth';

function KidProfileManager() {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '👦',
    color: 'blue',
    pin: ''
  });
  const [error, setError] = useState('');

  // Convex hooks
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles,
    user ? { userId: user._id } : 'skip'
  );
  const createKidProfile = useMutation(api.kidProfiles.createKidProfile);
  const deleteKidProfile = useMutation(api.kidProfiles.deleteKidProfile);

  const avatarOptions = ['👦', '👧', '🧒', '👶', '🎨', '🎵', '⭐', '🌈', '🦄', '🐶', '🐱', '🐻'];
  const colorOptions = [
    { name: 'blue', class: 'bg-blue-500' },
    { name: 'purple', class: 'bg-purple-500' },
    { name: 'pink', class: 'bg-pink-500' },
    { name: 'green', class: 'bg-green-500' },
    { name: 'orange', class: 'bg-orange-500' },
    { name: 'red', class: 'bg-red-500' },
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in');
      return;
    }

    if (formData.pin.length !== 4 || !/^\d+$/.test(formData.pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    try {
      await createKidProfile({
        userId: user._id,
        name: formData.name,
        avatar: formData.avatar,
        color: formData.color,
        pin: formData.pin,
      });

      // Reset form
      setFormData({
        name: '',
        avatar: '👦',
        color: 'blue',
        pin: ''
      });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to create profile. Please try again.');
      console.error(err);
    }
  };

  const handleDelete = async (profileId) => {
    if (!confirm('Are you sure you want to delete this profile? All approved albums for this child will remain but won\'t be linked to a profile.')) {
      return;
    }

    try {
      await deleteKidProfile({ profileId });
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Kid Profiles</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            + Add Child
          </button>
        )}
      </div>

      {/* Add Kid Form */}
      {showAddForm && (
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Child</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child's Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="e.g., Emma"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avatar
              </label>
              <div className="flex flex-wrap gap-2">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar: emoji })}
                    className={`text-3xl p-3 rounded-lg border-2 transition ${
                      formData.avatar === emoji
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme Color
              </label>
              <div className="flex gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.name })}
                    className={`w-12 h-12 rounded-lg ${color.class} border-4 transition ${
                      formData.color === color.name
                        ? 'border-gray-900 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4-Digit PIN (for child login)
              </label>
              <input
                type="text"
                name="pin"
                required
                maxLength={4}
                value={formData.pin}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="1234"
              />
              <p className="text-xs text-gray-500 mt-1">Your child will use this PIN to access their music player</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition"
              >
                Add Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kid Profiles Grid */}
      {kidProfiles && kidProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kidProfiles.map((profile) => (
            <div
              key={profile._id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-16 h-16 bg-${profile.color}-500 rounded-full flex items-center justify-center text-3xl`}>
                  {profile.avatar}
                </div>
                <button
                  onClick={() => handleDelete(profile._id)}
                  className="text-gray-400 hover:text-red-600 transition"
                  title="Delete profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h3>
              <p className="text-sm text-gray-500">PIN: {profile.pin.replace(/./g, '•')}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No kid profiles yet</h3>
          <p className="text-gray-600 mb-4">Add a profile for each child in your family</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Child
          </button>
        </div>
      )}
    </div>
  );
}

export default KidProfileManager;
