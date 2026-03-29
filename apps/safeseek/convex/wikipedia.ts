"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Fetch Wikipedia content for a query, preferring Simple English Wikipedia
 * for younger kids.
 */
// Extract the core topic from a question for Wikipedia lookup
function extractTopic(query: string): string {
  let cleaned = query.trim()
    .replace(/[?.!,;:]+$/g, "") // strip trailing punctuation
    .replace(/^(what|who|where|when|how|why|tell me about|explain|describe|what is|what are|what was|what were|who is|who are|who was|where is|where are|how do|how does|how did|how many|how big|how tall|can you tell me about)\s+/i, "")
    .replace(/^(a |an |the )/i, "")
    .trim();
  // Capitalize first letter of each word for Wikipedia title format
  cleaned = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  return cleaned;
}

export const fetchWikipediaContent = internalAction({
  args: {
    query: v.string(),
    ageGroup: v.string(),
  },
  handler: async (_ctx, args) => {
    const topic = extractTopic(args.query);
    const encodedQuery = encodeURIComponent(topic);
    const useSimple = args.ageGroup === "4-6" || args.ageGroup === "7-9";

    // Try Simple English Wikipedia first for younger kids
    let summaryData: any = null;
    let source: "simple_wikipedia" | "wikipedia" = "wikipedia";

    if (useSimple) {
      summaryData = await fetchWikiSummary(
        `https://simple.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`
      );
      if (summaryData) {
        source = "simple_wikipedia";
      }
    }

    // Fall back to regular Wikipedia
    if (!summaryData) {
      summaryData = await fetchWikiSummary(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`
      );
      source = "wikipedia";
    }

    // If direct lookup failed, try Wikipedia search API to find the right page
    if (!summaryData) {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodedQuery}&limit=1&format=json`;
        const searchResp = await fetch(searchUrl, {
          headers: { "User-Agent": "SafeSeek/1.0 (kid-safe search engine)" },
        });
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          const firstResult = searchData[1]?.[0];
          if (firstResult) {
            const pageTitle = encodeURIComponent(firstResult);
            summaryData = await fetchWikiSummary(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`
            );
            source = "wikipedia";
          }
        }
      } catch {
        // Search fallback failed, continue without Wikipedia
      }
    }

    if (!summaryData) {
      return null;
    }

    // Fetch images from Wikimedia Commons using the clean topic
    const images = await fetchWikimediaImages(topic);

    return {
      title: summaryData.title as string,
      summary: summaryData.description || "",
      extract: summaryData.extract || "",
      thumbnail: summaryData.thumbnail?.source || null,
      images,
      source,
      pageUrl: summaryData.content_urls?.desktop?.page || "",
    };
  },
});

async function fetchWikiSummary(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SafeSeek/1.0 (kid-safe search engine)" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    // Wikipedia returns type "disambiguation" or "standard" etc.
    // Only accept if there's actual content
    if (!data.extract || data.type === "disambiguation") return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchWikimediaImages(
  query: string
): Promise<Array<{ url: string; width: number; height: number }>> {
  const images: Array<{ url: string; width: number; height: number }> = [];

  // Method 1: Search Wikimedia Commons directly for the topic
  try {
    const searchParams = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srnamespace: "6", // File namespace
      srlimit: "8",
      format: "json",
    });

    const searchResp = await fetch(
      `https://commons.wikimedia.org/w/api.php?${searchParams}`,
      { headers: { "User-Agent": "SafeSeek/1.0 (kid-safe search engine)" } }
    );

    if (searchResp.ok) {
      const searchData = await searchResp.json();
      const titles = (searchData.query?.search || [])
        .map((s: any) => s.title as string)
        .filter((t: string) => /\.(jpg|jpeg|png)$/i.test(t));

      if (titles.length > 0) {
        // Get image info for found files
        const infoParams = new URLSearchParams({
          action: "query",
          titles: titles.slice(0, 6).join("|"),
          prop: "imageinfo",
          iiprop: "url|size|mime|thumburl",
          iiurlwidth: "400",
          format: "json",
        });

        const infoResp = await fetch(
          `https://commons.wikimedia.org/w/api.php?${infoParams}`,
          { headers: { "User-Agent": "SafeSeek/1.0 (kid-safe search engine)" } }
        );

        if (infoResp.ok) {
          const infoData = await infoResp.json();
          const pages = infoData.query?.pages;
          if (pages) {
            for (const page of Object.values(pages) as any[]) {
              const info = page.imageinfo?.[0];
              if (!info) continue;
              const mime = info.mime as string;
              if (mime !== "image/jpeg" && mime !== "image/png") continue;
              if (info.width < 300 || info.height < 200) continue;

              images.push({
                url: info.thumburl || info.url,
                width: info.thumburl ? 400 : info.width,
                height: info.thumburl ? Math.round(400 * info.height / info.width) : info.height,
              });
            }
          }
        }
      }
    }
  } catch {
    // Search failed, continue
  }

  // Method 2: Fall back to page images if search returned nothing
  if (images.length === 0) {
    try {
      const params = new URLSearchParams({
        action: "query",
        generator: "images",
        titles: query,
        prop: "imageinfo",
        iiprop: "url|size|mime|thumburl",
        iiurlwidth: "400",
        format: "json",
        gimlimit: "5",
      });

      const response = await fetch(
        `https://commons.wikimedia.org/w/api.php?${params}`,
        { headers: { "User-Agent": "SafeSeek/1.0 (kid-safe search engine)" } }
      );

      if (response.ok) {
        const data = await response.json();
        const pages = data.query?.pages;
        if (pages) {
          for (const page of Object.values(pages) as any[]) {
            const info = page.imageinfo?.[0];
            if (!info) continue;
            const mime = info.mime as string;
            if (mime !== "image/jpeg" && mime !== "image/png") continue;
            if (info.width < 300 || info.height < 200) continue;

            images.push({
              url: info.thumburl || info.url,
              width: info.thumburl ? 400 : info.width,
              height: info.thumburl ? Math.round(400 * info.height / info.width) : info.height,
            });
          }
        }
      }
    } catch {
      // Fallback failed
    }
  }

  return images;
}

/**
 * Fetch images from Google Custom Search API.
 * Gracefully returns empty array if API keys are not configured.
 */
export const fetchGoogleImages = internalAction({
  args: {
    query: v.string(),
    safeSearch: v.string(),
  },
  handler: async (_ctx, args) => {
    const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
    const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        key: GOOGLE_API_KEY,
        cx: SEARCH_ENGINE_ID,
        q: args.query,
        searchType: "image",
        safe: "active",
        imgSize: "medium",
        num: "4",
      });

      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?${params}`
      );

      if (!response.ok) {
        console.error(
          "[fetchGoogleImages] Google API error:",
          response.status,
          await response.text()
        );
        return [];
      }

      const data = await response.json();
      const items = data.items || [];

      return items.map((item: any) => ({
        url: item.link,
        thumbnail: item.image?.thumbnailLink || item.link,
        title: item.title || "",
        width: item.image?.width || 0,
        height: item.image?.height || 0,
        source: "google",
      }));
    } catch (err) {
      console.error("[fetchGoogleImages] Error:", err);
      return [];
    }
  },
});
