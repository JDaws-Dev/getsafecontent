"use client";

import { useState, useCallback, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HubHeader, UmbrellaMark } from "@/components/brand/Brand";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import AccountForm, { type AccountFormData, type AppSelection } from "@/components/signup/AccountForm";
import {
  PLAN_APP_IDS,
  PLAN_APPS_TEXT,
  PLAN_NAME,
  PRICE,
  PRICE_PER_MONTH,
  TRIAL_DAYS,
} from "@/lib/pricing";

/**
 * Signup Page
 *
 * ONE plan (owner decision 2026-11-25): Safe Family, $4.99/month, monthly
 * only, SafeTunes + SafeTube + SafeStudy. There is no app picker and no
 * yearly option; any ?app= / ?plan= / ?interval= query params are ignored.
 *
 * FLOW (depends on ENABLE_UNIFIED_AUTH feature flag):
 *
 * When UNIFIED AUTH is ENABLED:
 * 1. User submits email + password + name
 * 2. We call /api/auth/signup to create centralUser with password hash
 * 3a. Lifetime code: call /api/promo-signup to provision all apps -> success page
 * 3b. Regular: redirect to Stripe checkout -> webhook provisions apps via /provisionUser
 *
 * When UNIFIED AUTH is DISABLED (default/legacy):
 * 1. User submits email + password + name
 * 2a. Lifetime code: call /api/promo-signup -> success page
 * 2b. Regular: redirect directly to Stripe checkout -> webhook uses /setSubscriptionStatus
 */

// Hardcoded lifetime codes (must match AccountForm and Convex validation)
const LIFETIME_CODES = ["DAWSFRIEND", "DEWITT"];

// Check if a code is a valid lifetime code (client-side check)
function isLifetimeCode(code: string): boolean {
  return LIFETIME_CODES.includes(code.trim().toUpperCase());
}

// Loading fallback for Suspense
function SignupLoading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <UmbrellaMark size="lg" className="animate-pulse" />
        <p className="text-navy/60">Loading...</p>
      </div>
    </div>
  );
}

// LocalStorage key for persisting signup state across OAuth redirect
const SIGNUP_STATE_KEY = "safefamily_signup_state";

