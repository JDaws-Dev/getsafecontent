"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Book info needed for cover fetching.
 */
interface BookForCoverFetch {
  /** The identifier used in bookCovers table (gutenbergId, isbn, etc.) */
  identifier: string;
  title: string;
  author: string;
  /** Whether this book already has a cached cover URL */
  hasCachedCover: boolean;
  /** Whether the book already has an acceptable cover URL (e.g., from source) */
  hasSourceCover: boolean;
}

/**
 * useCoverFetcher - Background cover fetching for library/home page books.
 *
 * After books load, identifies those without cached covers and triggers
 * getBestCover for each in the background. Covers get cached in the
 * bookCovers table, so the getCachedCovers query will reactively update.
 *
 * Rate-limits to avoid hammering external APIs:
 * - Max 3 concurrent fetches
 * - 500ms delay between batches
 * - Only fetches for visible/loaded books
 * - Tracks already-attempted identifiers to avoid re-fetching
 */
export function useCoverFetcher(books: BookForCoverFetch[]) {
  const getBestCover = useAction(api.bookCovers.getBestCover);
  const attemptedRef = useRef<Set<string>>(new Set());
  const activeRef = useRef(0);
  const queueRef = useRef<BookForCoverFetch[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processQueue = useCallback(async () => {
    const MAX_CONCURRENT = 3;

    while (queueRef.current.length > 0 && activeRef.current < MAX_CONCURRENT) {
      const book = queueRef.current.shift();
      if (!book) break;

      // Skip if already attempted during this session
      if (attemptedRef.current.has(book.identifier)) continue;
      attemptedRef.current.add(book.identifier);

      activeRef.current++;

      // Fire and forget — the cached result will be picked up reactively
      // by the getCachedCovers query
      getBestCover({
        title: book.title,
        author: book.author,
        gutenbergId: book.identifier,
      })
        .catch((err: unknown) => {
          console.warn(`Cover fetch failed for "${book.title}":`, err);
        })
        .finally(() => {
          activeRef.current--;
          // Process more from queue after a short delay
          if (queueRef.current.length > 0) {
            timerRef.current = setTimeout(processQueue, 500);
          }
        });
    }
  }, [getBestCover]);

  useEffect(() => {
    // Find books that need covers fetched
    const needsFetch = books.filter(
      (b) =>
        !b.hasCachedCover &&
        !b.hasSourceCover &&
        !attemptedRef.current.has(b.identifier)
    );

    if (needsFetch.length === 0) return;

    // Add to queue (avoid duplicates)
    const currentIds = new Set(queueRef.current.map((b) => b.identifier));
    for (const book of needsFetch) {
      if (!currentIds.has(book.identifier)) {
        queueRef.current.push(book);
      }
    }

    // Start processing
    processQueue();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [books, processQueue]);
}
