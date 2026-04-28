import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Save, X, ChevronDown, ChevronUp, Shield, BookOpen, MessageSquare } from 'lucide-react';

const BLOCKED_TOPIC_OPTIONS = [
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

export default function KidProfileCustomize({ profile, onClose }) {
  const updateProfile = useMutation(api.kidProfiles.updateProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [blockedTopics, setBlockedTopics] = useState(profile.blockedTopics || []);
  const [allowedTopics, setAllowedTopics] = useState(
    (profile.allowedTopics || []).join(', ')
  );
  const [customInstructions, setCustomInstructions] = useState(
    profile.customInstructions || ''
  );
  const [allowImageSearch, setAllowImageSearch] = useState(
    profile.allowImageSearch ?? true
  );
  const [lexileLevel, setLexileLevel] = useState(
    profile.lexileLevel || 'auto'
  );
  const [accessibilityNeeds, setAccessibilityNeeds] = useState(
    profile.accessibilityNeeds || []
  );

  const toggleTopic = (topicId) => {
    setBlockedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : [...prev, topicId]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allowedArray = allowedTopics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await updateProfile({
        kidProfileId: profile._id,
        blockedTopics,
        allowedTopics: allowedArray,
        customInstructions: customInstructions.trim() || undefined,
        allowImageSearch,
        lexileLevel: lexileLevel || 'auto',
        accessibilityNeeds,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('[Customize] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Customize {profile.name}'s Search
            </h2>
            <p className="text-xs text-gray-500">Fine-tune what they can find</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Blocked Topics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Blocked Topics</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              SafeStudy will never show results about these topics.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {BLOCKED_TOPIC_OPTIONS.map((topic) => (
                <label
                  key={topic.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                    blockedTopics.includes(topic.id)
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={blockedTopics.includes(topic.id)}
                    onChange={() => toggleTopic(topic.id)}
                    className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">{topic.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Allowed Topics (Whitelist) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-green-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Allowed Topics</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Override blocked topics for specific subjects. Useful for school projects.
            </p>
            <input
              type="text"
              value={allowedTopics}
              onChange={(e) => { setAllowedTopics(e.target.value); setSaved(false); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-[16px]"
              placeholder="e.g., World War 2 history, human anatomy, chemistry"
            />
            <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
          </div>

          {/* Custom Instructions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Instructions for SafeStudy</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Tell SafeStudy anything about your child that would help it give better answers.
            </p>
            <textarea
              value={customInstructions}
              onChange={(e) => { setCustomInstructions(e.target.value); setSaved(false); }}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[16px] resize-none"
              placeholder="e.g., She's homeschooled and studying biology this semester. She loves dinosaurs and space."
            />
          </div>

          {/* Image Search Toggle */}
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-medium text-gray-900">Image search</p>
              <p className="text-xs text-gray-500">Show images in search results</p>
            </div>
            <button
              type="button"
              onClick={() => { setAllowImageSearch(!allowImageSearch); setSaved(false); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                allowImageSearch ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  allowImageSearch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Lexile Reading Level */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Reading Level</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              What grade does your child read at? SafeStudy adjusts answers to match.
            </p>
            <select
              value={lexileLevel}
              onChange={(e) => { setLexileLevel(e.target.value); setSaved(false); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[16px]"
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

          {/* Accessibility Needs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Accessibility</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              SafeStudy adapts answers for different learning needs.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'dyslexia', label: 'Dyslexia-friendly', desc: 'Shorter sentences, simpler words' },
                { id: 'low-vision', label: 'Low vision', desc: 'Concise answers, works with large text' },
                { id: 'adhd', label: 'ADHD-friendly', desc: 'Engaging hooks, short sections, more fun facts' },
                { id: 'esl', label: 'English learner (ESL)', desc: 'Simple vocabulary, no idioms or slang' },
              ].map((need) => (
                <label
                  key={need.id}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                    accessibilityNeeds.includes(need.id)
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={accessibilityNeeds.includes(need.id)}
                    onChange={() => {
                      setAccessibilityNeeds((prev) =>
                        prev.includes(need.id)
                          ? prev.filter((n) => n !== need.id)
                          : [...prev, need.id]
                      );
                      setSaved(false);
                    }}
                    className="w-4 h-4 mt-0.5 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm text-gray-900 font-medium">{need.label}</span>
                    <p className="text-xs text-gray-500">{need.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition active:scale-[0.98] ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
            } disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
