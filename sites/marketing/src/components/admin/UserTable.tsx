"use client";

import { useState } from "react";
import type { UnifiedUser } from "@/types/admin";

interface UserTableProps {
  users: UnifiedUser[];
  onGrantLifetime: (user: UnifiedUser) => void;
  onDeleteUser: (user: UnifiedUser) => void;
}

const appColors = {
  safetunes: "bg-gradient-to-br from-indigo-500 to-purple-500",
  safetube: "bg-gradient-to-br from-red-500 to-orange-500",
  safereads: "bg-gradient-to-br from-emerald-500 to-teal-500",
};

const appIcons = {
  safetunes: "🎵",
  safetube: "📺",
  safereads: "📚",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-blue-100 text-blue-700",
  lifetime: "bg-purple-100 text-purple-700",
  cancelled: "bg-gray-100 text-gray-600",
  canceled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
  past_due: "bg-orange-100 text-orange-700",
  unknown: "bg-gray-100 text-gray-600",
};

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString();
}

export function UserTable({
  users,
  onGrantLifetime,
  onDeleteUser,
}: UserTableProps) {
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        user.email.toLowerCase().includes(searchLower) ||
        (user.name?.toLowerCase().includes(searchLower) ?? false);
      if (!matchesSearch) return false;
    }

    // App filter
    if (appFilter !== "all" && user.app !== appFilter) return false;

    // Status filter
    if (statusFilter !== "all" && user.subscriptionStatus !== statusFilter)
      return false;

    return true;
  });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(
    new Set(users.map((u) => u.subscriptionStatus))
  ).sort();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Filters */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* App filter */}
        <select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="all">All Apps</option>
          <option value="safetunes">SafeTunes</option>
          <option value="safetube">SafeTube</option>
          <option value="safereads">SafeReads</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          {uniqueStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <span className="px-3 py-2 text-sm text-gray-500">
          {filteredUsers.length} users
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                App
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={`${user.app}-${user.email}`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.name || "No name"}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.couponCode && (
                        <p className="text-xs text-purple-600 mt-1">
                          Coupon: {user.couponCode}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded ${appColors[user.app]} flex items-center justify-center text-white text-xs`}
                      >
                        {appIcons[user.app]}
                      </span>
                      <span className="text-sm text-gray-700 capitalize">
                        {user.app.replace("safe", "Safe")}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[user.subscriptionStatus] || statusColors.unknown}`}
                    >
                      {user.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {user.app === "safetunes" && (
                      <div>
                        <span>{user.albumCount || 0} albums</span>
                        <span className="mx-1">•</span>
                        <span>{user.songCount || 0} songs</span>
                      </div>
                    )}
                    {user.app === "safetube" && (
                      <div>
                        <span>{user.channelCount || 0} channels</span>
                        <span className="mx-1">•</span>
                        <span>{user.videoCount || 0} videos</span>
                      </div>
                    )}
                    {user.app === "safereads" && (
                      <div>
                        <span>{user.analysisCount || 0} analyses</span>
                      </div>
                    )}
                    {user.kidCount !== undefined && user.kidCount > 0 && (
                      <div className="text-gray-400">
                        {user.kidCount} kid profile{user.kidCount > 1 ? "s" : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.subscriptionStatus !== "lifetime" && (
                        <button
                          onClick={() => onGrantLifetime(user)}
                          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          Grant Lifetime
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteUser(user)}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                      {user.stripeCustomerId && (
                        <a
                          href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Stripe
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
