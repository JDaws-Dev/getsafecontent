/**
 * Shared utility functions for SafeStudy backend.
 *
 * NOTE: This file must NOT use "use node" so it can be imported from both
 * node-runtime actions and regular queries/mutations. Only pure JS here.
 */

export const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "how", "why",
  "who", "where", "when", "do", "does", "did", "can", "could", "will",
  "would", "should", "tell", "me", "about", "please",
]);

/**
 * Normalize a search query for cache lookups:
 * lowercase, trim, remove punctuation, remove stop words, sort words alphabetically.
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
    .sort()
    .join(" ");
}
