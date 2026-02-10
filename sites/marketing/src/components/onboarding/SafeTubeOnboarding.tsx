"use client";

import { useState, useCallback } from "react";
import { Play, Plus, X, Check, Copy, Sparkles } from "lucide-react";

/**
 * Kid profile data structure
 */
export interface KidProfile {
  name: string;
  color: string;
}

/**
 * Onboarding completion data
 */
export interface SafeTubeOnboardingData {
  kids: KidProfile[];
  familyCode?: string;
}

/**
 * Props for SafeTubeOnboarding component
 */
export interface SafeTubeOnboardingProps {
  /** Called when onboarding is complete with kid profiles */
  onComplete: (data: SafeTubeOnboardingData) => void;
  /** Optional family code to display (if already generated) */
  familyCode?: string;
  /** Optional loading state for external submission */
  isSubmitting?: boolean;
  /** Optional error message */
  error?: string;
  /** Whether to show the welcome step first */
  showWelcome?: boolean;
  /** Custom heading text */
  heading?: string;
  /** Custom subheading text */
  subheading?: string;
}

// Available colors for kid profiles
const COLORS = [
  { name: "red", class: "bg-red-500", ring: "ring-red-300", hover: "hover:bg-red-600" },
  { name: "orange", class: "bg-orange-500", ring: "ring-orange-300", hover: "hover:bg-orange-600" },
  { name: "yellow", class: "bg-yellow-500", ring: "ring-yellow-300", hover: "hover:bg-yellow-600" },
  { name: "green", class: "bg-green-500", ring: "ring-green-300", hover: "hover:bg-green-600" },
  { name: "blue", class: "bg-blue-500", ring: "ring-blue-300", hover: "hover:bg-blue-600" },
  { name: "purple", class: "bg-purple-500", ring: "ring-purple-300", hover: "hover:bg-purple-600" },
  { name: "pink", class: "bg-pink-500", ring: "ring-pink-300", hover: "hover:bg-pink-600" },
];

/**
 * SafeTubeOnboarding Component
 *
 * Reusable onboarding flow for SafeTube that collects kid profiles.
 * Can be used in the unified signup flow or standalone in the SafeTube app.
 *
 * Features:
 * - Add multiple kid profiles with names and colors
 * - Auto-assign unique colors to new kids
 * - Optional welcome step with trial information
 * - Family code display (when provided)
 * - Copy family code functionality
 */
