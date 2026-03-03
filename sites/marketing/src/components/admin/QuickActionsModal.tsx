"use client";

import { useState } from "react";
import type { GroupedUser } from "@/types/admin";

interface QuickActionsModalProps {
  user: GroupedUser;
  onClose: () => void;
  onComplete: () => void;
}

type ActionType = "grant-lifetime" | "send-password-reset" | "delete-user" | null;

const APP_CONFIG = {
  safetunes: {
    name: "SafeTunes",
    icon: "🎵",
    color: "bg-indigo-500",
  },
  safetube: {
    name: "SafeTube",
    icon: "📺",
    color: "bg-red-500",
  },
  safereads: {
    name: "SafeReads",
    icon: "📚",
    color: "bg-emerald-500",
  },
};

export function QuickActionsModal({ user, onClose, onComplete }: QuickActionsModalProps) {
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // For grant lifetime - which apps to grant
  const [selectedApps, setSelectedApps] = useState<Set<string>>(
    new Set(user.apps.map(a => a.app))
  );

  // For delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleGrantLifetime = async () => {
    if (selectedApps.size === 0) {
      setError("Please select at least one app");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/grant-lifetime-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          apps: Array.from(selectedApps),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to grant lifetime");
      }

      setSuccess(`Lifetime access granted to ${user.email} for ${selectedApps.size} app(s)`);
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grant lifetime");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          template: "password-reset",
          data: { name: user.name || user.email.split("@")[0] },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send password reset email");
      }

      setSuccess(`Password reset email sent to ${user.email}`);
      setTimeout(() => {
        setActiveAction(null);
        setSuccess(null);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmation !== user.email) {
      setError("Please type the email address to confirm deletion");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/delete-user-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          apps: user.apps.map(a => a.app),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccess(`User ${user.email} has been deleted from all apps`);
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleApp = (app: string) => {
    const newSet = new Set(selectedApps);
    if (newSet.has(app)) {
      newSet.delete(app);
    } else {
      newSet.add(app);
    }
    setSelectedApps(newSet);
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Action Selection */}
          {!activeAction && !success && (
            <div className="space-y-3">
              {/* Grant Lifetime Button */}
              {user.planTier !== "lifetime" && (
                <button
                  onClick={() => setActiveAction("grant-lifetime")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="text-xl">♾</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Grant Lifetime Access</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Give permanent access to selected apps</p>
                  </div>
                </button>
              )}

              {/* Send Password Reset Button */}
              <button
                onClick={() => setActiveAction("send-password-reset")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-xl">🔑</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Send Password Reset</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Send password reset email to user</p>
                </div>
              </button>

              {/* Delete User Button */}
              <button
                onClick={() => setActiveAction("delete-user")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="text-xl">🗑</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Delete User</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remove user from all apps permanently</p>
                </div>
              </button>

              {/* Email User Button */}
              <a
                href={`mailto:${user.email}`}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xl">✉️</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Send Email</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Open email client to contact user</p>
                </div>
              </a>
            </div>
          )}

          {/* Grant Lifetime Form */}
          {activeAction === "grant-lifetime" && !success && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Select which apps to grant lifetime access:
              </p>

              <div className="space-y-2">
                {(["safetunes", "safetube", "safereads"] as const).map(app => {
                  const config = APP_CONFIG[app];
                  const isSelected = selectedApps.has(app);

                  return (
                    <button
                      key={app}
                      onClick={() => toggleApp(app)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center text-white`}>
                        {config.icon}
                      </div>
                      <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">
                        {config.name}
                      </span>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isSelected
                          ? "bg-purple-600 border-purple-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setActiveAction(null); setError(null); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantLifetime}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  disabled={isLoading || selectedApps.size === 0}
                >
                  {isLoading ? "Granting..." : "Grant Lifetime"}
                </button>
              </div>
            </div>
          )}

          {/* Password Reset Confirmation */}
          {activeAction === "send-password-reset" && !success && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Send a password reset email to <strong>{user.email}</strong>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setActiveAction(null); setError(null); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendPasswordReset}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Email"}
                </button>
              </div>
            </div>
          )}

          {/* Delete User Confirmation */}
          {activeAction === "delete-user" && !success && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                  Warning: This action cannot be undone!
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  This will permanently delete <strong>{user.email}</strong> from:
                </p>
                <div className="flex gap-2 mt-2">
                  {user.apps.map(app => (
                    <span
                      key={app.app}
                      className={`px-2 py-1 ${APP_CONFIG[app.app].color} text-white text-xs font-medium rounded`}
                    >
                      {APP_CONFIG[app.app].name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type the email address to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={user.email}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setActiveAction(null); setError(null); setDeleteConfirmation(""); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isLoading || deleteConfirmation !== user.email}
                >
                  {isLoading ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
