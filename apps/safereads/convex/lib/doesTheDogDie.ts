/**
 * DoesTheDogDie.com API integration.
 * Fetches crowdsourced trigger warnings for books.
 *
 * API docs: https://www.doesthedogdie.com/api
 */

const BASE_URL = "https://www.doesthedogdie.com";

interface DddSearchItem {
  id: number;
  name: string;
  releaseYear?: string;
  genreId?: number;
  overview?: string;
}

interface DddSearchResponse {
  items: DddSearchItem[];
}

interface DddTopicStat {
  topicId: number;
  topicName: string;
  topicShortName?: string;
  yesSum: number;
  noSum: number;
  isYes: boolean;
  comment?: string;
}

interface DddMediaResponse {
  item: {
    id: number;
    name: string;
  };
  topicItemStats: DddTopicStat[];
}

export interface TriggerWarning {
  topic: string;
  yesVotes: number;
  noVotes: number;
}

/**
 * Search DoesTheDogDie for a book by title and return trigger warnings.
 * Returns null if API is unavailable, no API key, or no match found.
 */
export async function fetchTriggerWarnings(
  bookTitle: string,
  apiKey: string | undefined
): Promise<TriggerWarning[] | null> {
  if (!apiKey) return null;

  try {
    // 1. Search for the book
    const searchUrl = `${BASE_URL}/dddsearch?q=${encodeURIComponent(bookTitle)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
    });

    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as DddSearchResponse;
    const items = searchData.items ?? [];

    if (items.length === 0) return null;

    // Use the first result (best match)
    const mediaId = items[0].id;

    // 2. Fetch trigger warning details
    const mediaUrl = `${BASE_URL}/media/${mediaId}`;
    const mediaRes = await fetch(mediaUrl, {
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
    });

    if (!mediaRes.ok) return null;

    const mediaData = (await mediaRes.json()) as DddMediaResponse;
    const stats = mediaData.topicItemStats ?? [];

    // 3. Filter to topics where community says "yes" (trigger present)
    //    and has meaningful vote count (at least 1 yes vote)
    const warnings = stats
      .filter((s) => s.isYes && s.yesSum > 0)
      .map((s) => ({
        topic: s.topicName ?? s.topicShortName ?? `Topic ${s.topicId}`,
        yesVotes: s.yesSum,
        noVotes: s.noSum,
      }))
      // Sort by vote confidence (most yes votes first)
      .sort((a, b) => b.yesVotes - a.yesVotes);

    return warnings.length > 0 ? warnings : null;
  } catch {
    // Graceful fallback — don't block analysis if DTDD is down
    return null;
  }
}

/**
 * Format trigger warnings as a string for inclusion in GPT-4o prompt context.
 */
export function formatTriggerWarnings(warnings: TriggerWarning[]): string {
  const lines = warnings.map((w) => {
    const total = w.yesVotes + w.noVotes;
    const pct = total > 0 ? Math.round((w.yesVotes / total) * 100) : 0;
    return `- ${w.topic} (${pct}% of ${total} voters say yes)`;
  });
  return `Community-reported content warnings (via DoesTheDogDie.com):\n${lines.join("\n")}`;
}
