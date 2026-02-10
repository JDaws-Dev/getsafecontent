"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { BookOpen } from "lucide-react";
import Link from "next/link";

/**
 * SafeReads Signup Page - Redirects to Central Signup
 *
 * This page redirects users to the unified Safe Family signup at
 * getsafefamily.com/signup?app=safereads
 *
 * If user is already authenticated, redirects to onboarding instead.
 */

const CENTRAL_SIGNUP_URL = "https://getsafefamily.com/signup?app=safereads";

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    // If already authenticated, go to onboarding
    if (isAuthenticated && !isLoading) {
      router.replace("/onboarding");
      return;
    }

    // If not loading and not authenticated, redirect to central signup
    if (!isLoading && !isAuthenticated) {
      window.location.href = CENTRAL_SIGNUP_URL;
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking auth or redirecting
  return (
    <div className="min-h-screen bg-parchment-50 flex items-center justify-center">
      <div className="text-center px-4">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-parchment-600" />
            <span className="font-serif text-2xl font-bold text-ink-900">
              SafeReads
            </span>
          </Link>
        </div>

        {/* Loading spinner */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-parchment-300 border-t-parchment-600" />
          <p className="text-ink-600">
            {isLoading ? "Checking account..." : "Redirecting to signup..."}
          </p>
        </div>

        {/* Fallback link if redirect doesn't work */}
        <p className="mt-8 text-sm text-ink-400">
          Not redirecting?{" "}
          <a
            href={CENTRAL_SIGNUP_URL}
            className="font-medium text-parchment-600 hover:text-parchment-700 underline"
          >
            Click here to sign up
          </a>
        </p>

        {/* Login link */}
        <p className="mt-4 text-sm text-ink-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-parchment-600 hover:text-parchment-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
