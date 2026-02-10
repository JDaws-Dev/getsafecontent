"use client";

import { useState, useCallback } from "react";

// Color options matching SafeTube app
const COLORS = [
  { id: "red", name: "Red", class: "bg-red-500" },
  { id: "orange", name: "Orange", class: "bg-orange-500" },
  { id: "yellow", name: "Yellow", class: "bg-yellow-500" },
  { id: "green", name: "Green", class: "bg-green-500" },
  { id: "blue", name: "Blue", class: "bg-blue-500" },
  { id: "purple", name: "Purple", class: "bg-purple-500" },
  { id: "pink", name: "Pink", class: "bg-pink-500" },
];

// Restriction options for SafeTube
const MAX_VIDEOS_OPTIONS = [
  { value: 3, label: "3 videos" },
  { value: 5, label: "5 videos" },
  { value: 10, label: "10 videos" },
  { value: 0, label: "Unlimited" },
];

export interface SafeTubeKidProfile {
  name: string;
  color: string;
  pin: string;
  shortsEnabled: boolean;
  maxVideosPerChannel: number;
  requestsEnabled: boolean;
}

export interface SafeTubeOnboardingData {
  kids: SafeTubeKidProfile[];
}

interface SafeTubeOnboardingProps {
  /** Current step (1: Welcome, 2: Kid Profiles, 3: Complete) */
  initialStep?: number;
  /** User's family code (displayed in completion screen) */
  familyCode?: string;
  /** Callback when onboarding data changes */
  onChange?: (data: SafeTubeOnboardingData) => void;
  /** Callback when onboarding is completed */
  onComplete?: (data: SafeTubeOnboardingData) => Promise<void>;
  /** Whether onboarding is in a loading state */
  isLoading?: boolean;
  /** External error message */
  error?: string;
  /** Clear external error */
  onClearError?: () => void;
}

// YouTube play icon
const YouTubeIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
  </svg>
);

