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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Recent Signups</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {recentUsers.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">
            No users found
          </div>
        ) : (
          recentUsers.map((user) => (
            <div
              key={`${user.app}-${user.email}`}
              className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50"
            >
              <div
                className={`w-8 h-8 rounded-lg ${appColors[user.app]} flex items-center justify-center text-white text-sm flex-shrink-0`}
              >
                {appIcons[user.app]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.subscriptionStatus] || statusColors.unknown}`}
                >
                  {user.subscriptionStatus}
                </span>
                <span className="text-xs text-gray-400">
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
