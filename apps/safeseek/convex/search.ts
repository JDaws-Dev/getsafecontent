"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

// --- Query normalization (inline since "use node" files can't import from non-node) ---

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "how", "why",
  "who", "where", "when", "do", "does", "did", "can", "could", "will",
  "would", "should", "tell", "me", "about", "please",
]);

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
    .sort()
    .join(" ");
}

// --- Query classification ---

const FACTUAL_STARTERS = /^(what|who|where|when|how many|how big|how far|how tall|how long|how much|how old)\b/i;
const CREATIVE_STARTERS = /^(why|how does|how do|explain|write|create|imagine|describe|compare)\b/i;

function classifyQuery(query: string): "factual" | "creative" {
  const trimmed = query.trim();
  if (FACTUAL_STARTERS.test(trimmed)) return "factual";
  if (CREATIVE_STARTERS.test(trimmed)) return "creative";
  // Default: treat short queries as factual (likely looking up a topic)
  if (trimmed.split(/\s+/).length <= 4) return "factual";
  return "creative";
}

// --- Age group helper ---

function getAgeGroup(ageMin: number): string {
  if (ageMin <= 6) return "4-6";
  if (ageMin <= 9) return "7-9";
  if (ageMin <= 12) return "10-12";
  if (ageMin <= 15) return "13-15";
  return "16-18";
}

// --- Image deduplication ---

type ImageResult = {
  url: string;
  thumbnail?: string;
  title: string;
  source: string;
  width?: number;
  height?: number;
};

