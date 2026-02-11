import { fetchAllUsers, unifyUsers, calculateStats, groupUsers, calculateRevenueStats } from "@/lib/admin-api";
import { StatsCards } from "@/components/admin/StatsCards";
import { RecentSignups } from "@/components/admin/RecentSignups";
import { RevenueCard } from "@/components/admin/RevenueCard";
import { NewsletterCard } from "@/components/admin/NewsletterCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const rawData = await fetchAllUsers();
  const users = unifyUsers(rawData);
  const stats = calculateStats(rawData);
  const groupedUsers = groupUsers(rawData);
  const revenueStats = calculateRevenueStats(groupedUsers);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Overview of all Safe Family apps
          </p>
        </div>
        <Link
          href="/admin/users"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          View All Users
        </Link>
      </div>

      <StatsCards stats={stats} />

      {/* Revenue Dashboard */}
      <RevenueCard stats={revenueStats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSignups users={users} />
        <NewsletterCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                👥
              </span>
              <div>
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">
                  View, grant lifetime, or delete users
                </p>
              </div>
            </Link>

            <Link
              href="/admin/failed-provisions"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                🔧
              </span>
              <div>
                <p className="font-medium text-gray-900">Fix Failed Provisions</p>
                <p className="text-sm text-gray-500">
                  Retry provisioning for paid users
                </p>
              </div>
            </Link>

            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                💳
              </span>
              <div>
                <p className="font-medium text-gray-900">Stripe Dashboard</p>
                <p className="text-sm text-gray-500">
                  View payments and subscriptions
                </p>
              </div>
              <span className="ml-auto text-gray-400">↗</span>
            </a>

            <a
              href="https://vercel.com/jeremiahdaws"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                ▲
              </span>
              <div>
                <p className="font-medium text-gray-900">Vercel Dashboard</p>
                <p className="text-sm text-gray-500">Deploy and monitor apps</p>
              </div>
              <span className="ml-auto text-gray-400">↗</span>
            </a>

            <a
              href="https://dashboard.convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                🔷
              </span>
              <div>
                <p className="font-medium text-gray-900">Convex Dashboard</p>
                <p className="text-sm text-gray-500">Manage backend and data</p>
              </div>
              <span className="ml-auto text-gray-400">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
