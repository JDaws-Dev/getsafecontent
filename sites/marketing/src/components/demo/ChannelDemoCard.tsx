"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Sparkles, PlaySquare, ExternalLink, Users, ShieldCheck, Shield, ShieldAlert, ArrowRight } from "lucide-react";

interface ChannelResult {
  id: string;
  name: string;
  handle: string;
  description: string;
  thumbnailUrl: string | null;
  subscriberCount: string;
  videoCount: string;
}

// Types for sample review preview
type SafetyRating = "safe" | "caution" | "not_recommended";
type ContentLevel = "none" | "mild" | "moderate" | "heavy";

interface SampleFlag {
  category: string;
  level: ContentLevel;
}

interface SampleReview {
  rating: SafetyRating;
  ageRecommendation: string;
  flags: SampleFlag[];
}

// Quick pick suggestions for the demo
const QUICK_PICKS = [
  { query: "Mark Rober", label: "Mark Rober" },
  { query: "MrBeast", label: "MrBeast" },
  { query: "Cocomelon", label: "Cocomelon" },
];

// Safety rating configuration matching SafeTube styling
const ratingConfig: Record<
  SafetyRating,
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
    label: "Safe for Kids",
    icon: ShieldCheck,
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    badgeClass: "bg-green-600 text-white",
    textClass: "text-green-900",
  },
  caution: {
    label: "Needs Review",
    icon: Shield,
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-200",
    badgeClass: "bg-amber-500 text-white",
    textClass: "text-yellow-900",
  },
  not_recommended: {
    label: "Not Recommended",
    icon: ShieldAlert,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    badgeClass: "bg-red-600 text-white",
    textClass: "text-red-900",
  },
};

// Content level configuration
const levelConfig: Record<ContentLevel, { label: string; dotClass: string }> = {
  none: { label: "None", dotClass: "bg-gray-300" },
  mild: { label: "Mild", dotClass: "bg-green-500" },
  moderate: { label: "Moderate", dotClass: "bg-amber-500" },
  heavy: { label: "Heavy", dotClass: "bg-red-500" },
};

