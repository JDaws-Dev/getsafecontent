import { NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { type AppName } from "@/lib/provisioning";
import { PLAN_APPS_TEXT, PLAN_NAME, PRICE_PER_MONTH } from "@/lib/pricing";

/**
 * Subscription apps.
 *
 * There is ONE plan now (owner decision 2026-11-25): Safe Family,
 * $4.99/month, monthly only, covering SafeTunes, SafeTube and SafeStudy.
 * There are no apps to add or remove and no prices to switch between, so
 * POST no longer changes anything. It used to let a signed-in client pick
 * an app list (and through it a price); that path is closed. Plan changes
 * and cancellation go through the Stripe billing portal on /account, which
 * keeps working for every existing subscriber on whatever price they pay.
 *
 * GET (read-only: the signed-in parent's own subscription) is unchanged.
 */

const VALID_APPS: AppName[] = ["safetunes", "safetube", "safereads", "safestudy"];

export async function POST() {
  return NextResponse.json(
    {
      error: `There's one plan now: ${PLAN_NAME} covers ${PLAN_APPS_TEXT} for ${PRICE_PER_MONTH}. There are no apps to add or remove. To change or cancel your plan, use Manage billing on your account page.`,
      manageBillingUrl: "/account",
    },
    { status: 410 },
  );
}

export async function GET() {
  try {
    // 1. Authenticate the user via Convex Auth
    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get the current user from Convex
    const user = await fetchQuery(api.accounts.getCurrentUser, {}, { token });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. Verify user has a Stripe subscription
    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const subscriptionResponse = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    // Cast to Stripe.Subscription since retrieve returns the subscription directly
    const subscription = subscriptionResponse as unknown as Stripe.Subscription;

    // Parse apps from metadata
    const appsString = subscription.metadata?.apps;
    const apps = appsString
      ? appsString.split(",").filter((app) => VALID_APPS.includes(app as AppName))
      : VALID_APPS; // Legacy subscriptions get all apps

    // Determine billing interval
    const interval = subscription.items.data[0]?.price?.recurring?.interval;
    const isYearly = interval === "year";

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      apps,
      isBundle: apps.length > 1,
      isYearly,
      currentPriceId: subscription.items.data[0]?.price?.id,
      currentPeriodEnd: (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end,
      cancelAtPeriodEnd: (subscription as Stripe.Subscription & { cancel_at_period_end?: boolean }).cancel_at_period_end,
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fetch failed" },
      { status: 500 }
    );
  }
}
