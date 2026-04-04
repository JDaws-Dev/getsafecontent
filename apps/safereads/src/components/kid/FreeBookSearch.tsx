"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Search, Loader2, Sparkles, Headphones } from "lucide-react";
import { FreeBookRequestButton } from "./FreeBookRequestButton";
import { StylizedCover } from "./StylizedCover";
import { AudioIndicator } from "./SourceBadge";
import Image from "next/image";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCoverFetcher } from "@/hooks/useCoverFetcher";

interface FreeBookSearchProps {
  kidId: Id<"kids">;
  /** If true, only show results with audio available */
  audioOnly?: boolean;
  /** Pre-fill search query and auto-search on mount */
  initialQuery?: string | null;
}

interface FreeBookResult {
  id: string;
  title: string;
  authors: string[];
  subjects?: string[];
  bookshelves?: string[];
  coverUrl?: string;
  formats: {
    html?: string;
    epub?: string;
    txt?: string;
  };
  downloadCount?: number;
  source: "gutenberg" | "bloom" | "lit2go" | "librivox" | "bookdash" | "storyweaver";
  hasAudio?: boolean;
  totalTime?: string;
  readingLevel?: string;
  ageRange?: string;
  description?: string;
}

export function FreeBookSearch({ kidId, audioOnly, initialQuery }: FreeBookSearchProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || "");
  const [results, setResults] = useState<FreeBookResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchAllSources = useAction(api.freeBooks.searchAllSources);
  // Keep the single-source search as fallback
  const searchFreeBooks = useAction(api.freeBooks.searchFreeBooks);

  // Build book identifiers for cover cache lookup
  const bookIdentifiers = useMemo(
    () => results.map((b) => b.id.replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "")),
    [results]
  );

  // Batch lookup cached covers for search results
  const cachedCovers = useQuery(
    api.bookCovers.getCachedCovers,
    bookIdentifiers.length > 0 ? { bookIdentifiers } : "skip"
  );

  // Background cover fetching for search results without cached covers
  const booksForCoverFetch = useMemo(
    () =>
      results.map((b) => {
        const rawId = b.id.replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "");
        return {
          identifier: rawId,
          title: b.title,
          author: b.authors?.join(", ") || "Unknown",
          hasCachedCover: !!cachedCovers?.[rawId]?.coverUrl,
          hasSourceCover: !!b.coverUrl && !b.coverUrl.includes("gutenberg.org"),
        };
      }),
    [results, cachedCovers]
  );
  useCoverFetcher(booksForCoverFetch);

  // Get approved books to check status
  const approvedBooks = useQuery(api.approvedBooks.listForKid, { kidId });
  const kidRequests = useQuery(api.bookRequests.listByKid, { kidId });

  // Build lookup maps using gutenbergId
  const approvedGutenbergIds = new Set(
    (approvedBooks || [])
      .filter((b) => b.gutenbergId)
      .map((b) => b.gutenbergId)
  );
  const requestStatusByGutenberg = new Map(
    (kidRequests || [])
      .filter((r) => r.gutenbergId)
      .map((r) => [r.gutenbergId, r.status])
  );

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute search
  const doSearch = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      // Try unified multi-source search first
      const searchResults = await searchAllSources({
        query: debouncedQuery,
        childrenOnly: true,
        includeAudioOnly: audioOnly,
      });
      setResults((searchResults || []) as unknown as FreeBookResult[]);
    } catch (err) {
      console.error("Multi-source search failed, falling back to Gutenberg:", err);
      // Fallback to Gutenberg-only search
      try {
        const fallbackResults = await searchFreeBooks({
          query: debouncedQuery,
          childrenOnly: true,
        });
        setResults((fallbackResults || []) as unknown as FreeBookResult[]);
      } catch (fallbackErr) {
        console.error("Fallback search also failed:", fallbackErr);
        setResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, searchAllSources, searchFreeBooks, audioOnly]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  /** Get the raw ID stripped of source prefix for lookups */
  function getRawId(book: FreeBookResult): string {
    return book.id.replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "");
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[#FEF7EE] via-[#FEF7EE] to-transparent pb-4 pt-2">
        <div className="relative">
          {audioOnly ? (
            <Headphones className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-400" />
          ) : (
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              audioOnly
                ? "Search audiobooks..."
                : "Search free books from all sources..."
            }
            className="w-full rounded-2xl border-2 border-purple-100 bg-white py-4 pl-12 pr-4 text-base font-medium text-gray-900 shadow-md shadow-purple-50 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-3 focus:ring-purple-100"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-purple-500" />
          )}
        </div>
      </div>

      {/* Results */}
      {isSearching && results.length === 0 && (
        <div className="flex flex-col items-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-500">
            {audioOnly ? "Searching audiobooks..." : "Searching all sources..."}
          </p>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Search className="h-8 w-8 text-gray-300" />
          </div>
          <p className="mt-4 text-lg font-bold text-gray-600">
            No {audioOnly ? "audiobooks" : "free books"} found
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Try a different title or author
          </p>
        </div>
      )}

      {!hasSearched && !isSearching && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-200">
            {audioOnly ? (
              <Headphones className="h-10 w-10 text-violet-500" />
            ) : (
              <Sparkles className="h-10 w-10 text-emerald-500" />
            )}
          </div>
          <p className="mt-5 text-xl font-bold text-gray-800">
            {audioOnly ? "Audiobooks" : "Find Books"}
          </p>
          <p className="mt-2 max-w-xs text-sm text-gray-400">
            {audioOnly
              ? "Search thousands of audiobooks. Listen right in the app!"
              : "Search for books to read. Type a title, author, or topic!"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((book) => {
          const rawId = getRawId(book);
          return (
            <div
              key={book.id}
              className="flex gap-3.5 rounded-2xl border-2 border-transparent bg-white p-3.5 shadow-md ring-1 ring-black/5 transition-all duration-200 hover:border-purple-100 hover:shadow-lg"
            >
              {/* Cover */}
              <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm">
                {(() => {
                  const cachedUrl = cachedCovers?.[rawId]?.coverUrl;
                  const displayUrl = cachedUrl || book.coverUrl;
                  if (displayUrl) {
                    return (
                      <Image
                        src={displayUrl}
                        alt={book.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    );
                  }
                  return (
                    <StylizedCover
                      title={book.title}
                      author={book.authors.join(", ") || "Unknown"}
                      size="sm"
                    />
                  );
                })()}
                {/* Audio indicator overlay */}
                {(book.hasAudio || book.source === "librivox" || book.source === "lit2go") && (
                  <div className="absolute right-1 top-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[8px] text-white shadow-sm">
                      {"\uD83C\uDFA7"}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <h3 className="line-clamp-2 text-sm font-bold text-gray-900">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-gray-400">
                    {book.authors.join(", ") || "Unknown Author"}
                  </p>

                  {/* Metadata row */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {(book.hasAudio || book.source === "librivox" || book.source === "lit2go") && (
                      <AudioIndicator />
                    )}
                    {book.totalTime && (
                      <span className="text-[9px] font-medium text-gray-400">
                        {book.totalTime}
                      </span>
                    )}
                    {book.readingLevel && (
                      <span className="text-[9px] font-medium text-gray-400">
                        Level {book.readingLevel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-end">

                  {/* Only show request button for Gutenberg books (others need different handling) */}
                  {book.source === "gutenberg" && (
                    <FreeBookRequestButton
                      kidId={kidId}
                      gutenbergId={rawId}
                      title={book.title}
                      author={book.authors.join(", ") || "Unknown Author"}
                      coverUrl={book.coverUrl}
                      requestStatus={requestStatusByGutenberg.get(rawId) || null}
                      isApproved={approvedGutenbergIds.has(rawId)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
