import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

// YouTube Data API v3 - requires API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const rateLimitResult = await checkRateLimit("demo", request);
  if ("status" in rateLimitResult) {
    return rateLimitResult; // 429 response
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: "YouTube API not configured" },
      { status: 500 }
    );
  }

  try {
    // Search for channels
    const searchParams = new URLSearchParams({
      part: "snippet",
      type: "channel",
      q: query,
      maxResults: "8",
      key: YOUTUBE_API_KEY,
    });

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error("YouTube search error:", errorData);
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const channelIds = searchData.items?.map((item: any) => item.snippet?.channelId).filter(Boolean);

    if (!channelIds || channelIds.length === 0) {
      return NextResponse.json({ channels: [] });
    }

    // Get detailed channel info (subscriber count, video count)
    const channelParams = new URLSearchParams({
      part: "snippet,statistics",
      id: channelIds.join(","),
      key: YOUTUBE_API_KEY,
    });

    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${channelParams}`,
      { next: { revalidate: 3600 } }
    );

    if (!channelResponse.ok) {
      throw new Error(`YouTube channels API error: ${channelResponse.status}`);
    }

    const channelData = await channelResponse.json();

    // Transform to simplified format
    const channels = (channelData.items || []).map((item: any) => ({
      id: item.id,
      name: item.snippet?.title || "Unknown Channel",
      handle: item.snippet?.customUrl || `@${item.id}`,
      description: item.snippet?.description || "",
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
      subscriberCount: formatCount(item.statistics?.subscriberCount),
      videoCount: formatCount(item.statistics?.videoCount),
      viewCount: formatCount(item.statistics?.viewCount),
      publishedAt: item.snippet?.publishedAt || null,
    }));

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      { error: "Failed to search channels" },
      { status: 500 }
    );
  }
}

function formatCount(count: string | undefined): string {
  if (!count) return "0";
  const num = parseInt(count, 10);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return count;
}
