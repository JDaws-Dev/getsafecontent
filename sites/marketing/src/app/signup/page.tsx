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

      {/* Main content. One presentation of the plan (the card) beside the
          form; on a phone the short card sits above the form. */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-16">
        <div className="max-w-md lg:max-w-4xl mx-auto grid gap-6 lg:gap-8 lg:grid-cols-2 lg:items-start">
          <div className="card-soft p-6 sm:p-8">
            <UnifiedPlanSummary />
          </div>
          <AccountForm
            selectedApps={appSelection}
            hidePrice={true}
            hideAppSummary={true}
            onSubmit={handleSubmit}
            onGoogleSignIn={handleGoogleSignIn}
            error={error}
            isLoading={isLoading}
            showPromoCode={true}
            lifetimeCodes={LIFETIME_CODES}
          />
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
// This card is the only place the signup page lists the apps.
function UnifiedPlanSummary() {
  const apps = [
    { name: "SafeTunes", what: "Music you approve, on Apple Music", color: "#7C4DE0" },
    { name: "SafeTube", what: "YouTube channels you pick, no feed", color: "#F0603A" },
    { name: "SafeStudy", what: "Safe search and a homework helper", color: "#2F6BF0" },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-navy">{PLAN_NAME}</h2>
        <p className="whitespace-nowrap">
          <span className="text-2xl font-bold text-navy">{PRICE}</span>
          <span className="text-navy/60">/month</span>
        </p>
      </div>
      <p className="text-sm text-navy/60 mt-1 mb-4">Three apps for the whole family, one plan.</p>

      <ul className="space-y-3 mb-4">
        {apps.map((app) => (
          <li key={app.name} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: app.color }} aria-hidden="true" />
            <span className="text-sm text-navy/80">
              <span className="font-semibold text-navy">{app.name}</span> &middot; {app.what}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-navy/55 border-t border-navy/10 pt-3">
        {TRIAL_DAYS} days free, then {PRICE_PER_MONTH}. Cancel anytime. 30-day money-back guarantee.
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
