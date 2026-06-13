"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { GroupedUser } from "@/types/admin";

interface ActivityData {
  recentSignups7d: GroupedUser[];
  recentSignups30d: GroupedUser[];
  expiringTrials: GroupedUser[];
  recentlyExpired: GroupedUser[];
  activeUsers: GroupedUser[];
  needsAttention: GroupedUser[];
  totalUsers: number;
}

const appColors: Record<string, string> = {
  safetunes: "bg-purple-500",
  safetube: "bg-red-500",
  safereads: "bg-amber-500",
};

const appLabels: Record<string, string> = {
  safetunes: "Tunes",
  safetube: "Tube",
  safereads: "Reads",
};

const statusColors: Record<string, string> = {
  lifetime:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  monthly:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  trial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString();
}

function daysFromNow(timestamp: number): number {
  return Math.ceil((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysAgo(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
}

function AppBadges({ apps }: { apps: GroupedUser["apps"] }) {
  return (
    <div className="flex gap-1">
      {apps.map((a) => (
        <span
          key={a.app}
          className={`inline-block w-2 h-2 rounded-full ${appColors[a.app]}`}
          title={a.app}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
        {apps.map((a) => appLabels[a.app]).join(", ")}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.expired}`}
    >
      {status}
    </span>
  );
}

function UserLink({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/admin/users?search=${encodeURIComponent(email)}`}
      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {children}
    </Link>
  );
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/activity");
      if (!res.ok) {
        throw new Error("Failed to fetch activity data");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch activity data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Activity
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Monitor signups, trials, and user engagement
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400">
              Loading activity data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Activity
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Monitor signups, trials, and user engagement
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Activity
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Monitor signups, trials, and user engagement
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            New Signups (7d)
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.recentSignups7d.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            New Signups (30d)
          </p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {data.recentSignups30d.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Expiring Trials
          </p>
          <p
            className={`text-2xl font-bold ${
              data.expiringTrials.length > 0
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {data.expiringTrials.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Needs Attention
          </p>
          <p
            className={`text-2xl font-bold ${
              data.needsAttention.length > 0
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {data.needsAttention.length}
          </p>
        </div>
      </div>

      {/* Trials Expiring Soon */}
      {data.expiringTrials.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trials Expiring Soon
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trials ending within the next 7 days
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Apps
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trial Expires
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Days Left
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.expiringTrials.map((user) => {
                  const remaining = user.latestTrialExpiry
                    ? daysFromNow(user.latestTrialExpiry)
                    : 0;
                  return (
                    <tr
                      key={user.email}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <UserLink email={user.email}>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name || "-"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </UserLink>
                      </td>
                      <td className="px-5 py-3">
                        <AppBadges apps={user.apps} />
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(user.latestTrialExpiry)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            remaining < 2
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}
                        >
                          {remaining} day{remaining !== 1 ? "s" : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Signups */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Signups
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last 10 users who signed up
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Apps
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.recentSignups30d.slice(0, 10).map((user) => (
                <tr
                  key={user.email}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <UserLink email={user.email}>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.name || "-"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </UserLink>
                  </td>
                  <td className="px-5 py-3">
                    <AppBadges apps={user.apps} />
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {formatDate(user.earliestCreatedAt)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={user.planTier} />
                  </td>
                </tr>
              ))}
              {data.recentSignups30d.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No signups in the last 30 days
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Needs Attention */}
      {data.needsAttention.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50">
          <div className="px-5 py-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">
              Needs Attention
            </h2>
            <p className="text-sm text-red-700 dark:text-red-400">
              Engaged users with expired trials (had kid profiles set up)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Apps
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kids
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trial Expired
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Days Since
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.needsAttention.map((user) => {
                  const daysSinceExpiry = user.latestTrialExpiry
                    ? daysAgo(user.latestTrialExpiry)
                    : 0;
                  return (
                    <tr
                      key={user.email}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <UserLink email={user.email}>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name || "-"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </UserLink>
                      </td>
                      <td className="px-5 py-3">
                        <AppBadges apps={user.apps} />
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {user.totalKids}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(user.latestTrialExpiry)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          {daysSinceExpiry}d ago
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <a
                          href={`mailto:${user.email}?subject=We%20miss%20you%20at%20Safe%20Family&body=Hi%20${encodeURIComponent(user.name || "there")}%2C%0A%0AWe%20noticed%20your%20trial%20recently%20expired.%20We%27d%20love%20to%20have%20you%20back!`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
                        >
                          Send Re-engagement
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recently Expired Trials */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recently Expired Trials
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trials that expired in the last 30 days
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Apps
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expired Date
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Days Ago
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.recentlyExpired.slice(0, 20).map((user) => {
                const ago = user.latestTrialExpiry
                  ? daysAgo(user.latestTrialExpiry)
                  : 0;
                return (
                  <tr
                    key={user.email}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <UserLink email={user.email}>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.name || "-"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </UserLink>
                    </td>
                    <td className="px-5 py-3">
                      <AppBadges apps={user.apps} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(user.latestTrialExpiry)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {ago}d ago
                    </td>
                  </tr>
                );
              })}
              {data.recentlyExpired.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No expired trials in the last 30 days
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
