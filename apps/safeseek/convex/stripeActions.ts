"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

// Create Stripe Checkout Session
export const createCheckoutSession = action({
  args: {
    email: v.string(),
    priceId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set in environment variables");
      throw new Error("Stripe is not configured. Please contact support.");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    console.log("Creating Stripe checkout session for:", args.email);
    console.log("Price ID:", args.priceId);

    try {
      // Check if customer already exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: args.email,
        limit: 1,
      });

      const existingCustomer = existingCustomers.data[0];

      if (existingCustomer) {
        // DUPLICATE SUBSCRIPTION PROTECTION
        const activeSubscriptions = await stripe.subscriptions.list({
          customer: existingCustomer.id,
          status: "active",
          limit: 1,
        });
        const trialingSubscriptions = await stripe.subscriptions.list({
          customer: existingCustomer.id,
          status: "trialing",
          limit: 1,
        });

        if (activeSubscriptions.data.length > 0 || trialingSubscriptions.data.length > 0) {
          console.log(`[Checkout] BLOCKED duplicate subscription for ${args.email} - already has active/trialing subscription`);
          throw new Error("You already have an active subscription. Go to Settings to manage it.");
        }
      }

      // Build checkout session options
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: args.priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.SITE_URL || "https://getsafestudy.com"}/admin?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_URL || "https://getsafestudy.com"}/admin?canceled=true`,
        metadata: {
          email: args.email,
          apps: "safestudy",
        },
      };

      // Use existing customer or create new one
      if (existingCustomer) {
        sessionOptions.customer = existingCustomer.id;
      } else {
        sessionOptions.customer_email = args.email;
      }

      // No Stripe trial - charge immediately when user clicks subscribe
      // (They already get a 7-day free trial in the app before needing to pay)
      sessionOptions.subscription_data = {
        metadata: {
          email: args.email,
          apps: "safestudy",
        },
      };
      console.log("Creating subscription with immediate billing (no Stripe trial)");

      const session = await stripe.checkout.sessions.create(sessionOptions);

      console.log("Checkout session created successfully:", session.id);
      return { sessionId: session.id, url: session.url };
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      throw new Error(`Failed to create checkout session: ${error.message || "Unknown error"}`);
    }
  },
});

// Create customer portal session for subscription management
export const createPortalSession = action({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: args.stripeCustomerId,
        return_url: `${process.env.SITE_URL || "https://getsafestudy.com"}/admin`,
      });

      return { url: session.url };
    } catch (error) {
      console.error("Error creating portal session:", error);
      throw new Error("Failed to create portal session");
    }
  },
});
