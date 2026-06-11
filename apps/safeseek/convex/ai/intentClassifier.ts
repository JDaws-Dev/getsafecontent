/**
 * Intent Classifier — categorizes a kid's query before search runs.
 *
 * Plain function (not a Convex function) called from within actions that
 * already have OPENAI_API_KEY in their env.
 *
 * Why this exists: keyword/topic blocklists can't keep up with synonym-shuffling
 * (e.g., "yellow silhouette girl aesthetic callage pintrest" → "blue silhouette
 * girl aesthetic callage pintrest"). An intent classifier looks at *what the
 * kid is actually trying to do*, which generalizes across spellings.
 */

export type IntentCategory =
  | "study" // Homework, school topic, factual lookup with learning intent
  | "curiosity" // Open-ended "why/how" exploration
  | "aesthetic_browsing" // Mood-board / Pinterest-style image browsing
  | "self_image" // Appearance comparison, "am I pretty," face shape, body
  | "appearance" // Hair/makeup/fashion — neutral when curious, watch when obsessive
  | "celebrity_gossip" // Celebrity personal life beyond their work
  | "eating_disorder_adjacent" // ED-adjacent: extreme weight loss, restriction
  | "self_harm_adjacent" // Self-harm signals
  | "other";

export type IntentResult = {
  category: IntentCategory;
  confidence: number; // 0..1
  rationale: string; // one sentence — for parent dashboard
  // True when the LLM gate was unavailable (no key / API error) and the
  // query passed with regex-only screening. The always-escalate ED and
  // self-harm alerts can't fire from the LLM path while degraded — callers
  // should surface this to the operator (see opsAlerts.ts).
  degraded?: boolean;
};

const CATEGORY_LIST: IntentCategory[] = [
  "study",
  "curiosity",
  "aesthetic_browsing",
  "self_image",
  "appearance",
  "celebrity_gossip",
  "eating_disorder_adjacent",
  "self_harm_adjacent",
  "other",
];

/**
 * Cheap pre-filter: catches obvious patterns without an API call.
 * Returns null if uncertain (defer to LLM).
 */
function fastClassify(query: string): IntentResult | null {
  const q = query.toLowerCase().trim();

  // Aesthetic browsing — fuzzy on misspellings
  // pintrest, pinterest, callage, colage, calage, collage
  const pinterestRe = /pintrest|pinterest|p[iy]nterest/;
  const collageRe = /\bc[oa]l+a?g[ea]?\b/;
  const aestheticRe = /\baest?h?et[hi]?[dc]?[ck]?\b|\basthedic\b|\bastedic\b|\basstedic\b|\basstedic\b/;
  if (pinterestRe.test(q) || collageRe.test(q) || aestheticRe.test(q)) {
    if (q.includes("inspo") || /inspir/.test(q) || /\bgirl\b|\bbaddie\b|\bsilhouette\b|\bshilouette\b|\bsihloh|\bshilohet/.test(q)) {
      return {
        category: "aesthetic_browsing",
        confidence: 0.92,
        rationale: "Pinterest-style aesthetic/collage browsing query.",
      };
    }
  }

  // Self-image cluster
  if (/\b(am i|how can i be) (pretty|prettier|attractive|more attractive|more pretty|hot)\b/.test(q)) {
    return {
      category: "self_image",
      confidence: 0.95,
      rationale: "Direct appearance self-comparison.",
    };
  }
  if (/\b(my )?face (shape|card)\b|\bface card for hum/.test(q)) {
    return {
      category: "self_image",
      confidence: 0.85,
      rationale: "Appearance self-evaluation (face shape/face card).",
    };
  }

  // ED-adjacent
  if (
    /\b(thinspo|pro ?ana|pro ?mia|skinny check|legs|thigh gap)\b/.test(q) ||
    /(disorder.{0,15}eat|eat.{0,15}disorder)/.test(q) ||
    /\b(stop eating|eat (less|nothing)|how to (not eat|skip meals|lose \d+ lbs? (fast|quick)))\b/.test(q) ||
    /\bhow (many|few) calories.{0,30}(lose|skip|skinny)\b/.test(q)
  ) {
    return {
      category: "eating_disorder_adjacent",
      confidence: 0.9,
      rationale: "Eating-disorder-adjacent query — escalate to parent.",
    };
  }

  // Self-harm
  if (/\b(kill myself|end (it|my life)|cut (myself|deep)|self ?harm|hurt myself|suicide method)\b/.test(q)) {
    return {
      category: "self_harm_adjacent",
      confidence: 0.95,
      rationale: "Self-harm signal — escalate immediately.",
    };
  }

  return null;
}

/**
 * LLM-based fallback classifier. Uses gpt-4o-mini for cost (~$0.0002/query).
 *
 * Returns "other" with low confidence if anything goes wrong — fail open,
 * never block a kid because the classifier is down.
 */
