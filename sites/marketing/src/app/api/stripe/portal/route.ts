import { NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe Customer Portal API
 *
 * SECURITY: This endpoint requires authentication and derives the customerId
 * from the authenticated user's Convex record. Never trust customerId from
 * the client - that would allow any user to access any other user's portal.
 */
export async function POST() {
  try {
    // 1. Authenticate the user via Convex Auth
    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get the current user from Convex (includes stripeCustomerId)
    const user = await fetchQuery(api.accounts.getCurrentUser, {}, { token });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. Verify user has a Stripe customer ID
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    // 4. Create the portal session using the authenticated user's customer ID
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_URL}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/portal] Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
