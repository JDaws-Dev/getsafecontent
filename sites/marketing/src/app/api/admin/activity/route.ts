import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { fetchAllUsers, groupUsers } from "@/lib/admin-api";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawData = await fetchAllUsers();
    const groupedUsers = groupUsers(rawData);
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Recent signups (last 7 and 30 days)
    const recentSignups7d = groupedUsers.filter(
      (u) => u.earliestCreatedAt && now - u.earliestCreatedAt < 7 * DAY
    );
    const recentSignups30d = groupedUsers.filter(
      (u) => u.earliestCreatedAt && now - u.earliestCreatedAt < 30 * DAY
    );

    // Trials expiring in next 7 days
    const expiringTrials = groupedUsers.filter(
      (u) =>
        u.planTier === "trial" &&
        u.latestTrialExpiry &&
        u.latestTrialExpiry > now &&
        u.latestTrialExpiry < now + 7 * DAY
    );

    // Recently expired trials (last 30 days)
    const recentlyExpired = groupedUsers
      .filter(
        (u) =>
          u.hasExpiredTrial &&
          u.latestTrialExpiry &&
          now - u.latestTrialExpiry < 30 * DAY
      )
      .sort((a, b) => (b.latestTrialExpiry || 0) - (a.latestTrialExpiry || 0));

    // Active users (lifetime or active subscription)
    const activeUsers = groupedUsers.filter((u) => u.isActive);

    // Users needing attention (expired trial users who had significant activity)
    const needsAttention = groupedUsers.filter(
      (u) => u.hasExpiredTrial && u.totalKids > 0
    );

    return NextResponse.json({
      recentSignups7d,
      recentSignups30d,
      expiringTrials,
      recentlyExpired,
      activeUsers,
      needsAttention,
      totalUsers: groupedUsers.length,
    });
  } catch (error) {
    console.error("Error computing activity metrics:", error);
    return NextResponse.json(
      { error: "Failed to compute activity metrics" },
      { status: 500 }
    );
  }
}
