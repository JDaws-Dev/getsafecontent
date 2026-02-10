import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Validate environment variables early
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!stripeSecretKey) {
      console.error("Checkout error: STRIPE_SECRET_KEY not set");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    if (!stripePriceId) {
      console.error("Checkout error: STRIPE_PRICE_ID not set");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    if (!appUrl) {
      console.error("Checkout error: NEXT_PUBLIC_APP_URL not set");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    let token: string | undefined;
    try {
      token = await convexAuthNextjsToken();
    } catch (tokenError) {
      console.error("Token retrieval error:", tokenError);
      return NextResponse.json(
        { error: "Authentication error", details: String(tokenError) },
        { status: 401 }
      );
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 });
    }

    let user;
    try {
      user = await fetchQuery(api.users.currentUser, {}, { token });
    } catch (queryError) {
      console.error("User query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch user", details: String(queryError) },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Reuse existing Stripe customer if we have one
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { convexUserId: user._id },
      });
      customerId = customer.id;
      await fetchMutation(
        api.subscriptions.setStripeCustomerId,
        { stripeCustomerId: customerId },
        { token }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      metadata: { convexUserId: user._id },
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/dashboard?subscription=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Checkout failed";
    const errorType = error?.constructor?.name || "Unknown";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: errorMessage,
        type: errorType,
        // Temporarily include debug info
        debug: {
          stack: errorStack?.split("\n").slice(0, 5),
          hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
          hasPriceId: !!process.env.STRIPE_PRICE_ID,
          hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        },
      },
      { status: 500 }
    );
  }
}
