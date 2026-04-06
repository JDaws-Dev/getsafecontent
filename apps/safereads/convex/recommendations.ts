import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Personalized book recommendations for kids.
 *
 * Uses the kid's favoriteGenres, age, readingLevel, and reading history
 * to recommend pre-approved classics they haven't read yet.
 */

type ContentLevel = "safe" | "caution" | "mature";

interface PreApprovedBook {
  gutenbergId: string;
  title: string;
  author: string;
  minAge: number;
  coverUrl?: string;
  contentLevel: ContentLevel;
  genres: string[]; // Genre tags for matching
}

function gutenbergCover(id: string): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

/**
 * Pre-approved books with genre tags for recommendation matching.
 * Genre keys match GenreBrowser: adventure, animals, fantasy, science,
 * history, fairy-tales, mystery, space, nature, humor, scary, action, etc.
 */
const BOOKS_WITH_GENRES: PreApprovedBook[] = [
  // Ages 3-6
  { gutenbergId: "11339", title: "Mother Goose's Nursery Rhymes", author: "Various", minAge: 3, coverUrl: gutenbergCover("11339"), contentLevel: "safe", genres: ["humor", "fairy-tales"] },
  { gutenbergId: "21", title: "Aesop's Fables", author: "Aesop", minAge: 3, coverUrl: gutenbergCover("21"), contentLevel: "safe", genres: ["animals", "fairy-tales"] },
  { gutenbergId: "19993", title: "The Velveteen Rabbit", author: "Margery Williams", minAge: 3, coverUrl: gutenbergCover("19993"), contentLevel: "safe", genres: ["animals", "fantasy"] },
  { gutenbergId: "17208", title: "The Tale of Peter Rabbit", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("17208"), contentLevel: "safe", genres: ["animals", "adventure"] },
  { gutenbergId: "14838", title: "The Tale of Benjamin Bunny", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("14838"), contentLevel: "safe", genres: ["animals"] },
  { gutenbergId: "15234", title: "The Tale of Mrs. Tiggy-Winkle", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("15234"), contentLevel: "safe", genres: ["animals"] },
  { gutenbergId: "23661", title: "The Tale of Jemima Puddle-Duck", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("23661"), contentLevel: "safe", genres: ["animals"] },
  // Ages 7-9
  { gutenbergId: "11", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", minAge: 7, coverUrl: gutenbergCover("11"), contentLevel: "safe", genres: ["fantasy", "adventure", "humor"] },
  { gutenbergId: "12", title: "Through the Looking-Glass", author: "Lewis Carroll", minAge: 7, coverUrl: gutenbergCover("12"), contentLevel: "safe", genres: ["fantasy", "humor"] },
  { gutenbergId: "55", title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", minAge: 7, coverUrl: gutenbergCover("55"), contentLevel: "safe", genres: ["fantasy", "adventure"] },
  { gutenbergId: "54", title: "The Marvelous Land of Oz", author: "L. Frank Baum", minAge: 7, coverUrl: gutenbergCover("54"), contentLevel: "safe", genres: ["fantasy", "adventure"] },
  { gutenbergId: "2591", title: "Grimm's Fairy Tales", author: "Brothers Grimm", minAge: 7, coverUrl: gutenbergCover("2591"), contentLevel: "caution", genres: ["fairy-tales", "fantasy", "scary"] },
  { gutenbergId: "902", title: "Hans Christian Andersen's Fairy Tales", author: "Hans Christian Andersen", minAge: 7, coverUrl: gutenbergCover("902"), contentLevel: "caution", genres: ["fairy-tales", "fantasy"] },
  { gutenbergId: "16", title: "Peter Pan (Peter and Wendy)", author: "J.M. Barrie", minAge: 7, coverUrl: gutenbergCover("16"), contentLevel: "safe", genres: ["fantasy", "adventure", "action"] },
  { gutenbergId: "289", title: "The Wind in the Willows", author: "Kenneth Grahame", minAge: 7, coverUrl: gutenbergCover("289"), contentLevel: "safe", genres: ["animals", "nature", "adventure"] },
  { gutenbergId: "113", title: "The Secret Garden", author: "Frances Hodgson Burnett", minAge: 7, coverUrl: gutenbergCover("113"), contentLevel: "safe", genres: ["nature", "mystery"] },
  { gutenbergId: "479", title: "A Little Princess", author: "Frances Hodgson Burnett", minAge: 7, coverUrl: gutenbergCover("479"), contentLevel: "safe", genres: ["adventure"] },
  { gutenbergId: "32", title: "Heidi", author: "Johanna Spyri", minAge: 7, coverUrl: gutenbergCover("32"), contentLevel: "safe", genres: ["nature", "adventure"] },
  { gutenbergId: "514", title: "Little Women", author: "Louisa May Alcott", minAge: 7, coverUrl: gutenbergCover("514"), contentLevel: "caution", genres: ["history"] },
  { gutenbergId: "766", title: "David Copperfield", author: "Charles Dickens", minAge: 9, coverUrl: gutenbergCover("766"), contentLevel: "caution", genres: ["history", "adventure"] },
  { gutenbergId: "1260", title: "Jane Eyre", author: "Charlotte Bronte", minAge: 9, coverUrl: gutenbergCover("1260"), contentLevel: "mature", genres: ["mystery"] },
  { gutenbergId: "35", title: "The Time Machine", author: "H.G. Wells", minAge: 9, coverUrl: gutenbergCover("35"), contentLevel: "caution", genres: ["science", "space", "adventure"] },
  // Ages 10-12
  { gutenbergId: "120", title: "Treasure Island", author: "Robert Louis Stevenson", minAge: 10, coverUrl: gutenbergCover("120"), contentLevel: "caution", genres: ["adventure", "action"] },
  { gutenbergId: "1184", title: "The Count of Monte Cristo", author: "Alexandre Dumas", minAge: 10, coverUrl: gutenbergCover("1184"), contentLevel: "mature", genres: ["adventure", "action", "mystery"] },
  { gutenbergId: "1661", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", minAge: 10, coverUrl: gutenbergCover("1661"), contentLevel: "caution", genres: ["mystery", "adventure"] },
  { gutenbergId: "76", title: "Adventures of Huckleberry Finn", author: "Mark Twain", minAge: 10, coverUrl: gutenbergCover("76"), contentLevel: "caution", genres: ["adventure", "humor"] },
  { gutenbergId: "74", title: "The Adventures of Tom Sawyer", author: "Mark Twain", minAge: 10, coverUrl: gutenbergCover("74"), contentLevel: "caution", genres: ["adventure", "humor"] },
  { gutenbergId: "1400", title: "Great Expectations", author: "Charles Dickens", minAge: 10, coverUrl: gutenbergCover("1400"), contentLevel: "caution", genres: ["history", "mystery"] },
  { gutenbergId: "46", title: "A Christmas Carol", author: "Charles Dickens", minAge: 10, coverUrl: gutenbergCover("46"), contentLevel: "caution", genres: ["fantasy", "scary"] },
  { gutenbergId: "345", title: "Dracula", author: "Bram Stoker", minAge: 12, coverUrl: gutenbergCover("345"), contentLevel: "mature", genres: ["scary", "mystery", "action"] },
  { gutenbergId: "1342", title: "Pride and Prejudice", author: "Jane Austen", minAge: 12, coverUrl: gutenbergCover("1342"), contentLevel: "caution", genres: ["history"] },
  { gutenbergId: "84", title: "Frankenstein", author: "Mary Shelley", minAge: 12, coverUrl: gutenbergCover("84"), contentLevel: "mature", genres: ["scary", "science"] },
  // Ages 13+
  { gutenbergId: "1232", title: "The Prince", author: "Niccolo Machiavelli", minAge: 13, coverUrl: gutenbergCover("1232"), contentLevel: "mature", genres: ["history"] },
  { gutenbergId: "98", title: "A Tale of Two Cities", author: "Charles Dickens", minAge: 13, coverUrl: gutenbergCover("98"), contentLevel: "mature", genres: ["history", "action"] },
  { gutenbergId: "2701", title: "Moby Dick", author: "Herman Melville", minAge: 13, coverUrl: gutenbergCover("2701"), contentLevel: "mature", genres: ["adventure", "nature", "action"] },
  { gutenbergId: "1952", title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", minAge: 13, coverUrl: gutenbergCover("1952"), contentLevel: "mature", genres: ["scary", "mystery"] },
  { gutenbergId: "174", title: "The Picture of Dorian Gray", author: "Oscar Wilde", minAge: 13, coverUrl: gutenbergCover("174"), contentLevel: "mature", genres: ["scary", "mystery"] },
  { gutenbergId: "1080", title: "A Modest Proposal", author: "Jonathan Swift", minAge: 13, coverUrl: gutenbergCover("1080"), contentLevel: "mature", genres: ["humor", "history"] },
];

// Build a map from gutenbergId to genres for quick lookup
const GENRE_MAP = new Map(BOOKS_WITH_GENRES.map((b) => [b.gutenbergId, b.genres]));

/** Content levels each parent setting allows */
const LEVEL_FILTERS: Record<string, Set<ContentLevel>> = {
  safe_only: new Set<ContentLevel>(["safe"]),
  safe_and_caution: new Set<ContentLevel>(["safe", "caution"]),
  all_classics: new Set<ContentLevel>(["safe", "caution", "mature"]),
};

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
    const eligible = BOOKS_WITH_GENRES.filter((book) => {
      if (book.minAge > age) return false;
      if (exclusions.has(book.gutenbergId)) return false;
      if (!allowedLevels.has(book.contentLevel)) return false;
      if (readBookIds.has(book.gutenbergId)) return false;
      if (approvedBookIds.has(book.gutenbergId)) return false;
      return true;
    });

    // 7. Score and rank books
    const scored: Array<{ book: PreApprovedBook; score: number; reason: string }> = [];

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
