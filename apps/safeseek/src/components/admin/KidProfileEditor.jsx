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
];

// Auto-determine strictness from age
function getStrictnessFromAge(age) {
  if (age <= 7) return 'strict';
  if (age <= 12) return 'moderate';
  return 'light';
}

// Default blocked topics — always block these
const DEFAULT_BLOCKED_TOPICS = ['violence', 'drugs', 'sexual', 'profanity', 'self-harm', 'weapons'];

export default function KidProfileEditor({ profile, userId, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createProfile = useMutation(api.kidProfiles.createProfile);
  const updateProfile = useMutation(api.kidProfiles.updateProfile);

  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [color, setColor] = useState('blue');

  // Populate form when editing
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.ageRange?.min || profile.ageRange?.max || 8);
      setColor(profile.color || 'blue');
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }

    setSaving(true);

    try {
      const data = {
        name: name.trim(),
        color,
        ageRange: { min: age, max: age },
        contentStrictness: getStrictnessFromAge(age),
        blockedTopics: DEFAULT_BLOCKED_TOPICS,
        allowImageSearch: true,
        allowFollowUp: true,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {profile ? 'Edit Profile' : 'Add Kid'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Preview */}
          <div className="flex flex-col items-center py-2">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md ${COLORS.find(c => c.name === color)?.class || 'bg-blue-500'}`}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </div>
            {name && <p className="mt-2 font-semibold text-gray-900">{name}</p>}
            {age && <p className="text-xs text-gray-500">Age {age}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
              placeholder="Kid's name"
              required
              autoFocus
            />
          </div>

          {/* Age — simple number picker */}
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAge(Math.max(4, age - 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition active:scale-95"
              >
                −
              </button>
              <span className="text-3xl font-bold text-gray-900 w-12 text-center">{age}</span>
              <button
                type="button"
                onClick={() => setAge(Math.min(18, age + 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition active:scale-95"
              >
                +
              </button>
              <span className="text-xs text-gray-400 ml-2">
                {getStrictnessFromAge(age) === 'strict' && 'Strict filtering'}
                {getStrictnessFromAge(age) === 'moderate' && 'Moderate filtering'}
                {getStrictnessFromAge(age) === 'light' && 'Light filtering'}
              </span>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-9 h-9 rounded-full ${c.class} transition ring-offset-2 ${
                    color === c.name ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 rounded-xl font-medium transition active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : profile ? 'Save' : 'Add Kid'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
