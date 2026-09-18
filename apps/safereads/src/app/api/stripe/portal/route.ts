import { APP_BASE } from "@/lib/appBase";
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

    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const user = await fetchQuery(api.users.getUserByEmail, { email, userToken });
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}${APP_BASE}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Portal access failed. Please try again." }, { status: 500 });
  }
}