// Save signup state to localStorage before OAuth redirect. Its presence is
// what tells the page "this is an OAuth return, continue to checkout".
function saveSignupState(state: { couponCode?: string }) {
  try {
    localStorage.setItem(SIGNUP_STATE_KEY, JSON.stringify({
      ...state,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn("[SignupPage] Failed to save signup state:", e);
  }
}

// Load signup state from localStorage after OAuth redirect
function loadSignupState(): { couponCode?: string } | null {
  try {
    const stored = localStorage.getItem(SIGNUP_STATE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored);
    // Only use state if it's less than 30 minutes old
    if (Date.now() - state.timestamp > 30 * 60 * 1000) {
      localStorage.removeItem(SIGNUP_STATE_KEY);
      return null;
    }

    return { couponCode: state.couponCode };
  } catch (e) {
    console.warn("[SignupPage] Failed to load signup state:", e);
    return null;
  }
}

// Clear signup state from localStorage
function clearSignupState() {
  try {
    localStorage.removeItem(SIGNUP_STATE_KEY);
  } catch (e) {
    console.warn("[SignupPage] Failed to clear signup state:", e);
  }
}

// Inner component (kept inside Suspense)
function SignupContent() {
  const router = useRouter();

  // Convex Auth hooks for Google OAuth
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { signIn } = useAuthActions();

  // One plan, always the same three apps. Old ?app= / ?interval= links
  // simply land on this plan.
  const selectedApps: readonly string[] = PLAN_APP_IDS;

  // Loading and error state
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Feature flags state
  const [unifiedAuthEnabled, setUnifiedAuthEnabled] = useState(false);

  // Fetch feature flags on mount
  useEffect(() => {
    fetch("/api/feature-flags")
      .then((res) => res.json())
      .then((data) => {
        setUnifiedAuthEnabled(data.flags?.UNIFIED_AUTH === true);
        console.log("[SignupPage] Feature flags loaded:", data.flags);
      })
      .catch((err) => {
        console.warn("[SignupPage] Failed to load feature flags, using defaults:", err);
        // Default to false (legacy flow) if fetch fails
        setUnifiedAuthEnabled(false);
      });
  }, []);

  // Track if we've already processed OAuth return to prevent double-submission
  const [oauthProcessed, setOauthProcessed] = useState(false);

  // Create a Stripe checkout session for an authenticated user and redirect to
  // it. Email is resolved server-side from the session, so this works for any
  // logged-in user — including a returning customer with an expired trial who
  // just clicked "Subscribe". Centralizes the fetch/redirect/error handling so
  // the OAuth-return effect and the already-authenticated path stay in sync.
  const proceedToCheckout = useCallback(
    async (opts: { couponCode?: string } = {}) => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(opts.couponCode ? { couponCode: opts.couponCode } : {}),
            // The server decides the plan and price; email is retrieved from
            // the authenticated session by the checkout API.
          }),
        });
        if (!response.ok) {
          let errorMessage = "Failed to create checkout session";
          try {
            const text = await response.text();
            if (text) {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorMessage;
            }
          } catch {
            // Ignore parse errors
          }
          throw new Error(errorMessage);
        }
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (err) {
        console.error("[SignupPage] Checkout error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to start checkout. Please try again."
        );
        setIsLoading(false);
      }
    },
    []
  );

  // Handle OAuth callback - when user returns authenticated after Google OAuth
  useEffect(() => {
    // Wait for auth state to settle
    if (isAuthLoading || oauthProcessed) return;

    // Check if user is authenticated AND we have saved signup state (indicating OAuth return)
    if (isAuthenticated) {
      const savedState = loadSignupState();

      if (savedState) {
        console.log("[SignupPage] OAuth return detected, proceeding to checkout");
        setOauthProcessed(true);

        // Clear the saved state
        clearSignupState();

        // For OAuth users, we skip the central user creation (Convex Auth already
        // created it) and go directly to Stripe checkout.
        void proceedToCheckout({ couponCode: savedState.couponCode });
      }
    }
  }, [isAuthenticated, isAuthLoading, oauthProcessed, proceedToCheckout]);

  // The plan's apps, as the AccountForm's chip list.
  const appSelection: AppSelection = {
    safetunes: selectedApps.includes("safetunes"),
    safetube: selectedApps.includes("safetube"),
    safereads: false,
    safestudy: selectedApps.includes("safestudy"),
  };

  // Handle form submission
  const handleSubmit = async (data: AccountFormData) => {
    setIsLoading(true);
    setError("");

    // Determine if we need to create a central user account
    // We MUST create a central user if:
    // 1. Unified auth is enabled (for all signups), OR
    // 2. User has a lifetime promo code (so they can login to apps)
    const hasLifetimeCode = data.couponCode && isLifetimeCode(data.couponCode);
    const needsCentralUser = unifiedAuthEnabled || hasLifetimeCode;

    if (needsCentralUser) {
      try {
        const reason = hasLifetimeCode
          ? "lifetime promo code (required for app login)"
          : "unified auth enabled";
        console.log(`[SignupPage] Creating central user account - ${reason}...`);

        const signupResponse = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
          }),
        });

        const signupResult = await signupResponse.json();

        if (!signupResponse.ok) {
          // User already exists — they're upgrading from trial, skip to checkout
          if (signupResult.code === "USER_EXISTS" || signupResponse.status === 409) {
            console.log("[SignupPage] User exists — proceeding to Stripe checkout for upgrade");
            // Fall through to Stripe checkout below
          } else {
            throw new Error(signupResult.error || "Failed to create account");
          }
        } else {
          console.log("[SignupPage] Central user created successfully:", signupResult.email);
          // New account — skip Stripe and start the card-less free trial.
          // (There is no yearly plan any more, so the old "yearly must go
          // to checkout" exception from 94628501 is gone.)
          if (!hasLifetimeCode) {
            console.log("[SignupPage] Account created with trial — skipping Stripe checkout");
            window.location.href = `/success?trial=true&email=${encodeURIComponent(data.email)}`;
            return;
          }
        }
      } catch (err) {
        console.error("[SignupPage] Account creation error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create account. Please try again."
        );
        setIsLoading(false);
        return;
      }
    } else {
      console.log("[SignupPage] Unified auth disabled - using legacy flow (direct to checkout)");
    }

    // Handle lifetime promo code flow
    if (hasLifetimeCode) {
      try {
        console.log("[SignupPage] Detected lifetime code, provisioning lifetime access...");

        // Call promo-signup API to provision lifetime access to all apps
        const response = await fetch("/api/promo-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            promoCode: data.couponCode!.trim().toUpperCase(),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to apply promo code");
        }

        console.log("[SignupPage] Promo signup success:", result);

        // Redirect to success page (use window.location for reliable redirect)
        window.location.href = "/success?promo=true";
      } catch (err) {
        console.error("[SignupPage] Promo signup error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to apply promo code. Please try again."
        );
        setIsLoading(false);
      }
      return;
    }

    // Regular Stripe checkout flow
    try {
      console.log("[SignupPage] Proceeding to checkout...");

      // The checkout API decides the plan and price (Safe Family monthly);
      // only the email is used from this body.
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          couponCode: data.couponCode,
        }),
      });

      if (!response.ok) {
        // Try to parse error response, handle empty body gracefully
        let errorMessage = "Failed to create checkout session";
        try {
          const text = await response.text();
          if (text) {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          }
        } catch {
          // If parsing fails, use status-based message
          if (response.status === 429) {
            errorMessage = "Too many requests. Please wait a moment and try again.";
          }
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("[SignupPage] Checkout error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start checkout. Please try again."
      );
      setIsLoading(false);
    }
  };

  // Handle Google sign-in with Convex Auth
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Returning user who is ALREADY signed in (e.g., an expired trial clicking
      // "Subscribe"): do NOT bounce them through Google again. Re-running OAuth
      // when already authenticated doesn't change the auth state, so the
      // OAuth-return effect never re-fires and the user is stranded on the
      // start-trial page, unable to pay. Go straight to Stripe checkout using
      // their existing session. (This was the getsafefamily.com subscribe-loop.)
      if (isAuthenticated) {
        console.log("[SignupPage] Already authenticated — going straight to checkout");
        setOauthProcessed(true);
        clearSignupState();
        await proceedToCheckout();
        return;
      }

      // Save current signup state to localStorage before OAuth redirect
      // so the return trip knows to continue to checkout.
      // Note: promo codes not supported with Google OAuth (user must complete email flow)
      saveSignupState({});

      console.log("[SignupPage] Starting Google OAuth");

      // Redirect to Google OAuth via Convex Auth
      // After successful auth, user will be redirected back to /signup
      // The useEffect below will detect the authenticated state and proceed to checkout
      await signIn("google", { redirectTo: "/signup" });
    } catch (err) {
      console.error("[SignupPage] Google signin error:", err);
      setError("Google sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <HubHeader
        right={
          <Link href="/login" className="font-semibold text-navy/60 hover:text-navy whitespace-nowrap">
            Sign in
          </Link>
        }
      />

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Page title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-3">
              Start your {PLAN_NAME} trial
            </h1>
            <p className="text-lg text-navy/60 max-w-xl mx-auto">
              {`${PLAN_APPS_TEXT} for ${PRICE_PER_MONTH}. ${TRIAL_DAYS}-day free trial — no credit card to start.`}
            </p>
          </div>

          {/* Two-column layout on desktop */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left column: the one plan */}
            <div className="card-soft p-6 sm:p-8">
              <UnifiedPlanSummary />
            </div>

            {/* Right column: Account form */}
            <div>
              <AccountForm
                selectedApps={appSelection}
                hidePrice={true}
                onSubmit={handleSubmit}
                onGoogleSignIn={handleGoogleSignIn}
                error={error}
                isLoading={isLoading}
                showPromoCode={true}
                lifetimeCodes={LIFETIME_CODES}
              />
            </div>
          </div>

          {/* What you get section */}
          <div className="mt-12 card-soft p-6 sm:p-8">
            <h3 className="font-semibold text-navy text-center mb-6">
              What&apos;s included in your trial:
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {selectedApps.includes("safetunes") && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#7C4DE0] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-navy">SafeTunes</p>
                    <p className="text-sm text-navy/60">Approve songs before they play</p>
                  </div>
                </div>
              )}

              {selectedApps.includes("safetube") && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F0603A] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-navy">SafeTube</p>
                    <p className="text-sm text-navy/60">Approve channels before viewing</p>
                  </div>
                </div>
              )}

              {selectedApps.includes("safestudy") && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2F6BF0] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-navy">SafeStudy</p>
                    <p className="text-sm text-navy/60">Safe search + built-in tutor</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-navy">Unlimited profiles</p>
                  <p className="text-sm text-navy/60">Add all your kids</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-navy">Works on all devices</p>
                  <p className="text-sm text-navy/60">iOS, Android, and web</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-navy">Cancel anytime</p>
                  <p className="text-sm text-navy/60">No long-term commitment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Money-back guarantee */}
          <div className="mt-8 flex items-center justify-center gap-3 text-center">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-sm text-navy/70">
              30-day money-back guarantee — no questions asked
            </span>
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-navy/10 py-6 bg-white">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-navy/50">
            &copy; {new Date().getFullYear()} Safe Family. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// The one plan: Safe Family, $4.99/month, SafeTunes + SafeTube + SafeStudy.
// Price text comes from lib/pricing.ts. No interval toggle — monthly only.
function UnifiedPlanSummary() {
  const apps = [
    "SafeTunes — Apple Music, parent-curated",
    "SafeTube — YouTube without the algorithm",
    "SafeStudy — safe search + AI tutor",
  ];
  return (
    <div>
      <h2 className="text-xl font-bold text-navy mb-2">{PLAN_NAME}</h2>
      <p className="text-sm text-navy/60 mb-5">
        One subscription, three apps. Built for homeschool families.
      </p>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-navy">{PRICE}</span>
          <span className="text-lg text-navy/60">/month</span>
        </div>
        <p className="text-xs text-navy/50 mt-1">For all three apps, the whole family</p>
      </div>

      {/* Apps included */}
      <ul className="space-y-2 mb-3">
        {apps.map((app) => (
          <li key={app} className="flex items-start gap-2 text-sm text-navy/80">
            <svg
              className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{app}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-navy/50">
        7-day free trial. No credit card to start. Cancel anytime.
      </p>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupContent />
    </Suspense>
  );
}
