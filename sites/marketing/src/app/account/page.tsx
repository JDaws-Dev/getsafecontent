"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import {
  Shield,
  User,
  Mail,
  Calendar,
  Edit2,
  Check,
  X,
  ExternalLink,
  Music,
  Play,
  BookOpen,
  Crown,
  CreditCard,
  AlertTriangle,
  Trash2,
  LogOut,
  Loader2,
  Plus,
  Minus,
  MessageCircle,
  FileText,
} from "lucide-react";

type AppId = "safetunes" | "safetube" | "safereads";

const APP_INFO: Record<AppId, { name: string; domain: string; icon: React.ReactNode; gradient: string }> = {
  safetunes: {
    name: "SafeTunes",
    domain: "getsafetunes.com",
    icon: <Music className="w-5 h-5 text-white" />,
    gradient: "from-indigo-500 to-purple-500",
  },
  safetube: {
    name: "SafeTube",
    domain: "getsafetube.com",
    icon: <Play className="w-5 h-5 text-white" />,
    gradient: "from-red-500 to-orange-500",
  },
  safereads: {
    name: "SafeReads",
    domain: "getsafereads.com",
    icon: <BookOpen className="w-5 h-5 text-white" />,
    gradient: "from-emerald-500 to-teal-500",
  },
};

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  // Get current authenticated user
  const currentUser = useQuery(api.accounts.getCurrentUser);

  // Mutations
  const updateAccount = useMutation(api.accounts.updateAccount);
  const deleteAccount = useMutation(api.accounts.deleteAccount);
  const removeAppEntitlement = useMutation(api.accounts.removeAppEntitlement);

  // UI State
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [portalLoading, setPortalLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Initialize name value when user data loads
  useEffect(() => {
    if (currentUser?.name) {
      setNameValue(currentUser.name);
    }
  }, [currentUser?.name]);

  // Handle name save
  const handleSaveName = async () => {
    if (!currentUser?.id || !nameValue.trim()) return;

    setNameSaving(true);
    try {
      await updateAccount({
        userId: currentUser.id,
        name: nameValue.trim(),
      });
      setEditingName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      console.error("[AccountPage] Failed to update name:", err);
    } finally {
      setNameSaving(false);
    }
  };

  // Handle Stripe portal
  // Note: The portal endpoint derives customerId from the authenticated session,
  // not from the request body, to prevent unauthorized access to other users' portals
  const handleManageSubscription = async () => {
    if (!currentUser?.stripeCustomerId) return;

    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("[Account] Portal error:", data.error);
        setPortalLoading(false);
      }
    } catch {
      setPortalLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !currentUser?.id) {
      setDeleteError("Please type DELETE to confirm");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      await deleteAccount({
        userId: currentUser.id,
        reason: "User requested deletion from account page",
      });
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("[AccountPage] Failed to delete account:", error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please try again."
      );
      setDeleteLoading(false);
    }
  };

  // Handle app removal
  const handleRemoveApp = async (app: AppId) => {
    if (!currentUser?.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${APP_INFO[app].name} from your subscription? You can re-add it later from Settings.`
    );

    if (!confirmed) return;

    try {
      await removeAppEntitlement({
        userId: currentUser.id,
        app,
      });
    } catch (error) {
      console.error("[AccountPage] Failed to remove app:", error);
    }
  };

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-navy/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Waiting for user data
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const memberSinceDate = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const subscriptionEndsDate = currentUser.subscriptionEndsAt
    ? new Date(currentUser.subscriptionEndsAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const trialExpiresDate = currentUser.trialExpiresAt
    ? new Date(currentUser.trialExpiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const entitledApps = (currentUser.entitledApps ?? []) as AppId[];
  const isLifetime = currentUser.subscriptionStatus === "lifetime";
  const isActive = currentUser.subscriptionStatus === "active";
  const isTrial = currentUser.subscriptionStatus === "trial";
  const isCanceled = currentUser.subscriptionStatus === "canceled";
  const isExpired = currentUser.subscriptionStatus === "expired";

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-navy">Safe Family</span>
        </Link>

        <button
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          className="text-sm text-navy/60 hover:text-navy flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Account Settings</h1>

          {/* Account Information */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-navy">Account Information</h2>
              {!editingName && (
                <button
                  onClick={() => {
                    setEditingName(true);
                    setNameValue(currentUser.name || "");
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>

            {nameSuccess && (
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Name updated successfully
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <Mail className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </p>
                  <p className="text-sm font-medium text-navy">
                    {currentUser.email || "Not set"}
                  </p>
                </div>
              </div>

              {/* Name */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Name
                  </p>
                  {editingName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={nameSaving || !nameValue.trim()}
                        className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                      >
                        {nameSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setNameValue(currentUser.name || "");
                        }}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-navy">
                      {currentUser.name || "Not set"}
                    </p>
                  )}
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Member Since
                  </p>
                  <p className="text-sm font-medium text-navy">
                    {memberSinceDate || "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Connected Apps */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-navy mb-4">Your Apps</h2>

            {entitledApps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No apps connected yet</p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Apps
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {entitledApps.map((app) => {
                  const info = APP_INFO[app];
                  return (
                    <div
                      key={app}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${info.gradient} flex items-center justify-center`}
                        >
                          {info.icon}
                        </div>
                        <div>
                          <p className="font-medium text-navy">{info.name}</p>
                          <p className="text-xs text-gray-500">{info.domain}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://${info.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition flex items-center gap-1"
                        >
                          Open
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {!isLifetime && entitledApps.length > 1 && (
                          <button
                            onClick={() => handleRemoveApp(app)}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                          >
                            <Minus className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add more apps link */}
            {entitledApps.length > 0 && entitledApps.length < 3 && !isLifetime && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  href="/signup"
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add more apps to your subscription
                </Link>
              </div>
            )}
          </section>

          {/* Subscription */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-navy mb-4">Subscription</h2>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-4">
              {isLifetime ? (
                <>
                  <Crown className="h-5 w-5 text-purple-500" />
                  <span className="font-semibold text-navy">Lifetime Access</span>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Lifetime
                  </span>
                </>
              ) : isActive ? (
                <>
                  <Crown className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-navy">Safe Family Pro</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                </>
              ) : isTrial ? (
                <>
                  <Crown className="h-5 w-5 text-indigo-500" />
                  <span className="font-semibold text-navy">Free Trial</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Trial
                  </span>
                </>
              ) : isCanceled ? (
                <>
                  <Crown className="h-5 w-5 text-gray-400" />
                  <span className="font-semibold text-navy">Canceled</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    Canceled
                  </span>
                </>
              ) : isExpired ? (
                <>
                  <Crown className="h-5 w-5 text-red-400" />
                  <span className="font-semibold text-navy">Expired</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Expired
                  </span>
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5 text-gray-400" />
                  <span className="font-semibold text-navy">No Subscription</span>
                </>
              )}
            </div>

            {/* Subscription Details */}
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {isTrial && trialExpiresDate && (
                <p>
                  Trial expires:{" "}
                  <span className="font-medium text-navy">{trialExpiresDate}</span>
                </p>
              )}
              {(isActive || isCanceled) && subscriptionEndsDate && (
                <p>
                  {isCanceled ? "Access until:" : "Renews:"}{" "}
                  <span className="font-medium text-navy">{subscriptionEndsDate}</span>
                </p>
              )}
              {currentUser.billingInterval && (
                <p>
                  Billing:{" "}
                  <span className="font-medium text-navy capitalize">
                    {currentUser.billingInterval}
                  </span>
                </p>
              )}
            </div>

            {/* Actions */}
            {(isActive || isCanceled) && currentUser.stripeCustomerId && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-gray-50 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                {portalLoading ? "Opening..." : "Manage Billing"}
              </button>
            )}

            {(isTrial || isExpired) && (
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-600 hover:to-purple-700"
              >
                Upgrade Now
              </Link>
            )}
          </section>

          {/* Help & Support */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-navy mb-4">Help & Support</h2>
            <a
              href="mailto:jeremiah@getsafefamily.com"
              className="flex items-center gap-3 rounded-lg p-3 -mx-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <MessageCircle className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-navy">Contact Support</p>
                <p className="text-xs text-gray-500">jeremiah@getsafefamily.com</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          </section>

          {/* Legal */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-navy mb-4">Legal</h2>
            <div className="space-y-1">
              <a
                href="https://getsafetunes.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg p-3 -mx-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <Shield className="h-4 w-4 text-gray-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-navy">
                  Privacy Policy
                </span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="https://getsafetunes.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg p-3 -mx-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-navy">
                  Terms of Service
                </span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold text-red-900">Danger Zone</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account and all associated data. This action
              cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </section>
        </div>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-navy">
              Delete Account?
            </h3>
            <p className="mb-4 text-center text-sm text-gray-600">
              This action cannot be undone. All your data, app access, and
              subscription will be permanently deleted.
            </p>
            <p className="mb-2 text-center text-sm text-gray-500">
              Type{" "}
              <span className="font-mono font-bold text-red-600">DELETE</span>{" "}
              to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError("");
              }}
              placeholder="Type DELETE"
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-center font-mono tracking-wider focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={deleteLoading}
            />
            {deleteError && (
              <p className="mb-4 text-center text-sm text-red-600">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError("");
                }}
                disabled={deleteLoading}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
