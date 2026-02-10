"use client";

import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

type Verdict = "safe" | "caution" | "warning" | "no_verdict";

export interface VerdictCardAnalysis {
  verdict: Verdict;
  summary: string;
  ageRecommendation?: string;
  reasoning?: string;
}

interface VerdictCardProps {
  analysis: VerdictCardAnalysis;
}

const verdictConfig: Record<
  Verdict,
  {
    label: string;
    icon: typeof ShieldCheck;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    textClass: string;
  }
> = {
  safe: {
    label: "Safe",
    icon: ShieldCheck,
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    badgeClass: "bg-verdict-safe text-white",
    textClass: "text-green-900",
  },
  caution: {
    label: "Caution",
    icon: Shield,
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-200",
    badgeClass: "bg-verdict-caution text-white",
    textClass: "text-yellow-900",
  },
  warning: {
    label: "Warning",
    icon: ShieldAlert,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    badgeClass: "bg-verdict-warning text-white",
    textClass: "text-red-900",
  },
  no_verdict: {
    label: "No Verdict",
    icon: ShieldQuestion,
    bgClass: "bg-gray-50",
    borderClass: "border-gray-200",
    badgeClass: "bg-verdict-none text-white",
    textClass: "text-gray-900",
  },
};

export function VerdictCard({ analysis }: VerdictCardProps) {
  const config = verdictConfig[analysis.verdict];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border ${config.borderClass} ${config.bgClass} p-5`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${config.badgeClass}`}
        >
          <Icon className="h-4 w-4" />
          {config.label}
        </span>
        {analysis.ageRecommendation && (
          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-sm font-medium text-ink-600">
            Ages {analysis.ageRecommendation}
          </span>
        )}
      </div>

      <p className={`mt-3 text-sm leading-relaxed ${config.textClass}`}>
        {analysis.summary}
      </p>

      {analysis.reasoning && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-ink-500 hover:text-ink-700">
            Detailed reasoning
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-ink-600">
            {analysis.reasoning}
          </p>
        </details>
      )}
    </div>
  );
}
