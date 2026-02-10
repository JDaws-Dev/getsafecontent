"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { BookOpen, ChevronRight, Loader2, Sparkles } from "lucide-react";

interface Alternative {
  title: string;
  author: string;
  reason: string;
  ageRange: string;
}

interface AlternativesSuggestionsProps {
  bookId: Id<"books">;
}

export function AlternativesSuggestions({
  bookId,
}: AlternativesSuggestionsProps) {
  const suggestAction = useAction(api.analyses.suggestAlternatives);
  const searchAction = useAction(api.books.search);
  const router = useRouter();
  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [navigatingIdx, setNavigatingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const result = await suggestAction({ bookId });
      setAlternatives(result as Alternative[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to get suggestions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleNavigate(alt: Alternative, idx: number) {
    setNavigatingIdx(idx);
    try {
      const results = await searchAction({
        query: `${alt.title} ${alt.author}`,
        maxResults: 1,
      });
      if (results.length > 0) {
        router.push(`/dashboard/book/${results[0]._id}`);
      } else {
        setError(`Could not find "${alt.title}" — try searching manually.`);
      }
    } catch {
      setError(`Could not find "${alt.title}" — try searching manually.`);
    } finally {
      setNavigatingIdx(null);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg font-bold text-ink-900">
        Similar Books
      </h3>

      {alternatives === null ? (
        <div className="rounded-xl border border-parchment-200 bg-white p-5 text-center">
          <p className="mb-3 text-sm text-ink-500">
            Get AI-powered suggestions for similar books that may be more
            age-appropriate.
          </p>
          <button
            onClick={handleSuggest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding alternatives…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Suggest Alternatives
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {alternatives.map((alt, i) => (
            <button
              key={`${alt.title}-${i}`}
              onClick={() => handleNavigate(alt, i)}
              disabled={navigatingIdx !== null}
              className="w-full rounded-lg border border-parchment-200 bg-white p-4 text-left transition-colors hover:border-parchment-400 hover:bg-parchment-50 disabled:opacity-60"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-parchment-100">
                  {navigatingIdx === i ? (
                    <Loader2 className="h-4 w-4 animate-spin text-parchment-600" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-parchment-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif font-semibold text-ink-900">
                      {alt.title}
                    </span>
                    <span className="shrink-0 rounded bg-parchment-100 px-1.5 py-0.5 text-xs font-medium text-parchment-700">
                      {alt.ageRange}
                    </span>
                  </div>
                  <p className="text-sm text-ink-500">{alt.author}</p>
                  <p className="mt-1 text-sm text-ink-600">{alt.reason}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-300" />
              </div>
            </button>
          ))}

          <button
            onClick={handleSuggest}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Get new suggestions
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
