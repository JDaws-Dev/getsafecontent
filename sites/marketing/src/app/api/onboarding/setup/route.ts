import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/onboarding/setup
 *
 * Forwards onboarding data to the appropriate app's Convex endpoint.
 * Creates a kid profile in the target app for the given user email.
 *
 * Request body:
 * {
 *   app: "safetunes" | "safetube" | "safereads",
 *   email: string,
 *   data: {
 *     kidName: string,
 *     // App-specific fields:
 *     // SafeTunes: dailyLimit (number)
 *     // SafeTube: selectedColor (string)
 *     // SafeReads: kidAge (string)
 *   }
 * }
 */

type AppId = "safetunes" | "safetube" | "safereads";

interface SetupRequest {
  app: AppId;
  email: string;
  data: {
    kidName: string;
    dailyLimit?: number;
    selectedColor?: string;
    kidAge?: string;
  };
}

// App Convex site URLs
const APP_URLS: Record<AppId, string> = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SetupRequest;
    const { app, email, data } = body;

    // Validate required fields
    if (!app || !email || !data) {
      return NextResponse.json(
        { error: "Missing required fields: app, email, data" },
        { status: 400 }
      );
    }

    // Validate app
    if (!["safetunes", "safetube", "safereads"].includes(app)) {
      return NextResponse.json(
        { error: "Invalid app. Must be safetunes, safetube, or safereads" },
        { status: 400 }
      );
    }

    // Validate kid name
    if (!data.kidName || data.kidName.trim().length === 0) {
      return NextResponse.json(
        { error: "Kid name is required" },
        { status: 400 }
      );
    }

    // Get admin key
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
      console.error("ADMIN_API_KEY not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Build the request to the app's setupOnboarding endpoint
    const appUrl = APP_URLS[app];
    const encodedKey = encodeURIComponent(adminKey);
    const encodedEmail = encodeURIComponent(email);

    // Build query params based on app
    let queryParams = `email=${encodedEmail}&key=${encodedKey}&kidName=${encodeURIComponent(data.kidName.trim())}`;

    if (app === "safetunes" && data.dailyLimit !== undefined) {
      queryParams += `&dailyLimit=${data.dailyLimit}`;
    }

    if (app === "safetube" && data.selectedColor) {
      queryParams += `&color=${encodeURIComponent(data.selectedColor)}`;
    }

    if (app === "safereads" && data.kidAge) {
      queryParams += `&age=${encodeURIComponent(data.kidAge)}`;
    }

    const setupUrl = `${appUrl}/setupOnboarding?${queryParams}`;

    console.log(`[onboarding/setup] Calling ${app} at ${appUrl}/setupOnboarding for ${email}`);

    const response = await fetch(setupUrl, {
      method: "GET", // Using GET like other admin endpoints
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[onboarding/setup] ${app} returned error:`, errorText);

      // Parse error if JSON
      let errorMessage = "Failed to setup app";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`[onboarding/setup] ${app} setup successful for ${email}:`, result);

    return NextResponse.json({
      success: true,
      app,
      email,
      result,
    });
  } catch (error) {
    console.error("[onboarding/setup] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
