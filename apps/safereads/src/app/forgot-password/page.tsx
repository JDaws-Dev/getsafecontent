"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [oauthOnly, setOauthOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOauthOnly(false);
    setLoading(true);

    try {
      const emailToSend = email.toLowerCase().trim();
      const result = await requestPasswordReset(emailToSend);

      if (!result.success) {
        if (result.code === "OAUTH_ONLY") {
          // User signed up with Google, can't reset password
          setOauthOnly(true);
          setLoading(false);
          return;
        }
        // Generic error
        setError(result.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Success - store email for reset page and show confirmation
      localStorage.setItem("safereads_reset_email", email);
      setSubmitted(true);
      setLoading(false);
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Something went wrong. Please try again.");
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
          {oauthOnly ? (
            // User signed up with Google OAuth
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>

              <h2 className="mb-2 font-serif text-xl font-bold text-ink-900">
                Use Google Sign-In
              </h2>
              <p className="mb-6 text-sm text-ink-500">
                This account uses Google sign-in. Please use the Google sign-in
                option on the login page to access your account.
              </p>

              <Link
                href="/login"
                className="mb-3 block w-full rounded-lg bg-parchment-700 px-6 py-3 text-center font-semibold text-parchment-50 transition hover:bg-parchment-800"
              >
                Go to Login
              </Link>

              <button
                onClick={() => {
                  setOauthOnly(false);
                  setEmail("");
                }}
                className="text-sm text-parchment-600 hover:text-parchment-700"
              >
                Try Another Email
              </button>
            </div>
          ) : !submitted ? (
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
                  from Safe Family with your reset code. The code will expire in 1
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
