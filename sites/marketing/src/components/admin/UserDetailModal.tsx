"use client";

import type { GroupedUser, SafeTunesUser, SafeTubeUser, SafeReadsUser } from "@/types/admin";

interface RawUserData {
  safetunes: SafeTunesUser | null;
  safetube: SafeTubeUser | null;
  safereads: SafeReadsUser | null;
}

interface UserDetailModalProps {
  user: GroupedUser;
  rawData: RawUserData | null;
  onClose: () => void;
  onAction: () => void;
}

const APP_CONFIG = {
  safetunes: {
    name: "SafeTunes",
    icon: "🎵",
    gradient: "from-indigo-500 to-purple-500",
    lightBg: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  safetube: {
    name: "SafeTube",
    icon: "📺",
    gradient: "from-red-500 to-orange-500",
    lightBg: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
  },
  safereads: {
    name: "SafeReads",
    icon: "📚",
    gradient: "from-emerald-500 to-teal-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
};

const STATUS_LABELS: Record<string, string> = {
  lifetime: "Lifetime",
  active: "Active",
  trial: "Trial",
  cancelled: "Cancelled",
  expired: "Expired",
  unknown: "Unknown",
};

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTrialDaysLeft(expiresAt: number | null | undefined): string {
  if (!expiresAt) return "-";
  const now = Date.now();
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "Expires tomorrow";
  return `${daysLeft} days left`;
}

export function UserDetailModal({ user, rawData, onClose, onAction }: UserDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {user.name || "No Name"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAction}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Quick Actions
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Account Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard label="Account Type" value={user.subscriptionType.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())} />
            <InfoCard label="Plan Tier" value={user.planTier.charAt(0).toUpperCase() + user.planTier.slice(1)} />
            <InfoCard label="Total Kids" value={user.totalKids.toString()} />
            <InfoCard label="Member Since" value={formatDate(user.earliestCreatedAt)} />
          </div>

          {/* App Access Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">App Access & Activity</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SafeTunes Card */}
              <AppCard
                app="safetunes"
                hasAccess={user.apps.some(a => a.app === "safetunes")}
                appAccess={user.apps.find(a => a.app === "safetunes")}
                rawData={rawData?.safetunes}
              />

              {/* SafeTube Card */}
              <AppCard
                app="safetube"
                hasAccess={user.apps.some(a => a.app === "safetube")}
                appAccess={user.apps.find(a => a.app === "safetube")}
                rawData={rawData?.safetube}
              />

              {/* SafeReads Card */}
              <AppCard
                app="safereads"
                hasAccess={user.apps.some(a => a.app === "safereads")}
                appAccess={user.apps.find(a => a.app === "safereads")}
                rawData={rawData?.safereads}
              />
            </div>
          </div>

          {/* Detailed App Info */}
          {user.apps.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Information</h3>

              {/* SafeTunes Details */}
              {rawData?.safetunes && (
                <SafeTunesDetails user={rawData.safetunes} />
              )}

              {/* SafeTube Details */}
              {rawData?.safetube && (
                <SafeTubeDetails user={rawData.safetube} />
              )}

              {/* SafeReads Details */}
              {rawData?.safereads && (
                <SafeReadsDetails user={rawData.safereads} />
              )}
            </div>
          )}

          {/* External Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">External Links</h3>
            <div className="flex flex-wrap gap-2">
              {user.apps.some(a => a.stripeCustomerId) && (
                <a
                  href={`https://dashboard.stripe.com/customers/${user.apps.find(a => a.stripeCustomerId)?.stripeCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                  </svg>
                  View in Stripe
                  <span className="text-gray-400">↗</span>
                </a>
              )}
              <a
                href={`mailto:${user.email}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function AppCard({ app, hasAccess, appAccess, rawData }: {
  app: "safetunes" | "safetube" | "safereads";
  hasAccess: boolean;
  appAccess?: GroupedUser["apps"][0];
  rawData: SafeTunesUser | SafeTubeUser | SafeReadsUser | null | undefined;
}) {
  const config = APP_CONFIG[app];

  if (!hasAccess) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 opacity-50">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white opacity-50`}>
            {config.icon}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{config.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">No access</p>
          </div>
        </div>
      </div>
    );
  }

  const status = appAccess?.subscriptionStatus || "unknown";
  const statusLabel = STATUS_LABELS[status] || status;

  return (
    <div className={`border ${config.borderColor} ${config.lightBg} rounded-xl p-4`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white`}>
          {config.icon}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{config.name}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-300">{statusLabel}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {app === "safetunes" && rawData && "approvedSongCount" in rawData && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Kid Profiles</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.kidProfileCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Approved Songs</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.approvedSongCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Approved Albums</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.approvedAlbumCount}</span>
            </div>
          </>
        )}

        {app === "safetube" && rawData && "channelCount" in rawData && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Kid Profiles</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.kidCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Approved Channels</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.channelCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Approved Videos</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.videoCount}</span>
            </div>
          </>
        )}

        {app === "safereads" && rawData && "analysisCount" in rawData && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Kid Profiles</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.kidCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Book Analyses</span>
              <span className="font-medium text-gray-900 dark:text-white">{rawData.analysisCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Onboarding</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {rawData.onboardingComplete ? "Complete" : "Pending"}
              </span>
            </div>
          </>
        )}

        {appAccess?.trialExpiresAt && (
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="text-gray-500 dark:text-gray-400">Trial</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {getTrialDaysLeft(appAccess.trialExpiresAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SafeTunesDetails({ user }: { user: SafeTunesUser }) {
  return (
    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎵</span>
        <h4 className="font-semibold text-gray-900 dark:text-white">SafeTunes Details</h4>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Created</p>
          <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Subscription Ends</p>
          <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.subscriptionEndsAt)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Coupon Code</p>
          <p className="font-medium text-gray-900 dark:text-white">{user.couponCode || "-"}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Stripe Customer</p>
          <p className="font-medium text-gray-900 dark:text-white truncate" title={user.stripeCustomerId || undefined}>
            {user.stripeCustomerId ? user.stripeCustomerId.slice(0, 14) + "..." : "-"}
          </p>
        </div>
      </div>
      {user.lastActivity && (
        <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Activity</p>
          <p className="text-sm text-gray-900 dark:text-white">
            <span className="font-medium">{user.lastActivity.kidName}</span> played{" "}
            <span className="font-medium">{user.lastActivity.itemName}</span>{" "}
            <span className="text-gray-500 dark:text-gray-400">
              ({formatDateTime(user.lastActivity.playedAt)})
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function SafeTubeDetails({ user }: { user: SafeTubeUser }) {
  return (
    <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📺</span>
        <h4 className="font-semibold text-gray-900 dark:text-white">SafeTube Details</h4>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Created</p>
          <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Trial Ends</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {user.trialEndsAt ? getTrialDaysLeft(user.trialEndsAt) : "-"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Family Code</p>
          <p className="font-medium text-gray-900 dark:text-white font-mono">{user.familyCode || "-"}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Stripe Customer</p>
          <p className="font-medium text-gray-900 dark:text-white truncate" title={user.stripeCustomerId || undefined}>
            {user.stripeCustomerId ? user.stripeCustomerId.slice(0, 14) + "..." : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function SafeReadsDetails({ user }: { user: SafeReadsUser }) {
  return (
    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📚</span>
        <h4 className="font-semibold text-gray-900 dark:text-white">SafeReads Details</h4>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Created</p>
          <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Trial Expires</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {user.trialExpiresAt ? getTrialDaysLeft(user.trialExpiresAt) : "-"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Subscription Ends</p>
          <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.subscriptionEndsAt)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Coupon Code</p>
          <p className="font-medium text-gray-900 dark:text-white">{user.couponCode || "-"}</p>
        </div>
      </div>
    </div>
  );
}
