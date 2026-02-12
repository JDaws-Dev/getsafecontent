import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/ratelimit";
import Stripe from "stripe";

// Price IDs for different plans
// PRICING: 1 app=$4.99/mo, 2 apps=$7.99/mo, 3 apps=$9.99/mo (monthly) or $99/year
const PRICE_IDS = {
  // Individual app prices ($4.99/mo each)
  SAFETUNES: "price_1SUXOjKgkIT46sg7RKwIgAVv",
  SAFETUBE: "price_1Spp7oKgkIT46sg7oJIKGfMG",
  SAFEREADS: process.env.SAFEREADS_PRICE_ID || "", // Set via env var
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

// Valid app names
type AppName = "safetunes" | "safetube" | "safereads";
const VALID_APPS: AppName[] = ["safetunes", "safetube", "safereads"];

export async function POST(req: Request) {
  // Rate limit: 10 requests per minute per IP
  const rateLimitResult = await checkRateLimit("checkout", req);
  if ("status" in rateLimitResult) {
    return rateLimitResult; // 429 response
  }

  try {
    const { email, priceId, apps, selectedApps, isYearly } = await req.json();

    // Support both 'apps' and 'selectedApps' field names
    const appsInput = apps || selectedApps;

    // Validate apps array if provided
    let finalApps: AppName[] = VALID_APPS; // Default to all 3 apps
    if (appsInput && Array.isArray(appsInput)) {
      finalApps = appsInput.filter((app: string) =>
        VALID_APPS.includes(app as AppName)
      ) as AppName[];
      if (finalApps.length === 0) {
        return NextResponse.json(
          { error: "At least 1 app must be selected" },
          { status: 400 }
        );
      }
    }

    // Determine price ID based on selection
    let finalPriceId = priceId;
    if (!finalPriceId) {
      if (finalApps.length === 1) {
        // Single app - use individual app price
        const appPriceId = APP_TO_PRICE[finalApps[0]];
        if (!appPriceId) {
          return NextResponse.json(
            { error: `Price not configured for ${finalApps[0]}` },
            { status: 500 }
          );
        }
        finalPriceId = appPriceId;
      } else if (finalApps.length === 2) {
        finalPriceId = PRICE_IDS.TWO_APP;
      } else if (finalApps.length === 3) {
        finalPriceId = isYearly
          ? PRICE_IDS.THREE_APP_YEARLY
          : PRICE_IDS.THREE_APP_MONTHLY;
      }
    }

    // Fall back to environment variable if still not set
    finalPriceId = finalPriceId || process.env.STRIPE_BUNDLE_PRICE_ID;

    if (!finalPriceId) {
      return NextResponse.json(
        { error: "No price ID configured" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    // Store apps as comma-separated string in metadata (sorted for consistency)
    const appsMetadata = finalApps.sort().join(",");
    const isBundle = finalApps.length > 1;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/signup`,
      metadata: {
        bundle: isBundle ? "true" : "false",
        apps: appsMetadata,
        app_count: finalApps.length.toString(),
        billing_interval: isYearly ? "yearly" : "monthly",
      },
      subscription_data: {
        // 7-day free trial for monthly plans, no trial for yearly (charges immediately)
        ...(isYearly ? {} : { trial_period_days: 7 }),
        metadata: {
          bundle: isBundle ? "true" : "false",
          apps: appsMetadata,
          app_count: finalApps.length.toString(),
          billing_interval: isYearly ? "yearly" : "monthly",
        },
      },
    };

    // Only add customer_email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
