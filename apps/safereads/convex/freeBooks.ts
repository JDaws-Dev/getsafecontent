import { v } from "convex/values";
import { action, query, mutation, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

// ============================================================================
// Project Gutenberg Integration (via Gutendex API)
// ============================================================================

interface GutendexAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  formats: Record<string, string>;
  download_count: number;
  media_type: string;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

/** Bookshelves considered kid-friendly for filtering */
const KID_FRIENDLY_BOOKSHELVES = [
  "Children's Literature",
  "Children's Fiction",
  "Children's Myths, Fairy Tales, etc.",
  "Children's Picture Books",
  "Children's Instructional Books",
  "Children's Book Series",
  "Nursery Rhymes",
  "Bedtime",
];

/** Subjects to exclude (not kid-friendly) */
const EXCLUDED_SUBJECTS = [
  "erotica",
  "pornography",
  "horror",
  "gore",
  "torture",
];

function isKidFriendly(book: GutendexBook): boolean {
  const lowerSubjects = book.subjects.map((s) => s.toLowerCase());
  const lowerShelves = book.bookshelves.map((s) => s.toLowerCase());

  // Exclude explicit content
  for (const excluded of EXCLUDED_SUBJECTS) {
    if (
      lowerSubjects.some((s) => s.includes(excluded)) ||
      lowerShelves.some((s) => s.includes(excluded))
    ) {
      return false;
    }
  }

  return true;
}

function getGutenbergCoverUrl(book: GutendexBook): string | undefined {
  return (
    book.formats["image/jpeg"] ||
    book.formats["image/png"] ||
    undefined
  );
}

function getGutenbergFormats(book: GutendexBook) {
  return {
    html:
      book.formats["text/html; charset=utf-8"] ||
      book.formats["text/html"] ||
      undefined,
    epub:
      book.formats["application/epub+zip"] || undefined,
    txt:
      book.formats["text/plain; charset=utf-8"] ||
      book.formats["text/plain; charset=us-ascii"] ||
      book.formats["text/plain"] ||
      undefined,
  };
}

function parseGutenbergBook(book: GutendexBook) {
  const formats = getGutenbergFormats(book);
  return {
    id: String(book.id),
    title: book.title,
    authors: book.authors.map((a) => a.name),
    subjects: book.subjects,
    bookshelves: book.bookshelves,
    coverUrl: getGutenbergCoverUrl(book),
    formats,
    downloadCount: book.download_count,
    source: "gutenberg" as const,
  };
}

/**
 * Search Project Gutenberg for free public domain books via Gutendex API.
 * Filters for kid-friendly content by default.
 */
export const searchFreeBooks = action({
  args: {
    query: v.string(),
    childrenOnly: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const childrenOnly = args.childrenOnly ?? true;

    const params = new URLSearchParams({
      search: args.query,
      languages: "en",
    });

    if (childrenOnly) {
      params.set("topic", "children");
    }

    const url = `https://gutendex.com/books/?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Gutendex API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as GutendexResponse;

    const books = data.results
      .filter(isKidFriendly)
      .filter((b) => b.languages.includes("en"))
      .slice(0, 20)
      .map(parseGutenbergBook);

    return books;
  },
});

/**
 * Get a specific book's details and available formats from Project Gutenberg.
 */
export const getFreeBook = action({
  args: {
    gutenbergId: v.string(),
  },
  handler: async (_ctx, args) => {
    const url = `https://gutendex.com/books/${args.gutenbergId}/`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Gutendex API error: ${response.status} ${response.statusText}`
      );
    }

    const book = (await response.json()) as GutendexBook;
    return parseGutenbergBook(book);
  },
});

/**
 * Fetch the actual HTML content of a Gutenberg book for in-app reading.
 * Strips Gutenberg header/footer boilerplate and returns clean content.
 */
