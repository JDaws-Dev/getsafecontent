import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ============================================================================
// LibriVox Integration (Free Audiobooks)
// ============================================================================
// LibriVox provides 20K+ free audiobooks of public domain works.
// JSON API at https://librivox.org/api/feed/audiobooks
// Audio files are hosted on archive.org as MP3s.
// No auth needed.
// ============================================================================

const LIBRIVOX_API = "https://librivox.org/api/feed/audiobooks";

interface LibriVoxAuthor {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  dod: string;
}

interface LibriVoxSection {
  id: string;
  section_number: string;
  title: string;
  listen_url: string;
  language: string;
  playtime: string;
}

interface LibriVoxBook {
  id: string;
  title: string;
  description: string;
  url_text_source: string; // Link to Gutenberg text
  language: string;
  copyright_year: string;
  num_sections: string;
  url_rss: string;
  url_zip_file: string;
  url_project: string;
  url_librivox: string;
  url_iarchive: string;
  totaltime: string;
  totaltimesecs: number;
  authors: LibriVoxAuthor[];
  sections?: LibriVoxSection[];
}

interface LibriVoxResponse {
  books: LibriVoxBook[];
}

/** Subjects/keywords considered not kid-friendly for audiobook filtering */
const EXCLUDED_KEYWORDS = [
  "erotica",
  "erotic",
  "pornograph",
  "adult only",
  "explicit",
];

function isKidSafe(book: LibriVoxBook): boolean {
  const desc = (book.description || "").toLowerCase();
  const title = book.title.toLowerCase();
  for (const kw of EXCLUDED_KEYWORDS) {
    if (desc.includes(kw) || title.includes(kw)) return false;
  }
  return true;
}

function formatAuthorName(author: LibriVoxAuthor): string {
  const first = author.first_name?.trim() || "";
  const last = author.last_name?.trim() || "";
  if (first && last) return `${first} ${last}`;
  return last || first || "Unknown Author";
}

/**
 * Format total time from seconds to a readable string.
 */
function formatDuration(totalSecs: number): string {
  if (!totalSecs || totalSecs <= 0) return "";
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Parse a LibriVox book into our unified format.
 */
function parseLibriVoxBook(book: LibriVoxBook) {
  const authors = (book.authors || []).map(formatAuthorName);

  // LibriVox doesn't serve cover images directly, but archive.org does
  // Format: https://archive.org/services/img/{iarchive_id}
  let coverUrl: string | undefined;
  if (book.url_iarchive) {
    const iarchiveId = book.url_iarchive.split("/").filter(Boolean).pop();
    if (iarchiveId) {
      coverUrl = `https://archive.org/services/img/${iarchiveId}`;
    }
  }

  // Extract Gutenberg ID from text source URL if available
  let gutenbergId: string | undefined;
  if (book.url_text_source) {
    const gutMatch = book.url_text_source.match(/gutenberg\.org\/(?:ebooks|files)\/(\d+)/);
    if (gutMatch) gutenbergId = gutMatch[1];
  }

  return {
    id: `librivox:${book.id}`,
    title: book.title,
    authors,
    coverUrl,
    source: "librivox" as const,
    formats: {
      // Link to Gutenberg text version for read-along
      html: book.url_text_source || undefined,
    },
    hasAudio: true,
    audioUrl: book.url_zip_file || undefined, // ZIP of all MP3s
    rssUrl: book.url_rss || undefined, // RSS feed with individual chapter MP3s
    iarchiveUrl: book.url_iarchive || undefined,
    totalTime: formatDuration(book.totaltimesecs),
    totalTimeSecs: book.totaltimesecs,
    numSections: parseInt(book.num_sections) || 0,
    description: book.description?.substring(0, 200) || undefined,
    gutenbergId,
    librivoxUrl: book.url_librivox || undefined,
  };
}

/**
 * Search LibriVox for free audiobooks.
 */
export const searchLibriVox = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const cacheKey = `librivox:search:${args.query.toLowerCase().trim()}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      // LibriVox API uses ^ prefix for title search matching
      const params = new URLSearchParams({
        title: `^${args.query}`,
        format: "json",
        limit: "20",
      });

      const url = `${LIBRIVOX_API}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`LibriVox API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as LibriVoxResponse;

      if (!data.books || !Array.isArray(data.books)) {
        return [];
      }

      const results = data.books
        .filter(isKidSafe)
        .filter((b) => b.language === "English")
        .slice(0, 20)
        .map(parseLibriVoxBook);

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("LibriVox search failed:", error);
      return [];
    }
  },
});

/**
 * Get chapter-level audio details for a LibriVox audiobook.
 * Parses the RSS feed to get individual chapter MP3 URLs.
 */
export const getLibriVoxChapters = action({
  args: {
    rssUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ chapters: Array<{ title: string; url: string; duration?: string }> }> => {
    const cacheKey = `librivox:chapters:${args.rssUrl}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      const response = await fetch(args.rssUrl, {
        headers: {
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });

      if (!response.ok) {
        return { chapters: [] };
      }

      const xml = await response.text();
      const chapters: Array<{ title: string; url: string; duration?: string }> = [];

      // Parse RSS <item> elements
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xml)) !== null) {
        const item = match[1];

        // Extract title
        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const title = titleMatch?.[1]?.trim() || `Chapter ${chapters.length + 1}`;

        // Extract MP3 URL from <enclosure url="..." />
        const enclosureMatch = item.match(/<enclosure[^>]*url="([^"]*\.mp3[^"]*)"/i);
        if (!enclosureMatch) continue;

        // Extract duration from <itunes:duration> or <duration>
        const durationMatch = item.match(/<(?:itunes:)?duration>([^<]+)<\/(?:itunes:)?duration>/i);

        chapters.push({
          title: cleanXml(title),
          url: enclosureMatch[1],
          duration: durationMatch?.[1]?.trim(),
        });
      }

      const result = { chapters };

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(result),
      });

      return result;
    } catch (error) {
      console.error("LibriVox RSS parse failed:", error);
      return { chapters: [] };
    }
  },
});

