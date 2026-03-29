import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Save } from 'lucide-react';

const COLORS = [
  { name: 'red', class: 'bg-red-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'yellow', class: 'bg-yellow-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'cyan', class: 'bg-cyan-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'teal', class: 'bg-teal-500' },
];

const ICONS = ['🧒', '👦', '👧', '🧒🏻', '👦🏻', '👧🏻', '🧒🏽', '👦🏽', '👧🏽', '🧒🏿', '👦🏿', '👧🏿', '🦊', '🐱', '🐶', '🐰', '🦁', '🐼', '🐨', '🦄'];

const BLOCKED_TOPIC_OPTIONS = [
  { id: 'violence', label: 'Violence & weapons' },
  { id: 'drugs', label: 'Drugs & alcohol' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'profanity', label: 'Profanity & hate speech' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'self-harm', label: 'Self-harm & eating disorders' },
  { id: 'weapons', label: 'Weapon instructions' },
];

const STRICTNESS_OPTIONS = [
  {
    value: 'strict',
    label: 'Strict',
    description: 'Only educational and known kid-safe sources. Best for ages 4-8.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Broad results with AI filtering. Good for ages 8-13.',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Most results allowed, explicit content blocked. Best for ages 13+.',
  },
];

export default function KidProfileEditor({ profile, userId, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createProfile = useMutation(api.kidProfiles.createProfile);
  const updateProfile = useMutation(api.kidProfiles.updateProfile);

  const [formData, setFormData] = useState({
    name: '',
    color: 'blue',
    icon: '🧒',
    ageMin: 6,
    ageMax: 12,
    strictness: 'moderate',
    blockedTopics: ['violence', 'drugs', 'sexual', 'profanity', 'self-harm', 'weapons'],
    customBlockedTopics: '',
    allowImageSearch: true,
    allowFollowUpQuestions: true,
  });

  // Populate form when editing
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        color: profile.color || 'blue',
        icon: profile.icon || '🧒',
        ageMin: profile.ageMin ?? 6,
        ageMax: profile.ageMax ?? 12,
        strictness: profile.strictness || 'moderate',
        blockedTopics: profile.blockedTopics || ['violence', 'drugs', 'sexual', 'profanity', 'self-harm', 'weapons'],
        customBlockedTopics: profile.customBlockedTopics?.join(', ') || '',
        allowImageSearch: profile.allowImageSearch ?? true,
        allowFollowUpQuestions: profile.allowFollowUpQuestions ?? true,
      });
    }
  }, [profile]);

  const handleBlockedTopicToggle = (topicId) => {
    setFormData(prev => ({
      ...prev,
      blockedTopics: prev.blockedTopics.includes(topicId)
        ? prev.blockedTopics.filter(t => t !== topicId)
        : [...prev.blockedTopics, topicId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter a name.');
      return;
    }

    setSaving(true);

    try {
      const customTopics = formData.customBlockedTopics
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const allBlockedTopics = [...formData.blockedTopics, ...customTopics];

      const data = {
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
        ageRange: { min: formData.ageMin, max: formData.ageMax },
        contentStrictness: formData.strictness,
        blockedTopics: allBlockedTopics,
        allowImageSearch: formData.allowImageSearch,
        allowFollowUp: formData.allowFollowUpQuestions,
      };

      if (profile) {
        await updateProfile({ kidProfileId: profile._id, ...data });
      } else {
        await createProfile({ userId, ...data });
      }

      onSave();
    } catch (err) {
      console.error('[KidProfileEditor] Save error:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {profile ? 'Edit Profile' : 'New Profile'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Kid's name"
              required
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.name }))}
                  className={`w-9 h-9 rounded-full ${color.class} transition ring-offset-2 ${
                    formData.color === color.name ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition ${
                    formData.icon === icon
                      ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                      : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age Range: {formData.ageMin} - {formData.ageMax}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minimum Age</label>
                <input
                  type="range"
                  min={4}
                  max={18}
                  value={formData.ageMin}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      ageMin: val,
                      ageMax: Math.max(val, prev.ageMax),
                    }));
                  }}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>4</span>
                  <span>18</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Maximum Age</label>
                <input
                  type="range"
                  min={4}
                  max={18}
                  value={formData.ageMax}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      ageMax: val,
                      ageMin: Math.min(val, prev.ageMin),
                    }));
                  }}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>4</span>
                  <span>18</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Strictness */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content Strictness</label>
            <div className="space-y-2">
              {STRICTNESS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    formData.strictness === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="strictness"
                    value={option.value}
                    checked={formData.strictness === option.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, strictness: e.target.value }))}
                    className="mt-0.5 w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Blocked Topics */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Blocked Topics</label>
            <div className="space-y-2">
              {BLOCKED_TOPIC_OPTIONS.map((topic) => (
                <label
                  key={topic.id}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.blockedTopics.includes(topic.id)}
                    onChange={() => handleBlockedTopicToggle(topic.id)}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{topic.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">
                Custom blocked topics (comma-separated)
              </label>
              <input
                type="text"
                value={formData.customBlockedTopics}
                onChange={(e) => setFormData(prev => ({ ...prev, customBlockedTopics: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., dating, social media, horror"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Allow image search</span>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, allowImageSearch: !prev.allowImageSearch }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  formData.allowImageSearch ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    formData.allowImageSearch ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Allow follow-up questions</span>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, allowFollowUpQuestions: !prev.allowFollowUpQuestions }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  formData.allowFollowUpQuestions ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    formData.allowFollowUpQuestions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 rounded-xl font-medium transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : profile ? 'Save Changes' : 'Create Profile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