export const getFreeBookContent = action({
  args: {
    gutenbergId: v.string(),
  },
  handler: async (_ctx, args) => {
    const id = args.gutenbergId;

    // Try multiple Gutenberg HTML URLs (they vary by book)
    const urls = [
      `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
      `https://www.gutenberg.org/cache/epub/${id}/pg${id}.html`,
      `https://www.gutenberg.org/files/${id}/${id}-h/${id}-h.htm`,
    ];

    let html = "";
    let success = false;

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "SafeReads/1.0 (getsafereads.com)" },
        });
        if (response.ok) {
          html = await response.text();
          success = true;
          break;
        }
      } catch {
        // Try next URL
        continue;
      }
    }

    if (!success || !html) {
      return { content: null, error: "Book content not available in HTML format." };
    }

    // Fix relative image URLs to absolute Gutenberg URLs
    const baseUrl = `https://www.gutenberg.org/cache/epub/${id}/`;
    const fixedHtml = html
      .replace(/src="images\//g, `src="${baseUrl}images/`)
      .replace(/src='images\//g, `src='${baseUrl}images/`)
      .replace(/src="\.\/images\//g, `src="${baseUrl}images/`)
      .replace(/src='\.\/images\//g, `src='${baseUrl}images/`);

    // Extract body content and strip Gutenberg boilerplate
    const cleanedHtml = stripGutenbergBoilerplate(fixedHtml);

    return { content: cleanedHtml, error: null };
  },
});

/**
 * Strip Project Gutenberg header/footer boilerplate from HTML content.
 * Gutenberg books have standardized markers we can use to find the real content.
 */
