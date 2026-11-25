/**
 * Feature Flags
 *
 * Simple feature flag system for gradual rollout of new features.
 * Flags are controlled via environment variables.
 *
 * Usage:
 *   import { isUnifiedAuthEnabled } from '@/lib/feature-flags';
 *   if (isUnifiedAuthEnabled()) { ... }
 *
 * To enable unified auth in Vercel:
 *   vercel env add ENABLE_UNIFIED_AUTH production
 *   # Set value to "true"
 *
 * To disable (rollback):
 *   vercel env rm ENABLE_UNIFIED_AUTH production
 *   # Or set to "false"
 */

/**
 * Check if the unified auth system is enabled.
 *
 * When enabled:
 * - Signup flow: Creates centralUser FIRST, then proceeds to checkout
 * - Webhook: Uses /provisionUser endpoint with passwordHash
 *
 * When disabled (default):
 * - Signup flow: Goes directly to Stripe checkout (legacy behavior)
 * - Webhook: Uses /setSubscriptionStatus endpoint (legacy behavior)
 *
 * Note: Even when enabled, the system gracefully falls back to legacy
 * for users without a centralUser account (e.g., direct Stripe links).
 *
 * @returns boolean - true if unified auth is enabled
 */
export function isUnifiedAuthEnabled(): boolean {
  return process.env.ENABLE_UNIFIED_AUTH === "true";
}

/**
 * Check if the unified pricing model is enabled.
 *
 * As of 2026-11-25 there is ONE plan whether or not this flag is set:
 * Safe Family, $4.99/month, monthly only, SafeTunes + SafeTube +
 * SafeStudy (see lib/pricing.ts and api/checkout/route.ts). The landing
 * page, signup and checkout no longer read this flag; it is kept only so
 * existing env config stays harmless.
 *
 * Checkout price: STRIPE_UNIFIED_MONTHLY_PRICE_ID (the $4.99/mo price).
 */
export function isUnifiedPricingEnabled(): boolean {
  return process.env.ENABLE_UNIFIED_PRICING === "true";
}

/**
 * Client-side companion. At the client, process.env only exposes
 * NEXT_PUBLIC_* vars, so the flag has to be mirrored under that prefix.
 */
export function isUnifiedPricingEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_UNIFIED_PRICING === "true";
}

/**
 * Check if a specific feature flag is enabled.
 * Generic helper for future feature flags.
 *
 * @param flagName - The environment variable name (without ENABLE_ prefix)
 * @returns boolean - true if the flag is enabled
 */
export function isFeatureEnabled(flagName: string): boolean {
  const envVar = `ENABLE_${flagName.toUpperCase()}`;
  return process.env[envVar] === "true";
}

/**
 * Get all active feature flags (for debugging/admin).
 * Only returns flags that are explicitly set to "true".
 *
 * @returns Record<string, boolean> - map of flag names to their values
 */
export function getActiveFeatureFlags(): Record<string, boolean> {
  const flags: Record<string, boolean> = {
    UNIFIED_AUTH: isUnifiedAuthEnabled(),
    UNIFIED_PRICING: isUnifiedPricingEnabled(),
  };

  return flags;
}
