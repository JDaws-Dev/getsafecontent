"use client";

import { clearAppSession } from "@/lib/appSession";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { UmbrellaMark } from "@/components/brand/Brand";
import {
  Shield,
  User,
  Mail,
  Calendar,
  Edit2,
  Check,
  X,
  ExternalLink,
  ChevronRight,
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
  Search,
  Sparkles,
} from "lucide-react";

import { isRetiredApp } from "@/lib/retiredApps";

type AppId = "safetunes" | "safetube" | "safereads" | "safestudy" | "safespark";

const APP_INFO: Record<AppId, { name: string; domain: string; icon: React.ReactNode; color: string }> = {
  safetunes: {
    name: "SafeTunes",
    domain: "getsafefamily.com/dashboard/tunes",
    icon: <Music className="w-5 h-5 text-white" />,
    color: "#7C4DE0",
  },
  safetube: {
    name: "SafeTube",
    domain: "getsafefamily.com/dashboard/tube",
    icon: <Play className="w-5 h-5 text-white" />,
    color: "#F0603A",
  },
  safereads: {
    name: "SafeReads",
    domain: "getsafefamily.com/dashboard/reads",
    icon: <BookOpen className="w-5 h-5 text-white" />,
    color: "#3AA06B",
  },
  safestudy: {
    name: "SafeStudy",
    domain: "getsafefamily.com/dashboard/study",
    icon: <Search className="w-5 h-5 text-white" />,
    color: "#2F6BF0",
  },
  safespark: {
    name: "SafeSpark",
    domain: "getsafefamily.com/dashboard/spark",
    icon: <Sparkles className="w-5 h-5 text-white" />,
    color: "#F2A413",
  },
};

