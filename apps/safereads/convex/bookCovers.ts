import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ============================================================================
// Book Cover Waterfall System
//
// Tries multiple sources in order to find the best available cover:
// 1. Cache (bookCovers table)
// 2. Open Library (by ISBN or title+author search)
// 3. Google Books (search by title+author, upgrade thumbnail resolution)
// 4. DALL-E 3 (AI-generated cover)
// 5. Stylized fallback (CSS-based cover config returned to client)
// ============================================================================

/**
 * Check the cover cache for a book.
 */
export const getCachedCover = query({
  args: {
    bookIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("bookCovers")
      .withIndex("by_book", (q) => q.eq("bookIdentifier", args.bookIdentifier))
      .first();

    if (!cached) return null;

    // If it has a storageId, get the serving URL
    if (cached.storageId) {
      const url = await ctx.storage.getUrl(cached.storageId);
      if (url) {
        return { coverUrl: url, source: cached.source };
      }
      // Storage URL expired or deleted -- fall through
      return null;
    }

    return { coverUrl: cached.coverUrl, source: cached.source };
  },
});

/**
 * Batch-check cover cache for multiple books at once.
 * Returns a map of bookIdentifier -> { coverUrl, source }.
 */
export const getCachedCovers = query({
  args: {
    bookIdentifiers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, { coverUrl: string; source: string }> = {};

    for (const identifier of args.bookIdentifiers) {
      const cached = await ctx.db
        .query("bookCovers")
        .withIndex("by_book", (q) => q.eq("bookIdentifier", identifier))
        .first();

      if (cached) {
        if (cached.storageId) {
          const url = await ctx.storage.getUrl(cached.storageId);
          if (url) {
            results[identifier] = { coverUrl: url, source: cached.source };
          }
        } else {
          results[identifier] = { coverUrl: cached.coverUrl, source: cached.source };
        }
      }
    }

    return results;
  },
});

/**
 * Store a cover URL in the cache.
 */
export const cacheBookCover = mutation({
  args: {
    bookIdentifier: v.string(),
    coverUrl: v.string(),
    source: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Check if already cached
    const existing = await ctx.db
      .query("bookCovers")
      .withIndex("by_book", (q) => q.eq("bookIdentifier", args.bookIdentifier))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        coverUrl: args.coverUrl,
        source: args.source,
        storageId: args.storageId,
        generatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("bookCovers", {
      bookIdentifier: args.bookIdentifier,
      coverUrl: args.coverUrl,
      source: args.source,
      storageId: args.storageId,
      generatedAt: Date.now(),
    });
  },
});

/**
 * Internal query for checking cache from actions.
 */
export const getCachedCoverInternal = internalQuery({
  args: {
    bookIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("bookCovers")
      .withIndex("by_book", (q) => q.eq("bookIdentifier", args.bookIdentifier))
      .first();

    if (!cached) return null;

    if (cached.storageId) {
      const url = await ctx.storage.getUrl(cached.storageId);
      if (url) {
        return { coverUrl: url, source: cached.source };
      }
      return null;
    }

    return { coverUrl: cached.coverUrl, source: cached.source };
  },
});

/**
 * Internal mutation for caching from actions.
 */
