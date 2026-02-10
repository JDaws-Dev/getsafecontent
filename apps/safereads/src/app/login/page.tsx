"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { BookOpen } from "lucide-react";
import { useHaptic } from "../../hooks/useHaptic";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isPending } = useConvexAuth();
  const { signIn } = useAuthActions();
  const haptic = useHaptic();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

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
    haptic.light(); // Light tap on submit
    setLoading(true);
    setError("");

    try {
      // Sign in with Convex Auth (Password provider)
      await signIn("password", {
        email: formData.email,
        password: formData.password,
        flow: "signIn",
      });

      // Save email for convenience
      localStorage.setItem("safereads_remembered_email", formData.email);

      haptic.success(); // Success feedback
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("[LoginPage] Login error:", err);
      haptic.error(); // Error feedback
      const errorMessage = err instanceof Error ? err.message : "";
      if (
        errorMessage.includes("Invalid") ||
        errorMessage.includes("credentials") ||
        errorMessage.includes("password") ||
        errorMessage.includes("Could not verify")
      ) {
        setError("Invalid email or password. Please try again.");
        emailInputRef.current?.focus();
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("Failed to fetch")
      ) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Login failed. Please try again.");
      }
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    haptic.light(); // Light tap on Google button
    setGoogleLoading(true);
    setError("");

    try {
      await signIn("google", { redirectTo: "/dashboard" });
    } catch (err) {
      console.error("[LoginPage] Google login error:", err);
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
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

        <div className="rounded-xl border border-parchment-200 bg-white p-8 shadow-sm min-w-0">
          <div className="mb-6 text-center">
            <h1 className="font-serif text-2xl font-bold text-ink-900">
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
            className="mb-4 flex w-full min-h-[48px] items-center justify-center gap-3 rounded-lg border border-parchment-300 bg-white px-4 py-3 font-medium text-ink-700 transition hover:bg-parchment-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-parchment-300 border-t-parchment-600" />
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

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-parchment-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-ink-400">or</span>
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
                className="w-full min-h-[44px] rounded-lg border border-parchment-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-parchment-600"
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
                  className="text-sm text-parchment-600 hover:text-parchment-700"
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
                className="w-full min-h-[44px] rounded-lg border border-parchment-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-parchment-600"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full min-h-[48px] rounded-lg bg-parchment-700 px-4 py-3 font-semibold text-parchment-50 transition hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-ink-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-parchment-600 hover:text-parchment-700"
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
