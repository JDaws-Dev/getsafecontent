import { NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

/**
 * Promo Signup API
 *
 * Handles the final step of promo code signup:
 * 1. User already signed up via Convex Auth (done client-side)
 * 2. User already applied lifetime code via mutation (done client-side)
 * 3. This endpoint provisions access across all individual apps
 *
 * POST: Provision app access for the authenticated user
 */

// Admin key for authenticating with app admin endpoints
const ADMIN_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_KEY) {
  console.warn("ADMIN_API_KEY not set - promo provisioning will fail");
}

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
  timeoutMs: number = PROVISION_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper to provision access to a single app
async function provisionApp(
  email: string,
  app: AppName
): Promise<{ success: boolean; error?: string }> {
  if (!ADMIN_KEY) {
    return { success: false, error: "ADMIN_API_KEY not configured" };
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const endpoint = APP_ENDPOINTS[app];
  let url: string;

  if (app === "safetube") {
    // SafeTube uses setSubscriptionStatus
    url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=lifetime&key=${encodedKey}`;
  } else {
    // SafeTunes and SafeReads use grantLifetime
    url = `${endpoint}/grantLifetime?email=${encodedEmail}&key=${encodedKey}`;
  }

  try {
    const response = await fetchWithTimeout(url, PROVISION_TIMEOUT_MS);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, error: `HTTP ${response.status} - ${body}` };
    }
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: `Timeout after ${PROVISION_TIMEOUT_MS}ms` };
    }
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function POST(req: Request) {
  try {
    // Verify authentication
    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated. Please sign up first." },
        { status: 401 }
      );
    }

    // Get current user
    const user = await fetchQuery(
      api.accounts.getCurrentUser,
      {},
      { token }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please sign up first." },
        { status: 404 }
      );
    }

    // Verify user has lifetime status
    if (user.subscriptionStatus !== "lifetime") {
      return NextResponse.json(
        { error: "User does not have lifetime access. Please apply a valid promo code first." },
        { status: 400 }
      );
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Provision access to all apps in parallel
    const appsToProvision: AppName[] = (user.entitledApps as AppName[]) || ALL_APPS;
    const results = await Promise.all(
      appsToProvision.map(async (app: AppName) => {
        const result = await provisionApp(email, app);
        return { app, ...result };
      })
    );

    const failures = results.filter((r) => !r.success);
    const successes = results.filter((r) => r.success);

    console.log(`Promo provisioning for ${email}:`, {
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
    console.error("Promo signup error:", error);
    return NextResponse.json(
      { error: "Failed to complete promo signup. Please try again." },
      { status: 500 }
    );
  }
}
