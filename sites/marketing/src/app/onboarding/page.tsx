"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ChevronRight, Check, Music, Play, BookOpen, ArrowRight, SkipForward, Users, Clock } from "lucide-react";

/**
 * Unified Onboarding Page
 *
 * Steps through onboarding for each selected app after signup/payment.
 * Progress indicator shows 'Step 1 of 3: SafeTunes'.
 * Each app has its own onboarding steps.
 * User can skip and come back later.
 */

type AppId = "safetunes" | "safetube" | "safereads";

interface AppConfig {
  id: AppId;
  name: string;
  icon: typeof Music;
  gradient: string;
  description: string;
  domain: string;
}

const APP_CONFIGS: Record<AppId, AppConfig> = {
  safetunes: {
    id: "safetunes",
    name: "SafeTunes",
    icon: Music,
    gradient: "from-indigo-500 to-purple-600",
    description: "Approve songs before they play",
    domain: "getsafetunes.com",
  },
  safetube: {
    id: "safetube",
    name: "SafeTube",
    icon: Play,
    gradient: "from-red-500 to-orange-500",
    description: "Approve channels before viewing",
    domain: "getsafetube.com",
  },
  safereads: {
    id: "safereads",
    name: "SafeReads",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-500",
    description: "Get content analysis for books",
    domain: "getsafereads.com",
  },
};

// Loading fallback
function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-navy/60">Loading onboarding...</p>
      </div>
    </div>
  );
}

