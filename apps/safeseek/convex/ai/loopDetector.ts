/**
 * Repetition / fuzzy-loop detector.
 *
 * Catches the synonym-shuffling pattern Bella (and tweens generally) use to
 * skirt content blocks: "yellow silhouette girl aesthetic callage pintrest"
 * → "blue silhouette girl aesthetic callage pintrest" → "red ..." etc. 30
 * near-identical queries in 90 minutes is doom-scrolling, not learning.
 *
 * Pure function — call from a Convex action with the kid's recent query strings.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "is", "are", "was", "were", "be", "been", "do", "does", "did", "what", "who",
  "where", "when", "why", "how", "with", "from", "by", "as", "this", "that",
  "i", "me", "my", "you", "your", "it", "its", "some", "any",
]);

const COLOR_WORDS = new Set([
  "red", "orange", "yellow", "green", "blue", "purple", "pink", "black", "white",
  "gray", "grey", "brown", "tan", "beige", "gold", "silver", "perple", "oronge",
  "cherry", "chocolate", "blond", "blonde", "dark", "light",
]);

/**
 * Normalize a query for fuzzy comparison: lowercase, strip punctuation,
 * remove stop words, sort tokens, drop one color word (so "red X" and
 * "blue X" hash to the same key).
 */
export function normalizeForLoop(query: string): string {
  return normalizeTokens(query).sort().join(" ");
}

/**
 * Shared tokenizer: lowercase, strip punctuation, drop stop words and colors,
 * and singularize. The singular/plural fold matters — "legs workouts for
 * women" and "leg workouts for women" are the same question, and treating
 * them as different is exactly how a block gets walked around in one retry.
 */
export function normalizeTokens(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  // Drop ALL color tokens — color rotation is the dominant variation pattern
  const noColors = tokens.filter((t) => !COLOR_WORDS.has(t));

  return noColors.map(singularize);
}

/** Crude but sufficient English singularizer for query folding. */
function singularize(t: string): string {
  if (t.length <= 3) return t;
  if (t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.endsWith("ses") || t.endsWith("xes") || t.endsWith("zes")) return t.slice(0, -2);
  if (t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us")) return t.slice(0, -1);
  return t;
}

/**
 * Jaccard overlap between two queries' content tokens (0..1).
 *
 * Used by the concern-rephrase guard in search.ts. A straight normalized-key
 * equality check is not enough: after "what is a healthy diet for women weight
 * loss" is blocked, "what is a healthy diet for women" is a *different* key but
 * plainly the same attempt, 30 seconds later.
 */
export function queryOverlap(a: string, b: string): number {
  const setA = new Set(normalizeTokens(a));
  const setB = new Set(normalizeTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  return shared / new Set([...setA, ...setB]).size;
}

/**
 * Minimum overlap with a recently concern-blocked query for a new query to be
 * treated as a rephrase of it.
 *
 * Deliberately not 1.0 and deliberately not low. At 0.5, "what is a healthy
 * diet for women" (overlap 0.6 with the blocked weight-loss query) is caught,
 * while the genuinely broader "what is a healthy diet" (overlap 0.4) still
 * gets a real answer. A kid should be able to learn what a healthy diet is;
 * she should not be able to keep drilling toward weight loss one word at a time.
 */
export const CONCERN_REPHRASE_OVERLAP = 0.5;

/**
 * Decide whether the new query is part of a repetitive loop.
 *
 * Logic: if normalized form matches >= threshold of recent queries within
 * the time window, it's a loop. Defaults: 4 matches in 30 minutes.
 */
export function isLoop(
  newQuery: string,
  recentQueries: { query: string; searchedAt: number }[],
  opts: { threshold?: number; windowMs?: number } = {}
): { loop: boolean; matchCount: number; sample: string[] } {
  const threshold = opts.threshold ?? 4;
  const windowMs = opts.windowMs ?? 30 * 60 * 1000;
  const now = Date.now();

  const newKey = normalizeForLoop(newQuery);
  if (!newKey) return { loop: false, matchCount: 0, sample: [] };

  const inWindow = recentQueries.filter((r) => now - r.searchedAt <= windowMs);
  const matches = inWindow.filter((r) => normalizeForLoop(r.query) === newKey);

  return {
    loop: matches.length >= threshold,
    matchCount: matches.length,
    sample: matches.slice(0, 3).map((m) => m.query),
  };
}

export function loopMessage(): string {
  return "Looks like you've searched for this a lot already. Try something totally different — what's a brand new question you've never asked?";
}
