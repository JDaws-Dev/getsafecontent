/**
 * App Provisioning Utilities
 *
 * This module handles provisioning users to individual apps (SafeTunes, SafeTube, SafeReads).
 * When a user upgrades/downgrades their subscription, we need to:
 * 1. Grant access to newly added apps
 * 2. Revoke access from removed apps
 *
 * Uses the /provisionUser endpoint on each app with entitledToThisApp param
 * to control whether the user has access to that specific app.
 */

import { isUnifiedAuthEnabled } from "@/lib/feature-flags";

// Admin key for authenticating with app admin endpoints
const ADMIN_KEY = process.env.ADMIN_API_KEY;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const PROVISION_TIMEOUT_MS = 5000;

// Valid app names
export type AppName = "safetunes" | "safetube" | "safereads" | "safestudy";
export const ALL_APPS: AppName[] = ["safetunes", "safetube", "safereads", "safestudy"];

// App admin endpoint URLs
const APP_ENDPOINTS: Record<AppName, string> = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
  safestudy: "https://strong-scorpion-227.convex.site",
};

// Central auth endpoint (Marketing site)
const CENTRAL_AUTH_ENDPOINT = "https://adamant-crow-705.convex.site";

// Result type for individual app provisioning
export type AppProvisionResult = {
  app: AppName;
  success: boolean;
  error?: string;
  attempts?: number;
};

// Central user data structure from SafeReads
interface CentralUserData {
  exists: boolean;
  email?: string;
  passwordHash?: string;
  name?: string;
  entitledApps?: string[];
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
}

// Helper to sleep for a given duration
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper to retry an async operation with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<
  { success: true; result: T } | { success: false; error: string; attempts: number }
> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `${operationName} attempt ${attempt}/${maxRetries} failed:`,
        lastError.message
      );

      if (attempt < maxRetries) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying ${operationName} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Unknown error",
    attempts: maxRetries,
  };
}

/**
 * Fetch central user data from Marketing's central auth database.
 * This is used to get the password hash for provisioning to apps.
 */
