import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import Stripe from "stripe";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
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

    let user;
    try {
      user = await fetchQuery(api.users.getUserByEmail, { email });
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
      // Check if customer already exists in Stripe by email
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { convexUserId: user._id },
        });
        customerId = customer.id;
      }
      await fetchMutation(
        api.subscriptions.setStripeCustomerId,
        { email, stripeCustomerId: customerId }
      );
    }

    // DUPLICATE SUBSCRIPTION PROTECTION
    // Check if this customer already has an active or trialing subscription
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });

    if (activeSubscriptions.data.length > 0 || trialingSubscriptions.data.length > 0) {
      console.log(`[Checkout] BLOCKED duplicate subscription for ${user.email} - already has active/trialing subscription`);
      return NextResponse.json(
        { error: "You already have an active subscription. Go to Settings to manage it." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      metadata: { convexUserId: user._id },
      // `apps` lets every shared-account webhook tell which app a purchase is
      // for, so only SafeReads acts on a SafeReads checkout (the gate above
      // reads subscription.metadata.apps).
      subscription_data: {
        metadata: { convexUserId: user._id, apps: "safereads" },
      },
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