function stripGutenbergBoilerplate(html: string): string {
  // Extract just the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  // Common Gutenberg start markers
  const startMarkers = [
    /<!--\s*END\s+THE SMALL PRINT[\s\S]*?-->/i,
    /\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG[\s\S]*?\*\*\*/i,
    /<[^>]*id="pg-start-separator"[^>]*>[\s\S]*?<\/[^>]*>/i,
    /Produced by[\s\S]*?<\/p>/i,
  ];

  // Common Gutenberg end markers
  const endMarkers = [
    /\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG[\s\S]*$/i,
    /<[^>]*id="pg-end-separator"[^>]*>[\s\S]*$/i,
    /End of (the )?Project Gutenberg[\s\S]*$/i,
    /<!--\s*FOOTER\s*-->[\s\S]*$/i,
  ];

  for (const marker of startMarkers) {
    const match = content.match(marker);
    if (match && match.index !== undefined) {
      content = content.substring(match.index + match[0].length);
      break;
    }
  }

  for (const marker of endMarkers) {
    const match = content.match(marker);
    if (match && match.index !== undefined) {
      content = content.substring(0, match.index);
      break;
    }
  }

  // Remove edition info and Gutenberg metadata lines
  const metadataPatterns = [
    // Edition references (e.g., "THE MILLENNIUM FULCRUM EDITION 3.0")
    /<[^>]*>[^<]*MILLENNIUM FULCRUM[^<]*<\/[^>]*>/gi,
    /<[^>]*>[^<]*EDITION\s+\d+(\.\d+)?[^<]*<\/[^>]*>/gi,
    // Project Gutenberg references in text
    /<[^>]*>[^<]*Project Gutenberg[^<]*<\/[^>]*>/gi,
    // Transcriber/editor notes
    /<[^>]*>[^<]*Transcriber'?s?\s+Note[^<]*<\/[^>]*>/gi,
    /<[^>]*>[^<]*\[Transcriber[^<]*<\/[^>]*>/gi,
    /<[^>]*>[^<]*Editor'?s?\s+Note[^<]*<\/[^>]*>/gi,
    // eBook identifiers
    /<[^>]*>[^<]*eBook[^<]*<\/[^>]*>/gi,
    // Release/posting dates
    /<[^>]*>[^<]*Release Date[^<]*<\/[^>]*>/gi,
    /<[^>]*>[^<]*Posting Date[^<]*<\/[^>]*>/gi,
    /<[^>]*>[^<]*Last Updated[^<]*<\/[^>]*>/gi,
    // Character set encoding notices
    /<[^>]*>[^<]*Character set encoding[^<]*<\/[^>]*>/gi,
    // "Produced by" credits that may remain
    /<[^>]*>[^<]*Produced by[^<]*<\/[^>]*>/gi,
  ];

  for (const pattern of metadataPatterns) {
    content = content.replace(pattern, "");
  }

  // Remove leading cover image (the book detail page shows the cover already).
  // Match an <img> tag at the very start (allowing surrounding whitespace,
  // wrapper divs, or <a> tags) before any <p> or heading content.
  content = content.replace(
    /^\s*(?:<div[^>]*>\s*)?(?:<a[^>]*>\s*)?<img[^>]*>(?:\s*<\/a>)?(?:\s*<\/div>)?\s*/i,
    ""
  );

  // Clean up multiple consecutive blank lines / empty elements left after stripping
  content = content.replace(/(<br\s*\/?>[\s\n]*){3,}/gi, "<br><br>");
  content = content.replace(/(<p>\s*<\/p>\s*){2,}/gi, "");

  return content.trim();
}

/**
 * Browse free books by genre/category from Project Gutenberg.
 * Maps kid-friendly genre names to Gutendex search terms.
 */
export const browseByGenre = action({
  args: {
    genre: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const cacheKey = `genre:${args.genre}`;

    // Check cache first
    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    // Map genre keys to Gutendex search terms and topics
    const genreMap: Record<string, { search: string; topic?: string }> = {
      adventure: { search: "adventure", topic: "children" },
      animals: { search: "animals", topic: "children" },
      fantasy: { search: "fairy tales magic", topic: "children" },
      science: { search: "science nature", topic: "children" },
      history: { search: "history", topic: "children" },
      "fairy-tales": { search: "fairy tales", topic: "children" },
      mystery: { search: "mystery detective", topic: "children" },
      space: { search: "space moon stars", topic: "children" },
      nature: { search: "nature garden forest", topic: "children" },
      humor: { search: "funny humor", topic: "children" },
      sports: { search: "sports games", topic: "children" },
      "art-music": { search: "art music", topic: "children" },
      scary: { search: "ghost horror scary" },
      comics: { search: "comic illustrated picture" },
      action: { search: "action battle war hero" },
    };

    const genreConfig = genreMap[args.genre] || { search: args.genre, topic: "children" };

    const params = new URLSearchParams({
      search: genreConfig.search,
      languages: "en",
      sort: "popular",
    });

    if (genreConfig.topic) {
      params.set("topic", genreConfig.topic);
    }

    const url = `https://gutendex.com/books/?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as GutendexResponse;

      const results = data.results
        .filter(isKidFriendly)
        .filter((b) => b.languages.includes("en"))
        .slice(0, 20)
        .map(parseGutenbergBook);

      // Cache the results
      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch {
      return [];
    }
  },
});

// ============================================================================
// StoryWeaver Integration
// ============================================================================

interface StoryWeaverBook {
  id: number;
  title: string;
  slug: string;
  coverImage?: { url: string };
  authors?: Array<{ name: string }>;
  readingLevel?: string;
  language?: string;
  pageCount?: number;
  description?: string;
}

interface StoryWeaverResponse {
  ok: boolean;
  data: StoryWeaverBook[];
  metadata?: {
    totalCount: number;
  };
}

/**
 * Search StoryWeaver for free picture books and early readers.
 * Great for ages 3-9.
 */
export const searchStoryWeaver = action({
  args: {
    query: v.string(),
  },
  handler: async (_ctx, args) => {
    const params = new URLSearchParams({
      query: args.query,
      reading_levels: "1,2,3,4",
      languages: "English",
      page: "1",
      per_page: "20",
      sort: "Relevance",
    });

    const url = `https://storyweaver.org.in/api/v1/books-search?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "SafeReads/1.0 (getsafereads.com)",
        },
      });

      if (!response.ok) {
        // StoryWeaver can be flaky, degrade gracefully
        console.error(`StoryWeaver API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as StoryWeaverResponse;

      if (!data.ok || !data.data) {
        return [];
      }

      return data.data.map((book) => ({
        id: String(book.id),
        title: book.title,
        authors: (book.authors || []).map((a) => a.name),
        coverUrl: book.coverImage?.url || undefined,
        readingLevel: book.readingLevel || undefined,
        language: book.language || "English",
        pageCount: book.pageCount || undefined,
        description: book.description || undefined,
        slug: book.slug,
        source: "storyweaver" as const,
      }));
    } catch (error) {
      // StoryWeaver is optional — don't fail the whole search
      console.error("StoryWeaver search failed:", error);
      return [];
    }
  },
});

// ============================================================================
// Curated Free Books for Kid's Home Page
// ============================================================================

/**
 * Get curated free books for a kid's age group.
 * Returns popular children's classics from Project Gutenberg.
 */
// Cache TTL: 24 hours for curated/genre results (Gutenberg updates rarely)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const getCuratedFreeBooks = action({
  args: {
    age: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const age = args.age || 8;
    const cacheKey = `curated:${age <= 6 ? "young" : age <= 9 ? "mid" : age <= 12 ? "tween" : "teen"}`;

    // Check cache first
    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    // Pick age-appropriate search terms
    let topic = "children";
    let searchTerm = "";

    if (age <= 6) {
      searchTerm = "fairy tales nursery";
    } else if (age <= 9) {
      searchTerm = "adventure children";
    } else if (age <= 12) {
      searchTerm = "adventure treasure";
    } else {
      searchTerm = "classic adventure";
    }

    const params = new URLSearchParams({
      search: searchTerm,
      topic,
      languages: "en",
      sort: "popular",
    });

    const url = `https://gutendex.com/books/?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as GutendexResponse;

      const results = data.results
        .filter(isKidFriendly)
        .filter((b) => b.languages.includes("en"))
        .slice(0, 8)
        .map(parseGutenbergBook);

      // Cache the results
      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(results),
      });

      return results;
    } catch {
      return [];
    }
  },
});

