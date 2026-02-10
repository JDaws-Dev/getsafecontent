import { NextRequest, NextResponse } from "next/server";

// iTunes Search API - no key required
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      term: query,
      entity: "song",
      country: "us",
      limit: "10",
    });

    const response = await fetch(
      `https://itunes.apple.com/search?${params}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to simplified format
    const songs = (data.results || []).map((item: any) => ({
      id: String(item.trackId),
      title: item.trackName || "Unknown Title",
      artist: item.artistName || "Unknown Artist",
      album: item.collectionName || "Unknown Album",
      coverUrl: item.artworkUrl100?.replace("100x100", "300x300") || null,
      previewUrl: item.previewUrl || null,
      releaseDate: item.releaseDate || null,
      durationMs: item.trackTimeMillis || null,
      isExplicit: item.trackExplicitness === "explicit",
      genre: item.primaryGenreName || null,
    }));

    return NextResponse.json({ songs });
  } catch (error) {
    console.error("iTunes API error:", error);
    return NextResponse.json(
      { error: "Failed to search songs" },
      { status: 500 }
    );
  }
}
