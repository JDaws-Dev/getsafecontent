import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";

// Stripe webhook handler
export default httpAction(async (ctx, request) => {
  // Initialize Stripe inside the handler to access environment variables
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-11-20.acacia",
  });
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

    // Log webhook verification failure (don't let this block the response)
    try {
      await ctx.runMutation(internal.subscriptionEvents.logEvent, {
        email: "unknown",
        eventType: "webhook.verification_failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    } catch (logErr) {
      console.error("Failed to log verification error:", logErr);
    }

    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Log that webhook was received
  console.log(`[Webhook] Received ${event.type}`);

  try {
    // Handle the event - wrap in try/catch to return proper error status
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

        // CRITICAL: Update user subscription status first - this must succeed
        try {
          await ctx.runMutation(api.users.updateSubscriptionStatus, {
            email: customerEmail,
            subscriptionStatus: isTrial ? "trial" : "active",
            subscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
          });
          console.log(`[Webhook] Updated subscription for ${customerEmail} to ${isTrial ? "trial" : "active"}`);
        } catch (updateErr) {
          console.error(`[Webhook] CRITICAL: Failed to update subscription for ${customerEmail}:`, updateErr);
          // Log the failure
          try {
            await ctx.runMutation(internal.subscriptionEvents.logEvent, {
              email: customerEmail,
              eventType: "checkout.update_failed",
              errorMessage: updateErr instanceof Error ? updateErr.message : "Unknown error",
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
            });
          } catch (logErr) {
            console.error("Failed to log update error:", logErr);
          }
          // Return 500 so Stripe will retry
          return new Response(`Failed to update subscription: ${updateErr instanceof Error ? updateErr.message : "Unknown error"}`, { status: 500 });
        }

        // Log successful checkout (non-critical, don't fail if this errors)
        try {
          await ctx.runMutation(internal.subscriptionEvents.logEvent, {
            email: customerEmail,
            eventType: "checkout.completed",
            subscriptionStatus: isTrial ? "trial" : "active",
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            eventData: JSON.stringify({
              sessionId: session.id,
              amountTotal: session.amount_total,
              currency: session.currency,
              isTrial: isTrial,
            }),
          });
        } catch (logErr) {
          console.error("[Webhook] Failed to log checkout event:", logErr);
        }

        // Send emails (non-critical, don't fail webhook if emails fail)
        try {
          await ctx.runAction(api.emails.sendSubscriptionConfirmation, {
            email: customerEmail,
            name: session.customer_details?.name || customerEmail.split('@')[0],
            subscriptionType: isTrial ? "trial" : "paid",
            trialEndsAt: isTrial && sub.trial_end ? sub.trial_end * 1000 : undefined,
          });
        } catch (emailErr) {
          console.error("[Webhook] Failed to send confirmation email:", emailErr);
        }

        try {
          await ctx.runAction(api.emails.sendAdminNotification, {
            userEmail: customerEmail,
            userName: session.customer_details?.name || customerEmail.split('@')[0],
            subscriptionType: isTrial ? "trial" : "paid",
            subscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            amountPaid: session.amount_total,
          });
        } catch (emailErr) {
          console.error("[Webhook] Failed to send admin notification:", emailErr);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const newStatus = subscription.status === "active" ? "active" : "inactive";

        // Update subscription status
        try {
          await ctx.runMutation(api.users.updateSubscriptionByStripeId, {
            subscriptionId: subscription.id,
            subscriptionStatus: newStatus,
            subscriptionEndsAt: subscription.cancel_at_period_end ? subscription.current_period_end * 1000 : undefined,
          });
          console.log(`[Webhook] Updated subscription ${subscription.id} to ${newStatus}`);
        } catch (updateErr) {
          console.error(`[Webhook] Failed to update subscription ${subscription.id}:`, updateErr);
          // Don't fail - user might not exist yet if this is a race condition
        }

        // Log subscription update
        try {
          await ctx.runMutation(internal.subscriptionEvents.logEvent, {
            email: subscription.metadata?.email || "unknown",
            eventType: subscription.cancel_at_period_end ? "subscription.cancel_scheduled" : "subscription.updated",
            subscriptionStatus: newStatus,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            eventData: JSON.stringify({
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: subscription.current_period_end,
              cancelAt: subscription.cancel_at,
            }),
          });
        } catch (logErr) {
          console.error("[Webhook] Failed to log subscription update:", logErr);
        }

        // Send cancellation email if user cancelled their subscription
        if (subscription.cancel_at_period_end && subscription.metadata?.email) {
          try {
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            await ctx.runAction(api.emails.sendCancellationConfirmation, {
              email: subscription.metadata.email,
              name: (customer as Stripe.Customer).name || subscription.metadata.email.split('@')[0],
              endsAt: subscription.current_period_end * 1000,
            });
          } catch (emailErr) {
            console.error("[Webhook] Failed to send cancellation email:", emailErr);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSubscription = event.data.object as Stripe.Subscription;

        // Check if customer has any OTHER active subscriptions before marking as cancelled
        // This prevents incorrectly cancelling users who have multiple Stripe customers/subscriptions
        let hasOtherActiveSubscription = false;
        try {
          const customerId = deletedSubscription.customer as string;
          const allSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
          });
          // Also check for trialing subscriptions
          const trialingSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: "trialing",
          });
          hasOtherActiveSubscription = allSubs.data.length > 0 || trialingSubs.data.length > 0;

          if (hasOtherActiveSubscription) {
            console.log(`[Webhook] Subscription ${deletedSubscription.id} deleted, but customer has other active subscriptions - NOT marking as cancelled`);
          }
        } catch (checkErr) {
          console.error(`[Webhook] Failed to check for other subscriptions:`, checkErr);
          // If we can't check, proceed with cancellation to be safe
        }

        // Only mark as cancelled if no other active subscriptions exist
        if (!hasOtherActiveSubscription) {
          try {
            await ctx.runMutation(api.users.updateSubscriptionByStripeId, {
              subscriptionId: deletedSubscription.id,
              subscriptionStatus: "cancelled",
            });
            console.log(`[Webhook] Marked subscription ${deletedSubscription.id} as cancelled`);
          } catch (updateErr) {
            console.error(`[Webhook] Failed to cancel subscription ${deletedSubscription.id}:`, updateErr);
          }
        }

        // Log subscription cancellation
        try {
          await ctx.runMutation(internal.subscriptionEvents.logEvent, {
            email: deletedSubscription.metadata?.email || "unknown",
            eventType: "subscription.cancelled",
            subscriptionStatus: "cancelled",
            stripeSubscriptionId: deletedSubscription.id,
            stripeCustomerId: deletedSubscription.customer as string,
            eventData: JSON.stringify({
              canceledAt: deletedSubscription.canceled_at,
              endedAt: deletedSubscription.ended_at,
            }),
          });
        } catch (logErr) {
          console.error("[Webhook] Failed to log subscription cancellation:", logErr);
        }
        break;
      }

      case "invoice.paid": {
        const paidInvoice = event.data.object as Stripe.Invoice;

        // Only process subscription invoices (not one-time payments)
        if (paidInvoice.subscription) {
          // Update subscription status to active (confirms payment succeeded)
          try {
            await ctx.runMutation(api.users.updateSubscriptionByStripeId, {
              subscriptionId: paidInvoice.subscription as string,
              subscriptionStatus: "active",
            });
            console.log(`[Webhook] Invoice paid: ${paidInvoice.id}, marked subscription as active`);
          } catch (updateErr) {
            console.error(`[Webhook] Failed to update subscription for invoice ${paidInvoice.id}:`, updateErr);
          }

          // Log successful payment
          try {
            await ctx.runMutation(internal.subscriptionEvents.logEvent, {
              email: paidInvoice.customer_email || "unknown",
              eventType: paidInvoice.billing_reason === "subscription_create" ? "trial.started" :
                         paidInvoice.billing_reason === "subscription_cycle" ? "payment.succeeded" :
                         "invoice.paid",
              subscriptionStatus: "active",
              stripeSubscriptionId: paidInvoice.subscription as string,
              stripeCustomerId: paidInvoice.customer as string,
              eventData: JSON.stringify({
                invoiceId: paidInvoice.id,
                amountPaid: paidInvoice.amount_paid,
                billingReason: paidInvoice.billing_reason,
                periodStart: paidInvoice.period_start,
                periodEnd: paidInvoice.period_end,
              }),
            });
          } catch (logErr) {
            console.error("[Webhook] Failed to log invoice payment:", logErr);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          // Mark subscription as past_due
          try {
            await ctx.runMutation(api.users.updateSubscriptionByStripeId, {
              subscriptionId: invoice.subscription as string,
              subscriptionStatus: "past_due",
            });
            console.log(`[Webhook] Payment failed for ${invoice.id}, marked as past_due`);
          } catch (updateErr) {
            console.error(`[Webhook] Failed to update subscription for failed invoice ${invoice.id}:`, updateErr);
          }

          // Log payment failure
          try {
            await ctx.runMutation(internal.subscriptionEvents.logEvent, {
              email: invoice.customer_email || "unknown",
              eventType: "payment.failed",
              subscriptionStatus: "past_due",
              stripeSubscriptionId: invoice.subscription as string,
              stripeCustomerId: invoice.customer as string,
              eventData: JSON.stringify({
                invoiceId: invoice.id,
                amountDue: invoice.amount_due,
                attemptCount: invoice.attempt_count,
                nextPaymentAttempt: invoice.next_payment_attempt,
              }),
            });
          } catch (logErr) {
            console.error("[Webhook] Failed to log payment failure:", logErr);
          }

          // Send payment failed email
          if (invoice.customer_email) {
            try {
              const failedCustomer = await stripe.customers.retrieve(invoice.customer as string);
              await ctx.runAction(api.emails.sendPaymentFailedEmail, {
                email: invoice.customer_email,
                name: (failedCustomer as Stripe.Customer).name || invoice.customer_email.split('@')[0],
                amountDue: invoice.amount_due,
                nextAttempt: invoice.next_payment_attempt,
              });
            } catch (emailErr) {
              console.error("[Webhook] Failed to send payment failed email:", emailErr);
            }
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
    // Catch any unexpected errors
    console.error(`[Webhook] Unexpected error processing ${event.type}:`, err);

    // Try to log the error
    try {
      await ctx.runMutation(internal.subscriptionEvents.logEvent, {
        email: "unknown",
        eventType: "webhook.error",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        eventData: JSON.stringify({ eventType: event.type, eventId: event.id }),
      });
    } catch (logErr) {
      console.error("[Webhook] Failed to log webhook error:", logErr);
    }

    // Return 500 so Stripe will retry
    return new Response(`Webhook processing failed: ${err instanceof Error ? err.message : "Unknown error"}`, { status: 500 });
  }
});
