"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

// Create Stripe Checkout Session - MONTHLY ONLY
export const createCheckoutSession = action({
  args: {
    email: v.string(),
    priceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set in environment variables");
      throw new Error("Stripe is not configured. Please contact support.");
    }

    // Initialize Stripe inside the handler to access environment variables
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
    });

    console.log("Creating Stripe checkout session for:", args.email);
    console.log("Price ID:", args.priceId);

    try {
      // Check if customer already exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: args.email,
        limit: 1,
      });

      const existingCustomer = existingCustomers.data[0];
      let hasHadSubscription = false;

      if (existingCustomer) {
        // Check if this customer has ever had a subscription (active, trialing, or cancelled)
        const allSubscriptions = await stripe.subscriptions.list({
          customer: existingCustomer.id,
          status: "all",
          limit: 1,
        });
        hasHadSubscription = allSubscriptions.data.length > 0;
        console.log(`Found existing customer ${existingCustomer.id}, hasHadSubscription: ${hasHadSubscription}`);
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
        success_url: `${process.env.SITE_URL || 'https://getsafetunes.com'}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_URL || 'https://getsafetunes.com'}/signup?canceled=true`,
        metadata: {
          email: args.email,
        },
      };

      // Use existing customer or create new one
      if (existingCustomer) {
        sessionOptions.customer = existingCustomer.id;
      } else {
        sessionOptions.customer_email = args.email;
      }

      // Only add trial for NEW customers who haven't had a subscription before
      if (!hasHadSubscription) {
        sessionOptions.subscription_data = {
          trial_period_days: 7,
          metadata: {
            email: args.email,
          },
        };
        console.log("Adding 7-day trial for new customer");
      } else {
        sessionOptions.subscription_data = {
          metadata: {
            email: args.email,
          },
        };
        console.log("Skipping trial for returning customer");
      }

      const session = await stripe.checkout.sessions.create(sessionOptions);

      console.log("Checkout session created successfully:", session.id);
      return { sessionId: session.id, url: session.url };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to create checkout session: ${error.message || 'Unknown error'}`);
    }
  },
});

// Create customer portal session for subscription management
export const createPortalSession = action({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Initialize Stripe inside the handler to access environment variables
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia",
    });

    try{
      const session = await stripe.billingPortal.sessions.create({
        customer: args.stripeCustomerId,
        return_url: `${process.env.SITE_URL || 'https://getsafetunes.com'}/admin`,
      });

      return { url: session.url };
    } catch (error) {
      console.error("Error creating portal session:", error);
      throw new Error("Failed to create portal session");
    }
  },
});

// Get invoice history for a customer
export const getInvoiceHistory = action({
  args: {
    stripeCustomerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Initialize Stripe inside the handler to access environment variables
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia",
    });

    try {
      const invoices = await stripe.invoices.list({
        customer: args.stripeCustomerId,
        limit: args.limit || 12, // Default to last 12 invoices (1 year of monthly billing)
      });

      // Map to a simpler format for frontend consumption
      return invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        created: invoice.created * 1000, // Convert to milliseconds
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        paidAt: invoice.status_transitions.paid_at ? invoice.status_transitions.paid_at * 1000 : null,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        periodStart: invoice.period_start * 1000,
        periodEnd: invoice.period_end * 1000,
        description: invoice.lines.data[0]?.description || 'SafeTunes Subscription',
      }));
    } catch (error) {
      console.error("Error fetching invoices:", error);
      throw new Error("Failed to fetch invoice history");
    }
  },
});
