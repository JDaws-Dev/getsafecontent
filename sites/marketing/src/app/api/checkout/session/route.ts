import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

type AppId = "safetunes" | "safetube" | "safereads";

/**
 * GET /api/checkout/session?session_id=cs_xxx
 *
 * Retrieves non-sensitive checkout session details (apps list only).
 * Used by the success page to know which apps the user purchased.
 *
 * Security: Only returns apps metadata, not PII (email, subscription_id, etc.)
 * This prevents information disclosure if session IDs are leaked/guessed.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    // Validate session ID format (Stripe checkout sessions start with cs_)
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: "Invalid session ID format" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      // Stripe throws for invalid/nonexistent session IDs
      // Return generic error to avoid information disclosure
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Only return data for completed sessions
    // Pending sessions shouldn't be accessible from success page
    if (session.status !== "complete") {
      return NextResponse.json(
        { error: "Session not completed" },
        { status: 400 }
      );
    }

    // Parse apps from metadata
    const appsString = session.metadata?.apps || "";
    const apps: AppId[] = appsString
      .split(",")
      .filter((a): a is AppId =>
        ["safetunes", "safetube", "safereads"].includes(a)
      );

    // If no apps in metadata, default to all 3
    if (apps.length === 0) {
      apps.push("safetunes", "safetube", "safereads");
    }

    // SECURITY: Only return non-sensitive data
    // Do NOT return: customer_email, payment_status, subscription_id
    return NextResponse.json({
      apps,
    });
  } catch (error) {
    console.error("Session retrieval error:", error);
    // Generic error message to avoid information disclosure
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
