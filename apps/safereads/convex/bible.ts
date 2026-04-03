import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// ============================================================================
// Bible Integration via Bolls.life API
// No authentication required. Supports KJV, ESV, NKJV, NIV, NLT.
// ============================================================================

const BOLLS_BASE = "https://bolls.life";

/** Supported translations with copyright notices */
export const TRANSLATIONS = [
  {
    code: "ESV",
    name: "English Standard Version",
    description: "Accurate and readable",
    copyright: "Scripture quotations are from the ESV Bible (The Holy Bible, English Standard Version), copyright 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.",
  },
  {
    code: "NIV",
    name: "New International Version",
    description: "Easy to understand",
    copyright: "Scripture quotations taken from The Holy Bible, New International Version NIV. Copyright 1973, 1978, 1984, 2011 by Biblica, Inc. Used by permission. All rights reserved worldwide.",
  },
  {
    code: "NLT",
    name: "New Living Translation",
    description: "Great for young readers",
    copyright: "Scripture quotations are taken from the Holy Bible, New Living Translation, copyright 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.",
  },
  {
    code: "NKJV",
    name: "New King James Version",
    description: "Classic, updated language",
    copyright: "Scripture taken from the New King James Version. Copyright 1982 by Thomas Nelson. Used by permission. All rights reserved.",
  },
  {
    code: "NASB",
    name: "New American Standard Bible",
    description: "Precise and literal",
    copyright: "Scripture quotations taken from the (NASB) New American Standard Bible, Copyright 1960, 1971, 1977, 1995 by The Lockman Foundation. Used by permission. All rights reserved. lockman.org",
  },
  {
    code: "KJV",
    name: "King James Version",
    description: "Traditional, poetic",
    copyright: "Public domain.",
  },
] as const;

/**
 * Clean HTML tags from Bible text.
 * - Strip <S>num</S> (Strong's concordance numbers in KJV)
 * - Keep <i>...</i> as-is (italic words in NKJV)
 * - Convert <br/> and <br> to newlines
 * - Strip <a> tags (cross-reference links)
 */
function cleanBibleText(text: string): string {
  return text
    .replace(/<S>\d+<\/S>/g, "")           // Strip Strong's numbers
    .replace(/<a[^>]*>.*?<\/a>/g, "")      // Strip cross-ref links
    .replace(/<br\s*\/?>/g, "\n")          // Convert <br> to newline
    .replace(/<\/?i>/g, "")                // Strip italic tags (render client-side via verse styling)
    .replace(/\s+/g, " ")                  // Collapse whitespace
    .trim();
}

// ============================================================================
// Queries (read from cache / DB)
// ============================================================================

/**
 * Get available Bible translations.
 */
export const getTranslations = query({
  args: {},
  handler: async () => {
    return TRANSLATIONS;
  },
});

/**
 * Get Bible reading progress for a kid.
 */
export const getProgress = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bibleProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
  },
});

/**
 * Get last read position for a kid in a specific book.
 */
