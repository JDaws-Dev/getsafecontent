"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FamilyCodeEntry } from "@/components/kid/FamilyCodeEntry";
import { ProfileSelector } from "@/components/kid/ProfileSelector";
import { BookOpen } from "lucide-react";

/**
 * /play - Kid login page
 *
 * Flow:
 * 1. Check localStorage for saved family code + profile
 * 2. If both exist, redirect to /read/home
 * 3. If only code exists, show profile selection
 * 4. If neither, show family code entry
 */
export default function PlayPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "code" | "profiles" | "expired">("loading");
  const [familyCode, setFamilyCode] = useState("");
  const [error, setError] = useState("");

  // Validate the family code against Convex
  const familyData = useQuery(
    api.familyCodes.validateCode,
    familyCode ? { code: familyCode } : "skip"
  );

  // Check localStorage on mount
  useEffect(() => {
    // URL ?fc=ABCDEF wins — kid arrived from another Safe Family app's
    // cross-app switcher. Same unified family code works across all 5 apps.
    const fcParam = new URL(window.location.href).searchParams.get("fc");
    if (fcParam) {
      const normalized = fcParam.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (normalized.length === 6) {
        localStorage.setItem("safereads_family_code", normalized);
        setFamilyCode(normalized);
        setStep("profiles");
        return;
      }
    }

    const savedCode = localStorage.getItem("safereads_family_code");
    const savedProfile = localStorage.getItem("safereads_kid_profile");
    const sessionStarted = localStorage.getItem("safereads_session_started");

    // Check session TTL (24 hours)
    const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
    if (sessionStarted && Date.now() - parseInt(sessionStarted, 10) > SESSION_TTL_MS) {
      // Session expired — clear everything
      localStorage.removeItem("safereads_kid_profile");
      localStorage.removeItem("safereads_family_code");
      localStorage.removeItem("safereads_session_started");
      setStep("code");
      return;
    }

    if (savedCode && savedProfile) {
      // Already logged in as a kid - go to home
      router.replace("/read/home");
      return;
    }

    if (savedCode) {
      // Has code but no profile selected
      setFamilyCode(savedCode);
      setStep("profiles");
    } else {
      setStep("code");
    }
  }, [router]);

  // Handle family code submission
  const handleCodeSubmit = (code: string) => {
    setError("");
    setFamilyCode(code.toUpperCase().trim());
    setStep("profiles");
  };

  // Handle validation result
  useEffect(() => {
    if (familyCode && familyData === null) {
      setError("That code doesn't match any family. Check with your parent.");
      setStep("code");
      setFamilyCode("");
    }
    // Handle subscription expired
    if (familyCode && familyData && "error" in familyData && familyData.error === "subscription_expired") {
      setError("");
      setStep("expired");
      setFamilyCode("");
    }
  }, [familyData, familyCode]);

  // Handle going back to code entry
  const handleBack = () => {
    localStorage.removeItem("safereads_family_code");
    setFamilyCode("");
    setError("");
    setStep("code");
  };

  if (step === "loading") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg">
          <BookOpen className="h-8 w-8 animate-pulse text-white" />
        </div>
      </div>
    );
  }

  if (step === "expired") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
          <span className="text-4xl">{"\u23F3"}</span>
        </div>
        <p className="mt-5 text-xl font-bold text-gray-800">
          Subscription Inactive
        </p>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Ask your parent to renew the subscription at{" "}
          <span className="font-medium text-purple-600">getsafefamily.com</span>
        </p>
        <button
          onClick={handleBack}
          className="kid-touch mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-purple-600 shadow-md transition-all hover:shadow-lg active:scale-95"
        >
          Try a different code
        </button>
      </div>
    );
  }

  if (step === "code" || !familyCode) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-start">
        <FamilyCodeEntry
          onSubmit={handleCodeSubmit}
          error={error}
          isLoading={!!familyCode && familyData === undefined}
        />
        <div className="mt-2 w-full max-w-xs px-4">
          <OtherSafeFamilyApps current="safereads" familyCode={familyCode} />
        </div>
      </div>
    );
  }

  // Waiting for validation
  if (familyData === undefined) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg">
          <BookOpen className="h-8 w-8 animate-pulse text-white" />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-400">Loading your family...</p>
      </div>
    );
  }

  // Show profile selection
  if (familyData && "kids" in familyData && familyData.kids && familyData.kids.length > 0) {
    return (
      <ProfileSelector
        familyName={familyData.familyName ?? "Your Family"}
        kids={familyData.kids}
        familyCode={familyCode}
        userId={familyData.userId}
        onBack={handleBack}
      />
    );
  }

  // Family code valid but no kids (issue #8: add parent link)
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-purple-50">
        <span className="text-4xl">{"\uD83D\uDCDA"}</span>
      </div>
      <p className="mt-5 text-xl font-bold text-gray-800">
        No reader profiles yet
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Ask your parent to add your profile in SafeReads first.
      </p>
      <p className="mt-3 text-xs text-gray-400">
        Parents:{" "}
        <a href="/dashboard" className="font-medium text-purple-600 underline">
          tap here to add profiles
        </a>
      </p>
      <button
        onClick={handleBack}
        className="kid-touch mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-purple-600 shadow-md transition-all hover:shadow-lg active:scale-95"
      >
        Try a different code
      </button>
    </div>
  );
}

const OTHER_APPS = [
  { id: "safetunes", label: "Music", emoji: "🎵", host: "https://getsafetunes.com", url: "/play", accent: "text-pink-500" },
  { id: "safetube", label: "Video", emoji: "📺", host: "https://getsafetube.com", url: "/play", accent: "text-red-500" },
  { id: "safereads", label: "Books", emoji: "📚", host: "https://getsafereads.com", url: "/read", accent: "text-orange-500" },
  { id: "safestudy", label: "Search", emoji: "🔎", host: "https://getsafestudy.com", url: "/play", accent: "text-blue-500" },
  { id: "safespark", label: "Build", emoji: "✨", host: "https://getsafespark.com", url: "/make", accent: "text-violet-500" },
];

function OtherSafeFamilyApps({ current, familyCode }: { current: string; familyCode: string }) {
  const others = OTHER_APPS.filter((a) => a.id !== current);
  const fc = (familyCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const suffix = fc.length === 6 ? `?fc=${fc}` : "";
  return (
    <div className="pt-6 mt-6 border-t border-gray-200">
      <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-3 text-center">
        Other Safe Family apps
      </p>
      <div className="grid grid-cols-4 gap-2">
        {others.map((a) => (
          <a
            key={a.id}
            href={`${a.host}${a.url}${suffix}`}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            <span className="text-2xl leading-none">{a.emoji}</span>
            <span className={`text-[11px] font-bold ${a.accent}`}>{a.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
