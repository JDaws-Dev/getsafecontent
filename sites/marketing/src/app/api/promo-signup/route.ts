import { NextResponse } from "next/server";

/**
 * Promo Signup API
 *
 * Handles promo code signups that grant lifetime access.
 *
 * UNIFIED AUTH FLOW:
 * 1. Get user's passwordHash from centralUsers (via /getCentralUser)
 * 2. Call /provisionUser on each app with the hash
 *
 * This creates BOTH user records AND authAccounts entries,
 * allowing users to login immediately with their password.
 *
 * POST: Provision lifetime access for a new user with valid promo code
 */

// Valid lifetime promo codes (must match signup page)
const LIFETIME_CODES = ["DAWSFRIEND", "DEWITT"];

// Admin key for authenticating with app admin endpoints
const ADMIN_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_KEY) {
  console.warn("ADMIN_API_KEY not set - promo provisioning will fail");
}

// SafeReads endpoint (where centralUsers lives)
const SAFEREADS_ENDPOINT = "https://exuberant-puffin-838.convex.site";

// App admin endpoint URLs
type AppName = "safetunes" | "safetube" | "safereads";
const ALL_APPS: AppName[] = ["safetunes", "safetube", "safereads"];

const APP_ENDPOINTS: Record<AppName, string> = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
};

// Timeout for provisioning calls
const PROVISION_TIMEOUT_MS = 5000;

// Helper to fetch with timeout
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

// Get central user data including passwordHash
async function getCentralUser(
  email: string
): Promise<{
  exists: boolean;
  passwordHash?: string;
  name?: string;
  error?: string;
}> {
  if (!ADMIN_KEY) {
    return { exists: false, error: "ADMIN_API_KEY not configured" };
  }

  const encodedEmail = encodeURIComponent(email.toLowerCase());
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${SAFEREADS_ENDPOINT}/getCentralUser?email=${encodedEmail}&key=${encodedKey}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { exists: false, error: `HTTP ${response.status} - ${body}` };
    }
    const data = await response.json();
    return {
      exists: data.exists,
      passwordHash: data.passwordHash,
      name: data.name,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { exists: false, error: `Timeout after ${PROVISION_TIMEOUT_MS}ms` };
    }
    return {
      exists: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Helper to provision access to a single app via /provisionUser
async function provisionApp(
  email: string,
  passwordHash: string,
  name: string | undefined,
  app: AppName
): Promise<{ success: boolean; error?: string }> {
  if (!ADMIN_KEY) {
    return { success: false, error: "ADMIN_API_KEY not configured" };
  }

  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const endpoint = APP_ENDPOINTS[app];
  const url = `${endpoint}/provisionUser?key=${encodedKey}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase(),
          passwordHash,
          name: name || null,
          subscriptionStatus: "lifetime",
          entitledToThisApp: true,
        }),
      },
      PROVISION_TIMEOUT_MS
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, error: `HTTP ${response.status} - ${body}` };
    }
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: `Timeout after ${PROVISION_TIMEOUT_MS}ms` };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { email, promoCode } = body;

    // Validate required fields
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!promoCode || typeof promoCode !== "string") {
      return NextResponse.json(
        { error: "Promo code is required" },
        { status: 400 }
      );
    }

    // Validate promo code
    const normalizedCode = promoCode.trim().toUpperCase();
    if (!LIFETIME_CODES.includes(normalizedCode)) {
      return NextResponse.json(
        { error: "Invalid promo code" },
        { status: 400 }
      );
    }

    console.log(`[Promo Signup] Processing lifetime access for ${email} with code ${normalizedCode}`);

    // Step 1: Get the central user to retrieve their passwordHash
    // The user should have been created via /api/auth/signup before this call
    const centralUser = await getCentralUser(email);

    if (!centralUser.exists) {
      console.error(`[Promo Signup] Central user not found for ${email}:`, centralUser.error);
      return NextResponse.json(
        {
          error: "Account not found. Please sign up first.",
          details: centralUser.error,
        },
        { status: 404 }
      );
    }

    if (!centralUser.passwordHash) {
      console.error(`[Promo Signup] No passwordHash for ${email}`);
      return NextResponse.json(
        { error: "Account setup incomplete. Please contact support." },
        { status: 500 }
      );
    }

    console.log(`[Promo Signup] Found central user with passwordHash for ${email}`);

    // Step 2: Provision lifetime access to all apps with the passwordHash
    // This creates both user records AND authAccounts for login
    const results = await Promise.all(
      ALL_APPS.map(async (app: AppName) => {
        const result = await provisionApp(
          email,
          centralUser.passwordHash!,
          centralUser.name,
          app
        );
        return { app, ...result };
      })
    );

    const failures = results.filter((r) => !r.success);
    const successes = results.filter((r) => r.success);

    console.log(`[Promo Signup] Provisioning for ${email}:`, {
      code: normalizedCode,
      total: results.length,
      successes: successes.length,
      failures: failures.map((f) => `${f.app}: ${f.error}`),
    });

    if (failures.length > 0 && successes.length === 0) {
      // All failed
      return NextResponse.json(
        {
          error: "Failed to provision app access. Please contact support.",
          details: failures.map((f) => `${f.app}: ${f.error}`),
        },
        { status: 500 }
      );
    }

    // At least partial success
    return NextResponse.json({
      success: true,
      email,
      subscriptionStatus: "lifetime",
      provisioned: successes.map((s) => s.app),
      failed: failures.map((f) => f.app),
      message:
        failures.length > 0
          ? `Provisioned ${successes.length}/${results.length} apps. Some apps may need manual provisioning.`
          : "Lifetime access granted to all apps!",
    });
  } catch (error) {
    console.error("[Promo Signup] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete promo signup. Please try again." },
      { status: 500 }
    );
  }
}
