"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowLeft, Lock } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

// Avatar colors matching SafeTunes/SafeStudy pattern
const COLOR_MAP: Record<string, string> = {
  red: "bg-red-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  teal: "bg-teal-400",
  yellow: "bg-yellow-400",
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
    <div className="flex min-h-[80vh] flex-col items-center px-4 pt-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1 self-start text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Different family code
      </button>

      {/* Header */}
      <h1 className="text-center font-serif text-2xl font-bold text-gray-900">
        {familyName}
      </h1>
      <p className="mt-2 text-center text-base text-gray-500">
        Who&apos;s reading today?
      </p>

      {/* Profile Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kids.map((kid) => {
          const colorClass = COLOR_MAP[kid.color] || COLOR_MAP.purple;
          return (
            <button
              key={kid._id}
              onClick={() => handleProfileSelect(kid)}
              className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-transparent bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md active:scale-95"
            >
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full ${colorClass} text-3xl font-bold text-white shadow-md transition-transform group-hover:scale-105`}
              >
                {kid.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-base font-semibold text-gray-800">
                {kid.name}
              </span>
              {kid.age !== undefined && (
                <span className="text-xs text-gray-400">Age {kid.age}</span>
              )}
              {kid.hasPin && (
                <Lock className="h-3.5 w-3.5 text-gray-300" />
              )}
            </button>
          );
        })}
      </div>

      {/* PIN Modal */}
      {showPinModal && selectedKid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-center text-lg font-bold text-gray-900">
              Enter PIN for {selectedKid.name}
            </h2>

            {/* PIN dots */}
            <div className="mt-6 flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full transition-all ${
                    i < pin.length
                      ? "scale-110 bg-emerald-500"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="mt-3 text-center text-sm text-red-500">{pinError}</p>
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
                        className="flex h-14 items-center justify-center rounded-xl bg-gray-100 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300"
                      >
                        Del
                      </button>
                    );
                  }
                  return (
                    <button
                      key={key}
                      onClick={() => handlePinDigit(key)}
                      className="flex h-14 items-center justify-center rounded-xl bg-gray-50 text-xl font-semibold text-gray-800 transition-colors hover:bg-emerald-50 active:bg-emerald-100"
                    >
                      {key}
                    </button>
                  );
                }
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setSelectedKid(null);
                  setPin("");
                }}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pin.length !== 4}
                className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-40"
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
