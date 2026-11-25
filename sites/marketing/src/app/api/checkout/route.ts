import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/ratelimit";
import { capturePaymentError } from "@/lib/sentry";
import Stripe from "stripe";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

// ONE plan (owner decision 2026-11-25): Safe Family, $4.99/month, monthly
// only, covering SafeTunes, SafeTube and SafeStudy. The SERVER decides the
// price — the client never sends a price ID or an app list that we trust.
//
// TODO(owner): create a "Safe Family $4.99/mo" recurring price in Stripe and
// set STRIPE_UNIFIED_MONTHLY_PRICE_ID to it on the Vercel project
// (production). Until then the fallback below is the existing SafeTunes
// $4.99/month price (price_1SUXOjKgkIT46sg7RKwIgAVv), so checkout can never
// silently charge the old $14.99. The env var name is kept from the earlier
// unified plan; if it is still set to the old $14.99 price on Vercel, it
// MUST be replaced.
const SAFE_FAMILY_MONTHLY_PRICE_ID =
  process.env.STRIPE_UNIFIED_MONTHLY_PRICE_ID?.trim() ||
  "price_1SUXOjKgkIT46sg7RKwIgAVv"; // $4.99/mo

// Apps the plan grants (stamped on the subscription as metadata.apps).
type AppName = "safetunes" | "safetube" | "safestudy";
const PLAN_APPS: AppName[] = ["safetunes", "safetube", "safestudy"];

/**
 * Normalize email to lowercase and trim whitespace.
 * Prevents duplicate Stripe customers caused by case differences
 * (e.g., "Jolene_Bryan@yahoo.com" vs "jolene_bryan@yahoo.com").
 */
function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

export async function POST(req: Request) {
  // Track apps for error reporting
  let errorContextApps: AppName[] | undefined;

  try {
    // Rate limit: 10 requests per minute per IP
    // Wrapped in try-catch to prevent rate limit errors from crashing the route
    try {
      const rateLimitResult = await checkRateLimit("checkout", req);
      if ("status" in rateLimitResult) {
        return rateLimitResult; // 429 response
      }
    } catch (rateLimitError) {
      // Log but don't fail the request if rate limiting fails
      console.error("Rate limit check failed:", rateLimitError);
    }
    // Only the email is read from the body. Any priceId / apps / isYearly /
    // plan fields older clients send are ignored: there is one plan.
    const { email: bodyEmail } = await req.json();

    // Get email from request body OR from authenticated session (for OAuth users)
    // IMPORTANT: Normalize email to lowercase to prevent duplicate Stripe customers
    let email = normalizeEmail(bodyEmail);
    if (!email) {
      try {
        const token = await convexAuthNextjsToken();
        if (token) {
          const user = await fetchQuery(api.accounts.getCurrentUser, {}, { token });
          if (user?.email) {
            email = normalizeEmail(user.email);
            console.log("[Checkout] Got email from authenticated session:", email);
          }
        }
      } catch (authError) {
        // Not authenticated, that's fine - email might be collected at Stripe checkout
        console.log("[Checkout] No authenticated session, proceeding without email");
      }
    }

    // One plan, decided here: Safe Family monthly, SafeTunes + SafeTube +
    // SafeStudy.
    const finalApps: AppName[] = [...PLAN_APPS];
    const finalPriceId = SAFE_FAMILY_MONTHLY_PRICE_ID;

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    // Store apps for error context
    errorContextApps = finalApps;

    // DUPLICATE SUBSCRIPTION PROTECTION + returning-customer detection.
    // hasHadSubscription gates the fresh 7-day trial below: a returning or
    // expired-trial customer must NOT be re-trialed, otherwise checkout charges
    // $0 and leaves them stuck in "trial" — the "subscribed but no money charged"
    // bug Michael Kramer hit. (SafeTunes-direct already guards this way.)
    let hasHadSubscription = false;
    if (email) {
      const existingCustomers = await getStripe().customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customerId = existingCustomers.data[0].id;
        const activeSubscriptions = await getStripe().subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        const trialingSubscriptions = await getStripe().subscriptions.list({
          customer: customerId,
          status: "trialing",
          limit: 1,
        });
        // Any subscription ever (active/trialing/canceled/expired) ⇒ returning
        // customer ⇒ charge immediately, no new trial.
        const anySubscriptions = await getStripe().subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 1,
        });
        hasHadSubscription = anySubscriptions.data.length > 0;

        if (activeSubscriptions.data.length > 0 || trialingSubscriptions.data.length > 0) {
          console.log(`[Checkout] BLOCKED duplicate subscription for ${email} - already has active/trialing subscription`);
          return NextResponse.json(
            { error: "You already have an active subscription. Go to Settings to manage it." },
            { status: 400 }
          );
        }
      }
    }

    // metadata.apps = "safetunes,safetube,safestudy" (read by the webhook).
    const appsMetadata = finalApps.join(",");
    const planMetadata = {
      bundle: "true",
      apps: appsMetadata,
      app_count: finalApps.length.toString(),
      billing_interval: "monthly",
      plan: "unified",
    };

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
      metadata: planMetadata,
      subscription_data: {
        // 7-day free trial for NEW customers only. Returning customers
        // (hasHadSubscription) are never re-trialed — they pay now instead of
        // getting another $0 trial.
        ...(!hasHadSubscription ? { trial_period_days: 7 } : {}),
        metadata: planMetadata,
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

    // Check for common Stripe errors and provide user-friendly messages
    let userMessage = "Failed to create checkout session. Please try again.";
    let statusCode = 500;

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();

      // Customer already exists with an active subscription
      if (msg.includes("customer") && msg.includes("already") ||
          msg.includes("email already") ||
          msg.includes("existing subscription")) {
        userMessage = "An account with this email already exists. Please sign in instead.";
        statusCode = 400;
      }
      // Rate limit from Stripe
      else if (msg.includes("rate limit") || msg.includes("too many requests")) {
        userMessage = "Too many requests. Please wait a moment and try again.";
        statusCode = 429;
      }
      // Invalid email format
      else if (msg.includes("invalid email") || msg.includes("email is not valid")) {
        userMessage = "Please enter a valid email address.";
        statusCode = 400;
      }
      // Connection/network issues
      else if (msg.includes("network") || msg.includes("connection") || msg.includes("timeout")) {
        userMessage = "Connection error. Please check your internet and try again.";
        statusCode = 503;
      }
    }

    capturePaymentError(error, {
      eventType: "checkout.create_session_failed",
      apps: errorContextApps,
    });

    return NextResponse.json(
      { error: userMessage },
      { status: statusCode }
    );
  }
}
