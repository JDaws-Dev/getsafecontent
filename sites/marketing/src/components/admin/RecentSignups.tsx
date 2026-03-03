import type { UnifiedUser } from "@/types/admin";

interface RecentSignupsProps {
  users: UnifiedUser[];
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
  active: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  trial: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  lifetime: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  cancelled: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  canceled: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  expired: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  past_due: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  unknown: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
};

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

export function RecentSignups({ users }: RecentSignupsProps) {
  // Take the 10 most recent users (already sorted by createdAt desc)
  const recentUsers = users.slice(0, 10);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">Recent Signups</h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {recentUsers.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
            No users found
          </div>
        ) : (
          recentUsers.map((user) => (
            <div
              key={`${user.app}-${user.email}`}
              className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-lg ${appColors[user.app]} flex items-center justify-center text-white text-sm flex-shrink-0`}
              >
                {appIcons[user.app]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.subscriptionStatus] || statusColors.unknown}`}
                >
                  {user.subscriptionStatus}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