// ============================================================================
// Free Book Search Cache
// ============================================================================

/**
 * Get cached free book results. Returns null if cache miss or expired.
 */
export const getFromCache = query({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("freeBookCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    if (!cached || cached.expiresAt < Date.now()) {
      return null;
    }
    return cached;
  },
});

/**
 * Save free book results to cache. Overwrites existing entry for same key.
 */
export const saveToCache = mutation({
  args: {
    cacheKey: v.string(),
    results: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete existing entry
    const existing = await ctx.db
      .query("freeBookCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("freeBookCache", {
      cacheKey: args.cacheKey,
      results: args.results,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  },
});

/**
 * Clear expired cache entries. Called weekly by cron.
 * Next page load will fetch fresh results from all sources.
 */
export const clearExpiredCache = internalMutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("freeBookCache").collect();
    let deleted = 0;
    for (const entry of all) {
      if (entry.expiresAt < Date.now()) {
        await ctx.db.delete(entry._id);
        deleted++;
      }
    }
    console.log(`[freeBookCache] Cleared ${deleted} expired entries`);
    return { deleted };
  },
});

// ============================================================================
// Unified Multi-Source Search
// ============================================================================

/**
 * Valid source identifiers for free books.
 */
export type FreeBookSource = "gutenberg" | "bloom" | "lit2go" | "librivox" | "bookdash" | "storyweaver";

/**
 * Unified search across all free book sources.
 * Fires searches in parallel and merges results.
 * Returns results tagged with source for badge display.
 */
