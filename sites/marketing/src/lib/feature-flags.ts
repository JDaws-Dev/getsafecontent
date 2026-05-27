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
 * When enabled:
 * - Landing page pricing shows ONE plan: $14.99/mo or $149/yr,
 *   all 5 apps included (including SafeSpark).
 * - Signup flow skips AppSelector — just email + password +
 *   monthly/yearly toggle.
 * - Checkout uses STRIPE_UNIFIED_MONTHLY_PRICE_ID /
 *   STRIPE_UNIFIED_YEARLY_PRICE_ID env vars.
 * - Webhook provisions all 5 apps including SafeSpark for any
 *   subscription paid on the unified Price IDs.
 *
 * When disabled (default):
 * - Legacy multi-tier pricing ($4.99 / $7.99 / $9.99 / $99/yr) with
 *   AppSelector continues to work exactly as before.
 * - SafeSpark is never provisioned through any legacy path.
 *
 * Grandfathered $9.99 bundle subscribers stay on their existing
 * subscription regardless of this flag — only NEW signups go through
 * the unified flow.
 *
 * Required env vars when this flag is on:
 *   STRIPE_UNIFIED_MONTHLY_PRICE_ID  (e.g., price_xxx for $14.99/mo)
 *   STRIPE_UNIFIED_YEARLY_PRICE_ID   (e.g., price_xxx for $149/yr)
 *   NEXT_PUBLIC_ENABLE_UNIFIED_PRICING ("true" for client components)
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
