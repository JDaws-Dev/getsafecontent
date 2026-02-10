import type {
  SafeTunesUser,
  SafeTubeUser,
  SafeReadsUser,
  UnifiedUser,
  GroupedUser,
  AppAccess,
  AppStats,
  DashboardStats,
  RevenueStats,
  RevenueBreakdown,
} from "@/types/admin";

// Use environment variable, with fallback to hardcoded key for local development
const ADMIN_KEY = process.env.ADMIN_API_KEY || "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

const ENDPOINTS = {
  safetunes: {
    base: "https://formal-chihuahua-623.convex.site",
    adminDashboard: "/adminDashboard",
    grantLifetime: "/grantLifetime",
    deleteUser: "/deleteUser",
  },
  safetube: {
    base: "https://rightful-rabbit-333.convex.site",
    adminDashboard: "/adminDashboard",
    setSubscriptionStatus: "/setSubscriptionStatus",
    deleteUser: "/deleteUser",
  },
  safereads: {
    base: "https://exuberant-puffin-838.convex.site",
    adminDashboard: "/adminDashboard",
    grantLifetime: "/grantLifetime",
    deleteUser: "/deleteUser",
  },
};

export async function fetchSafeTunesUsers(): Promise<SafeTunesUser[]> {
  const url = `${ENDPOINTS.safetunes.base}${ENDPOINTS.safetunes.adminDashboard}?key=${encodeURIComponent(ADMIN_KEY)}&format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SafeTunes API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchSafeTubeUsers(): Promise<SafeTubeUser[]> {
  // SafeTube may not have JSON format yet, try and handle gracefully
  const url = `${ENDPOINTS.safetube.base}${ENDPOINTS.safetube.adminDashboard}?key=${encodeURIComponent(ADMIN_KEY)}&format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SafeTube API error: ${res.status}`);
  }
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("text/html")) {
    // SafeTube doesn't support JSON format yet
    console.warn("SafeTube adminDashboard doesn't support JSON format yet");
    return [];
  }
  return res.json();
}

export async function fetchSafeReadsUsers(): Promise<SafeReadsUser[]> {
  const url = `${ENDPOINTS.safereads.base}${ENDPOINTS.safereads.adminDashboard}?key=${encodeURIComponent(ADMIN_KEY)}&format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`SafeReads API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchAllUsers(): Promise<{
  safetunes: SafeTunesUser[];
  safetube: SafeTubeUser[];
  safereads: SafeReadsUser[];
}> {
  const [safetunes, safetube, safereads] = await Promise.all([
    fetchSafeTunesUsers().catch((e) => {
      console.error("Failed to fetch SafeTunes users:", e);
      return [] as SafeTunesUser[];
    }),
    fetchSafeTubeUsers().catch((e) => {
      console.error("Failed to fetch SafeTube users:", e);
      return [] as SafeTubeUser[];
    }),
    fetchSafeReadsUsers().catch((e) => {
      console.error("Failed to fetch SafeReads users:", e);
      return [] as SafeReadsUser[];
    }),
  ]);

  return { safetunes, safetube, safereads };
}

export function unifyUsers(data: {
  safetunes: SafeTunesUser[];
  safetube: SafeTubeUser[];
  safereads: SafeReadsUser[];
}): UnifiedUser[] {
  const users: UnifiedUser[] = [];

  for (const user of data.safetunes) {
    users.push({
      email: user.email,
      name: user.name,
      app: "safetunes",
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      stripeCustomerId: user.stripeCustomerId,
      kidCount: user.kidProfileCount,
      albumCount: user.approvedAlbumCount,
      songCount: user.approvedSongCount,
      couponCode: user.couponCode,
    });
  }

  for (const user of data.safetube) {
    users.push({
      email: user.email,
      name: user.name,
      app: "safetube",
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      stripeCustomerId: user.stripeCustomerId || null,
      kidCount: user.kidCount,
      channelCount: user.channelCount,
      videoCount: user.videoCount,
    });
  }

  for (const user of data.safereads) {
    users.push({
      email: user.email,
      name: user.name,
      app: "safereads",
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      stripeCustomerId: user.stripeCustomerId,
      kidCount: user.kidCount,
      analysisCount: user.analysisCount,
      couponCode: user.couponCode,
    });
  }

  // Sort by createdAt descending (newest first)
  users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return users;
}

// Group users by email - one row per person with all their apps
export function groupUsers(data: {
  safetunes: SafeTunesUser[];
  safetube: SafeTubeUser[];
  safereads: SafeReadsUser[];
}): GroupedUser[] {
  const byEmail = new Map<string, { name: string | null; apps: AppAccess[] }>();

  // Process SafeTunes users
  for (const user of data.safetunes) {
    const email = user.email.toLowerCase();
    const existing = byEmail.get(email) || { name: user.name, apps: [] };
    existing.apps.push({
      app: "safetunes",
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      stripeCustomerId: user.stripeCustomerId,
      subscriptionEndsAt: user.subscriptionEndsAt,
      kidCount: user.kidProfileCount,
      albumCount: user.approvedAlbumCount,
      songCount: user.approvedSongCount,
      couponCode: user.couponCode,
    });
    if (!existing.name && user.name) existing.name = user.name;
    byEmail.set(email, existing);
  }

  // Process SafeTube users
  for (const user of data.safetube) {
    const email = user.email.toLowerCase();
    const existing = byEmail.get(email) || { name: user.name, apps: [] };
    existing.apps.push({
      app: "safetube",
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      stripeCustomerId: user.stripeCustomerId || null,
      trialExpiresAt: user.trialEndsAt,
      kidCount: user.kidCount,
      channelCount: user.channelCount,
      videoCount: user.videoCount,
    });
    if (!existing.name && user.name) existing.name = user.name;
    byEmail.set(email, existing);
  }

  // Process SafeReads users
  for (const user of data.safereads) {
    const email = user.email.toLowerCase();
    const existing = byEmail.get(email) || { name: user.name, apps: [] };
    existing.apps.push({
      app: "safereads",
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      stripeCustomerId: user.stripeCustomerId,
      trialExpiresAt: user.trialExpiresAt,
      subscriptionEndsAt: user.subscriptionEndsAt,
      kidCount: user.kidCount,
      analysisCount: user.analysisCount,
      couponCode: user.couponCode,
    });
    if (!existing.name && user.name) existing.name = user.name;
    byEmail.set(email, existing);
  }

  // Convert to GroupedUser array
  const now = Date.now();
  const grouped: GroupedUser[] = [];

  for (const [email, data] of byEmail) {
    const appCount = data.apps.length;

    // Determine subscription type based on app count
    const subscriptionType: GroupedUser["subscriptionType"] =
      appCount >= 3 ? "3-app-bundle" :
      appCount === 2 ? "2-app-bundle" : "single-app";

    // Determine plan tier (highest priority status across apps)
    const hasLifetime = data.apps.some(a => a.subscriptionStatus === "lifetime");
    const hasActive = data.apps.some(a => a.subscriptionStatus === "active");
    const hasTrial = data.apps.some(a => a.subscriptionStatus === "trial");

    let planTier: GroupedUser["planTier"];
    if (hasLifetime) {
      planTier = "lifetime";
    } else if (hasActive) {
      // TODO: Could check Stripe for yearly vs monthly
      planTier = "monthly";
    } else if (hasTrial) {
      planTier = "trial";
    } else {
      planTier = "expired";
    }

    // Get earliest created date
    const createdDates = data.apps
      .map(a => a.createdAt)
      .filter((d): d is number => d !== null);
    const earliestCreatedAt = createdDates.length > 0 ? Math.min(...createdDates) : null;

    // Get latest trial expiry
    const trialDates = data.apps
      .map(a => a.trialExpiresAt)
      .filter((d): d is number => d !== null && d !== undefined);
    const latestTrialExpiry = trialDates.length > 0 ? Math.max(...trialDates) : null;

    // Check if trial has expired
    const hasExpiredTrial = latestTrialExpiry !== null && latestTrialExpiry < now && planTier === "expired";

    // Count total kids
    const totalKids = data.apps.reduce((sum, a) => sum + (a.kidCount || 0), 0);

    // Determine if user is active (has any non-expired subscription)
    const isActive = hasLifetime || hasActive || (hasTrial && latestTrialExpiry !== null && latestTrialExpiry > now);

    grouped.push({
      email,
      name: data.name,
      apps: data.apps,
      subscriptionType,
      planTier,
      earliestCreatedAt,
      latestTrialExpiry,
      hasExpiredTrial,
      totalKids,
      isActive,
    });
  }

  // Sort by earliest created date descending (newest first)
  grouped.sort((a, b) => (b.earliestCreatedAt || 0) - (a.earliestCreatedAt || 0));

  return grouped;
}

function calculateAppStats(
  users: { subscriptionStatus: string }[],
  pricePerMonth: number
): AppStats {
  const totalUsers = users.length;
  const activeSubscriptions = users.filter(
    (u) => u.subscriptionStatus === "active"
  ).length;
  const trialUsers = users.filter(
    (u) => u.subscriptionStatus === "trial" || u.subscriptionStatus === "unknown"
  ).length;
  const lifetimeUsers = users.filter(
    (u) => u.subscriptionStatus === "lifetime"
  ).length;
  const monthlyRevenue = activeSubscriptions * pricePerMonth;

  return {
    totalUsers,
    activeSubscriptions,
    trialUsers,
    lifetimeUsers,
    monthlyRevenue,
  };
}

export function calculateStats(data: {
  safetunes: SafeTunesUser[];
  safetube: SafeTubeUser[];
  safereads: SafeReadsUser[];
}): DashboardStats {
  const safetunes = calculateAppStats(data.safetunes, 4.99);
  const safetube = calculateAppStats(data.safetube, 4.99);
  const safereads = calculateAppStats(data.safereads, 2.99);

  const combined: AppStats = {
    totalUsers:
      safetunes.totalUsers + safetube.totalUsers + safereads.totalUsers,
    activeSubscriptions:
      safetunes.activeSubscriptions +
      safetube.activeSubscriptions +
      safereads.activeSubscriptions,
    trialUsers:
      safetunes.trialUsers + safetube.trialUsers + safereads.trialUsers,
    lifetimeUsers:
      safetunes.lifetimeUsers +
      safetube.lifetimeUsers +
      safereads.lifetimeUsers,
    monthlyRevenue:
      safetunes.monthlyRevenue +
      safetube.monthlyRevenue +
      safereads.monthlyRevenue,
  };

  return { safetunes, safetube, safereads, combined };
}

export async function grantLifetime(
  app: "safetunes" | "safetube" | "safereads",
  email: string
): Promise<{ success: boolean; message: string }> {
  let url: string;

  if (app === "safetunes") {
    url = `${ENDPOINTS.safetunes.base}${ENDPOINTS.safetunes.grantLifetime}?email=${encodeURIComponent(email)}&key=${encodeURIComponent(ADMIN_KEY)}`;
  } else if (app === "safetube") {
    url = `${ENDPOINTS.safetube.base}${ENDPOINTS.safetube.setSubscriptionStatus}?email=${encodeURIComponent(email)}&status=lifetime&key=${encodeURIComponent(ADMIN_KEY)}`;
  } else {
    url = `${ENDPOINTS.safereads.base}${ENDPOINTS.safereads.grantLifetime}?email=${encodeURIComponent(email)}&key=${encodeURIComponent(ADMIN_KEY)}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    return { success: false, message: data.error || "Failed to grant lifetime" };
  }

  return { success: true, message: `Granted lifetime to ${email} on ${app}` };
}