export default function SafeTubeOnboarding({
  onComplete,
  familyCode,
  isSubmitting = false,
  error,
  showWelcome = true,
  heading = "Add Your Kids",
  subheading = "Create a profile for each child. They'll use these to log in and watch videos.",
}: SafeTubeOnboardingProps) {
  const [step, setStep] = useState(showWelcome ? 1 : 2);
  const [kids, setKids] = useState<KidProfile[]>([{ name: "", color: "blue" }]);
  const [showFamilyCodeModal, setShowFamilyCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  const submitting = isSubmitting || internalSubmitting;

  // Add a new kid profile with auto-assigned color
  const addKid = useCallback(() => {
    const usedColors = kids.map((k) => k.color);
    const availableColor = COLORS.find((c) => !usedColors.includes(c.name))?.name || "blue";
    setKids([...kids, { name: "", color: availableColor }]);
  }, [kids]);

  // Remove a kid profile (keep at least one)
  const removeKid = useCallback((index: number) => {
    if (kids.length > 1) {
      setKids(kids.filter((_, i) => i !== index));
    }
  }, [kids]);

  // Update a kid profile field
  const updateKid = useCallback((index: number, field: keyof KidProfile, value: string) => {
    const updated = [...kids];
    updated[index][field] = value;
    setKids(updated);
  }, [kids]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Validate at least one kid with a name
    const validKids = kids.filter((k) => k.name.trim());
    if (validKids.length === 0) {
      return;
    }

    setInternalSubmitting(true);

    try {
      // Pass the data to the parent for actual submission
      await onComplete({
        kids: validKids.map((k) => ({
          name: k.name.trim(),
          color: k.color,
        })),
        familyCode,
      });

      // Show family code modal if we have a code
      if (familyCode) {
        setShowFamilyCodeModal(true);
      }
    } finally {
      setInternalSubmitting(false);
    }
  }, [kids, familyCode, onComplete]);

  // Copy family code to clipboard
  const copyFamilyCode = useCallback(async () => {
    if (familyCode) {
      try {
        await navigator.clipboard.writeText(familyCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch {
        // Fallback - just show the code
      }
    }
  }, [familyCode]);

  // Get color class by name
  const getColorClass = (colorName: string) => {
    return COLORS.find((c) => c.name === colorName)?.class || "bg-blue-500";
  };

  return (
    <div className="w-full">
      {/* Progress bar */}
      {showWelcome && (
        <div className="mb-6">
          <div className="flex gap-2">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= 1 ? "bg-red-500" : "bg-gray-200"
              }`}
            />
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= 2 ? "bg-red-500" : "bg-gray-200"
              }`}
            />
          </div>
        </div>
      )}

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome to SafeTube!
            </h2>
            <p className="text-gray-600">
              Let&apos;s set things up so your kids can start watching safe YouTube videos.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
              <Check className="w-5 h-5" />
              Your 7-Day Free Trial is Active
            </div>
            <p className="text-green-600 text-sm">
              Explore all features risk-free. No credit card required.
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold text-lg transition shadow-md"
          >
            Let&apos;s Get Started
          </button>
        </div>
      )}

      {/* Step 2: Create Kids */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{heading}</h2>
            <p className="text-gray-600">{subheading}</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {kids.map((kid, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  {/* Color picker preview */}
                  <div
                    className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg ${getColorClass(
                      kid.color
                    )}`}
                  >
                    {kid.name ? kid.name.charAt(0).toUpperCase() : "?"}
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Name input */}
                    <input
                      type="text"
                      value={kid.name}
                      onChange={(e) => updateKid(index, "name", e.target.value)}
                      placeholder="Child's name"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={submitting}
                    />

                    {/* Color selection */}
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => updateKid(index, "color", color.name)}
                          disabled={submitting}
                          className={`w-8 h-8 rounded-full ${color.class} transition ${
                            kid.color === color.name
                              ? `ring-2 ${color.ring} ring-offset-2`
                              : "hover:scale-110"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          aria-label={`Select ${color.name} color`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Remove button */}
                  {kids.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKid(index)}
                      disabled={submitting}
                      className="text-gray-400 hover:text-red-500 transition p-1 disabled:opacity-50"
                      aria-label="Remove child"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add another kid button */}
            <button
              type="button"
              onClick={addKid}
              disabled={submitting}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add Another Child
            </button>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !kids.some((k) => k.name.trim())}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition shadow-md"
            >
              {submitting ? "Creating Profiles..." : "Continue"}
            </button>

            {showWelcome && (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="w-full text-gray-500 hover:text-gray-700 py-2 transition disabled:opacity-50"
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}

      {/* Family Code Modal */}
      {showFamilyCodeModal && familyCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">You&apos;re All Set!</h2>
                <p className="text-gray-600 mt-2">
                  Your kids can now log in using your Family Code:
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="text-4xl font-bold text-red-600 tracking-widest font-mono mb-3">
                  {familyCode}
                </div>
                <button
                  type="button"
                  onClick={copyFamilyCode}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium transition text-sm inline-flex items-center gap-2"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-600 font-medium mb-2">How kids log in:</p>
                <ol className="text-sm text-gray-500 space-y-1">
                  <li>
                    1. Go to{" "}
                    <code className="bg-yellow-100 px-1 rounded text-red-600">
                      getsafetube.com/play
                    </code>
                  </li>
                  <li>2. Enter the Family Code</li>
                  <li>3. Select their profile</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowFamilyCodeModal(false);
                }}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold transition shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SafeTube Header component for standalone onboarding pages
 */
export function SafeTubeHeader() {
  return (
    <header className="px-6 py-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
        <Play className="w-6 h-6 text-white" fill="currentColor" />
      </div>
      <span className="font-semibold text-gray-900">SafeTube</span>
    </header>
  );
}

/**
 * Wrapper component for standalone SafeTube onboarding page
 */
export function SafeTubeOnboardingPage(props: SafeTubeOnboardingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <SafeTubeHeader />
      <main className="px-6 py-8 max-w-lg mx-auto">
        <SafeTubeOnboarding {...props} />
      </main>
    </div>
  );
}
