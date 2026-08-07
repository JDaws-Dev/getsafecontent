import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, ArrowRight, ArrowLeft, Copy, Check, Sparkles,
  LayoutDashboard, UserPlus, ExternalLink, Shield,
  ChevronDown, Minus, Plus,
} from 'lucide-react';

const COLORS = [
  { name: 'red', bg: 'bg-red-500', ring: 'ring-red-400' },
  { name: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-400' },
  { name: 'yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-400' },
  { name: 'green', bg: 'bg-green-500', ring: 'ring-green-400' },
  { name: 'blue', bg: 'bg-accent-500', ring: 'ring-accent-400' },
  { name: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-400' },
  { name: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-400' },
  { name: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-400' },
];

const ALL_BLOCKED_TOPICS = [
  { id: 'violence', label: 'Violence & Gore', desc: 'Graphic violence, war details, abuse' },
  { id: 'drugs', label: 'Drugs & Alcohol', desc: 'Substance use, drug culture' },
  { id: 'sexual', label: 'Sexual Content', desc: 'Sexual themes, explicit material' },
  { id: 'profanity', label: 'Profanity', desc: 'Swearing, vulgar language' },
  { id: 'self-harm', label: 'Self-Harm', desc: 'Self-injury, suicide content' },
  { id: 'weapons', label: 'Weapons', desc: 'Guns, knives, weapon instructions' },
  { id: 'gambling', label: 'Gambling', desc: 'Betting, casino, lottery' },
  { id: 'horror', label: 'Horror & Disturbing', desc: 'Scary imagery, disturbing content' },
  { id: 'dating', label: 'Dating & Romance', desc: 'Romantic relationships, dating culture' },
  { id: 'aesthetic-browsing', label: 'Aesthetic / Pinterest', desc: 'Mood-board browsing, "X aesthetic collage" queries' },
  { id: 'self-image', label: 'Self-Image', desc: '"Am I pretty," face shape, attractiveness self-eval' },
  { id: 'appearance', label: 'Appearance & Fashion', desc: 'Hair colors, makeup, outfits — block if obsessive' },
  { id: 'celebrities', label: 'Celebrity Gossip', desc: 'Celebrity personal life, scandals, dating' },
];

const GRADE_OPTIONS = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' },
];

const ACCESSIBILITY_OPTIONS = [
  { id: 'dyslexia', label: 'Dyslexia', desc: 'Simpler sentence structure, phonetic-friendly' },
  { id: 'adhd', label: 'ADHD', desc: 'Shorter answers, bullet points, clear structure' },
  { id: 'esl', label: 'ESL / English Learner', desc: 'Simpler vocabulary, clearer explanations' },
  { id: 'low-vision', label: 'Low Vision', desc: 'Larger text prompts, high-contrast friendly' },
];

function gradeFromAge(age) {
  if (age <= 5) return 'K';
  if (age >= 18) return '12';
  return String(age - 5);
}

function strictnessFromAge(age) {
  if (age <= 7) return 'strict';
  if (age <= 12) return 'moderate';
  return 'light';
}

const TOTAL_STEPS = 7;

// --- Step Indicator ---
function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-8 h-2.5 bg-accent-500'
              : i < current
                ? 'w-2.5 h-2.5 bg-accent-400'
                : 'w-2.5 h-2.5 bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// --- Navigation Buttons ---
function NavButtons({ onBack, onNext, nextLabel = 'Next', nextDisabled = false, loading = false, showBack = true }) {
  return (
    <div className="flex gap-3 mt-8">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-2xl transition active:scale-[0.97] min-w-[100px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-300 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-accent-200 transition-all active:scale-[0.97]"
      >
        {loading ? 'Saving...' : nextLabel}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  );
}

// --- Step 1: Welcome ---
function WelcomeStep({ onNext }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 animate-fadeIn">
      <div className="w-24 h-24 rounded-3xl bg-accent-500 flex items-center justify-center shadow-lg shadow-accent-200 mb-8">
        <Search className="w-12 h-12 text-white" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        Welcome to SafeStudy!
      </h1>
      <p className="text-lg text-gray-600 max-w-md mb-2">
        SafeStudy is an AI-powered search engine built for kids. Every answer is filtered, age-appropriate, and explained at your child's reading level.
      </p>
      <p className="text-base text-gray-500 max-w-sm mb-10">
        Let's set up a safe experience for your kids.
      </p>

      <button
        onClick={onNext}
        className="flex items-center gap-3 px-10 py-4 bg-accent-500 hover:bg-accent-600 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-accent-200 transition-all active:scale-[0.97]"
      >
        Get Started
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// --- Step 2: Name, Age & Color ---
function NameAgeStep({ data, onChange, onNext, onBack }) {
  const { name, age, color } = data;
  const selectedColor = COLORS.find((c) => c.name === color);
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }
    setError('');
    onNext();
  };

  return (
    <div className="px-6 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Who will be using SafeStudy?
        </h1>
        <p className="text-gray-500">Create a profile for your child</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 text-center">
          {error}
        </div>
      )}

      {/* Live Preview */}
      <div className="flex flex-col items-center mb-8">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg transition-all duration-300 ${selectedColor?.bg || 'bg-accent-500'}`}
        >
          {initial}
        </div>
        {name && (
          <p className="mt-3 text-lg font-semibold text-gray-900">{name}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">Age {age}</p>
      </div>

      {/* Name Input */}
      <div className="mb-6">
        <label htmlFor="kidName" className="block text-sm font-medium text-gray-700 mb-2">
          Name
        </label>
        <input
          id="kidName"
          type="text"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-lg"
          placeholder="Your child's name"
          autoFocus
        />
      </div>

      {/* Age Stepper */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Age
        </label>
        <div className="flex items-center gap-4 justify-center">
          <button
            type="button"
            onClick={() => onChange({ age: Math.max(4, age - 1) })}
            className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-2xl transition active:scale-90 flex items-center justify-center"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-5xl font-bold text-gray-900 w-20 text-center tabular-nums">
            {age}
          </span>
          <button
            type="button"
            onClick={() => onChange({ age: Math.min(18, age + 1) })}
            className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-2xl transition active:scale-90 flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Color Picker */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Pick a color
        </label>
        <div className="flex gap-3 justify-center flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onChange({ color: c.name })}
              className={`w-11 h-11 rounded-full ${c.bg} transition-all ring-offset-2 ${
                color === c.name
                  ? 'ring-3 ring-accent-500 scale-110 shadow-md'
                  : 'hover:scale-105'
              }`}
              aria-label={c.name}
            />
          ))}
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} showBack />
    </div>
  );
}

// --- Step 3: Reading Level ---
function ReadingLevelStep({ data, onChange, onNext, onBack }) {
  const { name, age, readingLevel, autoReadingLevel } = data;
  const displayName = name || 'your child';

  const handleAutoToggle = () => {
    const newAuto = !autoReadingLevel;
    onChange({
      autoReadingLevel: newAuto,
      readingLevel: newAuto ? gradeFromAge(age) : readingLevel,
    });
  };

  const handleGradeChange = (value) => {
    onChange({ readingLevel: value, autoReadingLevel: false });
  };

  return (
    <div className="px-6 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          What grade does {displayName} read at?
        </h1>
        <p className="text-gray-500">SafeStudy adjusts all answers to match this level</p>
      </div>

      {/* Auto Option */}
      <button
        type="button"
        onClick={handleAutoToggle}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 mb-4 transition ${
          autoReadingLevel
            ? 'border-accent-500 bg-accent-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="text-left">
          <p className="font-semibold text-gray-900">Auto (based on age)</p>
          <p className="text-sm text-gray-500">
            Age {age} = {GRADE_OPTIONS.find(g => g.value === gradeFromAge(age))?.label || gradeFromAge(age)}
          </p>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
          autoReadingLevel ? 'border-accent-500 bg-accent-500' : 'border-gray-300'
        }`}>
          {autoReadingLevel && <Check className="w-4 h-4 text-white" />}
        </div>
      </button>

      {/* Grade Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or choose a specific grade
        </label>
        <div className="relative">
          <select
            value={readingLevel}
            onChange={(e) => handleGradeChange(e.target.value)}
            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-12"
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-accent-50 border border-accent-100 rounded-xl px-4 py-3 text-sm text-accent-700 mb-2">
        Answers, vocabulary, and explanations will be written at a {GRADE_OPTIONS.find(g => g.value === readingLevel)?.label || readingLevel} reading level.
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

// --- Step 4: Content Safety ---
function ContentSafetyStep({ data, onChange, onNext, onBack }) {
  const { name, blockedTopics, allowTopicRequests } = data;
  const displayName = name || 'your child';

  const toggleTopic = (topicId) => {
    const newTopics = blockedTopics.includes(topicId)
      ? blockedTopics.filter((t) => t !== topicId)
      : [...blockedTopics, topicId];
    onChange({ blockedTopics: newTopics });
  };

  const allChecked = blockedTopics.length === ALL_BLOCKED_TOPICS.length;

  const toggleAll = () => {
    onChange({
      blockedTopics: allChecked ? [] : ALL_BLOCKED_TOPICS.map((t) => t.id),
    });
  };

  return (
    <div className="px-6 py-8 animate-fadeIn">
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          What should {displayName} be protected from?
        </h1>
        <p className="text-gray-500">Choose which topics to block in search results</p>
      </div>

      {/* Select All */}
      <button
        type="button"
        onClick={toggleAll}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl mb-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
      >
        <span>{allChecked ? 'Deselect all' : 'Select all'}</span>
        <Shield className="w-4 h-4 text-accent-500" />
      </button>

      {/* Topic Checkboxes */}
      <div className="space-y-2 mb-4 max-h-[280px] overflow-y-auto pr-1">
        {ALL_BLOCKED_TOPICS.map((topic) => {
          const checked = blockedTopics.includes(topic.id);
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => toggleTopic(topic.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                checked
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition ${
                checked ? 'border-accent-500 bg-accent-500' : 'border-gray-300'
              }`}>
                {checked && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{topic.label}</p>
                <p className="text-xs text-gray-400 truncate">{topic.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">
        We recommend keeping all of these blocked. You can always adjust later from the dashboard.
      </p>

      {/* Allow Topic Requests Toggle */}
      <div className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl px-4 py-4 mb-2">
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">
            Allow {displayName} to request blocked topics
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            If they search for something blocked, they can ask you for permission instead of seeing nothing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ allowTopicRequests: !allowTopicRequests })}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
            allowTopicRequests ? 'bg-accent-500' : 'bg-gray-300'
          }`}
        >
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
            allowTopicRequests ? 'translate-x-5.5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

// --- Step 5: Accessibility ---
function AccessibilityStep({ data, onChange, onNext, onBack }) {
  const { name, accessibilityNeeds } = data;
  const displayName = name || 'your child';

  const toggleNeed = (needId) => {
    const newNeeds = accessibilityNeeds.includes(needId)
      ? accessibilityNeeds.filter((n) => n !== needId)
      : [...accessibilityNeeds, needId];
    onChange({ accessibilityNeeds: newNeeds });
  };

  return (
    <div className="px-6 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Does {displayName} have any learning differences?
        </h1>
        <p className="text-gray-500">SafeStudy adapts answers for each of these</p>
      </div>

      <div className="space-y-3 mb-6">
        {ACCESSIBILITY_OPTIONS.map((option) => {
          const checked = accessibilityNeeds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleNeed(option.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition ${
                checked
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-6 h-6 rounded flex-shrink-0 border-2 flex items-center justify-center transition ${
                checked ? 'border-accent-500 bg-accent-500' : 'border-gray-300'
              }`}>
                {checked && <Check className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-2xl transition active:scale-[0.97] min-w-[100px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-accent-200 transition-all active:scale-[0.97]"
        >
          {accessibilityNeeds.length === 0 ? 'Skip' : 'Next'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// --- Step 6: Family Code ---
function FamilyCodeStep({ data, familyCode, onNext, onBack, saving, error }) {
  const [copied, setCopied] = useState(false);
  const displayName = data.name || 'your child';

  const copyCode = useCallback(async () => {
    if (!familyCode) return;
    try {
      await navigator.clipboard.writeText(familyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback - code is visible
    }
  }, [familyCode]);

  return (
    <div className="px-6 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Share this code with {displayName}
        </h1>
        <p className="text-gray-500">They enter this at the search page to start</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 text-center">
          {error}
        </div>
      )}

      {/* Family Code Display */}
      <div className="bg-accent-50 border-2 border-accent-200 rounded-2xl p-6 sm:p-8 mb-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl sm:text-5xl font-bold text-accent-600 tracking-[0.25em] font-mono">
            {familyCode || '------'}
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-accent-50 border border-accent-200 text-accent-600 rounded-xl font-medium transition active:scale-95 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-2">
        <p className="text-sm text-gray-600 mb-3">
          They enter this code at:
        </p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <ExternalLink className="w-4 h-4 text-accent-500 flex-shrink-0" />
          <code className="text-accent-600 font-mono font-semibold text-sm sm:text-base">
            getsafestudy.com/search
          </code>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          They'll pick their profile and start searching right away. All searches are filtered based on the settings you chose.
        </p>
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={saving ? 'Saving...' : 'Finish Setup'}
        loading={saving}
      />
    </div>
  );
}

// --- Step 7: All Set ---
function AllSetStep({ onComplete, onAddAnother, onTrySearch }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 animate-fadeIn">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200 mb-6">
        <Sparkles className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        You're all set!
      </h1>
      <p className="text-gray-500 mb-10 max-w-sm">
        SafeStudy is ready. Your kids can now search the web safely with content filtered just for them.
      </p>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onComplete}
          className="w-full flex items-center gap-4 px-5 py-4 bg-accent-500 hover:bg-accent-600 text-white rounded-2xl font-medium transition active:scale-[0.97] shadow-lg shadow-accent-200"
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-left flex-1">
            <span className="block font-semibold">Go to Dashboard</span>
            <span className="block text-xs text-accent-100">See activity and manage profiles</span>
          </span>
        </button>

        <button
          onClick={onAddAnother}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl font-medium transition active:scale-[0.97]"
        >
          <UserPlus className="w-6 h-6 text-accent-500" />
          <span className="text-left flex-1">
            <span className="block font-semibold">Add Another Kid</span>
            <span className="block text-xs text-gray-400">Create profiles for more children</span>
          </span>
        </button>

        <button
          onClick={onTrySearch}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl font-medium transition active:scale-[0.97]"
        >
          <Search className="w-6 h-6 text-accent-500" />
          <span className="text-left flex-1">
            <span className="block font-semibold">Try a Search</span>
            <span className="block text-xs text-gray-400">See what your kids will experience</span>
          </span>
        </button>
      </div>
    </div>
  );
}

// --- Main Wizard ---
export default function OnboardingWizard({ userId, familyCode, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // All form data stored in state, saved at the end
  const [formData, setFormData] = useState({
    name: '',
    age: 8,
    color: 'blue',
    readingLevel: gradeFromAge(8),
    autoReadingLevel: true,
    blockedTopics: ALL_BLOCKED_TOPICS.map((t) => t.id),
    allowTopicRequests: true,
    // Default OFF — image search turns SafeStudy into a Pinterest substitute
    // (Apr 2026 audit). Parent can enable per-kid in profile settings.
    allowImageSearch: false,
    accessibilityNeeds: [],
  });

  const { token } = useAuth();
  const createProfile = useMutation(api.kidProfiles.createProfile);
  const updateProfile = useMutation(api.kidProfiles.updateProfile);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const updateFormData = useCallback((partial) => {
    setFormData((prev) => {
      const next = { ...prev, ...partial };
      // When age changes and auto reading level is on, update reading level
      if (partial.age !== undefined && prev.autoReadingLevel) {
        next.readingLevel = gradeFromAge(partial.age);
      }
      return next;
    });
  }, []);

  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  // Save profile when transitioning from Step 6 to Step 7
  const handleSaveAndFinish = useCallback(async () => {
    setSaving(true);
    setSaveError('');

    try {
      const profileId = await createProfile({
        userId,
        name: formData.name.trim(),
        color: formData.color,
        ageRange: { min: formData.age, max: formData.age },
        contentStrictness: strictnessFromAge(formData.age),
        blockedTopics: formData.blockedTopics,
        allowImageSearch: formData.allowImageSearch,
        allowFollowUp: true,
        userToken: token ?? undefined,
      });

      // Patch additional fields via updateProfile
      const extras = {};
      if (formData.readingLevel) extras.lexileLevel = formData.readingLevel;
      if (formData.allowTopicRequests !== undefined) extras.allowTopicRequests = formData.allowTopicRequests;
      if (formData.accessibilityNeeds.length > 0) extras.accessibilityNeeds = formData.accessibilityNeeds;

      if (Object.keys(extras).length > 0) {
        await updateProfile({ kidProfileId: profileId, ...extras, userToken: token ?? undefined });
      }

      setStep(6);
    } catch (err) {
      console.error('[OnboardingWizard] Save error:', err);
      setSaveError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [userId, formData, createProfile, updateProfile, token]);

  const handleComplete = useCallback(() => {
    completeOnboarding({ userId });
    onComplete?.('dashboard');
  }, [onComplete, completeOnboarding, userId]);

  const handleAddAnother = useCallback(() => {
    completeOnboarding({ userId });
    onComplete?.('addKid');
  }, [onComplete, completeOnboarding, userId]);

  const handleTrySearch = useCallback(() => {
    completeOnboarding({ userId });
    onComplete?.('trySearch');
  }, [onComplete, completeOnboarding, userId]);

  return (
    <div className="fixed inset-0 z-50 bg-[#FFF8F0] flex flex-col">
      {/* Step Indicator */}
      <div className="pt-6 pb-2 px-6">
        <StepDots current={step} total={TOTAL_STEPS} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-md">
          {step === 0 && (
            <WelcomeStep onNext={() => setStep(1)} />
          )}

          {step === 1 && (
            <NameAgeStep
              data={formData}
              onChange={updateFormData}
              onNext={() => setStep(2)}
              onBack={goBack}
            />
          )}

          {step === 2 && (
            <ReadingLevelStep
              data={formData}
              onChange={updateFormData}
              onNext={() => setStep(3)}
              onBack={goBack}
            />
          )}

          {step === 3 && (
            <ContentSafetyStep
              data={formData}
              onChange={updateFormData}
              onNext={() => setStep(4)}
              onBack={goBack}
            />
          )}

          {step === 4 && (
            <AccessibilityStep
              data={formData}
              onChange={updateFormData}
              onNext={() => setStep(5)}
              onBack={goBack}
            />
          )}

          {step === 5 && (
            <FamilyCodeStep
              data={formData}
              familyCode={familyCode}
              onNext={handleSaveAndFinish}
              onBack={goBack}
              saving={saving}
              error={saveError}
            />
          )}

          {step === 6 && (
            <AllSetStep
              onComplete={handleComplete}
              onAddAnother={handleAddAnother}
              onTrySearch={handleTrySearch}
            />
          )}
        </div>
      </div>

      {/* Skip link (steps 0-5 only) */}
      {step < 6 && (
        <div className="pb-6 text-center">
          <button
            onClick={handleComplete}
            className="text-sm text-gray-400 hover:text-gray-600 transition underline-offset-2 hover:underline"
          >
            Skip setup
          </button>
        </div>
      )}
    </div>
  );
}
