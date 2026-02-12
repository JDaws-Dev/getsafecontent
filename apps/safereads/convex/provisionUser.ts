import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { checkHttpRateLimit, getClientIp, rateLimitedResponse } from "./httpRateLimit";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * HTTP endpoint to provision a user with authentication credentials from central auth.
 *
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to login with their central password.
 *
 * Rate limited: 10 requests per minute per IP (defense in depth).
 *
 * Usage: POST /provisionUser?key=YOUR_KEY
 * Body: {
 *   email: string,
 *   passwordHash: string,  // Scrypt hash from central auth
 *   name?: string,
 *   subscriptionStatus: string,
 *   subscriptionId?: string,
 *   stripeCustomerId?: string
 * }
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  // Rate limiting check (defense in depth - endpoint also requires admin key)
  const clientIp = getClientIp(request);
  const rateLimitResult = checkHttpRateLimit(
    `provisionUser:${clientIp}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );

  if (rateLimitResult.limited) {
    console.warn(`[provisionUser] Rate limited IP: ${clientIp}`);
    return rateLimitedResponse(rateLimitResult.retryAfter);
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: {
    email?: string;
    passwordHash?: string | null; // null for OAuth users
    name?: string | null;
    subscriptionStatus?: string;
    subscriptionId?: string | null;
    stripeCustomerId?: string | null;
    entitledToThisApp?: boolean;
    isOAuthUser?: boolean; // If true, skip authAccounts creation
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate required fields
  if (!body.email) {
    return new Response(JSON.stringify({ error: "Missing required field: email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // passwordHash is required UNLESS this is an OAuth user
  if (!body.passwordHash && !body.isOAuthUser) {
    return new Response(JSON.stringify({ error: "Missing required field: passwordHash (or set isOAuthUser: true)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await ctx.runMutation(internal.provisionUserInternal.provisionUserInternal, {
      email: body.email,
      passwordHash: body.isOAuthUser ? null : (body.passwordHash || null),
      name: body.name || null,
      subscriptionStatus: body.subscriptionStatus || "active",
      entitledToThisApp: body.entitledToThisApp !== false,
      stripeCustomerId: body.stripeCustomerId || null,
      subscriptionId: body.subscriptionId || null,
      isOAuthUser: body.isOAuthUser ?? false,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[provisionUser] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        provisioned: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
