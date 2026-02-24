import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";

const scrypt = new Scrypt();

// Simple in-memory rate limiting for auth endpoints
// Tracks attempts per IP address
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

function checkRateLimit(clientIp: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // First request or window expired - create new entry
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  entry.count++;
  return { allowed: true };
}

/**
 * HTTP endpoint to verify user credentials against central database.
 *
 * This endpoint is called by individual apps (SafeTunes, SafeTube, SafeReads)
 * to verify a user's email/password before creating a local session.
 *
 * Flow:
 * 1. App receives login request (email + password)
 * 2. App calls this endpoint to verify credentials
 * 3. If valid, app creates local user record + authAccounts entry
 * 4. App creates session using Convex Auth
 *
 * POST /verifyCentralCredentials
 * Headers: x-admin-key: ADMIN_KEY
 * Body: {
 *   email: string,
 *   password: string  // Plain text password to verify
 * }
 *
 * Returns on success (200):
 * {
 *   success: true,
 *   email: string,
 *   name: string | null,
 *   passwordHash: string,  // For creating local authAccounts entry
 *   entitledApps: string[],
 *   subscriptionStatus: string
 * }
 *
 * Returns on invalid credentials (401):
 * { success: false, error: "Invalid email or password" }
 *
 * Returns on user not found (404):
 * { success: false, error: "User not found" }
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Rate limiting
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`verifyCentralCredentials:${clientIp}`);
  if (!rateLimit.allowed) {
    console.warn(`[verifyCentralCredentials] Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ success: false, error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(rateLimit.retryAfter),
        }
      }
    );
  }

  // Verify admin key
  const adminKey = request.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_KEY;

  if (!expectedKey || adminKey !== expectedKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers }
    );
  }

  // Parse request body
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const { email, password } = body;

  // Validate inputs
  if (!email || typeof email !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "Email is required" }),
      { status: 400, headers }
    );
  }

  if (!password || typeof password !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "Password is required" }),
      { status: 400, headers }
    );
  }

  try {
    // Look up user in centralUsers table
    const user = await ctx.runQuery(internal.centralUsers.verifyCentralUserCredentials, {
      email: email.toLowerCase().trim(),
    });

    if (!user.exists) {
      // Don't reveal whether email exists for security
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email or password" }),
        { status: 401, headers }
      );
    }

    // Check if user needs password reset (migrated from BetterAuth or bcrypt)
    if (user.passwordHash?.startsWith("NEEDS_PASSWORD_RESET:")) {
      console.log(`[verifyCentralCredentials] User needs password reset: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please reset your password. Click 'Forgot password?' to receive a reset link.",
          code: "PASSWORD_RESET_REQUIRED",
        }),
        { status: 403, headers }
      );
    }

    // Verify password using Scrypt
    const isValidPassword = await scrypt.verify(user.passwordHash!, password);

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email or password" }),
        { status: 401, headers }
      );
    }

    // Success - return user data
    console.log(`[verifyCentralCredentials] Verified credentials for: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: user.email,
        name: user.name || null,
        passwordHash: user.passwordHash, // App needs this to create local authAccounts
        entitledApps: user.entitledApps || [],
        subscriptionStatus: user.subscriptionStatus || "trial",
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[verifyCentralCredentials] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers }
    );
  }
});
