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
          headers: { "User-Agent": "SafeStudy/1.0 (kid-safe search engine)" },
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

    // Fetch images from the actual Wikipedia article (use resolved title, not our guess)
    const resolvedTitle = summaryData.title as string;
    const images = await fetchWikimediaImages(resolvedTitle);

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
      headers: { "User-Agent": "SafeStudy/1.0 (kid-safe search engine)" },
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
  topic: string
): Promise<Array<{ url: string; width: number; height: number }>> {
  const images: Array<{ url: string; width: number; height: number }> = [];
  const UA = { "User-Agent": "SafeStudy/1.0 (kid-safe search engine)" };

  // Step 1: Get image file names from the Wikipedia article itself
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: topic,
      prop: "images",
      imlimit: "20",
      format: "json",
    });

    const resp = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: UA });
    if (!resp.ok) return images;

    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return images;

    // Collect image file titles (only jpg/png)
    const fileTitles: string[] = [];
    for (const page of Object.values(pages) as any[]) {
      for (const img of page.images || []) {
        const title = img.title as string;
        if (/\.(jpg|jpeg|png)$/i.test(title)) {
          fileTitles.push(title);
        }
      }
    }

    if (fileTitles.length === 0) return images;

    // Step 2: Get actual image URLs and thumbnails from Commons (where files live)
    const infoParams = new URLSearchParams({
      action: "query",
      titles: fileTitles.slice(0, 8).join("|"),
      prop: "imageinfo",
      iiprop: "url|size|mime|thumburl",
      iiurlwidth: "500",
      format: "json",
    });

    const infoResp = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, { headers: UA });
    if (!infoResp.ok) return images;

    const infoData = await infoResp.json();
    const infoPages = infoData.query?.pages;
    if (!infoPages) return images;

    // Filter: skip icons, logos, tiny images, SVGs
    const skipPatterns = /flag|icon|logo|symbol|button|arrow|edit|commons-logo|wiki|stub|lock|question/i;

    for (const page of Object.values(infoPages) as any[]) {
      const info = page.imageinfo?.[0];
      if (!info) continue;

      const mime = info.mime as string;
      if (mime !== "image/jpeg" && mime !== "image/png") continue;
      if (info.width < 300 || info.height < 200) continue;

      // Skip UI elements and icons
      const title = (page.title || "") as string;
      if (skipPatterns.test(title)) continue;

      images.push({
        url: info.thumburl || info.url,
        width: info.thumburl ? 500 : info.width,
        height: info.thumburl ? Math.round(500 * info.height / info.width) : info.height,
      });

      if (images.length >= 6) break;
    }
  } catch {
    // Failed to fetch article images
  }

  return images;
}

/**
 * Fetch images from Serper.dev (Google Images with SafeSearch).
 * $1/1K queries. Returns actual Google Image results.
 */
export const fetchSerperImages = internalAction({
  args: {
    query: v.string(),
  },
  handler: async (_ctx, args) => {
    const SERPER_KEY = process.env.SERPER_API_KEY;
    if (!SERPER_KEY) return [];

    try {
      const response = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: args.query,
          gl: "us",
          num: 4,
          safe: "active",
        }),
      });

      if (!response.ok) {
        console.error("[fetchSerperImages] Serper API error:", response.status);
        return [];
      }

      const data = await response.json();
      const images = data.images || [];

      return images.map((img: any) => ({
        url: img.imageUrl,
        thumbnail: img.thumbnailUrl || img.imageUrl,
        title: img.title || "",
        width: img.imageWidth || 0,
        height: img.imageHeight || 0,
        source: "google",
      }));
    } catch (err) {
      console.error("[fetchSerperImages] Error:", err);
      return [];
    }
  },
});
