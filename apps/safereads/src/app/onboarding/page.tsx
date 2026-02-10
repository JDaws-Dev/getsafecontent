"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { BookOpen, Users, ArrowRight, Plus, X } from "lucide-react";
import { KidForm, KidFormValues } from "@/components/KidForm";
import { Id } from "../../../convex/_generated/dataModel";

type AddedKid = { name: string; age?: number };

export default function OnboardingPage() {
  const router = useRouter();

  const currentUser = useQuery(api.users.currentUser);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const createKid = useMutation(api.kids.create);

  const [step, setStep] = useState(0);
  const [kids, setKids] = useState<AddedKid[]>([]);
  const [showKidForm, setShowKidForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
      // Create all kids
      for (const kid of kids) {
        await createKid({
          userId: currentUser._id as Id<"users">,
          name: kid.name,
          age: kid.age,
        });
      }
      // Mark onboarding complete
      await completeOnboarding();
      router.replace("/dashboard");
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
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
                  <div>
                    <span className="font-medium text-ink-900">{kid.name}</span>
                    {kid.age !== undefined && (
                      <span className="ml-2 text-sm text-ink-400">
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

      {/* Step 2: Done */}
      {step === 2 && (
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
              {saving ? "Setting up…" : "Start Searching"}
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setStep(1)}
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
