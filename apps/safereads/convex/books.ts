import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";

type BookResult = {
  _id: Id<"books">;
  googleBooksId?: string;
  openLibraryKey?: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedDate?: string;
  categories?: string[];
  isbn10?: string;
  isbn13?: string;
  maturityRating?: string;
  averageRating?: number;
  ratingsCount?: number;
  firstSentence?: string;
};

// --- Public queries ---

export const getById = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bookId);
  },
});

// --- Internal mutations ---

/**
 * Upsert a book by googleBooksId.
 * If a book with the same googleBooksId exists, update it.
 * Otherwise insert a new record.
 * Returns the Convex document ID.
 */
export const upsert = internalMutation({
  args: {
    googleBooksId: v.optional(v.string()),
    openLibraryKey: v.optional(v.string()),
    title: v.string(),
    authors: v.array(v.string()),
    description: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    publishedDate: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    isbn10: v.optional(v.string()),
    isbn13: v.optional(v.string()),
    maturityRating: v.optional(v.string()),
    averageRating: v.optional(v.number()),
    ratingsCount: v.optional(v.number()),
    firstSentence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.googleBooksId) {
      const existing = await ctx.db
        .query("books")
        .withIndex("by_google_books_id", (q) =>
          q.eq("googleBooksId", args.googleBooksId)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          openLibraryKey: args.openLibraryKey ?? existing.openLibraryKey,
          description: args.description ?? existing.description,
          coverUrl: args.coverUrl ?? existing.coverUrl,
          pageCount: args.pageCount ?? existing.pageCount,
          categories: args.categories ?? existing.categories,
          isbn10: args.isbn10 ?? existing.isbn10,
          isbn13: args.isbn13 ?? existing.isbn13,
          maturityRating: args.maturityRating ?? existing.maturityRating,
          averageRating: args.averageRating ?? existing.averageRating,
          ratingsCount: args.ratingsCount ?? existing.ratingsCount,
          firstSentence: args.firstSentence ?? existing.firstSentence,
        });
        return existing._id;
      }
    }

    return await ctx.db.insert("books", args);
  },
});

// --- Public actions ---

/**
 * Search for books via Google Books API.
 * For each result, attempts Open Library enrichment if description or categories are missing.
 * Upserts all results into the books table for caching.
 * Returns an array of book documents with their Convex IDs.
 */
export const search = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BookResult[]> => {
    const maxResults = args.maxResults ?? 10;
    const googleResults = await searchGoogleBooks(args.query, maxResults);

    const books: BookResult[] = await Promise.all(
      googleResults.map(async (item) => {
        const parsed = parseGoogleBooksItem(item);

        // Attempt Open Library enrichment if missing description or categories
        if (!parsed.description || !parsed.categories?.length) {
          const enrichment = await fetchOpenLibraryData(
            parsed.isbn13 ?? parsed.isbn10,
            parsed.title,
            parsed.authors[0]
          );
          if (enrichment) {
            parsed.description = parsed.description || enrichment.description;
            parsed.categories =
              parsed.categories?.length
                ? parsed.categories
                : enrichment.subjects;
            parsed.openLibraryKey = enrichment.key;
            parsed.coverUrl = parsed.coverUrl || enrichment.coverUrl;
            parsed.firstSentence =
              parsed.firstSentence || enrichment.firstSentence;
          }
        }

        const bookId = await ctx.runMutation(internal.books.upsert, parsed);

        return {
          _id: bookId,
          ...parsed,
        };
      })
    );

    return books;
  },
});

// --- Google Books API ---

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    maturityRating?: string;
    averageRating?: number;
    ratingsCount?: number;
  };
}

/**
 * Wrap a query in quotes so a Google Books field operator applies to the whole
 * phrase. Inner quotes are stripped rather than escaped — Google has no escape
 * syntax here, and a stray quote silently breaks the operator.
 */
function quotePhrase(query: string): string {
  return `"${query.trim().replace(/"/g, " ").replace(/\s+/g, " ")}"`;
}

