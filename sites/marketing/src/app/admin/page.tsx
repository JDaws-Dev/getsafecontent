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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Overview of all Safe Family apps
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Unified Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            View All Users
          </Link>
        </div>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                🎯
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Unified Dashboard</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Complete view of all users across all apps
                </p>
              </div>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                👥
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View, grant lifetime, or delete users
                </p>
              </div>
            </Link>

            <Link
              href="/admin/provision-user"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                🎁
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Provision User</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manually set subscription status
                </p>
              </div>
            </Link>

            <Link
              href="/admin/failed-provisions"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                🔧
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Fix Failed Provisions</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Retry provisioning for paid users
                </p>
              </div>
            </Link>

            <Link
              href="/admin/webhook-logs"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                🔔
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Webhook Logs</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Monitor Stripe webhook processing
                </p>
              </div>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                📋
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Audit Logs</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View admin action history
                </p>
              </div>
            </Link>

            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                💳
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Stripe Dashboard</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View payments and subscriptions
                </p>
              </div>
              <span className="ml-auto text-gray-400">↗</span>
            </a>

            <a
              href="https://vercel.com/jeremiahdaws"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                ▲
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Vercel Dashboard</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deploy and monitor apps</p>
              </div>
              <span className="ml-auto text-gray-400">↗</span>
            </a>

            <a
              href="https://dashboard.convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                🔷
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Convex Dashboard</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage backend and data</p>
              </div>
              <span className="ml-auto text-gray-400">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
