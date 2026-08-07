import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { hashPassword, validatePasswordStrength } from "@/lib/password";

// Admin key for authenticating with Convex endpoints
const ADMIN_KEY = process.env.ADMIN_API_KEY;

// Marketing site Convex HTTP endpoint - This is the CENTRAL auth hub
const CONVEX_ENDPOINT = "https://adamant-crow-705.convex.site";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/signup
 *
 * Creates a new central user account for Safe Family.
 * This creates both:
 * 1. A user record in the users table
 * 2. An authAccounts entry for Convex Auth password login
 *
 * The user can then log in with their email/password via Convex Auth.
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   name?: string,
 *   selectedApps?: string[],  // Apps user wants to subscribe to
 *   couponCode?: string       // Optional promo code
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   email: string,
 *   userId?: string,
 *   subscriptionStatus?: string,
 *   entitledApps?: string[],
 *   error?: string
 * }
 */
export async function POST(req: Request) {
  // Rate limit: 5 requests per minute per IP
  try {
    const rateLimitResult = await checkRateLimit("signup", req);
    if ("status" in rateLimitResult) {
      return rateLimitResult; // 429 response
    }
  } catch (rateLimitError) {
    // Log but don't fail the request if rate limiting fails
    console.error("[signup] Rate limit check failed:", rateLimitError);
  }

  try {
    const body = await req.json();
    const { email, password, name, selectedApps, couponCode } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if admin key is configured
    if (!ADMIN_KEY) {
      console.error("[signup] ADMIN_API_KEY not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate selectedApps if provided
    const validApps = ["safetunes", "safetube", "safereads", "safestudy"];
    if (selectedApps) {
      if (!Array.isArray(selectedApps)) {
        return NextResponse.json(
          { success: false, error: "selectedApps must be an array" },
          { status: 400 }
        );
      }
      if (!selectedApps.every((a: string) => validApps.includes(a))) {
        return NextResponse.json(
          { success: false, error: "selectedApps contains invalid app names" },
          { status: 400 }
        );
      }
    }

    // Hash password using Scrypt (same as Convex Auth)
    const passwordHash = await hashPassword(password);

    // Create user via Convex HTTP endpoint
    // Uses /createUserWithPassword which creates both users table entry AND authAccounts
    // This ensures the user can log in via /verifyCentralCredentials
    const response = await fetch(`${CONVEX_ENDPOINT}/createUserWithPassword`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || undefined,
        selectedApps: selectedApps || ["safetunes", "safetube", "safereads", "safestudy"],
      }),
    });

    const result = await response.json();

    // Handle user already exists
    if (response.status === 409 || result.code === "USER_EXISTS") {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists. Please sign in instead.",
          code: "USER_EXISTS",
        },
        { status: 409 }
      );
    }

    // Handle other errors
    if (!response.ok || !result.success) {
      console.error("[signup] Failed to create user:", result);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to create account. Please try again.",
        },
        { status: response.status >= 400 ? response.status : 400 }
      );
    }

    console.log(`[signup] Created central user successfully`);

    // Provision user to all individual app backends (trial access)
    // First app generates the family code, remaining apps reuse it
    const APP_ENDPOINTS: Record<string, string> = {
      safetunes: "https://formal-chihuahua-623.convex.site",
      safetube: "https://rightful-rabbit-333.convex.site",
      safereads: "https://exuberant-puffin-838.convex.site",
      safestudy: "https://strong-scorpion-227.convex.site",
    };

    const appsToProvision = selectedApps || ["safetunes", "safetube", "safereads", "safestudy"];
    const provisionResults: Record<string, string> = {};
    let sharedFamilyCode: string | null = null;

    // Provision sequentially: first app that has family codes generates one, rest reuse it
    for (const app of appsToProvision) {
      try {
        const endpoint = APP_ENDPOINTS[app];
        if (!endpoint) continue;
        const url = `${endpoint}/provisionUser?key=${encodeURIComponent(ADMIN_KEY)}`;
        const res: Response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            passwordHash,
            name: name?.trim() || null,
            subscriptionStatus: "trial",
            entitledToThisApp: true,
            ...(sharedFamilyCode ? { familyCode: sharedFamilyCode } : {}),
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          provisionResults[app] = "ok";
          // Grab the family code from the first successful provisioning
          if (!sharedFamilyCode) {
            try {
              const data = await res.json();
              if (data.familyCode) {
                sharedFamilyCode = data.familyCode;
                console.log(`[signup] Got shared familyCode from ${app}: ${sharedFamilyCode}`);
              }
            } catch { /* ignore parse errors */ }
          }
        } else {
          provisionResults[app] = `error:${res.status}`;
        }
      } catch (err) {
        provisionResults[app] = `failed:${err instanceof Error ? err.message : "unknown"}`;
      }
    }

    console.log("[signup] Provisioning results:", provisionResults);

    // Persist the unified family code on Marketing Central so future provisions
    // (bundle upgrades, Stripe webhooks) can pull it without drift.
    if (sharedFamilyCode) {
      try {
        await fetch(
          `${CONVEX_ENDPOINT}/syncFamilyCode?key=${encodeURIComponent(ADMIN_KEY)}` +
          `&email=${encodeURIComponent(normalizedEmail)}` +
          `&code=${encodeURIComponent(sharedFamilyCode)}`,
          { signal: AbortSignal.timeout(5000) }
        );
      } catch (err) {
        console.warn("[signup] Failed to cache familyCode on Marketing Central:", err);
      }
    }

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      userId: result.userId,
      provisioned: provisionResults,
    });
  } catch (error) {
    console.error("[signup] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
