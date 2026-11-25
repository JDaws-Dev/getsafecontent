/**
 * THE price (owner decision, 2026-11-25).
 *
 * One plan, Safe Family: $4.99/month, monthly only (no yearly anywhere),
 * covering SafeTunes, SafeTube and SafeStudy. New monthly customers get a
 * 7-day free trial. Existing subscribers keep whatever they already pay —
 * Stripe keeps each subscription on its own price, so nothing here touches
 * them.
 *
 * Every page, component and blog CTA on the hub reads its price text from
 * here. The server-side Stripe price lives in api/checkout/route.ts
 * (STRIPE_UNIFIED_MONTHLY_PRICE_ID).
 *
 * Plain data only, safe to import from client and server code.
 */

export const PLAN_NAME = "Safe Family";

export const MONTHLY_PRICE = 4.99;

/** "$4.99" */
export const PRICE = `$${MONTHLY_PRICE.toFixed(2)}`;

/** "$4.99/month" */
export const PRICE_PER_MONTH = `${PRICE}/month`;

/** "$4.99/mo" — for tight spaces (buttons, sticky bars). */
export const PRICE_PER_MO = `${PRICE}/mo`;

export const TRIAL_DAYS = 7;

/** The apps the plan covers, in display order. */
export const PLAN_APPS = [
  { id: "safetunes", slug: "tunes", name: "SafeTunes" },
  { id: "safetube", slug: "tube", name: "SafeTube" },
  { id: "safestudy", slug: "study", name: "SafeStudy" },
] as const;

/** App ids stamped on the Stripe subscription (metadata.apps). */
export const PLAN_APP_IDS = PLAN_APPS.map((a) => a.id);

/** "SafeTunes, SafeTube and SafeStudy" */
export const PLAN_APPS_TEXT = "SafeTunes, SafeTube and SafeStudy";

/** "$4.99/month for SafeTunes, SafeTube and SafeStudy" */
export const PRICE_LINE = `${PRICE_PER_MONTH} for ${PLAN_APPS_TEXT}`;
