"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { BookCard, BookCardBook } from "@/components/BookCard";
import {
  ArrowLeft,
  Loader2,
  User,
  BookOpen,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Id } from "../../../../../convex/_generated/dataModel";

type Verdict = "safe" | "caution" | "warning" | "no_verdict";

const VERDICT_BADGE: Record<Verdict, { label: string; className: string }> = {
  safe: {
    label: "Safe",
    className: "bg-verdict-safe text-white",
  },
  caution: {
    label: "Caution",
    className: "bg-verdict-caution text-white",
  },
  warning: {
    label: "Warning",
    className: "bg-verdict-warning text-white",
  },
  no_verdict: {
    label: "Not Reviewed",
    className: "bg-parchment-300 text-ink-600",
  },
};

interface AuthorOverview {
  authorName: string;
  summary: string;
  typicalAgeRange?: string;
  commonThemes: string[];
  contentPatterns: string;
}

export default function AuthorDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: encodedName } = use(params);
  const authorName = decodeURIComponent(encodedName);

  const searchByAuthor = useAction(api.books.searchByAuthor);
  const getAuthorOverview = useAction(api.books.authorOverview);

  const [books, setBooks] = useState<BookCardBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AuthorOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collect book IDs for batch verdict lookup
  const bookIds = books.map((b) => b._id);
  const analyses = useQuery(
    api.analyses.getByBooks,
    bookIds.length > 0 ? { bookIds: bookIds as Id<"books">[] } : "skip"
  );

  // Build verdict map
  const verdictMap = new Map<string, Verdict>();
  if (analyses) {
    for (const a of analyses) {
      if (a) {
        verdictMap.set(a.bookId as string, a.verdict as Verdict);
      }
    }
  }

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchByAuthor({ authorName });
      setBooks(results as BookCardBook[]);
    } catch {
      setError("Failed to load author catalog. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [searchByAuthor, authorName]);

  const loadOverview = useCallback(
    async (bookList: BookCardBook[]) => {
      if (bookList.length === 0) return;
      setOverviewLoading(true);
      try {
        const titles = bookList.map((b) => b.title);
        const allCategories = bookList.flatMap((b) => b.categories ?? []);
        const uniqueCategories = [...new Set(allCategories)];

        const result = await getAuthorOverview({
          authorName,
          bookTitles: titles,
          categories: uniqueCategories,
        });
        setOverview(result as AuthorOverview);
      } catch {
        // Non-critical — overview is supplementary
      } finally {
        setOverviewLoading(false);
      }
    },
    [getAuthorOverview, authorName]
  );

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Load overview after books are fetched
  useEffect(() => {
    if (books.length > 0 && !overview && !overviewLoading) {
      loadOverview(books);
    }
  }, [books, overview, overviewLoading, loadOverview]);

  // Aggregate stats
  const reviewedCount = verdictMap.size;
  const verdictCounts: Record<string, number> = {};
  for (const v of verdictMap.values()) {
    verdictCounts[v] = (verdictCounts[v] ?? 0) + 1;
  }

  return (
    <div>
      <Link
        href="/dashboard/search"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      {/* Author header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-parchment-200">
          <User className="h-8 w-8 text-parchment-500" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            {authorName}
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-ink-500">
              {books.length} {books.length === 1 ? "book" : "books"} found
              {reviewedCount > 0 && ` · ${reviewedCount} reviewed by SafeReads`}
            </p>
          )}
        </div>
      </div>

      {/* AI Overview section */}
      <div className="mt-6">
        {overviewLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-parchment-200 bg-white p-4">
            <Sparkles className="h-4 w-4 animate-pulse text-parchment-400" />
            <span className="text-sm text-ink-500">
              Generating author overview…
            </span>
          </div>
        )}

        {overview && (
          <div className="rounded-lg border border-parchment-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-parchment-500" />
              <h2 className="text-sm font-semibold text-ink-700">
                AI Author Overview
              </h2>
              {overview.typicalAgeRange && (
                <span className="rounded-full bg-parchment-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                  Typical: {overview.typicalAgeRange}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              {overview.summary}
            </p>

            {overview.commonThemes.length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-medium text-ink-500">
                  Common themes:
                </span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {overview.commonThemes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-parchment-100 px-2 py-0.5 text-xs text-ink-600"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-3 text-sm italic text-ink-500">
              {overview.contentPatterns}
            </p>
          </div>
        )}
      </div>

      {/* Verdict summary bar */}
      {reviewedCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(["safe", "caution", "warning"] as Verdict[]).map((v) => {
            const count = verdictCounts[v] ?? 0;
            if (count === 0) return null;
            const badge = VERDICT_BADGE[v];
            return (
              <span
                key={v}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
              >
                {count} {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-lg border border-verdict-warning/30 bg-red-50 p-4 text-sm text-verdict-warning">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-parchment-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && books.length === 0 && !error && (
        <div className="mt-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-parchment-300" />
          <p className="mt-3 text-ink-500">
            No books found for this author. Try searching with a different
            spelling.
          </p>
        </div>
      )}

      {/* Book catalog */}
      {books.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-serif text-lg font-bold text-ink-900">
            Books by {authorName}
          </h2>
          <div className="space-y-3">
            {books.map((book: BookCardBook) => {
              const verdict = verdictMap.get(book._id as string);
              return (
                <div key={book._id} className="relative">
                  <BookCard book={book} />
                  {verdict && verdict !== "no_verdict" && (
                    <span
                      className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_BADGE[verdict].className}`}
                    >
                      {VERDICT_BADGE[verdict].label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