// Welcome step content
function WelcomeStep({
  selectedApps,
  onContinue
}: {
  selectedApps: AppId[];
  onContinue: () => void;
}) {
  return (
    <div className="text-center max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Shield className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-3xl font-bold text-navy mb-4">
        Welcome to Safe Family!
      </h1>
      <p className="text-lg text-navy/70 mb-8">
        Let&apos;s set up your apps so your kids can start using them safely.
        This will only take a few minutes.
      </p>

      {/* Apps to set up */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="font-medium text-navy mb-4">Apps to set up:</h3>
        <div className="space-y-3">
          {selectedApps.map((appId) => {
            const config = APP_CONFIGS[appId];
            const Icon = config.icon;
            return (
              <div key={appId} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-navy">{config.name}</p>
                  <p className="text-sm text-navy/60">{config.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition shadow-md flex items-center justify-center gap-2 mx-auto"
      >
        Let&apos;s Get Started
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// SafeTunes onboarding step
function SafeTunesStep({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [kidName, setKidName] = useState("");
  const [dailyLimit, setDailyLimit] = useState(60);

  const DAILY_LIMITS = [
    { value: 30, label: "30 min" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 0, label: "Unlimited" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Music className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-navy mb-2">Set up SafeTunes</h2>
        <p className="text-navy/70">
          Create a profile for your child so they can access approved music.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Kid name */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            <Users className="w-4 h-4 inline mr-2" />
            Child&apos;s name
          </label>
          <input
            type="text"
            value={kidName}
            onChange={(e) => setKidName(e.target.value)}
            placeholder="Enter your child's name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Daily limit */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            Daily listening limit
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DAILY_LIMITS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDailyLimit(option.value)}
                className={`px-3 py-2 rounded-lg border text-sm transition ${
                  dailyLimit === option.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-indigo-800">
            <strong>Don&apos;t worry!</strong> You can add more kids and customize settings
            later in the SafeTunes dashboard.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onSkip}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Set up later
        </button>
        <button
          onClick={onComplete}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// SafeTube onboarding step
function SafeTubeStep({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [kidName, setKidName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");

  const COLORS = [
    { name: "red", class: "bg-red-500" },
    { name: "orange", class: "bg-orange-500" },
    { name: "yellow", class: "bg-yellow-500" },
    { name: "green", class: "bg-green-500" },
    { name: "blue", class: "bg-blue-500" },
    { name: "purple", class: "bg-purple-500" },
    { name: "pink", class: "bg-pink-500" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Play className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-navy mb-2">Set up SafeTube</h2>
        <p className="text-navy/70">
          Create a profile for your child to watch approved YouTube channels.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Kid name */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            <Users className="w-4 h-4 inline mr-2" />
            Child&apos;s name
          </label>
          <input
            type="text"
            value={kidName}
            onChange={(e) => setKidName(e.target.value)}
            placeholder="Enter your child's name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Color selection */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            Profile color
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color.name)}
                className={`w-10 h-10 rounded-full ${color.class} transition ${
                  selectedColor === color.name
                    ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                    : "hover:scale-105"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Tip:</strong> After setup, you&apos;ll get a Family Code to share
            with your kids so they can log in to their profile.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onSkip}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Set up later
        </button>
        <button
          onClick={onComplete}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// SafeReads onboarding step
function SafeReadsStep({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [kidName, setKidName] = useState("");
  const [kidAge, setKidAge] = useState("");

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-navy mb-2">Set up SafeReads</h2>
        <p className="text-navy/70">
          Add your child so you can build wishlists tailored to their age.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Kid name */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            <Users className="w-4 h-4 inline mr-2" />
            Child&apos;s name
          </label>
          <input
            type="text"
            value={kidName}
            onChange={(e) => setKidName(e.target.value)}
            placeholder="Enter your child's name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            Age (optional)
          </label>
          <input
            type="number"
            value={kidAge}
            onChange={(e) => setKidAge(e.target.value)}
            placeholder="e.g., 8"
            min={1}
            max={18}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-navy/60 mt-1">
            Helps us show age-appropriate book recommendations
          </p>
        </div>

        {/* Info box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-emerald-800">
            <strong>How it works:</strong> Search for any book and get instant
            content ratings covering violence, language, and more.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onSkip}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Set up later
        </button>
        <button
          onClick={onComplete}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Completion step
function CompletionStep({
  selectedApps,
  completedApps,
}: {
  selectedApps: AppId[];
  completedApps: AppId[];
}) {
  return (
    <div className="text-center max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-emerald-600" />
      </div>

      <h2 className="text-3xl font-bold text-navy mb-4">
        You&apos;re all set!
      </h2>
      <p className="text-lg text-navy/70 mb-8">
        Your Safe Family apps are ready to use. Sign in to each app with your email
        to access your subscription.
      </p>

      {/* App links */}
      <div className="space-y-3 mb-8">
        {selectedApps.map((appId) => {
          const config = APP_CONFIGS[appId];
          const Icon = config.icon;
          const wasCompleted = completedApps.includes(appId);

          return (
            <a
              key={appId}
              href={`https://${config.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-navy">{config.name}</p>
                  <p className="text-sm text-navy/60">
                    {wasCompleted ? "Ready to use" : "Set up pending"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {wasCompleted && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    Set up
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </div>
            </a>
          );
        })}
      </div>

      {/* Note about incomplete apps */}
      {completedApps.length < selectedApps.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-amber-800">
            <strong>Reminder:</strong> Some apps still need setup. You can complete
            the setup when you first log in to each app.
          </p>
        </div>
      )}

      <Link
        href="/"
        className="inline-flex items-center text-sm text-navy/60 hover:text-navy"
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to home
      </Link>
    </div>
  );
}

// Progress indicator component
function ProgressIndicator({
  currentStep,
  totalSteps,
  currentAppName,
}: {
  currentStep: number;
  totalSteps: number;
  currentAppName: string;
}) {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-2 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === currentStep
                ? "w-8 bg-indigo-600"
                : i < currentStep
                  ? "w-3 bg-indigo-400"
                  : "w-3 bg-gray-300"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-navy/60">
        Step {currentStep + 1} of {totalSteps}: <span className="font-medium">{currentAppName}</span>
      </p>
    </div>
  );
}

// Main onboarding content
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get apps from URL or default to all
  const appsParam = searchParams.get("apps");
  const selectedApps: AppId[] = appsParam
    ? (appsParam.split(",").filter((a): a is AppId =>
        ["safetunes", "safetube", "safereads"].includes(a)
      ))
    : ["safetunes", "safetube", "safereads"];

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 = welcome
  const [completedApps, setCompletedApps] = useState<AppId[]>([]);

  // Calculate total steps (welcome + each app + completion)
  const totalAppSteps = selectedApps.length;

  // Determine what to show based on current step
  const isWelcome = currentStepIndex === -1;
  const isComplete = currentStepIndex >= selectedApps.length;
  const currentApp = !isWelcome && !isComplete ? selectedApps[currentStepIndex] : null;

  // Handlers
  const handleStartOnboarding = () => {
    setCurrentStepIndex(0);
  };

  const handleCompleteApp = () => {
    if (currentApp) {
      setCompletedApps([...completedApps, currentApp]);
    }
    setCurrentStepIndex(currentStepIndex + 1);
  };

  const handleSkipApp = () => {
    setCurrentStepIndex(currentStepIndex + 1);
  };

  // Get current app name for progress indicator
  const currentAppName = currentApp ? APP_CONFIGS[currentApp].name : "";

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-navy">Safe Family</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 pb-16">
        {/* Progress indicator (only show during app steps) */}
        {!isWelcome && !isComplete && (
          <ProgressIndicator
            currentStep={currentStepIndex}
            totalSteps={totalAppSteps}
            currentAppName={currentAppName}
          />
        )}

        {/* Step content */}
        {isWelcome && (
          <WelcomeStep
            selectedApps={selectedApps}
            onContinue={handleStartOnboarding}
          />
        )}

        {currentApp === "safetunes" && (
          <SafeTunesStep
            onComplete={handleCompleteApp}
            onSkip={handleSkipApp}
          />
        )}

        {currentApp === "safetube" && (
          <SafeTubeStep
            onComplete={handleCompleteApp}
            onSkip={handleSkipApp}
          />
        )}

        {currentApp === "safereads" && (
          <SafeReadsStep
            onComplete={handleCompleteApp}
            onSkip={handleSkipApp}
          />
        )}

        {isComplete && (
          <CompletionStep
            selectedApps={selectedApps}
            completedApps={completedApps}
          />
        )}
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-gray-200 py-6 bg-white">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Safe Family. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Main page with Suspense
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}
