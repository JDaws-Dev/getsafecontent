import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { Resend } from "resend";
import { captureWebhookError, captureProvisioningFailure } from "@/lib/sentry";
import { isUnifiedAuthEnabled } from "@/lib/feature-flags";
import { logWebhookEvent, type WebhookEventType, type WebhookStatus } from "@/lib/webhook-log";

// Admin key for authenticating with app admin endpoints
// Must be set in Vercel env vars - same key used across all Convex deployments
const ADMIN_KEY = process.env.ADMIN_API_KEY;
// SafeSpark's admin key is currently distinct from the shared family key.
// Falls back to ADMIN_API_KEY when unset so a future key rotation just works.
const SAFESPARK_ADMIN_KEY = process.env.SAFESPARK_ADMIN_KEY;
function adminKeyFor(app: AppName): string | undefined {
  if (app === "safespark" && SAFESPARK_ADMIN_KEY) return SAFESPARK_ADMIN_KEY;
  return ADMIN_KEY;
}

if (!ADMIN_KEY) {
  console.warn("ADMIN_API_KEY not set - bundle provisioning will fail");
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000; // 1 second
const PROVISION_TIMEOUT_MS = 5000; // 5 second timeout per app provision call

// Helper to sleep for a given duration
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to retry an async operation with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ success: true; result: T } | { success: false; error: string; attempts: number }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`${operationName} attempt ${attempt}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying ${operationName} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Unknown error",
    attempts: maxRetries
  };
}

// Valid app names — includes safespark as of the SafeSpark merge.
type AppName =
  | "safetunes"
  | "safetube"
  | "safereads"
  | "safestudy"
  | "safespark";
// Base apps in the $9.99 family bundle. SafeSpark excluded — different
// economics (variable per-turn OpenAI cost), sold only in the separate
// "Family + Spark" tier. Used as the legacy-bundle default below.
const ALL_APPS: AppName[] = ["safetunes", "safetube", "safereads", "safestudy"];
// Full app universe for input validation (parseAppsFromMetadata). A Stripe
// session that explicitly lists `apps: "safespark"` in metadata IS allowed
// to provision SafeSpark — but no implicit/default code path provisions it.
const ALL_APPS_WITH_SPARK: AppName[] = [...ALL_APPS, "safespark"];

// App admin endpoint URLs
const APP_ENDPOINTS: Record<AppName, string> = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
  safestudy: "https://strong-scorpion-227.convex.site",
  safespark: "https://giddy-peacock-124.convex.site",
};

// Marketing central auth endpoint URL
const MARKETING_ENDPOINT = "https://adamant-crow-705.convex.site";

// Parse apps from metadata (comma-separated string or undefined for legacy bundles).
// Validation accepts all 5 apps including safespark; legacy fallback returns the
// original 4-app bundle only (never silently grants SafeSpark).
function parseAppsFromMetadata(metadata: Stripe.Metadata | null): AppName[] {
  if (!metadata?.apps) {
    return ALL_APPS;
  }
  const apps = metadata.apps.split(",").filter((app) =>
    ALL_APPS_WITH_SPARK.includes(app as AppName)
  ) as AppName[];
  return apps.length > 0 ? apps : ALL_APPS;
}

// Central user data structure from Marketing Central
// Now includes authProvider to distinguish password vs OAuth users
interface CentralUserData {
  exists: boolean;
  email?: string;
  passwordHash?: string | null; // null for OAuth users
  name?: string;
  entitledApps?: string[];
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
  authProvider?: "password" | "google" | "unknown"; // indicates how user signed up
  familyCode?: string | null; // unified family code, shared across all 4 apps
}

/**
 * Fetch central user data from Marketing Central's users table.
 * This is used to get the password hash and familyCode for provisioning to apps.
 */
async function getCentralUser(email: string): Promise<CentralUserData | null> {
  if (!ADMIN_KEY) {
    console.warn("ADMIN_API_KEY not set - cannot fetch central user");
    return null;
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${MARKETING_ENDPOINT}/getCentralUser?email=${encodedEmail}&key=${encodedKey}`;

  try {
    const response = await fetchWithTimeout(url, {}, PROVISION_TIMEOUT_MS);
    if (!response.ok) {
      console.warn(`Failed to fetch central user for ${email}: HTTP ${response.status}`);
      return null;
    }
    const data = await response.json() as CentralUserData;
    return data;
  } catch (err) {
    console.warn(`Error fetching central user for ${email}:`, err);
    return null;
  }
}

// Result type for individual app provisioning
type AppProvisionResult = {
  app: AppName;
  success: boolean;
  error?: string;
  attempts?: number;
  familyCode?: string | null;
};

/**
 * Create or update user in the Marketing central database.
 * This ensures users are tracked centrally even when using the legacy flow
 * (direct Stripe checkout without going through the signup form first).
 *
 * Note: This does NOT create an authAccounts entry - users who signed up
 * via direct checkout will need to use "Forgot Password" to set a password.
 */
