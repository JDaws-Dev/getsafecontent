"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type AppName = "safetunes" | "safetube" | "safereads";
type SubscriptionStatus = "trial" | "active" | "lifetime" | "cancelled" | "expired";

type AppStatus = {
  app: AppName;
  found: boolean;
  status?: string;
  createdAt?: number;
  error?: string;
};

type ProvisionResult = {
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

const ALL_APPS: AppName[] = ["safetunes", "safetube", "safereads"];

const STATUS_OPTIONS: { value: SubscriptionStatus; label: string; description: string }[] = [
  { value: "trial", label: "Trial", description: "7-day free trial" },
  { value: "active", label: "Active", description: "Paid subscriber" },
  { value: "lifetime", label: "Lifetime", description: "Permanent access (promo code)" },
  { value: "cancelled", label: "Cancelled", description: "Subscription ended" },
  { value: "expired", label: "Expired", description: "Trial expired, no payment" },
];

function ProvisionUserContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [selectedApps, setSelectedApps] = useState<AppName[]>([...ALL_APPS]);
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus>("lifetime");
  const [isChecking, setIsChecking] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [appStatuses, setAppStatuses] = useState<AppStatus[] | null>(null);
  const [provisionResults, setProvisionResults] = useState<ProvisionResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    if (!email) {
      setError("Please enter an email address");
      return;
    }

    setIsChecking(true);
    setError(null);
    setProvisionResults(null);

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

  const handleProvision = async () => {
    if (!email) {
      setError("Please enter an email address");
      return;
    }

    if (selectedApps.length === 0) {
      setError("Please select at least one app to provision");
      return;
    }

    setIsProvisioning(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/provision-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          apps: selectedApps,
          status: selectedStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to provision user");
      }

      setProvisionResults(data.results);

      // Refresh status after provisioning
      handleCheckStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision user");
    } finally {
      setIsProvisioning(false);
    }
  };

  const toggleApp = (app: AppName) => {
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const selectAllApps = () => setSelectedApps([...ALL_APPS]);
  const clearAllApps = () => setSelectedApps([]);

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;

    const colors: Record<string, string> = {
      lifetime: "bg-purple-100 text-purple-800",
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      expired: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manual User Provisioning
          </h1>
          <p className="text-gray-500 text-sm">
            Set subscription status for users across Safe Family apps
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Email Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">User Email</h2>
        <div className="flex gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
            Current Status for {email}
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
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
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

          {/* Quick Selection */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={selectAllApps}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearAllApps}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Subscription Status Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Subscription Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedStatus === option.value
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    selectedStatus === option.value
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-300"
                  }`}
                >
                  {selectedStatus === option.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <span className="font-medium text-gray-900">{option.label}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500 ml-6">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Provision Button */}
      {selectedApps.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-600 mb-4">
            Set <strong>{selectedApps.map((a) => APP_DISPLAY_NAMES[a]).join(", ")}</strong> to{" "}
            <strong className="text-indigo-600">{selectedStatus}</strong> for{" "}
            <strong>{email || "(enter email above)"}</strong>
          </p>
          <button
            onClick={handleProvision}
            disabled={isProvisioning || !email}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedStatus === "lifetime"
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : selectedStatus === "active"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : selectedStatus === "trial"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-600 text-white hover:bg-gray-700"
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {isProvisioning
              ? "Provisioning..."
              : `Set ${selectedApps.length} App${selectedApps.length > 1 ? "s" : ""} to ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}`}
          </button>
        </div>
      )}

      {/* Provision Results */}
      {provisionResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Provision Results</h2>
          <div className="space-y-2">
            {provisionResults.map((result) => (
              <div
                key={result.app}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <span className="font-medium">
                  {APP_DISPLAY_NAMES[result.app]}
                </span>
                {result.success ? (
                  <span className="text-green-700 font-medium">
                    Success
                  </span>
                ) : (
                  <span className="text-red-700 text-sm">
                    Failed: {result.error} (after {result.attempts} attempts)
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
            1. <strong>Enter Email</strong> - The user&apos;s email address
          </li>
          <li>
            2. <strong>Check Status</strong> - See current subscription status on each app
          </li>
          <li>
            3. <strong>Select Apps</strong> - Choose which apps to update
          </li>
          <li>
            4. <strong>Choose Status</strong> - Select the subscription status to set
          </li>
          <li>
            5. <strong>Provision</strong> - Click the button to update the user
          </li>
        </ul>
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This tool works for users who already exist in each app.
            If a user is &quot;not found&quot;, they need to sign up first or be provisioned
            via the checkout webhook. Use the{" "}
            <Link href="/admin/failed-provisions" className="underline">
              Failed Provisions
            </Link>{" "}
            page for webhook retry scenarios.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProvisionUserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
        </div>
      }
    >
      <ProvisionUserContent />
    </Suspense>
  );
}