async function getCentralUser(email: string): Promise<CentralUserData | null> {
  if (!ADMIN_KEY) {
    console.warn("ADMIN_API_KEY not set - cannot fetch central user");
    return null;
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${CENTRAL_AUTH_ENDPOINT}/getCentralUser?email=${encodedEmail}&key=${encodedKey}`;

  try {
    const response = await fetchWithTimeout(url, {}, PROVISION_TIMEOUT_MS);
    if (!response.ok) {
      console.warn(
        `Failed to fetch central user for ${email}: HTTP ${response.status}`
      );
      return null;
    }
    const data = (await response.json()) as CentralUserData;
    return data;
  } catch (err) {
    console.warn(`Error fetching central user for ${email}:`, err);
    return null;
  }
}

/**
 * Provision a user to a single app using the /provisionUser endpoint.
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to login with their password.
 *
 * @param entitledToThisApp - If false, marks user as inactive on this app (for downgrades)
 */
async function provisionUserToApp(
  email: string,
  app: AppName,
  passwordHash: string,
  options: {
    name?: string | null;
    subscriptionStatus?: "trial" | "active" | "lifetime" | "inactive";
    stripeCustomerId?: string | null;
    subscriptionId?: string | null;
    entitledToThisApp?: boolean;
  } = {}
): Promise<void> {
  if (!ADMIN_KEY) {
    throw new Error("ADMIN_API_KEY not configured");
  }

  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const endpoint = APP_ENDPOINTS[app];
  const url = `${endpoint}/provisionUser?key=${encodedKey}`;

  const body = {
    email,
    passwordHash,
    name: options.name || null,
    subscriptionStatus: options.subscriptionStatus || "active",
    entitledToThisApp: options.entitledToThisApp !== false, // Default to true
    stripeCustomerId: options.stripeCustomerId || null,
    subscriptionId: options.subscriptionId || null,
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
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout after ${PROVISION_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

/**
 * Grant access to a single app using the LEGACY setSubscriptionStatus endpoint.
 * Used as fallback when no central user with passwordHash exists.
 */
async function grantSingleAppAccessLegacy(
  email: string,
  app: AppName,
  status: "active" | "lifetime" | "inactive" = "active"
): Promise<void> {
  if (!ADMIN_KEY) {
    throw new Error("ADMIN_API_KEY not configured");
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const endpoint = APP_ENDPOINTS[app];

  // Map "inactive" to "expired" for the legacy endpoint
  const legacyStatus = status === "inactive" ? "expired" : status;
  const url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=${legacyStatus}&key=${encodedKey}`;

  try {
    const response = await fetchWithTimeout(url, {}, PROVISION_TIMEOUT_MS);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} - ${body}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout after ${PROVISION_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

/**
 * Grant access to multiple apps.
 * Uses the NEW provisioning flow if a centralUser with passwordHash exists,
 * falls back to LEGACY flow otherwise.
 */
export async function grantAppAccess(
  email: string,
  apps: AppName[],
  status: "active" | "lifetime" = "active",
  options?: {
    stripeCustomerId?: string | null;
    subscriptionId?: string | null;
    customerName?: string | null;
  }
): Promise<{
  success: boolean;
  errors: string[];
  failedApps: AppProvisionResult[];
  usedNewFlow: boolean;
}> {
  if (!ADMIN_KEY) {
    return {
      success: false,
      errors: ["ADMIN_API_KEY not configured"],
      failedApps: apps.map((app) => ({
        app,
        success: false,
        error: "ADMIN_API_KEY not configured",
      })),
      usedNewFlow: false,
    };
  }

  const errors: string[] = [];
  const failedApps: AppProvisionResult[] = [];

  // Check feature flag first
  const unifiedAuthEnabled = isUnifiedAuthEnabled();

  // If unified auth is disabled, always use legacy flow
  if (!unifiedAuthEnabled) {
    console.log(
      `[grantAppAccess] UNIFIED_AUTH feature flag is DISABLED - using LEGACY flow for ${email}`
    );
    return grantAppAccessLegacy(email, apps, status);
  }

  // Unified auth is enabled - try to fetch central user data to get the password hash
  const centralUser = await getCentralUser(email);
  const hasPasswordHash = centralUser?.exists && centralUser?.passwordHash;

  if (hasPasswordHash) {
    console.log(
      `[grantAppAccess] UNIFIED_AUTH enabled + centralUser exists - using NEW provisioning flow for ${email}`
    );

    // Use the new provisioning flow with password hash
    const grantPromises = apps.map(async (app): Promise<AppProvisionResult> => {
      const result = await withRetry(
        () =>
          provisionUserToApp(email, app, centralUser.passwordHash!, {
            name: centralUser.name || options?.customerName,
            subscriptionStatus: status,
            stripeCustomerId: options?.stripeCustomerId,
            subscriptionId: options?.subscriptionId,
            entitledToThisApp: true,
          }),
        `provision ${app} for ${email}`
      );

      if (result.success) {
        return { app, success: true };
      } else {
        return {
          app,
          success: false,
          error: result.error,
          attempts: result.attempts,
        };
      }
    });

    const results = await Promise.all(grantPromises);

    for (const result of results) {
      if (!result.success) {
        errors.push(
          `${result.app}: ${result.error} (after ${result.attempts} attempts)`
        );
        failedApps.push(result);
      }
    }

    console.log(
      `App access grant (NEW FLOW) for ${email} (apps: ${apps.join(",")}):`,
      {
        success: errors.length === 0,
        errors,
        failedApps: failedApps.map((f) => f.app),
      }
    );

    return { success: errors.length === 0, errors, failedApps, usedNewFlow: true };
  } else {
    console.log(
      `[grantAppAccess] UNIFIED_AUTH enabled but no centralUser - falling back to LEGACY flow for ${email}`
    );
    return grantAppAccessLegacy(email, apps, status);
  }
}

/**
 * Grant access using legacy flow only.
 */
async function grantAppAccessLegacy(
  email: string,
  apps: AppName[],
  status: "active" | "lifetime" = "active"
): Promise<{
  success: boolean;
  errors: string[];
  failedApps: AppProvisionResult[];
  usedNewFlow: false;
}> {
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
        attempts: result.attempts,
      };
    }
  });

  const results = await Promise.all(grantPromises);

  for (const result of results) {
    if (!result.success) {
      errors.push(
        `${result.app}: ${result.error} (after ${result.attempts} attempts)`
      );
      failedApps.push(result);
    }
  }

  console.log(
    `App access grant (LEGACY FLOW) for ${email} (apps: ${apps.join(",")}):`,
    {
      success: errors.length === 0,
      errors,
      failedApps: failedApps.map((f) => f.app),
    }
  );

  return { success: errors.length === 0, errors, failedApps, usedNewFlow: false };
}

