import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Save, ChevronDown, ChevronUp, Shield, BookOpen, MessageSquare, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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

const BLOCKED_TOPICS = [
  { id: 'violence', label: 'Violence & weapons' },
  { id: 'drugs', label: 'Drugs & alcohol' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'profanity', label: 'Profanity & hate speech' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'self-harm', label: 'Self-harm' },
  { id: 'weapons', label: 'Weapon instructions' },
  { id: 'horror', label: 'Horror & scary content' },
  { id: 'dating', label: 'Dating & relationships' },
  { id: 'aesthetic-browsing', label: 'Aesthetic / Pinterest browsing' },
  { id: 'self-image', label: 'Self-image & “am I pretty” queries' },
  { id: 'appearance', label: 'Appearance, hair & fashion' },
  { id: 'celebrities', label: 'Celebrity gossip' },
];

// Default blocked topics for new profiles. aesthetic-browsing + self-image
// are default-on because they're a known harm vector for tweens (per Apr 2026 audit).
const DEFAULT_BLOCKED = [
  'violence', 'drugs', 'sexual', 'profanity', 'self-harm', 'weapons',
  'aesthetic-browsing', 'self-image',
];

function getStrictnessFromAge(age) {
  if (age <= 7) return 'strict';
  if (age <= 12) return 'moderate';
  return 'light';
}

function getReadingLevelFromAge(age) {
  if (age <= 5) return 'K';
  if (age <= 6) return '1st';
  if (age <= 7) return '2nd';
  if (age <= 8) return '3rd';
  if (age <= 9) return '4th';
  if (age <= 10) return '5th';
  if (age <= 11) return '6th';
  if (age <= 12) return '7th';
  if (age <= 13) return '8th';
  if (age <= 14) return '9th';
  if (age <= 15) return '10th';
  if (age <= 16) return '11th';
  return '12th';
}