// Wrapper component for Suspense boundary (required for useSearchParams)
export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy/50" />
      </div>
    }>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  // Get current authenticated user
  const currentUser = useQuery(api.accounts.getCurrentUser);

  // Check for upgrade request from query params
  const upgradeApp = searchParams.get("upgrade") as AppId | null;
  // Retired apps are not offered, so ?upgrade= can't sell them.
  const isValidUpgradeApp =
    upgradeApp && Object.keys(APP_INFO).includes(upgradeApp) && !isRetiredApp(upgradeApp);

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
      clearAppSession();
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
          <UmbrellaMark size="lg" className="animate-pulse" />
          <p className="text-navy/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Waiting for user data
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy/50" />
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

  // Retired apps (src/lib/retiredApps.ts) are left off this page entirely;
  // the entitlement itself is untouched.
  const entitledApps = ((currentUser.entitledApps ?? []) as AppId[]).filter((a) => !isRetiredApp(a));
  const isLifetime = currentUser.subscriptionStatus === "lifetime";
  const isActive = currentUser.subscriptionStatus === "active";
  const isTrial = currentUser.subscriptionStatus === "trial";
  const isCanceled = currentUser.subscriptionStatus === "canceled";
  const isExpired = currentUser.subscriptionStatus === "expired";

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      {/* Same bar as /dashboard: umbrella + wordmark, Dashboard / Account, Sign out */}
      <header className="bg-white border-b border-navy/10 px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/dashboard" className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
              <UmbrellaMark />
              <span className="text-base sm:text-lg font-bold text-navy">Safe Family</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-semibold">
              <Link href="/dashboard" className="px-2.5 sm:px-3 py-1.5 rounded-full text-navy/60 hover:text-navy">Dashboard</Link>
              <Link href="/account" className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-cream-dark text-navy">Account</Link>
            </nav>
          </div>
          <button
            onClick={async () => {
              clearAppSession();
              await signOut();
              router.push("/");
            }}
            className="text-sm text-navy/60 hover:text-navy inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Account Settings</h1>

          {/* Family code + Setup guide — post-purchase "what now?" card */}
          {entitledApps.length > 0 && (
            <section className="bg-white rounded-2xl border border-navy/10 p-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-navy/50">
                    Your family code
                  </p>
                  <p className="mt-2 font-mono font-bold text-3xl sm:text-4xl tracking-widest text-navy">
                    {(currentUser as { familyCode?: string | null }).familyCode ?? "\u2014"}
                  </p>
                  <p className="mt-2 text-sm text-navy/60 leading-relaxed">
                    Same code works on every app. Share it with your kids so they can pick
                    their profile.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Link
                    href="/setup"
                    className="inline-flex items-center justify-center gap-1.5 bg-navy text-white dark:text-cream hover:bg-navy-light font-semibold text-sm px-4 py-2 rounded-full transition-colors whitespace-nowrap"
                  >
                    First time? Setup guide
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const code = (currentUser as { familyCode?: string | null }).familyCode;
                      if (code) {
                        void navigator.clipboard?.writeText(code);
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 bg-cream-dark hover:bg-cream text-navy font-semibold text-sm px-4 py-2 rounded-full transition-colors whitespace-nowrap"
                  >
                    Copy code
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Upgrade Banner - shown when user comes from an app they don't have access to */}
          {isValidUpgradeApp && upgradeApp && !entitledApps.includes(upgradeApp) && (
            <section className="bg-white rounded-2xl border border-navy/10 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: APP_INFO[upgradeApp].color }}>
                  {APP_INFO[upgradeApp].icon}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-navy text-lg mb-1">
                    Add {APP_INFO[upgradeApp].name} to Your Plan
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Your current subscription doesn't include {APP_INFO[upgradeApp].name}.
                    Upgrade your plan to get access to all Safe Family apps.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white dark:text-cream rounded-full font-semibold hover:bg-navy-light transition"
                    >
                      <Plus className="w-4 h-4" />
                      Upgrade Plan
                    </Link>
                    <button
                      onClick={() => router.replace("/account")}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Account Information */}
          <section className="bg-white rounded-2xl border border-navy/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-navy">Account Information</h2>
              {!editingName && (
                <button
                  onClick={() => {
                    setEditingName(true);
                    setNameValue(currentUser.name || "");
                  }}
                  className="text-sm text-navy/70 hover:text-navy font-semibold flex items-center gap-1"
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-dark">
                  <Mail className="h-4 w-4 text-navy/60" />
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-dark">
                  <User className="h-4 w-4 text-navy/60" />
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
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-navy/10 focus:border-navy/40 focus:outline-none"
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-dark">
                  <Calendar className="h-4 w-4 text-navy/60" />
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
          <section className="bg-white rounded-2xl border border-navy/10 p-6">
            <h2 className="font-semibold text-navy mb-4">Your Apps</h2>

            {entitledApps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No apps connected yet</p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white dark:text-cream rounded-full font-semibold hover:bg-navy-light"
                >
                  <Plus className="w-4 h-4" />
                  Add Apps
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {entitledApps.map((app) => {
                  const info = APP_INFO[app as AppId];
                  // Defensive: skip if the entitled app id isn't one we know.
                  // Without this, an unknown app in entitledApps crashes the
                  // whole /account render (seen 2026-05-27 when safespark
                  // entitlements appeared before this page had been updated).
                  if (!info) return null;
                  return (
                    <div
                      key={app}
                      className="flex items-center justify-between p-4 rounded-xl border border-navy/10 hover:border-navy/20 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: info.color }}
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
                          className="px-3 py-1.5 text-sm font-medium text-navy/70 hover:text-navy hover:bg-cream rounded-lg transition flex items-center gap-1"
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
                  className="text-sm text-navy/70 hover:text-navy font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add more apps to your subscription
                </Link>
              </div>
            )}
          </section>

          {/* Subscription */}
          <section className="bg-white rounded-2xl border border-navy/10 p-6">
            <h2 className="font-semibold text-navy mb-4">Subscription</h2>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-4">
              {isLifetime ? (
                <>
                  <Crown className="h-5 w-5 text-[#E88B6A]" />
                  <span className="font-semibold text-navy">Lifetime Access</span>
                  <span className="rounded-full bg-[#FCE8DC] px-2 py-0.5 text-xs font-medium text-[#A8512F]">
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
                  <Crown className="h-5 w-5 text-navy/60" />
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
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white dark:text-cream hover:bg-navy-light"
              >
                Upgrade Now
              </Link>
            )}
          </section>

          {/* Help & Support */}
          <section className="bg-white rounded-2xl border border-navy/10 p-6">
            <h2 className="font-semibold text-navy mb-4">Help & Support</h2>
            <a
              href="mailto:jeremiah@getsafefamily.com"
              className="flex items-center gap-3 rounded-lg p-3 -mx-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-dark">
                <MessageCircle className="h-4 w-4 text-navy/60" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-navy">Contact Support</p>
                <p className="text-xs text-gray-500">jeremiah@getsafefamily.com</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          </section>

          {/* Legal */}
          <section className="bg-white rounded-2xl border border-navy/10 p-6">
            <h2 className="font-semibold text-navy mb-4">Legal</h2>
            <div className="space-y-1">
              <a
                href="/privacy"
                className="flex items-center gap-3 rounded-lg p-3 -mx-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-dark">
                  <Shield className="h-4 w-4 text-navy/60" />
                </div>
                <span className="flex-1 text-sm font-medium text-navy">
                  Privacy Policy
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="/terms"
                className="flex items-center gap-3 rounded-lg p-3 -mx-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-dark">
                  <FileText className="h-4 w-4 text-navy/60" />
                </div>
                <span className="flex-1 text-sm font-medium text-navy">
                  Terms of Service
                </span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-white rounded-2xl border border-red-200 p-6">
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
