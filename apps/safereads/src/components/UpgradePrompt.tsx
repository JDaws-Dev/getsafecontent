"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X, Sparkles, BookOpen, Infinity, Heart, Tag, Check, AlertCircle } from "lucide-react";

interface UpgradePromptProps {
  onDismiss: () => void;
}

export function UpgradePrompt({ onDismiss }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{ success: boolean; message: string } | null>(null);

  const redeemCoupon = useMutation(api.coupons.redeemCoupon);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  async function handleRedeemCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const result = await redeemCoupon({ code: couponCode });
      setCouponResult(result);
      if (result.success) {
        // Reload after short delay to show success message
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch {
      setCouponResult({ success: false, message: "Something went wrong. Please try again." });
    } finally {
      setCouponLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-xl">
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 text-ink-400 hover:text-ink-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-parchment-700" />
          <h3 className="font-serif text-xl font-bold text-ink-900">
            Upgrade to SafeReads Pro
          </h3>
        </div>

        <p className="mb-5 text-sm text-ink-600">
          Your free trial has ended. Upgrade to continue
          reviewing books for your family.
        </p>

        <div className="mb-5 rounded-lg border border-parchment-200 bg-parchment-50 p-4">
          <p className="mb-3 text-lg font-semibold text-ink-900">
            $4.99<span className="text-sm font-normal text-ink-500">/month</span>
          </p>
          <ul className="space-y-2 text-sm text-ink-700">
            <li className="flex items-center gap-2">
              <Infinity className="h-4 w-4 text-parchment-700" />
              Unlimited book reviews
            </li>
            <li className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-parchment-700" />
              Priority support
            </li>
            <li className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-parchment-700" />
              Full content breakdowns
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full rounded-lg bg-parchment-700 px-4 py-2.5 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Redirecting to checkout…" : "Upgrade Now"}
          </button>

          {/* Coupon section */}
          {!showCoupon ? (
            <button
              onClick={() => setShowCoupon(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-parchment-700 transition-colors hover:bg-parchment-50"
            >
              <Tag className="h-4 w-4" />
              Have a coupon code?
            </button>
          ) : (
            <div className="mt-2 rounded-lg border border-parchment-200 bg-parchment-50 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 rounded-md border border-parchment-300 px-3 py-1.5 text-sm uppercase placeholder:normal-case focus:border-parchment-500 focus:outline-none focus:ring-1 focus:ring-parchment-500"
                  disabled={couponLoading || couponResult?.success}
                />
                <button
                  onClick={handleRedeemCoupon}
                  disabled={!couponCode.trim() || couponLoading || couponResult?.success}
                  className="rounded-md bg-parchment-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {couponLoading ? "…" : "Apply"}
                </button>
              </div>
              {couponResult && (
                <div
                  className={`mt-2 flex items-center gap-1.5 text-sm ${
                    couponResult.success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {couponResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {couponResult.message}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onDismiss}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-parchment-50"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