export default function KidProfileEditor({ profile, userId, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(!!profile);

  const { token } = useAuth();
  const createProfile = useMutation(api.kidProfiles.createProfile);
  const updateProfile = useMutation(api.kidProfiles.updateProfile);

  // Basic fields
  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [color, setColor] = useState('blue');

  // Advanced fields
  const [blockedTopics, setBlockedTopics] = useState(DEFAULT_BLOCKED);
  const [allowedTopics, setAllowedTopics] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [lexileLevel, setLexileLevel] = useState('auto');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState([]);
  // Default OFF (Apr 2026): image search is the main Pinterest-substitute affordance
  const [allowImageSearch, setAllowImageSearch] = useState(false);
  const [allowTopicRequests, setAllowTopicRequests] = useState(true);
  const [pin, setPin] = useState('');
  const [pinEnabled, setPinEnabled] = useState(false);

  // Track whether user has manually chosen a reading level
  const [manualLexile, setManualLexile] = useState(false);

  // Auto-set reading level when age changes (only if user hasn't manually chosen)
  useEffect(() => {
    if (!manualLexile) {
      setLexileLevel(getReadingLevelFromAge(age));
    }
  }, [age]); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate when editing
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.ageRange?.min || 8);
      setColor(profile.color || 'blue');
      setBlockedTopics(profile.blockedTopics || DEFAULT_BLOCKED);
      setAllowedTopics((profile.allowedTopics || []).join(', '));
      setCustomInstructions(profile.customInstructions || '');
      setLexileLevel(profile.lexileLevel || 'auto');
      setManualLexile(!!profile.lexileLevel && profile.lexileLevel !== 'auto');
      setAccessibilityNeeds(profile.accessibilityNeeds || []);
      setAllowImageSearch(profile.allowImageSearch ?? true);
      setAllowTopicRequests(profile.allowTopicRequests ?? true);
      setPin(''); // PIN is never returned from server; parent sets a new one if needed
      setPinEnabled(!!profile.hasPin);
    }
  }, [profile]);

  const toggleBlockedTopic = (id) => {
    setBlockedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleAccessibility = (id) => {
    setAccessibilityNeeds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter a name.'); return; }
    if (pinEnabled && pin.length !== 4) { setError('PIN must be exactly 4 digits.'); return; }

    setSaving(true);
    try {
      const allowedArray = allowedTopics.split(',').map((t) => t.trim()).filter(Boolean);

      const data = {
        name: name.trim(),
        color,
        ageRange: { min: age, max: age },
        contentStrictness: getStrictnessFromAge(age),
        blockedTopics,
        allowedTopics: allowedArray,
        customInstructions: customInstructions.trim() || undefined,
        lexileLevel,
        accessibilityNeeds,
        allowImageSearch,
        allowFollowUp: true,
        pin: pinEnabled && pin.length === 4 ? pin : '',
      };

      if (profile) {
        await updateProfile({ kidProfileId: profile._id, ...data, userToken: token ?? undefined });
      } else {
        await createProfile({ userId, ...data, userToken: token ?? undefined });
      }
      onSave();
    } catch (err) {
      console.error('[KidProfileEditor] Save error:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {profile ? `Edit ${profile.name}` : 'Add Kid'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {/* Live preview */}
          <div className="flex flex-col items-center py-2">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md ${COLORS.find((c) => c.name === color)?.class || 'bg-blue-500'}`}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </div>
            {name && <p className="mt-2 font-semibold text-gray-900">{name}</p>}
            <p className="text-xs text-gray-500">Age {age} · {getStrictnessFromAge(age)} filtering</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px]"
              placeholder="Kid's name"
              required
              autoFocus
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAge(Math.max(4, age - 1))} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition active:scale-95">−</button>
              <input
                type="number"
                min={4}
                max={18}
                value={age}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setAge(Math.min(18, Math.max(4, val)));
                  else if (e.target.value === '') setAge(4);
                }}
                className="text-3xl font-bold text-gray-900 w-16 text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button type="button" onClick={() => setAge(Math.min(18, age + 1))} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition active:scale-95">+</button>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-9 h-9 rounded-full ${c.class} transition ring-offset-2 ${color === c.name ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                />
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition"
          >
            <span>More options</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Advanced section */}
          {showAdvanced && (
            <div className="space-y-5 pt-1">
              {/* Reading Level */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  <label className="text-sm font-medium text-gray-700">Reading Level</label>
                </div>
                <select
                  value={lexileLevel}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'auto') {
                      setManualLexile(false);
                      setLexileLevel(getReadingLevelFromAge(age));
                    } else {
                      setManualLexile(true);
                      setLexileLevel(val);
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[16px]"
                >
                  <option value="auto">Auto (based on age)</option>
                  <option value="K">Kindergarten</option>
                  <option value="1st">1st Grade</option>
                  <option value="2nd">2nd Grade</option>
                  <option value="3rd">3rd Grade</option>
                  <option value="4th">4th Grade</option>
                  <option value="5th">5th Grade</option>
                  <option value="6th">6th Grade</option>
                  <option value="7th">7th Grade</option>
                  <option value="8th">8th Grade</option>
                  <option value="9th">9th Grade</option>
                  <option value="10th">10th Grade</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                </select>
              </div>

              {/* Blocked Topics */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <label className="text-sm font-medium text-gray-700">Blocked Topics</label>
                </div>
                <p className="text-xs text-gray-500 mb-2">SafeStudy won't show results about these. Kids can request access if enabled below.</p>
                <div className="grid grid-cols-1 gap-1">
                  {BLOCKED_TOPICS.map((topic) => (
                    <label key={topic.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ${blockedTopics.includes(topic.id) ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-100'}`}>
                      <input type="checkbox" checked={blockedTopics.includes(topic.id)} onChange={() => toggleBlockedTopic(topic.id)} className="w-4 h-4 text-red-500 rounded" />
                      <span className="text-gray-700">{topic.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Topic Request Toggle */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow topic requests</p>
                  <p className="text-xs text-gray-500">Kids can ask permission for blocked topics</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowTopicRequests(!allowTopicRequests)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${allowTopicRequests ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${allowTopicRequests ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Allowed Topics */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-green-500" />
                  <label className="text-sm font-medium text-gray-700">Allowed Topics</label>
                </div>
                <p className="text-xs text-gray-500 mb-1">Override blocked topics for school projects or specific interests.</p>
                <input
                  type="text"
                  value={allowedTopics}
                  onChange={(e) => setAllowedTopics(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-[16px]"
                  placeholder="e.g., World War 2, human anatomy"
                />
                <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
              </div>

              {/* Custom Instructions */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <label className="text-sm font-medium text-gray-700">Instructions for SafeStudy</label>
                </div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px] resize-none"
                  placeholder="e.g., She's homeschooled, studying biology. Loves dinosaurs."
                />
              </div>

              {/* Accessibility */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Accessibility</label>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: 'dyslexia', label: 'Dyslexia-friendly', desc: 'Shorter sentences, simpler words' },
                    { id: 'adhd', label: 'ADHD-friendly', desc: 'Engaging hooks, short sections' },
                    { id: 'esl', label: 'English learner', desc: 'Simple vocabulary, no idioms' },
                    { id: 'low-vision', label: 'Low vision', desc: 'Concise, works with large text' },
                  ].map((need) => (
                    <label key={need.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ${accessibilityNeeds.includes(need.id) ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-gray-100'}`}>
                      <input type="checkbox" checked={accessibilityNeeds.includes(need.id)} onChange={() => toggleAccessibility(need.id)} className="w-4 h-4 mt-0.5 text-indigo-500 rounded" />
                      <div>
                        <span className="text-gray-900 font-medium">{need.label}</span>
                        <p className="text-xs text-gray-500">{need.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Image Search Toggle */}
              <div className="px-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Image search</p>
                    <p className="text-xs text-gray-500">Show images in results</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowImageSearch(!allowImageSearch)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${allowImageSearch ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${allowImageSearch ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {allowImageSearch && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-2">
                    Heads up: image search can turn SafeStudy into a Pinterest-style mood-board tool. Recommended off for tweens.
                  </p>
                )}
              </div>

              {/* Kid PIN */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <label className="text-sm font-medium text-gray-700">Kid PIN</label>
                </div>
                <p className="text-xs text-gray-500 mb-2">Optional — prevents other kids from accessing this profile</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setPinEnabled(!pinEnabled); if (pinEnabled) setPin(''); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition flex-shrink-0 ${pinEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${pinEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  {pinEnabled ? (
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPin(v); }}
                      placeholder="4-digit PIN"
                      className="w-32 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-[16px]"
                    />
                  ) : (
                    <span className="text-sm text-gray-400">No PIN</span>
                  )}
                </div>
                {pinEnabled && pin.length > 0 && pin.length < 4 && (
                  <p className="text-xs text-amber-600 mt-1">PIN must be 4 digits</p>
                )}
              </div>
            </div>
          )}

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
            <button type="button" onClick={onClose} className="px-5 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-medium transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