async function llmClassify(query: string, apiKey: string): Promise<IntentResult> {
  const fallback: IntentResult = {
    category: "other",
    confidence: 0,
    rationale: "Classifier unavailable.",
    degraded: true,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You classify search queries from kids ages 4-18 on a safe-search learning tool. Pick exactly one category and reply ONLY in JSON: {"category": "...", "confidence": 0.0-1.0, "rationale": "one short sentence"}.

Categories:
- study: homework, school subjects, factual learning lookups (math, history, science definitions, vocabulary)
- curiosity: open "why/how" exploration ("why do volcanoes erupt", "how do airplanes fly", "what are black holes")
- aesthetic_browsing: mood-board / Pinterest-style image collage browsing — visual inspiration boards, "X color aesthetic", "silhouette aesthetic", "baddie aesthetic", "mafia boss aesthetic", any "aesthetic + collage/pintrest" combo even with misspellings
- self_image: appearance self-comparison ("how can I be prettier", "what is my face shape", "am I pretty", "face card", attractiveness self-eval)
- appearance: neutral curiosity about hair/makeup/fashion ("what is balayage", "chocolate brown hair", "outfits for teens") — repeated obsessively over time still gets this label
- celebrity_gossip: celebrity personal life beyond their public work (children, relationships, scandals, "who is X dating")
- eating_disorder_adjacent: ED signals — restrictive eating, weight-loss obsession, thinspo, calorie counting tied to skinniness, "disorder when someone eats too much"
- self_harm_adjacent: any self-harm or suicide-related query
- other: doesn't fit above — generic searches, random, names, places, travel

Important: when the query has aesthetic/collage/pintrest/asthedic spelling variations + a color + silhouette/girl/baddie, it is aesthetic_browsing. When the query asks about the searcher's own attractiveness, face, body, weight — it is self_image. Be decisive on confidence: 0.7+ when clear, 0.4-0.6 when borderline.`,
          },
          {
            role: "user",
            content: query.slice(0, 200),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[intentClassifier] LLM error ${response.status}`);
      return fallback;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return fallback;

    const parsed = JSON.parse(text);
    const category = CATEGORY_LIST.includes(parsed.category) ? parsed.category : "other";
    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
    const rationale = typeof parsed.rationale === "string" ? parsed.rationale.slice(0, 200) : "";

    return { category, confidence, rationale };
  } catch (err) {
    console.warn(`[intentClassifier] threw:`, err);
    return fallback;
  }
}

/**
 * Public entry: classify a query. Tries fast pre-filter first, then LLM.
 */
export async function classifyIntent(
  query: string,
  apiKey: string | undefined
): Promise<IntentResult> {
  const fast = fastClassify(query);
  if (fast) return fast;

  if (!apiKey) {
    return { category: "other", confidence: 0, rationale: "No API key.", degraded: true };
  }

  return await llmClassify(query, apiKey);
}

/**
 * Decide whether a category should block, given the kid's content strictness
 * and explicit blockedTopics list.
 *
 * - strict: blocks aesthetic_browsing, self_image, appearance, celebrity_gossip
 *   (and always: eating_disorder_adjacent, self_harm_adjacent — those route to alert)
 * - moderate: blocks aesthetic_browsing, self_image
 *   (appearance allowed unless explicitly in blockedTopics)
 * - light: only blocks based on explicit blockedTopics
 *
 * Always escalates eating_disorder_adjacent and self_harm_adjacent.
 */
export function shouldBlockCategory(
  category: IntentCategory,
  strictness: string,
  blockedTopics: string[],
  confidence: number
): { block: boolean; reason: string; alert: boolean } {
  // Always-escalate categories — never silently block, always alert parent
  if (category === "self_harm_adjacent") {
    return { block: true, reason: "self_harm_signal", alert: true };
  }
  if (category === "eating_disorder_adjacent") {
    return { block: true, reason: "eating_disorder_signal", alert: true };
  }

  // Low confidence → don't block on intent alone
  if (confidence < 0.6) {
    return { block: false, reason: "", alert: false };
  }

  // Explicit topic blocklist
  const topicMatch = blockedTopics.some((t) => {
    const norm = t.toLowerCase().replace(/[-_\s]/g, "");
    if (norm === "selfimage" && category === "self_image") return true;
    if (norm === "appearance" && (category === "appearance" || category === "self_image")) return true;
    if ((norm === "aestheticbrowsing" || norm === "aesthetic") && category === "aesthetic_browsing") return true;
    if ((norm === "celebritygossip" || norm === "celebrities") && category === "celebrity_gossip") return true;
    return false;
  });
  if (topicMatch) {
    return { block: true, reason: `topic_${category}`, alert: false };
  }

  // Strictness-based defaults
  if (strictness === "strict") {
    if (
      category === "aesthetic_browsing" ||
      category === "self_image" ||
      category === "appearance" ||
      category === "celebrity_gossip"
    ) {
      return { block: true, reason: `strict_${category}`, alert: false };
    }
  }
  if (strictness === "moderate") {
    if (category === "aesthetic_browsing" || category === "self_image") {
      return { block: true, reason: `moderate_${category}`, alert: false };
    }
  }

  return { block: false, reason: "", alert: false };
}

/**
 * Kid-facing redirect message for blocked categories. Friendly, not punitive.
 */
export function redirectMessage(category: IntentCategory): string {
  switch (category) {
    case "aesthetic_browsing":
      return "SafeStudy isn't a mood-board tool. Try asking a question you're curious about — like how something works or why something happens!";
    case "self_image":
      return "You're awesome just as you are. Want to learn about something cool instead? Try asking about an animal, a place, or how something works.";
    case "appearance":
      return "Let's pick a different topic to explore today. What are you curious about?";
    case "celebrity_gossip":
      return "Try asking about something a celebrity does (their music, movies, sports) instead of their personal life.";
    case "eating_disorder_adjacent":
      return "Some questions are best to ask a parent or trusted adult. Please talk to someone you trust.";
    case "self_harm_adjacent":
      return "Please talk to a parent or trusted adult right away. You can also call or text 988 anytime — they're there to help.";
    default:
      return "Let's try a different topic.";
  }
}
