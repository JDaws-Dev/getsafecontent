"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { BookOpen, ChevronRight, Check, ArrowLeft } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

// Same genre list as GenreBrowser.tsx
const GENRES = [
  { key: "Adventure", emoji: "\uD83C\uDFF4\u200D\u2620\uFE0F", gradient: "from-orange-400 to-red-500", ring: "ring-orange-300" },
  { key: "Animals", emoji: "\uD83D\uDC3E", gradient: "from-amber-400 to-yellow-500", ring: "ring-amber-300" },
  { key: "Fantasy", emoji: "\uD83D\uDC09", gradient: "from-purple-400 to-violet-600", ring: "ring-purple-300" },
  { key: "Science", emoji: "\uD83D\uDD2C", gradient: "from-cyan-400 to-blue-500", ring: "ring-cyan-300" },
  { key: "History", emoji: "\u2694\uFE0F", gradient: "from-stone-400 to-stone-600", ring: "ring-stone-300" },
  { key: "Fairy Tales", emoji: "\uD83E\uDDDA", gradient: "from-pink-400 to-rose-500", ring: "ring-pink-300" },
  { key: "Mystery", emoji: "\uD83D\uDD0D", gradient: "from-indigo-400 to-blue-600", ring: "ring-indigo-300" },
  { key: "Space", emoji: "\uD83D\uDE80", gradient: "from-violet-500 to-indigo-700", ring: "ring-violet-300" },
  { key: "Nature", emoji: "\uD83C\uDF3F", gradient: "from-emerald-400 to-green-600", ring: "ring-emerald-300" },
  { key: "Humor", emoji: "\uD83D\uDE02", gradient: "from-yellow-400 to-orange-400", ring: "ring-yellow-300" },
  { key: "Sports", emoji: "\u26BD", gradient: "from-green-400 to-teal-500", ring: "ring-green-300" },
  { key: "Art & Music", emoji: "\uD83C\uDFA8", gradient: "from-fuchsia-400 to-pink-600", ring: "ring-fuchsia-300" },
  { key: "Scary Stories", emoji: "\uD83D\uDC7B", gradient: "from-gray-600 to-gray-900", ring: "ring-gray-400" },
  { key: "Comics", emoji: "\uD83D\uDCAC", gradient: "from-sky-400 to-blue-500", ring: "ring-sky-300" },
  { key: "Action", emoji: "\uD83D\uDCA5", gradient: "from-red-500 to-rose-600", ring: "ring-red-300" },
];

const READING_GOALS = [
  { minutes: 15, label: "Bookworm", emoji: "\uD83D\uDC1B", description: "A great way to start" },
  { minutes: 30, label: "Page Turner", emoji: "\uD83D\uDCDA", description: "The sweet spot" },
  { minutes: 45, label: "Story Explorer", emoji: "\uD83E\uDDED", description: "For serious readers" },
  { minutes: 60, label: "Reading Champion", emoji: "\uD83C\uDFC6", description: "Go for the gold!" },
];

interface KidProfile {
  _id: string;
  name: string;
  age?: number;
  color: string;
  userId: string;
}

