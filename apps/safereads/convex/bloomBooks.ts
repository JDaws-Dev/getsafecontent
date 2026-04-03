import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ============================================================================
// Bloom Library Integration (OPDS Catalog)
// ============================================================================
// Bloom Library hosts 22K+ illustrated children's books.
// We filter for CC-BY licensed content only (safe for commercial use).
// OPDS is an Atom/XML feed format for book catalogs.
// ============================================================================

const BLOOM_OPDS_BASE = "https://bloomlibrary.org/catalog";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface BloomBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  language: string;
  readingLevel?: string;
  license?: string;
  downloadUrl?: string;
}

/**
 * Parse an OPDS Atom feed XML string into BloomBook objects.
 * Filters to CC-BY licensed, English content only.
 */
function parseOPDSFeed(xml: string): BloomBook[] {
  const books: BloomBook[] = [];

  // Parse <entry> elements from the Atom feed
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    // Extract fields using regex (lightweight XML parsing for Convex actions)
    const id = extractTag(entry, "id") || "";
    const title = extractTag(entry, "title") || "";
    const authorName = extractTag(entry, "name") || "Unknown Author";

    // Extract cover image from <link rel="http://opds-spec.org/image" .../>
    const coverMatch = entry.match(
      /<link[^>]*rel="http:\/\/opds-spec\.org\/image"[^>]*href="([^"]*)"[^>]*\/?>/
    );
    const coverUrl = coverMatch?.[1];

    // Extract license from <rights> or <dcterms:license>
    const rights = extractTag(entry, "rights") || extractTag(entry, "dcterms:license") || "";

    // Extract language
    const language = extractTag(entry, "dcterms:language") || extractTag(entry, "language") || "";

    // Only include CC-BY licensed English books (skip CC-BY-NC)
    const isCCBY = rights.toLowerCase().includes("cc-by") || rights.toLowerCase().includes("cc by");
    const isNC = rights.toLowerCase().includes("-nc") || rights.toLowerCase().includes("noncommercial");
    const isEnglish = language.toLowerCase().startsWith("en");

    if (!isNC && isCCBY && isEnglish && title) {
      // Extract download link
      const downloadMatch = entry.match(
        /<link[^>]*rel="http:\/\/opds-spec\.org\/acquisition"[^>]*href="([^"]*)"[^>]*\/?>/
      );

      books.push({
        id: id || `bloom-${books.length}`,
        title: cleanHtml(title),
        authors: [cleanHtml(authorName)],
        coverUrl: coverUrl || undefined,
        language: "English",
        license: rights,
        downloadUrl: downloadMatch?.[1] || undefined,
      });
    }
  }

  return books;
}

/** Extract text content from a simple XML tag */
function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/** Strip HTML entities and tags */
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Search Bloom Library for free illustrated children's books.
 * Returns CC-BY licensed English books only.
 */
export const searchBloom = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const cacheKey = `bloom:search:${args.query.toLowerCase().trim()}`;

    // Check cache first
    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      const url = `${BLOOM_OPDS_BASE}?search=${encodeURIComponent(args.query)}&lang=en`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/atom+xml",
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
        },
      });

      if (!response.ok) {
        console.error(`Bloom OPDS error: ${response.status}`);
        return [];
      }

      const xml = await response.text();
      const books = parseOPDSFeed(xml).slice(0, 20);

      // Normalize to unified format
      const results = books.map((book) => ({
        id: `bloom:${book.id}`,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        source: "bloom" as const,
        formats: {
          html: book.downloadUrl || undefined,
        },
        readingLevel: book.readingLevel,
        ageRange: "3-9",
      }));

      // Cache results
      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("Bloom search failed:", error);
      return [];
    }
  },
});

/**
 * Browse Bloom Library by reading level / category.
 */
export const browseBloom = action({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const category = args.category || "early-readers";
    const cacheKey = `bloom:browse:${category}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      // Bloom's OPDS catalog root lists categories / collections
      const searchTerms: Record<string, string> = {
        "early-readers": "first words",
        animals: "animals",
        counting: "counting numbers",
        alphabet: "alphabet letters",
        stories: "story",
      };

      const term = searchTerms[category] || category;
      const url = `${BLOOM_OPDS_BASE}?search=${encodeURIComponent(term)}&lang=en`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/atom+xml",
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
        },
      });

      if (!response.ok) return [];

      const xml = await response.text();
      const books = parseOPDSFeed(xml).slice(0, 20);

      const results = books.map((book) => ({
        id: `bloom:${book.id}`,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        source: "bloom" as const,
        formats: { html: book.downloadUrl || undefined },
        readingLevel: book.readingLevel,
        ageRange: "3-9",
      }));

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("Bloom browse failed:", error);
      return [];
    }
  },
});
