import { NextRequest, NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(".cloud", ".site");
const ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.ADMIN_KEY;

/**
 * Generate JWT for OAuth User
 *
 * POST /api/oauth/generate-token
 * Body: { email: string }
 *
 * This is called by the /oauth page after a user authenticates via Google OAuth.
 * It forwards the request to the Convex backend to generate a JWT.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (!ADMIN_KEY) {
      console.error("[generate-token] ADMIN_KEY not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Call the Convex backend to generate the JWT
    const response = await fetch(`${CONVEX_SITE_URL}/generateOAuthToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[generate-token] Backend error:", result);
      return NextResponse.json(
        { success: false, error: result.error || "Failed to generate token" },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[generate-token] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
