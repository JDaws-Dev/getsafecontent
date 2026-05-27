"use client";

import { useState } from "react";
import CheckoutButton from "@/components/checkout/CheckoutButton";
import { Check } from "lucide-react";
import { isUnifiedPricingEnabledClient } from "@/lib/feature-flags";
import UnifiedPricingSection from "./UnifiedPricingSection";

const bundleFeatures = [
  { text: "SafeTunes — every song, parent-approved", value: "$4.99 value" },
  { text: "SafeTube — every video, parent-approved", value: "$4.99 value" },
  { text: "SafeReads — every book analyzed", value: "$4.99 value" },
  { text: "SafeStudy — safe search + tutor", value: "$4.99 value" },
  { text: "Unlimited kid profiles for the whole family", value: null },
  { text: "7-day free trial, cancel anytime", value: null },
];

// Individual app prices for savings calculation
const SAFETUNES_PRICE = 4.99;
const SAFETUBE_PRICE = 4.99;
const SAFEREADS_PRICE = 4.99;
const SAFESTUDY_PRICE = 4.99;
const INDIVIDUAL_TOTAL = SAFETUNES_PRICE + SAFETUBE_PRICE + SAFEREADS_PRICE + SAFESTUDY_PRICE; // $19.96

// Stripe Price IDs
const MONTHLY_PRICE_ID = "price_1SxaerKgkIT46sg7NHNy0wk8"; // $9.99/mo
const YEARLY_PRICE_ID = "price_1SzLJUKgkIT46sg7xsKo2A71"; // $99/year

export default function PricingSection() {
  // When the unified-pricing flag is on, render the single-plan card and
  // skip the rest of the legacy 3-tier markup entirely.
  if (isUnifiedPricingEnabledClient()) {
    return <UnifiedPricingSection />;
  }

  return <LegacyPricingSection />;
}

function LegacyPricingSection() {
  const [isYearly, setIsYearly] = useState(false); // Default to monthly - matches $9.99/mo CTAs throughout page

  const monthlyPrice = 9.99;
  const yearlyPrice = 99;
  const monthlySavings = INDIVIDUAL_TOTAL - monthlyPrice; // $2.98
  const yearlySavings = monthlySavings * 12; // $35.76
  const yearlySavingsPercent = Math.round(
    ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100
  );

  return (
    <section id="pricing" className="relative">
      {/* Cream background section */}
      <div className="bg-cream pt-12 sm:pt-16 pb-32 sm:pb-48">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              All the content. All the control. One price.
            </h2>
            <p className="mt-4 text-lg text-navy/60 max-w-2xl mx-auto">
              Cover books, music, YouTube, and search for <strong>less than Netflix</strong>. Save ${yearlySavings.toFixed(0)} every year.
            </p>
          </div>
        </div>
      </div>

      {/* Cards container - overlaps into footer */}
      <div className="relative -mt-24 sm:-mt-36 pb-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto">
            {/* Left Card: Bundle Pricing */}
            <div className="relative flex flex-col">
              <div className="relative bg-white rounded-3xl shadow-xl p-8 lg:p-10 flex-1 flex flex-col">
                <div>
                  <h3 className="text-2xl font-bold text-navy">
                    Safe Family
                  </h3>
                  <p className="text-sm text-navy/60 mt-1">
                    SafeTunes + SafeTube + SafeReads + SafeStudy
                  </p>
                </div>

                {/* Savings callout box */}
                <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                    vs. Buying Separately
                  </p>
                  <div className="space-y-1 text-sm text-navy/70">
                    <div className="flex justify-between">
                      <span>SafeTunes</span>
                      <span>${SAFETUNES_PRICE.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SafeTube</span>
                      <span>${SAFETUBE_PRICE.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SafeReads</span>
                      <span>${SAFEREADS_PRICE.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SafeStudy</span>
                      <span>${SAFESTUDY_PRICE.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-emerald-200 text-navy/50 line-through">
                      <span>Separate total</span>
                      <span>${INDIVIDUAL_TOTAL.toFixed(2)}/mo</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between bg-emerald-100 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
                    <span className="font-semibold text-emerald-800">You save</span>
                    <span className="font-bold text-emerald-800">
                      ${monthlySavings.toFixed(2)}/mo (${yearlySavings.toFixed(2)}/yr)
                    </span>
                  </div>
                </div>

                {/* Billing choice — both options visible side-by-side so the
                    yearly discount doesn't hide behind a toggle */}
                <fieldset className="mt-6">
                  <legend className="text-sm font-medium text-navy/60 mb-2">
                    Choose your billing
                  </legend>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Billing cadence">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!isYearly}
                      onClick={() => setIsYearly(false)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-peach-start focus-visible:ring-offset-2 ${
                        !isYearly
                          ? "border-navy bg-navy/5"
                          : "border-navy/10 hover:border-navy/30 bg-white"
                      }`}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wider text-navy/50">
                        Monthly
                      </span>
                      <span className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-navy">${monthlyPrice.toFixed(2)}</span>
                        <span className="text-sm text-navy/60">/mo</span>
                      </span>
                      <span className="mt-1 block text-xs text-navy/50">Cancel anytime</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isYearly}
                      onClick={() => setIsYearly(true)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-peach-start focus-visible:ring-offset-2 ${
                        isYearly
                          ? "border-navy bg-navy/5"
                          : "border-navy/10 hover:border-navy/30 bg-white"
                      }`}
                    >
                      <span className="absolute -top-2 right-3 inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Save {yearlySavingsPercent}%
                      </span>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-navy/50">
                        Yearly
                      </span>
                      <span className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-navy">${yearlyPrice}</span>
                        <span className="text-sm text-navy/60">/yr</span>
                      </span>
                      <span className="mt-1 block text-xs text-navy/50">
                        ${(yearlyPrice / 12).toFixed(2)}/mo billed annually
                      </span>
                    </button>
                  </div>
                </fieldset>

                {/* Features */}
                <ul className="mt-8 space-y-3 flex-1">
                  {bundleFeatures.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-navy/80 flex-1">{feature.text}</span>
                      {feature.value && (
                        <span className="text-xs text-navy/40 font-medium">{feature.value}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <CheckoutButton
                  className="mt-8 block w-full btn-peach text-center text-lg py-4"
                  priceId={isYearly ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID}
                >
                  Start Free Trial
                </CheckoutButton>

                <p className="mt-4 text-center text-sm text-navy/60 font-medium">
                  No charge until day 8 • Cancel anytime
                </p>

                {/* Money-back guarantee - prominent */}
                <div className="mt-4 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span className="text-sm font-medium">30-day money-back guarantee — no questions asked</span>
                </div>

                {/* Compliance badges */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    COPPA Compliant
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Data Encrypted
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    No Data Selling
                  </span>
                </div>
              </div>

              {/* "Everything included" confirmation below the card */}
              <div className="flex justify-center mt-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-navy/5 px-6 py-2 text-sm font-medium text-navy/70">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Everything included — one simple price
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
