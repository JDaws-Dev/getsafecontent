"use client";

import { ArrowRight, Music, PlaySquare, Search, Shield } from "lucide-react";
import { PRICE_PER_MONTH } from "@/lib/pricing";

interface SignupCTAProps {
  // SafeReads/SafeSpark are accepted (older posts use them) but show the
  // Safe Family plan, since they are no longer offered on their own.
  product?: "SafeTunes" | "SafeTube" | "SafeStudy" | "SafeReads" | "SafeSpark" | "all" | string;
  headline?: string;
  description?: string;
}

const productConfig = {
  SafeTunes: {
    icon: Music,
    color: "from-purple-500 to-indigo-600",
    defaultHeadline: "Take control of what your kids hear",
    defaultDescription:
      "With SafeTunes, your kids only hear songs you've approved. Try it free for 7 days.",
  },
  SafeTube: {
    icon: PlaySquare,
    color: "from-red-500 to-orange-500",
    defaultHeadline: "Make YouTube safe for your kids",
    defaultDescription:
      "With SafeTube, kids only watch channels you've approved. Try it free for 7 days.",
  },
  SafeStudy: {
    icon: Search,
    color: "from-blue-500 to-cyan-500",
    defaultHeadline: "Give your kids a search engine built for them",
    defaultDescription:
      "With SafeStudy, kids search and get homework help safely, and you see every search. Try it free for 7 days.",
  },
  all: {
    icon: Shield,
    color: "from-peach-start to-peach-end",
    defaultHeadline: "Get all three apps for one low price",
    defaultDescription:
      `SafeTunes + SafeTube + SafeStudy. Just ${PRICE_PER_MONTH} for all three. Try free for 7 days.`,
  },
};

export default function SignupCTA({
  product = "all",
  headline,
  description,
}: SignupCTAProps) {
  // Unknown or retired products fall back to the family plan instead of
  // crashing the page.
  const config =
    productConfig[product as keyof typeof productConfig] ?? productConfig.all;
  const Icon = config.icon;

  return (
    <div className="my-8 rounded-2xl bg-gradient-to-br from-navy to-navy-light p-6 sm:p-8 text-white not-prose">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">
            {headline || config.defaultHeadline}
          </h3>
          <p className="text-white/80 text-sm sm:text-base">
            {description || config.defaultDescription}
          </p>
        </div>

        {/* CTA Button */}
        <a
          href="/signup"
          className="btn-peach inline-flex items-center justify-center gap-2 text-base font-medium whitespace-nowrap"
        >
          Start Free Trial
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