/**
 * Revoke access from specific apps.
 * Sets user status to "inactive" or "expired" on those apps.
 */
export async function revokeAppAccess(
  email: string,
  apps: AppName[]
): Promise<{ success: boolean; errors: string[] }> {
  if (!ADMIN_KEY) {
    return { success: false, errors: ["ADMIN_API_KEY not configured"] };
  }

  const errors: string[] = [];

  // Check feature flag
  const unifiedAuthEnabled = isUnifiedAuthEnabled();

  if (unifiedAuthEnabled) {
    // Try to get central user for new flow
    const centralUser = await getCentralUser(email);
    const hasPasswordHash = centralUser?.exists && centralUser?.passwordHash;

    if (hasPasswordHash) {
      // Use new provisioning flow with entitledToThisApp: false
      console.log(
        `[revokeAppAccess] Using NEW flow with entitledToThisApp=false for ${email}`
      );

      const revokePromises = apps.map(async (app) => {
        const result = await withRetry(
          () =>
            provisionUserToApp(email, app, centralUser.passwordHash!, {
              name: centralUser.name,
              subscriptionStatus: "inactive",
              entitledToThisApp: false,
            }),
          `revoke ${app} for ${email}`
        );

        if (result.success) {
          return { app, success: true };
        } else {
          return { app, success: false, error: result.error };
        }
      });

      const results = await Promise.all(revokePromises);

      for (const result of results) {
        if (!result.success) {
          errors.push(`${result.app}: ${result.error}`);
        }
      }

      console.log(`App access revoke (NEW FLOW) for ${email}:`, {
        success: errors.length === 0,
        errors,
      });

      return { success: errors.length === 0, errors };
    }
  }

  // Fall back to legacy flow
  console.log(`[revokeAppAccess] Using LEGACY flow for ${email}`);

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);

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
        return {
          app,
          success: false,
          error: `Timeout after ${PROVISION_TIMEOUT_MS}ms`,
        };
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

  console.log(`App access revoke (LEGACY FLOW) for ${email}:`, {
    success: errors.length === 0,
    errors,
  });

  return { success: errors.length === 0, errors };
}

/**
 * Sync app access - grants newly added apps and revokes removed apps.
 * This is the main function to call when a user upgrades/downgrades their subscription.
 */
export async function syncAppAccess(
  email: string,
  newApps: AppName[],
  previousApps: AppName[],
  options?: {
    stripeCustomerId?: string | null;
    subscriptionId?: string | null;
  }
): Promise<{ success: boolean; errors: string[]; granted: AppName[]; revoked: AppName[] }> {
  const errors: string[] = [];

  // Apps to grant (in newApps but not in previousApps)
  const appsToGrant = newApps.filter((app) => !previousApps.includes(app));
  // Apps to revoke (in previousApps but not in newApps)
  const appsToRevoke = previousApps.filter((app) => !newApps.includes(app));

  console.log(`[syncAppAccess] Syncing app access for ${email}:`, {
    previous: previousApps,
    new: newApps,
    granting: appsToGrant,
    revoking: appsToRevoke,
  });

  if (appsToGrant.length > 0) {
    const grantResult = await grantAppAccess(email, appsToGrant, "active", options);
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

  return {
    success: errors.length === 0,
    errors,
    granted: appsToGrant,
    revoked: appsToRevoke,
  };
}
