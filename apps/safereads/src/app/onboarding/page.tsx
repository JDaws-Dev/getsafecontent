"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { BookOpen, Users, ArrowRight, Plus, X, Copy, Check, Key } from "lucide-react";
import { KidForm, KidFormValues } from "@/components/KidForm";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";

type AddedKid = { name: string; age?: number; color?: string; pin?: string; readingLevel?: string };

export default function OnboardingPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();

  const currentUser = useQuery(
    api.users.currentUser,
    authUser?.email ? { email: authUser.email } : "skip"
  );
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const createKid = useMutation(api.kids.create);
  const userId = useQuery(
    api.users.currentUserId,
    authUser?.email ? { email: authUser.email } : "skip"
  );
  const familyCodeData = useQuery(
    api.familyCodes.getByUser,
    userId ? { userId } : "skip"
  );

  const [step, setStep] = useState(0);
  const [kids, setKids] = useState<AddedKid[]>([]);
  const [showKidForm, setShowKidForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [preApprovedLevel, setPreApprovedLevel] = useState<"safe_only" | "safe_and_caution" | "all_classics">("safe_and_caution");
  const updatePreApprovedLevel = useMutation(api.users.updatePreApprovedLevel);

  // Redirect if already onboarded
  if (currentUser?.onboardingComplete) {
    router.replace("/dashboard");
    return null;
  }

  // Show loading state while user data loads
  if (currentUser === undefined) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-parchment-300 border-t-parchment-700" />
      </div>
    );
  }

  // Handle case where user doesn't exist (shouldn't happen with Convex Auth)
  if (currentUser === null) {
    return null;
  }

  function addKid(values: KidFormValues) {
    setKids((prev) => [...prev, values]);
    setShowKidForm(false);
  }

  function removeKid(index: number) {
    setKids((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleComplete() {
    if (!currentUser) return;
    setSaving(true);
    try {
      // Create all kids with full profile data
      for (const kid of kids) {
        await createKid({
          userId: currentUser._id as Id<"users">,
          name: kid.name,
          age: kid.age,
          color: kid.color,
          pin: kid.pin,
          readingLevel: kid.readingLevel,
        });
      }
      // Save content preferences
      if (authUser?.email) {
        await updatePreApprovedLevel({ email: authUser.email, level: preApprovedLevel });
      }

      // Mark onboarding complete
      if (!authUser?.email) {
        throw new Error("Not authenticated");
      }
      await completeOnboarding({ email: authUser.email });
      router.replace("/dashboard");
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step
                ? "w-8 bg-parchment-700"
                : i < step
                  ? "w-2 bg-parchment-500"
                  : "w-2 bg-parchment-300"
            }`}
          />
        ))}
      </div>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-parchment-100">
            <BookOpen className="h-8 w-8 text-parchment-700" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink-900">
            Welcome to SafeReads
          </h1>
          <p className="mt-4 text-ink-600">
            Get objective content reviews for books before your kids read them.
            Search by title, scan a barcode, or snap a photo of the cover.
          </p>
          <p className="mt-3 text-sm text-ink-400">
            Our AI reviews books for violence, language, sexual content, and
            more — so you can make informed decisions.
          </p>
          <button
            onClick={() => setStep(1)}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-parchment-700 px-6 py-3 font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 1: Add kids (optional) */}
      {step === 1 && (
        <div>
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-parchment-100">
              <Users className="h-8 w-8 text-parchment-700" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-ink-900">
              Add Your Kids
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Add your children so you can build wishlists for each one. You can
              always do this later.
            </p>
          </div>

          {/* Added kids list */}
          {kids.length > 0 && (
            <div className="mt-6 space-y-2">
              {kids.map((kid, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-parchment-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full ${
                      kid.color === "red" ? "bg-red-400" :
                      kid.color === "blue" ? "bg-blue-400" :
                      kid.color === "green" ? "bg-green-400" :
                      kid.color === "orange" ? "bg-orange-400" :
                      kid.color === "pink" ? "bg-pink-400" :
                      kid.color === "teal" ? "bg-teal-400" :
                      kid.color === "yellow" ? "bg-yellow-400" :
                      "bg-purple-400"
                    }`} />
                    <span className="font-medium text-ink-900">{kid.name}</span>
                    {kid.age !== undefined && (
                      <span className="text-sm text-ink-400">
                        age {kid.age}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeKid(i)}
                    className="rounded p-1 text-ink-400 hover:bg-parchment-100 hover:text-ink-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add kid form or button */}
          {showKidForm ? (
            <div className="mt-4 rounded-lg border border-parchment-200 bg-white p-4">
              <KidForm onSubmit={addKid} submitLabel="Add" />
              <button
                onClick={() => setShowKidForm(false)}
                className="mt-2 w-full text-center text-sm text-ink-400 hover:text-ink-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowKidForm(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-parchment-300 px-4 py-3 text-sm text-ink-500 transition-colors hover:border-parchment-500 hover:text-ink-700"
            >
              <Plus className="h-4 w-4" />
              Add a child
            </button>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 rounded-lg border border-parchment-300 px-4 py-3 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-parchment-700 px-4 py-3 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
            >
              {kids.length > 0 ? "Continue" : "Skip for now"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Family Code */}
      {step === 2 && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <Key className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-ink-900">
            Your Family Code
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Share this code with your kids so they can access their own reading experience.
          </p>

          {familyCodeData ? (
            <div className="mt-6 space-y-4">
              <div className="mx-auto flex max-w-xs items-center justify-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <p className="font-mono text-3xl font-bold tracking-[0.3em] text-emerald-700">
                  {familyCodeData.code}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(familyCodeData.code);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  {codeCopied ? (
                    <><Check className="h-3.5 w-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
                  )}
                </button>
              </div>
              <p className="text-sm text-ink-500">
                Kids go to{" "}
                <span className="font-semibold text-emerald-700">getsafereads.com/read</span>{" "}
                and enter this code.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mx-auto h-8 w-48 animate-pulse rounded-lg bg-parchment-200" />
              <p className="mt-3 text-xs text-ink-400">Loading your family code...</p>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-parchment-300 px-4 py-3 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-parchment-700 px-4 py-3 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Content Preferences */}
      {step === 3 && (
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink-900">
            Reading Comfort Level
          </h2>
          <p className="mt-2 text-ink-600">
            SafeReads includes a library of classic books your kids can read freely.
            Choose which classics are pre-approved:
          </p>

          <div className="mt-6 space-y-3">
            {[
              {
                level: "safe_only" as const,
                label: "Safe Only",
                description: "Picture books, gentle fairy tales, simple adventures (Peter Rabbit, Wizard of Oz, Alice in Wonderland)",
                color: "emerald",
                border: "border-emerald-200",
                bg: "bg-emerald-50",
                ring: "ring-emerald-400",
              },
              {
                level: "safe_and_caution" as const,
                label: "Safe + Moderate",
                description: "Includes adventure classics with mild themes (Treasure Island, Tom Sawyer, Sherlock Holmes)",
                color: "amber",
                border: "border-amber-200",
                bg: "bg-amber-50",
                ring: "ring-amber-400",
                recommended: true,
              },
              {
                level: "all_classics" as const,
                label: "All Classics",
                description: "Includes all classic literature, some with darker themes (Dracula, Frankenstein, Jane Eyre)",
                color: "orange",
                border: "border-orange-200",
                bg: "bg-orange-50",
                ring: "ring-orange-400",
              },
            ].map((option) => (
              <button
                key={option.level}
                onClick={() => setPreApprovedLevel(option.level)}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  preApprovedLevel === option.level
                    ? `${option.border} ${option.bg} ring-2 ${option.ring}`
                    : "border-parchment-200 bg-white hover:border-parchment-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-900">{option.label}</span>
                  {option.recommended && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-500">{option.description}</p>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-ink-400">
            You can change this anytime in Settings. You can also exclude individual books per child.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-parchment-300 px-4 py-3 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-parchment-700 px-4 py-3 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-verdict-safe/10">
            <BookOpen className="h-8 w-8 text-verdict-safe" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-ink-900">
            You&apos;re All Set
          </h2>
          <p className="mt-2 text-ink-600">
            Start searching for books to get instant content reviews.
          </p>
          {kids.length > 0 && (
            <p className="mt-1 text-sm text-ink-400">
              {kids.length} {kids.length === 1 ? "child" : "children"} added.
              You can manage them anytime from the Kids page.
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={handleComplete}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-parchment-700 px-6 py-3 font-medium text-parchment-50 transition-colors hover:bg-parchment-800 disabled:opacity-50"
            >
              {saving ? "Setting up..." : "Start Searching"}
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setStep(3)}
              className="text-sm text-ink-400 hover:text-ink-600"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
