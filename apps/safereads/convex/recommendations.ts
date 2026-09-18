import { v } from "convex/values";
import { query } from "./_generated/server";
import { CLASSICS, LEVEL_FILTERS, type ClassicBook } from "./lib/classics";

/**
 * Personalized book recommendations for kids.
 *
 * Uses the kid's favoriteGenres, age, readingLevel, and reading history
 * to recommend pre-approved classics they haven't read yet.
 */

// Build a map from gutenbergId to genres for quick lookup
const GENRE_MAP = new Map(CLASSICS.map((b) => [b.gutenbergId, b.genres]));

interface RecommendedBook {
  gutenbergId: string;
  googleBookId: string;
  title: string;
  author: string;
  coverUrl?: string;
  minAge: number;
  contentLevel: string;
  isFreeBook: true;
  isPreApproved: true;
  reason: string;
}

/**
 * Get personalized book recommendations for a kid.
 *
 * Priority:
 * 1. Books matching the kid's favoriteGenres
 * 2. Books matching genres of books they've finished
 * 3. Age-appropriate books (fallback)
 *
 * Excludes: books already read/in-progress, parent-excluded books.
 */
export const getRecommendations = query({
  args: {
    kidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    // 1. Get kid profile
    const kid = await ctx.db.get(args.kidId);
    if (!kid) return [];

    const age = kid.age ?? 9;
    const favoriteGenres = kid.favoriteGenres ?? [];
    const exclusions = new Set(kid.excludedPreApproved ?? []);

    // 2. Get parent's content level setting
    let preApprovedLevel = "safe_and_caution";
    if (kid.userId) {
      const parent = await ctx.db.get(kid.userId);
      if (parent?.preApprovedLevel) {
        preApprovedLevel = parent.preApprovedLevel;
      }
    }
    const allowedLevels = LEVEL_FILTERS[preApprovedLevel] ?? LEVEL_FILTERS.safe_and_caution;

    // 3. Get reading history to exclude already-read books and infer genre preferences
    const readingProgress = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    const readBookIds = new Set(
      readingProgress.map((p) => {
        // Extract gutenbergId from googleBookId format "gutenberg:123"
        const id = p.googleBookId;
        return id.startsWith("gutenberg:") ? id.replace("gutenberg:", "") : id;
      })
    );

    // 4. Get approved books to also exclude
    const approvedBooks = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    const approvedBookIds = new Set(
      approvedBooks.map((b) => {
        const id = b.googleBookId;
        return id.startsWith("gutenberg:") ? id.replace("gutenberg:", "") : id;
      })
    );

    // 5. Infer genres from finished books
    const finishedGenres: string[] = [];
    for (const progress of readingProgress) {
      if (progress.finishedAt) {
        const gutId = progress.googleBookId.startsWith("gutenberg:")
          ? progress.googleBookId.replace("gutenberg:", "")
          : progress.googleBookId;
        const genres = GENRE_MAP.get(gutId);
        if (genres) {
          finishedGenres.push(...genres);
        }
      }
    }

    // 6. Filter eligible books (age-appropriate, not excluded, not already reading)
    const eligible = CLASSICS.filter((book) => {
      if (book.minAge > age) return false;
      if (exclusions.has(book.gutenbergId)) return false;
      if (!allowedLevels.has(book.contentLevel)) return false;
      if (readBookIds.has(book.gutenbergId)) return false;
      if (approvedBookIds.has(book.gutenbergId)) return false;
      return true;
    });

    // 7. Score and rank books
    const scored: Array<{ book: ClassicBook; score: number; reason: string }> = [];

    // Combine favorite + inferred genres for matching
    const allPreferredGenres = new Set([...favoriteGenres, ...finishedGenres]);

    for (const book of eligible) {
      let score = 0;
      let reason = "";

      // a. Favorite genre match (highest priority)
      const favMatches = book.genres.filter((g) => favoriteGenres.includes(g));
      if (favMatches.length > 0) {
        score += 30 + favMatches.length * 10;
        // Pick the first matching genre for the reason label
        const genreLabel = favMatches[0].charAt(0).toUpperCase() + favMatches[0].slice(1).replace("-", " ");
        reason = `Because you like ${genreLabel}`;
      }

      // b. Finished-book genre match
      const finishedMatches = book.genres.filter((g) => finishedGenres.includes(g));
      if (finishedMatches.length > 0 && !reason) {
        score += 20 + finishedMatches.length * 5;
        const genreLabel = finishedMatches[0].charAt(0).toUpperCase() + finishedMatches[0].slice(1).replace("-", " ");
        reason = `Similar to books you've enjoyed`;
      } else if (finishedMatches.length > 0) {
        score += 10 + finishedMatches.length * 5;
      }

      // c. Age proximity bonus (books closest to kid's age score higher)
      const ageDiff = Math.abs(book.minAge - age);
      if (ageDiff <= 1) {
        score += 15;
        if (!reason) reason = "Perfect for your reading level";
      } else if (ageDiff <= 3) {
        score += 8;
        if (!reason) reason = "Popular with readers your age";
      } else {
        score += 2;
        if (!reason) reason = "A great classic to explore";
      }

      // d. Safe content bonus (prefer safe over caution over mature)
      if (book.contentLevel === "safe") score += 5;
      else if (book.contentLevel === "caution") score += 2;

      scored.push({ book, score, reason });
    }

    // Sort by score descending, then by title for stability
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.book.title.localeCompare(b.book.title);
    });

    // 8. Return top 12 with reason
    return scored.slice(0, 12).map(({ book, reason }): RecommendedBook => ({
      gutenbergId: book.gutenbergId,
      googleBookId: `gutenberg:${book.gutenbergId}`,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      minAge: book.minAge,
      contentLevel: book.contentLevel,
      isFreeBook: true,
      isPreApproved: true,
      reason,
    }));
  },
});