export const searchAllSources = action({
  args: {
    query: v.string(),
    childrenOnly: v.optional(v.boolean()),
    includeAudioOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const childrenOnly = args.childrenOnly ?? true;
    const cacheKey = `unified:search:${args.query.toLowerCase().trim()}:${childrenOnly}:${args.includeAudioOnly ?? false}`;

    // Check cache
    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    // Fire all source searches in parallel
    const [gutenbergResults, bloomResults, lit2goResults, librivoxResults, bookDashResults] =
      await Promise.allSettled([
        // Gutenberg (existing)
        (async () => {
          const params = new URLSearchParams({
            search: args.query,
            languages: "en",
          });
          if (childrenOnly) params.set("topic", "children");
          const url = `https://gutendex.com/books/?${params.toString()}`;
          const response = await fetch(url);
          if (!response.ok) return [];
          const data = (await response.json()) as GutendexResponse;
          return data.results
            .filter(isKidFriendly)
            .filter((b) => b.languages.includes("en"))
            .slice(0, 10)
            .map(parseGutenbergBook);
        })(),

        // Bloom Library
        ctx.runAction(api.bloomBooks.searchBloom, { query: args.query }).catch(() => []),

        // Lit2Go
        ctx.runAction(api.lit2go.searchLit2Go, { query: args.query }).catch(() => []),

        // LibriVox
        ctx.runAction(api.librivox.searchLibriVox, { query: args.query }).catch(() => []),

        // Book Dash / GDL
        ctx.runAction(api.bookDash.searchBookDash, { query: args.query }).catch(() => []),
      ]);

    // Merge results, deduplicating by title similarity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allResults: Array<Record<string, unknown>> = [];
    const seenTitles = new Set<string>();

    function addResults(settled: PromiseSettledResult<Array<Record<string, unknown>>>) {
      if (settled.status === "fulfilled") {
        for (const book of settled.value) {
          const title = (book.title as string) || "";
          const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (normalizedTitle && !seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            allResults.push(book);
          }
        }
      }
    }

    addResults(gutenbergResults as PromiseSettledResult<Array<Record<string, unknown>>>);
    addResults(bloomResults);
    addResults(lit2goResults);
    addResults(librivoxResults);
    addResults(bookDashResults);

    // Filter audio-only if requested
    let finalResults = allResults;
    if (args.includeAudioOnly) {
      finalResults = allResults.filter(
        (b) => b.hasAudio || b.source === "librivox" || b.source === "lit2go"
      );
    }

    // Sort: Gutenberg first (most reliable), then by source diversity
    finalResults.sort((a, b) => {
      const sourceOrder: Record<string, number> = {
        gutenberg: 0,
        bloom: 1,
        bookdash: 2,
        lit2go: 3,
        librivox: 4,
      };
      return (sourceOrder[a.source as string] ?? 5) - (sourceOrder[b.source as string] ?? 5);
    });

    // Limit total results
    finalResults = finalResults.slice(0, 30);

    // Cache
    await ctx.runMutation(api.freeBooks.saveToCache, {
      cacheKey,
      results: JSON.stringify(finalResults),
    });

    return finalResults;
  },
});

// ============================================================================
// Library Page — Comprehensive paginated browsing
// ============================================================================

/**
 * Get a page of library books from ALL sources.
 * Used by the Library page for comprehensive browsing with hundreds of results.
 *
 * - "all" / "books" format: Gutendex children's books + pre-approved classics (page 1 only)
 * - "audio" format: LibriVox children's audiobooks
 * - Genre filtering narrows results via Gutendex topic+search and LibriVox genre
 *
 * Returns 30 results per page, cached for 24 hours.
 */
