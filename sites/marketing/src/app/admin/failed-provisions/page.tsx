"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type AppName = "safetunes" | "safetube" | "safereads";

type AppStatus = {
  app: AppName;
  found: boolean;
  status?: string;
  createdAt?: number;
  error?: string;
};

type RetryResult = {
  app: AppName;
  success: boolean;
  error?: string;
  attempts?: number;
};

const APP_DISPLAY_NAMES: Record<AppName, string> = {
  safetunes: "SafeTunes",
  safetube: "SafeTube",
  safereads: "SafeReads",
};

function FailedProvisionsContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const initialApps = searchParams.get("apps")?.split(",").filter(Boolean) || [];

  const [email, setEmail] = useState(initialEmail);
  const [selectedApps, setSelectedApps] = useState<AppName[]>(
    initialApps.filter((a): a is AppName =>
      ["safetunes", "safetube", "safereads"].includes(a)
    )
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [appStatuses, setAppStatuses] = useState<AppStatus[] | null>(null);
  const [retryResults, setRetryResults] = useState<RetryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    if (!email) {
      setError("Please enter an email address");
      return;
    }

    setIsChecking(true);
    setError(null);
    setRetryResults(null);

    try {
      const response = await fetch(
        `/api/admin/retry-provision?email=${encodeURIComponent(email)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to check status");
      }

      const data = await response.json();
      setAppStatuses(data.apps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check status");
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check status if email was pre-filled
  useEffect(() => {
    if (initialEmail && !appStatuses && !isChecking) {
      handleCheckStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  const handleRetryProvision = async () => {
    if (!email) {
      setError("Please enter an email address");
      return;
    }

    if (selectedApps.length === 0) {
      setError("Please select at least one app to provision");
      return;
    }

    setIsRetrying(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/retry-provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, apps: selectedApps }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to retry provision");
      }

      setRetryResults(data.results);

      // Refresh status after retry
      handleCheckStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry provision");
    } finally {
      setIsRetrying(false);
    }
  };

  const toggleApp = (app: AppName) => {
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;

    const colors: Record<string, string> = {
      lifetime: "bg-purple-100 text-purple-800",
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      expired: "bg-gray-100 text-gray-800",
      canceled: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Retry Failed Provisions
        </h1>
        <p className="text-gray-500 text-sm">
          Manually provision app access for users whose webhook failed
        </p>
      </div>

      {/* Email Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Customer Email</h2>
        <div className="flex gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCheckStatus}
            disabled={isChecking || !email}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isChecking ? "Checking..." : "Check Status"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* App Status Display */}
      {appStatuses && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Current App Status for {email}
          </h2>
          <div className="space-y-3">
            {appStatuses.map((status) => (
              <div
                key={status.app}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedApps.includes(status.app)}
                    onChange={() => toggleApp(status.app)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium">
                    {APP_DISPLAY_NAMES[status.app]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {status.found ? (
                    <>
                      {getStatusBadge(status.status)}
                      <span className="text-sm text-gray-500">
                        Created:{" "}
                        {status.createdAt
                          ? new Date(status.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-orange-600 font-medium">
                      User not found {status.error && `(${status.error})`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Apps Summary */}
          {selectedApps.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-4">
                Selected for provisioning:{" "}
                <span className="font-medium">
                  {selectedApps.map((a) => APP_DISPLAY_NAMES[a]).join(", ")}
                </span>
              </p>
              <button
                onClick={handleRetryProvision}
                disabled={isRetrying}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying
                  ? "Provisioning..."
                  : `Grant Lifetime Access to ${selectedApps.length} App${selectedApps.length > 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Retry Results */}
      {retryResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Provision Results</h2>
          <div className="space-y-2">
            {retryResults.map((result) => (
              <div
                key={result.app}
                className={`flex items-center justify-between p-3 rounded-lg ${result.success ? "bg-green-50" : "bg-red-50"}`}
              >
                <span className="font-medium">
                  {APP_DISPLAY_NAMES[result.app]}
                </span>
                {result.success ? (
                  <span className="text-green-700 font-medium">
                    ✓ Success
                  </span>
                ) : (
                  <span className="text-red-700 text-sm">
                    ✗ Failed: {result.error} (after {result.attempts} attempts)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-2">How This Works</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>
            1. <strong>Check Status</strong> - See which apps the user already
            has access to
          </li>
          <li>
            2. <strong>Select Apps</strong> - Choose which apps need to be
            provisioned
          </li>
          <li>
            3. <strong>Grant Access</strong> - Click the button to provision
            lifetime access
          </li>
        </ul>
        <p className="mt-4 text-sm text-gray-500">
          This page is for fixing failed webhook provisions. The user must
          already have a Stripe payment - this just grants them access to the
          apps they paid for.
        </p>
      </div>
    </div>
  );
}

export default function FailedProvisionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
        </div>
      }
    >
      <FailedProvisionsContent />
    </Suspense>
  );
}
