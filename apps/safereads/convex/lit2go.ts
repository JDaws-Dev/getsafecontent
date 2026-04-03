import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ============================================================================
// Lit2Go Integration (University of South Florida)
// ============================================================================
// Lit2Go provides free audio narration of public domain literature with
// reading level metadata (Flesch-Kincaid scores, word counts).
// No formal API — we use structured URLs and parse HTML responses.
// Base URL: https://etc.usf.edu/lit2go/
// ============================================================================

const LIT2GO_BASE = "https://etc.usf.edu/lit2go";

interface Lit2GoBook {
  id: string;
  title: string;
  author: string;
  readingLevel?: string;
  fleschKincaid?: number;
  wordCount?: number;
  chapters: Lit2GoChapter[];
  coverUrl?: string;
  bookUrl: string;
}

interface Lit2GoChapter {
  title: string;
  audioUrl: string;
  textUrl?: string;
  duration?: string;
}

/**
 * Parse Lit2Go search results page HTML to extract book listings.
 */
function parseLit2GoSearchResults(html: string): Array<{
  id: string;
  title: string;
  author: string;
  bookUrl: string;
  readingLevel?: string;
  coverUrl?: string;
}> {
  const results: Array<{
    id: string;
    title: string;
    author: string;
    bookUrl: string;
    readingLevel?: string;
    coverUrl?: string;
  }> = [];

  // Lit2Go search results are in structured HTML with book cards
  // Look for book links in the format /lit2go/{id}/{slug}
  const bookLinkRegex = /href="\/lit2go\/(\d+)\/([^"]+)"/g;
  const titleRegex = /<h[23][^>]*>([^<]+)<\/h[23]>/g;
  const authorRegex = /by\s+<[^>]*>([^<]+)<\/[^>]*>/gi;

  // Simpler approach: find all book entries
  const entryRegex = /<div[^>]*class="[^"]*book[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let entryMatch;

  // Fallback: extract individual book links
  let linkMatch;
  const seen = new Set<string>();

  while ((linkMatch = bookLinkRegex.exec(html)) !== null) {
    const id = linkMatch[1];
    if (seen.has(id)) continue;
    seen.add(id);

    const slug = linkMatch[2].replace(/\//g, "");

    // Try to extract title from nearby context (200 chars around the link)
    const pos = linkMatch.index;
    const context = html.substring(Math.max(0, pos - 200), pos + 300);

    // Extract title - usually in a heading or strong tag near the link
    const titleMatch = context.match(/<(?:h[234]|strong|b)[^>]*>\s*([^<]{2,80})\s*<\//i);
    const title = titleMatch?.[1]?.trim() || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // Extract author
    const authorMatch = context.match(/by\s+([A-Z][^<,]{2,50})/i);
    const author = authorMatch?.[1]?.trim() || "Unknown Author";

    // Extract reading level if present
    const levelMatch = context.match(/(?:reading level|grade level|flesch)[:\s]*([^<,]{1,20})/i);

    results.push({
      id,
      title,
      author,
      bookUrl: `${LIT2GO_BASE}/${id}/${linkMatch[2]}`,
      readingLevel: levelMatch?.[1]?.trim(),
    });
  }

  return results;
}

/**
 * Parse a Lit2Go book detail page to extract chapter audio URLs.
 */
function parseLit2GoBookDetail(html: string, bookId: string): Lit2GoChapter[] {
  const chapters: Lit2GoChapter[] = [];

  // Audio files on Lit2Go follow the pattern:
  // https://etc.usf.edu/lit2go/audio/mp3/{bookId}/{filename}.mp3
  const audioRegex = /href="([^"]*\.mp3)"/g;
  let audioMatch;

  while ((audioMatch = audioRegex.exec(html)) !== null) {
    let audioUrl = audioMatch[1];
    if (!audioUrl.startsWith("http")) {
      audioUrl = `${LIT2GO_BASE}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;
    }

    // Try to extract chapter title from nearby context
    const pos = audioMatch.index;
    const context = html.substring(Math.max(0, pos - 200), pos);
    const chapterTitle = context.match(/<(?:h[234]|strong|td)[^>]*>\s*([^<]{2,60})\s*<\//i);

    chapters.push({
      title: chapterTitle?.[1]?.trim() || `Chapter ${chapters.length + 1}`,
      audioUrl,
    });
  }

  return chapters;
}

/**
 * Search Lit2Go for books with audio narration.
 */
export const searchLit2Go = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const cacheKey = `lit2go:search:${args.query.toLowerCase().trim()}`;

    // Check cache
    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      const url = `${LIT2GO_BASE}/search?q=${encodeURIComponent(args.query)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
          Accept: "text/html",
        },
      });

      if (!response.ok) {
        console.error(`Lit2Go search error: ${response.status}`);
        return [];
      }

      const html = await response.text();
      const bookListings = parseLit2GoSearchResults(html).slice(0, 15);

      const results = bookListings.map((book) => ({
        id: `lit2go:${book.id}`,
        title: book.title,
        authors: [book.author],
        coverUrl: book.coverUrl,
        source: "lit2go" as const,
        formats: {
          html: book.bookUrl,
        },
        readingLevel: book.readingLevel,
        hasAudio: true,
        bookUrl: book.bookUrl,
      }));

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("Lit2Go search failed:", error);
      return [];
    }
  },
});

/**
 * Get audio chapters for a specific Lit2Go book.
 */
export const getLit2GoAudio = action({
  args: {
    bookId: v.string(), // The numeric Lit2Go book ID (without "lit2go:" prefix)
    bookUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ chapters: Array<{ title: string; audioUrl: string }> }> => {
    const cacheKey = `lit2go:audio:${args.bookId}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      const response = await fetch(args.bookUrl, {
        headers: {
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
          Accept: "text/html",
        },
      });

      if (!response.ok) {
        return { chapters: [] };
      }

      const html = await response.text();
      const chapters = parseLit2GoBookDetail(html, args.bookId);

      const result = { chapters };

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(result),
      });

      return result;
    } catch (error) {
      console.error("Lit2Go audio fetch failed:", error);
      return { chapters: [] };
    }
  },
});

/**
 * Browse Lit2Go by reading level.
 */
export const browseLit2Go = action({
  args: {
    readingLevel: v.optional(v.string()), // e.g., "1", "2", "3-5", "6-8"
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const level = args.readingLevel || "3-5";
    const cacheKey = `lit2go:browse:level-${level}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      const url = `${LIT2GO_BASE}/books?reading_level=${encodeURIComponent(level)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
          Accept: "text/html",
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const bookListings = parseLit2GoSearchResults(html).slice(0, 20);

      const results = bookListings.map((book) => ({
        id: `lit2go:${book.id}`,
        title: book.title,
        authors: [book.author],
        coverUrl: book.coverUrl,
        source: "lit2go" as const,
        formats: { html: book.bookUrl },
        readingLevel: book.readingLevel || level,
        hasAudio: true,
        bookUrl: book.bookUrl,
      }));

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("Lit2Go browse failed:", error);
      return [];
    }
  },
});
