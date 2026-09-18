import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireKidOwner } from "./identity";
import { CLASSICS, LEVEL_FILTERS } from "./lib/classics";

/**
 * Pre-approved classic children's books from Project Gutenberg.
 * These are universally safe classics that kids can read without parent approval.
 * Parents can exclude specific titles per-kid if desired.
 *
 * Organized by minimum age range.
 */

// The list itself lives in lib/classics.ts (shared with the recommender).
const PRE_APPROVED_BOOKS = CLASSICS;

// Build a Set for fast lookup
const PRE_APPROVED_IDS = new Set(PRE_APPROVED_BOOKS.map((b) => b.gutenbergId));

// Build a Map for content level lookup by gutenbergId
const CONTENT_LEVEL_MAP = new Map(PRE_APPROVED_BOOKS.map((b) => [b.gutenbergId, b.contentLevel]));

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
 * Plain (non-Convex) membership check, so server-side callers can verify a
 * book really is on the pre-approved shelf instead of trusting the client.
 * Accepts "gutenberg:123" or a raw id.
 */
export function isPreApprovedBookId(googleBookId: string): boolean {
  const id = googleBookId.startsWith("gutenberg:")
    ? googleBookId.slice("gutenberg:".length)
    : googleBookId;
  return PRE_APPROVED_IDS.has(id);
}

/**
 * The whole classics list (title/author per Gutenberg id), unfiltered. Static
 * catalog data, so no auth. The parent "Excluded Classics" list needs titles
 * for books that getPreApprovedBooks has, by definition, filtered out.
 */
export const listAll = query({
  args: {},
  handler: async () => {
    return PRE_APPROVED_BOOKS.map((b) => ({
      gutenbergId: b.gutenbergId,
      title: b.title,
      author: b.author,
      minAge: b.minAge,
      contentLevel: b.contentLevel,
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
 * Parent-only: the caller must own the kid (verified Marketing JWT). Before,
 * anyone with a kid id could hide or restore classics on that child's shelf.
 */
export const excludeForKid = mutation({
  args: {
    kidId: v.id("kids"),
    gutenbergId: v.string(),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const kid = await requireKidOwner(ctx, args.userToken, args.kidId, "preApprovedBooks.excludeForKid");

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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const kid = await requireKidOwner(ctx, args.userToken, args.kidId, "preApprovedBooks.includeForKid");

    const current = kid.excludedPreApproved ?? [];
    await ctx.db.patch(args.kidId, {
      excludedPreApproved: current.filter((id) => id !== args.gutenbergId),
    });
  },
});
