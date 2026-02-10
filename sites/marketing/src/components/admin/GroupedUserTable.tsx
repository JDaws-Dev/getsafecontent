"use client";

import { useState } from "react";
import type { GroupedUser } from "@/types/admin";

interface GroupedUserTableProps {
  users: GroupedUser[];
  onGrantLifetime: (user: GroupedUser) => void;
  onDeleteUser: (user: GroupedUser) => void;
  onSendEmail?: (user: GroupedUser) => void;
}

const appIcons: Record<string, string> = {
  safetunes: "🎵",
  safetube: "📺",
  safereads: "📚",
};

const appColors: Record<string, string> = {
  safetunes: "bg-indigo-500",
  safetube: "bg-red-500",
  safereads: "bg-emerald-500",
};

const statusColors: Record<string, string> = {
  lifetime: "bg-purple-100 text-purple-700",
  yearly: "bg-green-100 text-green-700",
  monthly: "bg-green-100 text-green-700",
  trial: "bg-blue-100 text-blue-700",
  expired: "bg-red-100 text-red-700",
};

const subscriptionTypeLabels: Record<string, string> = {
  "3-app-bundle": "3-App Bundle",
  "2-app-bundle": "2-App Bundle",
  "single-app": "Single App",
};

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString();
}

function formatTrialExpiry(timestamp: number | null): string {
  if (!timestamp) return "-";
  const now = Date.now();
  const daysLeft = Math.ceil((timestamp - now) / (1000 * 60 * 60 * 24));
  const date = new Date(timestamp).toLocaleDateString();

  if (daysLeft < 0) {
    return `Expired ${Math.abs(daysLeft)}d ago`;
  } else if (daysLeft <= 2) {
    return `${daysLeft}d left`;
  }
  return date;
}

