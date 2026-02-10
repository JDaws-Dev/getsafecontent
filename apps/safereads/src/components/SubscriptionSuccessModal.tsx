"use client";

import { X, Sparkles, BookOpen, Infinity, Heart } from "lucide-react";

interface SubscriptionSuccessModalProps {
  onClose: () => void;
}

export function SubscriptionSuccessModal({ onClose }: SubscriptionSuccessModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-200 rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-400 hover:text-ink-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Celebration icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-parchment-100 to-parchment-200">
          <Sparkles className="h-10 w-10 text-parchment-700" />
        </div>

        <h2 className="mt-6 text-center font-serif text-2xl font-bold text-ink-900">
          Welcome to SafeReads Pro!
        </h2>

        <p className="mt-3 text-center text-ink-600">
          Thank you for subscribing. You now have unlimited access to help keep your family&apos;s reading safe.
        </p>

        {/* Benefits reminder */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-ink-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-parchment-100">
              <Infinity className="h-4 w-4 text-parchment-700" />
            </div>
            <span>Unlimited book reviews</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-parchment-100">
              <BookOpen className="h-4 w-4 text-parchment-700" />
            </div>
            <span>Full content breakdowns</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-parchment-100">
              <Heart className="h-4 w-4 text-parchment-700" />
            </div>
            <span>Priority support</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full rounded-lg bg-parchment-700 py-3 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
        >
          Start Reviewing Books
        </button>
      </div>
    </div>
  );
}
