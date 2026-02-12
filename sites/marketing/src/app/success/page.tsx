"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ChevronRight, Music, Play, BookOpen, Loader2 } from "lucide-react";

type AppId = "safetunes" | "safetube" | "safereads";

interface SessionData {
  apps: AppId[];
}

// Loading component
function SuccessLoading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <p className="text-navy/60">Confirming your subscription...</p>
      </div>
    </div>
  );
}

// Main success content
function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const isPromoSignup = searchParams.get("promo") === "true";

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch session details to get the selected apps
  useEffect(() => {
    async function fetchSession() {
      // Promo signups always get all apps (lifetime access)
      if (isPromoSignup) {
        setLoading(false);
        setSessionData({ apps: ["safetunes", "safetube", "safereads"] });
        return;
      }

      if (!sessionId) {
        // No session ID - show default success page
        setLoading(false);
        setSessionData({ apps: ["safetunes", "safetube", "safereads"] });
        return;
      }

      try {
        const response = await fetch(`/api/checkout/session?session_id=${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch session");
        }
        const data = await response.json();
        setSessionData({
          apps: data.apps || ["safetunes", "safetube", "safereads"],
        });
      } catch (err) {
        console.error("Error fetching session:", err);
        // Default to all apps on error
        setSessionData({ apps: ["safetunes", "safetube", "safereads"] });
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId, isPromoSignup]);

  // Auto-redirect to onboarding after a brief success message
  const [countdown, setCountdown] = useState(5);
  const [shouldRedirect, setShouldRedirect] = useState(true);

  useEffect(() => {
    if (!loading && sessionData && shouldRedirect) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Redirect to onboarding with selected apps
            const appsParam = sessionData.apps.join(",");
            router.push(`/onboarding?apps=${appsParam}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, sessionData, router, shouldRedirect]);

  const handleStartNow = () => {
    if (sessionData) {
      const appsParam = sessionData.apps.join(",");
      router.push(`/onboarding?apps=${appsParam}`);
    }
  };

  const handleCancelRedirect = () => {
    setShouldRedirect(false);
  };

  if (loading) {
    return <SuccessLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  const selectedApps = sessionData?.apps || ["safetunes", "safetube", "safereads"];

  const APP_ICONS = {
    safetunes: { icon: Music, gradient: "from-indigo-500 to-purple-600", name: "SafeTunes" },
    safetube: { icon: Play, gradient: "from-red-500 to-orange-500", name: "SafeTube" },
    safereads: { icon: BookOpen, gradient: "from-emerald-500 to-teal-500", name: "SafeReads" },
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
      <main className="container mx-auto px-4 sm:px-6 py-12 pb-16">
        <div className="max-w-lg mx-auto text-center">
          {/* Success icon */}
          <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-navy mb-4">
            Welcome to Safe Family!
          </h1>

          <p className="text-lg text-navy/70 mb-8">
            {isPromoSignup
              ? "Your lifetime access is now active! Let's set up your apps so your kids can start using them safely."
              : "Your subscription is now active. Let's set up your apps so your kids can start using them safely."}
          </p>

          {/* Apps purchased */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h3 className="text-sm font-medium text-navy/60 uppercase tracking-wide mb-4">
              Your Apps
            </h3>
            <div className="space-y-3">
              {selectedApps.map((appId) => {
                const config = APP_ICONS[appId];
                const Icon = config.icon;
                return (
                  <div key={appId} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-navy">{config.name}</span>
                    <span className="ml-auto text-emerald-600 text-sm">
                      {isPromoSignup ? "Lifetime" : "Active"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStartNow}
            className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition shadow-md flex items-center justify-center gap-2"
          >
            Start Setup
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Auto-redirect notice */}
          {shouldRedirect && countdown > 0 && (
            <p className="text-sm text-navy/50 mt-4">
              Redirecting to setup in {countdown}...{" "}
              <button
                onClick={handleCancelRedirect}
                className="text-indigo-600 hover:underline"
              >
                Cancel
              </button>
            </p>
          )}

          {/* Skip option */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-navy/60 mb-2">
              Want to explore first?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {selectedApps.map((appId) => {
                const config = APP_ICONS[appId];
                const domain = appId === "safetunes" ? "getsafetunes.com" : appId === "safetube" ? "getsafetube.com" : "getsafereads.com";
                return (
                  <a
                    key={appId}
                    href={`https://${domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-navy/60 hover:text-navy underline"
                  >
                    Go to {config.name}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
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

// Main page with Suspense
export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <SuccessContent />
    </Suspense>
  );
}