/**
 * Browse LibriVox audiobooks by genre/category.
 */
export const browseLibriVox = action({
  args: {
    genre: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const genre = args.genre || "children";
    const cacheKey = `librivox:browse:${genre}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      // LibriVox genre search via title keywords
      const genreSearchTerms: Record<string, string> = {
        children: "children",
        adventure: "adventure",
        "fairy-tales": "fairy tales",
        fantasy: "wonderland magic fairy",
        science: "science nature",
        history: "history",
        mystery: "mystery detective",
        classics: "classic",
      };

      const searchTerm = genreSearchTerms[genre] || genre;
      const params = new URLSearchParams({
        title: searchTerm,
        format: "json",
        limit: "20",
      });

      const url = `${LIBRIVOX_API}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
          Accept: "application/json",
        },
      });

      if (!response.ok) return [];

      const data = (await response.json()) as LibriVoxResponse;
      if (!data.books || !Array.isArray(data.books)) return [];

      const results = data.books
        .filter(isKidSafe)
        .filter((b) => b.language === "English")
        .slice(0, 20)
        .map(parseLibriVoxBook);

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch (error) {
      console.error("LibriVox browse failed:", error);
      return [];
    }
  },
});

/**
 * Find a LibriVox audiobook matching a given title and author.
 * Useful for pairing Gutenberg text with LibriVox audio.
 */
export const findAudioMatch = action({
  args: {
    title: v.string(),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown> | null> => {
    const cacheKey = `librivox:match:${args.title.toLowerCase().trim()}`;

    const cached = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      const result = JSON.parse(cached.results);
      return result;
    }

    try {
      const params = new URLSearchParams({
        title: args.title,
        format: "json",
        limit: "5",
      });

      if (args.author) {
        params.set("author", args.author);
      }

      const url = `${LIBRIVOX_API}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
          Accept: "application/json",
        },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as LibriVoxResponse;
      if (!data.books || data.books.length === 0) return null;

      // Return the best match (first result)
      const book = data.books[0];
      const result = parseLibriVoxBook(book);

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(result),
      });

      return result;
    } catch (error) {
      console.error("LibriVox match failed:", error);
      return null;
    }
  },
});

/** Strip XML/HTML entities */
function cleanXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
