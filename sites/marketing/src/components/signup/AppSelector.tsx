"use client";

import { useState, useEffect } from "react";
import { Music, PlaySquare, BookOpen, Check, Sparkles } from "lucide-react";

export type AppId = "safetunes" | "safetube" | "safereads";

interface AppSelectorProps {
  /** Which app(s) to pre-select (e.g., from referrer) */
  initialApps?: AppId[];
  /** Callback when selection changes */
  onChange?: (selectedApps: AppId[], pricing: PricingInfo, isYearly: boolean) => void;
  /** Show yearly toggle */
  showYearlyToggle?: boolean;
  /** Compact mode for inline forms */
  compact?: boolean;
}

export interface PricingInfo {
  monthly: number;
  yearly: number;
  savingsFromBundle: number;
  isBundlePrice: boolean;
  isYearly?: boolean;
}

const apps = [
  {
    id: "safetunes" as AppId,
    name: "SafeTunes",
    tagline: "Music with Apple Music",
    icon: Music,
    gradient: "from-indigo-500 to-purple-500",
    bgLight: "bg-indigo-50",
    borderSelected: "border-indigo-500",
    checkBg: "bg-indigo-500",
  },
  {
    id: "safetube" as AppId,
    name: "SafeTube",
    tagline: "Videos with YouTube",
    icon: PlaySquare,
    gradient: "from-red-500 to-orange-500",
    bgLight: "bg-orange-50",
    borderSelected: "border-orange-500",
    checkBg: "bg-orange-500",
  },
  {
    id: "safereads" as AppId,
    name: "SafeReads",
    tagline: "Book analysis",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50",
    borderSelected: "border-emerald-500",
    checkBg: "bg-emerald-500",
  },
];

// Pricing tiers
const PRICING = {
  single: { monthly: 4.99, yearly: 49 },      // 1 app
  double: { monthly: 7.99, yearly: 79 },      // 2 apps
  bundle: { monthly: 9.99, yearly: 99 },      // 3 apps (bundle)
};

// Individual total if bought separately
const INDIVIDUAL_TOTAL = 4.99 * 3; // $14.97/mo

function calculatePricing(selectedCount: number): PricingInfo {
  let pricing: { monthly: number; yearly: number };

  switch (selectedCount) {
    case 1:
      pricing = PRICING.single;
      break;
    case 2:
      pricing = PRICING.double;
      break;
    case 3:
    default:
      pricing = PRICING.bundle;
      break;
  }

  const isBundlePrice = selectedCount === 3;
  const savingsFromBundle = isBundlePrice
    ? INDIVIDUAL_TOTAL - pricing.monthly
    : 0;

  return {
    monthly: pricing.monthly,
    yearly: pricing.yearly,
    savingsFromBundle,
    isBundlePrice,
  };
}

export default function AppSelector({
  initialApps = [],
  onChange,
  showYearlyToggle = false,
  compact = false,
}: AppSelectorProps) {
  const [selectedApps, setSelectedApps] = useState<Set<AppId>>(
    new Set(initialApps)
  );
  const [isYearly, setIsYearly] = useState(false);

  const pricing = calculatePricing(selectedApps.size);

  useEffect(() => {
    onChange?.(Array.from(selectedApps), pricing, isYearly);
  }, [selectedApps, pricing, isYearly, onChange]);

  const toggleApp = (appId: AppId) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        // Don't allow deselecting last app
        if (next.size === 1) return prev;
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedApps(new Set(apps.map((a) => a.id)));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-semibold text-navy ${compact ? "text-base" : "text-lg"}`}>
            Choose your apps
          </h3>
          {!compact && (
            <p className="text-sm text-navy/60 mt-1">
              Select the content you want to control
            </p>
          )}
        </div>
        {selectedApps.size < 3 && (
          <button
            type="button"
            onClick={selectAll}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Select all
          </button>
        )}
      </div>

      {/* App checkboxes */}
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
        {apps.map((app) => {
          const isSelected = selectedApps.has(app.id);
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => toggleApp(app.id)}
              className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? `${app.borderSelected} ${app.bgLight}`
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              } ${compact ? "" : "sm:flex-col sm:text-center sm:p-5"}`}
            >
              {/* Checkbox indicator */}
              <div
                className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? `${app.checkBg} scale-100`
                    : "bg-gray-200 scale-90"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* App icon */}
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-md ${
                  compact ? "" : "sm:w-12 sm:h-12"
                }`}
              >
                <app.icon className={`text-white ${compact ? "w-5 h-5" : "w-5 h-5 sm:w-6 sm:h-6"}`} />
              </div>

              {/* App info */}
              <div className={compact ? "" : "sm:mt-2"}>
                <p className={`font-semibold text-navy ${compact ? "text-sm" : ""}`}>
                  {app.name}
                </p>
                <p className={`text-navy/60 ${compact ? "text-xs" : "text-sm"}`}>
                  {app.tagline}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bundle savings badge */}
      {pricing.isBundlePrice && (
        <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">Bundle savings!</span>
          <span className="text-sm">
            Save ${pricing.savingsFromBundle.toFixed(2)}/mo vs. buying separately
          </span>
        </div>
      )}

      {/* Pricing display */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-navy/60">
              {selectedApps.size === 1
                ? "1 app"
                : selectedApps.size === 2
                ? "2 apps"
                : "All 3 apps"}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-navy">
                ${isYearly ? pricing.yearly : pricing.monthly.toFixed(2)}
              </span>
              <span className="text-navy/60">
                /{isYearly ? "year" : "month"}
              </span>
            </div>
            {isYearly && (
              <p className="text-xs text-navy/50 mt-1">
                ${(pricing.yearly / 12).toFixed(2)}/month billed annually
              </p>
            )}
          </div>

          {/* Yearly toggle */}
          {showYearlyToggle && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  !isYearly ? "text-navy" : "text-navy/50"
                }`}
              >
                Monthly
              </span>
              <button
                type="button"
                onClick={() => setIsYearly(!isYearly)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  isYearly ? "bg-navy" : "bg-navy/30"
                }`}
                role="switch"
                aria-checked={isYearly}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isYearly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span
                className={`text-xs font-medium ${
                  isYearly ? "text-navy" : "text-navy/50"
                }`}
              >
                Yearly
              </span>
            </div>
          )}
        </div>

        {/* Per-app breakdown */}
        {selectedApps.size >= 2 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-navy/50 mb-2">Your selection:</p>
            <div className="flex flex-wrap gap-2">
              {apps
                .filter((app) => selectedApps.has(app.id))
                .map((app) => (
                  <span
                    key={app.id}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${app.bgLight}`}
                  >
                    <app.icon className="w-3 h-3" />
                    {app.name}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
