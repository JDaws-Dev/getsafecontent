import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";
import { SignJWT, jwtVerify } from "jose";

const scrypt = new Scrypt();

// JWT configuration
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const JWT_ALGORITHM = "HS256";

// Simple in-memory rate limiting for auth endpoints
// Tracks attempts per IP address
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

function checkRateLimit(clientIp: string): {
  allowed: boolean;
  retryAfter?: number;
} {
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
 * Get the JWT secret from environment.
 * Falls back to ADMIN_KEY if JWT_SECRET is not set (for backwards compatibility).
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_KEY;
  if (!secret) {
    throw new Error("JWT_SECRET or ADMIN_KEY environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Login Endpoint - Public-facing authentication
 *
 * This endpoint is called directly by users (via app frontends) to authenticate.
 * Unlike /verifyCentralCredentials (which requires an admin key), this is public.
 *
 * POST /login
 * Body: {
 *   email: string,
 *   password: string
 * }
 *
 * Returns on success (200):
 * {
 *   success: true,
 *   token: string,        // JWT for subsequent API calls
 *   expiresAt: number,    // Unix timestamp when token expires
 *   user: {
 *     email: string,
 *     name: string | null,
 *     subscriptionStatus: string,
 *     entitledApps: string[]
 *   }
 * }
 *
 * Returns on invalid credentials (401):
 * { success: false, error: "Invalid email or password" }
 *
 * Returns on user needs password reset (403):
 * { success: false, error: "...", code: "PASSWORD_RESET_REQUIRED" }
 *
 * Returns on rate limit (429):
 * { success: false, error: "Too many requests..." }
 */
export const login = httpAction(async (ctx, request): Promise<Response> => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Rate limiting
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`login:${clientIp}`);
  if (!rateLimit.allowed) {
    console.warn(`[login] Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(rateLimit.retryAfter),
        },
      }
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
    // Look up user credentials using internal query
    const credentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      {
        email: email.toLowerCase().trim(),
      }
    );

    if (!credentials.exists) {
      // Don't reveal whether email exists for security
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email or password" }),
        { status: 401, headers }
      );
    }

    if (!credentials.hasPasswordAuth) {
      // User exists but uses OAuth, not password
      console.log(`[login] User ${email} has no password auth (OAuth only)`);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "This account uses Google sign-in. Please use the Google sign-in option.",
          code: "OAUTH_ONLY",
        }),
        { status: 401, headers }
      );
    }

    // Check if user needs password reset (migrated from BetterAuth)
    if (credentials.passwordHash?.startsWith("NEEDS_PASSWORD_RESET:")) {
      console.log(`[login] User needs password reset: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Please reset your password. Click 'Forgot password?' to receive a reset link.",
          code: "PASSWORD_RESET_REQUIRED",
        }),
        { status: 403, headers }
      );
    }

    // Verify password using Scrypt
    const isValidPassword = await scrypt.verify(
      credentials.passwordHash!,
      password
    );

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email or password" }),
        { status: 401, headers }
      );
    }

    // Generate JWT token
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + JWT_EXPIRY_SECONDS;

    const token = await new SignJWT({
      sub: credentials.userId as string,
      email: credentials.email,
      entitledApps: credentials.entitledApps || [],
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .setIssuer("getsafefamily.com")
      .sign(getJwtSecret());

    // Success - return JWT and user data
    console.log(`[login] Successful login for: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        expiresAt,
        user: {
          email: credentials.email,
          name: credentials.name || null,
          subscriptionStatus: credentials.subscriptionStatus || "trial",
          entitledApps: credentials.entitledApps || [],
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[login] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers }
    );
  }
});

/**
 * Verify Token Endpoint - Validate JWT and return user info
 *
 * This endpoint validates a JWT token and returns fresh user data from the database.
 * Apps use this to verify tokens on protected routes and refresh user data.
 *
 * GET /verifyToken?token=xxx
 *
 * Returns on success (200):
 * {
 *   valid: true,
 *   user: {
 *     id: string,
 *     email: string,
 *     name: string | null,
 *     subscriptionStatus: string,
 *     entitledApps: string[]
 *   },
 *   expiresAt: number  // Token expiration timestamp
 * }
 *
 * Returns on invalid/expired token (401):
 * { valid: false, error: "Token expired" | "Invalid token" }
 */
export const verifyToken = httpAction(async (ctx, request): Promise<Response> => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Get token from query params
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(
      JSON.stringify({ valid: false, error: "Token is required" }),
      { status: 400, headers }
    );
  }

  try {
    // Verify the JWT
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: "getsafefamily.com",
    });

    // Extract user ID from subject
    const userId = payload.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid token: missing subject" }),
        { status: 401, headers }
      );
    }

    // Get fresh user data from database
    const credentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      { email: payload.email as string }
    );

    if (!credentials.exists) {
      // User was deleted after token was issued
      return new Response(
        JSON.stringify({ valid: false, error: "User not found" }),
        { status: 401, headers }
      );
    }

    // Return fresh user data
    return new Response(
      JSON.stringify({
        valid: true,
        user: {
          id: credentials.userId,
          email: credentials.email,
          name: credentials.name || null,
          subscriptionStatus: credentials.subscriptionStatus || "trial",
          entitledApps: credentials.entitledApps || [],
        },
        expiresAt: payload.exp,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return new Response(
          JSON.stringify({ valid: false, error: "Token expired" }),
          { status: 401, headers }
        );
      }
      if (
        error.message.includes("signature") ||
        error.message.includes("invalid") ||
        error.message.includes("malformed")
      ) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid token" }),
          { status: 401, headers }
        );
      }
    }

    console.error("[verifyToken] Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Invalid token" }),
      { status: 401, headers }
    );
  }
});
