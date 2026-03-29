import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Search, ArrowRight, Copy, Check, Sparkles,
  LayoutDashboard, UserPlus, ExternalLink,
} from 'lucide-react';

const COLORS = [
  { name: 'red', bg: 'bg-red-500' },
  { name: 'orange', bg: 'bg-orange-500' },
  { name: 'yellow', bg: 'bg-yellow-500' },
  { name: 'green', bg: 'bg-green-500' },
  { name: 'blue', bg: 'bg-blue-500' },
  { name: 'cyan', bg: 'bg-cyan-500' },
  { name: 'purple', bg: 'bg-purple-500' },
  { name: 'pink', bg: 'bg-pink-500' },
];

const DEFAULT_BLOCKED_TOPICS = ['violence', 'drugs', 'sexual', 'profanity', 'self-harm', 'weapons'];

function getStrictnessFromAge(age) {
  if (age <= 7) return 'strict';
  if (age <= 12) return 'moderate';
  return 'light';
}

function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-8 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500'
              : i < current
                ? 'w-2.5 h-2.5 bg-blue-400'
                : 'w-2.5 h-2.5 bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// --- Step 1: Welcome ---
function WelcomeStep({ onNext }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 animate-fadeIn">
      {/* Logo */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-200 mb-8">
        <Search className="w-12 h-12 text-white" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        Welcome to SafeSeek!
      </h1>
      <p className="text-lg text-gray-600 max-w-md mb-2">
        Let's set up a safe search experience for your kids.
      </p>
      <p className="text-sm text-gray-400 mb-10">
        This takes about 1 minute.
      </p>

      <button
        onClick={onNext}
        className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.97]"
      >
        Get Started
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// --- Step 2: Create Kid Profile ---
function CreateProfileStep({ userId, onNext, onCreated }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [color, setColor] = useState('blue');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createProfile = useMutation(api.kidProfiles.createProfile);

  const strictness = getStrictnessFromAge(age);
  const selectedColor = COLORS.find((c) => c.name === color);
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  const handleNext = async () => {
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createProfile({
        userId,
        name: name.trim(),
        color,
        ageRange: { min: age, max: age },
        contentStrictness: strictness,
        blockedTopics: DEFAULT_BLOCKED_TOPICS,
        allowImageSearch: true,
        allowFollowUp: true,
      });
      onCreated?.();
      onNext();
    } catch (err) {
      console.error('[OnboardingWizard] Create profile error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Who will be searching?
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
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg transition-all duration-300 ${selectedColor?.bg || 'bg-blue-500'}`}
        >
          {initial}
        </div>
        {name && (
          <p className="mt-3 text-lg font-semibold text-gray-900">{name}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Age {age} &middot;{' '}
          {strictness === 'strict' && 'Strict filtering'}
          {strictness === 'moderate' && 'Moderate filtering'}
          {strictness === 'light' && 'Light filtering'}
        </p>
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
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
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
            onClick={() => setAge(Math.max(4, age - 1))}
            className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-2xl transition active:scale-90 flex items-center justify-center"
          >
            &minus;
          </button>
          <span className="text-5xl font-bold text-gray-900 w-20 text-center tabular-nums">
            {age}
          </span>
          <button
            type="button"
            onClick={() => setAge(Math.min(18, age + 1))}
            className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-2xl transition active:scale-90 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Color Picker */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Pick a color
        </label>
        <div className="flex gap-3 justify-center">
          {COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColor(c.name)}
              className={`w-11 h-11 rounded-full ${c.bg} transition-all ring-offset-2 ${
                color === c.name
                  ? 'ring-3 ring-blue-500 scale-110 shadow-md'
                  : 'hover:scale-105'
              }`}
              aria-label={c.name}
            />
          ))}
        </div>
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={saving}
        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.97]"
      >
        {saving ? 'Creating...' : 'Next'}
        {!saving && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  );
}

// --- Step 3: Family Code ---
function FamilyCodeStep({ familyCode, onNext }) {
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(async () => {
    if (!familyCode) return;
    try {
      await navigator.clipboard.writeText(familyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — code is visible
    }
  }, [familyCode]);

  return (
    <div className="px-6 py-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Share this code with your kids
        </h1>
        <p className="text-gray-500">They'll use it to start searching safely</p>
      </div>

      {/* Family Code Display */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 sm:p-8 mb-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl sm:text-5xl font-bold text-blue-600 tracking-[0.25em] font-mono">
            {familyCode || '------'}
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-blue-50 border border-blue-200 text-blue-600 rounded-xl font-medium transition active:scale-95 shadow-sm"
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
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
        <p className="text-sm text-gray-600 mb-3">
          Your kids enter this code at:
        </p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <code className="text-blue-600 font-mono font-semibold text-sm sm:text-base">
            getsafeseek.com/search
          </code>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          They'll pick their profile and start searching right away. All searches are filtered based on the settings you chose.
        </p>
      </div>

      {/* Done Button */}
      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.97]"
      >
        Done!
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// --- Step 4: All Set ---
function AllSetStep({ onComplete, onAddAnother, onTrySearch }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8 animate-fadeIn">
      {/* Celebration */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200 mb-6">
        <Sparkles className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        You're all set!
      </h1>
      <p className="text-gray-500 mb-10 max-w-sm">
        SafeSeek is ready. Your kids can now search the web safely with content filtered just for them.
      </p>

      {/* Quick Links */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onComplete}
          className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-2xl font-medium transition active:scale-[0.97] shadow-lg shadow-blue-200"
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-left flex-1">
            <span className="block font-semibold">Go to Dashboard</span>
            <span className="block text-xs text-blue-100">See activity and manage profiles</span>
          </span>
        </button>

        <button
          onClick={onAddAnother}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl font-medium transition active:scale-[0.97]"
        >
          <UserPlus className="w-6 h-6 text-blue-500" />
          <span className="text-left flex-1">
            <span className="block font-semibold">Add Another Kid</span>
            <span className="block text-xs text-gray-400">Create profiles for more children</span>
          </span>
        </button>

        <button
          onClick={onTrySearch}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl font-medium transition active:scale-[0.97]"
        >
          <Search className="w-6 h-6 text-cyan-500" />
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

  const TOTAL_STEPS = 4;

  const handleComplete = useCallback(() => {
    localStorage.setItem('safeseek_onboarding_complete', 'true');
    onComplete?.('dashboard');
  }, [onComplete]);

  const handleAddAnother = useCallback(() => {
    localStorage.setItem('safeseek_onboarding_complete', 'true');
    onComplete?.('addKid');
  }, [onComplete]);

  const handleTrySearch = useCallback(() => {
    localStorage.setItem('safeseek_onboarding_complete', 'true');
    onComplete?.('trySearch');
  }, [onComplete]);

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
            <CreateProfileStep
              userId={userId}
              onNext={() => setStep(2)}
              onCreated={() => {}}
            />
          )}

          {step === 2 && (
            <FamilyCodeStep
              familyCode={familyCode}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <AllSetStep
              onComplete={handleComplete}
              onAddAnother={handleAddAnother}
              onTrySearch={handleTrySearch}
            />
          )}
        </div>
      </div>

      {/* Skip link (steps 0-2 only) */}
      {step < 3 && (
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