export default function KidOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState(30);
  const [kidProfile, setKidProfile] = useState<KidProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const completeOnboarding = useMutation(api.kids.completeOnboarding);

  // Check if kid needs onboarding — redirect if already completed
  const needsOnboarding = useQuery(
    api.kids.needsOnboarding,
    kidProfile ? { kidId: kidProfile._id as Id<"kids"> } : "skip"
  );

  // Load kid profile from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem("safereads_kid_profile");
    if (!savedProfile) {
      router.replace("/read");
      return;
    }
    try {
      setKidProfile(JSON.parse(savedProfile));
    } catch {
      router.replace("/read");
    }
  }, [router]);

  // If onboarding already done, go to home
  useEffect(() => {
    if (needsOnboarding === false) {
      router.replace("/read/home");
    }
  }, [needsOnboarding, router]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const handleComplete = async () => {
    if (!kidProfile || saving) return;
    setSaving(true);
    try {
      await completeOnboarding({
        kidId: kidProfile._id as Id<"kids">,
        favoriteGenres: selectedGenres,
        dailyReadingGoalMinutes: selectedGoal,
      });
      router.push("/read/home");
    } catch (err) {
      console.error("Failed to save onboarding:", err);
      setSaving(false);
    }
  };

  // Loading state
  if (!kidProfile || needsOnboarding === undefined) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg">
          <BookOpen className="h-8 w-8 animate-pulse text-white" />
        </div>
      </div>
    );
  }

  const canProceedFromStep1 = selectedGenres.length >= 2;

  return (
    <div className="flex min-h-[80vh] flex-col items-center px-4 pt-8 pb-12">
      {/* Progress dots */}
      <div className="mb-8 flex items-center gap-3">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              s === step
                ? "w-8 bg-gradient-to-r from-accent-500 to-accent-600"
                : s < step
                  ? "w-2.5 bg-accent-300"
                  : "w-2.5 bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Pick Genres */}
      {step === 1 && (
        <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-2 text-center">
            <h1 className="font-display text-2xl font-bold text-brand-navy sm:text-3xl">
              What do you love to read?
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Pick at least 2 genres you enjoy
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre.key);
              return (
                <button
                  key={genre.key}
                  onClick={() => toggleGenre(genre.key)}
                  className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all duration-200 active:scale-95 sm:gap-2 sm:p-4 ${
                    isSelected
                      ? `border-accent-400 bg-accent-50 shadow-md ring-2 ${genre.ring}`
                      : "border-gray-100 bg-white shadow-sm hover:border-accent-200 hover:shadow-md"
                  }`}
                >
                  {/* Check badge */}
                  {isSelected && (
                    <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 shadow-md">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${genre.gradient} shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14`}
                  >
                    <span className="text-2xl sm:text-3xl drop-shadow-sm">{genre.emoji}</span>
                  </div>
                  <span className="text-center text-xs font-semibold text-gray-700 leading-tight sm:text-sm">
                    {genre.key}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selection count */}
          <div className="mt-5 text-center">
            <p className={`text-sm font-medium transition-colors ${
              canProceedFromStep1 ? "text-accent-600" : "text-gray-400"
            }`}>
              {selectedGenres.length === 0
                ? "Tap your favorites above"
                : selectedGenres.length === 1
                  ? "1 picked \u2014 pick at least 1 more"
                  : `${selectedGenres.length} genres picked`}
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedFromStep1}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:from-accent-600 hover:to-accent-700 hover:shadow-xl disabled:opacity-40 disabled:hover:shadow-lg active:scale-95"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Reading Goal */}
      {step === 2 && (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-2 text-center">
            <h1 className="font-display text-2xl font-bold text-brand-navy sm:text-3xl">
              Set your daily reading goal
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              How many minutes will you read each day?
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            {READING_GOALS.map((goal) => {
              const isSelected = selectedGoal === goal.minutes;
              return (
                <button
                  key={goal.minutes}
                  onClick={() => setSelectedGoal(goal.minutes)}
                  className={`group flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all duration-200 active:scale-95 sm:p-6 ${
                    isSelected
                      ? "border-accent-400 bg-accent-50 shadow-lg ring-2 ring-accent-200"
                      : "border-gray-100 bg-white shadow-sm hover:border-accent-200 hover:shadow-md"
                  }`}
                >
                  <span className="text-4xl transition-transform duration-200 group-hover:scale-110">
                    {goal.emoji}
                  </span>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {goal.minutes}<span className="text-base font-semibold text-gray-400"> min</span>
                    </p>
                    <p className={`mt-0.5 text-sm font-bold ${
                      isSelected ? "text-accent-600" : "text-gray-600"
                    }`}>
                      {goal.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {goal.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 rounded-full border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:from-accent-600 hover:to-accent-700 hover:shadow-xl active:scale-95"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: All Set */}
      {step === 3 && (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-300 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-accent-600 shadow-xl ring-4 ring-accent-200">
            <span className="text-5xl drop-shadow-sm">{"\uD83C\uDF89"}</span>
          </div>

          <h1 className="font-display text-3xl font-bold text-brand-navy">
            You&apos;re all set, {kidProfile.name}!
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Your reading adventure starts now
          </p>

          {/* Summary cards */}
          <div className="mt-8 space-y-3 text-left">
            {/* Genres summary */}
            <div className="rounded-2xl border border-accent-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-400">
                Your Genres
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedGenres.map((genre) => {
                  const genreData = GENRES.find((g) => g.key === genre);
                  return (
                    <span
                      key={genre}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-sm font-medium text-accent-700"
                    >
                      <span className="text-sm">{genreData?.emoji}</span>
                      {genre}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Goal summary */}
            <div className="rounded-2xl border border-accent-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-400">
                Daily Goal
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">
                  {READING_GOALS.find((g) => g.minutes === selectedGoal)?.emoji}
                </span>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedGoal} minutes per day
                  </p>
                  <p className="text-sm text-gray-500">
                    {READING_GOALS.find((g) => g.minutes === selectedGoal)?.label}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 rounded-full border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:from-accent-600 hover:to-accent-700 hover:shadow-xl disabled:opacity-60 active:scale-95"
            >
              {saving ? (
                <>
                  <BookOpen className="h-5 w-5 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  Start Reading
                  <BookOpen className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
