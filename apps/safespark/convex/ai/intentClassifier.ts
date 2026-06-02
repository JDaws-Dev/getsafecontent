/**
 * SafeSpark intent classifier — focused on always-escalate categories.
 *
 * Ported 2026-05-29 from `apps/safeseek/convex/ai/intentClassifier.ts`.
 * SafeSpark's threat surface is narrower than SafeStudy's (the kid asks
 * Spark to BUILD things, not to SEARCH), so we only need the two
 * always-escalate categories here. Aesthetic / appearance / celebrity
 * gossip aren't relevant for an AI maker — those route to SafeStudy.
 *
 * Categories:
 *   - self_harm_adjacent   → escalate (parent email + dashboard alert)
 *   - eating_disorder_adjacent → escalate
 *   - other                → pass through to the normal build flow
 *
 * Cheap pre-filter regex catches the obvious patterns without an API
 * call. LLM fallback (gpt-4o-mini, ~$0.0002/call) covers the rest.
 * Fail-open on classifier errors — never punish a kid because OpenAI 5xx.
 */

export type IntentCategory =
  | 'self_harm_adjacent'
  | 'eating_disorder_adjacent'
  | 'other';

export type IntentResult = {
  category: IntentCategory;
  confidence: number;
  rationale: string;
};

export const ALWAYS_ESCALATE_CATEGORIES: IntentCategory[] = [
  'self_harm_adjacent',
  'eating_disorder_adjacent',
];

const CATEGORY_LIST: IntentCategory[] = [
  'self_harm_adjacent',
  'eating_disorder_adjacent',
  'other',
];

/**
 * Fast regex pre-filter — catches the obvious patterns without an LLM
 * call. Returns null if uncertain (defer to LLM).
 */
function fastClassify(query: string): IntentResult | null {
  const q = query.toLowerCase().trim();

  // Self-harm / suicide signals — broad enough to catch indirect
  // phrasings ("I don't want to be here anymore", "ways to end it").
  if (
    /\b(kill myself|end (it|my life|things)|don'?t want to (be here|live|exist))\b/.test(q) ||
    /\b(cut (myself|deep|me)|self ?harm|hurt myself|hurt me)\b/.test(q) ||
    /\b(suicide (method|notes?|plan)|how to (die|kms))\b/.test(q) ||
    /\b(want to die|i wish i was dead|nobody would miss me)\b/.test(q)
  ) {
    return {
      category: 'self_harm_adjacent',
      confidence: 0.95,
      rationale: 'Self-harm or suicide signal — escalate immediately.',
    };
  }

  // ED-adjacent — restrictive eating, weight-loss obsession, pro-ana/mia.
  if (
    /\b(thinspo|pro ?ana|pro ?mia|skinny check|thigh gap|bonespo)\b/.test(q) ||
    /\b(how to (not eat|skip meals|starve|fast for|stop eating))\b/.test(q) ||
    /\b(lose \d+ ?lbs? (fast|quick|in a week|in days))\b/.test(q) ||
    /\bhow (many|few) calories.{0,30}(lose|skip|skinny|tiny|small)\b/.test(q) ||
    /\b(diary|tracker|app) (to|for) (count|cut|skip|restrict).{0,15}(calor|food|meal)/.test(q)
  ) {
    return {
      category: 'eating_disorder_adjacent',
      confidence: 0.9,
      rationale: 'Eating-disorder-adjacent query — escalate to parent.',
    };
  }

  return null;
}

/**
 * LLM fallback for queries the fast filter doesn't catch. gpt-4o-mini
 * with JSON-object response format. Fail-open: returns `other` with
 * confidence 0 on any failure so a classifier outage never blocks a
 * kid from building.
 */
async function llmClassify(query: string, apiKey: string): Promise<IntentResult> {
  const fallback: IntentResult = {
    category: 'other',
    confidence: 0,
    rationale: 'Classifier unavailable.',
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 120,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You classify prompts from kids ages 9-15 on an AI building tool (SafeSpark). Pick exactly ONE category and reply ONLY in JSON: {"category": "...", "confidence": 0.0-1.0, "rationale": "one short sentence"}.

Categories:
- self_harm_adjacent: ANY signal of suicide, self-harm, wanting to die, wanting to disappear, hopelessness phrased as harm to self. Includes coded language ("i don't want to be here", "nobody would miss me", "permanent solution"). Includes building "diary" / "vent app" / "journal" projects whose TONE in the prompt suggests self-harm distress, even if the project itself is benign.
- eating_disorder_adjacent: ANY restrictive-eating, pro-ED, body-image-via-starvation signal. Includes "thinspo", "ana", "mia", "skinny check", "calorie tracker to lose weight fast", "how to skip meals", "fasting for X days". Building a "calorie counter" or "weight tracker" project IS this category if the framing implies extreme weight loss; a neutral nutrition tracker for a school project is NOT.
- other: everything else — including normal sad/angry/frustrated kid statements, normal weight-loss curiosity, normal food tracking, normal dark game themes (zombie shooters, horror, etc).

Important: be DECISIVE on confidence — 0.8+ when clear, 0.4-0.7 when borderline, 0.0-0.3 when probably other. False positives are tolerable (parent gets a heads-up); false negatives on the two escalate categories are NOT tolerable. When in doubt on these two, escalate.`,
          },
          {
            role: 'user',
            content: query.slice(0, 400),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[safespark intentClassifier] LLM error ${response.status}`);
      return fallback;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return fallback;

    const parsed = JSON.parse(text) as Partial<IntentResult>;
    const category =
      typeof parsed.category === 'string' && (CATEGORY_LIST as string[]).includes(parsed.category)
        ? (parsed.category as IntentCategory)
        : 'other';
    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;
    const rationale =
      typeof parsed.rationale === 'string' ? parsed.rationale.slice(0, 200) : '';

    return { category, confidence, rationale };
  } catch (err) {
    console.warn('[safespark intentClassifier] threw:', err);
    return fallback;
  }
}

/**
 * Public entry: classify a kid's prompt. Pre-filter first, then LLM.
 * Caller (the /api/demo route) decides what to do with the result —
 * typically: if category in ALWAYS_ESCALATE_CATEGORIES, refuse the
 * build, return helpline text, schedule a parent email + dashboard
 * alert.
 */
export async function classifyIntent(
  query: string,
  apiKey: string | undefined,
): Promise<IntentResult> {
  const fast = fastClassify(query);
  if (fast) return fast;
  if (!apiKey) {
    return { category: 'other', confidence: 0, rationale: 'No API key.' };
  }
  return await llmClassify(query, apiKey);
}
