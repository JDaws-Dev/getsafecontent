"use client";

import { useState } from "react";
import { BookOpen, Users, ArrowRight, Plus, X, Check, Sparkles } from "lucide-react";

/**
 * SafeReads Onboarding Steps Component
 *
 * Light onboarding flow for SafeReads:
 * 1. Welcome - Brief intro to how book analysis works
 * 2. Add Kids (optional) - Add children for wishlists
 * 3. Complete - Ready to search
 *
 * This component is used in the unified signup flow after account creation.
 */

export type Kid = {
  name: string;
  age?: number;
};

export type SafeReadsOnboardingData = {
  kids: Kid[];
};

type SafeReadsOnboardingProps = {
  userName?: string;
  onComplete: (data: SafeReadsOnboardingData) => Promise<void>;
  onSkip?: () => void;
};

export default function SafeReadsOnboarding({
  userName,
  onComplete,
  onSkip,
}: SafeReadsOnboardingProps) {
  const [step, setStep] = useState(0);
  const [kids, setKids] = useState<Kid[]>([]);
  const [showKidForm, setShowKidForm] = useState(false);
  const [kidName, setKidName] = useState("");
  const [kidAge, setKidAge] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addKid() {
    if (!kidName.trim()) return;

    const newKid: Kid = {
      name: kidName.trim(),
      age: kidAge ? parseInt(kidAge, 10) : undefined,
    };

    setKids((prev) => [...prev, newKid]);
    setKidName("");
    setKidAge("");
    setShowKidForm(false);
  }

  function removeKid(index: number) {
    setKids((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleComplete() {
    setSaving(true);
    setError("");

    try {
      await onComplete({ kids });
    } catch (err) {
      console.error("[SafeReadsOnboarding] Error:", err);
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  // Progress indicator
  const totalSteps = 3;

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step
                ? "w-8 bg-emerald-600"
                : i < step
                  ? "w-2 bg-emerald-400"
                  : "w-2 bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <BookOpen className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="text-3xl font-bold text-navy mb-2">
            Welcome to SafeReads
            {userName && `, ${userName}`}!
          </h1>

          <p className="text-lg text-navy/70 mb-6">
            Get objective content reviews for books before your kids read them.
          </p>

          {/* How it works */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left mb-8">
            <h3 className="font-semibold text-navy flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              How SafeReads works
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-emerald-700">
                  1
                </div>
                <div>
                  <p className="font-medium text-navy">Search for any book</p>
                  <p className="text-sm text-navy/60">By title, barcode, or cover photo</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-emerald-700">
                  2
                </div>
                <div>
                  <p className="font-medium text-navy">Get AI content analysis</p>
                  <p className="text-sm text-navy/60">Violence, language, mature themes, and more</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-emerald-700">
                  3
                </div>
                <div>
                  <p className="font-medium text-navy">Make informed decisions</p>
                  <p className="text-sm text-navy/60">Age ratings and detailed breakdowns</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </button>

          {onSkip && (
            <button
              onClick={onSkip}
              className="block mx-auto mt-4 text-sm text-navy/50 hover:text-navy/70"
            >
              Skip for now
            </button>
          )}
        </div>
      )}

      {/* Step 1: Add kids (optional) */}
      {step === 1 && (
        <div>
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-7 w-7 text-emerald-600" />
            </div>

            <h2 className="text-2xl font-bold text-navy mb-2">
              Add Your Kids
            </h2>

            <p className="text-navy/60">
              Create profiles for personalized wishlists and recommendations.
              You can always do this later.
            </p>
          </div>

          {/* Added kids list */}
          {kids.length > 0 && (
            <div className="mb-4 space-y-2">
              {kids.map((kid, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-700 font-semibold">
                        {kid.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-navy">{kid.name}</span>
                      {kid.age !== undefined && (
                        <span className="ml-2 text-sm text-navy/50">
                          age {kid.age}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeKid(i)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add kid form or button */}
          {showKidForm ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Child&apos;s name *
                  </label>
                  <input
                    type="text"
                    value={kidName}
                    onChange={(e) => setKidName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-navy placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Age (optional)
                  </label>
                  <input
                    type="number"
                    value={kidAge}
                    onChange={(e) => setKidAge(e.target.value)}
                    placeholder="Enter age"
                    min={1}
                    max={18}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-navy placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowKidForm(false);
                      setKidName("");
                      setKidAge("");
                    }}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-navy/70 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addKid}
                    disabled={!kidName.trim()}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowKidForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-navy/60 transition hover:border-emerald-500 hover:text-emerald-600 mb-6"
            >
              <Plus className="h-4 w-4" />
              Add a child
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-navy/70 transition hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              {kids.length > 0 ? "Continue" : "Skip for now"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Done */}
      {step === 2 && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>

          <h2 className="text-2xl font-bold text-navy mb-2">
            You&apos;re All Set!
          </h2>

          <p className="text-navy/70 mb-6">
            Start searching for books to get instant content reviews.
          </p>

          {kids.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-emerald-800 font-medium mb-2">
                {kids.length} {kids.length === 1 ? "child" : "children"} added:
              </p>
              <div className="flex flex-wrap gap-2">
                {kids.map((kid, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full text-sm text-emerald-700 border border-emerald-200"
                  >
                    {kid.name}
                    {kid.age && <span className="text-emerald-500">({kid.age})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 text-left">
            <h3 className="text-sm font-semibold text-navy mb-3">Quick tips:</h3>
            <ul className="space-y-2 text-sm text-navy/70">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Search by title, author, or ISBN</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Snap a photo of any book cover for quick lookup</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Save books to wishlists for each child</span>
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleComplete}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Setting up...
                </>
              ) : (
                <>
                  Start Searching
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            <button
              onClick={() => setStep(1)}
              className="text-sm text-navy/50 hover:text-navy/70"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <p className="text-center text-sm text-navy/40 mt-6">
        Step {step + 1} of {totalSteps}
      </p>
    </div>
  );
}
