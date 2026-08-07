"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const r = await requestPasswordReset(email);
    setSending(false);
    if (r.success) setSent(true);
    else setError(r.error || "Could not send reset email");
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
          {sent ? (
            <>
              <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
                Check your email
              </h2>
              <p className="text-sm text-brand-ink-soft mb-6">
                If <strong>{email}</strong> has a Safe Family account, we sent
                a 6-digit reset code. Enter it on the next page.
              </p>
              <Link
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="block w-full text-center py-3 rounded-xl bg-accent-500 text-brand-navy font-semibold shadow-sm hover:bg-accent-600 transition"
              >
                Enter reset code
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-brand-navy mb-2">
                Reset password
              </h2>
              <p className="text-sm text-brand-ink-soft mb-6">
                We&apos;ll email you a 6-digit code.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-brand-navy mb-1"
                  >
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
                    placeholder="parent@example.com"
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
                  disabled={sending || !email}
                  className="w-full py-3 rounded-xl bg-accent-500 text-brand-navy font-semibold shadow-sm hover:bg-accent-600 transition disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send reset code"}
                </button>
              </form>
            </>
          )}

          <p className="mt-5 text-center text-sm text-brand-ink-soft">
            Remember your password?{" "}
            <Link href="/login" className="text-accent-700 hover:text-accent-800 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
