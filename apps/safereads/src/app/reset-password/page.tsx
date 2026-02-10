"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { BookOpen } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from localStorage (set during forgot password flow)
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedEmail = localStorage.getItem("safereads_reset_email") || "";
    if (!storedEmail) {
      router.push("/forgot-password");
    } else {
      setEmail(storedEmail);
    }
  }, [router]);

  // Handle individual code digit input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) {
      value = value.slice(-1);
    }

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace to go to previous input
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste of full code
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pastedData.length === 6) {
      setCode(pastedData.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const fullCode = code.join("");

    // Validation
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      // Complete password reset with OTP code via Convex Auth
      await signIn("password", {
        email: email,
        code: fullCode,
        newPassword: password,
        flow: "reset-verification",
      });

      // Success!
      setSuccess(true);
      setLoading(false);

      // Clear stored email
      localStorage.removeItem("safereads_reset_email");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      const errorMessage = err instanceof Error ? err.message : "";
      if (
        errorMessage.includes("code") ||
        errorMessage.includes("expired") ||
        errorMessage.includes("invalid")
      ) {
        setError("Invalid or expired code. Please request a new one.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
      setLoading(false);
    }
  };

  if (!email) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-parchment-50">
      <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-parchment-600" />
            <span className="font-serif text-2xl font-bold text-ink-900">
              SafeReads
            </span>
          </Link>
        </div>

        <div className="rounded-xl border border-parchment-200 bg-white p-8 shadow-sm">
          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="mb-2 font-serif text-xl font-bold text-ink-900">
                Password Reset Successful!
              </h2>
              <p className="mb-6 text-sm text-ink-500">
                Your password has been updated successfully. You can now log in
                with your new password.
              </p>

              <Link
                href="/login"
                className="inline-block rounded-lg bg-parchment-700 px-6 py-2 font-semibold text-parchment-50 transition hover:bg-parchment-800"
              >
                Go to Login
              </Link>

              <p className="mt-4 text-sm text-ink-400">
                Redirecting to login in 3 seconds...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-serif text-2xl font-bold text-ink-900">
                  Enter Reset Code
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                  Enter the 6-digit code sent to{" "}
                  <strong className="text-ink-700">{email}</strong>
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* OTP Code Input */}
                <div>
                  <label className="mb-3 block text-center text-sm font-medium text-ink-700">
                    Reset Code
                  </label>
                  <div
                    className="flex justify-center gap-2"
                    onPaste={handlePaste}
                  >
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="h-14 w-12 rounded-lg border border-parchment-300 text-center text-2xl font-bold focus:border-transparent focus:ring-2 focus:ring-parchment-600"
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-ink-700"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-parchment-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-parchment-600"
                    placeholder="At least 8 characters"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1 block text-sm font-medium text-ink-700"
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-parchment-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-parchment-600"
                    placeholder="Confirm your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-parchment-700 px-4 py-3 font-semibold text-parchment-50 transition hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Resetting Password..." : "Reset Password"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-ink-500">
                  Didn&apos;t receive the code?{" "}
                  <Link
                    href="/forgot-password"
                    className="font-medium text-parchment-600 hover:text-parchment-700"
                  >
                    Request new code
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
