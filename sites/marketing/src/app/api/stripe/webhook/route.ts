import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { Resend } from "resend";

// Admin key for authenticating with app admin endpoints
// Must be set in Vercel env vars - same key used across all Convex deployments
const ADMIN_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_KEY) {
  console.warn("ADMIN_API_KEY not set - bundle provisioning will fail");
}

// Valid app names
type AppName = "safetunes" | "safetube" | "safereads";
const ALL_APPS: AppName[] = ["safetunes", "safetube", "safereads"];

// App admin endpoint URLs
const APP_ENDPOINTS: Record<AppName, string> = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
};

// Parse apps from metadata (comma-separated string or undefined for legacy bundles)
function parseAppsFromMetadata(metadata: Stripe.Metadata | null): AppName[] {
  if (!metadata?.apps) {
    // Legacy bundles without apps metadata get all 3 apps
    return ALL_APPS;
  }
  const apps = metadata.apps.split(",").filter((app) =>
    ALL_APPS.includes(app as AppName)
  ) as AppName[];
  return apps.length > 0 ? apps : ALL_APPS;
}

// Helper to grant access to specific apps
async function grantAppAccess(
  email: string,
  apps: AppName[]
): Promise<{ success: boolean; errors: string[] }> {
  if (!ADMIN_KEY) {
    return { success: false, errors: ["ADMIN_API_KEY not configured"] };
  }

  const errors: string[] = [];
  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);

  // Grant access to each selected app in parallel
  const grantPromises = apps.map(async (app) => {
    const endpoint = APP_ENDPOINTS[app];
    let url: string;

    if (app === "safetube") {
      // SafeTube uses setSubscriptionStatus with lifetime
      url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=lifetime&key=${encodedKey}`;
    } else {
      // SafeTunes and SafeReads use grantLifetime
      url = `${endpoint}/grantLifetime?email=${encodedEmail}&key=${encodedKey}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        return { app, success: false, error: `HTTP ${response.status} - ${body}` };
      }
      return { app, success: true };
    } catch (err) {
      return { app, success: false, error: String(err) };
    }
  });

  const results = await Promise.all(grantPromises);

  for (const result of results) {
    if (!result.success) {
      errors.push(`${result.app}: ${result.error}`);
    }
  }

  console.log(`App access grant for ${email} (apps: ${apps.join(",")}):`, {
    success: errors.length === 0,
    errors,
  });

  return { success: errors.length === 0, errors };
}

// Helper to revoke access from specific apps
async function revokeAppAccess(
  email: string,
  apps: AppName[]
): Promise<{ success: boolean; errors: string[] }> {
  if (!ADMIN_KEY) {
    return { success: false, errors: ["ADMIN_API_KEY not configured"] };
  }

  const errors: string[] = [];
  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);

  // Revoke access from each app in parallel
  const revokePromises = apps.map(async (app) => {
    const endpoint = APP_ENDPOINTS[app];

    // SafeReads doesn't have setSubscriptionStatus yet
    if (app === "safereads") {
      console.log(`SafeReads revocation for ${email} requires manual handling`);
      return { app, success: true, note: "manual handling required" };
    }

    const url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=expired&key=${encodedKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        return { app, success: false, error: `HTTP ${response.status} - ${body}` };
      }
      return { app, success: true };
    } catch (err) {
      return { app, success: false, error: String(err) };
    }
  });

  const results = await Promise.all(revokePromises);

  for (const result of results) {
    if (!result.success) {
      errors.push(`${result.app}: ${result.error}`);
    }
  }

  console.log(`App access revoke for ${email} (apps: ${apps.join(",")}):`, {
    success: errors.length === 0,
    errors,
  });

  return { success: errors.length === 0, errors };
}

