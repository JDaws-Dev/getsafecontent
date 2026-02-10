"use client";

import { useState, useCallback } from "react";

// Daily limit options matching SafeTunes app
const DAILY_LIMIT_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 0, label: "Unlimited" },
];

// Color options matching SafeTunes app
const COLORS = [
  { id: "purple", name: "Purple", class: "bg-purple-500" },
  { id: "blue", name: "Blue", class: "bg-blue-500" },
  { id: "green", name: "Green", class: "bg-green-500" },
  { id: "yellow", name: "Yellow", class: "bg-yellow-500" },
  { id: "pink", name: "Pink", class: "bg-pink-500" },
  { id: "red", name: "Red", class: "bg-red-500" },
  { id: "indigo", name: "Indigo", class: "bg-indigo-500" },
  { id: "orange", name: "Orange", class: "bg-orange-500" },
  { id: "teal", name: "Teal", class: "bg-teal-500" },
  { id: "cyan", name: "Cyan", class: "bg-cyan-500" },
];

export interface KidProfile {
  name: string;
  color: string;
  pin: string;
  dailyLimitMinutes: number;
}

export interface SafeTunesOnboardingData {
  appleMusicAuthorized: boolean;
  appleMusicSkipped: boolean;
  kids: KidProfile[];
}

interface SafeTunesOnboardingProps {
  /** Current step (1: Welcome, 2: Apple Music, 3: Kid Profiles, 4: Complete) */
  initialStep?: number;
  /** User's family code (displayed in completion screen) */
  familyCode?: string;
  /** Callback when onboarding data changes */
  onChange?: (data: SafeTunesOnboardingData) => void;
  /** Callback when onboarding is completed */
  onComplete?: (data: SafeTunesOnboardingData) => Promise<void>;
  /** Whether onboarding is in a loading state */
  isLoading?: boolean;
  /** External error message */
  error?: string;
  /** Clear external error */
  onClearError?: () => void;
}

// Apple Music SVG icon
const AppleMusicIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 88.994 96.651">
    <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z" />
  </svg>
);

