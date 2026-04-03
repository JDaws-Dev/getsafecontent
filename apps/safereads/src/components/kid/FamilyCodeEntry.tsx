"use client";

import { useState, useRef, useEffect } from "react";
import { BookOpen, ArrowRight } from "lucide-react";

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
      {/* Logo / Header */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
          <BookOpen className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-6 text-center font-serif text-3xl font-bold text-gray-900">
          SafeReads
        </h1>
        <p className="mt-2 text-center text-lg text-gray-500">
          Enter your family code to get started
        </p>
      </div>

      {/* Code Input */}
      <div
        className={`flex gap-2 sm:gap-3 ${shake ? "animate-shake" : ""}`}
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
            className={`h-14 w-11 rounded-xl border-2 bg-white text-center text-xl font-bold uppercase shadow-sm transition-all focus:outline-none focus:ring-2 sm:h-16 sm:w-14 sm:text-2xl ${
              error
                ? "border-red-300 text-red-600 focus:border-red-400 focus:ring-red-200"
                : digit
                  ? "border-emerald-400 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200"
                  : "border-gray-200 text-gray-900 focus:border-emerald-400 focus:ring-emerald-200"
            }`}
            disabled={isLoading}
            aria-label={`Code digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-4 text-center text-sm font-medium text-red-500">
          {error}
        </p>
      )}

      {/* Submit Button */}
      <button
        onClick={() => {
          const code = digits.join("");
          if (code.length === 6) onSubmit(code);
        }}
        disabled={digits.join("").length < 6 || isLoading}
        className="mt-8 flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500"
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Checking...
          </>
        ) : (
          <>
            Let&apos;s Go
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      {/* Help text */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Ask your parent for the family code.
        <br />
        They can find it in their SafeReads settings.
      </p>
    </div>
  );
}
