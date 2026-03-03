"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { UnifiedDashboard } from "@/components/admin/UnifiedDashboard";
import type { GroupedUser, DashboardStats, SafeTunesUser, SafeTubeUser, SafeReadsUser } from "@/types/admin";

interface RawData {
  safetunes: SafeTunesUser[];
  safetube: SafeTubeUser[];
  safereads: SafeReadsUser[];
}

export default function UnifiedDashboardPage() {
  const [groupedUsers, setGroupedUsers] = useState<GroupedUser[]>([]);
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setGroupedUsers(data.groupedUsers || []);
      setRawData(data.raw || null);
      setStats(data.stats);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate power users - those with most activity
  const powerUsers = useMemo(() => {
    if (!rawData) return [];

    // Create a map of email to activity score
    const activityScores = new Map<string, number>();

    for (const user of rawData.safetunes) {
      const email = user.email.toLowerCase();
      const score = (activityScores.get(email) || 0) +
        user.kidProfileCount * 10 +
        user.approvedSongCount +
        user.approvedAlbumCount * 5;
      activityScores.set(email, score);
    }

    for (const user of rawData.safetube) {
      const email = user.email.toLowerCase();
      const score = (activityScores.get(email) || 0) +
        user.kidCount * 10 +
        user.channelCount * 5 +
        user.videoCount;
      activityScores.set(email, score);
    }

    for (const user of rawData.safereads) {
      const email = user.email.toLowerCase();
      const score = (activityScores.get(email) || 0) +
        user.kidCount * 10 +
        user.analysisCount * 5;
      activityScores.set(email, score);
    }

    return groupedUsers
      .map(user => ({
        ...user,
        activityScore: activityScores.get(user.email.toLowerCase()) || 0
      }))
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10);
  }, [groupedUsers, rawData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unified Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Complete view of all Safe Family users
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unified Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Complete view of all Safe Family users
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <UnifiedDashboard
      users={groupedUsers}
      rawData={rawData}
      stats={stats}
      powerUsers={powerUsers}
      lastRefresh={lastRefresh}
      onRefresh={fetchData}
    />
  );
}