async function createOrUpdateCentralUser(
  email: string,
  options: {
    name?: string | null;
    subscriptionStatus: "trial" | "active" | "lifetime";
    apps: AppName[];
    stripeCustomerId?: string | null;
    subscriptionId?: string | null;
  }
): Promise<{ success: boolean; action?: string; error?: string }> {
  if (!ADMIN_KEY) {
    console.warn("[createOrUpdateCentralUser] ADMIN_API_KEY not set");
    return { success: false, error: "ADMIN_API_KEY not configured" };
  }

  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${MARKETING_ENDPOINT}/createOrUpdateUser?key=${encodedKey}`;

  const body = {
    email,
    name: options.name || undefined,
    subscriptionStatus: options.subscriptionStatus,
    entitledApps: options.apps,
    stripeCustomerId: options.stripeCustomerId || undefined,
    subscriptionId: options.subscriptionId || undefined,
  };

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      PROVISION_TIMEOUT_MS
    );

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      console.error(`[createOrUpdateCentralUser] Failed for ${email}: HTTP ${response.status} - ${responseBody}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    console.log(`[createOrUpdateCentralUser] ${result.action || "processed"} central user: ${email}`);
    return { success: true, action: result.action };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[createOrUpdateCentralUser] Timeout for ${email}`);
      return { success: false, error: `Timeout after ${PROVISION_TIMEOUT_MS}ms` };
    }
    console.error(`[createOrUpdateCentralUser] Error for ${email}:`, err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update subscription status in Marketing Central database.
 * Called by customer.subscription.updated and customer.subscription.deleted webhooks
 * to keep Marketing Central in sync with Stripe subscription state.
 *
 * Maps Stripe subscription statuses to Marketing Central statuses:
 * - active, trialing -> active (or trial if no payment made)
 * - canceled, unpaid, past_due, incomplete, incomplete_expired -> canceled/expired
 */
async function updateCentralUserSubscription(
  email: string,
  options: {
    subscriptionStatus: "trial" | "active" | "lifetime" | "canceled" | "past_due" | "incomplete" | "expired";
    apps?: AppName[];
    stripeCustomerId?: string | null;
    subscriptionId?: string | null;
    subscriptionEndsAt?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!ADMIN_KEY) {
    console.warn("[updateCentralUserSubscription] ADMIN_API_KEY not set");
    return { success: false, error: "ADMIN_API_KEY not configured" };
  }

  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${MARKETING_ENDPOINT}/updateSubscription`;

  const body: Record<string, unknown> = {
    email,
    subscriptionStatus: options.subscriptionStatus,
  };

  // Only include optional fields if they're provided
  if (options.apps) {
    body.entitledApps = options.apps;
  }
  if (options.stripeCustomerId) {
    body.stripeCustomerId = options.stripeCustomerId;
  }
  if (options.subscriptionId) {
    body.stripeSubscriptionId = options.subscriptionId;
  }
  if (options.subscriptionEndsAt) {
    body.subscriptionEndsAt = options.subscriptionEndsAt;
  }

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify(body),
      },
      PROVISION_TIMEOUT_MS
    );

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      console.error(`[updateCentralUserSubscription] Failed for ${email}: HTTP ${response.status} - ${responseBody}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    console.log(`[updateCentralUserSubscription] Updated central user subscription: ${email} -> ${options.subscriptionStatus}`);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[updateCentralUserSubscription] Timeout for ${email}`);
      return { success: false, error: `Timeout after ${PROVISION_TIMEOUT_MS}ms` };
    }
    console.error(`[updateCentralUserSubscription] Error for ${email}:`, err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Helper to fetch with timeout using AbortController
async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = PROVISION_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Provision a user to a single app using the new /provisionUser endpoint.
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to login with their password.
 *
 * For OAuth users (isOAuthUser=true), passwordHash should be empty and
 * the app will skip authAccounts creation (user logs in via Google OAuth).
 */
async function provisionUserToApp(
  email: string,
  app: AppName,
  passwordHash: string,
  options: {
    name?: string | null;
    subscriptionStatus?: "trial" | "active" | "lifetime";
    stripeCustomerId?: string | null;
    subscriptionId?: string | null;
    isOAuthUser?: boolean; // if true, skip authAccounts creation
    familyCode?: string | null; // unified family code; when set, apps sync to this value
  } = {}
): Promise<{ familyCode?: string | null }> {
  const key = adminKeyFor(app);
  if (!key) {
    throw new Error(
      app === "safespark"
        ? "Neither SAFESPARK_ADMIN_KEY nor ADMIN_API_KEY configured"
        : "ADMIN_API_KEY not configured",
    );
  }

  const encodedKey = encodeURIComponent(key);
  const endpoint = APP_ENDPOINTS[app];
  const url = `${endpoint}/provisionUser?key=${encodedKey}`;

  const body = {
    email,
    passwordHash: options.isOAuthUser ? null : passwordHash, // null for OAuth users
    name: options.name || null,
    subscriptionStatus: options.subscriptionStatus || "active",
    entitledToThisApp: true,
    stripeCustomerId: options.stripeCustomerId || null,
    subscriptionId: options.subscriptionId || null,
    isOAuthUser: options.isOAuthUser || false,
    ...(options.familyCode ? { familyCode: options.familyCode } : {}),
  };

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      PROVISION_TIMEOUT_MS
    );

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} - ${responseBody}`);
    }

    // Capture familyCode from response so caller can sync it back to Marketing Central
    try {
      const data = await response.json() as { familyCode?: string | null };
      return { familyCode: data.familyCode ?? null };
    } catch {
      return {};
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout after ${PROVISION_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

// Helper to grant access to a single app using the LEGACY setSubscriptionStatus endpoint.
// Used as fallback when no central user with passwordHash exists.
// status: "active" for paid users, "lifetime" for promo codes
async function grantSingleAppAccessLegacy(
  email: string,
  app: AppName,
  status: "active" | "lifetime" = "active"
): Promise<void> {
  const key = adminKeyFor(app);
  if (!key) {
    throw new Error(
      app === "safespark"
        ? "Neither SAFESPARK_ADMIN_KEY nor ADMIN_API_KEY configured"
        : "ADMIN_API_KEY not configured",
    );
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(key);
  const endpoint = APP_ENDPOINTS[app];

  // All apps use setSubscriptionStatus endpoint
  const url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=${status}&key=${encodedKey}`;

  try {
    const response = await fetchWithTimeout(url, {}, PROVISION_TIMEOUT_MS);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} - ${body}`);
    }
  } catch (err) {
    // Provide clearer error messages for timeouts
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout after ${PROVISION_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

// Helper to grant access to multiple apps using the LEGACY setSubscriptionStatus endpoint.
// This is the original flow that doesn't use password hash provisioning.
async function grantAppAccessLegacy(
  email: string,
  apps: AppName[],
  status: "active" | "lifetime" = "active"
): Promise<{ success: boolean; errors: string[]; failedApps: AppProvisionResult[]; usedNewFlow: false }> {
  const errors: string[] = [];
  const failedApps: AppProvisionResult[] = [];

  const grantPromises = apps.map(async (app): Promise<AppProvisionResult> => {
    const result = await withRetry(
      () => grantSingleAppAccessLegacy(email, app, status),
      `grant ${app} access for ${email}`
    );

    if (result.success) {
      return { app, success: true };
    } else {
      return {
        app,
        success: false,
        error: result.error,
        attempts: result.attempts
      };
    }
  });

  const results = await Promise.all(grantPromises);

  for (const result of results) {
    if (!result.success) {
      errors.push(`${result.app}: ${result.error} (after ${result.attempts} attempts)`);
      failedApps.push(result);
    }
  }

  console.log(`App access grant (LEGACY FLOW) for ${email} (apps: ${apps.join(",")}):`, {
    success: errors.length === 0,
    errors,
    failedApps: failedApps.map(f => f.app),
  });

  return { success: errors.length === 0, errors, failedApps, usedNewFlow: false };
}

// Helper to grant access to specific apps with retry logic.
// This uses the NEW provisioning flow that includes password hash when available,
// but only if the ENABLE_UNIFIED_AUTH feature flag is enabled.
// Falls back to legacy flow when:
// - Feature flag is disabled
// - User doesn't have a central account with password hash
// status: "active" for paid users, "lifetime" for promo codes
async function grantAppAccess(
  email: string,
  apps: AppName[],
  status: "active" | "lifetime" = "active",
  options?: {
    stripeCustomerId?: string | null;
    subscriptionId?: string | null;
    customerName?: string | null;
  }
): Promise<{ success: boolean; errors: string[]; failedApps: AppProvisionResult[]; usedNewFlow: boolean }> {
  if (!ADMIN_KEY) {
    return {
      success: false,
      errors: ["ADMIN_API_KEY not configured"],
      failedApps: apps.map(app => ({ app, success: false, error: "ADMIN_API_KEY not configured" })),
      usedNewFlow: false,
    };
  }

  const errors: string[] = [];
  const failedApps: AppProvisionResult[] = [];

  // Check feature flag first
  const unifiedAuthEnabled = isUnifiedAuthEnabled();

  // If unified auth is disabled, always use legacy flow
  if (!unifiedAuthEnabled) {
    console.log(`[grantAppAccess] UNIFIED_AUTH feature flag is DISABLED - using LEGACY flow for ${email}`);
    return grantAppAccessLegacy(email, apps, status);
  }

  // Unified auth is enabled - try to fetch central user data
  const centralUser = await getCentralUser(email);

  // Determine if we can use the new provisioning flow:
  // 1. Password users: have passwordHash - provision with hash for password login
  // 2. OAuth users: authProvider is "google" - provision without hash (login via Google)
  // 3. Unknown/no user: fall back to legacy flow
  const hasPasswordHash = centralUser?.exists && centralUser?.passwordHash;
  const isOAuthUser = centralUser?.exists && centralUser?.authProvider === "google";
  const canUseNewFlow = hasPasswordHash || isOAuthUser;

  if (canUseNewFlow) {
    const flowType = hasPasswordHash ? "password" : "OAuth";
    console.log(`[grantAppAccess] UNIFIED_AUTH enabled + user exists (${flowType}) - using NEW provisioning flow for ${email}`);

    // Use the new provisioning flow
    // For OAuth users, passwordHash will be null - apps should create user without authAccounts
    const sharedFamilyCode = centralUser!.familyCode ?? null;

    const grantPromises = apps.map(async (app): Promise<AppProvisionResult> => {
      const result = await withRetry(
        () => provisionUserToApp(email, app, centralUser!.passwordHash || "", {
          name: centralUser!.name || options?.customerName,
          subscriptionStatus: status,
          stripeCustomerId: options?.stripeCustomerId,
          subscriptionId: options?.subscriptionId,
          isOAuthUser: isOAuthUser,
          familyCode: sharedFamilyCode,
        }),
        `provision ${app} for ${email}`
      );

      if (result.success) {
        return { app, success: true, familyCode: result.result.familyCode ?? null };
      } else {
        return {
          app,
          success: false,
          error: result.error,
          attempts: result.attempts
        };
      }
    });

    const results = await Promise.all(grantPromises);

    for (const result of results) {
      if (!result.success) {
        errors.push(`${result.app}: ${result.error} (after ${result.attempts} attempts)`);
        failedApps.push(result);
      }
    }

    // If Marketing Central didn't yet have a familyCode, capture one from the first
    // successful app provisioning and persist it centrally so future provisions are idempotent.
    if (!sharedFamilyCode) {
      const learnedCode = results.find((r) => r.success && r.familyCode)?.familyCode ?? null;
      if (learnedCode) {
        try {
          const syncUrl =
            `${MARKETING_ENDPOINT}/syncFamilyCode?key=${encodeURIComponent(ADMIN_KEY!)}` +
            `&email=${encodeURIComponent(email)}&code=${encodeURIComponent(learnedCode)}`;
          await fetchWithTimeout(syncUrl, {}, PROVISION_TIMEOUT_MS);
          console.log(`[grantAppAccess] Cached familyCode ${learnedCode} on Marketing Central for ${email}`);
        } catch (err) {
          console.warn(`[grantAppAccess] Failed to cache familyCode for ${email}:`, err);
        }
      }
    }

    console.log(`App access grant (NEW FLOW - ${flowType}) for ${email} (apps: ${apps.join(",")}):`, {
      success: errors.length === 0,
      errors,
      failedApps: failedApps.map(f => f.app),
    });

    return { success: errors.length === 0, errors, failedApps, usedNewFlow: true };
  } else {
    // Fall back to legacy flow (no user found even though unified auth is enabled)
    // This happens for:
    // 1. Users who signed up before unified auth was implemented
    // 2. Users who went directly to Stripe checkout without creating a central account first
    // 3. Race condition: webhook arrived before signup completed
    console.log(`[grantAppAccess] UNIFIED_AUTH enabled but no user found - falling back to LEGACY flow for ${email}`);
    return grantAppAccessLegacy(email, apps, status);
  }
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

  // Revoke access from each app in parallel (with timeout)
  const revokePromises = apps.map(async (app) => {
    const endpoint = APP_ENDPOINTS[app];

    // SafeReads doesn't have setSubscriptionStatus yet
    if (app === "safereads") {
      console.log(`SafeReads revocation for ${email} requires manual handling`);
      return { app, success: true, note: "manual handling required" };
    }

    const url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=expired&key=${encodedKey}`;

    try {
      const response = await fetchWithTimeout(url, {}, PROVISION_TIMEOUT_MS);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        return { app, success: false, error: `HTTP ${response.status} - ${body}` };
      }
      return { app, success: true };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { app, success: false, error: `Timeout after ${PROVISION_TIMEOUT_MS}ms` };
      }
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
  } else if (amountPaid >= 499) {
    planType = "Single App ($4.99/mo)";
  } else if (amountPaid === 0) {
    planType = "Free Trial";
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

// Helper to send admin notification when a trial converts to paid subscription
async function sendTrialConversionNotification(
  email: string,
  customerName: string | null,
  apps: AppName[],
  subscriptionId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const appNames = apps.map((a) => {
    switch (a) {
      case "safetunes": return "SafeTunes";
      case "safetube": return "SafeTube";
      case "safereads": return "SafeReads";
    }
  });

  const emailContent = `
    <h1>💰 Trial Converted to Paid!</h1>

    <p>A trial user just made their first payment.</p>

    <h2>Customer Details:</h2>
    <ul>
      <li><strong>Name:</strong> ${customerName || "Not provided"}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Apps:</strong> ${appNames.join(", ")}</li>
      <li><strong>Subscription:</strong> ${subscriptionId}</li>
      <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
    </ul>

    <p><a href="https://dashboard.stripe.com/search?query=${encodeURIComponent(email)}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">View in Stripe →</a></p>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="color: #6b7280; font-size: 14px;">Automated trial conversion alert — Safe Family</p>
  `;

  try {
    await resend.emails.send({
      from: "Safe Family <notifications@getsafefamily.com>",
      to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
      subject: `💰 Conversion: ${customerName || email} — trial → paid (${appNames.join("+")})`,
      html: emailContent,
    });
    console.log(`Trial conversion notification sent for ${email}`);
  } catch (error) {
    console.error("Failed to send trial conversion notification:", error);
  }
}

// Helper to send URGENT alert email for failed provisioning
async function sendProvisioningFailureAlert(
  email: string,
  customerName: string | null,
  amountPaid: number,
  failedApps: AppProvisionResult[],
  stripeSessionId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set - cannot send failure alert!");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const failedAppNames = failedApps.map((f) => {
    const name = f.app === "safetunes" ? "SafeTunes" : f.app === "safetube" ? "SafeTube" : f.app === "safestudy" ? "SafeStudy" : "SafeReads";
    return `${name} (${f.error}, ${f.attempts} attempts)`;
  });

  const adminUrl = `https://getsafefamily.com/admin/failed-provisions?email=${encodeURIComponent(email)}&apps=${failedApps.map(f => f.app).join(",")}`;

  const emailContent = `
    <h1 style="color: #dc2626;">🚨 URGENT: Provisioning Failed!</h1>

    <p style="font-size: 18px; color: #dc2626;"><strong>A customer paid but did NOT get access to their apps.</strong></p>

    <h2>Customer Details:</h2>
    <ul>
      <li><strong>Name:</strong> ${customerName || "Not provided"}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Amount Paid:</strong> $${(amountPaid / 100).toFixed(2)}</li>
      <li><strong>Stripe Session:</strong> ${stripeSessionId}</li>
      <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
    </ul>

    <h2>Failed Apps:</h2>
    <ul>
      ${failedAppNames.map((name) => `<li style="color: #dc2626;">${name}</li>`).join("")}
    </ul>

    <h2>Action Required:</h2>
    <p>The webhook tried ${MAX_RETRIES} times with exponential backoff but all attempts failed.</p>
    <p>Please manually provision access for this customer.</p>

    <div style="margin: 24px 0;">
      <a href="${adminUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 12px;">Fix Now →</a>
      <a href="https://dashboard.stripe.com/search?query=${encodeURIComponent(email)}" style="background: #635BFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View in Stripe →</a>
    </div>

    <h3>Manual Fix Commands:</h3>
    <pre style="background: #f3f4f6; padding: 12px; border-radius: 8px; overflow-x: auto;">
# Get and encode admin key
KEY=$(CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env list 2>/dev/null | grep ADMIN_KEY | cut -d= -f2)
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$KEY'))")

# Grant access to failed apps
${failedApps.map(f => {
  if (f.app === "safetunes") {
    return `curl "https://formal-chihuahua-623.convex.site/grantLifetime?email=${encodeURIComponent(email)}&key=$ENCODED"`;
  } else if (f.app === "safetube") {
    return `curl "https://rightful-rabbit-333.convex.site/setSubscriptionStatus?email=${encodeURIComponent(email)}&status=lifetime&key=$ENCODED"`;
  } else {
    return `curl "https://exuberant-puffin-838.convex.site/grantLifetime?email=${encodeURIComponent(email)}&key=$ENCODED"`;
  }
}).join("\n")}
    </pre>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

    <p style="color: #6b7280; font-size: 14px;">This is an automated alert from the Safe Family webhook. The customer has been charged but does not have access.</p>
  `;

  try {
    const result = await resend.emails.send({
      from: "Safe Family Alerts <alerts@getsafefamily.com>",
      to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
      subject: `🚨 URGENT: Provisioning FAILED for ${customerName || email}`,
      html: emailContent,
    });

    console.log(`Provisioning failure alert sent for ${email}:`, result);
  } catch (error) {
    console.error("CRITICAL: Failed to send provisioning failure alert:", error);
    // This is very bad - customer paid, didn't get access, AND we couldn't alert admin
    // Log everything we can
    console.error("FAILED PROVISION DATA:", {
      email,
      customerName,
      amountPaid,
      failedApps,
      stripeSessionId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Helper to send payment receipt email to user
async function sendPaymentReceiptEmail(
  email: string,
  customerName: string | null,
  amountPaid: number,
  invoiceUrl: string | null,
  periodEnd: Date | null
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const name = customerName || "there";
  const amount = `$${(amountPaid / 100).toFixed(2)}`;
  const nextBillingDate = periodEnd
    ? periodEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "your next billing date";

  const emailContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Payment Receipt</h1>

      <p>Hi ${name},</p>

      <p>Thanks for your continued subscription to Safe Family! Here's your receipt:</p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Amount:</strong> ${amount}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        <p style="margin: 4px 0;"><strong>Next billing date:</strong> ${nextBillingDate}</p>
      </div>

      ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #2563eb;">View full invoice →</a></p>` : ""}

      <p>If you have any questions about your subscription, just reply to this email.</p>

      <p>— Jeremiah, Safe Family</p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a></p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "Safe Family <notifications@getsafefamily.com>",
      replyTo: "jeremiah@getsafefamily.com",
      to: email,
      subject: `Your Safe Family receipt — ${amount}`,
      html: emailContent,
    });
    console.log(`Payment receipt sent to ${email} for ${amount}`);
  } catch (error) {
    console.error(`Failed to send payment receipt to ${email}:`, error);
  }
}

