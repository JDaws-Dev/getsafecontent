import type {
  SafeTunesUser,
  SafeTubeUser,
  SafeReadsUser,
  UnifiedUser,
  AppStats,
  DashboardStats,
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