export const getBookProgress = query({
  args: {
    kidId: v.id("kids"),
    translation: v.string(),
    bookId: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("bibleProgress")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("translation", args.translation).eq("bookId", args.bookId)
      )
      .collect();

    // Return the most recently read chapter
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b.lastReadAt - a.lastReadAt)[0];
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update Bible reading progress.
 */
export const updateProgress = mutation({
  args: {
    kidId: v.id("kids"),
    translation: v.string(),
    bookId: v.number(),
    bookName: v.string(),
    chapter: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if entry exists for this kid + translation + book + chapter
    const existing = await ctx.db
      .query("bibleProgress")
      .withIndex("by_kid_and_book", (q) =>
        q.eq("kidId", args.kidId).eq("translation", args.translation).eq("bookId", args.bookId)
      )
      .collect();

    const match = existing.find((e) => e.chapter === args.chapter);
    const now = Date.now();

    if (match) {
      await ctx.db.patch(match._id, { lastReadAt: now });
      return match._id;
    }

    return await ctx.db.insert("bibleProgress", {
      kidId: args.kidId,
      translation: args.translation,
      bookId: args.bookId,
      bookName: args.bookName,
      chapter: args.chapter,
      lastReadAt: now,
    });
  },
});

/**
 * Save a verse as a favorite.
 */
export const saveVerse = mutation({
  args: {
    kidId: v.id("kids"),
    translation: v.string(),
    bookName: v.string(),
    bookId: v.number(),
    chapter: v.number(),
    verse: v.number(),
    verseText: v.string(),
    color: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for existing
    const existing = await ctx.db
      .query("savedVerses")
      .withIndex("by_kid_and_ref", (q) =>
        q
          .eq("kidId", args.kidId)
          .eq("translation", args.translation)
          .eq("bookId", args.bookId)
          .eq("chapter", args.chapter)
          .eq("verse", args.verse)
      )
      .first();

    if (existing) {
      // Update color/note
      await ctx.db.patch(existing._id, {
        color: args.color,
        note: args.note,
      });
      return existing._id;
    }

    return await ctx.db.insert("savedVerses", {
      kidId: args.kidId,
      translation: args.translation,
      bookName: args.bookName,
      bookId: args.bookId,
      chapter: args.chapter,
      verse: args.verse,
      verseText: args.verseText,
      savedAt: Date.now(),
      color: args.color || "yellow",
      note: args.note,
    });
  },
});

/**
 * Remove a saved verse.
 */
export const unsaveVerse = mutation({
  args: { savedVerseId: v.id("savedVerses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.savedVerseId);
  },
});

/**
 * Remove a saved verse by reference.
 */
export const unsaveVerseByRef = mutation({
  args: {
    kidId: v.id("kids"),
    translation: v.string(),
    bookId: v.number(),
    chapter: v.number(),
    verse: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedVerses")
      .withIndex("by_kid_and_ref", (q) =>
        q
          .eq("kidId", args.kidId)
          .eq("translation", args.translation)
          .eq("bookId", args.bookId)
          .eq("chapter", args.chapter)
          .eq("verse", args.verse)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Get all saved verses for a kid (sorted by most recent).
 */
export const getSavedVerses = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const verses = await ctx.db
      .query("savedVerses")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    return verses.sort((a, b) => b.savedAt - a.savedAt);
  },
});

/**
 * Get saved verses for a specific chapter (for inline highlighting).
 */
export const getSavedVersesForChapter = query({
  args: {
    kidId: v.id("kids"),
    translation: v.string(),
    bookId: v.number(),
    chapter: v.number(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("savedVerses")
      .withIndex("by_kid_and_ref", (q) =>
        q
          .eq("kidId", args.kidId)
          .eq("translation", args.translation)
          .eq("bookId", args.bookId)
          .eq("chapter", args.chapter)
      )
      .collect();
    // Return as a map of verse number -> saved verse data
    const map: Record<number, { color: string; note?: string; _id: string }> = {};
    for (const sv of all) {
      map[sv.verse] = { color: sv.color || "yellow", note: sv.note, _id: sv._id as string };
    }
    return map;
  },
});

// ============================================================================
// Actions (external API calls with caching)
// ============================================================================

/**
 * Get Bible books for a translation.
 * Returns cached data if available, otherwise fetches from Bolls.life.
 */
export const getBooks = action({
  args: { translation: v.string() },
  handler: async (ctx, args): Promise<Array<{ bookid: number; name: string; chapters: number }>> => {
    const cacheKey = `books:${args.translation}`;

    // Check cache
    const cached = await ctx.runQuery(api.bible.getCacheEntry, { cacheKey });
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from API
    const resp = await fetch(`${BOLLS_BASE}/get-books/${args.translation}/`);
    if (!resp.ok) {
      throw new Error(`Failed to fetch books for ${args.translation}: ${resp.status}`);
    }

    const books = await resp.json();

    // Cache permanently
    await ctx.runMutation(api.bible.setCacheEntry, {
      cacheKey,
      data: JSON.stringify(books),
    });

    return books;
  },
});

/**
 * Get chapter text for a specific book and chapter.
 * Returns cached data if available, otherwise fetches from Bolls.life.
 */
export const getChapter = action({
  args: {
    translation: v.string(),
    bookId: v.number(),
    chapter: v.number(),
  },
  handler: async (ctx, args): Promise<Array<{ verse: number; text: string }>> => {
    const cacheKey = `chapter:${args.translation}:${args.bookId}:${args.chapter}`;

    // Check cache
    const cached = await ctx.runQuery(api.bible.getCacheEntry, { cacheKey });
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from API
    const resp = await fetch(
      `${BOLLS_BASE}/get-chapter/${args.translation}/${args.bookId}/${args.chapter}/`
    );
    if (!resp.ok) {
      throw new Error(
        `Failed to fetch ${args.translation} book ${args.bookId} chapter ${args.chapter}: ${resp.status}`
      );
    }

    const raw: Array<{ pk: number; verse: number; text: string; comment?: string }> = await resp.json();

    // Clean text and simplify structure
    const cleaned = raw.map((v) => ({
      verse: v.verse,
      text: cleanBibleText(v.text),
    }));

    // Cache permanently
    await ctx.runMutation(api.bible.setCacheEntry, {
      cacheKey,
      data: JSON.stringify(cleaned),
    });

    return cleaned;
  },
});

/**
 * Get AI-generated study notes for a Bible chapter.
 * Uses OpenAI gpt-4o-mini. Cached by translation + book + chapter + age range.
 */
export const getStudyNotes = action({
  args: {
    translation: v.string(),
    bookName: v.string(),
    bookId: v.number(),
    chapter: v.number(),
    kidAge: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    summary: string;
    keyVerses: string[];
    whatItMeans: string;
    forYourLife: string;
    funFact: string;
    questionToThink: string;
  }> => {
    const age = args.kidAge ?? 10;
    // Cache by age range (4-6, 7-9, 10-12, 13+)
    const ageRange = age <= 6 ? "4-6" : age <= 9 ? "7-9" : age <= 12 ? "10-12" : "13+";
    const cacheKey = `study:${args.translation}:${args.bookId}:${args.chapter}:${ageRange}`;

    // Check cache
    const cached = await ctx.runQuery(api.bible.getCacheEntry, { cacheKey });
    if (cached) {
      return JSON.parse(cached);
    }

    // Get chapter text for context
    const chapterText = await ctx.runQuery(api.bible.getCacheEntry, {
      cacheKey: `chapter:${args.translation}:${args.bookId}:${args.chapter}`,
    });

    let textSummary = "";
    if (chapterText) {
      const verses: Array<{ verse: number; text: string }> = JSON.parse(chapterText);
      textSummary = verses.map((v) => `${v.verse}. ${v.text}`).join(" ").slice(0, 3000);
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const systemPrompt = `You are a Bible study helper for children. Your role is to explain Scripture passages in simple, age-appropriate language from a conservative, traditional Baptist theological perspective.

Your explanations should be consistent with the teaching approach of respected conservative Bible teachers like John MacArthur, Charles Spurgeon, and Matthew Henry.

Guidelines:
- Explain the plain, literal meaning of the text first
- Focus on God's character, His promises, and His plan for salvation
- Include practical application appropriate for a ${age}-year-old
- Use simple vocabulary and short sentences
- Be warm and encouraging, not preachy
- Point to Jesus whenever the text connects to Him
- If the passage contains difficult themes (war, death, sin), explain honestly but age-appropriately
- Avoid liberal, progressive, or allegorical interpretations unless the text is clearly figurative
- Do not add to or contradict what Scripture says

Return JSON only (no markdown formatting):
{
  "summary": "2-3 sentence overview of what this chapter is about",
  "keyVerses": ["verse reference and text", "another key verse"],
  "whatItMeans": "4-6 sentence explanation of the main teaching",
  "forYourLife": "2-3 sentences on how this applies to a kid's life",
  "funFact": "One interesting historical or cultural fact about this passage",
  "questionToThink": "One discussion question for the kid to think about"
}`;

    const userPrompt = `Explain ${args.bookName} chapter ${args.chapter} (${args.translation} translation) for a ${age}-year-old child.${textSummary ? `\n\nChapter text:\n${textSummary}` : ""}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OpenAI error: ${resp.status} ${errText}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    const notes = JSON.parse(content);

    // Cache permanently
    await ctx.runMutation(api.bible.setCacheEntry, {
      cacheKey,
      data: JSON.stringify(notes),
    });

    return notes;
  },
});

// ============================================================================
// Cache helpers (called by actions)
// ============================================================================

export const getCacheEntry = query({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("bibleCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();
    return entry?.data ?? null;
  },
});

export const setCacheEntry = mutation({
  args: {
    cacheKey: v.string(),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    // Upsert
    const existing = await ctx.db
      .query("bibleCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        cachedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("bibleCache", {
      cacheKey: args.cacheKey,
      data: args.data,
      cachedAt: Date.now(),
    });
  },
});

// ============================================================================
// Bible Search — Full-text search across translations
// ============================================================================

/**
 * Search the Bible for a word or phrase.
 * Searches the selected translation and optionally shows parallel results
 * from other translations for the same verses.
 *
 * Bolls.life search endpoint:
 * GET https://bolls.life/v2/find/{translation}?search={query}&page={page}
 */
export const searchBible = action({
  args: {
    query: v.string(),
    translation: v.string(), // Primary translation to search
    showParallel: v.optional(v.boolean()), // Show same verses in other translations
    testament: v.optional(v.string()), // "ot", "nt", or undefined for both
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cacheKey = `bible-search:${args.translation}:${args.query.toLowerCase().trim()}:${args.testament || "all"}:${args.page || 1}`;

    // Check cache
    const cached = await ctx.runQuery(api.bible.getCacheEntry, { cacheKey });
    if (cached) {
      return JSON.parse(cached);
    }

    const searchQuery = encodeURIComponent(args.query.trim());
    let url = `${BOLLS_BASE}/v2/find/${args.translation}?search=${searchQuery}`;

    if (args.testament) {
      url += `&filter=${args.testament}`;
    }
    if (args.page && args.page > 1) {
      url += `&page=${args.page}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return { results: [], total: 0, error: "Search failed" };
      }

      const data = await response.json();

      // Bolls returns { results: [...], count: number }
      const results = (data.results || data || []).slice(0, 50).map((verse: {
        pk: number;
        book: number;
        chapter: number;
        verse: number;
        text: string;
        bookName?: string;
      }) => ({
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        text: cleanBibleText(verse.text),
        translation: args.translation,
      }));

      // Fetch parallel translations for the first 10 results
      let parallelResults: Record<string, typeof results> = {};

      if (args.showParallel && results.length > 0) {
        const otherTranslations = TRANSLATIONS
          .filter((t) => t.code !== args.translation)
          .slice(0, 3); // Show up to 3 parallels

        const parallelPromises = otherTranslations.map(async (trans) => {
          try {
            // Fetch the same verses in the other translation
            const verses = results.slice(0, 5); // Limit parallel to first 5 results
            const parallelVerses = await Promise.all(
              verses.map(async (v: { book: number; chapter: number; verse: number }) => {
                const verseUrl = `${BOLLS_BASE}/get-text/${trans.code}/${v.book}/${v.chapter}/`;
                const res = await fetch(verseUrl);
                if (!res.ok) return null;
                const chapterData = await res.json();
                const matchingVerse = (chapterData as { verse: number; text: string }[]).find(
                  (cv) => cv.verse === v.verse
                );
                return matchingVerse
                  ? {
                      book: v.book,
                      chapter: v.chapter,
                      verse: v.verse,
                      text: cleanBibleText(matchingVerse.text),
                      translation: trans.code,
                    }
                  : null;
              })
            );
            return {
              translation: trans.code,
              verses: parallelVerses.filter(Boolean),
            };
          } catch {
            return { translation: trans.code, verses: [] };
          }
        });

        const parallelData = await Promise.allSettled(parallelPromises);
        for (const result of parallelData) {
          if (result.status === "fulfilled" && result.value.verses.length > 0) {
            parallelResults[result.value.translation] = result.value.verses as typeof results;
          }
        }
      }

      const searchResult = {
        results,
        total: data.count || results.length,
        parallel: parallelResults,
      };

      // Cache for 7 days (Bible text doesn't change)
      await ctx.runMutation(api.bible.setCacheEntry, {
        cacheKey,
        data: JSON.stringify(searchResult),
      });

      return searchResult;
    } catch (error) {
      console.error("[Bible Search] Error:", error);
      return { results: [], total: 0, error: "Search failed" };
    }
  },
});