export async function deleteUser(
  app: "safetunes" | "safetube" | "safereads",
  email: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = ENDPOINTS[app].base;
  const url = `${baseUrl}/deleteUser?email=${encodeURIComponent(email)}&key=${encodeURIComponent(ADMIN_KEY)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    return { success: false, message: data.error || "Failed to delete user" };
  }

  return { success: true, message: `Deleted ${email} from ${app}` };
}

// Grant lifetime to all apps that the user has
export async function grantLifetimeAll(
  email: string,
  apps: ("safetunes" | "safetube" | "safereads")[]
): Promise<{ success: boolean; results: { app: string; success: boolean; message: string }[] }> {
  const results = await Promise.all(
    apps.map(async (app) => {
      const result = await grantLifetime(app, email);
      return { app, ...result };
    })
  );

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

// Delete user from all apps
export async function deleteUserAll(
  email: string,
  apps: ("safetunes" | "safetube" | "safereads")[]
): Promise<{ success: boolean; results: { app: string; success: boolean; message: string }[] }> {
  const results = await Promise.all(
    apps.map(async (app) => {
      const result = await deleteUser(app, email);
      return { app, ...result };
    })
  );

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

// Pricing constants
const PRICING = {
  bundleMonthly: 9.99,
  bundleYearly: 99.0,
  twoAppBundle: 7.99,
  singleApp: 4.99, // SafeTunes, SafeTube, SafeReads all at $4.99/mo now
};

// Calculate revenue stats based on grouped users
export function calculateRevenueStats(groupedUsers: GroupedUser[]): RevenueStats {
  const breakdown: RevenueBreakdown = {
    bundleMonthly: { count: 0, mrr: 0 },
    bundleYearly: { count: 0, mrr: 0 },
    twoAppBundle: { count: 0, mrr: 0 },
    singleApp: {
      safetunes: { count: 0, mrr: 0 },
      safetube: { count: 0, mrr: 0 },
      safereads: { count: 0, mrr: 0 },
    },
    lifetime: 0,
    trial: 0,
    expired: 0,
  };

  let mrr = 0;
  let totalPaying = 0;
  let totalExpiredTrials = 0;
  let totalConvertedFromTrial = 0;

  for (const user of groupedUsers) {
    // Track expired users
    if (user.hasExpiredTrial || user.planTier === "expired") {
      breakdown.expired++;
      totalExpiredTrials++;
      continue;
    }

    // Lifetime users don't contribute to recurring revenue
    if (user.planTier === "lifetime") {
      breakdown.lifetime++;
      // Count as converted if they were previously trial
      totalConvertedFromTrial++;
      continue;
    }

    // Trial users - potential future revenue
    if (user.planTier === "trial") {
      breakdown.trial++;
      continue;
    }

    // Active paying subscribers
    totalPaying++;
    totalConvertedFromTrial++; // Active payers came from trial

    if (user.subscriptionType === "3-app-bundle") {
      if (user.planTier === "yearly") {
        breakdown.bundleYearly.count++;
        const monthlyEquivalent = PRICING.bundleYearly / 12;
        breakdown.bundleYearly.mrr += monthlyEquivalent;
        mrr += monthlyEquivalent;
      } else {
        breakdown.bundleMonthly.count++;
        breakdown.bundleMonthly.mrr += PRICING.bundleMonthly;
        mrr += PRICING.bundleMonthly;
      }
    } else if (user.subscriptionType === "2-app-bundle") {
      breakdown.twoAppBundle.count++;
      breakdown.twoAppBundle.mrr += PRICING.twoAppBundle;
      mrr += PRICING.twoAppBundle;
    } else {
      // Single app subscription - identify which app
      const activeApp = user.apps.find(a => a.subscriptionStatus === "active");
      if (activeApp) {
        breakdown.singleApp[activeApp.app].count++;
        breakdown.singleApp[activeApp.app].mrr += PRICING.singleApp;
        mrr += PRICING.singleApp;
      }
    }
  }

  // Calculate trial conversion rate
  // Total who ever had trial = expired + converted (paying + lifetime)
  const totalEverTrialed = totalExpiredTrials + totalConvertedFromTrial;
  const trialConversionRate = totalEverTrialed > 0
    ? (totalConvertedFromTrial / totalEverTrialed) * 100
    : 0;

  return {
    mrr,
    arr: mrr * 12,
    breakdown,
    totalPaying,
    totalFree: breakdown.lifetime + breakdown.trial + breakdown.expired,
    trialConversionRate,
  };
}
