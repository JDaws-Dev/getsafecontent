import Link from "next/link";
import { Check, Sparkles, Music, PlaySquare, Search } from "lucide-react";
import { PLAN_NAME, PRICE, TRIAL_DAYS } from "@/lib/pricing";

/**
 * Unified pricing section — one plan, Safe Family, $4.99/month for
 * SafeTunes, SafeTube and SafeStudy. Monthly only (owner decision
 * 2026-11-25). Price text comes from lib/pricing.ts.
 *
 * Existing subscribers stay on whatever price they already pay.
 */

const apps = [
  { name: "SafeTunes", icon: Music, blurb: "Apple Music your kids can actually use" },
  { name: "SafeTube", icon: PlaySquare, blurb: "YouTube without the algorithm" },
  { name: "SafeStudy", icon: Search, blurb: "Search + AI tutor built for kids" },
];

const includedFeatures = [
  "Unlimited kid profiles for the whole family",
  "Parent visibility into every kid request and search",
  "No ads, no data sold, no surprises",
  `${TRIAL_DAYS}-day free trial — no credit card required to start`,
  "Cancel anytime in one click",
  "30-day money-back guarantee",
];

export default function UnifiedPricingSection() {
  const checkoutHref = "/signup?plan=unified";

  return (
    <section id="pricing" className="relative">
      <div className="bg-cream pt-12 sm:pt-16 pb-32 sm:pb-48">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              One subscription. Everything your family needs.
            </h2>
            <p className="mt-4 text-lg text-navy/60 max-w-2xl mx-auto">
              Music, video, and search in one simple plan. One price, every kid in the house.
            </p>
          </div>

          {/* Single pricing card */}
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl bg-white shadow-xl border border-navy/10 overflow-hidden">
              {/* Header band */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 sm:px-10 py-6 text-center">
                <div className="inline-flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {PLAN_NAME}
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl sm:text-6xl font-bold">{PRICE}</span>
                  <span className="text-xl text-white/80">/month</span>
                </div>
                <p className="mt-3 text-sm text-white/70">
                  All three apps, the whole family, one monthly price
                </p>
              </div>

              {/* Apps grid */}
              <div className="px-6 sm:px-10 py-8 border-b border-navy/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy/40 mb-4">
                  Included in your plan
                </p>
                <div className="grid gap-3">
                  {apps.map((app) => (
                    <div
                      key={app.name}
                      className="flex items-start gap-3 rounded-xl bg-cream/50 p-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        <app.icon className="h-4 w-4 text-navy" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy">
                          {app.name}
                        </p>
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
                  {TRIAL_DAYS}-day free trial · no credit card required · cancel anytime
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