function deduplicateImages(images: ImageResult[], limit: number): ImageResult[] {
  const seen = new Set<string>();
  const result: ImageResult[] = [];
  for (const img of images) {
    // Deduplicate by URL
    const key = img.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(img);
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Core AI-powered search - called internally after safety checks
 */
export const performSearch = internalAction({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Get kid profile
    const kidProfile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });

    if (!kidProfile) {
      throw new Error("Kid profile not found");
    }

    // Get parent's search settings
    const searchSettings = await ctx.runQuery(api.searchQueries.getSearchSettingsInternal, {
      userId: kidProfile.userId,
    });

    const ageMin = kidProfile.ageRange.min;
    const ageMax = kidProfile.ageRange.max;
    const strictness = kidProfile.contentStrictness;
    const blockedTopics = kidProfile.blockedTopics;
    const allowedTopics = kidProfile.allowedTopics || [];
    const customInstructions = kidProfile.customInstructions || searchSettings?.customInstructions || "";
    const ageGroup = getAgeGroup(ageMin);

    // --- Step 1: Check cache ---
    const normalized = normalizeQuery(args.query);
    const cacheResult = await ctx.runQuery(api.searchCache.checkCache, {
      normalizedQuery: normalized,
      ageGroup,
      strictness,
    });

    if (cacheResult) {
      // Cache hit — increment reuse counter and return
      await ctx.runMutation(internal.searchCache.incrementCacheReuse, {
        cacheId: cacheResult.cacheId,
      });
      try {
        return JSON.parse(cacheResult.response);
      } catch {
        // If cached response is corrupted, fall through to fresh search
      }
    }

    // --- Step 2: Fetch Wikipedia context (for factual queries) ---
    // This runs BEFORE OpenAI so we can inject Wikipedia content into the prompt
    const queryType = classifyQuery(args.query);
    let wikiContext: {
      title: string;
      summary: string;
      extract: string;
      thumbnail: string | null;
      images: Array<{ url: string; width: number; height: number }>;
      source: string;
      pageUrl: string;
    } | null = null;

    if (queryType === "factual") {
      try {
        wikiContext = await ctx.runAction(internal.wikipedia.fetchWikipediaContent, {
          query: args.query,
          ageGroup,
        });
      } catch (err) {
        console.error("[performSearch] Wikipedia fetch failed:", err);
      }
    }

    // --- Step 3: Build the system prompt with optional Wikipedia context ---
    let wikiSection = "";
    if (wikiContext) {
      wikiSection = `
REFERENCE INFORMATION (from Wikipedia — use this to provide accurate, factual answers):
Title: ${wikiContext.title}
Summary: ${wikiContext.summary}
Content: ${wikiContext.extract}
Source: ${wikiContext.source === "simple_wikipedia" ? "Simple English Wikipedia" : "Wikipedia"}

Use this reference to ground your answer in facts. Summarize it in a way appropriate for a ${ageMin}-${ageMax} year old. Do NOT just copy it — rephrase it in a fun, kid-friendly way.`;
    }

    const systemPrompt = `You are SafeSeek, a friendly and knowledgeable AI assistant for kids. You answer questions directly — like a smart, patient tutor who loves helping kids learn.

CHILD'S AGE RANGE: ${ageMin}-${ageMax} years old
CONTENT STRICTNESS: ${strictness}
${blockedTopics.length > 0 ? `BLOCKED TOPICS (never discuss these): ${blockedTopics.join(", ")}` : ""}
${allowedTopics.length > 0 ? `ALLOWED TOPICS (parent has explicitly whitelisted these — override blocked topics if there's a conflict): ${allowedTopics.join(", ")}` : ""}
${customInstructions ? `PARENT INSTRUCTIONS: ${customInstructions}` : ""}
${wikiSection}

STRICTNESS LEVELS:
- "strict": Only educational and explicitly kid-friendly content. No violence, no mature themes, no controversial topics.
- "moderate": Educational content plus age-appropriate entertainment. Mild references to history/science topics OK. No mature themes.
- "light": Broader range of age-appropriate content. Still no explicit content, but more relaxed filtering.

YOUR TASK:
1. Evaluate if the question is appropriate for a child aged ${ageMin}-${ageMax}.
2. If inappropriate, return safe:false with a friendly redirect suggestion.
3. If appropriate, answer the question DIRECTLY in a way the child can understand.
4. Write at the reading level of a ${ageMin}-${ageMax} year old.
5. Be enthusiastic and encouraging about their curiosity.
6. DO NOT provide URLs or links to websites. You ARE the answer — explain things yourself.
7. DO NOT use markdown formatting (no **, ##, ###, *, etc). Write in plain text only. The UI handles all formatting.
8. If the topic is complex, break it into simple sections with clear headings using the sections array — NOT in the answer field.
9. The "answer" field should be a SHORT 2-3 sentence overview. Put details in the "sections" array. Do NOT repeat section content in the answer.
10. Include fun facts or "Did you know?" tidbits when relevant — put them in the funFacts array, NOT in the answer.
9. If you're not sure about something, say so honestly.
${wikiContext ? "10. Use the Wikipedia reference above as your primary source of facts. Add your own kid-friendly explanation on top." : ""}

RESPOND WITH VALID JSON ONLY (no markdown, no code fences):
{
  "safe": boolean,
  "answer": "Your direct, kid-friendly answer to the question. Use simple paragraphs. Can be several paragraphs long for complex topics.",
  "sections": [
    {
      "heading": "Section title",
      "content": "Section content — a clear, kid-friendly explanation"
    }
  ],
  "funFacts": ["A fun or surprising fact related to the topic"],
  "relatedQuestions": ["A follow-up question the kid might want to ask next", "Another related question"],
  "flagged": boolean,
  "flagReason": "Optional reason if flagged for parent review"
}

If the query is not safe, return:
{
  "safe": false,
  "answer": "A warm, friendly message like: 'That's not something I can help with, but I'd love to help you learn about something else! How about asking me about space, animals, or how things work?'",
  "sections": [],
  "funFacts": [],
  "relatedQuestions": ["A safe alternative question they might enjoy"],
  "flagged": true,
  "flagReason": "Description of why this was blocked"
}

Be warm, fun, and genuinely helpful. You're their favorite teacher, not a search engine.`;

    // --- Step 5: Call OpenAI + Pexels IN PARALLEL for speed ---
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Fire both requests simultaneously
    const openaiPromise = fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.query },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const pexelsPromise = kidProfile.allowImageSearch
      ? ctx.runAction(internal.wikipedia.fetchSerperImages, { query: args.query }).catch(() => [])
      : Promise.resolve([]);

    // Wait for both
    const [response, pexelsImages] = await Promise.all([openaiPromise, pexelsPromise]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[performSearch] OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the AI response
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[performSearch] Failed to parse AI response:", content);
      throw new Error("Failed to parse search results");
    }

    const now = Date.now();

    if (!parsed.safe) {
      await ctx.runMutation(internal.searchQueries.insertBlockedSearch, {
        kidProfileId: args.kidProfileId,
        query: args.query,
        blockedReason: parsed.flagReason || "Query deemed inappropriate for child",
        searchedAt: now,
      });

      return {
        safe: false,
        answer: parsed.answer || "Let's try searching for something else!",
        sections: [],
        funFacts: [],
        relatedQuestions: parsed.relatedQuestions || [],
        flagged: true,
        flagReason: parsed.flagReason,
        images: [],
      };
    }

    // --- Step 6: Collect images (Wikipedia already fetched, Pexels already fetched in parallel) ---
    let allImages: ImageResult[] = [];

    if (kidProfile.allowImageSearch) {
      // Wikipedia images (from wikiContext, no extra latency)
      if (wikiContext?.images) {
        for (const img of wikiContext.images) {
          allImages.push({
            url: img.url,
            title: wikiContext.title || "",
            source: "wikipedia",
            width: img.width,
            height: img.height,
          });
        }
      }
      if (allImages.length < 4 && wikiContext?.thumbnail) {
        const thumbUrl = wikiContext.thumbnail;
        if (!allImages.some((img) => img.url === thumbUrl)) {
          allImages.push({ url: thumbUrl, title: wikiContext.title || "", source: "wikipedia" });
        }
      }

      // Pexels images (already fetched in parallel with OpenAI)
      if (Array.isArray(pexelsImages)) {
        for (const img of pexelsImages as any[]) {
          allImages.push({
            url: img.url,
            thumbnail: img.thumbnail,
            title: img.title || "",
            source: "google",
            width: img.width,
            height: img.height,
          });
        }
      }

      allImages = deduplicateImages(allImages, 8);
    }

    // --- Step 7: Build final response ---
    const finalResponse = {
      safe: true,
      answer: parsed.answer || "",
      sections: parsed.sections || [],
      funFacts: parsed.funFacts || [],
      relatedQuestions: parsed.relatedQuestions || [],
      flagged: parsed.flagged || false,
      flagReason: parsed.flagReason,
      images: allImages,
      wikiSource: wikiContext
        ? { title: wikiContext.title, source: wikiContext.source, pageUrl: wikiContext.pageUrl }
        : undefined,
    };

    // Store in search history
    await ctx.runMutation(internal.searchQueries.insertSearchHistory, {
      kidProfileId: args.kidProfileId,
      query: args.query,
      results: JSON.stringify(parsed.sections || []),
      aiSummary: parsed.answer || "",
      flagged: parsed.flagged || false,
      flagReason: parsed.flagReason,
      searchedAt: now,
    });

    // --- Step 8: Write to cache ---
    await ctx.runMutation(internal.searchCache.writeCache, {
      normalizedQuery: normalized,
      ageGroup,
      strictness,
      response: JSON.stringify(finalResponse),
    });

    return finalResponse;
  },
});

/**
 * Public-facing search action - checks canSearch first, then calls performSearch
 */
export const searchFromKid = action({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if kid can search (time limits)
    const searchCheck = await ctx.runQuery(api.timeLimits.canSearch, {
      kidProfileId: args.kidProfileId,
    });

    if (!searchCheck.canSearch) {
      return {
        safe: false,
        results: [],
        summary: searchCheck.reason === "outside_hours"
          ? "Search time is over for now. Come back during allowed hours!"
          : "You've reached your search limit for today. Come back tomorrow!",
        flagged: false,
        blocked: true,
        reason: searchCheck.reason,
        images: [],
      };
    }

    // Validate query is not empty
    const trimmedQuery = args.query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return {
        safe: false,
        results: [],
        summary: "Please type a longer search query!",
        flagged: false,
        blocked: false,
        images: [],
      };
    }

    // Perform the search
    const result = await ctx.runAction(internal.search.performSearch, {
      kidProfileId: args.kidProfileId,
      query: trimmedQuery,
    });

    return result;
  },
});
