"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ClipboardEvent as ReactClipboardEvent,
} from "react";

export interface FamilyCodeInputProps {
  /** Current value (uppercase alphanumeric). Parent is responsible for trimming to 6 chars. */
  value: string;
  /** Called when the user edits any cell. Always receives an uppercase value. */
  onChange: (next: string) => void;
  /** Code length. Defaults to 6 (Safe Family standard). */
  length?: number;
  /** Autofocus the first empty cell on mount. */
  autoFocus?: boolean;
  /** Visible as red shake; does not affect layout. */
  shake?: boolean;
  /** Tailwind ring color token applied on focus. Defaults to blue (SafeStudy). */
  accentRingClass?: string;
  /** Tailwind border color on focus. */
  accentBorderClass?: string;
  /** aria-describedby to point at an error region */
  ariaDescribedBy?: string;
}

/**
 * FamilyCodeInput — 6-box segmented entry matching the SafeReads / SafeStudy
 * pattern. Each app can theme via accentRingClass + accentBorderClass.
 *
 * Extracted from SafeStudy's FamilyCodeEntry (2026-04-19 UX audit round 5).
 * Kept intentionally headless-ish: parent decides background, error rendering,
 * submit button placement.
 */
export function FamilyCodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  shake = false,
  accentRingClass = "focus:ring-blue-200 dark:focus:ring-blue-900/40",
  accentBorderClass = "focus:border-blue-500",
  ariaDescribedBy,
}: FamilyCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const digits = value
    .padEnd(length, " ")
    .slice(0, length)
    .split("");

  const setDigitAt = useCallback(
    (i: number, char: string) => {
      const next = digits.slice();
      next[i] = char;
      const joined = next.join("").replace(/\s+$/, "");
      onChange(joined.toUpperCase());
    },
    [digits, onChange]
  );

  const handleChange = (i: number, raw: string) => {
    const char = raw.slice(-1).toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;
    setDigitAt(i, char || " ");
    if (char && i < length - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[i].trim() && i > 0) {
        inputRefs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: ReactClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, length);
    if (!text) return;
    onChange(text);
    const nextFocus = Math.min(text.length, length - 1);
    setTimeout(() => inputRefs.current[nextFocus]?.focus(), 0);
  };

  return (
    <div className={`flex justify-center gap-2 ${shake ? "animate-shake" : ""}`}>
      {digits.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={1}
          value={char.trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-mono font-bold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-4 ${accentRingClass} ${accentBorderClass} uppercase transition-all duration-150 shadow-sm`}
          aria-label={`Family code character ${i + 1}`}
          aria-describedby={ariaDescribedBy}
        />
      ))}
    </div>
  );
}
