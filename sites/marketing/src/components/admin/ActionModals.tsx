"use client";

import { useState } from "react";
import type { UnifiedUser } from "@/types/admin";

interface GrantLifetimeModalProps {
  user: UnifiedUser;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function GrantLifetimeModal({
  user,
  onClose,
  onConfirm,
}: GrantLifetimeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grant lifetime");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-xl">👑</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Grant Lifetime Access
          </h2>
        </div>

        <p className="text-gray-600 mb-4">
          Are you sure you want to grant lifetime access to{" "}
          <strong>{user.email}</strong> on{" "}
          <strong className="capitalize">
            {user.app.replace("safe", "Safe")}
          </strong>
          ?
        </p>

        <p className="text-sm text-gray-500 mb-4">
          This will give them permanent access without any subscription charges.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Granting..." : "Grant Lifetime"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteUserModalProps {
  user: UnifiedUser;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteUserModal({
  user,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === user.email;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Delete User</h2>
        </div>

        <p className="text-gray-600 mb-4">
          Are you sure you want to delete <strong>{user.email}</strong> from{" "}
          <strong className="capitalize">
            {user.app.replace("safe", "Safe")}
          </strong>
          ?
        </p>

        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          <strong>Warning:</strong> This action cannot be undone. All of the
          user&apos;s data will be permanently deleted, including:
          <ul className="list-disc list-inside mt-2">
            <li>Account and profile information</li>
            <li>Kid profiles</li>
            {user.app === "safetunes" && (
              <>
                <li>Approved songs and albums</li>
                <li>Playlists</li>
              </>
            )}
            {user.app === "safetube" && (
              <>
                <li>Approved channels and videos</li>
                <li>Watch history</li>
              </>
            )}
            {user.app === "safereads" && (
              <>
                <li>Book analyses</li>
                <li>Reading lists</li>
              </>
            )}
          </ul>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type <strong>{user.email}</strong> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder={user.email}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !canDelete}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
}
