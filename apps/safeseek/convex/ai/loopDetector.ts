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
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  // Drop ALL color tokens — color rotation is the dominant variation pattern
  const noColors = tokens.filter((t) => !COLOR_WORDS.has(t));

  return noColors.sort().join(" ");
}

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
