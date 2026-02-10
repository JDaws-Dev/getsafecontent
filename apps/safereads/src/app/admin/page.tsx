"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  BookOpen,
  Shield,
  CreditCard,
  MessageCircle,
  Baby,
  BarChart3,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

type SortField = "name" | "email" | "subscriptionStatus" | "analysisCount" | "kidsCount" | "_creationTime";
type SortDirection = "asc" | "desc";
type FilterStatus = "all" | "pro" | "free";

function SortIndicator({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

export default function AdminPage() {
  const router = useRouter();
  const isAdmin = useQuery(api.admin.isAdmin);
  const stats = useQuery(api.admin.getStats);
  const users = useQuery(api.admin.listUsers);

  // Table state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("_creationTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    if (isAdmin === false) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let result = [...users];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        user =>
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      );
    }

    // Filter by subscription status
    if (filterStatus === "pro") {
      result = result.filter(user => user.subscriptionStatus === "active");
    } else if (filterStatus === "free") {
      result = result.filter(user => user.subscriptionStatus !== "active");
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (sortField) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "email":
          aValue = a.email?.toLowerCase() || "";
          bValue = b.email?.toLowerCase() || "";
          break;
        case "subscriptionStatus":
          aValue = a.subscriptionStatus === "active" ? 1 : 0;
          bValue = b.subscriptionStatus === "active" ? 1 : 0;
          break;
        case "analysisCount":
          aValue = a.analysisCount;
          bValue = b.analysisCount;
          break;
        case "kidsCount":
          aValue = a.kidsCount;
          bValue = b.kidsCount;
          break;
        case "_creationTime":
          aValue = a._creationTime;
          bValue = b._creationTime;
          break;
      }

      if (aValue === undefined || bValue === undefined) return 0;
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, filterStatus, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (isAdmin === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-parchment-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-lg bg-parchment-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  const conversionRate = stats && stats.userCount > 0
    ? ((stats.activeSubscribers / stats.userCount) * 100).toFixed(1)
    : "0";

  const onboardingRate = stats && stats.userCount > 0
    ? ((stats.onboardedUsers / stats.userCount) * 100).toFixed(1)
    : "0";

  const engagementRate = stats && stats.userCount > 0
    ? ((stats.usersWithAnalyses / stats.userCount) * 100).toFixed(1)
    : "0";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">SafeReads platform overview</p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <TrendingUp className="h-4 w-4" />
            <span>{stats.usersLast7Days} new users (7d)</span>
            <span className="text-ink-300">|</span>
            <span>{stats.usersLast30Days} (30d)</span>
          </div>
        )}
      </div>

      {/* Primary Stats Grid */}
      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Users"
          value={stats?.userCount ?? "-"}
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5" />}
          label="Pro Subscribers"
          value={stats?.activeSubscribers ?? "-"}
          subtext={`${conversionRate}% conversion`}
          highlight
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Books Indexed"
          value={stats?.bookCount ?? "-"}
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="Analyses"
          value={stats?.analysisCount ?? "-"}
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="User Analyses"
          value={stats?.totalUserAnalyses ?? "-"}
          subtext={`${stats?.avgAnalysesPerUser?.toFixed(1) ?? "0"} avg/user`}
        />
        <StatCard
          icon={<Baby className="h-5 w-5" />}
          label="Kids Profiles"
          value={stats?.kidCount ?? "-"}
          subtext={`${stats?.avgKidsPerUser?.toFixed(1) ?? "0"} avg/user`}
        />
        <StatCard
          icon={<MessageCircle className="h-5 w-5" />}
          label="Conversations"
          value={stats?.conversationCount ?? "-"}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Onboarded"
          value={stats?.onboardedUsers ?? "-"}
          subtext={`${onboardingRate}% completion`}
        />
      </div>

      {/* Verdict Breakdown with Visual Bar */}
      {stats?.verdictCounts && (
        <div className="mt-8">
          <h2 className="font-serif text-lg font-bold text-ink-900">Verdict Distribution</h2>
          <div className="mt-3 rounded-lg border border-parchment-200 bg-white p-4">
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <VerdictStat
                label="Safe"
                count={stats.verdictCounts.safe}
                total={stats.analysisCount}
                color="bg-verdict-safe"
              />
              <VerdictStat
                label="Caution"
                count={stats.verdictCounts.caution}
                total={stats.analysisCount}
                color="bg-verdict-caution"
              />
              <VerdictStat
                label="Warning"
                count={stats.verdictCounts.warning}
                total={stats.analysisCount}
                color="bg-verdict-warning"
              />
              <VerdictStat
                label="No Verdict"
                count={stats.verdictCounts.no_verdict}
                total={stats.analysisCount}
                color="bg-parchment-400"
              />
            </div>
            {/* Visual bar */}
            {stats.analysisCount > 0 && (
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-parchment-100">
                <div
                  className="bg-verdict-safe transition-all"
                  style={{ width: `${(stats.verdictCounts.safe / stats.analysisCount) * 100}%` }}
                />
                <div
                  className="bg-verdict-caution transition-all"
                  style={{ width: `${(stats.verdictCounts.caution / stats.analysisCount) * 100}%` }}
                />
                <div
                  className="bg-verdict-warning transition-all"
                  style={{ width: `${(stats.verdictCounts.warning / stats.analysisCount) * 100}%` }}
                />
                <div
                  className="bg-parchment-400 transition-all"
                  style={{ width: `${(stats.verdictCounts.no_verdict / stats.analysisCount) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Engagement Summary */}
      <div className="mt-8">
        <h2 className="font-serif text-lg font-bold text-ink-900">Engagement</h2>
        <div className="mt-3 rounded-lg border border-parchment-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <EngagementMetric
              label="Users with Analyses"
              value={stats?.usersWithAnalyses ?? 0}
              total={stats?.userCount ?? 0}
              percentage={engagementRate}
            />
            <EngagementMetric
              label="Onboarding Completed"
              value={stats?.onboardedUsers ?? 0}
              total={stats?.userCount ?? 0}
              percentage={onboardingRate}
            />
            <EngagementMetric
              label="Pro Conversion"
              value={stats?.activeSubscribers ?? 0}
              total={stats?.userCount ?? 0}
              percentage={conversionRate}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-lg font-bold text-ink-900">
            Users ({filteredUsers.length}{users && filteredUsers.length !== users.length ? ` of ${users.length}` : ""})
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-parchment-200 bg-white py-2 pl-9 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-parchment-400 focus:outline-none focus:ring-1 focus:ring-parchment-400 sm:w-48"
              />
            </div>
            {/* Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FilterStatus)}
              className="rounded-lg border border-parchment-200 bg-white px-3 py-2 text-sm text-ink-700 focus:border-parchment-400 focus:outline-none focus:ring-1 focus:ring-parchment-400"
            >
              <option value="all">All Users</option>
              <option value="pro">Pro Only</option>
              <option value="free">Free Only</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="mt-3 hidden overflow-x-auto rounded-lg border border-parchment-200 md:block">
          <table className="min-w-full divide-y divide-parchment-200">
            <thead className="bg-parchment-50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-500 hover:text-ink-700"
                  onClick={() => handleSort("name")}
                >
                  User <SortIndicator field="name" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-500 hover:text-ink-700"
                  onClick={() => handleSort("subscriptionStatus")}
                >
                  Status <SortIndicator field="subscriptionStatus" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-500 hover:text-ink-700"
                  onClick={() => handleSort("analysisCount")}
                >
                  Analyses <SortIndicator field="analysisCount" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-500 hover:text-ink-700"
                  onClick={() => handleSort("kidsCount")}
                >
                  Kids <SortIndicator field="kidsCount" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-500 hover:text-ink-700"
                  onClick={() => handleSort("_creationTime")}
                >
                  Joined <SortIndicator field="_creationTime" sortField={sortField} sortDirection={sortDirection} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-100 bg-white">
              {filteredUsers.map(user => (
                <tr key={user._id} className="hover:bg-parchment-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-parchment-200 text-xs font-medium text-parchment-600">
                          {user.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-ink-900">{user.name || "No name"}</p>
                        <p className="text-xs text-ink-400">{user.email || "No email"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.subscriptionStatus === "active" ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Pro
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-parchment-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                          Free
                        </span>
                      )}
                      {user.onboardingComplete && (
                        <span title="Onboarding complete">
                          <CheckCircle className="h-3.5 w-3.5 text-verdict-safe" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-600">
                    {user.analysisCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-600">
                    {user.kidsCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-400">
                    {new Date(user._creationTime).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">
                    No users found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="mt-3 space-y-3 md:hidden">
          {filteredUsers.map(user => (
            <div
              key={user._id}
              className="rounded-lg border border-parchment-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-parchment-200 text-sm font-medium text-parchment-600">
                      {user.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-ink-900">{user.name || "No name"}</p>
                    <p className="text-xs text-ink-400">{user.email || "No email"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.subscriptionStatus === "active" ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Pro
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-parchment-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                      Free
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-ink-500">
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  {user.analysisCount} analyses
                </span>
                <span className="flex items-center gap-1">
                  <Baby className="h-3.5 w-3.5" />
                  {user.kidsCount} kids
                </span>
                <span className="ml-auto text-xs text-ink-400">
                  {new Date(user._creationTime).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="rounded-lg border border-parchment-200 bg-white p-8 text-center text-sm text-ink-400">
              No users found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-parchment-400 bg-parchment-100"
          : "border-parchment-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-ink-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-ink-400">{subtext}</p>}
    </div>
  );
}

function VerdictStat({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";

  return (
    <div className="flex items-center gap-3">
      <span className={`h-4 w-4 rounded ${color}`} />
      <div>
        <p className="text-sm font-medium text-ink-700">{label}</p>
        <p className="text-xs text-ink-400">
          {count} ({percentage}%)
        </p>
      </div>
    </div>
  );
}

function EngagementMetric({
  label,
  value,
  total,
  percentage,
}: {
  label: string;
  value: number;
  total: number;
  percentage: string;
}) {
  return (
    <div>
      <p className="text-sm text-ink-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-bold text-ink-900">{value}</span>
        <span className="text-sm text-ink-400">/ {total}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-parchment-100">
        <div
          className="h-full bg-parchment-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-400">{percentage}%</p>
    </div>
  );
}
