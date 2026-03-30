"use node";

import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Common kid searches to pre-cache
const POPULAR_SEARCHES = [
  "dinosaurs",
  "solar system",
  "volcanoes",
  "how do planes fly",
  "why is the sky blue",
  "how do rainbows form",
  "what are black holes",
  "how do earthquakes happen",
  "what is photosynthesis",
  "how does the heart work",
  "what are the planets",
  "how do magnets work",
  "what is gravity",
  "how do tornadoes form",
  "what is the water cycle",
  "how do animals hibernate",
  "what is electricity",
  "how are mountains formed",
  "what are constellations",
  "how do submarines work",
  "what is DNA",
  "how do bees make honey",
  "what causes thunder and lightning",
  "how do rockets work",
  "what is the food chain",
  "how do chameleons change color",
  "what is the moon made of",
  "how do bridges work",
  "what are fossils",
  "how does the internet work",
];

// Stop words (same as search.ts)
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

/**
 * Pre-populate the search cache with common kid searches.
 * Uses a generic profile: age 10, moderate strictness, auto reading level.
 */
export const warmPopularSearches = internalAction({
  handler: async (ctx) => {
    const ageMin = 8;
    const ageMax = 12;
    const ageGroup = "10-12";
    const strictness = "moderate";
    const profileKey = [ageGroup, strictness, "auto"].join("|");

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    let cached = 0;
    let skipped = 0;
    let failed = 0;

    for (const query of POPULAR_SEARCHES) {
      const normalized = normalizeQuery(query);

      // Check if already cached
      const existing = await ctx.runQuery(api.searchCache.checkCache, {
        normalizedQuery: normalized,
        ageGroup,
        strictness,
        profileKey,
      });

      if (existing) {
        skipped++;
        continue;
      }

      try {
        // Fetch Wikipedia context
        let wikiContext: any = null;
        try {
          wikiContext = await ctx.runAction(internal.wikipedia.fetchWikipediaContent, {
            query,
            ageGroup,
          });
        } catch {
          // Wikipedia optional
        }

        let wikiSection = "";
        if (wikiContext) {
          wikiSection = `
REFERENCE INFORMATION (from Wikipedia):
Title: ${wikiContext.title}
Summary: ${wikiContext.summary}
Content: ${wikiContext.extract}
Use this reference to ground your answer in facts. Rephrase kid-friendly.`;
        }

        const systemPrompt = `You are SafeStudy, a friendly AI tutor for kids aged ${ageMin}-${ageMax}. Content strictness: ${strictness}.
${wikiSection}

RULES:
- Answer directly. No URLs, no markdown formatting (plain text only).
- "answer": SHORT 2-3 sentence overview. Details go in "sections" array.
- Fun facts go in funFacts array.
- Include a Mermaid diagram (graph TD, emojis, 4-8 nodes) for processes/cycles/systems. null for simple facts.
${wikiContext ? "- Use the Wikipedia reference as primary source. Rephrase kid-friendly." : ""}

RESPOND WITH VALID JSON ONLY:
{"safe":boolean,"answer":"...","sections":[{"heading":"...","content":"..."}],"funFacts":["..."],"relatedQuestions":["..."],"diagram":"mermaid code or null","flagged":boolean,"flagReason":"...or null"}`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
            temperature: 0,
            max_tokens: 800,
          }),
        });

        if (!response.ok) {
          console.error(`[warmCache] OpenAI error for "${query}": ${response.status}`);
          failed++;
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          failed++;
          continue;
        }

        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);

        // Build images from Wikipedia context
        const images: Array<{ url: string; title: string; source: string; width?: number; height?: number }> = [];
        if (wikiContext?.images) {
          for (const img of wikiContext.images.slice(0, 4)) {
            images.push({ url: img.url, title: wikiContext.title || "", source: "wikipedia", width: img.width, height: img.height });
          }
        }
        if (images.length < 4 && wikiContext?.thumbnail) {
          if (!images.some((img) => img.url === wikiContext.thumbnail)) {
            images.push({ url: wikiContext.thumbnail, title: wikiContext.title || "", source: "wikipedia" });
          }
        }

        const finalResponse = {
          safe: true,
          answer: parsed.answer || "",
          sections: parsed.sections || [],
          funFacts: parsed.funFacts || [],
          relatedQuestions: parsed.relatedQuestions || [],
          diagram: parsed.diagram || null,
          flagged: false,
          images,
          wikiSource: wikiContext
            ? { title: wikiContext.title, source: wikiContext.source, pageUrl: wikiContext.pageUrl }
            : undefined,
        };

        // Write to cache
        await ctx.runMutation(internal.searchCache.writeCache, {
          normalizedQuery: normalized,
          ageGroup,
          strictness,
          profileKey,
          response: JSON.stringify(finalResponse),
        });

        cached++;
        console.log(`[warmCache] Cached: "${query}"`);
      } catch (err) {
        console.error(`[warmCache] Failed for "${query}":`, err);
        failed++;
      }
    }

    const summary = `Warm cache complete: ${cached} cached, ${skipped} already cached, ${failed} failed`;
    console.log(`[warmCache] ${summary}`);
    return { cached, skipped, failed, total: POPULAR_SEARCHES.length };
  },
});
