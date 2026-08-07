"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptic } from "@/hooks/useHaptic";
import { InactiveUserPrompt } from "@/components/InactiveUserPrompt";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isPending, login, loginWithGoogle, requestPasswordReset } = useAuth();
  const haptic = useHaptic();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [centralUser, setCentralUser] = useState<{
    email: string;
    name: string | null;
  } | null>(null);

  // Password reset for migrated users
  const [showPasswordResetPrompt, setShowPasswordResetPrompt] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Refs for accessibility - focus management on errors
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isPending) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isPending, router]);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("safereads_remembered_email");
    if (rememberedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: rememberedEmail,
      }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptic.light();
    setLoading(true);
    setError("");

    try {
      const result = await login(formData.email, formData.password);

      console.log("[LoginPage] Login result:", result);

      if (!result.success) {
        haptic.error();

        if (result.code === "PASSWORD_RESET_REQUIRED") {
          // User was migrated from old auth system - show password reset prompt
          setShowPasswordResetPrompt(true);
          setLoading(false);
          return;
        }

        if (result.code === "NOT_ENTITLED") {
          // User exists but doesn't have SafeReads - show upgrade prompt
          console.log("[LoginPage] User not entitled to SafeReads, showing upgrade prompt");
          haptic.light();
          setCentralUser(result.user || null);
          setShowUpgradePrompt(true);
          setLoading(false);
          return;
        }

        if (result.code === "OAUTH_ONLY") {
          setError("This account uses Google sign-in. Please use the Google sign-in option.");
        } else {
          setError(result.error || "Invalid email or password. Please try again.");
        }
        emailInputRef.current?.focus();
        setLoading(false);
        return;
      }

      // Save email for convenience
      localStorage.setItem("safereads_remembered_email", formData.email);

      haptic.success();
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("[LoginPage] Login error:", err);
      haptic.error();
      setError("Login failed. Please try again.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (isPending) {
    return <div className="min-h-screen" />;
  }

  // Don't render if authenticated (will redirect)
  if (isAuthenticated) {
    return <div className="min-h-screen" />;
  }

  const handleGoogleSignIn = () => {
    haptic.light();
    setGoogleLoading(true);
    setError("");

    // Redirect to Marketing's Google OAuth flow
    // Marketing will redirect back with JWT after OAuth completes
    loginWithGoogle();
  };

  // Handle sending password reset email
  const handleSendResetEmail = async () => {
    setSendingResetEmail(true);
    try {
      await requestPasswordReset(formData.email);
      setResetEmailSent(true);
      localStorage.setItem("safereads_reset_email", formData.email);
      haptic.success();
    } catch (err) {
      console.error("[LoginPage] Password reset error:", err);
      // Still show success for security (don't reveal if email exists)
      setResetEmailSent(true);
      localStorage.setItem("safereads_reset_email", formData.email);
    } finally {
      setSendingResetEmail(false);
    }
  };

  // Show password reset prompt for migrated users
  if (showPasswordResetPrompt) {
    return (
      <div className="min-h-screen bg-brand-cream">
        <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <BookOpen className="h-10 w-10 text-accent-600" />
              <span className="font-display text-2xl font-bold text-brand-navy">
                SafeReads
              </span>
            </Link>
          </div>

          <div className="rounded-xl border border-brand-cream-2 bg-white p-8 shadow-sm">
            {!resetEmailSent ? (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <svg
                      className="h-8 w-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <h1 className="font-display text-2xl font-bold text-brand-navy">
                    We've Upgraded Our Login System
                  </h1>
                  <p className="mt-2 text-ink-600">
                    For security, please set a new password to continue using SafeReads.
                    This is a one-time process.
                  </p>
                </div>

                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-sm text-blue-800">
                    <strong>Your email:</strong> {formData.email}
                  </p>
                </div>

                <button
                  onClick={handleSendResetEmail}
                  disabled={sendingResetEmail}
                  className="btn-brand mb-3 w-full min-h-[48px] rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingResetEmail ? "Sending..." : "Send Password Reset Email"}
                </button>

                <button
                  onClick={() => {
                    setShowPasswordResetPrompt(false);
                    setFormData((prev) => ({ ...prev, password: "" }));
                  }}
                  className="w-full text-sm text-ink-600 hover:text-brand-navy"
                >
                  ← Back to login
                </button>
              </>
            ) : (
              <>
                <div className="mb-6 text-center">
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
                  <h1 className="font-display text-2xl font-bold text-brand-navy">
                    Check Your Email
                  </h1>
                  <p className="mt-2 text-ink-600">
                    We've sent a 6-digit reset code to <strong>{formData.email}</strong>.
                  </p>
                </div>

                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                  <p className="text-blue-800">
                    <strong>Next Steps:</strong> Check your inbox for an email from Safe Family.
                    The code expires in 1 hour.
                  </p>
                </div>

                <Link
                  href="/reset-password"
                  className="btn-brand mb-3 block w-full min-h-[48px] rounded-lg text-center"
                >
                  Enter Reset Code
                </Link>

                <button
                  onClick={() => setResetEmailSent(false)}
                  className="w-full text-sm text-accent-600 hover:text-accent-700"
                >
                  Didn't receive it? Try again
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show upgrade prompt if user is verified but not entitled to SafeReads
  if (showUpgradePrompt && centralUser) {
    return <InactiveUserPrompt user={centralUser} />;
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-accent-600" />
            <span className="font-display text-2xl font-bold text-brand-navy">
              SafeReads
            </span>
          </Link>
        </div>

        <div className="rounded-xl border border-brand-cream-2 bg-white p-8 shadow-sm min-w-0">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-brand-navy">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Sign in to continue to SafeReads
            </p>
          </div>

          {error && (
            <div
              ref={errorRef}
              role="alert"
              aria-live="assertive"
              id="form-error"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="flex w-full min-h-[48px] items-center justify-center gap-3 rounded-lg border border-brand-cream-2 bg-white px-4 py-3 font-semibold text-ink-700 transition hover:bg-brand-cream-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-cream-2 border-t-accent-600" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
            )}
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-cream-2" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-ink-500">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-ink-700"
              >
                Email
              </label>
              <input
                ref={emailInputRef}
                type="email"
                id="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "form-error" : undefined}
                className="w-full min-h-[44px] rounded-lg border border-brand-cream-2 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-accent-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-accent-600 hover:text-accent-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                ref={passwordInputRef}
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "form-error" : undefined}
                className="w-full min-h-[44px] rounded-lg border border-brand-cream-2 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-accent-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-brand w-full min-h-[48px] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-brand-cream-2" />
            <span className="px-4 text-sm text-ink-400">or</span>
            <div className="flex-1 border-t border-brand-cream-2" />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="flex w-full min-h-[48px] items-center justify-center gap-3 rounded-lg border border-brand-cream-2 bg-white px-4 py-3 font-medium text-ink-700 transition hover:bg-brand-cream-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-cream-2 border-t-accent-600" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
            )}
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-ink-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-accent-600 hover:text-accent-700"
              >
                Start free trial
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
