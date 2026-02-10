"use client";

import { useState, useEffect, useCallback } from "react";
import { UserTable } from "@/components/admin/UserTable";
import {
  GrantLifetimeModal,
  DeleteUserModal,
} from "@/components/admin/ActionModals";
import type { UnifiedUser, DashboardStats } from "@/types/admin";

export default function UsersPage() {
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [grantLifetimeUser, setGrantLifetimeUser] = useState<UnifiedUser | null>(
    null
  );
  const [deleteUser, setDeleteUser] = useState<UnifiedUser | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data.users);
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

    const res = await fetch("/api/admin/grant-lifetime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: grantLifetimeUser.app,
        email: grantLifetimeUser.email,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to grant lifetime");
    }

    // Refresh users
    await fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: deleteUser.app,
        email: deleteUser.email,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete user");
    }

    // Refresh users
    await fetchUsers();
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

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.combined.totalUsers}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-xl font-bold text-green-600">
              {stats.combined.activeSubscriptions}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Trial</p>
            <p className="text-xl font-bold text-blue-600">
              {stats.combined.trialUsers}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Lifetime</p>
            <p className="text-xl font-bold text-purple-600">
              {stats.combined.lifetimeUsers}
            </p>
          </div>
        </div>
      )}

      <UserTable
        users={users}
        onGrantLifetime={setGrantLifetimeUser}
        onDeleteUser={setDeleteUser}
      />

      {/* Modals */}
      {grantLifetimeUser && (
        <GrantLifetimeModal
          user={grantLifetimeUser}
          onClose={() => setGrantLifetimeUser(null)}
          onConfirm={handleGrantLifetime}
        />
      )}

      {deleteUser && (
        <DeleteUserModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
}
