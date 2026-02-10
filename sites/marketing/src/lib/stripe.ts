import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
      timeout: 30000, // 30 second timeout
      maxNetworkRetries: 3, // Retry up to 3 times
    });
  }
  return stripeInstance;
}
