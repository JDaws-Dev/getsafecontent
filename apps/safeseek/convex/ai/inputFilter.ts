/**
 * AI Input Filter — Pre-filters kid queries before sending to OpenAI.
 * Detects prompt injection attempts and sanitizes input.
 *
 * These are plain functions (not Convex functions) called within actions.
 */

// --- Sanitization ---

/**
 * Strips control characters, excessive whitespace, and known injection patterns.
 * Returns a cleaned version of the query safe to pass to the AI.
 */
export function sanitizeQuery(query: string): string {
  let cleaned = query;

  // Strip control characters (keep newlines and tabs for now, strip the rest)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Strip zero-width characters and other unicode tricks
  cleaned = cleaned.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, "");

  // Collapse excessive whitespace (more than 2 consecutive newlines, or long spaces)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]{4,}/g, "   ");

  // Strip markdown/HTML-like role markers that could confuse the model
  cleaned = cleaned.replace(/^(system|assistant|user)\s*:/gim, "");

  // Strip attempts to inject XML-like tags (e.g., <|system|>, [INST], <<SYS>>)
  cleaned = cleaned.replace(/<\|[^|]*\|>/g, "");
  cleaned = cleaned.replace(/\[\/?(INST|SYS)\]/gi, "");
  cleaned = cleaned.replace(/<<\/?SYS>>/gi, "");

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

// --- Injection Detection ---

type InjectionResult = {
  safe: boolean;
  reason?: string;
};

/**
 * Patterns that indicate prompt injection attempts.
 * Each entry: [regex, reason string]
 */
const INJECTION_PATTERNS: Array<[RegExp, string]> = [
  // Direct instruction override attempts
  [
    /ignore\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|rules?|prompts?|guidelines?|restrictions?|directions?|programming)/i,
    "Attempted to override system instructions",
  ],
  [
    /disregard\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|rules?|prompts?)/i,
    "Attempted to disregard instructions",
  ],
  [
    /forget\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|rules?|prompts?)/i,
    "Attempted to reset instructions",
  ],
  [
    /override\s+(all\s+)?(previous|prior|above|earlier|your|safety|content)\s+(instructions?|rules?|filters?|restrictions?)/i,
    "Attempted to override safety filters",
  ],

  // Role-play / identity manipulation
  [
    /you\s+are\s+now\s+(a|an|the|my)\s/i,
    "Attempted identity manipulation",
  ],
  [
    /pretend\s+(you\s+are|to\s+be|you're)\s/i,
    "Attempted role-play manipulation",
  ],
  [
    /act\s+as\s+(a|an|the|if\s+you\s+(are|were))\s/i,
    "Attempted role-play manipulation",
  ],
  [
    /from\s+now\s+on\s+(you\s+are|you're|act\s+as|pretend|behave)/i,
    "Attempted identity change",
  ],
  [
    /i\s+want\s+you\s+to\s+(act|pretend|behave|role.?play|be)\s/i,
    "Attempted role assignment",
  ],
  [
    /let'?s\s+play\s+a\s+game\s+where\s+you\s+(are|pretend|act)/i,
    "Attempted role-play via game framing",
  ],

  // System prompt extraction
  [
    /(show|reveal|display|print|output|repeat|tell\s+me|what\s+(is|are))\s+(your|the)\s+(system\s+prompt|instructions?|rules?|initial\s+prompt|hidden\s+prompt|secret\s+prompt|original\s+prompt)/i,
    "Attempted system prompt extraction",
  ],
  [
    /what\s+(were|are)\s+you\s+(told|instructed|programmed)\s+to\s+do/i,
    "Attempted system prompt extraction",
  ],

  // Known jailbreak keywords
  [
    /\b(DAN|do\s+anything\s+now)\b/i,
    "Known jailbreak attempt (DAN)",
  ],
  [
    /\bjailbreak\b/i,
    "Jailbreak keyword detected",
  ],
  [
    /\bdevil'?s?\s+advocate\b/i,
    "Attempted filter bypass via devil's advocate framing",
  ],
  [
    /\bunfiltered\s+(mode|response|answer|version)\b/i,
    "Attempted to request unfiltered content",
  ],
  [
    /\b(evil|chaos|unrestricted|uncensored)\s+(mode|version|persona)\b/i,
    "Attempted to activate restricted mode",
  ],

  // Role marker injection
  [
    /^(system|assistant)\s*:/im,
    "Attempted role marker injection",
  ],
  [
    /<\|[^|]*\|>/,
    "Attempted special token injection",
  ],
  [
    /\[\/?(INST|SYS)\]/i,
    "Attempted instruction tag injection",
  ],
  [
    /<<\/?SYS>>/i,
    "Attempted system tag injection",
  ],

  // Base64 encoded content (suspicious in a kid search)
  [
    /^[A-Za-z0-9+/]{40,}={0,2}$/,
    "Suspicious base64 encoded content",
  ],

  // Excessive repetition of bypass phrases
  [
    /(.{10,})\1{3,}/,
    "Excessive repetition detected",
  ],

  // Attempts to manipulate via hypothetical framing
  [
    /\b(hypothetically|theoretically|in\s+a\s+fictional\s+world|for\s+a\s+story|for\s+fiction|for\s+research)\b.{0,30}\b(how\s+to|make|create|build|hack|bypass|break|steal|kill|weapon|bomb|drug|exploit)\b/i,
    "Attempted filter bypass via hypothetical framing",
  ],

  // "New conversation" / context reset tricks
  [
    /\b(new\s+conversation|start\s+over|reset\s+context|clear\s+history|new\s+session)\b/i,
    "Attempted context reset",
  ],

  // Token smuggling / delimiter manipulation
  [
    /\bplease\s+respond\s+with(out)?\s+(any\s+)?(safety|content|ethical)\s+(filters?|checks?|guidelines?|restrictions?)/i,
    "Attempted to disable safety filters",
  ],
];

/**
 * Checks a query for prompt injection patterns.
 * Returns { safe: true } if clean, or { safe: false, reason } if injection detected.
 */
export function detectPromptInjection(query: string): InjectionResult {
  // Normalize for detection (but don't modify the actual query)
  const normalized = query.toLowerCase().trim();

  // Empty or very short queries are safe (but useless — handled elsewhere)
  if (normalized.length < 3) {
    return { safe: true };
  }

  // Check each pattern
  for (const [pattern, reason] of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return { safe: false, reason };
    }
  }

  // Check for suspiciously long queries (kids don't write essays as search queries)
  if (query.length > 1000) {
    return { safe: false, reason: "Query exceeds maximum length" };
  }

  // Check for high ratio of special characters (potential encoding attacks)
  const specialCount = (query.match(/[^a-zA-Z0-9\s.,!?'"()-]/g) || []).length;
  const totalChars = query.length;
  if (totalChars > 20 && specialCount / totalChars > 0.4) {
    return { safe: false, reason: "Suspicious character ratio" };
  }

  return { safe: true };
}

// --- Response Filtering ---

type ResponseFilterResult = {
  safe: boolean;
  reason?: string;
  cleaned?: string;
};

// URL patterns to detect in AI responses
const URL_PATTERN = /https?:\/\/[^\s)<>]+|www\.[^\s)<>]+|\b[\w-]+\.(com|org|net|edu|gov|io|co)\b(\/[^\s)<>]*)?/gi;