export default function SafeTunesOnboarding({
  initialStep = 1,
  familyCode = "",
  onChange,
  onComplete,
  isLoading = false,
  error: externalError,
  onClearError,
}: SafeTunesOnboardingProps) {
  const [step, setStep] = useState(initialStep);
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  // Apple Music state
  const [appleMusicAuthorized, setAppleMusicAuthorized] = useState(false);
  const [appleMusicSkipped, setAppleMusicSkipped] = useState(false);

  // Kid profiles state
  const [kids, setKids] = useState<KidProfile[]>([
    {
      name: "",
      color: COLORS[0].id,
      pin: "",
      dailyLimitMinutes: 60,
    },
  ]);

  const error = externalError || localError;
  const combinedLoading = isLoading || loading;

  // Notify parent of data changes
  const notifyChange = useCallback(
    (newKids: KidProfile[], authorized: boolean, skipped: boolean) => {
      onChange?.({
        appleMusicAuthorized: authorized,
        appleMusicSkipped: skipped,
        kids: newKids,
      });
    },
    [onChange]
  );

  const handleAppleMusicAuth = async () => {
    // In the marketing site context, we can't actually call MusicKit
    // This will be handled when the user completes signup and goes to the SafeTunes app
    // For now, simulate success and show info message
    setLocalError("");
    setAppleMusicAuthorized(true);
    notifyChange(kids, true, false);
  };

  const handleSkipAppleMusic = () => {
    setAppleMusicSkipped(true);
    notifyChange(kids, false, true);
    setStep(3);
  };

  const handleContinueToKids = () => {
    setStep(3);
  };

  const addKid = () => {
    const newKids = [
      ...kids,
      {
        name: "",
        color: COLORS[kids.length % COLORS.length].id,
        pin: "",
        dailyLimitMinutes: 60,
      },
    ];
    setKids(newKids);
    notifyChange(newKids, appleMusicAuthorized, appleMusicSkipped);
  };

  const removeKid = (index: number) => {
    if (kids.length > 1) {
      const newKids = kids.filter((_, i) => i !== index);
      setKids(newKids);
      notifyChange(newKids, appleMusicAuthorized, appleMusicSkipped);
    }
  };

  const updateKid = (index: number, field: keyof KidProfile, value: string | number) => {
    const newKids = [...kids];
    const kid = newKids[index];
    if (field === "name" || field === "color" || field === "pin") {
      kid[field] = value as string;
    } else if (field === "dailyLimitMinutes") {
      kid[field] = value as number;
    }
    setKids(newKids);
    notifyChange(newKids, appleMusicAuthorized, appleMusicSkipped);
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
      await onComplete?.({
        appleMusicAuthorized,
        appleMusicSkipped,
        kids,
      });
      setStep(4);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save profiles. Please try again.";
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
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AppleMusicIcon className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Set Up SafeTunes
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Let&apos;s connect your Apple Music account and create profiles for
            your kids.
          </p>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-purple-900 mb-3">
              What we&apos;ll do:
            </h3>
            <ul className="space-y-2 text-purple-800">
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
                <span>Connect your Apple Music account for playback</span>
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
                <span>Set daily listening limits</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setStep(2)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg"
          >
            Let&apos;s Get Started
          </button>
        </div>
      )}

      {/* Step 2: Apple Music Authorization */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AppleMusicIcon className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Connect Apple Music
            </h2>
            <p className="text-gray-600">
              To play music, we need permission to access your Apple Music
              account.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {appleMusicAuthorized ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <div className="flex items-center text-green-800">
                <svg
                  className="w-6 h-6 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-semibold">Apple Music Connected!</p>
                  <p className="text-sm">You&apos;re all set to play music.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3 text-blue-900">
                <svg
                  className="w-6 h-6 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm">
                  <p className="font-semibold mb-1">
                    Apple Music will be connected in the SafeTunes app
                  </p>
                  <p className="text-blue-700">
                    After completing signup, you&apos;ll connect Apple Music
                    directly in the SafeTunes app using your Apple ID.
                  </p>
                </div>
              </div>
            </div>
          )}

          {appleMusicAuthorized ? (
            <button
              onClick={handleContinueToKids}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition"
            >
              Continue
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAppleMusicAuth}
                  disabled={combinedLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {combinedLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Setting up...
                    </>
                  ) : (
                    <>
                      <AppleMusicIcon className="w-5 h-5 mr-2" />
                      I Have Apple Music - Continue
                    </>
                  )}
                </button>

                <button
                  onClick={handleSkipAppleMusic}
                  className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-semibold transition border-2 border-gray-300"
                >
                  I&apos;ll Connect Later - Skip for Now
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                You can connect Apple Music anytime from Settings in the
                SafeTunes app.
              </p>
            </>
          )}
        </div>
      )}

      {/* Step 3: Kid Profiles */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-purple-600"
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
              Add your kids and set their daily listening limits
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>

                {/* Daily Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Listening Limit
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {DAILY_LIMIT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          updateKid(index, "dailyLimitMinutes", option.value)
                        }
                        className={`px-3 py-2 rounded-lg border text-sm transition ${
                          kid.dailyLimitMinutes === option.value
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-purple-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
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
              onClick={() => setStep(2)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
              disabled={combinedLoading}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCompleteOnboarding}
              disabled={combinedLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {combinedLoading ? "Saving..." : "Complete Setup"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              SafeTunes is Ready!
            </h2>
            <p className="text-gray-600">
              Save this information to share with your kids
            </p>
          </div>

          <div className="space-y-6">
            {/* Family Code Section */}
            {familyCode && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-900 text-lg">
                    Your Family Code
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(familyCode)}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
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
                  <p className="text-4xl font-bold text-purple-600 text-center tracking-widest font-mono">
                    {familyCode}
                  </p>
                </div>
                <p className="text-sm text-purple-800">
                  Your kids will need this code to log in to their music
                  dashboard
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
                    copyToClipboard("https://getsafetunes.com/play")
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
                  getsafetunes.com/play
                </p>
              </div>
              <p className="text-sm text-blue-800">
                Send this link to your kids so they can access their music
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
                <li>
                  They can now browse and request music you&apos;ve approved!
                </li>
              </ol>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href="https://getsafetunes.com/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-lg font-semibold text-lg transition shadow-lg text-center"
            >
              Open SafeTunes Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
