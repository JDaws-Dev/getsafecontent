"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowLeft, Lock } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

// Fun avatar icons per color — gives each profile personality
const AVATAR_ICONS: Record<string, string> = {
  red: "\uD83D\uDC32",     // dragon
  blue: "\uD83D\uDE80",    // rocket
  green: "\uD83E\uDD89",   // owl
  purple: "\u2B50",         // star
  orange: "\uD83E\uDD81",  // lion
  pink: "\uD83E\uDD84",    // unicorn
  teal: "\uD83D\uDC2C",    // dolphin
  yellow: "\u26A1",         // lightning
};

// Gradient backgrounds for avatar circles
const COLOR_GRADIENTS: Record<string, string> = {
  red: "from-red-400 to-rose-500",
  blue: "from-blue-400 to-indigo-500",
  green: "from-emerald-400 to-teal-500",
  purple: "from-purple-400 to-violet-500",
  orange: "from-orange-400 to-amber-500",
  pink: "from-pink-400 to-rose-400",
  teal: "from-teal-400 to-cyan-500",
  yellow: "from-yellow-400 to-amber-400",
};

// Outer ring colors
const COLOR_RINGS: Record<string, string> = {
  red: "ring-red-200",
  blue: "ring-blue-200",
  green: "ring-emerald-200",
  purple: "ring-purple-200",
  orange: "ring-orange-200",
  pink: "ring-pink-200",
  teal: "ring-teal-200",
  yellow: "ring-yellow-200",
};

interface KidProfile {
  _id: Id<"kids">;
  name: string;
  age?: number;
  color: string;
  hasPin: boolean;
  readingLevel?: string;
}

interface ProfileSelectorProps {
  familyName: string;
  kids: KidProfile[];
  familyCode: string;
  onBack: () => void;
}

export function ProfileSelector({
  familyName,
  kids,
  familyCode,
  onBack,
}: ProfileSelectorProps) {
  const router = useRouter();
  const [selectedKid, setSelectedKid] = useState<KidProfile | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);

  // Verify PIN via Convex query
  const pinValid = useQuery(
    api.kids.verifyPin,
    selectedKid && pin.length === 4
      ? { kidId: selectedKid._id, pin }
      : "skip"
  );

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
      })
    );
    router.push("/play/home");
  };

  const handlePinSubmit = () => {
    if (pin.length !== 4) {
      setPinError("Enter 4 digits");
      return;
    }
    if (pinValid === true && selectedKid) {
      loginAsKid(selectedKid);
    } else if (pinValid === false) {
      setPinError("Wrong PIN. Try again.");
      setPin("");
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
    <div className="flex min-h-[80vh] flex-col items-center px-4 pt-6">
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

      {/* Header */}
      <div className="mb-2 text-center">
        <div className="relative mx-auto mb-4 w-fit">
          <span className="text-5xl">{"\uD83D\uDCDA"}</span>
          <span className="absolute -right-2 -top-1 animate-float text-lg" style={{ animationDelay: "0.5s" }}>{"✨"}</span>
        </div>
        <h1 className="text-center font-serif text-2xl font-bold text-gray-900">
          {familyName}&apos;s Library
        </h1>
        <p className="mt-2 text-center text-lg font-medium text-purple-600">
          Who&apos;s reading today?
        </p>
      </div>

      {/* Profile Grid */}
      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-4 sm:max-w-lg sm:grid-cols-3 sm:gap-5 lg:max-w-2xl lg:grid-cols-4">
        {kids.map((kid) => {
          const gradientClass = COLOR_GRADIENTS[kid.color] || COLOR_GRADIENTS.purple;
          const ringClass = COLOR_RINGS[kid.color] || COLOR_RINGS.purple;
          const icon = AVATAR_ICONS[kid.color] || "\u2B50";
          return (
            <button
              key={kid._id}
              onClick={() => handleProfileSelect(kid)}
              className="animate-bounce-in group flex min-h-[140px] flex-col items-center gap-3 rounded-3xl border-2 border-transparent bg-white p-5 shadow-md transition-all duration-200 hover:border-purple-200 hover:shadow-xl hover:-translate-y-1.5 active:scale-95 sm:p-6"
            >
              {/* Avatar with gradient + icon */}
              <div className={`relative flex h-[84px] w-[84px] items-center justify-center rounded-full bg-gradient-to-br ${gradientClass} ring-4 ${ringClass} shadow-lg transition-transform duration-200 group-hover:scale-110 sm:h-24 sm:w-24`}>
                <span className="text-4xl sm:text-5xl drop-shadow-sm">{icon}</span>
                {kid.hasPin && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-white">
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-gray-800">
                  {kid.name}
                </span>
                {kid.age !== undefined && (
                  <p className="mt-0.5 text-xs font-medium text-gray-400">
                    Age {kid.age}
                  </p>
                )}
                {kid.readingLevel && (
                  <p className="mt-1 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-500">
                    {kid.readingLevel}
                  </p>
                )}
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
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${COLOR_GRADIENTS[selectedKid.color] || COLOR_GRADIENTS.purple}`}>
                <span className="text-3xl">{AVATAR_ICONS[selectedKid.color] || "\u2B50"}</span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-gray-900">
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
                      ? "scale-110 bg-gradient-to-br from-purple-500 to-violet-500 shadow-md shadow-purple-200"
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
                      className="kid-touch flex min-h-[48px] items-center justify-center rounded-2xl bg-gray-50 text-xl font-bold text-gray-800 transition-all hover:bg-purple-50 hover:text-purple-600 active:bg-purple-100 active:scale-95"
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
                disabled={pin.length !== 4}
                className="kid-touch flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-violet-600 hover:to-purple-700 disabled:opacity-40"
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
