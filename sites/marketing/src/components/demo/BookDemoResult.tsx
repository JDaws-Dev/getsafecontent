"use client";

import { DemoBook, ContentFlag, Severity, Verdict } from "@/data/demoBooks";
import { Shield, ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";

interface BookDemoResultProps {
  book: DemoBook;
  compact?: boolean;
}

// Verdict configuration matching SafeReads styling
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
    badgeClass: "bg-[#22763f] text-white",
    textClass: "text-green-900",
  },
  caution: {
    label: "Caution",
    icon: Shield,
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-200",
    badgeClass: "bg-[#b7791f] text-white",
    textClass: "text-yellow-900",
  },
  warning: {
    label: "Warning",
    icon: ShieldAlert,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    badgeClass: "bg-[#c53030] text-white",
    textClass: "text-red-900",
  },
};

// Severity configuration matching SafeReads styling
const severityConfig: Record<
  Severity,
  { label: string; dotClass: string; textClass: string }
> = {
  none: {
    label: "None",
    dotClass: "bg-gray-300",
    textClass: "text-gray-500",
  },
  mild: {
    label: "Mild",
    dotClass: "bg-[#22763f]",
    textClass: "text-gray-700",
  },
  moderate: {
    label: "Moderate",
    dotClass: "bg-[#b7791f]",
    textClass: "text-gray-800",
  },
  heavy: {
    label: "Heavy",
    dotClass: "bg-[#c53030]",
    textClass: "text-gray-900",
  },
};

function ContentFlagItem({ flag }: { flag: ContentFlag }) {
  const config = severityConfig[flag.severity];

  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-2 pt-0.5 min-w-[90px]">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {config.label}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <span className={`text-sm font-medium ${config.textClass}`}>
          {flag.category}
        </span>
        {flag.severity !== "none" && flag.details && (
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            {flag.details}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BookDemoResult({ book, compact = false }: BookDemoResultProps) {
  const verdict = verdictConfig[book.verdict];
  const VerdictIcon = verdict.icon;

  // Compact version for card layout
  if (compact) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Compact header */}
        <div className="flex gap-3 mb-3">
          <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.coverUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">{book.title}</h4>
            <p className="text-xs text-gray-500 truncate">{book.author}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${verdict.badgeClass}`}
              >
                <VerdictIcon className="h-3 w-3" />
                {verdict.label}
              </span>
              <span className="text-xs text-gray-500">Ages {book.ageRecommendation}</span>
            </div>
          </div>
        </div>

        {/* Compact summary */}
        <div className={`p-3 rounded-lg ${verdict.bgClass} mb-3`}>
          <p className={`text-xs leading-relaxed ${verdict.textClass} line-clamp-2`}>
            {book.summary}
          </p>
        </div>

        {/* Compact flags - show top 3 */}
        <div className="space-y-1.5">
          {book.contentFlags.slice(0, 3).map((flag) => {
            const config = severityConfig[flag.severity];
            return (
              <div key={flag.category} className="flex items-center gap-2 text-xs">
                <span className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`} />
                <span className={`${config.textClass}`}>{flag.category}</span>
              </div>
            );
          })}
          {book.contentFlags.length > 3 && (
            <p className="text-xs text-gray-400 pl-4">+{book.contentFlags.length - 3} more flags</p>
          )}
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Book header */}
      <div className="p-6 pb-4 border-b border-gray-100">
        <div className="flex gap-5">
          {/* Book cover */}
          <div className="w-24 h-36 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-gray-900 leading-tight">
              {book.title}
            </h3>
            <p className="text-gray-600 mt-1">{book.author}</p>

            {/* Verdict and age badges */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${verdict.badgeClass}`}
              >
                <VerdictIcon className="h-4 w-4" />
                {verdict.label}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                Ages {book.ageRecommendation}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary section */}
      <div className={`p-5 ${verdict.bgClass} border-b ${verdict.borderClass}`}>
        <p className={`text-sm leading-relaxed ${verdict.textClass}`}>
          {book.summary}
        </p>
      </div>

      {/* Content flags */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Content Flags</h4>
        <div className="space-y-3">
          {book.contentFlags.map((flag) => (
            <ContentFlagItem key={flag.category} flag={flag} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 text-center">
          <p className="text-gray-700 font-medium mb-2">
            Want full reports on any book?
          </p>
          <p className="text-sm text-gray-500 mb-4">
            SafeReads analyzes 10+ content categories with detailed explanations
          </p>
          <a
            href="https://getsafereads.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-200"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
