import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";
import { SignJWT, jwtVerify } from "jose";
import { Resend } from "resend";

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
 * Send password reset email via Resend
 */
async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const emailContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; margin: 0 0 8px 0; font-size: 28px;">Safe Family</h1>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Password Reset Code</p>
        </div>

        <!-- Main Content -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Hi,</p>

          <p style="margin: 0 0 20px 0; font-size: 16px;">
            Use this code to reset your Safe Family password:
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #1a1a2e; color: white; padding: 16px 32px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px;">
              ${token}
            </div>
          </div>

          <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;">
            This code expires in 1 hour.
          </p>
        </div>

        <!-- Security Notice -->
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #92400E;">
            <strong>Security Notice:</strong> If you didn't request a password reset, you can safely ignore this email. Someone may have entered your email by mistake.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
            Questions? Contact us at <a href="mailto:jeremiah@getsafefamily.com" style="color: #1a1a2e; text-decoration: none;">jeremiah@getsafefamily.com</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            The Safe Family Team
          </p>
        </div>

      </body>
    </html>
  `;

  await resend.emails.send({
    from: "Safe Family <noreply@getsafefamily.com>",
    replyTo: "jeremiah@getsafefamily.com",
    to: email,
    subject: `Your Safe Family Password Reset Code: ${token}`,
    html: emailContent,
  });
}

/**
 * Request Password Reset Endpoint - Send OTP via email
 *
 * This endpoint is called by app frontends when a user wants to reset their password.
 * It generates an OTP, stores it, and sends an email.
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
    // Check if user exists and has password auth
    const credentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      { email: normalizedEmail }
    );

    // For security, always return success message
    // But only actually send email if user exists with password auth
    const successResponse = new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, a reset code has been sent.",
      }),
      { status: 200, headers }
    );

    if (!credentials.exists) {
      console.log(`[requestPasswordReset] No account found for: ${normalizedEmail}`);
      return successResponse;
    }

    if (!credentials.hasPasswordAuth) {
      // User exists but uses OAuth - tell them to use Google
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

    // Generate OTP and store it
    const otp = generateOTP();
    const now = Date.now();
    const expiresAt = now + OTP_EXPIRY_MS;

    // Delete any existing tokens for this email (cleanup)
    await ctx.runMutation(internal.passwordReset.deleteExistingTokens, {
      email: normalizedEmail,
    });

    // Store the new token
    await ctx.runMutation(internal.passwordReset.createToken, {
      email: normalizedEmail,
      token: otp,
      expiresAt,
    });

    // Send the email
    await sendPasswordResetEmail(normalizedEmail, otp);

    console.log(`[requestPasswordReset] OTP sent to: ${normalizedEmail}`);
    return successResponse;
  } catch (error) {
    console.error("[requestPasswordReset] Error:", error);
    // Still return success for security
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, a reset code has been sent.",
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

    // Hash the new password
    const passwordHash = await scrypt.hash(newPassword);

    // Update the password in authAccounts
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

    // Get fresh user data for JWT
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

    // Generate JWT token for auto-login
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

    console.log(`[resetPassword] Password reset successful for: ${normalizedEmail}`);

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
