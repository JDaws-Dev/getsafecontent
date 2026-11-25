"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowLeft, Lock, Library } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { AvatarIcon } from "./KidIcons";
import { useIsEmbedded } from "@/lib/embed";

// Solid avatar colours, the same treatment as the SafeTunes, SafeTube and
// SafeStudy pickers.
const COLOR_FILLS: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  yellow: "bg-yellow-500",
};

interface KidProfile {
  _id: Id<"kids">;
  name: string;
  age?: number;
  color: string;
  hasPin: boolean;
  readingLevel?: string;
  onboardingCompleted?: boolean;
}

interface ProfileSelectorProps {
  familyName: string;
  kids: KidProfile[];
  familyCode: string;
  userId: string;
  onBack: () => void;
}

export function ProfileSelector({
  familyName,
  kids,
  familyCode,
  userId,
  onBack,
}: ProfileSelectorProps) {
  const router = useRouter();
  const [selectedKid, setSelectedKid] = useState<KidProfile | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinChecking, setPinChecking] = useState(false);
  // Inside the hub's kid tabs the shell has the logo, "Not you?" and "Parents",
  // so this screen drops its own back button, code chip and library tile.
  const embedded = useIsEmbedded();

  // Verify PIN via mutation (with brute-force protection)
  const verifyPinMutation = useMutation(api.kids.verifyPinWithRateLimit);

  const handleProfileSelect = (kid: KidProfile) => {
    if (kid.hasPin) {
      setSelectedKid(kid);
      setPin("");
      setPinError("");
      setShowPinModal(true);
    } else {
      loginAsKid(kid);
    }
  };

  const loginAsKid = (kid: KidProfile) => {
    localStorage.setItem("safereads_family_code", familyCode);
    localStorage.setItem(
      "safereads_kid_profile",
      JSON.stringify({
        _id: kid._id,
        name: kid.name,
        age: kid.age,
        color: kid.color,
        userId: userId,
      })
    );
    // Store session start time for TTL enforcement (24h)
    localStorage.setItem("safereads_session_started", Date.now().toString());
    // Redirect to onboarding if not completed, otherwise go to home
    if (!kid.onboardingCompleted) {
      router.push("/read/onboarding");
    } else {
      router.push("/read/home");
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4 || !selectedKid) {
      setPinError("Enter 4 digits");
      return;
    }
    setPinChecking(true);
    try {
      const result = await verifyPinMutation({ kidId: selectedKid._id, pin });
      if (result.success) {
        loginAsKid(selectedKid);
      } else if (result.locked) {
        setPinError(`Too many attempts. Try again in ${result.remainingMinutes ?? 10} minutes.`);
        setPin("");
      } else {
        const remaining = (result as { attemptsRemaining?: number }).attemptsRemaining;
        setPinError(
          remaining !== undefined
            ? `Wrong PIN. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`
            : "Wrong PIN. Try again."
        );
        setPin("");
      }
    } catch {
      setPinError("Something went wrong. Try again.");
      setPin("");
    } finally {
      setPinChecking(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setPinError("");
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError("");
  };

  return (
    <div className={`flex min-h-[80vh] flex-col items-center px-4 ${embedded ? "pt-12 sm:pt-20 pb-12" : "pt-6"}`}>
      {!embedded && (
        <>
          {/* Header with back button */}
          <div className="mb-8 flex w-full max-w-md items-center justify-between">
            <button
              onClick={onBack}
              className="kid-touch flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-gray-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Different code
            </button>
            <div className="rounded-full bg-white/60 px-3 py-1 text-xs font-mono font-bold tracking-widest text-gray-400 backdrop-blur-sm">
              {familyCode}
            </div>
          </div>
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/5">
            <Library className="h-8 w-8 text-accent-600" strokeWidth={2.25} aria-hidden="true" />
          </div>
        </>
      )}

      {/* Same picker look as SafeTunes, SafeTube, SafeStudy */}
      <h1 className="text-center font-display text-3xl font-semibold text-[#221D2E]">
        Who&apos;s reading today?
      </h1>
      {familyName && (
        <p className="mt-1 text-center text-sm text-[#221D2E]/55">
          {familyName}&apos;s Family
        </p>
      )}

      {/* Profile Grid */}
      <div className="mt-8 flex w-full max-w-2xl flex-wrap justify-center gap-4 sm:gap-6">
        {kids.map((kid) => {
          const fillClass = COLOR_FILLS[kid.color] || COLOR_FILLS.purple;
          return (
            <button
              key={kid._id}
              onClick={() => handleProfileSelect(kid)}
              className="flex w-36 flex-col items-center gap-3 rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(34,29,46,0.08)] ring-1 ring-[#221D2E]/5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(34,29,46,0.12)] active:scale-[0.98] sm:w-40"
            >
              <div className={`flex h-20 w-20 items-center justify-center rounded-full shadow-md ${fillClass}`}>
                <AvatarIcon color={kid.color} className="h-9 w-9 text-white" />
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-lg font-semibold text-[#221D2E]">{kid.name}</span>
                {kid.hasPin && <Lock className="h-4 w-4 shrink-0 text-[#221D2E]/35" aria-label="Has a PIN" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* PIN Modal */}
      {showPinModal && selectedKid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-center">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${COLOR_FILLS[selectedKid.color] || COLOR_FILLS.purple}`}>
                <AvatarIcon color={selectedKid.color} className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-3 font-display text-lg font-bold text-brand-navy">
                Hi, {selectedKid.name}!
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your secret PIN
              </p>
            </div>

            {/* PIN dots */}
            <div className="mt-6 flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-5 w-5 rounded-full transition-all duration-200 ${
                    i < pin.length
                      ? "scale-110 bg-gradient-to-br from-accent-500 to-accent-600 shadow-md shadow-accent-200"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="mt-3 text-center text-sm font-medium text-red-500">{pinError}</p>
            )}

            {/* Number pad */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map(
                (key) => {
                  if (key === "") return <div key="empty" />;
                  if (key === "back") {
                    return (
                      <button
                        key="back"
                        onClick={handlePinBackspace}
                        className="kid-touch flex min-h-[48px] items-center justify-center rounded-2xl bg-gray-100 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-200 active:bg-gray-300"
                      >
                        Del
                      </button>
                    );
                  }
                  return (
                    <button
                      key={key}
                      onClick={() => handlePinDigit(key)}
                      className="kid-touch flex min-h-[48px] items-center justify-center rounded-2xl bg-gray-50 text-xl font-bold text-gray-800 transition-all hover:bg-accent-50 hover:text-accent-600 active:bg-accent-100 active:scale-95"
                    >
                      {key}
                    </button>
                  );
                }
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setSelectedKid(null);
                  setPin("");
                }}
                className="kid-touch flex-1 rounded-2xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pin.length !== 4 || pinChecking}
                className="kid-touch flex-1 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-accent-600 hover:to-accent-700 disabled:opacity-40"
              >
                {pinChecking ? "Checking..." : "Enter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
