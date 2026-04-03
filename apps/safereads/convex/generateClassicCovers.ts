import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

// ============================================================================
// Pre-generate Covers for Classic Books
//
// Admin-triggered batch job that iterates through pre-approved classics
// and finds the best cover for each one using the cover waterfall.
// Falls back to DALL-E 3 generation for books without good covers.
// ============================================================================

// Genre mapping for DALL-E prompt enrichment
const GENRE_MAP: Record<string, string> = {
  "11339": "nursery rhymes",
  "21": "fables",
  "19993": "children's fiction",
  "17208": "children's picture book",
  "14838": "children's picture book",
  "15234": "children's picture book",
  "23661": "children's picture book",
  "11": "fantasy adventure",
  "12": "fantasy adventure",
  "55": "fantasy adventure",
  "54": "fantasy adventure",
  "2591": "fairy tales",
  "902": "fairy tales",
  "16": "fantasy adventure",
  "289": "animal fiction",
  "113": "children's fiction",
  "479": "children's fiction",
  "32": "children's fiction",
  "514": "coming-of-age fiction",
  "766": "classic literature",
  "1260": "gothic romance",
  "35": "science fiction",
  "120": "adventure",
  "1184": "adventure",
  "1661": "mystery detective",
  "76": "adventure",
  "74": "adventure",
  "1400": "classic literature",
  "46": "holiday classic",
  "345": "gothic horror",
  "1342": "romance",
  "84": "gothic science fiction",
  "1232": "philosophy",
  "98": "historical fiction",
  "2701": "adventure",
  "1952": "psychological fiction",
  "174": "gothic fiction",
  "1080": "satire",
};

// Age range mapping
function getAgeRange(minAge: number): string {
  if (minAge <= 6) return "3-6";
  if (minAge <= 9) return "7-9";
  if (minAge <= 12) return "10-12";
  return "13+";
}

/**
 * Get the status of cover generation for all classics.
 * Shows which books have cached covers and from what source.
 */
