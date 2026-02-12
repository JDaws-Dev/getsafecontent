"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { Shield } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Request password reset via Convex Auth
      // This will send an OTP code to the user's email via ResendOTPPasswordReset
      await signIn("password", {
        email: email,
        flow: "reset",
      });

      // Success - store email for reset page and show confirmation
      localStorage.setItem("safefamily_reset_email", email);
      setSubmitted(true);
      setLoading(false);
    } catch (err) {
      console.error("[ForgotPasswordPage] Password reset error:", err);
      // Don't reveal if email exists or not for security
      // Always show success message
      localStorage.setItem("safefamily_reset_email", email);
      setSubmitted(true);
      setLoading(false);
    }
  };

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
          {!submitted ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-navy">Reset Password</h1>
                <p className="mt-1 text-sm text-navy/60">
                  We&apos;ll send you a 6-digit code to reset your password
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-navy"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-indigo-600"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:from-indigo-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Code"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-navy/60">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          ) : (
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
                Check Your Email
              </h2>
              <p className="text-navy/60 mb-6">
                We&apos;ve sent a 6-digit reset code to{" "}
                <strong className="text-navy">{email}</strong>.
              </p>

              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">
                  <strong>Next Steps:</strong> Check your inbox for an email
                  from Safe Family with your reset code. The code will expire in
                  1 hour for security purposes.
                </p>
              </div>

              <button
                onClick={() => router.push("/reset-password")}
                className="w-full min-h-[48px] rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:from-indigo-600 hover:to-purple-700 mb-3"
              >
                Enter Reset Code
              </button>

              <button
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Didn&apos;t receive it? Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