export default function SafeTubeOnboarding({
  initialStep = 1,
  familyCode = "",
  onChange,
  onComplete,
  isLoading = false,
  error: externalError,
  onClearError,
}: SafeTubeOnboardingProps) {
  const [step, setStep] = useState(initialStep);
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  // Kid profiles state
  const [kids, setKids] = useState<SafeTubeKidProfile[]>([
    {
      name: "",
      color: COLORS[0].id,
      pin: "",
      shortsEnabled: true,
      maxVideosPerChannel: 5,
      requestsEnabled: true,
    },
  ]);

  const error = externalError || localError;
  const combinedLoading = isLoading || loading;

  // Notify parent of data changes
  const notifyChange = useCallback(
    (newKids: SafeTubeKidProfile[]) => {
      onChange?.({ kids: newKids });
    },
    [onChange]
  );

  const addKid = () => {
    const newKids = [
      ...kids,
      {
        name: "",
        color: COLORS[kids.length % COLORS.length].id,
        pin: "",
        shortsEnabled: true,
        maxVideosPerChannel: 5,
        requestsEnabled: true,
      },
    ];
    setKids(newKids);
    notifyChange(newKids);
  };

  const removeKid = (index: number) => {
    if (kids.length > 1) {
      const newKids = kids.filter((_, i) => i !== index);
      setKids(newKids);
      notifyChange(newKids);
    }
  };

  const updateKid = (
    index: number,
    field: keyof SafeTubeKidProfile,
    value: string | number | boolean
  ) => {
    const newKids = [...kids];
    const kid = newKids[index];
    if (field === "name" || field === "color" || field === "pin") {
      kid[field] = value as string;
    } else if (field === "maxVideosPerChannel") {
      kid[field] = value as number;
    } else if (
      field === "shortsEnabled" ||
      field === "requestsEnabled"
    ) {
      kid[field] = value as boolean;
    }
    setKids(newKids);
    notifyChange(newKids);
  };

  const handleCompleteOnboarding = async () => {
    setLocalError("");
    onClearError?.();

    // Validate
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      if (!kid.name.trim()) {
        setLocalError(`Please enter a name for kid #${i + 1}`);
        return;
      }
      // PIN is optional, but if provided, must be 4 digits
      if (kid.pin && kid.pin.length !== 4) {
        setLocalError(
          `PIN for ${kid.name} must be exactly 4 digits (or leave blank for no PIN)`
        );
        return;
      }
    }

    setLoading(true);

    try {
      await onComplete?.({ kids });
      setStep(3);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save profiles. Please try again.";
      setLocalError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <YouTubeIcon className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Set Up SafeTube
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Let&apos;s create profiles for your kids so they can start watching
            safe YouTube videos.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-red-900 mb-3">
              What we&apos;ll do:
            </h3>
            <ul className="space-y-2 text-red-800">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Create profiles for your kids</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Set viewing restrictions (Shorts, video limits)</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Get your family code for kid logins</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setStep(2)}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg"
          >
            Let&apos;s Get Started
          </button>
        </div>
      )}

      {/* Step 2: Kid Profiles */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create Kid Profiles
            </h2>
            <p className="text-gray-600">
              Add your kids and configure their viewing restrictions
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6 mb-6">
            {kids.map((kid, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl p-6 relative"
              >
                {kids.length > 1 && (
                  <button
                    onClick={() => removeKid(index)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition"
                    aria-label={`Remove kid #${index + 1}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                <h3 className="font-semibold text-gray-900 mb-4">
                  Kid #{index + 1}
                </h3>

                {/* Name Field */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={kid.name}
                    onChange={(e) => updateKid(index, "name", e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>

                {/* Color Theme */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Theme
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => updateKid(index, "color", color.id)}
                        className={`w-10 h-10 rounded-lg ${color.class} transition ${
                          kid.color === color.id
                            ? "ring-2 ring-offset-2 ring-gray-900"
                            : ""
                        }`}
                        aria-label={`Select ${color.name} color`}
                      />
                    ))}
                  </div>
                </div>

                {/* PIN Field */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    4-Digit PIN (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Protects this profile from siblings. Leave blank if not
                    needed.
                  </p>
                  <input
                    type="password"
                    value={kid.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      updateKid(index, "pin", value);
                    }}
                    maxLength={4}
                    placeholder="••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>

                {/* Viewing Restrictions */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Viewing Restrictions
                  </h4>

                  {/* Shorts Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm text-gray-700">
                        Allow YouTube Shorts
                      </span>
                      <p className="text-xs text-gray-500">
                        Short-form videos (60 seconds or less)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateKid(index, "shortsEnabled", !kid.shortsEnabled)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        kid.shortsEnabled ? "bg-red-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          kid.shortsEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Max Videos Per Channel */}
                  <div className="mb-3">
                    <label className="block text-sm text-gray-700 mb-2">
                      Videos per channel
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Limit how many videos can be watched from each channel
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {MAX_VIDEOS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateKid(index, "maxVideosPerChannel", option.value)
                          }
                          className={`px-3 py-2 rounded-lg border text-sm transition ${
                            kid.maxVideosPerChannel === option.value
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-red-600"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Requests Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700">
                        Allow video requests
                      </span>
                      <p className="text-xs text-gray-500">
                        Kids can request videos for your approval
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateKid(index, "requestsEnabled", !kid.requestsEnabled)
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        kid.requestsEnabled ? "bg-red-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          kid.requestsEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addKid}
            className="w-full mb-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium transition flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Another Kid
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
              disabled={combinedLoading}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCompleteOnboarding}
              disabled={combinedLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {combinedLoading ? "Saving..." : "Complete Setup"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              SafeTube is Ready!
            </h2>
            <p className="text-gray-600">
              Save this information to share with your kids
            </p>
          </div>

          <div className="space-y-6">
            {/* Family Code Section */}
            {familyCode && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-red-900 text-lg">
                    Your Family Code
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(familyCode)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-4xl font-bold text-red-600 text-center tracking-widest font-mono">
                    {familyCode}
                  </p>
                </div>
                <p className="text-sm text-red-800">
                  Your kids will need this code to log in and watch videos
                </p>
              </div>
            )}

            {/* Kid Login URL Section */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-900 text-lg">
                  Kid Login Website
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard("https://getsafetube.com/play")
                  }
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="text-xl font-semibold text-blue-600 text-center break-all">
                  getsafetube.com/play
                </p>
              </div>
              <p className="text-sm text-blue-800">
                Send this link to your kids so they can watch their videos
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                How it works:
              </h3>
              <ol className="space-y-2 text-sm text-green-800 list-decimal list-inside">
                <li>Share the website link with your kids</li>
                <li>
                  They enter the family code:{" "}
                  <span className="font-mono font-bold">{familyCode}</span>
                </li>
                <li>
                  They select their profile and enter their PIN (if you set one)
                </li>
                <li>They can watch videos from channels you approve!</li>
              </ol>
            </div>

            {/* Next step hint */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <h3 className="font-semibold text-orange-900 mb-2 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Next: Approve channels
              </h3>
              <p className="text-sm text-orange-800">
                Your kids won&apos;t have any videos yet! Go to the parent
                dashboard to search and approve YouTube channels for them.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href="https://getsafetube.com/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-lg font-semibold text-lg transition shadow-lg text-center"
            >
              Open SafeTube Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
