"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Shield } from "lucide-react";
import Link from "next/link";

// Allowed redirect domains for security
const ALLOWED_DOMAINS = [
  "getsafetunes.com",
  "getsafetube.com",
  "getsafereads.com",
  "getsafefamily.com",
  "localhost",
];

function isValidReturnTo(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Check if hostname matches allowed domains
    return ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export default function OAuthPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const appName = searchParams.get("app") || "Safe Family";

  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  // Get the current user's email after OAuth
  const currentUser = useQuery(api.accounts.getCurrentUser);

  // Validate returnTo URL
  const validReturnTo = returnTo && isValidReturnTo(returnTo) ? returnTo : null;

  // Handle generating JWT and redirecting after OAuth
  const handlePostAuth = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.email || generating) return;

    // If no valid returnTo, just show success message
    if (!validReturnTo) {
      return;
    }

    setGenerating(true);

    try {
      // Generate JWT token via our API route (which has access to admin key server-side)
      const response = await fetch("/api/oauth/generate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to generate authentication token");
        setGenerating(false);
        return;
      }

      // Build redirect URL with token
      const redirectUrl = new URL(validReturnTo);
      redirectUrl.searchParams.set("token", result.token);
      redirectUrl.searchParams.set("expiresAt", String(result.expiresAt));

      // Sign out of Marketing's Convex Auth session (we only needed it to get the email)
      // The JWT is now the auth mechanism for the apps
      await signOut();

      // Redirect to the app
      window.location.href = redirectUrl.toString();
    } catch (err) {
      console.error("[OAuthPage] Error generating token:", err);
      setError("Failed to complete authentication. Please try again.");
      setGenerating(false);
    }
  }, [isAuthenticated, currentUser, validReturnTo, generating, signOut]);

  // Trigger post-auth flow when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser?.email && validReturnTo && !generating) {
      handlePostAuth();
    }
  }, [isAuthenticated, currentUser, validReturnTo, generating, handlePostAuth]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      // Store returnTo in sessionStorage so we can retrieve it after OAuth redirect
      if (validReturnTo) {
        sessionStorage.setItem("oauth_returnTo", validReturnTo);
        sessionStorage.setItem("oauth_appName", appName);
      }

      // Initiate Google OAuth - this will redirect to Google then back to this page
      await signIn("google", { redirectTo: "/oauth" });
    } catch (err) {
      console.error("[OAuthPage] Google login error:", err);
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  // On mount, check if we have returnTo in sessionStorage (returning from OAuth)
  useEffect(() => {
    const storedReturnTo = sessionStorage.getItem("oauth_returnTo");
    if (storedReturnTo && !returnTo) {
      // We're returning from OAuth, add returnTo to URL
      const url = new URL(window.location.href);
      url.searchParams.set("returnTo", storedReturnTo);
      const storedAppName = sessionStorage.getItem("oauth_appName");
      if (storedAppName) {
        url.searchParams.set("app", storedAppName);
      }
      // Clean up sessionStorage
      sessionStorage.removeItem("oauth_returnTo");
      sessionStorage.removeItem("oauth_appName");
      // Update URL without reload
      window.history.replaceState({}, "", url.toString());
    }
  }, [returnTo]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse">
          <Shield className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  // Show generating state while creating JWT and redirecting
  if (generating || (isAuthenticated && validReturnTo)) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse mx-auto mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-navy/60">Completing sign in...</p>
        </div>
      </div>
    );
  }

  // If authenticated but no returnTo, show success
  if (isAuthenticated && !validReturnTo) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-navy">Safe Family</span>
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">Signed In Successfully</h1>
            <p className="text-navy/60 mb-6">
              You are now signed in with Google.
            </p>
            <Link
              href="/account"
              className="inline-block rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold text-white transition hover:from-indigo-600 hover:to-purple-700"
            >
              Go to Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show OAuth form
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
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-navy">Sign in with Google</h1>
            <p className="mt-1 text-sm text-navy/60">
              {validReturnTo
                ? `Sign in to continue to ${appName}`
                : "Sign in to your Safe Family account"
              }
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {!validReturnTo && returnTo && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              Invalid return URL. For security, you will stay on this site after signing in.
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full min-h-[48px] items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-navy transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
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
            <p className="text-sm text-navy/60">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-navy/60">
            Want to use email instead?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Sign in with email
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
