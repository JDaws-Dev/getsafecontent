import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // Customer ID is already set in the checkout route before creating the session,
      // so we don't need to do anything here. The subscription events handle the rest.
      break;
    }

    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const periodEnd =
        subscription.items.data[0]?.current_period_end ?? 0;

      await convex.mutation(api.subscriptions.updateSubscription, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: mapSubscriptionStatus(subscription.status),
        subscriptionCurrentPeriodEnd: periodEnd * 1000,
      });

      // Send welcome email for new subscriptions
      if (process.env.RESEND_API_KEY) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted && customer.email) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: "SafeReads <hello@getsafereads.com>",
              to: customer.email,
              subject: "Welcome to SafeReads Pro!",
              html: getWelcomeEmailHtml(customer.name || "there"),
            });
          }
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Don't fail the webhook if email fails
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const periodEnd =
        subscription.items.data[0]?.current_period_end ?? 0;

      await convex.mutation(api.subscriptions.updateSubscription, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: mapSubscriptionStatus(subscription.status),
        subscriptionCurrentPeriodEnd: periodEnd * 1000,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const periodEnd =
        subscription.items.data[0]?.current_period_end ?? 0;

      await convex.mutation(api.subscriptions.updateSubscription, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: "canceled",
        subscriptionCurrentPeriodEnd: periodEnd * 1000,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "incomplete" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    default:
      return "incomplete";
  }
}

function getWelcomeEmailHtml(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SafeReads Pro</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 24px; font-weight: bold; color: #8b7355;">SafeReads</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold; color: #1a1a1a; text-align: center;">
                Welcome to SafeReads Pro!
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4a4a4a; text-align: center;">
                Hey ${name}, thank you for subscribing! You now have unlimited access to help keep your family's reading safe.
              </p>

              <!-- Benefits -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f0ede8;">
                    <span style="font-size: 14px; color: #1a1a1a;">✓ Unlimited book reviews</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f0ede8;">
                    <span style="font-size: 14px; color: #1a1a1a;">✓ Full content breakdowns</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="font-size: 14px; color: #1a1a1a;">✓ Priority support</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="https://getsafereads.com/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #8b7355; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
                      Start Reviewing Books
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; font-size: 12px; color: #8a8a8a;">
                Questions? Reply to this email or visit our <a href="https://getsafereads.com/contact" style="color: #8b7355;">help center</a>.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #8a8a8a;">
                SafeReads · Making family reading safer
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
