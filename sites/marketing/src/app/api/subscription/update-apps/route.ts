import { NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { syncAppAccess, type AppName } from "@/lib/provisioning";

/**
 * Update Subscription Apps API
 *
 * SECURITY: Requires authentication. Verifies the subscription belongs to
 * the authenticated user before allowing any modifications.
 *
 * Allows users to add or remove apps from their subscription.
 * - Adding 3rd app switches to bundle pricing ($9.99/mo)
 * - Removing from bundle switches to individual/2-app pricing
 *
 * When apps are added/removed:
 * - Added apps: User is provisioned to those apps via /provisionUser endpoint
 * - Removed apps: User's status is set to inactive on those apps
 *
 * Stripe handles prorations automatically.
 */

// Price IDs for different plans (must match checkout/route.ts)
const PRICE_IDS = {
  // Individual app prices ($4.99/mo each)
  SAFETUNES: "price_1SUXOjKgkIT46sg7RKwIgAVv",
  SAFETUBE: "price_1Spp7oKgkIT46sg7oJIKGfMG",
  SAFEREADS: process.env.SAFEREADS_PRICE_ID || "",
  // 2-app bundle ($7.99/mo)
  TWO_APP: "price_1SzNlSKgkIT46sg7T88Bxq6p",
  // 3-app bundle ($9.99/mo or $99/year)
  THREE_APP_MONTHLY: "price_1SxaerKgkIT46sg7NHNy0wk8",
  THREE_APP_YEARLY: "price_1SzLJUKgkIT46sg7xsKo2A71",
};

// Map app names to their individual price IDs
const APP_TO_PRICE: Record<string, string> = {
  safetunes: PRICE_IDS.SAFETUNES,
  safetube: PRICE_IDS.SAFETUBE,
  safereads: PRICE_IDS.SAFEREADS,
};

// Valid app names (AppName type imported from provisioning)
const VALID_APPS: AppName[] = ["safetunes", "safetube", "safereads"];

// Get the appropriate price ID for a given set of apps
function getPriceIdForApps(
  apps: AppName[],
  isYearly: boolean
): { priceId: string; error?: string } {
  if (apps.length === 0) {
    return { priceId: "", error: "At least 1 app must be selected" };
  }

  if (apps.length === 1) {
    const priceId = APP_TO_PRICE[apps[0]];
    if (!priceId) {
      return { priceId: "", error: `Price not configured for ${apps[0]}` };
    }
    return { priceId };
  }

  if (apps.length === 2) {
    return { priceId: PRICE_IDS.TWO_APP };
  }

  // 3 apps - bundle pricing
  return {
    priceId: isYearly ? PRICE_IDS.THREE_APP_YEARLY : PRICE_IDS.THREE_APP_MONTHLY,
  };
}

export async function POST(req: Request) {
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

    // Validate user has email (required for provisioning)
    if (!user.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // 3. Verify user has a Stripe subscription
    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    const { newApps, isYearly } = await req.json();

    // Use the authenticated user's subscription ID - never trust client input
    const subscriptionId = user.stripeSubscriptionId;

    // Validate apps array
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

    // Get the new price ID
    const { priceId: newPriceId, error: priceError } = getPriceIdForApps(
      validatedApps,
      isYearly === true
    );

    if (priceError || !newPriceId) {
      return NextResponse.json(
        { error: priceError || "Could not determine price" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Retrieve current subscription (using authenticated user's subscription)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Get the previous apps from metadata (for provisioning sync)
    const previousAppsString = subscription.metadata?.apps;
    const previousApps: AppName[] = previousAppsString
      ? (previousAppsString.split(",").filter((app) =>
          VALID_APPS.includes(app as AppName)
        ) as AppName[])
      : VALID_APPS; // Legacy subscriptions without metadata get all apps

    // Get the current subscription item ID
    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      return NextResponse.json(
        { error: "No subscription items found" },
        { status: 500 }
      );
    }

    // Check if the price is actually changing
    if (currentItem.price.id === newPriceId) {
      // Price is the same, just update metadata
      const updatedSubscription = await stripe.subscriptions.update(
        subscriptionId,
        {
          metadata: {
            bundle: validatedApps.length > 1 ? "true" : "false",
            apps: validatedApps.sort().join(","),
            app_count: validatedApps.length.toString(),
          },
        }
      );

      // Update Convex with new apps and log the change
      await fetchMutation(
        api.accounts.confirmSubscriptionChange,
        {
          userId: user.id,
          newApps: validatedApps,
          priceChanged: false,
        },
        { token }
      );

      // Provision/deprovision apps on individual app backends
      const provisionResult = await syncAppAccess(
        user.email,
        validatedApps,
        previousApps,
        {
          stripeCustomerId: user.stripeCustomerId || null,
          subscriptionId: user.stripeSubscriptionId || null,
        }
      );

      console.log(`[subscription/update-apps] Apps updated (no price change) for user ${user.email}: ${validatedApps.join(",")}`, {
        granted: provisionResult.granted,
        revoked: provisionResult.revoked,
        provisionErrors: provisionResult.errors,
      });

      return NextResponse.json({
        success: true,
        subscriptionId: updatedSubscription.id,
        newApps: validatedApps,
        priceChanged: false,
        message: "Apps updated without price change",
        provisioning: {
          granted: provisionResult.granted,
          revoked: provisionResult.revoked,
          errors: provisionResult.errors.length > 0 ? provisionResult.errors : undefined,
        },
      });
    }

    // Update the subscription with new price
    // Stripe automatically handles prorations
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        metadata: {
          bundle: validatedApps.length > 1 ? "true" : "false",
          apps: validatedApps.sort().join(","),
          app_count: validatedApps.length.toString(),
        },
        proration_behavior: "create_prorations", // Prorate immediately
      }
    );

    // Calculate approximate monthly cost for response
    let monthlyCost: number;
    if (validatedApps.length === 1) {
      monthlyCost = 4.99;
    } else if (validatedApps.length === 2) {
      monthlyCost = 7.99;
    } else {
      monthlyCost = isYearly ? 99 / 12 : 9.99;
    }

    // Update Convex with new apps and log the change
    await fetchMutation(
      api.accounts.confirmSubscriptionChange,
      {
        userId: user.id,
        newApps: validatedApps,
        newPriceId,
        priceChanged: true,
      },
      { token }
    );

    // Provision/deprovision apps on individual app backends
    const provisionResult = await syncAppAccess(
      user.email,
      validatedApps,
      previousApps,
      {
        stripeCustomerId: user.stripeCustomerId || null,
        subscriptionId: user.stripeSubscriptionId || null,
      }
    );

    console.log(`[subscription/update-apps] Subscription updated for user ${user.email}: ${validatedApps.join(",")} (price changed to ${newPriceId})`, {
      granted: provisionResult.granted,
      revoked: provisionResult.revoked,
      provisionErrors: provisionResult.errors,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      newApps: validatedApps,
      newPriceId,
      priceChanged: true,
      monthlyCost,
      message: `Subscription updated to ${validatedApps.length} app(s)`,
      provisioning: {
        granted: provisionResult.granted,
        revoked: provisionResult.revoked,
        errors: provisionResult.errors.length > 0 ? provisionResult.errors : undefined,
      },
    });
  } catch (error) {
    console.error("Subscription update error:", error);

    // Handle Stripe errors specifically
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

// GET handler to check current subscription apps
// SECURITY: Requires authentication and returns only the authenticated user's subscription
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
