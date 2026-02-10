import { NextRequest, NextResponse } from "next/server";

// Search for stock photos from Pexels and Pixabay
// Usage: GET /api/images/search?q=teenager+smartphone&source=pexels

interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
  alt: string;
}

interface PixabayHit {
  id: number;
  pageURL: string;
  user: string;
  largeImageURL: string;
  webformatURL: string;
  tags: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "teenager smartphone";
  const source = searchParams.get("source") || "pexels";
  const perPage = searchParams.get("per_page") || "15";

  try {
    if (source === "pexels") {
      const apiKey = process.env.PEXELS_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "PEXELS_API_KEY not configured" },
          { status: 500 }
        );
      }

      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: `Pexels API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const photos = data.photos.map((photo: PexelsPhoto) => ({
        id: photo.id,
        source: "pexels",
        url: photo.url,
        photographer: photo.photographer,
        image: photo.src.large2x || photo.src.large,
        thumbnail: photo.src.medium,
        alt: photo.alt,
        // Direct URL for use in Hero.tsx
        heroUrl: `${photo.src.large2x}&fit=crop&w=600&h=750`,
      }));

      return NextResponse.json({
        source: "pexels",
        query,
        total: data.total_results,
        photos,
      });
    } else if (source === "pixabay") {
      const apiKey = process.env.PIXABAY_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "PIXABAY_API_KEY not configured" },
          { status: 500 }
        );
      }

      const response = await fetch(
        `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${perPage}&image_type=photo&orientation=vertical&safesearch=true`
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: `Pixabay API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const photos = data.hits.map((hit: PixabayHit) => ({
        id: hit.id,
        source: "pixabay",
        url: hit.pageURL,
        photographer: hit.user,
        image: hit.largeImageURL,
        thumbnail: hit.webformatURL,
        alt: hit.tags,
        // Direct URL for use in Hero.tsx
        heroUrl: hit.largeImageURL,
      }));

      return NextResponse.json({
        source: "pixabay",
        query,
        total: data.totalHits,
        photos,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid source. Use 'pexels' or 'pixabay'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json(
      { error: "Failed to search images" },
      { status: 500 }
    );
  }
}
