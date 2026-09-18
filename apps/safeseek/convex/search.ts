"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { sanitizeQuery as sanitizeInput, detectPromptInjection, filterResponse } from "./ai/inputFilter";
import { queryMatchesAllowedTopic } from "./ai/intentClassifier";
import { runSafetyGate } from "./ai/safetyGate";
import { SAFETY_GATE_REFS } from "./ai/gateRefs";
import { normalizeQuery } from "./lib/utils";

/**
 * Should we push back on the answering model's refusal?
 *
 * Only when the refusal is unexplained or generic. A refusal that names real
 * harm is taken at face value, and any query that actually reaches for harmful
 * material is never re-asked regardless of what the model said.
 */
function isRefusalWorthChallenging(query: string, flagReason?: string): boolean {
  const q = query.toLowerCase();

  // Never re-ask for genuinely harmful material.
  if (
    /\b(porn|nude|naked|sex|nsfw|kill myself|suicide|self ?harm|cut myself|how to make (a )?(bomb|gun|meth)|buy (drugs|weed|cocaine)|hentai)\b/.test(
      q
    )
  ) {
    return false;
  }

  const reason = (flagReason ?? "").toLowerCase().trim();
  if (!reason) return true;

  // A refusal that names a real harm category is respected.
  const namesRealHarm =
    /(sexual|nudity|violence|gore|self.?harm|suicide|drug|weapon|gun|hate|abuse|explicit|graphic)/.test(
      reason
    );
  return !namesRealHarm;
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
${blockedTopics.length > 0 ? `BLOCKED TOPICS — Return safe:false when the query is GENUINELY ABOUT one of these: ${blockedTopics.join(", ")}. Judge the subject of the question, not whether a word brushes against a topic. Do NOT block: ordinary animals and jobs (police dogs, guard dogs, dog breeds), exercise and fitness (arm workout, core workout, calisthenics), clothing and styles (dress styles, prom dresses, outfits), names and their meanings, a public figure's height/age/filmography, quotes about sadness or hardship, or ordinary friendship questions. When a query is only loosely adjacent to a blocked topic, answer it.` : ""}
${allowedTopics.length > 0 ? `ALLOWED TOPICS (override blocks): ${allowedTopics.join(", ")}` : ""}
${customInstructions ? `PARENT INSTRUCTIONS: ${customInstructions}` : ""}
${wikiSection}

RULES:
- safe:false is ONLY for genuinely harmful material: sexual content, graphic violence or gore, instructions for self-harm, how to obtain or use drugs or weapons, or hateful content. Nothing else.
- These are ALWAYS safe:true — answer them properly, never redirect:
  * Religion, theology and scripture, including questions about God, Yahweh, prayer, other faiths, and what any deity is described as being like
  * Philosophy and big questions (consciousness, existence, meaning, ethics, death as a concept)
  * Any school subject, science, history, maths, grammar
  * Video games, consoles, apps and computing
  * Names, their meanings and origins
  * Hair, nails, makeup, clothing, fashion and style
  * Public figures' public work, height, age and filmography
  * Sport, exercise, food and nutrition
- If a question is merely awkward, adult-adjacent or unfamiliar, answer it at the child's level. Refusing an ordinary question teaches the child the tool is broken, and they go looking somewhere with no supervision at all.
- When you do return safe:false, put the actual harm category in flagReason. "Inappropriate topic." is not a reason and is never acceptable.
- If safe, answer directly. No URLs, no markdown formatting (plain text only, UI handles formatting).
- "answer": SHORT 2-3 sentence overview. Details go in "sections" array. Don't repeat content.
- Fun facts go in funFacts array, not in answer.
- Include a Mermaid diagram (graph TD, 4-8 nodes, plain text labels, no emoji) for processes/cycles/systems/comparisons. null for simple facts.
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

    // --- Refusal floor -----------------------------------------------------
    // The answering model decides `safe` itself, and it over-refuses badly.
    // Real examples from production, all returned as a bare "Inappropriate
    // topic.": "What does Yahweh look like in Hebrew?" (three times, from a
    // child in a Christian family), "What is consciousness?", "How do I get
    // the Google Play store on a Nintendo Switch?".
    //
    // Instructions alone did not fix this — the previous prompt already told
    // it to judge the subject rather than the words. So when a refusal has no
    // recognisable harm behind it and the classifier read the query as
    // ordinary, we ask exactly once more with the refusal named. If it holds,
    // the refusal stands.
    if (!parsed.safe && isRefusalWorthChallenging(args.query, parsed.flagReason)) {
      console.warn(
        `[performSearch] challenging refusal for "${args.query}" (reason: ${parsed.flagReason ?? "none"})`
      );
      try {
        const retry = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  systemPrompt +
                  `\n\nA previous attempt refused this question as "${parsed.flagReason ?? "inappropriate"}". That refusal was reviewed and was wrong: this is an ordinary question a child may ask. Answer it properly at the child's level and return safe:true. Only keep safe:false if the question genuinely asks for sexual content, graphic violence, self-harm instructions, drug or weapon procurement, or hateful content.`,
              },
              { role: "user", content: args.query },
            ],
            temperature: 0,
            max_tokens: 800,
          }),
        });
        if (retry.ok) {
          const retryData = await retry.json();
          const retryContent = retryData.choices?.[0]?.message?.content;
          if (retryContent) {
            const retryParsed = JSON.parse(
              retryContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
            );
            if (retryParsed?.safe && retryParsed?.answer) {
              parsed = retryParsed;
            }
          }
        }
      } catch (err) {
        // Keep the original refusal — a retry failure must never open the gate.
        console.warn("[performSearch] refusal challenge failed:", err);
      }
    }

    // --- Response filtering: check AI output for unsafe content ---
    if (parsed.safe && parsed.answer) {
      // Build full response text for filtering (answer + all section content)
      const fullResponseText = [
        parsed.answer,
        ...(parsed.sections || []).map((s: any) => s.content || ""),
        ...(parsed.funFacts || []),
      ].join(" ");

      // Parent-approved topics take the word filter out of the loop for this
      // query. An approved phrase that overlaps a blocked topic ("nails" on a
      // kid whose parent blocked "nail polish", say) would otherwise pass the
      // block decision and then be scrubbed here — the approval only half
      // working, which is worse than not having it.
      const approvedQuery = queryMatchesAllowedTopic(args.query, allowedTopics);
      const responseCheck = filterResponse(
        fullResponseText,
        approvedQuery ? [] : blockedTopics,
      );

      if (!responseCheck.safe) {
        console.warn(`[performSearch] Response filtered: ${responseCheck.reason}`);

        // One incidental word used to destroy an entire good answer. "cute
        // fall nails" was refused because the answer said a style was
        // "dating back to" something, and `dating` is on this child's blocked
        // list. The question was fine and the answer was fine; a substring was
        // not. Ask once for the same answer without that topic before giving
        // up on it.
        let recovered = false;
        try {
          const topic = (responseCheck.reason || "").split(":").pop()?.trim();
          const rewrite = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    systemPrompt +
                    `\n\nIMPORTANT: your previous answer was rejected because it used the word "${topic}". Answer the same question again, just as fully, without using that word anywhere — including in unrelated idioms such as "dating back to". Do not mention the restriction.`,
                },
                { role: "user", content: args.query },
              ],
              temperature: 0,
              max_tokens: 800,
            }),
          });
          if (rewrite.ok) {
            const rd = await rewrite.json();
            const rc = rd.choices?.[0]?.message?.content;
            if (rc) {
              const rp = JSON.parse(rc.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
              if (rp?.safe && rp?.answer) {
                const rtext = [
                  rp.answer,
                  ...(rp.sections || []).map((x: any) => x.content || ""),
                  ...(rp.funFacts || []),
                ].join(" ");
                // Only accept a rewrite that actually clears the filter.
                if (filterResponse(rtext, approvedQuery ? [] : blockedTopics).safe) {
                  parsed = rp;
                  recovered = true;
                }
              }
            }
          }
        } catch (err) {
          console.warn("[performSearch] response rewrite failed:", err);
        }

        if (!recovered) {
          parsed.safe = false;
          parsed.flagged = true;
          parsed.flagReason = `Content filtered by safety system (${responseCheck.reason})`;
          parsed.answer = "I found some information, but it wasn't quite right for you. Try asking in a different way!";
          parsed.sections = [];
          parsed.funFacts = [];
        }
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

    // Count the search on the day record too. searchHistory is the budget's
    // source of truth; kidProgress is what the parent's week view and the
    // Sunday digest read, and it has to agree with it.
    try {
      await ctx.runMutation(internal.progress.recordActivity, {
        kidProfileId: args.kidProfileId,
        userId: kidProfile.userId,
        searches: 1,
      });
    } catch (err) {
      console.warn("[performSearch] failed to record activity:", err);
    }

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

    // Parent paused this kid from the hub (familySync). Checked before
    // anything else so a paused kid never reaches the AI, whatever else says.
    if (kidProfile.accessPaused === true) {
      return {
        safe: false,
        results: [],
        summary: "Search is paused right now. Ask your parent.",
        flagged: false,
        blocked: true,
        reason: "paused",
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
      // Record the cap being hit.
      //
      // Nothing used to write this row: the gate returned early and the only
      // "limit_reached" reader was the Sunday digest, whose "hit the daily
      // budget on N days" line was therefore always zero. A parent reading
      // that line was being told their kid never ran out of searches, which
      // for a capped kid is exactly backwards. Deduped to one row per reason
      // per day so a kid retrying ten times doesn't inflate it.
      if (searchCheck.reason === "limit_reached" || searchCheck.reason === "family_limit_reached") {
        try {
          await ctx.runMutation(internal.searchQueries.noteLimitReached, {
            kidProfileId: args.kidProfileId,
            reason: searchCheck.reason,
            query: args.query.slice(0, 200),
          });
        } catch (err) {
          console.warn("[searchFromKid] failed to record limit_reached:", err);
        }
      }
      return {
        safe: false,
        results: [],
        summary: searchCheck.reason === "paused"
          ? "Search is paused right now. Ask your parent."
          : searchCheck.reason === "outside_hours"
          ? "Search time is over for now. Come back during allowed hours!"
          : searchCheck.reason === "family_limit_reached"
          // The family-wide limit is shared with the other Safe Family apps, so
          // "your search limit" would be wrong — they may have used it elsewhere.
          ? "That's all your screen time for today. Come back tomorrow!"
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

    // Rate limit check (before the gate: a flood shouldn't get free classifier
    // calls, and the classifier is the expensive part of screening).
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

    // --- Safety gate --------------------------------------------------------
    // Sanitize, injection filter, intent classification, concern-rephrase
    // guard, category block, loop detection. This sequence used to live inline
    // here, which is why Research mode had none of it; it now lives in
    // ai/safetyGate.ts and every kid-facing surface runs the same one.
    const gate = await runSafetyGate(ctx, SAFETY_GATE_REFS, {
      kidProfileId: args.kidProfileId,
      userId: kidProfile.userId,
      query: trimmedQuery,
      contentStrictness: kidProfile.contentStrictness,
      blockedTopics: kidProfile.blockedTopics || [],
      allowedTopics: kidProfile.allowedTopics || [],
      surface: "search",
      openaiApiKey: process.env.OPENAI_API_KEY,
    });

    if (!gate.allowed) {
      return {
        safe: false,
        results: [],
        summary: gate.message,
        flagged: gate.alerted,
        blocked: true,
        reason: gate.reason,
        images: [],
        intentCategory: gate.category,
      };
    }

    const sanitized = gate.sanitized;
    const intent = gate.intent;

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

    // Time limits. Expanding a section is more kid-facing AI content, so it has
    // to sit behind the same gate as a search — otherwise a kid at their cap
    // could keep pulling new material out of an answer that's already on screen.
    const expandCheck = await ctx.runQuery(api.timeLimits.canSearch, {
      kidProfileId: args.kidProfileId,
    });
    if (!expandCheck.canSearch) {
      return {
        content: expandCheck.reason === "paused"
          ? "Search is paused right now. Ask your parent."
          : expandCheck.reason === "outside_hours"
          ? "Search time is over for now. Come back during allowed hours!"
          : expandCheck.reason === "family_limit_reached"
          ? "That's all your screen time for today. Come back tomorrow!"
          : "You've reached your search limit for today. Come back tomorrow!",
      };
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

    // --- Cache -------------------------------------------------------------
    // Every "Read more" used to be an uncached ~1,000-token call, so two kids
    // in the same family expanding the same section of the same answer paid
    // twice, and so did the same kid tapping back into it. The deep dive
    // depends only on topic, subtopic and how the child reads.
    const expandCacheKey = `expand::${normalizeQuery(sanitizedTopic)}::${normalizeQuery(sanitizedSubtopic)}`;
    const expandProfileKey = `${age}:${lexile}:${accessibilityNeeds.slice().sort().join(",")}`;
    const expandAgeGroup = getAgeGroup(age);
    const expandStrictness = kidProfile.contentStrictness || "moderate";

    const cachedExpand = await ctx.runQuery(api.searchCache.checkCache, {
      normalizedQuery: expandCacheKey,
      ageGroup: expandAgeGroup,
      strictness: expandStrictness,
      profileKey: expandProfileKey,
    });
    if (cachedExpand) {
      await ctx.runMutation(internal.searchCache.incrementCacheReuse, {
        cacheId: cachedExpand.cacheId,
      });
      return { content: cachedExpand.response };
    }

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

    try {
      await ctx.runMutation(internal.searchCache.writeCache, {
        normalizedQuery: expandCacheKey,
        ageGroup: expandAgeGroup,
        strictness: expandStrictness,
        profileKey: expandProfileKey,
        response: cleanedContent,
      });
    } catch (err) {
      // A cache miss forever is cheaper than a failed expand.
      console.warn("[expandSection] cache write failed:", err);
    }

    return { content: cleanedContent };
  },
});
