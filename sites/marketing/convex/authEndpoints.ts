import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";
import { SignJWT, jwtVerify } from "jose";

const scrypt = new Scrypt();

// OTP configuration
const OTP_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

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
 * Returns on incomplete signup (403):
 * { success: false, error: "...", code: "INCOMPLETE_SIGNUP" }
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

    // Check for incomplete signup (user exists but has no auth method at all)
    if (credentials.incompleteSignup) {
      console.log(`[login] Incomplete signup detected for: ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Your account setup is incomplete. Please click 'Forgot password?' to set your password and complete your account.",
          code: "INCOMPLETE_SIGNUP",
        }),
        { status: 403, headers }
      );
    }

    // Check if user uses OAuth (Google sign-in)
    if (!credentials.hasPasswordAuth && credentials.hasOAuthAuth) {
      console.log(`[login] User ${email} uses OAuth (Google sign-in)`);
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

    if (!credentials.hasPasswordAuth) {
      // Shouldn't happen - but just in case
      console.log(`[login] User ${email} has no auth method`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid email or password",
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
      // Unified family code on the token so every app gets the authoritative
      // code straight from the signed login — no reliance on a side-channel
      // sync that can drift (see docs/UNIFIED-IDENTITY.md). Omitted if unset.
      familyCode: credentials.familyCode ?? undefined,
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

/**
 * Generate a random 6-digit OTP code
 */
function generateOTP(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return otp;
}

/**
 * Request Password Reset Endpoint - Send OTP via email
 *
 * This endpoint is called by app frontends when a user wants to reset their password.
 * It generates an OTP, stores it, and sends an email.
 *
 * For users with incomplete signups (no authAccount), this allows them to set their
 * initial password. The password will be set via the /completeSignup endpoint.
 *
 * POST /requestPasswordReset
 * Body: { email: string }
 *
 * Returns on success (200):
 * { success: true, message: "If an account exists, a reset code has been sent." }
 *
 * Always returns success for security (don't reveal if email exists)
 *
 * Returns on OAuth-only user (200 with code):
 * { success: false, code: "OAUTH_ONLY", error: "This account uses Google sign-in." }
 *
 * Returns on rate limit (429):
 * { success: false, error: "Too many requests..." }
 */
export const requestPasswordReset = httpAction(async (ctx, request): Promise<Response> => {
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

  // Rate limiting - stricter for password reset (5 per minute per IP)
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`passwordReset:${clientIp}`);
  if (!rateLimit.allowed) {
    console.warn(`[requestPasswordReset] Rate limit exceeded for IP: ${clientIp}`);
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
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const { email } = body;

  if (!email || typeof email !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "Email is required" }),
      { status: 400, headers }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if user exists
    console.log(`[requestPasswordReset] Looking up: ${normalizedEmail}`);
    const credentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      { email: normalizedEmail }
    );
    console.log(`[requestPasswordReset] Credentials: exists=${credentials.exists}, hasPasswordAuth=${credentials.hasPasswordAuth}, hasOAuthAuth=${credentials.hasOAuthAuth}, incompleteSignup=${credentials.incompleteSignup}`);

    if (!credentials.exists) {
      console.log(`[requestPasswordReset] No account found for: ${normalizedEmail}`);
      // Return success to not reveal if email exists
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with this email, a password reset code has been sent.",
        }),
        { status: 200, headers }
      );
    }

    // Check if user uses OAuth (can't reset password for OAuth users)
    if (!credentials.hasPasswordAuth && credentials.hasOAuthAuth) {
      console.log(`[requestPasswordReset] OAuth-only account: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({
          success: false,
          code: "OAUTH_ONLY",
          error: "This account uses Google sign-in. Please use the Google sign-in option instead.",
        }),
        { status: 200, headers }
      );
    }

    // For incomplete signups OR existing password users, allow password reset
    // This enables incomplete signups to set their initial password
    const isIncompleteSignup = credentials.incompleteSignup === true;
    if (isIncompleteSignup) {
      console.log(`[requestPasswordReset] Incomplete signup - will allow setting initial password: ${normalizedEmail}`);
    }

    // Generate OTP and store it
    console.log(`[requestPasswordReset] Generating OTP for ${normalizedEmail}`);
    const otp = generateOTP();
    const now = Date.now();
    const expiresAt = now + OTP_EXPIRY_MS;

    // Delete any existing tokens for this email (cleanup)
    console.log(`[requestPasswordReset] Deleting existing tokens`);
    let deleteResult;
    try {
      deleteResult = await ctx.runMutation(internal.passwordReset.deleteExistingTokens, {
        email: normalizedEmail,
      });
      console.log(`[requestPasswordReset] Deleted ${deleteResult?.deleted || 0} tokens`);
    } catch (deleteErr) {
      console.error(`[requestPasswordReset] Delete failed:`, deleteErr);
    }

    // Store the new token (include flag if this is for completing signup)
    console.log(`[requestPasswordReset] Creating new token: ${otp}`);
    let createResult;
    try {
      createResult = await ctx.runMutation(internal.passwordReset.createToken, {
        email: normalizedEmail,
        token: otp,
        expiresAt,
      });
      console.log(`[requestPasswordReset] Token created: ${createResult?.tokenId}`);
    } catch (createErr) {
      console.error(`[requestPasswordReset] Create failed:`, createErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create reset token" }),
        { status: 500, headers }
      );
    }

    // Send email via internal action
    console.log(`[requestPasswordReset] Sending email to: ${normalizedEmail}`);
    let emailSent = false;
    let emailError = "";

    try {
      const emailResult = await ctx.runAction(internal.emails.sendPasswordResetEmail, {
        email: normalizedEmail,
        otp,
      });

      if (emailResult.success) {
        emailSent = true;
        console.log(`[requestPasswordReset] Email sent! ID: ${emailResult.emailId}`);
      } else {
        emailError = emailResult.error || "Unknown error";
        console.error(`[requestPasswordReset] Email failed: ${emailError}`);
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Send failed";
      console.error(`[requestPasswordReset] Email exception: ${emailError}`);
    }

    // Return success (always return same message for security)
    console.log(`[requestPasswordReset] Complete: emailSent=${emailSent}, tokenId=${createResult?.tokenId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, a password reset code has been sent.",
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[requestPasswordReset] Error:", error);
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, a password reset code has been sent.",
      }),
      { status: 200, headers }
    );
  }
});

/**
 * Reset Password Endpoint - Verify OTP and set new password
 *
 * This endpoint verifies the OTP and updates the user's password.
 * On success, it returns a JWT token so the user is automatically logged in.
 *
 * For users with incomplete signups, this creates the authAccount entry.
 *
 * POST /resetPassword
 * Body: {
 *   email: string,
 *   code: string,        // 6-digit OTP
 *   newPassword: string
 * }
 *
 * Returns on success (200):
 * {
 *   success: true,
 *   token: string,        // JWT for auto-login
 *   expiresAt: number,
 *   user: { email, name, subscriptionStatus, entitledApps }
 * }
 *
 * Returns on invalid/expired code (400):
 * { success: false, error: "Invalid or expired reset code" }
 *
 * Returns on rate limit (429):
 * { success: false, error: "Too many requests..." }
 */
export const resetPassword = httpAction(async (ctx, request): Promise<Response> => {
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
  const rateLimit = checkRateLimit(`resetPassword:${clientIp}`);
  if (!rateLimit.allowed) {
    console.warn(`[resetPassword] Rate limit exceeded for IP: ${clientIp}`);
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
  let body: { email?: string; code?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const { email, code, newPassword } = body;

  // Validate inputs
  if (!email || typeof email !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "Email is required" }),
      { status: 400, headers }
    );
  }

  if (!code || typeof code !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "Reset code is required" }),
      { status: 400, headers }
    );
  }

  if (!newPassword || typeof newPassword !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "New password is required" }),
      { status: 400, headers }
    );
  }

  if (newPassword.length < 8) {
    return new Response(
      JSON.stringify({ success: false, error: "Password must be at least 8 characters" }),
      { status: 400, headers }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = code.trim();

  try {
    // Verify the OTP
    const tokenResult = await ctx.runMutation(internal.passwordReset.verifyAndConsumeToken, {
      email: normalizedEmail,
      token: normalizedCode,
    });

    if (!tokenResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: tokenResult.error || "Invalid or expired reset code",
        }),
        { status: 400, headers }
      );
    }

    // Check if this is an incomplete signup
    const credentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      { email: normalizedEmail }
    );

    if (!credentials.exists) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers }
      );
    }

    // Hash the new password
    const passwordHash = await scrypt.hash(newPassword);

    // Handle incomplete signup vs existing password reset
    if (credentials.incompleteSignup) {
      // Create authAccount for incomplete signup
      console.log(`[resetPassword] Completing incomplete signup for: ${normalizedEmail}`);
      const completeResult = await ctx.runMutation(
        internal.signupInternal.completeIncompleteSignup,
        {
          email: normalizedEmail,
          passwordHash,
        }
      );

      if (!completeResult.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: completeResult.message || "Failed to complete account setup",
          }),
          { status: 500, headers }
        );
      }
    } else {
      // Normal password update for existing user
      const updateResult = await ctx.runMutation(internal.signupInternal.updatePassword, {
        email: normalizedEmail,
        passwordHash,
      });

      if (!updateResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update password" }),
          { status: 500, headers }
        );
      }
    }

    // Get fresh user data for JWT
    const freshCredentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      { email: normalizedEmail }
    );

    if (!freshCredentials.exists) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers }
      );
    }

    // Generate JWT token for auto-login
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + JWT_EXPIRY_SECONDS;

    const token = await new SignJWT({
      sub: freshCredentials.userId as string,
      email: freshCredentials.email,
      entitledApps: freshCredentials.entitledApps || [],
      // Unified family code on the token (see docs/UNIFIED-IDENTITY.md).
      familyCode: freshCredentials.familyCode ?? undefined,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .setIssuer("getsafefamily.com")
      .sign(getJwtSecret());

    console.log(`[resetPassword] Password reset successful for: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        expiresAt,
        user: {
          email: freshCredentials.email,
          name: freshCredentials.name || null,
          subscriptionStatus: freshCredentials.subscriptionStatus || "trial",
          entitledApps: freshCredentials.entitledApps || [],
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[resetPassword] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers }
    );
  }
});

