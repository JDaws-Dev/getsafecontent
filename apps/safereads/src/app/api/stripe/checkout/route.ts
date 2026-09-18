import { APP_BASE } from "@/lib/appBase";
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

    // The browser sends its Safe Family login token along with the email; the
    // account lookup below only returns a row when the token proves ownership.
    let body: { email?: string; userToken?: string } = {};
    try {
      body = await request.json();
    } catch {
      // If no body, continue (will fail on missing email)
    }

    const email = body.email;
    const userToken = body.userToken;
    if (!email || !userToken) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    let user;
    try {
      user = await fetchQuery(api.users.getUserByEmail, { email, userToken });
    } catch (queryError) {
      console.error("User query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch user" },
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
        {
          email,
          stripeCustomerId: customerId,
          // Same shared secret the Stripe webhook route sends; the mutation
          // refuses writes without it once the deployment has it set.
          webhookSecret: process.env.STRIPE_BRIDGE_SECRET,
        }
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
      success_url: `${appUrl}${APP_BASE}/dashboard?subscription=success`,
      cancel_url: `${appUrl}${APP_BASE}/dashboard?subscription=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Details (message, stack, which env vars are set) stay in the server
    // log. The response used to echo all of that to the browser.
    console.error("Checkout error:", {
      type: error?.constructor?.name || "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasPriceId: !!process.env.STRIPE_PRICE_ID,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    });
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 }
    );
  }
}
