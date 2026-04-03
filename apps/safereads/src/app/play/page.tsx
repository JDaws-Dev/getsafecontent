"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FamilyCodeEntry } from "@/components/kid/FamilyCodeEntry";
import { ProfileSelector } from "@/components/kid/ProfileSelector";

/**
 * /play - Kid login page
 *
 * Flow:
 * 1. Check localStorage for saved family code + profile
 * 2. If both exist, redirect to /play/home
 * 3. If only code exists, show profile selection
 * 4. If neither, show family code entry
 */
export default function PlayPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "code" | "profiles">("loading");
  const [familyCode, setFamilyCode] = useState("");
  const [error, setError] = useState("");

  // Validate the family code against Convex
  const familyData = useQuery(
    api.familyCodes.validateCode,
    familyCode ? { code: familyCode } : "skip"
  );

  // Check localStorage on mount
  useEffect(() => {
    const savedCode = localStorage.getItem("safereads_family_code");
    const savedProfile = localStorage.getItem("safereads_kid_profile");

    if (savedCode && savedProfile) {
      // Already logged in as a kid - go to home
      router.replace("/play/home");
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
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (step === "code" || !familyCode) {
    return (
      <FamilyCodeEntry
        onSubmit={handleCodeSubmit}
        error={error}
        isLoading={!!familyCode && familyData === undefined}
      />
    );
  }

  // Waiting for validation
  if (familyData === undefined) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  // Show profile selection
  if (familyData && familyData.kids.length > 0) {
    return (
      <ProfileSelector
        familyName={familyData.familyName}
        kids={familyData.kids}
        familyCode={familyCode}
        onBack={handleBack}
      />
    );
  }

  // Family code valid but no kids
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-semibold text-gray-800">
        No reader profiles yet
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Ask your parent to add your profile in SafeReads first.
      </p>
      <button
        onClick={handleBack}
        className="mt-6 rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Try a different code
      </button>
    </div>
  );
}
