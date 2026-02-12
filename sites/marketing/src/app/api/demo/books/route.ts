import { NextRequest, NextResponse } from "next/server";
import { demoBooks, searchDemoBooks } from "@/data/demoBooks";
import { checkRateLimit } from "@/lib/ratelimit";

// Google Books API - uses API key for higher quota limits
// Falls back to pre-cached demo data if API fails or is rate-limited
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

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

  // If no API key, use cached books only
  if (!GOOGLE_BOOKS_API_KEY) {
    console.log("No Google Books API key configured, using cached data");
    return fallbackToCachedBooks(query);
  }

  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: "8",
      printType: "books",
      orderBy: "relevance",
      langRestrict: "en",
      key: GOOGLE_BOOKS_API_KEY,
    });

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${params}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      // Fall back to cached demo books
      console.log("Google Books API unavailable, using cached data");
      return fallbackToCachedBooks(query);
    }

    const data = await response.json();

    // Check if we got results
    if (!data.items || data.items.length === 0) {
      // Try cached books as fallback
      return fallbackToCachedBooks(query);
    }

    // Transform to simplified format
    const books = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.volumeInfo?.title || "Unknown Title",
      author: item.volumeInfo?.authors?.[0] || "Unknown Author",
      coverUrl: item.volumeInfo?.imageLinks?.thumbnail?.replace("http:", "https:") || null,
      description: item.volumeInfo?.description || null,
      pageCount: item.volumeInfo?.pageCount || null,
      categories: item.volumeInfo?.categories || [],
      publishedDate: item.volumeInfo?.publishedDate || null,
      averageRating: item.volumeInfo?.averageRating || null,
    }));

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Google Books API error:", error);
    // Fall back to cached demo books
    return fallbackToCachedBooks(query);
  }
}

// Fallback function that uses pre-cached demo book data
function fallbackToCachedBooks(query: string) {
  const cachedResults = searchDemoBooks(query);

  // Transform cached books to match API format
  const books = cachedResults.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    description: book.summary,
    pageCount: null,
    categories: [], // Categories will be inferred from the cached verdict
    publishedDate: null,
    averageRating: null,
  }));

  return NextResponse.json({ books });
}
