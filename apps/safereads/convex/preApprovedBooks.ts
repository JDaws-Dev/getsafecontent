import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Pre-approved classic children's books from Project Gutenberg.
 * These are universally safe classics that kids can read without parent approval.
 * Parents can exclude specific titles per-kid if desired.
 *
 * Organized by minimum age range.
 */

type ContentLevel = "safe" | "caution" | "mature";

interface PreApprovedBook {
  gutenbergId: string;
  title: string;
  author: string;
  minAge: number; // Minimum recommended age
  coverUrl?: string;
  contentLevel: ContentLevel; // Content classification for parent controls
}

// Gutenberg cover URL helper
function gutenbergCover(id: string): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

const PRE_APPROVED_BOOKS: PreApprovedBook[] = [
  // === Ages 3-6 (Picture books, nursery rhymes, simple fables) ===
  { gutenbergId: "11339", title: "Mother Goose's Nursery Rhymes", author: "Various", minAge: 3, coverUrl: gutenbergCover("11339"), contentLevel: "safe" },
  { gutenbergId: "21", title: "Aesop's Fables", author: "Aesop", minAge: 3, coverUrl: gutenbergCover("21"), contentLevel: "safe" },
  { gutenbergId: "19993", title: "The Velveteen Rabbit", author: "Margery Williams", minAge: 3, coverUrl: gutenbergCover("19993"), contentLevel: "safe" },
  { gutenbergId: "17208", title: "The Tale of Peter Rabbit", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("17208"), contentLevel: "safe" },
  { gutenbergId: "14838", title: "The Tale of Benjamin Bunny", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("14838"), contentLevel: "safe" },
  { gutenbergId: "15234", title: "The Tale of Mrs. Tiggy-Winkle", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("15234"), contentLevel: "safe" },
  { gutenbergId: "23661", title: "The Tale of Jemima Puddle-Duck", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("23661"), contentLevel: "safe" },

  // === Ages 7-9 (Chapter books, fairy tales, early adventures) ===
  { gutenbergId: "11", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", minAge: 7, coverUrl: gutenbergCover("11"), contentLevel: "safe" },
  { gutenbergId: "12", title: "Through the Looking-Glass", author: "Lewis Carroll", minAge: 7, coverUrl: gutenbergCover("12"), contentLevel: "safe" },
  { gutenbergId: "55", title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", minAge: 7, coverUrl: gutenbergCover("55"), contentLevel: "safe" },
  { gutenbergId: "54", title: "The Marvelous Land of Oz", author: "L. Frank Baum", minAge: 7, coverUrl: gutenbergCover("54"), contentLevel: "safe" },
  { gutenbergId: "2591", title: "Grimm's Fairy Tales", author: "Brothers Grimm", minAge: 7, coverUrl: gutenbergCover("2591"), contentLevel: "caution" },
  { gutenbergId: "902", title: "Hans Christian Andersen's Fairy Tales", author: "Hans Christian Andersen", minAge: 7, coverUrl: gutenbergCover("902"), contentLevel: "caution" },
  { gutenbergId: "16", title: "Peter Pan (Peter and Wendy)", author: "J.M. Barrie", minAge: 7, coverUrl: gutenbergCover("16"), contentLevel: "safe" },
  { gutenbergId: "289", title: "The Wind in the Willows", author: "Kenneth Grahame", minAge: 7, coverUrl: gutenbergCover("289"), contentLevel: "safe" },
  { gutenbergId: "113", title: "The Secret Garden", author: "Frances Hodgson Burnett", minAge: 7, coverUrl: gutenbergCover("113"), contentLevel: "safe" },
  { gutenbergId: "479", title: "A Little Princess", author: "Frances Hodgson Burnett", minAge: 7, coverUrl: gutenbergCover("479"), contentLevel: "safe" },
  { gutenbergId: "32", title: "Heidi", author: "Johanna Spyri", minAge: 7, coverUrl: gutenbergCover("32"), contentLevel: "safe" },
  { gutenbergId: "514", title: "Little Women", author: "Louisa May Alcott", minAge: 7, coverUrl: gutenbergCover("514"), contentLevel: "caution" },
  { gutenbergId: "766", title: "David Copperfield", author: "Charles Dickens", minAge: 9, coverUrl: gutenbergCover("766"), contentLevel: "caution" },
  { gutenbergId: "1260", title: "Jane Eyre", author: "Charlotte Bronte", minAge: 9, coverUrl: gutenbergCover("1260"), contentLevel: "mature" },
  { gutenbergId: "35", title: "The Time Machine", author: "H.G. Wells", minAge: 9, coverUrl: gutenbergCover("35"), contentLevel: "caution" },

  // === Ages 10-12 (Middle grade adventures, classic novels) ===
  { gutenbergId: "120", title: "Treasure Island", author: "Robert Louis Stevenson", minAge: 10, coverUrl: gutenbergCover("120"), contentLevel: "caution" },
  { gutenbergId: "1184", title: "The Count of Monte Cristo", author: "Alexandre Dumas", minAge: 10, coverUrl: gutenbergCover("1184"), contentLevel: "mature" },
  { gutenbergId: "1661", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", minAge: 10, coverUrl: gutenbergCover("1661"), contentLevel: "caution" },
  { gutenbergId: "76", title: "Adventures of Huckleberry Finn", author: "Mark Twain", minAge: 10, coverUrl: gutenbergCover("76"), contentLevel: "caution" },
  { gutenbergId: "74", title: "The Adventures of Tom Sawyer", author: "Mark Twain", minAge: 10, coverUrl: gutenbergCover("74"), contentLevel: "caution" },
  { gutenbergId: "1400", title: "Great Expectations", author: "Charles Dickens", minAge: 10, coverUrl: gutenbergCover("1400"), contentLevel: "caution" },
  { gutenbergId: "46", title: "A Christmas Carol", author: "Charles Dickens", minAge: 10, coverUrl: gutenbergCover("46"), contentLevel: "caution" },
  { gutenbergId: "345", title: "Dracula", author: "Bram Stoker", minAge: 12, coverUrl: gutenbergCover("345"), contentLevel: "mature" },
  { gutenbergId: "1342", title: "Pride and Prejudice", author: "Jane Austen", minAge: 12, coverUrl: gutenbergCover("1342"), contentLevel: "caution" },
  { gutenbergId: "84", title: "Frankenstein", author: "Mary Shelley", minAge: 12, coverUrl: gutenbergCover("84"), contentLevel: "mature" },

  // === Ages 13+ (Young adult classics) ===
  { gutenbergId: "1232", title: "The Prince", author: "Niccolo Machiavelli", minAge: 13, coverUrl: gutenbergCover("1232"), contentLevel: "mature" },
  { gutenbergId: "98", title: "A Tale of Two Cities", author: "Charles Dickens", minAge: 13, coverUrl: gutenbergCover("98"), contentLevel: "mature" },
  { gutenbergId: "2701", title: "Moby Dick", author: "Herman Melville", minAge: 13, coverUrl: gutenbergCover("2701"), contentLevel: "mature" },
  { gutenbergId: "1952", title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", minAge: 13, coverUrl: gutenbergCover("1952"), contentLevel: "mature" },
  { gutenbergId: "174", title: "The Picture of Dorian Gray", author: "Oscar Wilde", minAge: 13, coverUrl: gutenbergCover("174"), contentLevel: "mature" },
  { gutenbergId: "1080", title: "A Modest Proposal", author: "Jonathan Swift", minAge: 13, coverUrl: gutenbergCover("1080"), contentLevel: "mature" },
];

// Build a Set for fast lookup
const PRE_APPROVED_IDS = new Set(PRE_APPROVED_BOOKS.map((b) => b.gutenbergId));

// Build a Map for content level lookup by gutenbergId
const CONTENT_LEVEL_MAP = new Map(PRE_APPROVED_BOOKS.map((b) => [b.gutenbergId, b.contentLevel]));

/** Which content levels each parent setting allows */
const LEVEL_FILTERS: Record<string, Set<ContentLevel>> = {
  safe_only: new Set(["safe"]),
  safe_and_caution: new Set(["safe", "caution"]),
  all_classics: new Set(["safe", "caution", "mature"]),
};

/**
 * Get pre-approved books appropriate for a kid's age and parent's comfort level.
 * Returns books where minAge <= kid's age, filtered by the parent's preApprovedLevel setting.
 * If no age provided, returns all books for ages 7+.
 */
export const getPreApprovedBooks = query({
  args: {
    age: v.optional(v.number()),
    kidId: v.optional(v.id("kids")),
  },
  handler: async (ctx, args) => {
    const maxAge = args.age ?? 9;

    // Get exclusions for this kid and find the parent user
    let exclusions: string[] = [];
    let preApprovedLevel = "safe_and_caution"; // Default
    if (args.kidId) {
      const kid = await ctx.db.get(args.kidId);
      exclusions = kid?.excludedPreApproved ?? [];

      // Look up the parent's comfort level setting
      if (kid?.userId) {
        const parent = await ctx.db.get(kid.userId);
        if (parent?.preApprovedLevel) {
          preApprovedLevel = parent.preApprovedLevel;
        }
      }
    }
    const exclusionSet = new Set(exclusions);
    const allowedLevels = LEVEL_FILTERS[preApprovedLevel] ?? LEVEL_FILTERS.safe_and_caution;

    // Filter to age-appropriate books, excluding parent-removed ones and respecting content level
    // Sort by closest to kid's age first (so 8-year-olds see age 7-9 books before age 3-6)
    return PRE_APPROVED_BOOKS
      .filter((book) => book.minAge <= maxAge)
      .filter((book) => !exclusionSet.has(book.gutenbergId))
      .filter((book) => allowedLevels.has(book.contentLevel))
      .sort((a, b) => b.minAge - a.minAge)
      .map((book) => ({
        gutenbergId: book.gutenbergId,
        googleBookId: `gutenberg:${book.gutenbergId}`,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        minAge: book.minAge,
        contentLevel: book.contentLevel,
        isFreeBook: true,
        isPreApproved: true,
      }));
  },
});

/**
 * Quick check if a gutenbergId is in the pre-approved list.
 */
export const isPreApproved = query({
  args: { gutenbergId: v.string() },
  handler: async (_ctx, args) => {
    return PRE_APPROVED_IDS.has(args.gutenbergId);
  },
});

/**
 * Get the content level for a pre-approved book by gutenbergId.
 * Returns "safe", "caution", "mature", or null if not in the list.
 */
export const getContentLevel = query({
  args: { gutenbergId: v.string() },
  handler: async (_ctx, args) => {
    return CONTENT_LEVEL_MAP.get(args.gutenbergId) ?? null;
  },
});

/**
 * Check if a googleBookId refers to a pre-approved book.
 * Handles both "gutenberg:123" format and raw gutenberg IDs.
 */
export const isPreApprovedByGoogleBookId = query({
  args: { googleBookId: v.string() },
  handler: async (_ctx, args) => {
    const id = args.googleBookId.startsWith("gutenberg:")
      ? args.googleBookId.replace("gutenberg:", "")
      : args.googleBookId;
    return PRE_APPROVED_IDS.has(id);
  },
});

/**
 * Parent excludes a pre-approved book for a specific kid.
 */
export const excludeForKid = mutation({
  args: {
    kidId: v.id("kids"),
    gutenbergId: v.string(),
  },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) throw new Error("Kid not found");

    const current = kid.excludedPreApproved ?? [];
    if (!current.includes(args.gutenbergId)) {
      await ctx.db.patch(args.kidId, {
        excludedPreApproved: [...current, args.gutenbergId],
      });
    }
  },
});

/**
 * Parent re-includes a previously excluded pre-approved book.
 */
export const includeForKid = mutation({
  args: {
    kidId: v.id("kids"),
    gutenbergId: v.string(),
  },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) throw new Error("Kid not found");

    const current = kid.excludedPreApproved ?? [];
    await ctx.db.patch(args.kidId, {
      excludedPreApproved: current.filter((id) => id !== args.gutenbergId),
    });
  },
});
