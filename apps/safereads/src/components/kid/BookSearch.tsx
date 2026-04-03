"use client";

import { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Search, Loader2 } from "lucide-react";
import { RequestButton } from "./RequestButton";
import Image from "next/image";
import type { Id } from "../../../convex/_generated/dataModel";

interface BookSearchProps {
  kidId: Id<"kids">;
}

interface SearchResult {
  _id: string;
  googleBooksId?: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedDate?: string;
}

export function BookSearch({ kidId }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchBooks = useAction(api.books.search);

  // Get approved books for this kid to check status
  const approvedBooks = useQuery(api.approvedBooks.listForKid, { kidId });
  const kidRequests = useQuery(api.bookRequests.listByKid, { kidId });

  // Build lookup maps
  const approvedSet = new Set(
    (approvedBooks || []).map((b) => b.googleBookId)
  );
  const requestStatusMap = new Map(
    (kidRequests || []).map((r) => [r.googleBookId, r.status])
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
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
      const searchResults = await searchBooks({ query: debouncedQuery, maxResults: 12 });
      // Filter to only results with Google Books IDs
      setResults((searchResults || []).filter((r: SearchResult) => r.googleBooksId));
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, searchBooks]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  return (
    <div>
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-white via-white to-white/0 pb-4 pt-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for any book..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-emerald-500" />
          )}
        </div>
      </div>

      {/* Results */}
      {isSearching && results.length === 0 && (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm text-gray-500">Searching books...</p>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <Search className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-base font-medium text-gray-600">
            No books found
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Try a different title or author name
          </p>
        </div>
      )}

      {!hasSearched && !isSearching && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <Search className="h-8 w-8 text-emerald-300" />
          </div>
          <p className="mt-4 text-base font-medium text-gray-600">
            Find your next book
          </p>
          <p className="mt-1 max-w-xs text-sm text-gray-400">
            Search by title or author. If you find something you like, ask your parent to approve it!
          </p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((book) => (
          <div
            key={book.googleBooksId || book._id}
            className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
          >
            {/* Cover */}
            <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  width={64}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-emerald-50">
                  <span className="text-[8px] text-emerald-400">No Cover</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                  {book.title}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {book.authors?.join(", ") || "Unknown Author"}
                </p>
                {book.description && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">
                    {book.description}
                  </p>
                )}
              </div>
              <div className="mt-2 flex items-center justify-end">
                <RequestButton
                  kidId={kidId}
                  googleBookId={book.googleBooksId!}
                  title={book.title}
                  author={book.authors?.join(", ") || "Unknown Author"}
                  coverUrl={book.coverUrl}
                  requestStatus={requestStatusMap.get(book.googleBooksId!) || null}
                  isApproved={approvedSet.has(book.googleBooksId!)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
