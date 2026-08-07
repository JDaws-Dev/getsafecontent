"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * SafeSpark login (federated path via Marketing Central JWT).
 *
 * Existing Clerk users continue to use /sign-in until the deprecation
 * window closes. This page is for everyone authenticated through
 * Marketing Central — including the 23 lifetime users backfilled
 * 2026-05-27 who now have SafeSpark entitlement.
 *
 * Three-state flow:
 * 1. Form: email + password → POST /login on Marketing
 * 2a. Success + entitled → redirect to /parent
 * 2b. Success but NOT entitled to SafeSpark → "upgrade to access" screen
 * 2c. Invalid credentials → inline error
 */
export default function LoginPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: isPending,
    login,
    requestPasswordReset,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Entitlement screen state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [centralUser, setCentralUser] = useState<{
    email: string;
    name: string | null;
  } | null>(null);

  // Password reset flow inline
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);

  // Already logged in — redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !isPending) {
      router.replace("/parent");
    }
  }, [isAuthenticated, isPending, router]);

  // Restore remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem("safespark_remembered_email");
    if (remembered) setFormData((p) => ({ ...p, email: remembered }));
  }, []);

  // Focus error message when it appears
  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        if (result.code === "NOT_ENTITLED" && result.user) {
          // User authenticated but doesn't have SafeSpark — show upgrade.
          setCentralUser({
            email: result.user.email,
            name: result.user.name,
          });
          setShowUpgradePrompt(true);
        } else {
          setError(result.error || "Invalid email or password");
        }
        setLoading(false);
        return;
      }

      // Remember email for next time
      localStorage.setItem("safespark_remembered_email", formData.email);
      router.replace("/parent");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again.",
      );
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      setError("Enter your email above first.");
      return;
    }
    setSendingResetEmail(true);
    try {
      const r = await requestPasswordReset(formData.email);
      if (r.success) setResetEmailSent(true);
      else setError(r.error || "Couldn't send reset email");
    } finally {
      setSendingResetEmail(false);
    }
  };

  // === Entitlement gate screen ===
  if (showUpgradePrompt && centralUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-brand-cream-2">
          <div className="flex items-center justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-accent-500 flex items-center justify-center shadow-md">
              <Lock className="h-7 w-7 text-brand-navy" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-center text-brand-navy mb-2">
            SafeSpark requires a Safe Family subscription
          </h1>
          <p className="text-center text-brand-ink-soft mb-6">
            Hi {centralUser.name || centralUser.email.split("@")[0]} — your
            Safe Family account doesn&apos;t include SafeSpark right now.
            Upgrade to the unified $14.99/mo plan to unlock the AI training
            lab for your kids.
          </p>
          <a
            href="https://getsafefamily.com/account"
            className="block w-full text-center py-3 rounded-xl bg-accent-500 text-brand-navy font-semibold shadow-sm hover:bg-accent-600 transition"
          >
            Upgrade now
          </a>
          <button
            type="button"
            onClick={() => {
              setShowUpgradePrompt(false);
              setCentralUser(null);
              setFormData({ email: "", password: "" });
            }}
            className="mt-3 block w-full text-center text-sm text-brand-ink-soft hover:text-brand-navy transition"
          >
            Sign in with a different account
          </button>
        </div>
      </main>
    );
  }

  // === Password reset confirmation screen ===
  if (resetEmailSent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-brand-cream-2 text-center">
          <h1 className="font-display text-2xl font-bold text-brand-navy mb-3">
            Check your email
          </h1>
          <p className="text-brand-ink-soft mb-6">
            If <strong>{formData.email}</strong> has a Safe Family account,
            we&apos;ve sent a 6-digit reset code. Enter it on the reset page.
          </p>
          <Link
            href={`/reset-password?email=${encodeURIComponent(formData.email)}`}
            className="inline-block w-full text-center py-3 rounded-xl bg-accent-500 text-brand-navy font-semibold shadow-sm hover:bg-accent-600 transition"
          >
            Enter reset code
          </Link>
          <button
            type="button"
            onClick={() => {
              setResetEmailSent(false);
              setShowResetPrompt(false);
            }}
            className="mt-3 block w-full text-center text-sm text-brand-ink-soft hover:text-brand-navy transition"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  // === Main login form ===
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-cream px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-accent-500 flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-brand-navy" />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">SafeSpark</h1>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl border border-brand-cream-2">
          <h2 className="font-display text-xl font-bold text-brand-navy mb-1">
            Sign in
          </h2>
          <p className="text-sm text-brand-ink-soft mb-6">
            Use your Safe Family email and password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-navy mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-cream-2 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition"
                placeholder="parent@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-brand-navy">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={sendingResetEmail}
                  className="text-xs text-accent-700 hover:text-accent-800 transition disabled:opacity-50"
                >
                  {sendingResetEmail ? "Sending…" : "Forgot password?"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-cream-2 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition"
              />
            </div>

            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-accent-500 text-brand-navy font-semibold shadow-sm hover:bg-accent-600 transition disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-brand-ink-soft">
            Don&apos;t have an account?{" "}
            <a
              href="https://getsafefamily.com/signup?plan=unified"
              className="text-accent-700 hover:text-accent-800 font-medium"
            >
              Start free trial
            </a>
          </p>
        </div>

        {/* Legacy Clerk login fallback during migration window */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Signed up with the old Clerk login?{" "}
          <Link href="/sign-in" className="underline hover:text-brand-ink-soft">
            Use the legacy sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
