import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// ============================================================================
// Book Dash Integration (via Global Digital Library)
// ============================================================================
// Book Dash produces 200+ beautifully illustrated children's books
// under CC-BY-4.0 license (safe for commercial use).
// Available via Global Digital Library (GDL) API.
// Focus on ages 3-9 with great illustrations.
// ============================================================================

const GDL_API_BASE = "https://opds.digitallibrary.io/v1/en";

interface GDLBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  readingLevel?: string;
  language: string;
  license: string;
  downloadUrl?: string;
  description?: string;
  publisher?: string;
}

/**
 * Parse a GDL OPDS feed for Book Dash content.
 */
function parseGDLFeed(xml: string): GDLBook[] {
  const books: GDLBook[] = [];

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const id = extractTag(entry, "id") || "";
    const title = extractTag(entry, "title") || "";

    // Extract authors (may be multiple <author> elements)
    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(cleanHtml(authorMatch[1]));
    }

    // Cover image
    const coverMatch = entry.match(
      /<link[^>]*rel="http:\/\/opds-spec\.org\/image(?:\/thumbnail)?"[^>]*href="([^"]*)"[^>]*\/?>/
    );
    const coverUrl = coverMatch?.[1];

    // License check - only CC-BY (skip CC-BY-NC)
    const rightsText = extractTag(entry, "rights") || extractTag(entry, "dcterms:license") || "";
    const isCCBY =
      rightsText.toLowerCase().includes("cc-by") ||
      rightsText.toLowerCase().includes("cc by") ||
      rightsText.toLowerCase().includes("creative commons attribution");
    const isNC =
      rightsText.toLowerCase().includes("-nc") ||
      rightsText.toLowerCase().includes("noncommercial");

    // Publisher check for Book Dash
    const publisher = extractTag(entry, "dcterms:publisher") || extractTag(entry, "publisher") || "";

    // Reading level
    const levelMatch = entry.match(/level[:\s]*(\d)/i);

    // Download link
    const downloadMatch = entry.match(
      /<link[^>]*rel="http:\/\/opds-spec\.org\/acquisition(?:\/open-access)?"[^>]*href="([^"]*)"[^>]*\/?>/
    );

    // Description / summary
    const summary = extractTag(entry, "summary") || extractTag(entry, "content") || "";

    if (title && isCCBY && !isNC) {
      books.push({
        id: id || `gdl-${books.length}`,
        title: cleanHtml(title),
        authors: authors.length > 0 ? authors : ["Unknown Author"],
        coverUrl: coverUrl || undefined,
        readingLevel: levelMatch?.[1] || undefined,
        language: "English",
        license: rightsText,
        downloadUrl: downloadMatch?.[1] || undefined,
        description: cleanHtml(summary).substring(0, 200) || undefined,
        publisher: cleanHtml(publisher) || undefined,
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
 * Search Book Dash / Global Digital Library for illustrated kids books.
 * Returns CC-BY licensed content only.
 */
export const searchBookDash = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const cacheKey = `bookdash:search:${args.query.toLowerCase().trim()}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      // GDL OPDS search endpoint
      const url = `${GDL_API_BASE}/search?q=${encodeURIComponent(args.query)}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/atom+xml, application/xml",
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
        },
      });

      if (!response.ok) {
        console.error(`GDL API error: ${response.status}`);
        return [];
      }

      const xml = await response.text();
      const books = parseGDLFeed(xml).slice(0, 20);

      const results = books.map((book) => ({
        id: `bookdash:${book.id}`,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        source: "bookdash" as const,
        formats: {
          html: book.downloadUrl || undefined,
        },
        readingLevel: book.readingLevel,
        ageRange: "3-9",
        description: book.description,
        publisher: book.publisher,
      }));

      await ctx.runMutation(internal.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("Book Dash search failed:", error);
      return [];
    }
  },
});

/**
 * Browse Book Dash / GDL books by category.
 */
export const browseBookDash = action({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const category = args.category || "featured";
    const cacheKey = `bookdash:browse:${category}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      const categorySearchTerms: Record<string, string> = {
        featured: "children story",
        animals: "animals",
        counting: "counting numbers math",
        family: "family friends",
        nature: "nature garden",
        adventure: "adventure",
      };

      const searchTerm = categorySearchTerms[category] || category;
      const url = `${GDL_API_BASE}/search?q=${encodeURIComponent(searchTerm)}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/atom+xml, application/xml",
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
        },
      });

      if (!response.ok) return [];

      const xml = await response.text();
      const books = parseGDLFeed(xml).slice(0, 20);

      const results = books.map((book) => ({
        id: `bookdash:${book.id}`,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        source: "bookdash" as const,
        formats: { html: book.downloadUrl || undefined },
        readingLevel: book.readingLevel,
        ageRange: "3-9",
        description: book.description,
        publisher: book.publisher,
      }));

      await ctx.runMutation(internal.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("Book Dash browse failed:", error);
      return [];
    }
  },
});
