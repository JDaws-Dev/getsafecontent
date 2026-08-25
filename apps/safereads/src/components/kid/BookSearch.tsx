"use client";

import { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Search, Loader2, BookOpen } from "lucide-react";
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
      <div className="sticky top-0 z-10 bg-gradient-to-b from-brand-cream via-brand-cream to-transparent pb-4 pt-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to read about?"
            className="w-full rounded-2xl border-2 border-accent-100 bg-white py-4 pl-12 pr-4 text-base font-medium text-brand-navy shadow-md shadow-accent-50 placeholder:text-gray-400 focus:border-accent-300 focus:outline-none focus:ring-3 focus:ring-accent-100"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-accent-500" />
          )}
        </div>
      </div>

      {/* Results */}
      {isSearching && results.length === 0 && (
        <div className="flex flex-col items-center py-12">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-100 to-accent-200">
            <Loader2 className="h-9 w-9 animate-spin text-accent-500" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-accent-200/30" />
          </div>
          <p className="mt-4 text-sm font-bold text-gray-600">Searching for books...</p>
          <p className="mt-1 text-xs text-gray-400">Finding the best matches for you</p>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-gray-50 to-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Search className="h-9 w-9 text-gray-300" />
          </div>
          <p className="mt-5 text-lg font-bold text-gray-700">
            No books found
          </p>
          <p className="mt-1.5 max-w-xs text-sm text-gray-400">
            Try searching for a different title, author, or topic. You can also browse genres from the home page!
          </p>
        </div>
      )}

      {!hasSearched && !isSearching && (
        <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-accent-50 to-accent-50/50 px-6 py-12 text-center shadow-sm ring-1 ring-accent-100">
          <div className="animate-float relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent-200 to-accent-300 shadow-lg shadow-accent-100">
            <BookOpen className="h-12 w-12 text-white" />
            
          </div>
          <p className="mt-6 text-xl font-bold text-brand-navy">
            Find your next adventure!
          </p>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            Search by title or author. If you find something you love, ask your parent to add it to your bookshelf!
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Harry Potter", "Dog Man", "Diary of a Wimpy Kid", "Percy Jackson"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="kid-touch rounded-full bg-white px-3.5 py-2 text-xs font-bold text-accent-600 shadow-sm ring-1 ring-accent-100 transition-all hover:shadow-md active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result count */}
      {hasSearched && results.length > 0 && (
        <p className="mb-3 text-xs font-medium text-gray-400">
          {results.length} book{results.length !== 1 ? "s" : ""} found
        </p>
      )}

      <div className="space-y-3">
        {results.map((book, index) => (
          <div
            key={book.googleBooksId || book._id}
            className="animate-fade-up flex gap-3.5 rounded-2xl border-2 border-transparent bg-white p-3.5 shadow-md ring-1 ring-black/5 transition-all duration-200 hover:border-accent-100 hover:shadow-lg active:scale-[0.99]"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Cover */}
            <div className="book-tilt relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-accent-50 to-accent-100 p-2">
                  <BookOpen className="h-5 w-5 text-accent-300" />
                  <span className="text-[8px] font-medium text-accent-400">No Cover</span>
                </div>
              )}
              {/* Page count badge */}
              {book.pageCount && (
                <div className="absolute right-1 top-1 rounded-md bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
                  <span className="text-[9px] font-bold text-white">{book.pageCount}p</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h3 className="line-clamp-2 text-sm font-bold text-brand-navy">
                  {book.title}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-gray-400">
                  {book.authors?.join(", ") || "Unknown Author"}
                </p>
                {book.description && (
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-gray-400">
                    {book.description}
                  </p>
                )}
              </div>
              <div className="mt-2.5 flex items-center justify-end">
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