export const cacheBookCoverInternal = internalMutation({
  args: {
    bookIdentifier: v.string(),
    coverUrl: v.string(),
    source: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookCovers")
      .withIndex("by_book", (q) => q.eq("bookIdentifier", args.bookIdentifier))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        coverUrl: args.coverUrl,
        source: args.source,
        storageId: args.storageId,
        generatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("bookCovers", {
      bookIdentifier: args.bookIdentifier,
      coverUrl: args.coverUrl,
      source: args.source,
      storageId: args.storageId,
      generatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Cover Source Helpers
// ============================================================================

/**
 * Try to find a cover from Open Library.
 * Tries ISBN first, then falls back to title+author search.
 */
async function tryOpenLibrary(
  title: string,
  author: string,
  isbn?: string
): Promise<string | null> {
  // Try ISBN-based cover first (most reliable)
  if (isbn) {
    const isbnUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    try {
      const resp = await fetch(isbnUrl, { method: "HEAD", redirect: "follow" });
      // Open Library returns a 1x1 pixel image for missing covers
      const contentLength = resp.headers.get("content-length");
      if (resp.ok && contentLength && parseInt(contentLength) > 1000) {
        return isbnUrl;
      }
    } catch {
      // Continue to next method
    }
  }

  // Search by title + author
  try {
    const searchParams = new URLSearchParams({
      title: title,
      author: author,
      limit: "1",
    });
    const searchUrl = `https://openlibrary.org/search.json?${searchParams.toString()}`;
    const resp = await fetch(searchUrl, {
      headers: { "User-Agent": "SafeReads/1.0 (getsafereads.com)" },
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.docs || data.docs.length === 0) return null;

    const doc = data.docs[0];

    // Try cover_i (cover ID)
    if (doc.cover_i) {
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }

    // Try OLID-based cover
    if (doc.key) {
      const olid = doc.key.replace("/works/", "");
      return `https://covers.openlibrary.org/b/olid/${olid}-L.jpg`;
    }

    // Try ISBN from search results
    if (doc.isbn && doc.isbn.length > 0) {
      return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Try to find a cover from Google Books.
 * Searches by title+author, grabs thumbnail and upgrades resolution.
 */
async function tryGoogleBooks(
  title: string,
  author: string
): Promise<string | null> {
  try {
    const q = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items(volumeInfo/imageLinks)`;
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.items || data.items.length === 0) return null;

    const imageLinks = data.items[0].volumeInfo?.imageLinks;
    if (!imageLinks) return null;

    // Prefer largest available, upgrade zoom level
    const thumbnail =
      imageLinks.extraLarge ||
      imageLinks.large ||
      imageLinks.medium ||
      imageLinks.small ||
      imageLinks.thumbnail ||
      imageLinks.smallThumbnail;

    if (!thumbnail) return null;

    // Upgrade to higher resolution: replace zoom=1 with zoom=3
    let highRes = thumbnail
      .replace("zoom=1", "zoom=3")
      .replace("zoom=2", "zoom=3");

    // Also remove edge=curl if present (cleaner image)
    highRes = highRes.replace("&edge=curl", "");

    // Ensure HTTPS
    highRes = highRes.replace("http://", "https://");

    return highRes;
  } catch {
    return null;
  }
}

/**
 * Validate that a URL actually returns a usable image (not a placeholder).
 */
async function validateCoverUrl(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!resp.ok) return false;
    const contentLength = resp.headers.get("content-length");
    const contentType = resp.headers.get("content-type") || "";
    // Must be an image and more than 1KB (filter out 1x1 pixel placeholders)
    return contentType.startsWith("image/") && (!contentLength || parseInt(contentLength) > 1000);
  } catch {
    return false;
  }
}

// ============================================================================
// Main Waterfall Action
// ============================================================================

/**
 * Get the best available cover for a book.
 * Tries cache -> Open Library -> Google Books -> returns null (caller handles fallback).
 *
 * Does NOT trigger DALL-E generation automatically (that's an admin action).
 */
export const getBestCover = action({
  args: {
    title: v.string(),
    author: v.string(),
    gutenbergId: v.optional(v.string()),
    isbn: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    coverUrl: string | null;
    source: string;
  }> => {
    const identifier = args.gutenbergId || args.isbn || `${args.title}::${args.author}`;

    // 1. Check cache
    const cached = await ctx.runQuery(internal.bookCovers.getCachedCoverInternal, {
      bookIdentifier: identifier,
    });
    if (cached) {
      return cached;
    }

    // 2. Try Open Library
    const openLibUrl = await tryOpenLibrary(args.title, args.author, args.isbn);
    if (openLibUrl) {
      const isValid = await validateCoverUrl(openLibUrl);
      if (isValid) {
        // Cache it
        await ctx.runMutation(internal.bookCovers.cacheBookCoverInternal, {
          bookIdentifier: identifier,
          coverUrl: openLibUrl,
          source: "openlibrary",
        });
        return { coverUrl: openLibUrl, source: "openlibrary" };
      }
    }

    // 3. Try Google Books
    const googleUrl = await tryGoogleBooks(args.title, args.author);
    if (googleUrl) {
      // Google Books URLs are generally valid if returned
      await ctx.runMutation(internal.bookCovers.cacheBookCoverInternal, {
        bookIdentifier: identifier,
        coverUrl: googleUrl,
        source: "google",
      });
      return { coverUrl: googleUrl, source: "google" };
    }

    // 4. No cover found from external sources
    // Return null -- the client will use the StylizedCover component
    return { coverUrl: null, source: "fallback" };
  },
});

/**
 * Generate a DALL-E 3 cover for a book and store it in Convex file storage.
 * This is an admin-triggered action, not called automatically.
 */
export const generateAICover = action({
  args: {
    title: v.string(),
    author: v.string(),
    genre: v.optional(v.string()),
    ageRange: v.optional(v.string()),
    bookIdentifier: v.string(), // gutenbergId or other identifier
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const genre = args.genre || "classic literature";
    const ageRange = args.ageRange || "8-14";

    const prompt = `Children's book cover illustration for '${args.title}' by ${args.author}. ${genre} genre, suitable for ages ${ageRange}. Colorful, whimsical, modern children's book illustration style. No text on the cover.`;

    // Call DALL-E 3
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DALL-E API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL returned from DALL-E");
    }

    // Download the image (DALL-E URLs expire after 1 hour)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download generated image");
    }
    const imageBlob = await imageResponse.blob();

    // Store in Convex file storage (permanent)
    const storageId = await ctx.storage.store(imageBlob);
    const servingUrl = await ctx.storage.getUrl(storageId);

    // Cache the cover
    await ctx.runMutation(internal.bookCovers.cacheBookCoverInternal, {
      bookIdentifier: args.bookIdentifier,
      coverUrl: servingUrl || imageUrl,
      source: "dalle",
      storageId,
    });

    return {
      coverUrl: servingUrl,
      source: "dalle",
      storageId,
    };
  },
});
