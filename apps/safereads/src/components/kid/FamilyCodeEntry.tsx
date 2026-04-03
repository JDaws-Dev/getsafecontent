"use client";

import { useState, useRef, useEffect } from "react";
import { BookOpen, ArrowRight, KeyRound } from "lucide-react";

interface FamilyCodeEntryProps {
  onSubmit: (code: string) => void;
  error?: string;
  isLoading?: boolean;
}

export function FamilyCodeEntry({ onSubmit, error, isLoading }: FamilyCodeEntryProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (error) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [error]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow alphanumeric
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 are filled
    if (char && index === 5) {
      const code = newDigits.join("");
      if (code.length === 6) {
        onSubmit(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      const code = digits.join("");
      if (code.length === 6) {
        onSubmit(code);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focus the next empty input or the last one
    const nextEmpty = newDigits.findIndex((d) => !d);
    if (nextEmpty >= 0) {
      inputRefs.current[nextEmpty]?.focus();
    } else {
      inputRefs.current[5]?.focus();
      // Auto-submit
      if (pasted.length === 6) {
        onSubmit(pasted);
      }
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      {/* Floating decorative emojis */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="animate-float absolute left-[10%] top-[15%] text-3xl opacity-20" style={{ animationDelay: "0s" }}>
          {"📖"}
        </span>
        <span className="animate-float absolute right-[12%] top-[20%] text-2xl opacity-20" style={{ animationDelay: "1s" }}>
          {"🔑"}
        </span>
        <span className="animate-float absolute left-[20%] bottom-[25%] text-2xl opacity-20" style={{ animationDelay: "0.5s" }}>
          {"🏰"}
        </span>
        <span className="animate-float absolute right-[18%] bottom-[30%] text-3xl opacity-20" style={{ animationDelay: "1.5s" }}>
          {"📚"}
        </span>
      </div>

      {/* Logo / Header */}
      <div className="relative mb-8 flex flex-col items-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 shadow-xl shadow-purple-200">
            <BookOpen className="h-12 w-12 text-white" />
          </div>
          {/* Key icon overlay */}
          <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
        </div>
        <h1 className="mt-6 text-center font-serif text-3xl font-bold text-gray-900">
          SafeReads
        </h1>
        <p className="mt-3 text-center text-lg font-medium text-purple-600">
          Enter your family&apos;s secret code!
        </p>
        <p className="mt-1 text-center text-sm text-gray-400">
          Your reading adventure awaits inside...
        </p>
      </div>

      {/* Code Input */}
      <div
        className={`flex gap-2.5 sm:gap-3.5 ${shake ? "animate-shake" : ""}`}
        onPaste={handlePaste}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`h-16 w-12 rounded-2xl border-3 bg-white text-center text-2xl font-bold uppercase shadow-md transition-all duration-200 focus:outline-none focus:ring-3 sm:h-18 sm:w-15 sm:text-3xl ${
              error
                ? "border-red-300 text-red-600 focus:border-red-400 focus:ring-red-100"
                : digit
                  ? "border-purple-400 text-purple-700 shadow-purple-100 focus:border-purple-500 focus:ring-purple-100"
                  : "border-gray-200 text-gray-900 focus:border-purple-400 focus:ring-purple-100"
            }`}
            disabled={isLoading}
            aria-label={`Code digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5">
          <span className="text-lg">{"😕"}</span>
          <p className="text-sm font-medium text-red-600">
            {error}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={() => {
          const code = digits.join("");
          if (code.length === 6) onSubmit(code);
        }}
        disabled={digits.join("").length < 6 || isLoading}
        className="kid-touch mt-8 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-purple-200 transition-all duration-200 hover:from-violet-600 hover:to-purple-700 hover:shadow-xl hover:shadow-purple-300 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:hover:from-violet-500"
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Checking...
          </>
        ) : (
          <>
            Let&apos;s Go!
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      {/* Help text */}
      <div className="mt-8 rounded-2xl bg-white/60 px-6 py-4 text-center backdrop-blur-sm">
        <p className="text-sm text-gray-500">
          {"🤔"} Don&apos;t have a code?
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Ask your parent for the family code from SafeReads settings.
        </p>
      </div>
    </div>
  );
}
