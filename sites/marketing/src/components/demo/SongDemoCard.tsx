"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Sparkles, Music, ExternalLink, ShieldCheck, Shield, ShieldAlert, ArrowRight } from "lucide-react";

interface SongResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  isExplicit: boolean;
  genre: string | null;
  durationMs: number | null;
}

// Types for sample review preview
type ParentVerdict = "approved" | "review" | "not_recommended";
type ContentLevel = "none" | "mild" | "moderate" | "heavy";

interface SampleFlag {
  category: string;
  level: ContentLevel;
}

interface SampleReview {
  verdict: ParentVerdict;
  ageRecommendation: string;
  flags: SampleFlag[];
}

// Quick pick suggestions for the demo
const QUICK_PICKS = [
  { query: "Let It Go", label: "Let It Go" },
  { query: "Taylor Swift", label: "Taylor Swift" },
  { query: "Bruno Mars", label: "Bruno Mars" },
];

// Verdict configuration matching SafeTunes styling
const verdictConfig: Record<
  ParentVerdict,
  {
    label: string;
    icon: typeof ShieldCheck;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    textClass: string;
  }
> = {
  approved: {
    label: "Parent Approved",
    icon: ShieldCheck,
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    badgeClass: "bg-green-600 text-white",
    textClass: "text-green-900",
  },
  review: {
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
        <div className="w-14 h-14 bg-gray-200 rounded-xl flex-shrink-0 animate-pulse" />
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
      <div className="flex items-center justify-center gap-2 py-4 text-purple-600">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-sm font-medium">Analyzing lyrics...</span>
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

// Generate sample review based on explicit flag and genre
function generateSampleReview(song: SongResult): SampleReview {
  const genre = (song.genre || "").toLowerCase();

  if (song.isExplicit) {
    // Explicit songs get "Not Recommended" or "Needs Review"
    if (genre.includes("hip hop") || genre.includes("rap") || genre.includes("r&b")) {
      return {
        verdict: "not_recommended",
        ageRecommendation: "16+",
        flags: [
          { category: "Language", level: "heavy" },
          { category: "Sexual Content", level: "moderate" },
          { category: "Substance References", level: "mild" },
        ],
      };
    }
    return {
      verdict: "not_recommended",
      ageRecommendation: "16+",
      flags: [
        { category: "Language", level: "heavy" },
        { category: "Mature Themes", level: "moderate" },
        { category: "Violence", level: "mild" },
      ],
    };
  }

  // Clean songs - check genre for appropriate rating
  if (genre.includes("children") || genre.includes("kids") || genre.includes("disney")) {
    return {
      verdict: "approved",
      ageRecommendation: "All Ages",
      flags: [
        { category: "Language", level: "none" },
        { category: "Themes", level: "none" },
        { category: "Violence", level: "none" },
      ],
    };
  }

  if (genre.includes("pop") || genre.includes("rock")) {
    return {
      verdict: "review",
      ageRecommendation: "10+",
      flags: [
        { category: "Language", level: "mild" },
        { category: "Romance", level: "mild" },
        { category: "Themes", level: "none" },
      ],
    };
  }

  // Default - needs review
  return {
    verdict: "review",
    ageRecommendation: "10+",
    flags: [
      { category: "Language", level: "mild" },
      { category: "Themes", level: "mild" },
      { category: "Romance", level: "none" },
    ],
  };
}

// Subcomponent to display the selected song with sample review preview
function SelectedSongPreview({ song, onTryAnother }: { song: SongResult; onTryAnother: () => void }) {
  const sample = generateSampleReview(song);
  const verdict = verdictConfig[sample.verdict];
  const VerdictIcon = verdict.icon;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-cream rounded-2xl p-4 mb-4">
        {/* Song info header */}
        <div className="flex gap-3 mb-3">
          <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
            {song.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="h-7 w-7 text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-navy leading-tight line-clamp-1">{song.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{song.artist}</p>
            {/* Verdict badge and age recommendation */}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${verdict.badgeClass}`}
              >
                <VerdictIcon className="h-3 w-3" />
                {verdict.label}
              </span>
              <span className="text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
                Ages {sample.ageRecommendation}
              </span>
            </div>
          </div>
        </div>

        {/* Sample review preview */}
        <div className={`rounded-xl p-3 mb-3 ${verdict.bgClass} border ${verdict.borderClass}`}>
          <p className={`text-xs leading-relaxed ${verdict.textClass}`}>
            <span className="font-semibold">AI Analysis:</span>{" "}
            {sample.verdict === "approved"
              ? "This song appears appropriate for all ages with no concerning content detected."
              : sample.verdict === "not_recommended"
              ? "This song contains explicit content that may not be suitable for younger listeners."
              : "This song has some content that parents may want to review before sharing."}
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
          <p className="text-xs text-purple-600 mt-2 pt-2 border-t border-cream-dark">
            Full review includes AI lyric analysis and content breakdown
          </p>
        </div>
      </div>

      {/* Try another link */}
      <button
        onClick={onTryAnother}
        className="w-full text-center text-xs text-gray-500 hover:text-purple-600 transition-colors mb-3"
      >
        Search another song
      </button>
    </div>
  );
}

export default function SongDemoCard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongResult[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchSongs = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/demo/songs?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.songs || []);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error("Song search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedSong(null);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchSongs(value);
    }, 300);
  }, [searchSongs]);

  const handleSelectSong = useCallback((song: SongResult) => {
    setIsLoadingResult(true);
    setQuery(song.title);
    setShowDropdown(false);
    // Simulate AI analysis time for better UX
    setTimeout(() => {
      setSelectedSong(song);
      setIsLoadingResult(false);
    }, 600);
  }, []);

  const handleQuickPick = useCallback(async (pickQuery: string) => {
    setQuery(pickQuery);
    setSelectedSong(null);
    setIsLoadingResult(true);
    setShowDropdown(false);

    try {
      const response = await fetch(`/api/demo/songs?q=${encodeURIComponent(pickQuery)}`);
      if (response.ok) {
        const data = await response.json();
        const songs = data.songs || [];
        if (songs.length > 0) {
          // Simulate AI analysis time for better UX, then auto-select first result
          setTimeout(() => {
            setSelectedSong(songs[0]);
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
      console.error("Song search error:", error);
      setIsLoadingResult(false);
    }
  }, []);

  const handleTryAnother = useCallback(() => {
    setQuery("");
    setSelectedSong(null);
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
            placeholder="Search any song..."
            className="w-full pl-10 pr-3 py-3 text-sm rounded-2xl border-2 border-cream-dark bg-cream focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && !selectedSong && !isLoadingResult && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-lg border border-cream-dark overflow-hidden max-h-56 overflow-y-auto"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {results.slice(0, 5).map((song) => (
              <button
                key={song.id}
                onClick={() => handleSelectSong(song)}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-cream transition-colors text-left"
              >
                <div className="w-12 h-12 bg-cream-dark rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {song.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Music className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy truncate">{song.title}</p>
                  <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                </div>
                {song.isExplicit && (
                  <span className="flex-shrink-0 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                    E
                  </span>
                )}
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
            <p className="text-sm text-gray-500">No songs found</p>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoadingResult && <ResultSkeleton />}

      {/* Selected song result */}
      {selectedSong && !isLoadingResult && (
        <SelectedSongPreview song={selectedSong} onTryAnother={handleTryAnother} />
      )}

      {/* Empty state with quick picks */}
      {!selectedSong && !showDropdown && !isLoadingResult && (
        <div className="text-center py-6 bg-gradient-to-b from-purple-50/50 to-pink-50/50 rounded-2xl border border-purple-100/50">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
            <Music className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Know before they listen</p>
          <p className="text-xs text-gray-500 mb-4">Click a popular song or search any title</p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick.query}
                onClick={() => handleQuickPick(pick.query)}
                className="text-xs px-3 py-2 bg-white border border-cream-dark rounded-full text-gray-700 font-medium hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50 transition-all shadow-sm"
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
          href="https://getsafetunes.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium transition-all shadow-sm hover:shadow-md hover:scale-[1.02] text-sm"
        >
          {selectedSong ? (
            <>
              Build your safe playlist
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Try SafeTunes Free
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </a>
        {selectedSong && (
          <p className="text-xs text-center text-gray-500 mt-2">
            7-day free trial - works with Apple Music
          </p>
        )}
      </div>
    </div>
  );
}