/**
 * Generate JWT for OAuth User Endpoint
 *
 * This endpoint is called after a user authenticates via Google OAuth.
 * It generates a JWT token for the user without requiring password verification.
 *
 * POST /generateOAuthToken
 * Body: { email: string }
 * Header: x-admin-key: ADMIN_KEY (required for security)
 *
 * Returns on success (200):
 * {
 *   success: true,
 *   token: string,
 *   expiresAt: number,
 *   user: { email, name, subscriptionStatus, entitledApps }
 * }
 *
 * This endpoint is used by the OAuth flow to convert a Convex Auth session
 * into a JWT that can be used across all Safe Family apps.
 */
export const generateOAuthToken = httpAction(async (ctx, request): Promise<Response> => {
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

  // Verify admin key (required since this bypasses password verification)
  const adminKey = request.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_KEY;
  if (!expectedKey || adminKey !== expectedKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers }
    );
  }

  // Parse request body
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers }
    );
  }

  const { email } = body;

  if (!email || typeof email !== "string") {
    return new Response(
      JSON.stringify({ success: false, error: "Email is required" }),
      { status: 400, headers }
    );
  }

  try {
    // Get user credentials from database
    const credentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      { email: email.toLowerCase().trim() }
    );

    if (!credentials.exists) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers }
      );
    }

    // Generate JWT token
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + JWT_EXPIRY_SECONDS;

    const token = await new SignJWT({
      sub: credentials.userId as string,
      email: credentials.email,
      entitledApps: credentials.entitledApps || [],
      // Unified family code on the token so every app gets the authoritative
      // code straight from the signed login — no reliance on a side-channel
      // sync that can drift (see docs/UNIFIED-IDENTITY.md). Omitted if unset.
      familyCode: credentials.familyCode ?? undefined,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .setIssuer("getsafefamily.com")
      .sign(getJwtSecret());

    console.log(`[generateOAuthToken] Generated JWT for OAuth user: ${email}`);

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
    console.error("[generateOAuthToken] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers }
    );
  }
});
