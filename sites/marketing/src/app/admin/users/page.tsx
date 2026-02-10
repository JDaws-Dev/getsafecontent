"use client";

import { useState, useEffect, useCallback } from "react";
import { GroupedUserTable } from "@/components/admin/GroupedUserTable";
import { EmailComposer } from "@/components/admin/EmailComposer";
import type { GroupedUser, DashboardStats } from "@/types/admin";

export default function UsersPage() {
  const [groupedUsers, setGroupedUsers] = useState<GroupedUser[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [grantLifetimeUser, setGrantLifetimeUser] = useState<GroupedUser | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<GroupedUser | null>(null);
  const [emailTarget, setEmailTarget] = useState<GroupedUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setGroupedUsers(data.groupedUsers || []);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleGrantLifetime = async () => {
    if (!grantLifetimeUser) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch("/api/admin/grant-lifetime-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: grantLifetimeUser.email,
          apps: grantLifetimeUser.apps.map((a) => a.app),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to grant lifetime");
      }

      // Refresh users
      await fetchUsers();
      setGrantLifetimeUser(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to grant lifetime");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch("/api/admin/delete-user-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: deleteUserTarget.email,
          apps: deleteUserTarget.apps.map((a) => a.app),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      // Refresh users
      await fetchUsers();
      setDeleteUserTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm">
            Manage users across all Safe Family apps
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="animate-pulse text-gray-400">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm">
            Manage users across all Safe Family apps
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm">
            Manage users across all Safe Family apps
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Quick stats - based on unique users */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Unique Users</p>
          <p className="text-xl font-bold text-gray-900">
            {groupedUsers.length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">3-App Bundles</p>
          <p className="text-xl font-bold text-indigo-600">
            {groupedUsers.filter(u => u.subscriptionType === "3-app-bundle").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Lifetime</p>
          <p className="text-xl font-bold text-purple-600">
            {groupedUsers.filter(u => u.planTier === "lifetime").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Active Trial</p>
          <p className="text-xl font-bold text-blue-600">
            {groupedUsers.filter(u => u.planTier === "trial").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Expired Trials</p>
          <p className="text-xl font-bold text-red-600">
            {groupedUsers.filter(u => u.hasExpiredTrial).length}
          </p>
        </div>
      </div>

      <GroupedUserTable
        users={groupedUsers}
        onGrantLifetime={setGrantLifetimeUser}
        onDeleteUser={setDeleteUserTarget}
        onSendEmail={setEmailTarget}
      />

      {/* Grant Lifetime Modal */}
      {grantLifetimeUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Grant Lifetime Access
            </h3>
            <p className="text-gray-600 mb-4">
              Grant lifetime access to <strong>{grantLifetimeUser.email}</strong> on all their apps:
            </p>
            <div className="flex gap-2 mb-4">
              {grantLifetimeUser.apps.map((app) => (
                <span
                  key={app.app}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  {app.app.replace("safe", "Safe")}
                </span>
              ))}
            </div>
            {actionError && (
              <p className="text-red-600 text-sm mb-4">{actionError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setGrantLifetimeUser(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleGrantLifetime}
                className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? "Granting..." : "Grant Lifetime"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete User
            </h3>
            <p className="text-gray-600 mb-4">
              Delete <strong>{deleteUserTarget.email}</strong> from all apps:
            </p>
            <div className="flex gap-2 mb-4">
              {deleteUserTarget.apps.map((app) => (
                <span
                  key={app.app}
                  className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                >
                  {app.app.replace("safe", "Safe")}
                </span>
              ))}
            </div>
            <p className="text-red-600 text-sm mb-4">
              This action cannot be undone. The user will be removed from all apps.
            </p>
            {actionError && (
              <p className="text-red-600 text-sm mb-4">{actionError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteUserTarget(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Composer Modal */}
      {emailTarget && (
        <EmailComposer
          user={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={() => {
            // Optionally refresh or show success message
          }}
        />
      )}
    </div>
  );
}