async function searchGoogleBooks(
  query: string,
  maxResults: number
): Promise<GoogleBooksItem[]> {
  // Google's field operators bind to the NEXT TOKEN ONLY, so the old
  // `intitle:Up in Smoke` actually meant intitle:Up AND "in" AND "smoke" —
  // which is how a parent looking for a romance novel got an academic
  // monograph on tobacco regulation analysed instead. Quote the phrase so the
  // operator covers all of it.
  const hasOperator = /^(intitle:|inauthor:|isbn:|subject:)/i.test(query);

  // Widening ladder. A strict title-phrase match is the best answer when it
  // exists, but parents type author names into the title box — five identical
  // "gabrielle meyer" searches in the logs are one parent getting nothing back
  // five times. Fall back rather than return an empty shelf.
  // Every rung stays scoped to a field. A bare free-text query was tried here
  // and is actively harmful: "Up in Smoke" free-text returns Mellon Institute
  // smoke-abatement bulletins, and handing one of those to the analyser is
  // exactly the failure this is meant to fix. Empty beats wrong — a parent who
  // sees nothing searches again, a parent who sees the wrong book analyses it.
  const attempts = hasOperator
    ? [query]
    : [
        `intitle:${quotePhrase(query)}`,   // exact title phrase
        `inauthor:${quotePhrase(query)}`,  // they typed an author in the title box
        `intitle:${query}`,                // loose title match (prior behaviour)
      ];

  for (let i = 0; i < attempts.length; i++) {
    const candidate = attempts[i];

    // Google intermittently answers a perfectly good query with an empty 200 —
    // `inauthor:"gabrielle meyer"` returns nothing on one call and her whole
    // Timeless series on the next. Treating that empty as "no match" is what
    // made the ladder fall through to a worse rung and hand back junk, so give
    // each rung a second look before widening.
    let items = await runGoogleBooksQuery(candidate, maxResults);
    if (items.length === 0) {
      await new Promise((r) => setTimeout(r, 300));
      items = await runGoogleBooksQuery(candidate, maxResults);
    }
    if (items.length === 0) continue;

    // Applies to EVERY rung, not just the loose one — Google's operators are
    // fuzzier than they look. `inauthor:"Heir of Fire"` comes back with
    // "Proceedings of the Annual Meeting, Fire Underwriters'"; `intitle:` for
    // an author name returns "Dictionary Catalog of the University Library".
    // If nothing in a result set echoes the query, it isn't an answer.
    if (!hasOperator && !itemsLookRelevant(items, query)) continue;

    return items;
  }
  return [];
}

