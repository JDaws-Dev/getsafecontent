"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Sparkles, Book, ExternalLink, ShieldCheck, Shield, ShieldAlert, ArrowRight } from "lucide-react";

interface BookResult {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  categories: string[];
}

// Sample verdict types matching SafeReads
type Verdict = "safe" | "caution" | "warning";
type Severity = "none" | "mild" | "moderate" | "heavy";

interface SampleFlag {
  category: string;
  severity: Severity;
}

interface SampleVerdict {
  verdict: Verdict;
  ageRecommendation: string;
  flags: SampleFlag[];
}

// Quick pick suggestions for the demo
const QUICK_PICKS = [
  { query: "Harry Potter", label: "Harry Potter" },
  { query: "Diary of a Wimpy Kid", label: "Wimpy Kid" },
  { query: "Percy Jackson", label: "Percy Jackson" },
];

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
const severityConfig: Record<Severity, { label: string; dotClass: string }> = {
  none: { label: "None", dotClass: "bg-gray-300" },
  mild: { label: "Mild", dotClass: "bg-[#22763f]" },
  moderate: { label: "Moderate", dotClass: "bg-[#b7791f]" },
  heavy: { label: "Heavy", dotClass: "bg-[#c53030]" },
};

// Loading skeleton component with analyzing animation
function ResultSkeleton() {
  return (
    <div className="bg-cream rounded-2xl p-4 mb-4">
      <div className="flex gap-3 mb-4">
        <div className="w-14 h-20 bg-gray-200 rounded-xl flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-3 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded-full w-14 animate-pulse" />
          </div>
        </div>
      </div>
      {/* Analyzing message */}
      <div className="flex items-center justify-center gap-2 py-4 text-emerald-600">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-sm font-medium">Analyzing content...</span>
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

// Check if text contains non-Latin characters (for filtering non-English results)
function containsNonLatinChars(text: string): boolean {
  // Match characters outside basic Latin and Latin Extended ranges
  // Allows: A-Z, a-z, numbers, punctuation, accented Latin chars (é, ñ, etc.)
  const latinPattern = /^[\u0000-\u024F\u1E00-\u1EFF\s\d\p{P}]+$/u;
  return !latinPattern.test(text);
}

// Filter results to only include English/Latin-script books
function filterEnglishBooks(books: BookResult[]): BookResult[] {
  return books.filter((book) => {
    // Check title and author for non-Latin characters
    if (containsNonLatinChars(book.title)) return false;
    if (containsNonLatinChars(book.author)) return false;
    return true;
  });
}

// Generate content-specific analysis text based on book and verdict
function generateAnalysisText(book: BookResult, verdict: Verdict, categories: string[]): string {
  const lowerCats = categories.map((c) => c.toLowerCase()).join(" ");
  const title = book.title.split(":")[0].trim(); // Get main title before colon

  // Kid-focused categories - safe
  if (verdict === "safe") {
    if (lowerCats.includes("picture book") || lowerCats.includes("early reader")) {
      return `"${title}" is a gentle read appropriate for young children with no concerning content detected.`;
    }
    return `"${title}" contains age-appropriate content suitable for younger readers.`;
  }

  // Warning - more serious content
  if (verdict === "warning") {
    if (lowerCats.includes("horror")) {
      return `"${title}" contains horror elements including scary content and intense themes that may not be suitable for younger readers.`;
    }
    if (lowerCats.includes("thriller") || lowerCats.includes("crime")) {
      return `"${title}" deals with mature themes including violence and dark subject matter best suited for older teens.`;
    }
    return `"${title}" contains mature content that parents should review before allowing younger readers access.`;
  }

  // Caution - varied content
  if (lowerCats.includes("fantasy")) {
    return `"${title}" contains fantasy elements including magic and supernatural themes. Some peril and conflict present.`;
  }
  if (lowerCats.includes("young adult") || lowerCats.includes("ya")) {
    return `"${title}" explores teen themes including relationships and emotional challenges appropriate for older kids.`;
  }
  if (lowerCats.includes("adventure")) {
    return `"${title}" features adventure and action sequences with mild peril and conflict throughout.`;
  }
  if (lowerCats.includes("science fiction")) {
    return `"${title}" contains sci-fi elements and speculative themes. Some action and mild tension present.`;
  }

  // Default caution
  return `"${title}" has content that parents may want to preview. See detailed flags below.`;
}

// Generate sample verdict based on book categories
function generateSampleVerdict(categories: string[]): SampleVerdict {
  const lowerCats = categories.map((c) => c.toLowerCase()).join(" ");

  // Kid-focused categories - likely safe
  if (
    lowerCats.includes("juvenile") ||
    lowerCats.includes("children") ||
    lowerCats.includes("picture book") ||
    lowerCats.includes("early reader")
  ) {
    return {
      verdict: "safe",
      ageRecommendation: "4+",
      flags: [
        { category: "Violence", severity: "none" },
        { category: "Language", severity: "none" },
        { category: "Scary Content", severity: "mild" },
      ],
    };
  }

  // Young adult - likely caution
  if (
    lowerCats.includes("young adult") ||
    lowerCats.includes("ya") ||
    lowerCats.includes("teen")
  ) {
    return {
      verdict: "caution",
      ageRecommendation: "13+",
      flags: [
        { category: "Violence", severity: "mild" },
        { category: "Romance", severity: "moderate" },
        { category: "Dark Themes", severity: "mild" },
      ],
    };
  }

  // Fantasy/adventure - mixed
  if (
    lowerCats.includes("fantasy") ||
    lowerCats.includes("adventure") ||
    lowerCats.includes("science fiction")
  ) {
    return {
      verdict: "caution",
      ageRecommendation: "10+",
      flags: [
        { category: "Violence", severity: "moderate" },
        { category: "Supernatural", severity: "mild" },
        { category: "Dark Themes", severity: "mild" },
      ],
    };
  }

  // Horror/thriller - warning
  if (
    lowerCats.includes("horror") ||
    lowerCats.includes("thriller") ||
    lowerCats.includes("crime")
  ) {
    return {
      verdict: "warning",
      ageRecommendation: "16+",
      flags: [
        { category: "Violence", severity: "heavy" },
        { category: "Scary Content", severity: "heavy" },
        { category: "Dark Themes", severity: "moderate" },
      ],
    };
  }

  // Default - caution with middle-grade recommendation
  return {
    verdict: "caution",
    ageRecommendation: "10+",
    flags: [
      { category: "Themes", severity: "mild" },
      { category: "Language", severity: "none" },
      { category: "Violence", severity: "mild" },
    ],
  };
}

// Subcomponent to display the selected book with sample verdict preview
function SelectedBookPreview({ book, onTryAnother }: { book: BookResult; onTryAnother: () => void }) {
  const sample = generateSampleVerdict(book.categories);
  const verdict = verdictConfig[sample.verdict];
  const VerdictIcon = verdict.icon;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Book info card */}
      <div className="bg-cream rounded-2xl p-4 mb-4">
        {/* Book info header */}
        <div className="flex gap-3 mb-3">
          <div className="w-14 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Book className="h-7 w-7 text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-navy leading-tight line-clamp-2">{book.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
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

        {/* Sample verdict preview */}
        <div className={`rounded-xl p-3 mb-3 ${verdict.bgClass} border ${verdict.borderClass}`}>
          <p className={`text-xs leading-relaxed ${verdict.textClass}`}>
            <span className="font-semibold">AI Analysis:</span> {generateAnalysisText(book, sample.verdict, book.categories)}
          </p>
        </div>

        {/* Sample content flags */}
        <div className="bg-white rounded-xl p-3 border border-cream-dark">
          <p className="text-xs font-semibold text-gray-700 mb-2">Content Flags</p>
          <div className="space-y-1.5">
            {sample.flags.map((flag) => {
              const config = severityConfig[flag.severity];
              return (
                <div key={flag.category} className="flex items-center gap-2 text-xs">
                  <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${config.dotClass}`} />
                  <span className="text-gray-600 font-medium w-16">{config.label}</span>
                  <span className="text-gray-500">{flag.category}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-emerald-600 mt-2 pt-2 border-t border-cream-dark">
            Full report includes 10+ categories with detailed explanations
          </p>
        </div>
      </div>

      {/* Try another link */}
      <button
        onClick={onTryAnother}
        className="w-full text-center text-xs text-gray-500 hover:text-emerald-600 transition-colors mb-3"
      >
        Search another book
      </button>
    </div>
  );
}

export default function BookDemoCard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchBooks = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/demo/books?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out non-English/non-Latin results
        const filteredBooks = filterEnglishBooks(data.books || []);
        setResults(filteredBooks);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error("Book search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedBook(null);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchBooks(value);
    }, 300);
  }, [searchBooks]);

  const handleSelectBook = useCallback((book: BookResult) => {
    setIsLoadingResult(true);
    setQuery(book.title);
    setShowDropdown(false);
    // Simulate AI analysis time for better UX
    setTimeout(() => {
      setSelectedBook(book);
      setIsLoadingResult(false);
    }, 600);
  }, []);

  const handleQuickPick = useCallback(async (pickQuery: string) => {
    setQuery(pickQuery);
    setSelectedBook(null);
    setIsLoadingResult(true);
    setShowDropdown(false);

    try {
      const response = await fetch(`/api/demo/books?q=${encodeURIComponent(pickQuery)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out non-English/non-Latin results
        const books = filterEnglishBooks(data.books || []);
        if (books.length > 0) {
          // Simulate AI analysis time for better UX, then auto-select first result
          setTimeout(() => {
            setSelectedBook(books[0]);
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
      console.error("Book search error:", error);
      setIsLoadingResult(false);
    }
  }, []);

  const handleTryAnother = useCallback(() => {
    setQuery("");
    setSelectedBook(null);
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
            placeholder="Search any book..."
            className="w-full pl-10 pr-3 py-3 text-sm rounded-2xl border-2 border-cream-dark bg-cream focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && !selectedBook && !isLoadingResult && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-lg border border-cream-dark overflow-hidden max-h-56 overflow-y-auto"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {results.slice(0, 5).map((book) => (
              <button
                key={book.id}
                onClick={() => handleSelectBook(book)}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-cream transition-colors text-left"
              >
                <div className="w-10 h-14 bg-cream-dark rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Book className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy truncate">{book.title}</p>
                  <p className="text-xs text-gray-500 truncate">{book.author}</p>
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
            <p className="text-sm text-gray-500">No books found</p>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoadingResult && <ResultSkeleton />}

      {/* Selected book result */}
      {selectedBook && !isLoadingResult && (
        <SelectedBookPreview book={selectedBook} onTryAnother={handleTryAnother} />
      )}

      {/* Empty state with quick picks */}
      {!selectedBook && !showDropdown && !isLoadingResult && (
        <div className="text-center py-6 bg-gradient-to-b from-emerald-50/50 to-teal-50/50 rounded-2xl border border-emerald-100/50">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Book className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Know before they read</p>
          <p className="text-xs text-gray-500 mb-4">Click a popular book or search any title</p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick.query}
                onClick={() => handleQuickPick(pick.query)}
                className="text-xs px-3 py-2 bg-white border border-cream-dark rounded-full text-gray-700 font-medium hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm"
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
          href="https://getsafereads.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-medium transition-all shadow-sm hover:shadow-md hover:scale-[1.02] ${
            selectedBook ? "text-sm" : "text-sm"
          }`}
        >
          {selectedBook ? (
            <>
              Analyze any book free
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Try SafeReads Free
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </a>
        {selectedBook && (
          <p className="text-xs text-center text-gray-500 mt-2">
            7-day free trial - no credit card required
          </p>
        )}
      </div>
    </div>
  );
}