export const getClassicCoverStatus = query({
  args: {},
  handler: async (ctx) => {
    const allCovers = await ctx.db.query("bookCovers").collect();
    const coverMap = new Map(allCovers.map((c) => [c.bookIdentifier, c]));

    // Import the pre-approved books list inline to avoid circular deps
    const preApproved = [
      { gutenbergId: "11339", title: "Mother Goose's Nursery Rhymes", author: "Various", minAge: 3 },
      { gutenbergId: "21", title: "Aesop's Fables", author: "Aesop", minAge: 3 },
      { gutenbergId: "19993", title: "The Velveteen Rabbit", author: "Margery Williams", minAge: 3 },
      { gutenbergId: "17208", title: "The Tale of Peter Rabbit", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "14838", title: "The Tale of Benjamin Bunny", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "15234", title: "The Tale of Mrs. Tiggy-Winkle", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "23661", title: "The Tale of Jemima Puddle-Duck", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "11", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", minAge: 7 },
      { gutenbergId: "12", title: "Through the Looking-Glass", author: "Lewis Carroll", minAge: 7 },
      { gutenbergId: "55", title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", minAge: 7 },
      { gutenbergId: "54", title: "The Marvelous Land of Oz", author: "L. Frank Baum", minAge: 7 },
      { gutenbergId: "2591", title: "Grimm's Fairy Tales", author: "Brothers Grimm", minAge: 7 },
      { gutenbergId: "902", title: "Hans Christian Andersen's Fairy Tales", author: "Hans Christian Andersen", minAge: 7 },
      { gutenbergId: "16", title: "Peter Pan (Peter and Wendy)", author: "J.M. Barrie", minAge: 7 },
      { gutenbergId: "289", title: "The Wind in the Willows", author: "Kenneth Grahame", minAge: 7 },
      { gutenbergId: "113", title: "The Secret Garden", author: "Frances Hodgson Burnett", minAge: 7 },
      { gutenbergId: "479", title: "A Little Princess", author: "Frances Hodgson Burnett", minAge: 7 },
      { gutenbergId: "32", title: "Heidi", author: "Johanna Spyri", minAge: 7 },
      { gutenbergId: "514", title: "Little Women", author: "Louisa May Alcott", minAge: 7 },
      { gutenbergId: "766", title: "David Copperfield", author: "Charles Dickens", minAge: 9 },
      { gutenbergId: "1260", title: "Jane Eyre", author: "Charlotte Bronte", minAge: 9 },
      { gutenbergId: "35", title: "The Time Machine", author: "H.G. Wells", minAge: 9 },
      { gutenbergId: "120", title: "Treasure Island", author: "Robert Louis Stevenson", minAge: 10 },
      { gutenbergId: "1184", title: "The Count of Monte Cristo", author: "Alexandre Dumas", minAge: 10 },
      { gutenbergId: "1661", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", minAge: 10 },
      { gutenbergId: "76", title: "Adventures of Huckleberry Finn", author: "Mark Twain", minAge: 10 },
      { gutenbergId: "74", title: "The Adventures of Tom Sawyer", author: "Mark Twain", minAge: 10 },
      { gutenbergId: "1400", title: "Great Expectations", author: "Charles Dickens", minAge: 10 },
      { gutenbergId: "46", title: "A Christmas Carol", author: "Charles Dickens", minAge: 10 },
      { gutenbergId: "345", title: "Dracula", author: "Bram Stoker", minAge: 12 },
      { gutenbergId: "1342", title: "Pride and Prejudice", author: "Jane Austen", minAge: 12 },
      { gutenbergId: "84", title: "Frankenstein", author: "Mary Shelley", minAge: 12 },
      { gutenbergId: "1232", title: "The Prince", author: "Niccolo Machiavelli", minAge: 13 },
      { gutenbergId: "98", title: "A Tale of Two Cities", author: "Charles Dickens", minAge: 13 },
      { gutenbergId: "2701", title: "Moby Dick", author: "Herman Melville", minAge: 13 },
      { gutenbergId: "1952", title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", minAge: 13 },
      { gutenbergId: "174", title: "The Picture of Dorian Gray", author: "Oscar Wilde", minAge: 13 },
      { gutenbergId: "1080", title: "A Modest Proposal", author: "Jonathan Swift", minAge: 13 },
    ];

    const results = preApproved.map((book) => {
      const cached = coverMap.get(book.gutenbergId);
      return {
        gutenbergId: book.gutenbergId,
        title: book.title,
        author: book.author,
        hasCover: !!cached,
        source: cached?.source || null,
        cachedAt: cached?.generatedAt || null,
      };
    });

    const total = results.length;
    const covered = results.filter((r) => r.hasCover).length;
    const bySource: Record<string, number> = {};
    results.forEach((r) => {
      if (r.source) {
        bySource[r.source] = (bySource[r.source] || 0) + 1;
      }
    });

    return {
      summary: { total, covered, missing: total - covered, bySource },
      books: results,
    };
  },
});

/**
 * Generate covers for all pre-approved classics that don't have one yet.
 * Tries Open Library and Google Books first, then DALL-E as last resort.
 *
 * Admin-triggered batch job. Logs progress and adds delays between DALL-E calls.
 */
export const generateAllClassicCovers = action({
  args: {
    useDalle: v.optional(v.boolean()), // Whether to use DALL-E for missing covers (default: false)
    dryRun: v.optional(v.boolean()),   // If true, just report what would be done
  },
  handler: async (ctx, args) => {
    const useDalle = args.useDalle ?? false;
    const dryRun = args.dryRun ?? false;

    const preApproved = [
      { gutenbergId: "11339", title: "Mother Goose's Nursery Rhymes", author: "Various", minAge: 3 },
      { gutenbergId: "21", title: "Aesop's Fables", author: "Aesop", minAge: 3 },
      { gutenbergId: "19993", title: "The Velveteen Rabbit", author: "Margery Williams", minAge: 3 },
      { gutenbergId: "17208", title: "The Tale of Peter Rabbit", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "14838", title: "The Tale of Benjamin Bunny", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "15234", title: "The Tale of Mrs. Tiggy-Winkle", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "23661", title: "The Tale of Jemima Puddle-Duck", author: "Beatrix Potter", minAge: 3 },
      { gutenbergId: "11", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", minAge: 7 },
      { gutenbergId: "12", title: "Through the Looking-Glass", author: "Lewis Carroll", minAge: 7 },
      { gutenbergId: "55", title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", minAge: 7 },
      { gutenbergId: "54", title: "The Marvelous Land of Oz", author: "L. Frank Baum", minAge: 7 },
      { gutenbergId: "2591", title: "Grimm's Fairy Tales", author: "Brothers Grimm", minAge: 7 },
      { gutenbergId: "902", title: "Hans Christian Andersen's Fairy Tales", author: "Hans Christian Andersen", minAge: 7 },
      { gutenbergId: "16", title: "Peter Pan (Peter and Wendy)", author: "J.M. Barrie", minAge: 7 },
      { gutenbergId: "289", title: "The Wind in the Willows", author: "Kenneth Grahame", minAge: 7 },
      { gutenbergId: "113", title: "The Secret Garden", author: "Frances Hodgson Burnett", minAge: 7 },
      { gutenbergId: "479", title: "A Little Princess", author: "Frances Hodgson Burnett", minAge: 7 },
      { gutenbergId: "32", title: "Heidi", author: "Johanna Spyri", minAge: 7 },
      { gutenbergId: "514", title: "Little Women", author: "Louisa May Alcott", minAge: 7 },
      { gutenbergId: "766", title: "David Copperfield", author: "Charles Dickens", minAge: 9 },
      { gutenbergId: "1260", title: "Jane Eyre", author: "Charlotte Bronte", minAge: 9 },
      { gutenbergId: "35", title: "The Time Machine", author: "H.G. Wells", minAge: 9 },
      { gutenbergId: "120", title: "Treasure Island", author: "Robert Louis Stevenson", minAge: 10 },
      { gutenbergId: "1184", title: "The Count of Monte Cristo", author: "Alexandre Dumas", minAge: 10 },
      { gutenbergId: "1661", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", minAge: 10 },
      { gutenbergId: "76", title: "Adventures of Huckleberry Finn", author: "Mark Twain", minAge: 10 },
      { gutenbergId: "74", title: "The Adventures of Tom Sawyer", author: "Mark Twain", minAge: 10 },
      { gutenbergId: "1400", title: "Great Expectations", author: "Charles Dickens", minAge: 10 },
      { gutenbergId: "46", title: "A Christmas Carol", author: "Charles Dickens", minAge: 10 },
      { gutenbergId: "345", title: "Dracula", author: "Bram Stoker", minAge: 12 },
      { gutenbergId: "1342", title: "Pride and Prejudice", author: "Jane Austen", minAge: 12 },
      { gutenbergId: "84", title: "Frankenstein", author: "Mary Shelley", minAge: 12 },
      { gutenbergId: "1232", title: "The Prince", author: "Niccolo Machiavelli", minAge: 13 },
      { gutenbergId: "98", title: "A Tale of Two Cities", author: "Charles Dickens", minAge: 13 },
      { gutenbergId: "2701", title: "Moby Dick", author: "Herman Melville", minAge: 13 },
      { gutenbergId: "1952", title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", minAge: 13 },
      { gutenbergId: "174", title: "The Picture of Dorian Gray", author: "Oscar Wilde", minAge: 13 },
      { gutenbergId: "1080", title: "A Modest Proposal", author: "Jonathan Swift", minAge: 13 },
    ];

    const log: string[] = [];
    let cached = 0;
    let openLibrary = 0;
    let google = 0;
    let dalle = 0;
    let failed = 0;

    for (const book of preApproved) {
      const identifier = book.gutenbergId;

      // Check if already cached
      try {
        const result = await ctx.runAction(api.bookCovers.getBestCover, {
          title: book.title,
          author: book.author,
          gutenbergId: identifier,
        });

        if (result.coverUrl) {
          log.push(`[CACHED:${result.source}] ${book.title}`);
          if (result.source === "openlibrary") openLibrary++;
          else if (result.source === "google") google++;
          else if (result.source === "dalle") dalle++;
          else cached++;
          continue;
        }
      } catch (err) {
        log.push(`[ERROR] ${book.title}: getBestCover failed - ${err}`);
      }

      // No cover found from waterfall. Try DALL-E if enabled.
      if (useDalle && !dryRun) {
        try {
          log.push(`[DALLE] Generating cover for: ${book.title}...`);
          await ctx.runAction(api.bookCovers.generateAICover, {
            title: book.title,
            author: book.author,
            genre: GENRE_MAP[book.gutenbergId] || "classic literature",
            ageRange: getAgeRange(book.minAge),
            bookIdentifier: identifier,
          });
          dalle++;
          log.push(`[DALLE:OK] ${book.title}`);

          // Rate limit: wait 3 seconds between DALL-E calls
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (err) {
          log.push(`[DALLE:FAIL] ${book.title}: ${err}`);
          failed++;
        }
      } else if (useDalle && dryRun) {
        log.push(`[DRY-RUN:DALLE] Would generate cover for: ${book.title}`);
        failed++;
      } else {
        log.push(`[NO-COVER] ${book.title} -- no external cover found, DALL-E disabled`);
        failed++;
      }
    }

    return {
      summary: {
        total: preApproved.length,
        alreadyCached: cached,
        openLibrary,
        google,
        dalle,
        failed,
      },
      log,
    };
  },
});
