"use client";

import { DemoChannel, ContentFlag, SafetyRating } from "@/data/demoChannels";
import { ShieldCheck, Shield, ShieldAlert, ArrowRight, Users, Video, CheckCircle2, Play, Baby } from "lucide-react";

interface ChannelDemoResultProps {
  channel: DemoChannel;
  compact?: boolean;
}

// Safety rating configuration matching SafeTube styling
const ratingConfig: Record<
  SafetyRating,
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
  safe: {
    label: "Safe for Kids",
    sublabel: "Appropriate content",
    icon: ShieldCheck,
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    badgeClass: "bg-green-600 text-white",
    textClass: "text-green-900",
  },
  caution: {
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

export default function ChannelDemoResult({ channel, compact = false }: ChannelDemoResultProps) {
  const rating = ratingConfig[channel.safetyRating];
  const RatingIcon = rating.icon;

  // Compact version for card layout
  if (compact) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Compact header */}
        <div className="flex gap-3 mb-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={channel.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="font-semibold text-sm text-gray-900 truncate">{channel.name}</h4>
              {channel.isVerified && (
                <CheckCircle2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{channel.subscriberCount}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${rating.badgeClass}`}
              >
                <RatingIcon className="h-3 w-3" />
                {rating.label}
              </span>
              {channel.isKidsFocused && (
                <Baby className="h-3 w-3 text-blue-500" />
              )}
            </div>
          </div>
        </div>

        {/* Compact summary */}
        <div className={`p-3 rounded-lg ${rating.bgClass} mb-3`}>
          <p className={`text-xs leading-relaxed ${rating.textClass} line-clamp-2`}>
            {channel.summary}
          </p>
        </div>

        {/* Compact flags - show top 3 */}
        <div className="space-y-1.5">
          {channel.contentFlags.slice(0, 3).map((flag) => {
            const config = levelConfig[flag.level];
            return (
              <div key={flag.category} className="flex items-center gap-2 text-xs">
                <span className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`} />
                <span className={`${config.textClass}`}>{flag.category}</span>
              </div>
            );
          })}
          {channel.contentFlags.length > 3 && (
            <p className="text-xs text-gray-400 pl-4">+{channel.contentFlags.length - 3} more</p>
          )}
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Channel header */}
      <div className="p-6 pb-4 border-b border-gray-100">
        <div className="flex gap-5">
          {/* Channel thumbnail */}
          <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={channel.thumbnailUrl}
              alt={`${channel.name} channel thumbnail`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>

          {/* Channel info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xl text-gray-900 leading-tight truncate">
                {channel.name}
              </h3>
              {channel.isVerified && (
                <CheckCircle2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-gray-500 mt-0.5">{channel.handle}</p>

            {/* Meta info */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {channel.subscriberCount}
              </span>
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                {channel.videoCount} videos
              </span>
              {channel.isKidsFocused && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                  <Baby className="h-3 w-3" />
                  Made for Kids
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Safety rating section */}
      <div className={`px-6 py-4 ${rating.bgClass} border-b ${rating.borderClass}`}>
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${rating.badgeClass}`}
          >
            <RatingIcon className="h-4 w-4" />
            {rating.label}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-700">
            Ages {channel.ageRecommendation}
          </span>
        </div>
        <p className={`text-sm leading-relaxed ${rating.textClass}`}>
          {channel.summary}
        </p>
      </div>

      {/* Content flags */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="font-semibold text-gray-900 mb-4">Content Analysis</h4>
        <div className="space-y-3">
          {channel.contentFlags.map((flag) => (
            <ContentFlagItem key={flag.category} flag={flag} />
          ))}
        </div>
      </div>

      {/* Recent videos preview */}
      <div className="px-6 py-4 bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Recent Uploads</h4>
        <div className="space-y-2">
          {channel.recentVideos.map((video, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <Play className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 truncate flex-1">{video.title}</span>
              <span className="text-gray-400 text-xs flex-shrink-0">{video.views} views</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6 pt-4">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 text-center">
          <p className="text-gray-700 font-medium mb-2">
            Want to control what your kids watch?
          </p>
          <p className="text-sm text-gray-500 mb-4">
            SafeTube lets you approve channels and videos — only what you choose
          </p>
          <a
            href="https://getsafetube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-orange-200"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
