import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import Stripe from "stripe";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables early
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!stripeSecretKey || !appUrl) {
      console.error("Portal error: Missing environment variables");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    // Get email from request body (with JWT auth, frontend sends user info)
    let body: { email?: string } = {};
    try {
      body = await request.json();
    } catch {
      // If no body, continue (will fail on missing email)
    }

    const email = body.email;
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const user = await fetchQuery(api.users.getUserByEmail, { email });
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Portal access failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
