"use client";

import { DemoSong, ContentFlag, ParentVerdict } from "@/data/demoSongs";
import { ShieldCheck, Shield, ShieldAlert, ArrowRight, Clock, Music } from "lucide-react";

interface SongDemoResultProps {
  song: DemoSong;
  compact?: boolean;
}

// Verdict configuration matching SafeTunes styling
const verdictConfig: Record<
  ParentVerdict,
  {
    label: string;
    sublabel: string;
    icon: typeof ShieldCheck;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    textClass: string;
  }
> = {
  approved: {
    label: "Parent Approved",
    sublabel: "Safe for kids",
    icon: ShieldCheck,
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    badgeClass: "bg-green-600 text-white",
    textClass: "text-green-900",
  },
  review: {
    label: "Needs Review",
    sublabel: "Check content first",
    icon: Shield,
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-200",
    badgeClass: "bg-amber-500 text-white",
    textClass: "text-yellow-900",
  },
  not_recommended: {
    label: "Not Recommended",
    sublabel: "Contains mature content",
    icon: ShieldAlert,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    badgeClass: "bg-red-600 text-white",
    textClass: "text-red-900",
  },
};

// Content level configuration
const levelConfig: Record<
  "none" | "mild" | "moderate" | "heavy",
  { label: string; dotClass: string; textClass: string }
> = {
  none: {
    label: "None",
    dotClass: "bg-gray-300",
    textClass: "text-gray-500",
  },
  mild: {
    label: "Mild",
    dotClass: "bg-green-500",
    textClass: "text-gray-700",
  },
  moderate: {
    label: "Moderate",
    dotClass: "bg-amber-500",
    textClass: "text-gray-800",
  },
  heavy: {
    label: "Heavy",
    dotClass: "bg-red-500",
    textClass: "text-gray-900",
  },
};

function ContentFlagItem({ flag }: { flag: ContentFlag }) {
  const config = levelConfig[flag.level];

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
        {flag.level !== "none" && flag.details && (
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            {flag.details}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SongDemoResult({ song, compact = false }: SongDemoResultProps) {
  const verdict = verdictConfig[song.parentVerdict];
  const VerdictIcon = verdict.icon;

  // Compact version for card layout
  if (compact) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Compact header */}
        <div className="flex gap-3 mb-3">
          <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={song.coverUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">{song.title}</h4>
            <p className="text-xs text-gray-500 truncate">{song.artist}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${verdict.badgeClass}`}
              >
                <VerdictIcon className="h-3 w-3" />
                {verdict.label}
              </span>
              {song.isKidzBopVersion && (
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">KB</span>
              )}
            </div>
          </div>
        </div>

        {/* Compact summary */}
        <div className={`p-3 rounded-lg ${verdict.bgClass} mb-3`}>
          <p className={`text-xs leading-relaxed ${verdict.textClass} line-clamp-2`}>
            {song.summary}
          </p>
        </div>

        {/* Compact flags - show top 3 */}
        <div className="space-y-1.5">
          {song.contentFlags.slice(0, 3).map((flag) => {
            const config = levelConfig[flag.level];
            return (
              <div key={flag.category} className="flex items-center gap-2 text-xs">
                <span className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`} />
                <span className={`${config.textClass}`}>{flag.category}</span>
              </div>
            );
          })}
          {song.contentFlags.length > 3 && (
            <p className="text-xs text-gray-400 pl-4">+{song.contentFlags.length - 3} more</p>
          )}
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Song header */}
      <div className="p-6 pb-4 border-b border-gray-100">
        <div className="flex gap-5">
          {/* Album cover */}
          <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={song.coverUrl}
              alt={`Album art for ${song.album}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-gray-900 leading-tight">
              {song.title}
            </h3>
            <p className="text-gray-600 mt-1">{song.artist}</p>
            <p className="text-sm text-gray-500">{song.album}</p>

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {song.duration}
              </span>
              <span>{song.releaseYear}</span>
              {song.isKidzBopVersion && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  Kidz Bop
                </span>
              )}
              {song.hasExplicitVersion && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  Clean version exists
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verdict section */}
      <div className={`px-6 py-4 ${verdict.bgClass} border-b ${verdict.borderClass}`}>
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${verdict.badgeClass}`}
          >
            <VerdictIcon className="h-4 w-4" />
            {verdict.label}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-700">
            Ages {song.ageRecommendation}
          </span>
        </div>
        <p className={`text-sm leading-relaxed ${verdict.textClass}`}>
          {song.summary}
        </p>
      </div>

      {/* Content flags */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Content Analysis</h4>
        <div className="space-y-3">
          {song.contentFlags.map((flag) => (
            <ContentFlagItem key={flag.category} flag={flag} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 text-center">
          <p className="text-gray-700 font-medium mb-2">
            Want to control what your kids listen to?
          </p>
          <p className="text-sm text-gray-500 mb-4">
            SafeTunes lets you approve songs from Apple Music — only what you choose
          </p>
          <a
            href="https://getsafetunes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-purple-200"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
