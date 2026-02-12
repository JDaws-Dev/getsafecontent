"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { Shield } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from localStorage (set during forgot password flow)
  useEffect(() => {
    const storedEmail = localStorage.getItem("safefamily_reset_email") || "";
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
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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
      localStorage.removeItem("safefamily_reset_email");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      console.error("[ResetPasswordPage] Password reset error:", err);
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

  // Show loading state while checking for email
  if (!email) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse">
          <Shield className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-navy">Safe Family</span>
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
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

              <h2 className="text-2xl font-bold text-navy mb-2">
                Password Reset Successful!
              </h2>
              <p className="text-navy/60 mb-6">
                Your password has been updated successfully. You can now log in
                with your new password.
              </p>

              <Link
                href="/login"
                className="inline-block rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold text-white transition hover:from-indigo-600 hover:to-purple-700"
              >
                Go to Login
              </Link>

              <p className="text-sm text-navy/40 mt-4">
                Redirecting to login in 3 seconds...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-navy">
                  Enter Reset Code
                </h1>
                <p className="mt-1 text-sm text-navy/60">
                  Enter the 6-digit code sent to{" "}
                  <strong className="text-navy">{email}</strong>
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* OTP Code Input */}
                <div>
                  <label className="block text-sm font-medium text-navy mb-3 text-center">
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
                        onChange={(e) =>
                          handleCodeChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-navy"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="new-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-indigo-600"
                    placeholder="At least 8 characters"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1 block text-sm font-medium text-navy"
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirm-password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-indigo-600"
                    placeholder="Confirm your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:from-indigo-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Resetting Password..." : "Reset Password"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-navy/60">
                  Didn&apos;t receive the code?{" "}
                  <Link
                    href="/forgot-password"
                    className="font-medium text-indigo-600 hover:text-indigo-700"
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