export const getLibraryBooks = action({
  args: {
    page: v.number(),
    genre: v.optional(v.string()),
    format: v.optional(v.union(v.literal("all"), v.literal("books"), v.literal("audio"))),
    sort: v.optional(v.union(v.literal("popular"), v.literal("az"))),
  },
  handler: async (ctx, args): Promise<{
    books: Array<Record<string, unknown>>;
    hasMore: boolean;
    totalEstimate: number;
  }> => {
    const page = args.page || 1;
    const format = args.format || "all";
    const genre = args.genre || "all";
    const sort = args.sort || "popular";
    const cacheKey = `library:${format}:${genre}:${sort}:${page}`;

    // Check cache
    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    const PAGE_SIZE = 30;
    const allResults: Array<Record<string, unknown>> = [];
    const seenTitles = new Set<string>();
    let totalEstimate = 0;
    let hasMore = false;

    function addResult(book: Record<string, unknown>) {
      const title = (book.title as string) || "";
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedTitle && !seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        allResults.push(book);
      }
    }

    // ---- Fetch books based on format ----
    const includeBooks = format === "all" || format === "books";
    const includeAudio = format === "all" || format === "audio";

    const fetches: Promise<void>[] = [];

    // --- Gutendex (books) ---
    if (includeBooks) {
      fetches.push(
        (async () => {
          try {
            const params = new URLSearchParams({
              languages: "en",
              sort: "popular",
              page: String(page),
            });

            // Always filter to children's topic
            params.set("topic", "children");

            // Add genre search if specified
            if (genre !== "all") {
              const genreSearchMap: Record<string, string> = {
                adventure: "adventure",
                animals: "animals",
                fantasy: "fairy tales magic",
                science: "science nature",
                history: "history",
                "fairy-tales": "fairy tales",
                mystery: "mystery detective",
                space: "space moon stars",
                nature: "nature garden forest",
                humor: "funny humor",
                sports: "sports games",
                "art-music": "art music",
                scary: "ghost horror scary",
                comics: "comic illustrated picture",
                action: "action battle war hero",
              };
              const searchTerm = genreSearchMap[genre] || genre;
              params.set("search", searchTerm);
            }

            const url = `https://gutendex.com/books/?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok) return;

            const data = (await response.json()) as GutendexResponse;
            totalEstimate = Math.max(totalEstimate, data.count || 0);
            hasMore = !!data.next;

            const books = data.results
              .filter(isKidFriendly)
              .filter((b) => b.languages.includes("en"))
              .map(parseGutenbergBook);

            for (const book of books) {
              addResult(book);
            }
          } catch (err) {
            console.error("Gutendex fetch failed for library:", err);
          }
        })()
      );
    }

    // --- LibriVox (audiobooks) ---
    if (includeAudio) {
      fetches.push(
        (async () => {
          try {
            const offset = (page - 1) * PAGE_SIZE;
            let results: Array<Record<string, unknown>>;

            if (genre !== "all") {
              results = await ctx.runAction(api.librivox.browseLibriVoxByGenre, {
                genre,
                offset,
                limit: PAGE_SIZE,
              });
            } else {
              results = await ctx.runAction(api.librivox.browseLibriVoxChildren, {
                offset,
                limit: PAGE_SIZE,
              });
            }

            if (results.length > 0) {
              hasMore = true; // LibriVox doesn't give total count, assume more
            }

            for (const book of results) {
              addResult(book);
            }
          } catch (err) {
            console.error("LibriVox fetch failed for library:", err);
          }
        })()
      );
    }

    // Run all fetches in parallel
    await Promise.allSettled(fetches);

    // Sort results
    if (sort === "az") {
      allResults.sort((a, b) =>
        ((a.title as string) || "").localeCompare((b.title as string) || "")
      );
    }
    // "popular" keeps natural order — Gutendex returns by download_count

    // Trim to page size
    const pageResults = allResults.slice(0, PAGE_SIZE);

    // If we got fewer than PAGE_SIZE results, probably no more pages
    if (pageResults.length < PAGE_SIZE) {
      hasMore = false;
    }

    const result = {
      books: pageResults,
      hasMore,
      totalEstimate: Math.max(totalEstimate, pageResults.length),
    };

    // Cache
    await ctx.runMutation(api.freeBooks.saveToCache, {
      cacheKey,
      results: JSON.stringify(result),
    });

    return result;
  },
});

/**
 * Get curated audiobooks for the kid home page.
 * Pulls from LibriVox children's section.
 */
export const getCuratedAudiobooks = action({
  args: {
    age: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown[]> => {
    const age = args.age || 8;
    const cacheKey = `curated-audio:${age <= 8 ? "young" : "older"}`;

    const cached: { results: string } | null = await ctx.runQuery(api.freeBooks.getFromCache, { cacheKey });
    if (cached) {
      return JSON.parse(cached.results);
    }

    try {
      // Search popular kids' titles on LibriVox (generic searches return nothing with ^ prefix)
      const titles = age <= 8
        ? ["alice", "peter rabbit", "wizard of oz", "wind in the willows", "peter pan", "secret garden", "velveteen rabbit", "jungle book", "pinocchio", "black beauty", "heidi", "anne of green gables"]
        : ["treasure island", "sherlock holmes", "tom sawyer", "huckleberry finn", "christmas carol", "call of the wild", "around the world", "twenty thousand leagues", "dracula", "robin hood", "three musketeers", "count of monte", "moby dick", "swiss family", "oliver twist", "david copperfield", "little women", "pride and prejudice", "frankenstein", "war of the worlds"];

      const allResults: unknown[] = [];
      for (const title of titles) {
        try {
          const results: unknown[] = await ctx.runAction(api.librivox.searchLibriVox, {
            query: title,
          });
          if (results && results.length > 0) {
            allResults.push(results[0]); // Take first match per title
          }
        } catch {
          // Skip failed individual searches
        }
        if (allResults.length >= 16) break; // Show more audiobooks
      }

      await ctx.runMutation(api.freeBooks.saveToCache, {
        cacheKey,
        results: JSON.stringify(allResults),
      });

      return allResults;
    } catch (error) {
      console.error("Failed to load curated audiobooks:", error);
      return [];
    }
  },
});