// Patterns that should never appear in kid-facing responses
const UNSAFE_RESPONSE_PATTERNS: Array<[RegExp, string]> = [
  [URL_PATTERN, "Response contains URLs"],
  [/\b(suicide|self.?harm|cutting\s+yourself)\b/i, "Response contains self-harm content"],
  [/\b(porn|pornograph|xxx|nsfw)\b/i, "Response contains adult content references"],
  [/\bhow\s+to\s+(make|build|create)\s+(a\s+)?(bomb|explosive|weapon|gun|knife)\b/i, "Response contains dangerous instructions"],
  [/\b(buy|purchase|order)\s+(drugs?|weed|cocaine|heroin|meth)\b/i, "Response contains drug purchase information"],
];

/**
 * Filters AI responses to ensure they don't contain unsafe content.
 * Checks for URLs, inappropriate content, and blocked topic violations.
 *
 * @param response - The AI-generated response text
 * @param blockedTopics - The kid's blocked topics list from their profile
 * @returns FilterResult with safe status and optionally cleaned text
 */
export function filterResponse(
  response: string,
  blockedTopics: string[] = []
): ResponseFilterResult {
  // Check for hardcoded unsafe patterns
  for (const [pattern, reason] of UNSAFE_RESPONSE_PATTERNS) {
    if (pattern.test(response)) {
      // For URLs, try to clean them out rather than blocking entirely
      if (reason === "Response contains URLs") {
        const cleaned = response.replace(URL_PATTERN, "[link removed]");
        return { safe: true, reason: "URLs removed from response", cleaned };
      }
      return { safe: false, reason };
    }
  }

  // Check for blocked topics in the response
  if (blockedTopics.length > 0) {
    const responseLower = response.toLowerCase();
    for (const topic of blockedTopics) {
      const topicLower = topic.toLowerCase().trim();
      if (topicLower.length < 2) continue;

      // Use word boundary matching to avoid false positives
      // e.g., "war" shouldn't match "warm" or "software"
      const wordBoundaryPattern = new RegExp(`\\b${escapeRegex(topicLower)}\\b`, "i");
      if (wordBoundaryPattern.test(responseLower)) {
        return {
          safe: false,
          reason: `Response contains blocked topic: ${topic}`,
        };
      }
    }
  }

  return { safe: true };
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
