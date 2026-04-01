import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";

// Stripe webhook handler
export default httpAction(async (ctx, request) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  console.log(`[Webhook] Received ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_email;

        if (!customerEmail) {
          console.error("[Webhook] checkout.session.completed missing customer_email");
          return new Response("Missing customer email", { status: 400 });
        }

        if (!session.subscription) {
          console.error("[Webhook] checkout.session.completed missing subscription");
          return new Response("Missing subscription", { status: 400 });
        }

        // Get subscription details to check if it's a trial
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const isTrial = sub.status === "trialing";

        // Update user subscription status
        try {
          await ctx.runMutation(api.users.updateSubscriptionStatus, {
            email: customerEmail,
            subscriptionStatus: isTrial ? "trial" : "active",
            subscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
          });
          console.log(`[Webhook] Updated subscription to ${isTrial ? "trial" : "active"} for session ${session.id}`);
        } catch (updateErr) {
          console.error(`[Webhook] CRITICAL: Failed to update subscription for session ${session.id}:`, updateErr);
          return new Response(`Failed to update subscription: ${updateErr instanceof Error ? updateErr.message : "Unknown error"}`, { status: 500 });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const newStatus = subscription.status === "active" ? "active" : "inactive";

        try {
          await ctx.runMutation(api.users.updateSubscriptionByStripeId, {
            subscriptionId: subscription.id,
            subscriptionStatus: newStatus,
            subscriptionEndsAt: subscription.cancel_at_period_end ? subscription.current_period_end * 1000 : undefined,
          });
          console.log(`[Webhook] Updated subscription ${subscription.id} to ${newStatus}`);
        } catch (updateErr) {
          console.error(`[Webhook] Failed to update subscription ${subscription.id}:`, updateErr);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSubscription = event.data.object as Stripe.Subscription;

        // Check if customer has any OTHER active subscriptions before marking as expired
        let hasOtherActiveSubscription = false;
        try {
          const customerId = deletedSubscription.customer as string;
          const allSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
          });
          const trialingSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: "trialing",
          });
          hasOtherActiveSubscription = allSubs.data.length > 0 || trialingSubs.data.length > 0;

          if (hasOtherActiveSubscription) {
            console.log(`[Webhook] Subscription ${deletedSubscription.id} deleted, but customer has other active subscriptions - NOT marking as expired`);
          }
        } catch (checkErr) {
          console.error(`[Webhook] Failed to check for other subscriptions:`, checkErr);
        }

        if (!hasOtherActiveSubscription) {
          try {
            await ctx.runMutation(api.users.updateSubscriptionByStripeId, {
              subscriptionId: deletedSubscription.id,
              subscriptionStatus: "expired",
            });
            console.log(`[Webhook] Marked subscription ${deletedSubscription.id} as expired`);
          } catch (updateErr) {
            console.error(`[Webhook] Failed to expire subscription ${deletedSubscription.id}:`, updateErr);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          try {
            await ctx.runMutation(api.users.updateSubscriptionByStripeId, {
              subscriptionId: invoice.subscription as string,
              subscriptionStatus: "past_due",
            });
            console.log(`[Webhook] Payment failed for ${invoice.id}, marked as past_due`);
          } catch (updateErr) {
            console.error(`[Webhook] Failed to update subscription for failed invoice ${invoice.id}:`, updateErr);
          }
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[Webhook] Unexpected error processing ${event.type}:`, err);
    return new Response(`Webhook processing failed: ${err instanceof Error ? err.message : "Unknown error"}`, { status: 500 });
  }
});
