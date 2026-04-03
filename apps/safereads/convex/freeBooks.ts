import { v } from "convex/values";
import { action } from "./_generated/server";

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
  handler: async (_ctx, args) => {
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

      return data.results
        .filter(isKidFriendly)
        .filter((b) => b.languages.includes("en"))
        .slice(0, 20)
        .map(parseGutenbergBook);
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
export const getCuratedFreeBooks = action({
  args: {
    age: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    // Pick age-appropriate search terms
    const age = args.age || 8;

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

      return data.results
        .filter(isKidFriendly)
        .filter((b) => b.languages.includes("en"))
        .slice(0, 8)
        .map(parseGutenbergBook);
    } catch {
      return [];
    }
  },
});
