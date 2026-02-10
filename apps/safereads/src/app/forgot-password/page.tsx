"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { BookOpen } from "lucide-react";

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
      localStorage.setItem("safereads_reset_email", email);
      setSubmitted(true);
      setLoading(false);
    } catch (err) {
      console.error("Password reset error:", err);
      // Don't reveal if email exists or not for security
      // Always show success message
      localStorage.setItem("safereads_reset_email", email);
      setSubmitted(true);
      setLoading(false);
    }
  };

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
          {!submitted ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-serif text-2xl font-bold text-ink-900">
                  Reset Password
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                  We&apos;ll send you a 6-digit code to reset your password
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-ink-700"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-parchment-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-parchment-600"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-parchment-700 px-4 py-3 font-semibold text-parchment-50 transition hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Code"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-ink-500">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-parchment-600 hover:text-parchment-700"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          ) : (
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
                Check Your Email
              </h2>
              <p className="mb-6 text-sm text-ink-500">
                We&apos;ve sent a 6-digit reset code to{" "}
                <strong className="text-ink-700">{email}</strong>.
              </p>

              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left">
                <p className="text-sm text-blue-800">
                  <strong>Next Steps:</strong> Check your inbox for an email
                  from SafeReads with your reset code. The code will expire in 1
                  hour for security purposes.
                </p>
              </div>

              <button
                onClick={() => router.push("/reset-password")}
                className="mb-3 w-full rounded-lg bg-parchment-700 px-6 py-3 font-semibold text-parchment-50 transition hover:bg-parchment-800"
              >
                Enter Reset Code
              </button>

              <button
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="text-sm text-parchment-600 hover:text-parchment-700"
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
