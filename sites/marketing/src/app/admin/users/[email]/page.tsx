"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const APP_CONFIG = {
  safetunes: {
    name: "SafeTunes",
    icon: "\u{1F3B5}",
    gradient: "from-indigo-500 to-purple-500",
    lightBg: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  safetube: {
    name: "SafeTube",
    icon: "\u{1F4FA}",
    gradient: "from-red-500 to-orange-500",
    lightBg: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
  },
  safereads: {
    name: "SafeReads",
    icon: "\u{1F4DA}",
    gradient: "from-emerald-500 to-teal-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
} as const;

type AppKey = keyof typeof APP_CONFIG;

interface StripeSubscription {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  plan: { amount: number; interval: string } | null;
}

interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  date: number;
  status: string;
  description: string | null;
  refunded: boolean;
  amountRefunded: number;
}

interface UserDetailData {
  marketingAccount: {
    email?: string;
    name?: string;
    status?: string;
    createdAt?: number;
    apps?: Record<string, unknown>;
  } | null;
  safetunes: {
    email: string;
    name: string | null;
    subscriptionStatus: string;
    createdAt: number | null;
    kidProfileCount: number;
    approvedSongCount: number;
    approvedAlbumCount: number;
    stripeCustomerId: string | null;
    subscriptionEndsAt: number | null;
    couponCode: string | null;
    lastActivity: {
      playedAt: number;
      itemName: string;
      kidName: string;
    } | null;
  } | null;
  safetube: {
    email: string;
    name: string | null;
    subscriptionStatus: string;
    createdAt: number | null;
    kidCount: number;
    channelCount: number;
    videoCount: number;
    familyCode: string | null;
    trialEndsAt: number | null;
    stripeCustomerId?: string | null;
  } | null;
  safereads: {
    email: string;
    name: string | null;
    subscriptionStatus: string;
    createdAt: number;
    analysisCount: number;
    kidCount: number;
    stripeCustomerId: string | null;
    subscriptionEndsAt: number | null;
    trialExpiresAt: number | null;
    couponCode: string | null;
    onboardingComplete: boolean;
  } | null;
  payments: StripePayment[];
  subscriptions: StripeSubscription[];
  stripeCustomer: {
    id: string;
    name: string | null;
    email: string | null;
    created: number;
  } | null;
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTrialDaysLeft(expiresAt: number | null | undefined): string {
  if (!expiresAt) return "-";
  const now = Date.now();
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "Expires tomorrow";
  return `${daysLeft} days left`;
}

function StatusBadge({ status, app }: { status: string; app: AppKey }) {
  const config = APP_CONFIG[app];
  const statusColors: Record<string, string> = {
    lifetime:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    trial:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    cancelled:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    expired:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const colorClass =
    statusColors[status] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}
    >
      <span
        className={`w-5 h-5 rounded bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white text-[10px]`}
      >
        {config.icon}
      </span>
      {config.name}: {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    trialing:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    canceled:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    past_due:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    incomplete:
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    unpaid:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const colorClass =
    colors[status] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    succeeded:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    failed:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const colorClass =
    colors[status] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const email = decodeURIComponent(params.email as string);

  const [data, setData] = useState<UserDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/admin/user-detail?email=${encodeURIComponent(email)}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch user details");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch user details");
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGrantLifetime = async () => {
    if (!window.confirm(`Grant lifetime access to ${email} on all 3 apps?`)) {
      return;
    }
    setActionLoading("grant-lifetime");
    try {
      const res = await fetch("/api/admin/grant-lifetime-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          apps: ["safetunes", "safetube", "safereads", "safestudy"],
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to grant lifetime");
      }
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to grant lifetime");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordReset = async () => {
    setActionLoading("password-reset");
    try {
      const encodedKey = encodeURIComponent(
        "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0="
      );
      const res = await fetch(
        `https://adamant-crow-705.convex.site/requestPasswordReset?email=${encodeURIComponent(email)}&key=${encodedKey}`
      );
      if (!res.ok) {
        throw new Error("Failed to send password reset");
      }
      alert("Password reset email sent successfully.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send password reset");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    const appsPresent: string[] = [];
    if (data?.safetunes) appsPresent.push("safetunes");
    if (data?.safetube) appsPresent.push("safetube");
    if (data?.safereads) appsPresent.push("safereads");

    if (appsPresent.length === 0) {
      alert("No app accounts found for this user.");
      return;
    }

    if (
      !window.confirm(
        `DELETE ${email} from ${appsPresent.join(", ")}? This cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading("delete");
    try {
      const res = await fetch("/api/admin/delete-user-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, apps: appsPresent }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete user");
      }
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  // Determine earliest creation date and user name
  const userName =
    data?.marketingAccount?.name ||
    data?.safetunes?.name ||
    data?.safetube?.name ||
    data?.safereads?.name ||
    null;

  const memberSince = data
    ? Math.min(
        ...[
          data.marketingAccount?.createdAt,
          data.safetunes?.createdAt,
          data.safetube?.createdAt,
          data.safereads?.createdAt,
        ].filter((d): d is number => typeof d === "number" && d > 0)
      )
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Users
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="animate-pulse text-gray-400 dark:text-gray-500">
            Loading user details...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Users
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const appStatuses: { app: AppKey; status: string }[] = [];
  if (data.safetunes)
    appStatuses.push({ app: "safetunes", status: data.safetunes.subscriptionStatus });
  if (data.safetube)
    appStatuses.push({ app: "safetube", status: data.safetube.subscriptionStatus });
  if (data.safereads)
    appStatuses.push({ app: "safereads", status: data.safereads.subscriptionStatus });

  const sortedPayments = [...data.payments].sort((a, b) => b.date - a.date);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Users
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {email}
            </h1>
            {userName && (
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                {userName}
              </p>
            )}
            {memberSince && memberSince !== Infinity && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Member since {formatDate(memberSince)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {appStatuses.map(({ app, status }) => (
              <StatusBadge key={app} app={app} status={status} />
            ))}
            {appStatuses.length === 0 && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                No app accounts found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: App Access Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* SafeTunes Card */}
          {data.safetunes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div
                className={`bg-gradient-to-r ${APP_CONFIG.safetunes.gradient} px-5 py-4`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{APP_CONFIG.safetunes.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      SafeTunes
                    </h3>
                    <p className="text-white/80 text-sm">
                      {data.safetunes.subscriptionStatus.charAt(0).toUpperCase() +
                        data.safetunes.subscriptionStatus.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Created</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(data.safetunes.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Subscription Ends
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(data.safetunes.subscriptionEndsAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Coupon Code
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.safetunes.couponCode || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Stripe Customer
                    </p>
                    <p
                      className="font-medium text-gray-900 dark:text-white truncate"
                      title={data.safetunes.stripeCustomerId || undefined}
                    >
                      {data.safetunes.stripeCustomerId
                        ? data.safetunes.stripeCustomerId.slice(0, 14) + "..."
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Kid Profiles
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safetunes.kidProfileCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Approved Songs
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safetunes.approvedSongCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Approved Albums
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safetunes.approvedAlbumCount}
                      </p>
                    </div>
                  </div>
                </div>
                {data.safetunes.lastActivity && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3 text-sm">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">
                      Last Activity
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      <span className="font-medium">
                        {data.safetunes.lastActivity.kidName}
                      </span>{" "}
                      played{" "}
                      <span className="font-medium">
                        {data.safetunes.lastActivity.itemName}
                      </span>{" "}
                      <span className="text-gray-500 dark:text-gray-400">
                        ({formatDateTime(data.safetunes.lastActivity.playedAt)})
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SafeTube Card */}
          {data.safetube && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div
                className={`bg-gradient-to-r ${APP_CONFIG.safetube.gradient} px-5 py-4`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{APP_CONFIG.safetube.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      SafeTube
                    </h3>
                    <p className="text-white/80 text-sm">
                      {data.safetube.subscriptionStatus.charAt(0).toUpperCase() +
                        data.safetube.subscriptionStatus.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Created</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(data.safetube.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Trial Ends
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.safetube.trialEndsAt
                        ? getTrialDaysLeft(data.safetube.trialEndsAt)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Family Code
                    </p>
                    <p className="font-medium font-mono text-gray-900 dark:text-white">
                      {data.safetube.familyCode || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Stripe Customer
                    </p>
                    <p
                      className="font-medium text-gray-900 dark:text-white truncate"
                      title={data.safetube.stripeCustomerId || undefined}
                    >
                      {data.safetube.stripeCustomerId
                        ? data.safetube.stripeCustomerId.slice(0, 14) + "..."
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Kid Profiles
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safetube.kidCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Approved Channels
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safetube.channelCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Approved Videos
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safetube.videoCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SafeReads Card */}
          {data.safereads && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div
                className={`bg-gradient-to-r ${APP_CONFIG.safereads.gradient} px-5 py-4`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{APP_CONFIG.safereads.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      SafeReads
                    </h3>
                    <p className="text-white/80 text-sm">
                      {data.safereads.subscriptionStatus
                        .charAt(0)
                        .toUpperCase() +
                        data.safereads.subscriptionStatus.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Created</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(data.safereads.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Trial Expires
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.safereads.trialExpiresAt
                        ? getTrialDaysLeft(data.safereads.trialExpiresAt)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Subscription Ends
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(data.safereads.subscriptionEndsAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Coupon Code
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.safereads.couponCode || "-"}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Kid Profiles
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safereads.kidCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Book Analyses
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safereads.analysisCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Onboarding
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.safereads.onboardingComplete
                          ? "Complete"
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No apps message */}
          {!data.safetunes && !data.safetube && !data.safereads && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No app accounts found for this user.
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={handleGrantLifetime}
                disabled={actionLoading !== null}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "grant-lifetime"
                  ? "Granting..."
                  : "Grant Lifetime (All Apps)"}
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={actionLoading !== null}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "password-reset"
                  ? "Sending..."
                  : "Send Password Reset"}
              </button>
              {data.stripeCustomer && (
                <a
                  href={`https://dashboard.stripe.com/customers/${data.stripeCustomer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2.5 text-sm font-medium text-center text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  View in Stripe
                  <span className="ml-1 text-gray-400">&#x2197;</span>
                </a>
              )}
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading !== null}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "delete" ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>

          {/* Stripe Subscriptions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Stripe Subscriptions
              </h3>
            </div>
            <div className="p-5">
              {data.subscriptions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No subscriptions found.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <SubscriptionStatusBadge status={sub.status} />
                        {sub.cancelAtPeriodEnd && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            Cancels at period end
                          </span>
                        )}
                      </div>
                      {sub.plan && (
                        <p className="text-sm text-gray-900 dark:text-white">
                          ${sub.plan.amount.toFixed(2)}/{sub.plan.interval}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(sub.currentPeriodStart)} -{" "}
                        {formatDate(sub.currentPeriodEnd)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
                        {sub.id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Marketing Account */}
          {data.marketingAccount && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Central Account
                </h3>
              </div>
              <div className="p-5 text-sm space-y-2">
                {data.marketingAccount.status && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Status
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {data.marketingAccount.status}
                    </span>
                  </div>
                )}
                {data.marketingAccount.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Created
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(data.marketingAccount.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment History - Full width */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Payment History
          </h3>
        </div>
        {sortedPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Date
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Amount
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Description
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Refunded
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
                  >
                    <td className="px-5 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">
                      ${payment.amount.toFixed(2)}{" "}
                      <span className="text-gray-400 dark:text-gray-500 uppercase text-xs">
                        {payment.currency}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {payment.description || "-"}
                    </td>
                    <td className="px-5 py-3">
                      {payment.refunded ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -${payment.amountRefunded.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
