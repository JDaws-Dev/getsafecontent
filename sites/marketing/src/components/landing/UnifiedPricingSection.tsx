"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, Music, PlaySquare, Book, Search } from "lucide-react";

/**
 * Unified pricing section — single plan, all 5 apps, $14.99/mo or $149/yr.
 *
 * Rendered when ENABLE_UNIFIED_PRICING is on. Replaces the 3-card legacy
 * PricingSection (Single / Two-app / Bundle). Includes SafeSpark in the
 * value list; the per-app marketing story collapses into "one trusted
 * subscription, everything your family needs."
 *
 * Existing $9.99 bundle subscribers don't see this — they're grandfathered
 * server-side, unaffected by the rollout.
 */

const MONTHLY_PRICE = 14.99;
const YEARLY_PRICE = 149;
const APPLE_ONE_FAMILY = 19.99; // anchor price for comparison

const apps = [
  { name: "SafeTunes", icon: Music, blurb: "Apple Music your kids can actually use" },
  { name: "SafeTube", icon: PlaySquare, blurb: "YouTube without the algorithm" },
  { name: "SafeReads", icon: Book, blurb: "Know what's in the book before they read it" },
  { name: "SafeStudy", icon: Search, blurb: "Search + AI tutor built for kids" },
  { name: "SafeSpark", icon: Sparkles, blurb: "Teach kids to use AI well", isNew: true },
];

const includedFeatures = [
  "Unlimited kid profiles for the whole family",
  "Parent visibility into every kid request and search",
  "No ads, no data sold, no surprises",
  "7-day free trial — no credit card required to start",
  "Cancel anytime in one click",
  "30-day money-back guarantee",
];

export default function UnifiedPricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  const displayPrice = isYearly ? YEARLY_PRICE : MONTHLY_PRICE;
  const displayInterval = isYearly ? "/year" : "/month";
  const effectiveMonthly = isYearly ? YEARLY_PRICE / 12 : MONTHLY_PRICE;
  const yearlySavingsPct = Math.round(
    ((MONTHLY_PRICE * 12 - YEARLY_PRICE) / (MONTHLY_PRICE * 12)) * 100,
  );

  const checkoutHref = `/signup?plan=unified&interval=${isYearly ? "yearly" : "monthly"}`;

  return (
    <section id="pricing" className="relative">
      <div className="bg-cream pt-12 sm:pt-16 pb-32 sm:pb-48">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              One subscription. Everything your family needs.
            </h2>
            <p className="mt-4 text-lg text-navy/60 max-w-2xl mx-auto">
              All five Safe Family apps — music, video, books, search, and AI
              training — for less than Apple One Family.
            </p>
          </div>

          {/* Monthly/Yearly toggle */}
          <div className="flex justify-center mb-8">
            <div
              role="tablist"
              aria-label="Billing interval"
              className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm border border-navy/10"
            >
              <button
                role="tab"
                aria-selected={!isYearly}
                onClick={() => setIsYearly(false)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  !isYearly
                    ? "bg-navy text-cream"
                    : "text-navy/70 hover:text-navy"
                }`}
              >
                Monthly
              </button>
              <button
                role="tab"
                aria-selected={isYearly}
                onClick={() => setIsYearly(true)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
                  isYearly
                    ? "bg-navy text-cream"
                    : "text-navy/70 hover:text-navy"
                }`}
              >
                Yearly
                <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5">
                  Save {yearlySavingsPct}%
                </span>
              </button>
            </div>
          </div>

          {/* Single pricing card */}
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl bg-white shadow-xl border border-navy/10 overflow-hidden">
              {/* Header band */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 sm:px-10 py-6 text-center">
                <div className="inline-flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Safe Family
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl sm:text-6xl font-bold">
                    ${displayPrice.toFixed(displayPrice % 1 === 0 ? 0 : 2)}
                  </span>
                  <span className="text-xl text-white/80">{displayInterval}</span>
                </div>
                {isYearly && (
                  <p className="mt-2 text-sm text-white/80">
                    That&rsquo;s ${effectiveMonthly.toFixed(2)}/mo, billed annually
                  </p>
                )}
                <p className="mt-3 text-sm text-white/70">
                  Less than Apple One Family (${APPLE_ONE_FAMILY}/mo)
                </p>
              </div>

              {/* Apps grid */}
              <div className="px-6 sm:px-10 py-8 border-b border-navy/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy/40 mb-4">
                  All five apps included
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {apps.map((app) => (
                    <div
                      key={app.name}
                      className="flex items-start gap-3 rounded-xl bg-cream/50 p-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        <app.icon className="h-4 w-4 text-navy" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-navy">
                            {app.name}
                          </p>
                          {app.isNew && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-navy/60 leading-snug mt-0.5">
                          {app.blurb}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Included features */}
              <div className="px-6 sm:px-10 py-6">
                <ul className="space-y-2.5 mb-6">
                  {includedFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-navy/80">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={checkoutHref}
                  className="btn-peach block w-full text-center py-3.5 text-base font-semibold rounded-xl"
                >
                  Start Free Trial
                </Link>
                <p className="mt-3 text-center text-xs text-navy/50">
                  7-day free trial · no credit card required · cancel anytime
                </p>
              </div>
            </div>

            {/* Grandfather note */}
            <p className="mt-6 text-center text-xs text-navy/50">
              Existing subscriber? Your current price is locked in forever.{" "}
              <Link href="/account" className="underline hover:text-navy">
                Manage your subscription
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
