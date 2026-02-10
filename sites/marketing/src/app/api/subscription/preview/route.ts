import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

/**
 * Preview Subscription Change API
 *
 * Shows what the price change would be before confirming.
 * Returns proration details and new monthly cost.
 */

// Price IDs for different plans (must match other routes)
const PRICE_IDS = {
  SAFETUNES: "price_1SUXOjKgkIT46sg7RKwIgAVv",
  SAFETUBE: "price_1Spp7oKgkIT46sg7oJIKGfMG",
  SAFEREADS: process.env.SAFEREADS_PRICE_ID || "",
  TWO_APP: "price_1SzNlSKgkIT46sg7T88Bxq6p",
  THREE_APP_MONTHLY: "price_1SxaerKgkIT46sg7NHNy0wk8",
  THREE_APP_YEARLY: "price_1SzLJUKgkIT46sg7xsKo2A71",
};

const APP_TO_PRICE: Record<string, string> = {
  safetunes: PRICE_IDS.SAFETUNES,
  safetube: PRICE_IDS.SAFETUBE,
  safereads: PRICE_IDS.SAFEREADS,
};

type AppName = "safetunes" | "safetube" | "safereads";
const VALID_APPS: AppName[] = ["safetunes", "safetube", "safereads"];

// Get the appropriate price ID for a given set of apps
function getPriceIdForApps(
  apps: AppName[],
  isYearly: boolean
): { priceId: string; monthlyPrice: number; error?: string } {
  if (apps.length === 0) {
    return { priceId: "", monthlyPrice: 0, error: "At least 1 app must be selected" };
  }

  if (apps.length === 1) {
    const priceId = APP_TO_PRICE[apps[0]];
    if (!priceId) {
      return { priceId: "", monthlyPrice: 0, error: `Price not configured for ${apps[0]}` };
    }
    return { priceId, monthlyPrice: 4.99 };
  }

  if (apps.length === 2) {
    return { priceId: PRICE_IDS.TWO_APP, monthlyPrice: 7.99 };
  }

  // 3 apps
  return {
    priceId: isYearly ? PRICE_IDS.THREE_APP_YEARLY : PRICE_IDS.THREE_APP_MONTHLY,
    monthlyPrice: isYearly ? 99 / 12 : 9.99,
  };
}

// App display names
const APP_NAMES: Record<AppName, string> = {
  safetunes: "SafeTunes",
  safetube: "SafeTube",
  safereads: "SafeReads",
};

export async function POST(req: Request) {
  try {
    const { subscriptionId, newApps, isYearly } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId is required" },
        { status: 400 }
      );
    }

    if (!newApps || !Array.isArray(newApps)) {
      return NextResponse.json(
        { error: "newApps must be an array of app names" },
        { status: 400 }
      );
    }

    const validatedApps = newApps.filter((app: string) =>
      VALID_APPS.includes(app as AppName)
    ) as AppName[];

    if (validatedApps.length === 0) {
      return NextResponse.json(
        { error: "At least 1 valid app must be selected" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Retrieve current subscription and cast to Stripe.Subscription type
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription;

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Get current apps
    const currentAppsString = subscription.metadata?.apps;
    const currentApps = currentAppsString
      ? (currentAppsString.split(",").filter((app) =>
          VALID_APPS.includes(app as AppName)
        ) as AppName[])
      : VALID_APPS;

    // Get current and new pricing
    const currentInterval = subscription.items.data[0]?.price?.recurring?.interval;
    const currentIsYearly = currentInterval === "year";

    const { priceId: currentPriceId, monthlyPrice: currentMonthlyPrice } =
      getPriceIdForApps(currentApps, currentIsYearly);

    const { priceId: newPriceId, monthlyPrice: newMonthlyPrice, error } =
      getPriceIdForApps(validatedApps, isYearly === true);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Calculate the difference
    const monthlyDifference = newMonthlyPrice - currentMonthlyPrice;
    const isUpgrade = monthlyDifference > 0;
    const isDowngrade = monthlyDifference < 0;

    // Determine apps being added/removed
    const appsAdded = validatedApps.filter((app) => !currentApps.includes(app));
    const appsRemoved = currentApps.filter((app) => !validatedApps.includes(app));

    // Get proration preview from Stripe if price is changing
    let prorationPreview = null;
    if (currentPriceId !== newPriceId) {
      try {
        const currentItem = subscription.items.data[0];
        if (currentItem) {
          const invoice = await stripe.invoices.createPreview({
            customer: subscription.customer as string,
            subscription: subscriptionId,
            subscription_details: {
              items: [
                {
                  id: currentItem.id,
                  price: newPriceId,
                },
              ],
              proration_behavior: "create_prorations",
            },
          });

          // Get current_period_end from subscription item (moved in newer Stripe API)
          const currentPeriodEnd = currentItem.current_period_end;
          prorationPreview = {
            immediateCharge: invoice.amount_due / 100,
            creditApplied:
              invoice.lines.data
                .filter((line) => line.amount < 0)
                .reduce((sum, line) => sum + Math.abs(line.amount), 0) / 100,
            nextBillingDate: new Date(
              currentPeriodEnd * 1000
            ).toISOString(),
          };
        }
      } catch (prorationError) {
        console.warn("Could not get proration preview:", prorationError);
        // Continue without proration preview
      }
    }

    return NextResponse.json({
      currentPlan: {
        apps: currentApps,
        appNames: currentApps.map((a) => APP_NAMES[a]),
        monthlyPrice: currentMonthlyPrice,
        isYearly: currentIsYearly,
        priceId: currentPriceId,
      },
      newPlan: {
        apps: validatedApps,
        appNames: validatedApps.map((a) => APP_NAMES[a]),
        monthlyPrice: newMonthlyPrice,
        isYearly: isYearly === true,
        priceId: newPriceId,
      },
      changes: {
        appsAdded: appsAdded.map((a) => ({ id: a, name: APP_NAMES[a] })),
        appsRemoved: appsRemoved.map((a) => ({ id: a, name: APP_NAMES[a] })),
        isUpgrade,
        isDowngrade,
        priceChange: monthlyDifference,
        priceChangePercent:
          currentMonthlyPrice > 0
            ? Math.round((monthlyDifference / currentMonthlyPrice) * 100)
            : 0,
      },
      proration: prorationPreview,
      billingInfo: {
        // Get current_period_end from first subscription item (moved in newer Stripe API)
        currentPeriodEnd: subscription.items.data[0]
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
        status: subscription.status,
      },
    });
  } catch (error) {
    console.error("Preview error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preview failed" },
      { status: 500 }
    );
  }
}
