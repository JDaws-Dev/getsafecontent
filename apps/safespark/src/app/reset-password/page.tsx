"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("email");
    if (fromUrl) setEmail(fromUrl);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const r = await resetPassword(email, code, newPassword);
    setSubmitting(false);
    if (r.success) {
      // Auto-logged-in via the JWT in the response; bounce to dashboard.
      router.replace("/parent");
    } else {
      setError(r.error || "Failed to reset password.");
    }
  };

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
          <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
            Set a new password
          </h2>
          <p className="text-sm text-brand-ink-soft mb-6">
            Enter the 6-digit code we sent to your email.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-navy mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-cream-2 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-brand-navy mb-1">
                Reset code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-cream-2 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition tracking-widest text-center font-mono text-lg"
                placeholder="000000"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-brand-navy mb-1">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-cream-2 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-brand-navy mb-1">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-cream-2 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email || code.length !== 6 || !newPassword}
              className="w-full py-3 rounded-xl bg-accent-500 text-brand-navy font-semibold shadow-sm hover:bg-accent-600 transition disabled:opacity-50"
            >
              {submitting ? "Resetting…" : "Reset password"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-brand-ink-soft">
            <Link href="/login" className="text-accent-700 hover:text-accent-800 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-brand-ink-soft">Loading…</div>
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