// Helper to send re-engagement email after cancellation
async function sendCancellationReengagementEmail(
  email: string,
  customerName: string | null
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const name = customerName || "there";

  const emailContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">We're sorry to see you go</h1>

      <p>Hi ${name},</p>

      <p>Your Safe Family subscription has ended. Your kids' approved music, videos, and books are still saved — if you ever want to come back, everything will be right where you left it.</p>

      <p>If there's anything we could have done better, I'd genuinely love to hear about it. Just reply to this email.</p>

      <p>And if you change your mind, you can resubscribe anytime:</p>

      <p><a href="https://getsafefamily.com/signup" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Resubscribe →</a></p>

      <p>Thanks for giving Safe Family a try.</p>

      <p>— Jeremiah, Safe Family</p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a></p>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">If you no longer wish to receive these emails, reply with "unsubscribe" and we'll remove you from future communications.</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "Jeremiah at Safe Family <jeremiah@getsafefamily.com>",
      replyTo: "jeremiah@getsafefamily.com",
      to: email,
      subject: "Your Safe Family subscription has ended",
      html: emailContent,
    });
    console.log(`Cancellation re-engagement email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send re-engagement email to ${email}:`, error);
  }
}

// Helper to send dunning email when payment fails
async function sendPaymentFailedEmail(
  email: string,
  customerName: string | null
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const name = customerName || "there";

  const emailContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Payment failed — action needed</h1>

      <p>Hi ${name},</p>

      <p>We weren't able to process your latest Safe Family payment. This can happen if your card expired, your bank declined the charge, or your payment details need updating.</p>

      <p>Don't worry — your family's access will continue for a few days while you get this sorted out. All your kids' approved content is safe and waiting.</p>

      <p>To update your payment method, visit your account page:</p>

      <p><a href="https://getsafefamily.com/account" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Update payment method →</a></p>

      <p>If you're having trouble or think this is a mistake, just reply to this email and I'll help you out.</p>

      <p>— Jeremiah, Safe Family</p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a></p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "Safe Family <notifications@getsafefamily.com>",
      replyTo: "jeremiah@getsafefamily.com",
      to: email,
      subject: "Action needed: Your Safe Family payment failed",
      html: emailContent,
    });
    console.log(`Payment failed (dunning) email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send dunning email to ${email}:`, error);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
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
    captureWebhookError(err, {
      eventType: "signature_verification_failed",
    });
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Track webhook processing context for logging
  let webhookContext: {
    eventType: WebhookEventType;
    email: string | null;
    customerName: string | null;
    amountCents: number | null;
    apps: string[];
    failedApps: string[];
    errors: string[];
    status: WebhookStatus;
    metadata: Record<string, unknown>;
  } = {
    eventType: (event.type as WebhookEventType) || "unknown",
    email: null,
    customerName: null,
    amountCents: null,
    apps: [],
    failedApps: [],
    errors: [],
    status: "success",
    metadata: {},
  };

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

        // Update webhook context
        webhookContext.email = email;
        webhookContext.apps = apps;
        webhookContext.metadata = {
          sessionId: session.id,
          isBundle,
          subscriptionId: session.subscription,
        };

        // Handle ALL checkout types (single app, 2-app bundle, 3-app bundle, yearly)
        // Previously this only handled bundles (2+ apps), leaving single app signups broken
        if (email && apps.length > 0) {
          // Extract Stripe metadata for provisioning
          const amountTotal = session.amount_total || 0;
          const customerName = session.customer_details?.name || null;
          const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

          webhookContext.customerName = customerName;
          webhookContext.amountCents = amountTotal;

          // Determine subscription status based on payment
          // $0 payment with trial = trial status
          // Any payment = active status
          const isTrialStart = amountTotal === 0;
          const subscriptionStatus = isTrialStart ? "trial" : "active";

          // CRITICAL: Create/update user in Marketing central database
          // This ensures the user exists in the central system regardless of flow
          // (unified auth or legacy). Without this, users won't be tracked centrally
          // and won't be able to manage their subscription in one place.
          const centralResult = await createOrUpdateCentralUser(email, {
            name: customerName,
            subscriptionStatus,
            apps,
            stripeCustomerId,
            subscriptionId,
          });

          if (!centralResult.success) {
            console.error(`[checkout.session.completed] Failed to create central user for ${email}:`, centralResult.error);
            // Don't fail the entire webhook - apps can still be provisioned
            // The central user can be created later via admin tools
          }

          // Grant access to selected apps only (with retry logic)
          // This will use the NEW provisioning flow if a centralUser with passwordHash exists,
          // or fall back to the LEGACY flow for users without central accounts.
          // Note: We use "active" here because the apps don't distinguish trial vs active internally
          // - they just check if the user has access. The Marketing central DB tracks trial status.
          const result = await grantAppAccess(email, apps, "active", {
            stripeCustomerId,
            subscriptionId,
            customerName,
          });

          if (!result.success) {
            console.error(`Failed to provision apps for ${email} after ${MAX_RETRIES} retries:`, result.errors);

            // Update webhook context for logging
            webhookContext.failedApps = result.failedApps.map(f => f.app);
            webhookContext.errors = result.errors;
            webhookContext.status = result.failedApps.length === apps.length ? "failure" : "partial_failure";

            // Capture in Sentry as critical error
            captureProvisioningFailure({
              email,
              apps,
              failedApps: result.failedApps.map(f => f.app),
              errors: result.errors,
              sessionId: session.id,
              amount: amountTotal,
            });

            // Send urgent failure alert to admin
            await sendProvisioningFailureAlert(
              email,
              customerName,
              amountTotal,
              result.failedApps,
              session.id
            );
          }

          // Send admin notification email (whether success or partial success)
          await sendBundleSignupNotification(
            email,
            customerName,
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

        // Update webhook context
        webhookContext.apps = newApps;
        webhookContext.metadata = {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          isBundle,
        };

        // Handle subscription status changes for ALL subscription types
        if (newApps.length > 0) {
          // Get customer email from Stripe
          const customer = await getStripe().customers.retrieve(
            subscription.customer as string
          ) as Stripe.Customer;
          const email = customer.email;

          webhookContext.email = email;
          webhookContext.customerName = customer.name || null;

          if (email) {
            // Extract Stripe IDs for central update
            const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
            const subscriptionId = subscription.id;
            // Get subscription end date from cancel_at if set, otherwise null
            // Note: Stripe's current_period_end is not always available in the type definitions
            const subscriptionEndsAt = subscription.cancel_at ? subscription.cancel_at * 1000 : null;

            if (subscription.status === "active") {
              // CRITICAL: Update Marketing Central subscription status
              // This ensures the central database stays in sync with Stripe
              const centralResult = await updateCentralUserSubscription(email, {
                subscriptionStatus: "active",
                apps: newApps,
                stripeCustomerId,
                subscriptionId,
                subscriptionEndsAt,
              });

              if (!centralResult.success) {
                console.error(`[customer.subscription.updated] Failed to update central user for ${email}:`, centralResult.error);
                // Continue with app provisioning even if central update fails
              }

              // Check if this is a trial→active conversion (first real payment)
              const prevAttrs = (event.data as Stripe.Event.Data & {
                previous_attributes?: { status?: string; metadata?: Stripe.Metadata };
              }).previous_attributes;

              if (prevAttrs?.status === "trialing") {
                // Trial just converted to paid! Send admin conversion notification
                await sendTrialConversionNotification(
                  email,
                  customer.name || null,
                  newApps,
                  subscriptionId
                );
              }

              // Check if apps changed by comparing with previous state
              // The previous_attributes field contains the old metadata if it changed
              const previousAttributes = prevAttrs;

              if (previousAttributes?.metadata) {
                // Apps metadata changed - sync access
                const previousApps = parseAppsFromMetadata(previousAttributes.metadata);
                const result = await syncAppAccess(email, newApps, previousApps);
                if (!result.success) {
                  webhookContext.errors = result.errors;
                  webhookContext.status = "partial_failure";
                }
              } else {
                // Just re-grant access if subscription becomes active again
                const result = await grantAppAccess(email, newApps);
                if (!result.success) {
                  webhookContext.failedApps = result.failedApps.map(f => f.app);
                  webhookContext.errors = result.errors;
                  webhookContext.status = result.failedApps.length === newApps.length ? "failure" : "partial_failure";
                }
              }
            } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
              // CRITICAL: Update Marketing Central subscription status to canceled
              const centralResult = await updateCentralUserSubscription(email, {
                subscriptionStatus: "canceled",
                stripeCustomerId,
                subscriptionId,
                subscriptionEndsAt,
              });

              if (!centralResult.success) {
                console.error(`[customer.subscription.updated] Failed to update central user for ${email}:`, centralResult.error);
              }

              // Revoke access if subscription is canceled or unpaid
              const result = await revokeAppAccess(email, newApps);
              if (!result.success) {
                webhookContext.errors = result.errors;
                webhookContext.status = "partial_failure";
              }
            } else if (subscription.status === "past_due") {
              // CRITICAL: Update Marketing Central subscription status to past_due
              const centralResult = await updateCentralUserSubscription(email, {
                subscriptionStatus: "past_due",
                stripeCustomerId,
                subscriptionId,
                subscriptionEndsAt,
              });

              if (!centralResult.success) {
                console.error(`[customer.subscription.updated] Failed to update central user for ${email}:`, centralResult.error);
              }
              // Don't revoke access yet - verifyAppAccess handles grace period
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

        // Update webhook context
        webhookContext.apps = apps;
        webhookContext.metadata = {
          subscriptionId: subscription.id,
          isBundle,
        };

        // Handle ALL subscription cancellations
        if (apps.length > 0) {
          // Get customer email and revoke access
          const customer = await getStripe().customers.retrieve(
            subscription.customer as string
          ) as Stripe.Customer;
          const email = customer.email;

          webhookContext.email = email;
          webhookContext.customerName = customer.name || null;

          if (email) {
            const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;

            // CRITICAL: Update Marketing Central subscription status to expired
            const centralResult = await updateCentralUserSubscription(email, {
              subscriptionStatus: "expired",
              stripeCustomerId,
              subscriptionId: subscription.id,
            });

            if (!centralResult.success) {
              console.error(`[customer.subscription.deleted] Failed to update central user for ${email}:`, centralResult.error);
            }

            const result = await revokeAppAccess(email, apps);
            if (!result.success) {
              console.error(`Failed to revoke apps for ${email}:`, result.errors);
              webhookContext.errors = result.errors;
              webhookContext.status = "partial_failure";
            }

            // Send re-engagement email (skip lifetime users — they shouldn't be cancelled)
            await sendCancellationReengagementEmail(email, webhookContext.customerName);
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;

        // Skip the first invoice (checkout.session.completed already handles initial signup)
        // billing_reason "subscription_cycle" = recurring payment
        if (invoice.billing_reason !== "subscription_cycle") {
          console.log(`Skipping invoice.paid for ${email} (billing_reason: ${invoice.billing_reason})`);
          break;
        }

        console.log(`Recurring payment received from ${email}, amount: ${invoice.amount_paid}, invoice: ${invoice.id}`);

        webhookContext.email = email;
        webhookContext.amountCents = invoice.amount_paid;
        webhookContext.metadata = {
          invoiceId: invoice.id,
          billingReason: invoice.billing_reason,
        };

        if (email) {
          const customer = typeof invoice.customer === "string"
            ? await getStripe().customers.retrieve(invoice.customer) as Stripe.Customer
            : null;
          const customerName = customer?.name || null;
          webhookContext.customerName = customerName;

          // Get next billing date from subscription
          let periodEnd: Date | null = null;
          const invoiceAny = invoice as unknown as { subscription?: string | null };
          const subscriptionId = typeof invoiceAny.subscription === "string"
            ? invoiceAny.subscription
            : null;
          if (subscriptionId) {
            try {
              const sub = await getStripe().subscriptions.retrieve(subscriptionId);
              const periodEndTs = (sub as unknown as { current_period_end?: number }).current_period_end;
              if (periodEndTs) {
                periodEnd = new Date(periodEndTs * 1000);
              }
            } catch {
              // Non-critical
            }
          }

          await sendPaymentReceiptEmail(
            email,
            customerName,
            invoice.amount_paid,
            invoice.hosted_invoice_url || null,
            periodEnd
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;

        console.log(`Payment failed for ${email}, invoice: ${invoice.id}`);

        // Update webhook context
        webhookContext.email = email;
        webhookContext.amountCents = invoice.amount_due;
        webhookContext.metadata = {
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count,
        };

        if (email) {
          await sendPaymentFailedEmail(email, webhookContext.customerName);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log webhook event to Upstash
    const processingTimeMs = Date.now() - startTime;
    await logWebhookEvent({
      eventId: event.id,
      eventType: webhookContext.eventType,
      status: webhookContext.status,
      email: webhookContext.email,
      customerName: webhookContext.customerName,
      amountCents: webhookContext.amountCents,
      apps: webhookContext.apps,
      failedApps: webhookContext.failedApps,
      errors: webhookContext.errors,
      metadata: webhookContext.metadata,
      processingTimeMs,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    captureWebhookError(error, {
      eventType: event.type,
      eventId: event.id,
    });

    // Log the failure
    const processingTimeMs = Date.now() - startTime;
    await logWebhookEvent({
      eventId: event.id,
      eventType: (event.type as WebhookEventType) || "unknown",
      status: "failure",
      email: webhookContext.email,
      customerName: webhookContext.customerName,
      amountCents: webhookContext.amountCents,
      apps: webhookContext.apps,
      failedApps: webhookContext.apps, // All apps failed
      errors: [error instanceof Error ? error.message : String(error)],
      metadata: webhookContext.metadata,
      processingTimeMs,
    });

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
