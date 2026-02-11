"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import {
  Crown,
  CreditCard,
  Sparkles,
  BookOpen,
  Infinity,
  HeadphonesIcon,
  Loader2,
  Calendar,
  Mail,
  MessageCircle,
  Shield,
  FileText,
  ExternalLink,
  AlertTriangle,
  Trash2,
  LogOut,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const details = useQuery(api.subscriptions.getDetails) as {
    isSubscribed: boolean;
    status: string | null;
    currentPeriodEnd: number | null;
    trialExpiresAt: number | null;
    trialDaysRemaining: number;
    analysisCount: number;
  } | undefined;
  const deleteOwnAccount = useMutation(api.admin.deleteOwnAccount);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleUpgrade() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutLoading(false);
    }
  }

  async function handleManage() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalLoading(false);
      }
    } catch {
      setPortalLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("Please type DELETE to confirm");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      await deleteOwnAccount();
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please try again."
      );
      setDeleteLoading(false);
    }
  }

  const renewalDate = details?.currentPeriodEnd
    ? new Date(details.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const memberSinceDate = user?._creationTime
    ? new Date(user._creationTime).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-ink-900">Settings</h1>

      {/* Account Information Section */}
      <div className="rounded-xl border border-parchment-200 bg-white p-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
          Account
        </h2>

        {!user ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-parchment-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-parchment-100">
                <Mail className="h-4 w-4 text-parchment-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Email
                </p>
                <p className="text-sm font-medium text-ink-900">
                  {user.email || "Not set"}
                </p>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-parchment-100">
                <Calendar className="h-4 w-4 text-parchment-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Member Since
                </p>
                <p className="text-sm font-medium text-ink-900">
                  {memberSinceDate || "Unknown"}
                </p>
              </div>
            </div>

            {/* Total Reviews */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-parchment-100">
                <BookOpen className="h-4 w-4 text-parchment-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Total Book Reviews
                </p>
                <p className="text-sm font-medium text-ink-900">
                  {details?.analysisCount ?? 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safe Family Account Section */}
      <div className="rounded-xl border border-parchment-300 bg-gradient-to-br from-parchment-50 to-amber-50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-parchment-700">
            <svg className="h-5 w-5 text-parchment-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-ink-900">
              Safe Family Account
            </h2>
            <p className="text-sm text-ink-600">
              Manage your subscription and apps
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-parchment-200 bg-white p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-parchment-100 px-2.5 py-1 text-xs font-medium text-parchment-700">
            <BookOpen className="h-3.5 w-3.5" />
            SafeReads
          </span>
          <span className="text-sm text-ink-600">Currently using</span>
        </div>

        <a
          href="https://getsafefamily.com/account"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand flex w-full items-center justify-center gap-2 rounded-lg"
        >
          <span>Manage Safe Family Account</span>
          <ExternalLink className="h-4 w-4" />
        </a>

        <p className="mt-3 text-center text-xs text-ink-500">
          Add SafeTunes, SafeTube, or manage billing at getsafefamily.com
        </p>
      </div>

      {/* Subscription Section */}
      <div className="rounded-xl border border-parchment-200 bg-white p-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
          Subscription
        </h2>

        {!details ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-parchment-400" />
          </div>
        ) : details.isSubscribed ? (
          /* Subscribed state */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-ink-900">
                SafeReads
              </span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Premium
              </span>
            </div>

            <div className="space-y-2 text-sm text-ink-600">
              <p>
                Status:{" "}
                <span className="font-medium capitalize text-ink-900">
                  {details.status}
                </span>
              </p>
              {renewalDate && (
                <p>
                  {details.status === "canceled"
                    ? "Access until: "
                    : "Renews: "}
                  <span className="font-medium text-ink-900">
                    {renewalDate}
                  </span>
                </p>
              )}
              <p>
                Total reviews:{" "}
                <span className="font-medium text-ink-900">
                  {details.analysisCount}
                </span>
              </p>
            </div>

            <button
              onClick={handleManage}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-parchment-300 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-parchment-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {portalLoading
                ? "Opening portal\u2026"
                : "Manage Subscription"}
            </button>
          </div>
        ) : details.status === "lifetime" ? (
          /* Lifetime state */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-semibold text-ink-900">
                SafeReads Lifetime
              </span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Lifetime
              </span>
            </div>

            <div className="space-y-2 text-sm text-ink-600">
              <p>
                Status:{" "}
                <span className="font-medium text-ink-900">
                  Lifetime Access
                </span>
              </p>
              <p>
                Total reviews:{" "}
                <span className="font-medium text-ink-900">
                  {details.analysisCount}
                </span>
              </p>
            </div>
          </div>
        ) : (
          /* Trial state */
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-ink-600">
              <p>
                Plan:{" "}
                <span className="font-medium text-ink-900">Free Trial</span>
              </p>
              {details.trialDaysRemaining > 0 ? (
                <>
                  <p>
                    Time remaining:{" "}
                    <span className="font-medium text-ink-900">
                      {details.trialDaysRemaining} {details.trialDaysRemaining === 1 ? "day" : "days"}
                    </span>
                  </p>
                  {details.trialExpiresAt && (
                    <p>
                      Expires:{" "}
                      <span className="font-medium text-ink-900">
                        {new Date(details.trialExpiresAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p>
                  Status:{" "}
                  <span className="font-medium text-amber-600">
                    Trial Expired
                  </span>
                </p>
              )}
              <p>
                Reviews completed:{" "}
                <span className="font-medium text-ink-900">
                  {details.analysisCount}
                </span>
              </p>
            </div>

            {/* Pricing card */}
            <div className="rounded-lg border border-parchment-200 bg-parchment-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-parchment-700" />
                <span className="font-semibold text-ink-900">
                  Subscribe to SafeReads
                </span>
              </div>
              <p className="mb-3 text-lg font-semibold text-ink-900">
                $4.99
                <span className="text-sm font-normal text-ink-500">
                  /month
                </span>
              </p>
              <ul className="mb-4 space-y-2 text-sm text-ink-700">
                <li className="flex items-center gap-2">
                  <Infinity className="h-4 w-4 text-parchment-700" />
                  Unlimited book reviews
                </li>
                <li className="flex items-center gap-2">
                  <HeadphonesIcon className="h-4 w-4 text-parchment-700" />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-parchment-700" />
                  Full content breakdowns
                </li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="btn-brand w-full rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutLoading
                  ? "Redirecting to checkout\u2026"
                  : "Upgrade Now"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-parchment-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-parchment-50"
      >
        <LogOut className="h-4 w-4" />
        Log Out
      </button>

      {/* Help & Support Section */}
      <div className="rounded-xl border border-parchment-200 bg-white p-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
          Help & Support
        </h2>
        <a
          href="mailto:jeremiah@getsafefamily.com"
          className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-parchment-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-parchment-100">
            <MessageCircle className="h-4 w-4 text-parchment-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-900">Contact Support</p>
            <p className="text-xs text-ink-500">jeremiah@getsafefamily.com</p>
          </div>
          <ExternalLink className="h-4 w-4 text-ink-400" />
        </a>
      </div>

      {/* Legal Section */}
      <div className="rounded-xl border border-parchment-200 bg-white p-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
          Legal
        </h2>
        <div className="space-y-1">
          <a
            href="/privacy"
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-parchment-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-parchment-100">
              <Shield className="h-4 w-4 text-parchment-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-ink-900">
              Privacy Policy
            </span>
            <ExternalLink className="h-4 w-4 text-ink-400" />
          </a>
          <a
            href="/terms"
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-parchment-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-parchment-100">
              <FileText className="h-4 w-4 text-parchment-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-ink-900">
              Terms of Service
            </span>
            <ExternalLink className="h-4 w-4 text-ink-400" />
          </a>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="font-serif text-lg font-bold text-red-900">
            Danger Zone
          </h2>
        </div>
        <p className="mb-4 text-sm text-ink-600">
          Permanently delete your account and all associated data.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-2 text-center font-serif text-xl font-bold text-ink-900">
              Delete Account?
            </h3>
            <p className="mb-4 text-center text-sm text-ink-600">
              This action cannot be undone. All your data, reading profiles,
              kids, and book reviews will be permanently deleted.
            </p>
            <p className="mb-2 text-center text-sm text-ink-500">
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
              className="mb-4 w-full rounded-lg border border-parchment-300 px-4 py-2 text-center font-mono tracking-wider focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="flex-1 rounded-lg bg-parchment-100 px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-parchment-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
