"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { sanitizeQuery as sanitizeInput, detectPromptInjection, filterResponse } from "./ai/inputFilter";
import { classifyIntent, shouldBlockCategory, redirectMessage } from "./ai/intentClassifier";
import { normalizeForIntentCache } from "./intentCache";
import { isLoop, loopMessage } from "./ai/loopDetector";
import { normalizeQuery } from "./lib/utils";

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
    intentCategory: v.optional(v.string()),
    intentConfidence: v.optional(v.number()),
    intentRationale: v.optional(v.string()),
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
    // profileKey captures all settings that affect the response (including blocked topics)
    const sortedBlocked = [...blockedTopics].sort();
    const profileKey = [ageGroup, strictness, lexileLevel, ...accessibilityNeeds.sort(), "bt:" + sortedBlocked.join(",")].join("|");
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

    const systemPrompt = `You are SafeStudy, a friendly AI tutor for kids aged ${ageMin}-${ageMax}. Content strictness: ${strictness}.
${lexileLevel !== "auto" ? `READING LEVEL: ${lexileLevel} grade (override age default).` : ""}
${accessibilityNeeds.length > 0 ? `ACCESSIBILITY: ${accessibilityNeeds.join(", ")}.` : ""}
${blockedTopics.length > 0 ? `STRICTLY BLOCKED TOPICS — If the query is about ANY of these topics, you MUST return safe:false. No exceptions. Do NOT answer questions about: ${blockedTopics.join(", ")}. This includes educational questions about these topics. Even "how does X work" about a blocked topic must be blocked.` : ""}
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

    // --- Response filtering: check AI output for unsafe content ---
    if (parsed.safe && parsed.answer) {
      // Build full response text for filtering (answer + all section content)
      const fullResponseText = [
        parsed.answer,
        ...(parsed.sections || []).map((s: any) => s.content || ""),
        ...(parsed.funFacts || []),
      ].join(" ");

      const responseCheck = filterResponse(fullResponseText, blockedTopics);

      if (!responseCheck.safe) {
        console.warn(`[performSearch] Response filtered: ${responseCheck.reason}`);
        parsed.safe = false;
        parsed.flagged = true;
        parsed.flagReason = "Content filtered by safety system";
        parsed.answer = "I found some information, but it wasn't quite right for you. Try asking in a different way!";
        parsed.sections = [];
        parsed.funFacts = [];
      } else if (responseCheck.cleaned) {
        // URLs were stripped — update the answer text
        parsed.answer = parsed.answer.replace(
          /https?:\/\/[^\s)<>]+|www\.[^\s)<>]+|\b[\w-]+\.(com|org|net|edu|gov|io|co)\b(\/[^\s)<>]*)?/gi,
          "[link removed]"
        );
        if (parsed.sections) {
          for (const section of parsed.sections) {
            if (section.content) {
              section.content = section.content.replace(
                /https?:\/\/[^\s)<>]+|www\.[^\s)<>]+|\b[\w-]+\.(com|org|net|edu|gov|io|co)\b(\/[^\s)<>]*)?/gi,
                "[link removed]"
              );
            }
          }
        }
      }
    }

    const now = Date.now();

    if (!parsed.safe) {
      await ctx.runMutation(internal.searchQueries.insertBlockedSearch, {
        kidProfileId: args.kidProfileId,
        query: args.query,
        blockedReason: parsed.flagReason || "Query deemed inappropriate for child",
        searchedAt: now,
        intentCategory: args.intentCategory,
        intentConfidence: args.intentConfidence,
        intentRationale: args.intentRationale,
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

      // Cap at 6 (Apr 2026): keeps image search useful for "what does X look
      // like" without giving the kid a feed to scroll. No "more like this".
      allImages = deduplicateImages(allImages, 6);
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
      intentCategory: args.intentCategory,
      intentConfidence: args.intentConfidence,
      intentRationale: args.intentRationale,
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
    // Check subscription status before any AI calls
    const kidProfile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });
    if (!kidProfile) {
      return {
        safe: false,
        results: [],
        summary: "Profile not found. Please try again.",
        flagged: false,
        blocked: true,
        reason: "no_profile",
        images: [],
      };
    }

    const subCheck = await ctx.runQuery(internal.users.checkSubscriptionActive, {
      userId: kidProfile.userId,
    });
    if (!subCheck.allowed) {
      return {
        safe: false,
        results: [],
        summary: subCheck.message,
        flagged: false,
        blocked: true,
        reason: "subscription_expired",
        images: [],
      };
    }

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

    // --- Pre-filter: sanitize and check for prompt injection ---
    const sanitized = sanitizeInput(trimmedQuery);
    const injectionCheck = detectPromptInjection(sanitized);

    if (!injectionCheck.safe) {
      console.warn(`[searchFromKid] Prompt injection blocked: ${injectionCheck.reason} | query: "${trimmedQuery.slice(0, 100)}"`);
      return {
        safe: false,
        results: [],
        summary: "I can't help with that question. Try asking something else!",
        flagged: true,
        blocked: true,
        reason: "injection_blocked",
        images: [],
      };
    }

    // Rate limit check
    if (kidProfile) {
      const rateCheck = await ctx.runMutation(api.rateLimit.checkAndRecord, {
        userId: kidProfile.userId,
        action: "search",
      });
      if (!rateCheck.allowed) {
        return {
          safe: false,
          results: [],
          summary: rateCheck.message || "Too many searches. Please wait a moment and try again.",
          flagged: false,
          blocked: true,
          reason: "rate_limited",
          images: [],
        };
      }
    }

    // --- Intent classifier: catches synonym-shuffled aesthetic browsing,
    //     self-image queries, ED/self-harm signals BEFORE the expensive
    //     search runs. Fails open: classifier errors don't block the kid.
    //     Cached by normalized query text (30d TTL) — identical queries
    //     shouldn't re-bill gpt-4o-mini or pay its latency.
    const intentCacheKey = normalizeForIntentCache(sanitized);
    let intent = (await ctx.runQuery(internal.intentCache.get, {
      normalizedQuery: intentCacheKey,
    })) as Awaited<ReturnType<typeof classifyIntent>> | null;
    if (!intent) {
      intent = await classifyIntent(sanitized, process.env.OPENAI_API_KEY);
      if (!intent.degraded) {
        // Fire-and-forget; a cache-write failure must not affect the search.
        try {
          await ctx.runMutation(internal.intentCache.put, {
            normalizedQuery: intentCacheKey,
            category: intent.category,
            confidence: intent.confidence,
            rationale: intent.rationale,
          });
        } catch (err) {
          console.warn("[searchFromKid] intent cache write failed:", err);
        }
      }
    }

    // Fail-open is deliberate, but it must not be silent: while degraded,
    // the always-escalate ED/self-harm alerts can't fire from the LLM path.
    // Surface to the operator (deduped to one email per 24h).
    if (intent.degraded) {
      console.error(
        `[searchFromKid] intent classifier DEGRADED (${intent.rationale}) — query passed with regex-only screening`
      );
      try {
        const shouldAlert = await ctx.runMutation(internal.opsAlerts.noteClassifierDegraded, {
          rationale: intent.rationale,
        });
        if (shouldAlert) {
          await ctx.scheduler.runAfter(0, internal.opsAlerts.sendClassifierDownAlert, {
            rationale: intent.rationale,
          });
        }
      } catch (err) {
        console.error("[searchFromKid] failed to record classifier degradation:", err);
      }
    }

    const decision = shouldBlockCategory(
      intent.category as any,
      kidProfile.contentStrictness || "moderate",
      kidProfile.blockedTopics || [],
      intent.confidence
    );

    if (decision.block) {
      const now = Date.now();

      // Record the block with intent metadata
      await ctx.runMutation(internal.searchQueries.insertBlockedSearch, {
        kidProfileId: args.kidProfileId,
        query: sanitized,
        blockedReason: decision.reason,
        searchedAt: now,
        intentCategory: intent.category,
        intentConfidence: intent.confidence,
        intentRationale: intent.rationale,
      });

      // Concern-level alerts (ED, self-harm) → log + schedule parent email.
      // Schedule via internalAction so the public action returns fast.
      if (decision.alert) {
        await ctx.runMutation(internal.searchQueries.recordConcernAlert, {
          kidProfileId: args.kidProfileId,
          userId: kidProfile.userId,
          query: sanitized,
          category: intent.category,
          confidence: intent.confidence,
          rationale: intent.rationale,
        });
        await ctx.scheduler.runAfter(0, internal.concernAlerts.sendParentEmail, {
          kidProfileId: args.kidProfileId,
          userId: kidProfile.userId,
          query: sanitized,
          category: intent.category,
          rationale: intent.rationale,
        });
      }

      return {
        safe: false,
        results: [],
        summary: redirectMessage(intent.category as any),
        flagged: decision.alert,
        blocked: true,
        reason: decision.reason,
        images: [],
        intentCategory: intent.category,
      };
    }

    // --- Loop detector: if the kid has searched ~the same thing 4+ times in
    //     the last 30 minutes, gently redirect them. Catches synonym shuffling
    //     against the blocker AND innocuous repetition (asking the same thing
    //     dozens of times). Color-rotation collapses to a single key.
    const recentQueries = await ctx.runQuery(internal.searchQueries.getRecentQueriesForLoopCheck, {
      kidProfileId: args.kidProfileId,
      sinceMs: 30 * 60 * 1000,
    });
    const loopCheck = isLoop(sanitized, recentQueries);
    if (loopCheck.loop) {
      const now = Date.now();
      await ctx.runMutation(internal.searchQueries.insertBlockedSearch, {
        kidProfileId: args.kidProfileId,
        query: sanitized,
        blockedReason: `loop_detected_${loopCheck.matchCount}_in_30min`,
        searchedAt: now,
        intentCategory: intent.category,
        intentConfidence: intent.confidence,
        intentRationale: intent.rationale,
      });
      return {
        safe: false,
        results: [],
        summary: loopMessage(),
        flagged: false,
        blocked: true,
        reason: "loop_detected",
        images: [],
        intentCategory: intent.category,
      };
    }

    // Perform the search with sanitized query + intent metadata
    const result = await ctx.runAction(internal.search.performSearch, {
      kidProfileId: args.kidProfileId,
      query: sanitized,
      intentCategory: intent.category,
      intentConfidence: intent.confidence,
      intentRationale: intent.rationale,
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
    // Pre-filter the subtopic and topic for injection attempts
    const sanitizedTopic = sanitizeInput(args.topic);
    const sanitizedSubtopic = sanitizeInput(args.subtopic);

    const topicCheck = detectPromptInjection(sanitizedTopic);
    const subtopicCheck = detectPromptInjection(sanitizedSubtopic);

    if (!topicCheck.safe || !subtopicCheck.safe) {
      console.warn(`[expandSection] Prompt injection blocked in expand`);
      return { content: "I can't help with that question. Try asking something else!" };
    }

    const kidProfile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });
    if (!kidProfile) throw new Error("Profile not found");

    // Check subscription status before AI call
    const subCheck = await ctx.runQuery(internal.users.checkSubscriptionActive, {
      userId: kidProfile.userId,
    });
    if (!subCheck.allowed) {
      return { content: subCheck.message };
    }

    // Rate limit check (expand counts as a search action)
    const rateCheck = await ctx.runMutation(api.rateLimit.checkAndRecord, {
      userId: kidProfile.userId,
      action: "search",
    });
    if (!rateCheck.allowed) {
      return { content: rateCheck.message || "Too many requests. Please wait a moment and try again." };
    }

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
            content: `The topic is "${sanitizedTopic}". I already know this about "${sanitizedSubtopic}": "${args.currentContent}". Tell me much more about ${sanitizedSubtopic}. Go deeper with specific details I don't already know.`,
          },
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) throw new Error("OpenAI error");
    const data = await response.json();
    const expandedContent = data.choices?.[0]?.message?.content || "";

    // Filter expanded response
    const blockedTopics = kidProfile.blockedTopics || [];
    const responseCheck = filterResponse(expandedContent, blockedTopics);

    if (!responseCheck.safe) {
      console.warn(`[expandSection] Response filtered: ${responseCheck.reason}`);
      return { content: "I found some information, but it wasn't quite right for you. Try asking in a different way!" };
    }

    // Strip any URLs that leaked through
    const cleanedContent = responseCheck.cleaned || expandedContent;
    return { content: cleanedContent };
  },
});
