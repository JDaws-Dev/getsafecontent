import type { DashboardStats } from "@/types/admin";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="space-y-6">
      {/* Combined stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.combined.totalUsers}
          color="text-gray-900 dark:text-white"
        />
        <StatCard
          label="Active Subscriptions"
          value={stats.combined.activeSubscriptions}
          color="text-green-600 dark:text-green-400"
          sub={`${stats.combined.trialUsers} on trial`}
        />
        <StatCard
          label="Lifetime Users"
          value={stats.combined.lifetimeUsers}
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label="Monthly Revenue"
          value={`$${stats.combined.monthlyRevenue.toFixed(2)}`}
          color="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* Per-app breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppStatsCard
          app="SafeTunes"
          stats={stats.safetunes}
          gradient="from-indigo-500 to-purple-500"
          icon="🎵"
        />
        <AppStatsCard
          app="SafeTube"
          stats={stats.safetube}
          gradient="from-red-500 to-orange-500"
          icon="📺"
        />
        <AppStatsCard
          app="SafeReads"
          stats={stats.safereads}
          gradient="from-emerald-500 to-teal-500"
          icon="📚"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function AppStatsCard({
  app,
  stats,
  gradient,
  icon,
}: {
  app: string;
  stats: {
    totalUsers: number;
    activeSubscriptions: number;
    trialUsers: number;
    lifetimeUsers: number;
    monthlyRevenue: number;
  };
  gradient: string;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{app}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Users</p>
          <p className="font-semibold text-gray-900 dark:text-white">{stats.totalUsers}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Active</p>
          <p className="font-semibold text-green-600 dark:text-green-400">
            {stats.activeSubscriptions}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Trial</p>
          <p className="font-semibold text-blue-600 dark:text-blue-400">{stats.trialUsers}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Lifetime</p>
          <p className="font-semibold text-purple-600 dark:text-purple-400">{stats.lifetimeUsers}</p>
        </div>
        <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">Monthly Revenue</p>
          <p className="font-semibold text-blue-600 dark:text-blue-400">
            ${stats.monthlyRevenue.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
