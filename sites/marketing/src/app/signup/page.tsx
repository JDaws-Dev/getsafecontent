"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import AppSelector, { type AppId, type PricingInfo } from "@/components/signup/AppSelector";
import AccountForm, { type AccountFormData, type AppSelection } from "@/components/signup/AccountForm";

/**
 * Unified Signup Page
 *
 * Combines AppSelector and AccountForm into a two-step signup flow.
 * Accepts ?app=safetunes (or safetube, safereads) query param to pre-select app.
 */

// Loading fallback for Suspense
function SignupLoading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-navy/60">Loading...</p>
      </div>
    </div>
  );
}

// Inner component that uses useSearchParams
function SignupContent() {
  const searchParams = useSearchParams();

  // Get initial app selection from query params
  const initialApp = searchParams.get("app") as AppId | null;
  const validApps: AppId[] = ["safetunes", "safetube", "safereads"];
  const preSelectedApp = initialApp && validApps.includes(initialApp) ? initialApp : null;

  // State for selected apps - default to pre-selected app or all apps
  const [selectedApps, setSelectedApps] = useState<AppId[]>(
    preSelectedApp ? [preSelectedApp] : ["safetunes", "safetube", "safereads"]
  );

  // State for pricing info
  const [pricingInfo, setPricingInfo] = useState<PricingInfo>({
    monthly: 9.99,
    yearly: 99,
    regularPrice: 14.97,
    savings: 4.98,
    isBundlePrice: true,
  });

  // State for billing interval
  const [isYearly, setIsYearly] = useState(false);

  // Loading and error state
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle app selection changes
  const handleAppSelectionChange = useCallback(
    (apps: AppId[], pricing: PricingInfo, yearly: boolean) => {
      setSelectedApps(apps);
      setPricingInfo(pricing);
      setIsYearly(yearly);
    },
    []
  );

  // Convert AppId[] to AppSelection object for AccountForm
  const appSelection: AppSelection = {
    safetunes: selectedApps.includes("safetunes"),
    safetube: selectedApps.includes("safetube"),
    safereads: selectedApps.includes("safereads"),
  };

  // Handle form submission
  const handleSubmit = async (data: AccountFormData) => {
    setIsLoading(true);
    setError("");

    try {
      // TODO: In the future, this will call the central accounts API (1gy.2)
      // For now, we'll create a Stripe checkout session with the selected apps
      // and redirect to payment. The webhook will handle account creation.

      // Build the checkout request with selected apps
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          selectedApps,
          name: data.name,
          couponCode: data.couponCode,
          isYearly,
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

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      // TODO: In the future, this will call the central accounts API with Google auth
      // For now, redirect to a placeholder or show a message
      setError("Google sign-in is coming soon. Please use email/password for now.");
      setIsLoading(false);
    } catch (err) {
      console.error("[SignupPage] Google signin error:", err);
      setError("Google sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-navy">Safe Family</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Page title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-3">
              Start protecting your family today
            </h1>
            <p className="text-lg text-navy/60 max-w-xl mx-auto">
              Choose the apps you need and create your account.
              Your 7-day free trial starts immediately.
            </p>
          </div>

          {/* Two-column layout on desktop */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left column: App selection */}
            <div className="card-soft p-6 sm:p-8">
              <AppSelector
                initialApps={preSelectedApp ? [preSelectedApp] : ["safetunes", "safetube", "safereads"]}
                onChange={handleAppSelectionChange}
                showYearlyToggle={true}
              />
            </div>

            {/* Right column: Account form */}
            <div>
              <AccountForm
                selectedApps={appSelection}
                monthlyPrice={pricingInfo.monthly}
                yearlyPrice={pricingInfo.yearly}
                isYearly={isYearly}
                onSubmit={handleSubmit}
                onGoogleSignIn={handleGoogleSignIn}
                error={error}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* What you get section */}
          <div className="mt-12 card-soft p-6 sm:p-8">
            <h3 className="font-semibold text-navy text-center mb-6">
              What&apos;s included in your trial:
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedApps.includes("safetunes") && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
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
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
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

              {selectedApps.includes("safereads") && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-navy">SafeReads</p>
                    <p className="text-sm text-navy/60">Get content analysis for books</p>
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
      <footer className="border-t border-gray-200 py-6 bg-white">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Safe Family. All rights reserved.
          </p>
        </div>
      </footer>
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