// Loading skeleton component with analyzing animation
function ResultSkeleton() {
  return (
    <div className="bg-cream rounded-2xl p-4 mb-4">
      <div className="flex gap-3 mb-4">
        <div className="w-14 h-14 bg-gray-200 rounded-full flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-3 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-5 bg-gray-200 rounded-full w-20 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded-full w-14 animate-pulse" />
          </div>
        </div>
      </div>
      {/* Analyzing message */}
      <div className="flex items-center justify-center gap-2 py-4 text-orange-600">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-sm font-medium">Analyzing channel...</span>
      </div>
      <div className="bg-white rounded-xl p-3 border border-cream-dark">
        <div className="h-3 bg-gray-200 rounded w-1/3 mb-3 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-4/6 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Generate sample review based on channel name and subscriber count
function generateSampleReview(channel: ChannelResult): SampleReview {
  const name = channel.name.toLowerCase();
  const desc = channel.description.toLowerCase();

  // Check for kids-focused indicators
  const isKidsChannel =
    name.includes("kids") ||
    name.includes("children") ||
    name.includes("baby") ||
    name.includes("nursery") ||
    name.includes("cartoon") ||
    name.includes("sesame") ||
    name.includes("disney") ||
    name.includes("nickelodeon") ||
    name.includes("paw patrol") ||
    desc.includes("for kids") ||
    desc.includes("children");

  // Check for gaming/entertainment (often needs review)
  const isGaming =
    name.includes("gaming") ||
    name.includes("games") ||
    name.includes("play") ||
    desc.includes("gaming") ||
    desc.includes("gameplay");

  // Check for educational content
  const isEducational =
    name.includes("learn") ||
    name.includes("edu") ||
    name.includes("science") ||
    name.includes("national geographic") ||
    name.includes("crash course") ||
    desc.includes("educational") ||
    desc.includes("learning");

  if (isKidsChannel || isEducational) {
    return {
      rating: "safe",
      ageRecommendation: "All Ages",
      flags: [
        { category: "Violence", level: "none" },
        { category: "Language", level: "none" },
        { category: "Scary Content", level: "none" },
      ],
    };
  }

  if (isGaming) {
    return {
      rating: "caution",
      ageRecommendation: "10+",
      flags: [
        { category: "Violence", level: "mild" },
        { category: "Language", level: "mild" },
        { category: "Mature Themes", level: "none" },
      ],
    };
  }

  // Default - needs review for most general content
  return {
    rating: "caution",
    ageRecommendation: "7+",
    flags: [
      { category: "Language", level: "mild" },
      { category: "Violence", level: "none" },
      { category: "Commercialism", level: "mild" },
    ],
  };
}

// Subcomponent to display the selected channel with sample review preview
function SelectedChannelPreview({ channel, onTryAnother }: { channel: ChannelResult; onTryAnother: () => void }) {
  const sample = generateSampleReview(channel);
  const rating = ratingConfig[sample.rating];
  const RatingIcon = rating.icon;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-cream rounded-2xl p-4 mb-4">
        {/* Channel info header */}
        <div className="flex gap-3 mb-3">
          <div className="w-14 h-14 bg-white rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
            {channel.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <PlaySquare className="h-7 w-7 text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-navy leading-tight line-clamp-1">{channel.name}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {channel.subscriberCount}
              </span>
              <span>{channel.videoCount} videos</span>
            </div>
            {/* Rating badge and age recommendation */}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${rating.badgeClass}`}
              >
                <RatingIcon className="h-3 w-3" />
                {rating.label}
              </span>
              <span className="text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
                Ages {sample.ageRecommendation}
              </span>
            </div>
          </div>
        </div>

        {/* Sample review preview */}
        <div className={`rounded-xl p-3 mb-3 ${rating.bgClass} border ${rating.borderClass}`}>
          <p className={`text-xs leading-relaxed ${rating.textClass}`}>
            <span className="font-semibold">AI Analysis:</span>{" "}
            {sample.rating === "safe"
              ? "This channel appears to be appropriate for kids with family-friendly content."
              : sample.rating === "not_recommended"
              ? "This channel contains content that may not be suitable for younger viewers."
              : "This channel has some content that parents may want to review before allowing."}
          </p>
        </div>

        {/* Sample content flags */}
        <div className="bg-white rounded-xl p-3 border border-cream-dark">
          <p className="text-xs font-semibold text-gray-700 mb-2">Content Flags</p>
          <div className="space-y-1.5">
            {sample.flags.map((flag) => {
              const config = levelConfig[flag.level];
              return (
                <div key={flag.category} className="flex items-center gap-2 text-xs">
                  <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${config.dotClass}`} />
                  <span className="text-gray-600 font-medium w-16">{config.label}</span>
                  <span className="text-gray-500">{flag.category}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-orange-600 mt-2 pt-2 border-t border-cream-dark">
            Full review analyzes recent uploads and channel history
          </p>
        </div>
      </div>

      {/* Try another link */}
      <button
        onClick={onTryAnother}
        className="w-full text-center text-xs text-gray-500 hover:text-orange-600 transition-colors mb-3"
      >
        Search another channel
      </button>
    </div>
  );
}

export default function ChannelDemoCard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChannelResult[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchChannels = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/demo/channels?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.channels || []);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error("Channel search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedChannel(null);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchChannels(value);
    }, 300);
  }, [searchChannels]);

  const handleSelectChannel = useCallback((channel: ChannelResult) => {
    setIsLoadingResult(true);
    setQuery(channel.name);
    setShowDropdown(false);
    // Simulate AI analysis time for better UX
    setTimeout(() => {
      setSelectedChannel(channel);
      setIsLoadingResult(false);
    }, 600);
  }, []);

  const handleQuickPick = useCallback(async (pickQuery: string) => {
    setQuery(pickQuery);
    setSelectedChannel(null);
    setIsLoadingResult(true);
    setShowDropdown(false);

    try {
      const response = await fetch(`/api/demo/channels?q=${encodeURIComponent(pickQuery)}`);
      if (response.ok) {
        const data = await response.json();
        const channels = data.channels || [];
        if (channels.length > 0) {
          // Simulate AI analysis time for better UX, then auto-select first result
          setTimeout(() => {
            setSelectedChannel(channels[0]);
            setIsLoadingResult(false);
          }, 600);
        } else {
          // No results found
          setResults([]);
          setShowDropdown(true);
          setIsLoadingResult(false);
        }
      } else {
        setIsLoadingResult(false);
      }
    } catch (error) {
      console.error("Channel search error:", error);
      setIsLoadingResult(false);
    }
  }, []);

  const handleTryAnother = useCallback(() => {
    setQuery("");
    setSelectedChannel(null);
    setResults([]);
    inputRef.current?.focus();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
      {/* Search input - soft UI */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search any channel..."
            className="w-full pl-10 pr-3 py-3 text-sm rounded-2xl border-2 border-cream-dark bg-cream focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && !selectedChannel && !isLoadingResult && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-lg border border-cream-dark overflow-hidden max-h-56 overflow-y-auto"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {results.slice(0, 5).map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleSelectChannel(channel)}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-cream transition-colors text-left"
              >
                <div className="w-12 h-12 bg-cream-dark rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {channel.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={channel.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <PlaySquare className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy truncate">{channel.name}</p>
                  <p className="text-xs text-gray-500 truncate">{channel.subscriberCount} subscribers</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {showDropdown && query.trim().length >= 2 && results.length === 0 && !isSearching && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-cream-dark p-4 text-center"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <p className="text-sm text-gray-500">No channels found</p>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoadingResult && <ResultSkeleton />}

      {/* Selected channel result */}
      {selectedChannel && !isLoadingResult && (
        <SelectedChannelPreview channel={selectedChannel} onTryAnother={handleTryAnother} />
      )}

      {/* Empty state with quick picks */}
      {!selectedChannel && !showDropdown && !isLoadingResult && (
        <div className="text-center py-6 bg-gradient-to-b from-red-50/50 to-orange-50/50 rounded-2xl border border-orange-100/50">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <PlaySquare className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Know before they watch</p>
          <p className="text-xs text-gray-500 mb-4">Click a popular channel or search any name</p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick.query}
                onClick={() => handleQuickPick(pick.query)}
                className="text-xs px-3 py-2 bg-white border border-cream-dark rounded-full text-gray-700 font-medium hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50 transition-all shadow-sm"
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA - More prominent after result */}
      <div className="mt-4 pt-4 border-t border-cream-dark">
        <a
          href="https://getsafetube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full font-medium transition-all shadow-sm hover:shadow-md hover:scale-[1.02] text-sm"
        >
          {selectedChannel ? (
            <>
              Build your safe channel list
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Try SafeTube Free
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </a>
        {selectedChannel && (
          <p className="text-xs text-center text-gray-500 mt-2">
            7-day free trial - works with any YouTube content
          </p>
        )}
      </div>
    </div>
  );
}