function downloadCSV(users: GroupedUser[], filename: string) {
  const header = "Name,Email,Apps,Type,Status,Kids,Joined\n";
  const rows = users.map(user => {
    const apps = user.apps.map(a => a.app.replace("safe", "Safe")).join("; ");
    const name = (user.name || "").replace(/,/g, "");
    const joined = user.earliestCreatedAt ? new Date(user.earliestCreatedAt).toLocaleDateString() : "";
    return `"${name}","${user.email}","${apps}","${subscriptionTypeLabels[user.subscriptionType]}","${user.planTier}","${user.totalKids}","${joined}"`;
  }).join("\n");

  const csv = header + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type SortField = "name" | "email" | "type" | "status" | "joined";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

export function GroupedUserTable({
  users,
  onGrantLifetime,
  onDeleteUser,
  onSendEmail,
}: GroupedUserTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [showExpiredTrials, setShowExpiredTrials] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

    // Subscription type filter
    if (typeFilter !== "all" && user.subscriptionType !== typeFilter) return false;

    // Plan tier filter
    if (tierFilter !== "all" && user.planTier !== tierFilter) return false;

    // Expired trials filter
    if (showExpiredTrials && !user.hasExpiredTrial) return false;

    return true;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name":
        comparison = (a.name || "").localeCompare(b.name || "");
        break;
      case "email":
        comparison = a.email.localeCompare(b.email);
        break;
      case "type":
        comparison = a.subscriptionType.localeCompare(b.subscriptionType);
        break;
      case "status":
        comparison = a.planTier.localeCompare(b.planTier);
        break;
      case "joined":
        comparison = (a.earliestCreatedAt || 0) - (b.earliestCreatedAt || 0);
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Count expired trials for the badge
  const expiredTrialCount = users.filter(u => u.hasExpiredTrial).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Filters */}
      <div className="px-5 py-4 border-b border-gray-100 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Subscription type filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); handleFilterChange(); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="3-app-bundle">3-App Bundle</option>
            <option value="2-app-bundle">2-App Bundle</option>
            <option value="single-app">Single App</option>
          </select>

          {/* Plan tier filter */}
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); handleFilterChange(); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All Tiers</option>
            <option value="lifetime">Lifetime</option>
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
          </select>

          <span className="px-3 py-2 text-sm text-gray-500">
            {filteredUsers.length} users
          </span>

          {/* Export button */}
          <button
            onClick={() => {
              const filterDesc = [
                typeFilter !== "all" ? typeFilter : null,
                tierFilter !== "all" ? tierFilter : null,
                showExpiredTrials ? "expired-trials" : null,
              ].filter(Boolean).join("-") || "all";
              downloadCSV(filteredUsers, `safe-family-users-${filterDesc}-${new Date().toISOString().split("T")[0]}.csv`);
            }}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Export filtered users as CSV"
          >
            📥 Export
          </button>
        </div>

        {/* Expired trials quick filter */}
        {expiredTrialCount > 0 && (
          <button
            onClick={() => { setShowExpiredTrials(!showExpiredTrials); handleFilterChange(); }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showExpiredTrials
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {expiredTrialCount} Expired Trials (Conversion Opportunities)
          </button>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-100">
        {paginatedUsers.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">No users found</div>
        ) : (
          paginatedUsers.map((user) => (
            <div key={user.email} className={`p-4 ${user.hasExpiredTrial ? "bg-red-50/50" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{user.name || "No name"}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[user.planTier] || "bg-gray-100 text-gray-600"}`}>
                  {user.planTier}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex gap-1">
                  {user.apps.map((app) => (
                    <span key={app.app} className={`w-6 h-6 rounded ${appColors[app.app]} flex items-center justify-center text-white text-xs`}>
                      {appIcons[app.app]}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-500">{subscriptionTypeLabels[user.subscriptionType]}</span>
                {user.totalKids > 0 && (
                  <span className="text-xs text-gray-400">• {user.totalKids} kid{user.totalKids > 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Joined {formatDate(user.earliestCreatedAt)}</span>
                {(user.planTier === "trial" || user.hasExpiredTrial) && (
                  <span className={user.hasExpiredTrial ? "text-red-600 font-medium" : ""}>
                    {formatTrialExpiry(user.latestTrialExpiry)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={`mailto:${user.email}`} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">✉️</a>
                {onSendEmail && (
                  <button onClick={() => onSendEmail(user)} className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg">📧 Template</button>
                )}
                {user.planTier !== "lifetime" && (
                  <button onClick={() => onGrantLifetime(user)} className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg">Grant Lifetime</button>
                )}
                <button onClick={() => onDeleteUser(user)} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg">Delete</button>
                {user.apps.some(a => a.stripeCustomerId) && (
                  <a href={`https://dashboard.stripe.com/customers/${user.apps.find(a => a.stripeCustomerId)?.stripeCustomerId}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Stripe</a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("name")}
              >
                <span className="flex items-center gap-1">
                  User {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                </span>
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Apps
              </th>
              <th
                className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("type")}
              >
                <span className="flex items-center gap-1">
                  Type {sortField === "type" && (sortDirection === "asc" ? "↑" : "↓")}
                </span>
              </th>
              <th
                className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("status")}
              >
                <span className="flex items-center gap-1">
                  Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                </span>
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trial Expiry
              </th>
              <th
                className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("joined")}
              >
                <span className="flex items-center gap-1">
                  Joined {sortField === "joined" && (sortDirection === "asc" ? "↑" : "↓")}
                </span>
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr
                  key={user.email}
                  className={`hover:bg-gray-50 ${user.hasExpiredTrial ? "bg-red-50/50" : ""}`}
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.name || "No name"}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.totalKids > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {user.totalKids} kid profile{user.totalKids > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      {user.apps.map((app) => (
                        <span
                          key={app.app}
                          title={`${app.app.replace("safe", "Safe")} - ${app.subscriptionStatus}`}
                          className={`w-7 h-7 rounded-md ${appColors[app.app]} flex items-center justify-center text-white text-sm`}
                        >
                          {appIcons[app.app]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-700">
                      {subscriptionTypeLabels[user.subscriptionType]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[user.planTier] || "bg-gray-100 text-gray-600"}`}
                    >
                      {user.planTier}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {user.planTier === "trial" || user.hasExpiredTrial ? (
                      <span className={`text-sm ${user.hasExpiredTrial ? "text-red-600 font-medium" : "text-gray-600"}`}>
                        {formatTrialExpiry(user.latestTrialExpiry)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {formatDate(user.earliestCreatedAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`mailto:${user.email}`}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Quick email (opens mail client)"
                      >
                        ✉️
                      </a>
                      {onSendEmail && (
                        <button
                          onClick={() => onSendEmail(user)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Send template email"
                        >
                          📧 Template
                        </button>
                      )}
                      {user.planTier !== "lifetime" && (
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
                      {/* Show Stripe link if any app has a Stripe customer ID */}
                      {user.apps.some(a => a.stripeCustomerId) && (
                        <a
                          href={`https://dashboard.stripe.com/customers/${user.apps.find(a => a.stripeCustomerId)?.stripeCustomerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          title="View in Stripe"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedUsers.length)} of {sortedUsers.length} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
