import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

type AppId = "safetunes" | "safetube" | "safereads";

/**
 * GET /api/checkout/session?session_id=cs_xxx
 *
 * Retrieves checkout session details including the apps metadata.
 * Used by the success page to know which apps the user purchased.
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

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

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

    return NextResponse.json({
      apps,
      customer_email: session.customer_email || null,
      payment_status: session.payment_status,
      subscription_id: typeof session.subscription === "string" ? session.subscription : null,
    });
  } catch (error) {
    console.error("Session retrieval error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