/** True if any result's title or author contains a meaningful query word. */
function itemsLookRelevant(items: GoogleBooksItem[], query: string): boolean {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) return true;

  return items.some((it) => {
    const hay = [
      it.volumeInfo?.title ?? "",
      ...(it.volumeInfo?.authors ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

async function runGoogleBooksQuery(
  searchQuery: string,
  maxResults: number
): Promise<GoogleBooksItem[]> {
  const params = new URLSearchParams({
    q: searchQuery,
    maxResults: String(maxResults),
    printType: "books",
    orderBy: "relevance",
    langRestrict: "en",
  });

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    params.set("key", apiKey);
  }

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;

  // Retry with exponential backoff on rate limiting
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url);

    if (response.status === 429) {
      // Check if this is a daily quota limit (not recoverable with retries)
      try {
        const errorData = await response.clone().json();
        if (errorData?.error?.message?.includes("per day")) {
          throw new Error(
            "Book search is temporarily unavailable due to high demand. Please try again later."
          );
        }
      } catch (e) {
        // If we can't parse the error, continue with retry logic
        if (e instanceof Error && e.message.includes("temporarily unavailable")) {
          throw e;
        }
      }
      const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    // Google Books returns transient 5xx routinely. Only 429 was retried, so a
    // single blip failed the whole search — measured at roughly two requests
    // in three failing before this was added.
    if (response.status >= 500 && response.status < 600) {
      if (attempt === 3) {
        throw new Error(
          "Book search is temporarily unavailable. Please try again in a moment."
        );
      }
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Google Books API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as GoogleBooksResponse;
    return data.items ?? [];
  }

  throw new Error("Book search is temporarily unavailable. Please try again in a moment.");
}

interface ParsedBook {
  googleBooksId: string;
  openLibraryKey?: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedDate?: string;
  categories?: string[];
  isbn10?: string;
  isbn13?: string;
  maturityRating?: string;
  averageRating?: number;
  ratingsCount?: number;
  firstSentence?: string;
}

function parseGoogleBooksItem(item: GoogleBooksItem): ParsedBook {
  const info = item.volumeInfo;
  const identifiers = info.industryIdentifiers ?? [];

  const isbn13 = identifiers.find((id) => id.type === "ISBN_13")?.identifier;
  const isbn10 = identifiers.find((id) => id.type === "ISBN_10")?.identifier;

  // Prefer HTTPS thumbnail, strip edge/zoom params for higher quality
  let coverUrl = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  if (coverUrl) {
    coverUrl = coverUrl.replace("http://", "https://");
  }

  return {
    googleBooksId: item.id,
    title: info.title,
    authors: info.authors ?? ["Unknown Author"],
    description: info.description,
    coverUrl,
    pageCount: info.pageCount,
    publishedDate: info.publishedDate,
    categories: info.categories,
    isbn10,
    isbn13,
    maturityRating: info.maturityRating,
    averageRating: info.averageRating,
    ratingsCount: info.ratingsCount,
  };
}

// --- Open Library API ---

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  cover_i?: number;
  subject?: string[];
  first_sentence?: string[];
}

interface OpenLibrarySearchResponse {
  docs: OpenLibrarySearchDoc[];
}

interface OpenLibraryWorkResponse {
  description?:
    | string
    | { type: string; value: string };
  subjects?: string[];
  covers?: number[];
}

async function fetchOpenLibraryData(
  isbn: string | undefined,
  title: string,
  author: string | undefined
): Promise<{
  description?: string;
  subjects?: string[];
  key?: string;
  coverUrl?: string;
  firstSentence?: string;
} | null> {
  try {
    let workKey: string | undefined;
    let subjects: string[] | undefined;
    let coverUrl: string | undefined;
    let firstSentence: string | undefined;

    // Strategy 1: Look up by ISBN if available
    if (isbn) {
      const isbnResponse = await fetch(
        `https://openlibrary.org/isbn/${isbn}.json`
      );
      if (isbnResponse.ok) {
        const isbnData = (await isbnResponse.json()) as {
          works?: Array<{ key: string }>;
          covers?: number[];
        };
        workKey = isbnData.works?.[0]?.key;
        if (isbnData.covers?.[0]) {
          coverUrl = `https://covers.openlibrary.org/b/id/${isbnData.covers[0]}-M.jpg`;
        }
      }
    }

    // Strategy 2: Search by title + author
    if (!workKey) {
      const searchQuery = author ? `${title} ${author}` : title;
      const params = new URLSearchParams({
        q: searchQuery,
        limit: "1",
        fields: "key,title,cover_i,subject,first_sentence",
      });
      const searchResponse = await fetch(
        `https://openlibrary.org/search.json?${params.toString()}`
      );
      if (searchResponse.ok) {
        const searchData =
          (await searchResponse.json()) as OpenLibrarySearchResponse;
        const doc = searchData.docs[0];
        if (doc) {
          workKey = doc.key;
          subjects = doc.subject?.slice(0, 5);
          firstSentence = doc.first_sentence?.[0];
          if (doc.cover_i) {
            coverUrl =
              coverUrl ??
              `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
          }
        }
      }
    }

    // Fetch work details for description
    if (workKey) {
      const workResponse = await fetch(
        `https://openlibrary.org${workKey}.json`
      );
      if (workResponse.ok) {
        const workData = (await workResponse.json()) as OpenLibraryWorkResponse;
        const description =
          typeof workData.description === "string"
            ? workData.description
            : workData.description?.value;

        subjects = subjects ?? workData.subjects?.slice(0, 5);

        return {
          description,
          subjects,
          key: workKey,
          coverUrl,
          firstSentence,
        };
      }
    }

    // Return partial data if we found anything
    if (subjects?.length || coverUrl || firstSentence) {
      return { subjects, coverUrl, key: workKey, firstSentence };
    }

    return null;
  } catch {
    // Open Library is a fallback — don't fail the search if it's down
    return null;
  }
}

// --- Author search ---

/**
 * Search for books by a specific author using Google Books inauthor: query.
 * Returns up to 20 books, upserted for caching.
 */
export const searchByAuthor = action({
  args: {
    authorName: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BookResult[]> => {
    const maxResults = args.maxResults ?? 20;
    const googleResults = await searchGoogleBooks(
      `inauthor:"${args.authorName}"`,
      maxResults
    );

    const books: BookResult[] = await Promise.all(
      googleResults.map(async (item) => {
        const parsed = parseGoogleBooksItem(item);

        if (!parsed.description || !parsed.categories?.length) {
          const enrichment = await fetchOpenLibraryData(
            parsed.isbn13 ?? parsed.isbn10,
            parsed.title,
            parsed.authors[0]
          );
          if (enrichment) {
            parsed.description = parsed.description || enrichment.description;
            parsed.categories = parsed.categories?.length
              ? parsed.categories
              : enrichment.subjects;
            parsed.openLibraryKey = enrichment.key;
            parsed.coverUrl = parsed.coverUrl || enrichment.coverUrl;
            parsed.firstSentence =
              parsed.firstSentence || enrichment.firstSentence;
          }
        }

        const bookId = await ctx.runMutation(internal.books.upsert, parsed);
        return { _id: bookId, ...parsed };
      })
    );

    return books;
  },
});

/**
 * Generate an AI overview of an author's writing style and content patterns.
 * Uses GPT-4o with the author's known works as context.
 */
export const authorOverview = action({
  args: {
    authorName: v.string(),
    bookTitles: v.array(v.string()),
    categories: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<AuthorOverviewResult> => {
    // Check cache first
    const cached = await ctx.runQuery(
      internal.books.getCachedAuthorOverview,
      { authorName: args.authorName }
    );
    if (cached) {
      return {
        authorName: cached.authorName,
        summary: cached.summary,
        typicalAgeRange: cached.typicalAgeRange,
        commonThemes: cached.commonThemes,
        contentPatterns: cached.contentPatterns,
      };
    }

    const openai = new OpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: AUTHOR_OVERVIEW_PROMPT,
        },
        {
          role: "user",
          content: `Author: ${args.authorName}\n\nKnown works: ${args.bookTitles.join(", ")}\n\nGenres/categories found: ${args.categories.join(", ")}\n\nProvide your author overview as JSON.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI returned an empty response");
    }

    const parsed = JSON.parse(raw) as AuthorOverviewResult;

    const result: AuthorOverviewResult = {
      authorName: args.authorName,
      summary: String(parsed.summary ?? "No overview available."),
      typicalAgeRange: parsed.typicalAgeRange
        ? String(parsed.typicalAgeRange)
        : undefined,
      commonThemes: (parsed.commonThemes ?? []).map(String),
      contentPatterns: String(
        parsed.contentPatterns ?? "No content patterns identified."
      ),
    };

    // Cache the result
    await ctx.runMutation(internal.books.storeAuthorOverview, {
      authorName: args.authorName,
      summary: result.summary,
      typicalAgeRange: result.typicalAgeRange,
      commonThemes: result.commonThemes,
      contentPatterns: result.contentPatterns,
    });

    return result;
  },
});

type AuthorOverviewResult = {
  authorName: string;
  summary: string;
  typicalAgeRange?: string;
  commonThemes: string[];
  contentPatterns: string;
};

const AUTHOR_OVERVIEW_PROMPT = `You are SafeReads, an AI book content analyst for parents. Given an author's name and their known works, provide an objective overview of their writing.

Respond with a JSON object:

{
  "summary": "2-3 sentence overview of the author's writing style, target audience, and what parents should know about their works in general.",
  "typicalAgeRange": "Typical age range for their books (e.g., '8-12', '12+', '16+', 'All ages')",
  "commonThemes": ["theme1", "theme2", "theme3"],
  "contentPatterns": "1-2 sentences about common content patterns across their works that parents should be aware of (e.g., 'Generally clean language with mild fantasy violence. Romance is minimal.' or 'Contains mature themes including violence, substance use, and strong language in most works.')."
}

Guidelines:
- Be objective and factual — describe patterns, don't judge them
- Focus on what parents need to know to make informed decisions
- Base your assessment on widely known information about the author's body of work
- If the author writes across different age groups, note the range
- Common themes should be 3-5 concise labels`;

// --- Author overview caching ---

export const getCachedAuthorOverview = internalQuery({
  args: { authorName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authorOverviews")
      .withIndex("by_author_name", (q) => q.eq("authorName", args.authorName))
      .first();
  },
});

export const storeAuthorOverview = internalMutation({
  args: {
    authorName: v.string(),
    summary: v.string(),
    typicalAgeRange: v.optional(v.string()),
    commonThemes: v.array(v.string()),
    contentPatterns: v.string(),
  },
  handler: async (ctx, args) => {
    // Upsert — delete existing, then insert
    const existing = await ctx.db
      .query("authorOverviews")
      .withIndex("by_author_name", (q) => q.eq("authorName", args.authorName))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return await ctx.db.insert("authorOverviews", args);
  },
});

// --- Vision AI book identification ---

/**
 * Identify a book from a cover photo using OpenAI GPT-4o vision.
 * Takes a base64-encoded image, extracts title/author via vision AI,
 * then searches Google Books with the extracted info.
 * Returns the same shape as the search action.
 */
export const identifyCover = action({
  args: {
    imageBase64: v.string(),
  },
  handler: async (ctx, args): Promise<BookResult[]> => {
    const openai = new OpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a book identification assistant. Given an image of a book cover, extract the title and author. Respond with JSON: {"title": "...", "author": "..."}. If you cannot determine the title, set title to an empty string. If you cannot determine the author, set author to an empty string.',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What book is shown in this image? Extract the title and author from the cover.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${args.imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Vision AI returned an empty response");
    }

    const parsed = JSON.parse(raw) as { title: string; author: string };

    if (!parsed.title) {
      throw new Error(
        "Could not identify the book from this image. Try taking a clearer photo of the front cover."
      );
    }

    // Build a search query from the extracted title and author
    const query = parsed.author
      ? `${parsed.title} ${parsed.author}`
      : parsed.title;

    // Reuse the existing Google Books search + enrichment + upsert flow
    const googleResults = await searchGoogleBooks(query, 5);

    const books: BookResult[] = await Promise.all(
      googleResults.map(async (item) => {
        const parsedBook = parseGoogleBooksItem(item);

        if (!parsedBook.description || !parsedBook.categories?.length) {
          const enrichment = await fetchOpenLibraryData(
            parsedBook.isbn13 ?? parsedBook.isbn10,
            parsedBook.title,
            parsedBook.authors[0]
          );
          if (enrichment) {
            parsedBook.description =
              parsedBook.description || enrichment.description;
            parsedBook.categories = parsedBook.categories?.length
              ? parsedBook.categories
              : enrichment.subjects;
            parsedBook.openLibraryKey = enrichment.key;
            parsedBook.coverUrl = parsedBook.coverUrl || enrichment.coverUrl;
            parsedBook.firstSentence =
              parsedBook.firstSentence || enrichment.firstSentence;
          }
        }

        const bookId = await ctx.runMutation(internal.books.upsert, parsedBook);

        return {
          _id: bookId,
          ...parsedBook,
        };
      })
    );

    return books;
  },
});