// Helper to sync app access (grant new apps, revoke removed apps)
async function syncAppAccess(
  email: string,
  newApps: AppName[],
  previousApps: AppName[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Apps to grant (in newApps but not in previousApps)
  const appsToGrant = newApps.filter((app) => !previousApps.includes(app));
  // Apps to revoke (in previousApps but not in newApps)
  const appsToRevoke = previousApps.filter((app) => !newApps.includes(app));

  console.log(`Syncing app access for ${email}:`, {
    previous: previousApps,
    new: newApps,
    granting: appsToGrant,
    revoking: appsToRevoke,
  });

  if (appsToGrant.length > 0) {
    const grantResult = await grantAppAccess(email, appsToGrant);
    if (!grantResult.success) {
      errors.push(...grantResult.errors);
    }
  }

  if (appsToRevoke.length > 0) {
    const revokeResult = await revokeAppAccess(email, appsToRevoke);
    if (!revokeResult.success) {
      errors.push(...revokeResult.errors);
    }
  }

  return { success: errors.length === 0, errors };
}

// Helper to send admin notification email for signups
async function sendBundleSignupNotification(
  email: string,
  customerName: string | null,
  amountPaid: number,
  apps: AppName[]
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set - skipping admin notification email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Determine plan type from amount
  let planType: string;
  if (amountPaid >= 9900) {
    planType = "Yearly ($99/year)";
  } else if (amountPaid >= 999) {
    planType = "Monthly ($9.99/mo)";
  } else if (amountPaid >= 799) {
    planType = "2-App Monthly ($7.99/mo)";
  } else {
    planType = `Unknown ($${(amountPaid / 100).toFixed(2)})`;
  }

  const appNames = apps.map((a) => {
    switch (a) {
      case "safetunes":
        return "SafeTunes";
      case "safetube":
        return "SafeTube";
      case "safereads":
        return "SafeReads";
    }
  });

  const emailContent = `
    <h1>🎉 New Safe Family Signup!</h1>

    <p>Someone just purchased a Safe Family subscription.</p>

    <h2>Customer Details:</h2>
    <ul>
      <li><strong>Name:</strong> ${customerName || "Not provided"}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Plan:</strong> ${planType}</li>
      <li><strong>Apps:</strong> ${appNames.join(", ")}</li>
      <li><strong>Amount:</strong> $${(amountPaid / 100).toFixed(2)}</li>
      <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
    </ul>

    <p>Access has been automatically provisioned to: ${appNames.join(", ")}.</p>

    <p><a href="https://dashboard.stripe.com/search?query=${encodeURIComponent(email)}" style="background: #635BFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">View in Stripe →</a></p>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

    <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of Safe Family.</p>
  `;

  try {
    const result = await resend.emails.send({
      from: "Safe Family <notifications@getsafefamily.com>",
      to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
      subject: `🎉 Signup: ${customerName || email} - ${appNames.join("+")} (${planType})`,
      html: emailContent,
    });

    console.log(`Admin notification sent for signup ${email}:`, result);
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    // Don't throw - this is non-critical
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email;
        const isBundle = session.metadata?.bundle === "true";
        const apps = parseAppsFromMetadata(session.metadata);

        console.log(
          `Checkout completed: ${email}, bundle: ${isBundle}, apps: ${apps.join(",")}, subscription: ${session.subscription}`
        );

        if (isBundle && email) {
          // Grant access to selected apps only
          const result = await grantAppAccess(email, apps);
          if (!result.success) {
            console.error(`Failed to provision apps for ${email}:`, result.errors);
            // Note: We don't return an error here because the payment was successful
            // Failed provisioning should be handled via manual intervention or retry
          }

          // Send admin notification email
          const amountTotal = session.amount_total || 0;
          await sendBundleSignupNotification(
            email,
            session.customer_details?.name || null,
            amountTotal,
            apps
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const isBundle = subscription.metadata?.bundle === "true";
        const newApps = parseAppsFromMetadata(subscription.metadata);

        console.log(
          `Subscription updated: ${subscription.id}, status: ${subscription.status}, bundle: ${isBundle}, apps: ${newApps.join(",")}`
        );

        // Handle subscription status changes
        if (isBundle) {
          // Get customer email from Stripe
          const customer = await getStripe().customers.retrieve(
            subscription.customer as string
          ) as Stripe.Customer;
          const email = customer.email;

          if (email) {
            if (subscription.status === "active") {
              // Check if apps changed by comparing with previous state
              // The previous_attributes field contains the old metadata if it changed
              const previousAttributes = (event.data as Stripe.Event.Data & {
                previous_attributes?: { metadata?: Stripe.Metadata };
              }).previous_attributes;

              if (previousAttributes?.metadata) {
                // Apps metadata changed - sync access
                const previousApps = parseAppsFromMetadata(previousAttributes.metadata);
                await syncAppAccess(email, newApps, previousApps);
              } else {
                // Just re-grant access if subscription becomes active again
                await grantAppAccess(email, newApps);
              }
            } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
              // Revoke access if subscription is canceled or unpaid
              await revokeAppAccess(email, newApps);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const isBundle = subscription.metadata?.bundle === "true";
        const apps = parseAppsFromMetadata(subscription.metadata);

        console.log(`Subscription deleted: ${subscription.id}, bundle: ${isBundle}, apps: ${apps.join(",")}`);

        if (isBundle) {
          // Get customer email and revoke access
          const customer = await getStripe().customers.retrieve(
            subscription.customer as string
          ) as Stripe.Customer;
          const email = customer.email;

          if (email) {
            const result = await revokeAppAccess(email, apps);
            if (!result.success) {
              console.error(`Failed to revoke apps for ${email}:`, result.errors);
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;

        console.log(`Payment failed for ${email}, invoice: ${invoice.id}`);

        // TODO: Send notification email about failed payment
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
