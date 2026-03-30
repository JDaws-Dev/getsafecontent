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
    const lexileLevel = kidProfile.lexileLevel || "auto";
    const accessibilityNeeds = kidProfile.accessibilityNeeds || [];
    const ageGroup = getAgeGroup(ageMin);

    // --- Step 1: Check cache ---
    const normalized = normalizeQuery(args.query);
    // profileKey captures all settings that affect the response
    const profileKey = [ageGroup, strictness, lexileLevel, ...accessibilityNeeds.sort()].join("|");
    const cacheResult = await ctx.runQuery(api.searchCache.checkCache, {
      normalizedQuery: normalized,
      ageGroup,
      strictness,
      profileKey,
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

    const systemPrompt = `You are SafeNet, a friendly AI tutor for kids aged ${ageMin}-${ageMax}. Content strictness: ${strictness}.
${lexileLevel !== "auto" ? `READING LEVEL: ${lexileLevel} grade (override age default).` : ""}
${accessibilityNeeds.length > 0 ? `ACCESSIBILITY: ${accessibilityNeeds.join(", ")}.` : ""}
${blockedTopics.length > 0 ? `BLOCKED TOPICS: ${blockedTopics.join(", ")}` : ""}
${allowedTopics.length > 0 ? `ALLOWED TOPICS (override blocks): ${allowedTopics.join(", ")}` : ""}
${customInstructions ? `PARENT INSTRUCTIONS: ${customInstructions}` : ""}
${wikiSection}

RULES:
- If inappropriate for the child, return safe:false with answer (friendly redirect) and flagReason. Set flagged:true, empty sections/funFacts.
- If safe, answer directly. No URLs, no markdown formatting (plain text only, UI handles formatting).
- "answer": SHORT 2-3 sentence overview. Details go in "sections" array. Don't repeat content.
- Fun facts go in funFacts array, not in answer.
- Include a Mermaid diagram (graph TD, emojis, 4-8 nodes) for processes/cycles/systems/comparisons. null for simple facts.
${wikiContext ? "- Use the Wikipedia reference above as primary source. Rephrase kid-friendly." : ""}

RESPOND WITH VALID JSON ONLY (no markdown, no code fences):
{"safe":boolean,"answer":"...","sections":[{"heading":"...","content":"..."}],"funFacts":["..."],"relatedQuestions":["..."],"diagram":"mermaid code or null","flagged":boolean,"flagReason":"...or null"}`;

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
        temperature: 0,
        max_tokens: 800,
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

      // Check if kid can request topic approval (defaults to true)
      const canRequest = (kidProfile as any).allowTopicRequests !== false;
      let alreadyRequested = false;
      if (canRequest) {
        alreadyRequested = await ctx.runQuery(api.topicRequests.hasPendingRequest, {
          kidProfileId: args.kidProfileId,
          query: args.query.trim(),
        });
      }

      return {
        safe: false,
        answer: parsed.answer || "Let's try searching for something else!",
        sections: [],
        funFacts: [],
        relatedQuestions: parsed.relatedQuestions || [],
        flagged: true,
        flagReason: parsed.flagReason || undefined,
        images: [],
        canRequest,
        alreadyRequested,
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
      diagram: parsed.diagram || null,
      flagged: parsed.flagged || false,
      flagReason: parsed.flagReason || undefined,
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
      flagReason: parsed.flagReason || undefined,
      searchedAt: now,
    });

    // --- Step 8: Write to cache ---
    await ctx.runMutation(internal.searchCache.writeCache, {
      normalizedQuery: normalized,
      ageGroup,
      strictness,
      profileKey,
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

/**
 * Lightweight "expand" action — just gets more detail on a subtopic.
 * No Wikipedia, no images, no cache. Fast and focused.
 */
export const expandSection = action({
  args: {
    kidProfileId: v.id("kidProfiles"),
    topic: v.string(),
    subtopic: v.string(),
    currentContent: v.string(),
  },
  handler: async (ctx, args) => {
    const kidProfile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });
    if (!kidProfile) throw new Error("Profile not found");

    const age = kidProfile.ageRange?.min || 10;
    const lexile = kidProfile.lexileLevel || "auto";
    const accessibilityNeeds = kidProfile.accessibilityNeeds || [];

    let readingInstruction;
    if (lexile !== "auto") {
      readingInstruction = `CRITICAL: Write at a ${lexile} grade reading level. A 2nd grader needs very simple words and short sentences (5-8 words). A 12th grader can handle advanced vocabulary. Match the grade level EXACTLY.`;
    } else {
      readingInstruction = `Write for a ${age} year old child.`;
    }

    let accessibilityInstruction = "";
    if (accessibilityNeeds.includes("dyslexia")) accessibilityInstruction += " Use short sentences under 15 words. Use simple, common words.";
    if (accessibilityNeeds.includes("adhd")) accessibilityInstruction += " Lead with the most interesting fact. Keep paragraphs very short.";
    if (accessibilityNeeds.includes("esl")) accessibilityInstruction += " Use simple vocabulary. Define technical terms in parentheses.";

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You expand on topics for kids. ${readingInstruction}${accessibilityInstruction} Give specific facts, dates, names, and examples. Be thorough but match the reading level. Write 4-6 paragraphs. Plain text only, no markdown. No URLs. IMPORTANT: Always end with a complete sentence.`,
          },
          {
            role: "user",
            content: `The topic is "${args.topic}". I already know this about "${args.subtopic}": "${args.currentContent}". Tell me much more about ${args.subtopic}. Go deeper with specific details I don't already know.`,
          },
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) throw new Error("OpenAI error");
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || "" };
  },
});
