"use client";

import { useState, useMemo } from "react";
import type { GroupedUser, DashboardStats, SafeTunesUser, SafeTubeUser, SafeReadsUser } from "@/types/admin";
import { UserDetailModal } from "./UserDetailModal";
import { QuickActionsModal } from "./QuickActionsModal";

interface RawData {
  safetunes: SafeTunesUser[];
  safetube: SafeTubeUser[];
  safereads: SafeReadsUser[];
}

interface PowerUser extends GroupedUser {
  activityScore: number;
  lastActivity?: {
    app: string;
    timestamp: number;
    description: string;
  };
}

interface UnifiedDashboardProps {
  users: GroupedUser[];
  rawData: RawData | null;
  stats: DashboardStats | null;
  powerUsers: PowerUser[];
  lastRefresh: Date | null;
  onRefresh: () => void;
}

const APP_CONFIG = {
  safetunes: {
    name: "SafeTunes",
    icon: "🎵",
    color: "bg-indigo-500",
    lightBg: "bg-indigo-50 dark:bg-indigo-900/20",
    textColor: "text-indigo-600 dark:text-indigo-400",
    gradient: "from-indigo-500 to-purple-500",
    borderColor: "border-indigo-200 dark:border-indigo-700",
  },
  safetube: {
    name: "SafeTube",
    icon: "📺",
    color: "bg-red-500",
    lightBg: "bg-red-50 dark:bg-red-900/20",
    textColor: "text-red-600 dark:text-red-400",
    gradient: "from-red-500 to-orange-500",
    borderColor: "border-red-200 dark:border-red-700",
  },
  safereads: {
    name: "SafeReads",
    icon: "📚",
    color: "bg-emerald-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-teal-500",
    borderColor: "border-emerald-200 dark:border-emerald-700",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  lifetime: {
    label: "Lifetime",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  },
  yearly: {
    label: "Yearly",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  monthly: {
    label: "Monthly",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  trial: {
    label: "Trial",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  expired: {
    label: "Expired",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
};

type SortField = "name" | "email" | "apps" | "status" | "joined" | "activity" | "lastActive";
type SortDirection = "asc" | "desc";
type AppFilter = "all" | "safetunes" | "safetube" | "safereads";
type ViewMode = "table" | "cards";

const ITEMS_PER_PAGE = 25;

function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UnifiedDashboard({
  users,
  rawData,
  stats,
  powerUsers,
  lastRefresh,
  onRefresh,
}: UnifiedDashboardProps) {
  // State
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<GroupedUser | null>(null);
  const [actionUser, setActionUser] = useState<GroupedUser | null>(null);
  const [showPowerUsers, setShowPowerUsers] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Calculate last activity for users
  const usersWithActivity = useMemo(() => {
    if (!rawData) return users;

    return users.map(user => {
      const emailLower = user.email.toLowerCase();
      const safetunes = rawData.safetunes.find(u => u.email.toLowerCase() === emailLower);

      let lastActivityTimestamp: number | null = null;
      let lastActivityApp = "";
      let lastActivityDesc = "";

      // Check SafeTunes last activity
      if (safetunes?.lastActivity?.playedAt) {
        if (!lastActivityTimestamp || safetunes.lastActivity.playedAt > lastActivityTimestamp) {
          lastActivityTimestamp = safetunes.lastActivity.playedAt;
          lastActivityApp = "safetunes";
          lastActivityDesc = `${safetunes.lastActivity.kidName} played ${safetunes.lastActivity.itemName}`;
        }
      }

      // For now, SafeTube and SafeReads don't have last activity data in the API
      // This can be extended when that data becomes available

      return {
        ...user,
        lastActivity: lastActivityTimestamp ? {
          app: lastActivityApp,
          timestamp: lastActivityTimestamp,
          description: lastActivityDesc,
        } : null,
        lastActivityTimestamp,
      };
    });
  }, [users, rawData]);

  // Get raw user data for a specific user
  const getRawUserData = (email: string) => {
    if (!rawData) return null;
    const emailLower = email.toLowerCase();
    return {
      safetunes: rawData.safetunes.find(u => u.email.toLowerCase() === emailLower) || null,
      safetube: rawData.safetube.find(u => u.email.toLowerCase() === emailLower) || null,
      safereads: rawData.safereads.find(u => u.email.toLowerCase() === emailLower) || null,
    };
  };

  // Filter users
  const filteredUsers = usersWithActivity.filter(user => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        user.email.toLowerCase().includes(searchLower) ||
        (user.name?.toLowerCase().includes(searchLower) ?? false);
      if (!matchesSearch) return false;
    }

    // App filter
    if (appFilter !== "all") {
      if (!user.apps.some(a => a.app === appFilter)) return false;
    }

    // Status filter
    if (statusFilter !== "all" && user.planTier !== statusFilter) return false;

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
      case "apps":
        comparison = a.apps.length - b.apps.length;
        break;
      case "status":
        comparison = a.planTier.localeCompare(b.planTier);
        break;
      case "joined":
        comparison = (a.earliestCreatedAt || 0) - (b.earliestCreatedAt || 0);
        break;
      case "activity":
        comparison = a.totalKids - b.totalKids;
        break;
      case "lastActive":
        comparison = ((a as any).lastActivityTimestamp || 0) - ((b as any).lastActivityTimestamp || 0);
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

  // Export to CSV
  const exportCSV = () => {
    const headers = [
      "Name", "Email", "Apps", "Status", "Kids", "Joined", "Last Active",
      "SafeTunes Songs", "SafeTunes Albums",
      "SafeTube Channels", "SafeTube Videos",
      "SafeReads Analyses", "Stripe Customer ID"
    ];

    const rows = filteredUsers.map(user => {
      const raw = getRawUserData(user.email);
      const stripeId = user.apps.find(a => a.stripeCustomerId)?.stripeCustomerId || "";
      return [
        user.name || "",
        user.email,
        user.apps.map(a => APP_CONFIG[a.app].name).join("; "),
        user.planTier,
        user.totalKids.toString(),
        user.earliestCreatedAt ? new Date(user.earliestCreatedAt).toLocaleDateString() : "",
        (user as any).lastActivityTimestamp ? new Date((user as any).lastActivityTimestamp).toLocaleString() : "Never",
        raw?.safetunes?.approvedSongCount?.toString() || "",
        raw?.safetunes?.approvedAlbumCount?.toString() || "",
        raw?.safetube?.channelCount?.toString() || "",
        raw?.safetube?.videoCount?.toString() || "",
        raw?.safereads?.analysisCount?.toString() || "",
        stripeId,
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `safe-family-users-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate app-specific stats
  const appStats = useMemo(() => {
    if (!rawData) return null;

    return {
      safetunes: {
        totalUsers: rawData.safetunes.length,
        totalKids: rawData.safetunes.reduce((sum, u) => sum + u.kidProfileCount, 0),
        totalSongs: rawData.safetunes.reduce((sum, u) => sum + u.approvedSongCount, 0),
        totalAlbums: rawData.safetunes.reduce((sum, u) => sum + u.approvedAlbumCount, 0),
      },
      safetube: {
        totalUsers: rawData.safetube.length,
        totalKids: rawData.safetube.reduce((sum, u) => sum + u.kidCount, 0),
        totalChannels: rawData.safetube.reduce((sum, u) => sum + u.channelCount, 0),
        totalVideos: rawData.safetube.reduce((sum, u) => sum + u.videoCount, 0),
      },
      safereads: {
        totalUsers: rawData.safereads.length,
        totalKids: rawData.safereads.reduce((sum, u) => sum + u.kidCount, 0),
        totalAnalyses: rawData.safereads.reduce((sum, u) => sum + u.analysisCount, 0),
      },
    };
  }, [rawData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unified Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {users.length} unique users across all apps
            {lastRefresh && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                - Updated {formatRelativeTime(lastRefresh.getTime())}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Users"
            value={users.length}
            icon="👥"
            description="Unique accounts"
          />
          <StatCard
            label="Active Paying"
            value={users.filter(u => u.planTier === "monthly" || u.planTier === "yearly").length}
            icon="💳"
            color="text-green-600 dark:text-green-400"
            description="Monthly + Yearly"
          />
          <StatCard
            label="Trial"
            value={users.filter(u => u.planTier === "trial").length}
            icon="⏱"
            color="text-blue-600 dark:text-blue-400"
            description="Active trials"
          />
          <StatCard
            label="Lifetime"
            value={users.filter(u => u.planTier === "lifetime").length}
            icon="♾"
            color="text-purple-600 dark:text-purple-400"
            description="Forever access"
          />
          <StatCard
            label="3-App Bundle"
            value={users.filter(u => u.subscriptionType === "3-app-bundle").length}
            icon="📦"
            color="text-indigo-600 dark:text-indigo-400"
            description="Full bundle"
          />
          <StatCard
            label="Expired"
            value={users.filter(u => u.planTier === "expired" || u.hasExpiredTrial).length}
            icon="⚠️"
            color="text-red-600 dark:text-red-400"
            description="Conversion opportunity"
          />
        </div>
      )}

      {/* App-Specific Stats */}
      {appStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SafeTunes Stats */}
          <div className={`rounded-xl p-5 ${APP_CONFIG.safetunes.lightBg} border ${APP_CONFIG.safetunes.borderColor}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${APP_CONFIG.safetunes.gradient} flex items-center justify-center text-white text-lg`}>
                {APP_CONFIG.safetunes.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{APP_CONFIG.safetunes.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{appStats.safetunes.totalUsers} users</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safetunes.totalKids}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kids</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safetunes.totalSongs}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Songs</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safetunes.totalAlbums}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Albums</p>
              </div>
            </div>
          </div>

          {/* SafeTube Stats */}
          <div className={`rounded-xl p-5 ${APP_CONFIG.safetube.lightBg} border ${APP_CONFIG.safetube.borderColor}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${APP_CONFIG.safetube.gradient} flex items-center justify-center text-white text-lg`}>
                {APP_CONFIG.safetube.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{APP_CONFIG.safetube.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{appStats.safetube.totalUsers} users</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safetube.totalKids}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kids</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safetube.totalChannels}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Channels</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safetube.totalVideos}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Videos</p>
              </div>
            </div>
          </div>

          {/* SafeReads Stats */}
          <div className={`rounded-xl p-5 ${APP_CONFIG.safereads.lightBg} border ${APP_CONFIG.safereads.borderColor}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${APP_CONFIG.safereads.gradient} flex items-center justify-center text-white text-lg`}>
                {APP_CONFIG.safereads.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{APP_CONFIG.safereads.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{appStats.safereads.totalUsers} users</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safereads.totalKids}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kids</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{appStats.safereads.totalAnalyses}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Analyses</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Power Users Section */}
      {powerUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowPowerUsers(!showPowerUsers)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Power Users</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Top 10 most active users by engagement</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showPowerUsers ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPowerUsers && (
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {powerUsers.map((user, i) => (
                <button
                  key={user.email}
                  onClick={() => setSelectedUser(user)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700 transition-all hover:shadow-md text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:scale-105 transition-transform">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name || user.email.split("@")[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5">
                        {user.apps.map(app => (
                          <span key={app.app} className={`w-4 h-4 rounded ${APP_CONFIG[app.app].color} flex items-center justify-center text-white text-[10px]`}>
                            {APP_CONFIG[app.app].icon}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user.totalKids} kids
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[250px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          {/* App filter */}
          <select
            value={appFilter}
            onChange={(e) => { setAppFilter(e.target.value as AppFilter); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
          >
            <option value="all">All Apps</option>
            <option value="safetunes">SafeTunes</option>
            <option value="safetube">SafeTube</option>
            <option value="safereads">SafeReads</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="lifetime">Lifetime</option>
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 text-sm ${viewMode === "table" ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 text-sm ${viewMode === "cards" ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredUsers.length} users
          </span>
        </div>
      </div>

      {/* User Table/Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Desktop table view */}
        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <SortableHeader
                    label="User"
                    field="name"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Apps"
                    field="apps"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    field="status"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Activity"
                    field="activity"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Last Active"
                    field="lastActive"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Joined"
                    field="joined"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No users found matching your filters
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map(user => (
                    <UserRow
                      key={user.email}
                      user={user}
                      rawData={getRawUserData(user.email)}
                      onView={() => setSelectedUser(user)}
                      onAction={() => setActionUser(user)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Cards view */}
        {viewMode === "cards" && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedUsers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                No users found matching your filters
              </div>
            ) : (
              paginatedUsers.map(user => (
                <UserCard
                  key={user.email}
                  user={user}
                  rawData={getRawUserData(user.email)}
                  onView={() => setSelectedUser(user)}
                  onAction={() => setActionUser(user)}
                />
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedUsers.length)} of {sortedUsers.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="First page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1 mx-2">
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
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <span className="sm:hidden px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          rawData={getRawUserData(selectedUser.email)}
          onClose={() => setSelectedUser(null)}
          onAction={() => {
            setSelectedUser(null);
            setActionUser(selectedUser);
          }}
        />
      )}

      {/* Quick Actions Modal */}
      {actionUser && (
        <QuickActionsModal
          user={actionUser}
          onClose={() => setActionUser(null)}
          onComplete={onRefresh}
        />
      )}
    </div>
  );
}

// Helper Components

function StatCard({ label, value, icon, color = "text-gray-900 dark:text-white", description }: {
  label: string;
  value: number;
  icon: string;
  color?: string;
  description?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}

function SortableHeader({ label, field, currentField, direction, onSort }: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;

  return (
    <th
      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-all ${isActive ? "text-indigo-500" : "text-gray-300 dark:text-gray-600"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isActive ? (
            direction === "asc" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            )
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          )}
        </svg>
      </span>
    </th>
  );
}

function UserRow({ user, rawData, onView, onAction }: {
  user: GroupedUser & { lastActivityTimestamp?: number | null };
  rawData: { safetunes: SafeTunesUser | null; safetube: SafeTubeUser | null; safereads: SafeReadsUser | null } | null;
  onView: () => void;
  onAction: () => void;
}) {
  const statusConfig = STATUS_CONFIG[user.planTier] || STATUS_CONFIG.expired;

  // Calculate total activity
  const totalActivity = (rawData?.safetunes?.approvedSongCount || 0) +
    (rawData?.safetunes?.approvedAlbumCount || 0) +
    (rawData?.safetube?.channelCount || 0) +
    (rawData?.safetube?.videoCount || 0) +
    (rawData?.safereads?.analysisCount || 0);

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${user.hasExpiredTrial ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
      <td className="px-5 py-4">
        <button onClick={onView} className="text-left group">
          <p className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {user.name || "No name"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </button>
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-1.5">
          {user.apps.map(app => (
            <span
              key={app.app}
              title={`${APP_CONFIG[app.app].name} - ${app.subscriptionStatus}`}
              className={`w-7 h-7 rounded-md ${APP_CONFIG[app.app].color} flex items-center justify-center text-white text-sm shadow-sm`}
            >
              {APP_CONFIG[app.app].icon}
            </span>
          ))}
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="text-sm">
          <span className="font-medium text-gray-900 dark:text-white">{user.totalKids}</span>
          <span className="text-gray-500 dark:text-gray-400"> kids</span>
          {totalActivity > 0 && (
            <span className="text-gray-400 dark:text-gray-500 ml-2">
              ({totalActivity} items)
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
        {formatRelativeTime(user.lastActivityTimestamp)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
        {formatDate(user.earliestCreatedAt)}
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onView}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            View
          </button>
          <button
            onClick={onAction}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Actions
          </button>
        </div>
      </td>
    </tr>
  );
}

function UserCard({ user, rawData, onView, onAction }: {
  user: GroupedUser & { lastActivityTimestamp?: number | null };
  rawData: { safetunes: SafeTunesUser | null; safetube: SafeTubeUser | null; safereads: SafeReadsUser | null } | null;
  onView: () => void;
  onAction: () => void;
}) {
  const statusConfig = STATUS_CONFIG[user.planTier] || STATUS_CONFIG.expired;

  return (
    <div className={`rounded-xl border p-4 hover:shadow-md transition-all ${user.hasExpiredTrial ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
      <div className="flex items-start justify-between mb-3">
        <button onClick={onView} className="text-left">
          <p className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {user.name || "No name"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{user.email}</p>
        </button>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-1">
          {user.apps.map(app => (
            <span
              key={app.app}
              className={`w-6 h-6 rounded ${APP_CONFIG[app.app].color} flex items-center justify-center text-white text-xs shadow-sm`}
            >
              {APP_CONFIG[app.app].icon}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {user.totalKids} {user.totalKids === 1 ? "kid" : "kids"}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>Joined {formatDate(user.earliestCreatedAt)}</span>
        <span>Active {formatRelativeTime(user.lastActivityTimestamp)}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Details
        </button>
        <button
          onClick={onAction}
          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Actions
        </button>
      </div>
    </div>
  );
}
