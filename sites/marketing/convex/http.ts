import { httpRouter } from "convex/server";
import { httpAction, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import verifyCentralCredentials from "./verifyCentralCredentials";
import { verifyToken, resetPassword, generateOAuthToken } from "./authEndpoints";
import { Scrypt } from "lucia";
import { SignJWT } from "jose";
import { v } from "convex/values";

const scrypt = new Scrypt();
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const OTP_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Public action to process password reset
 * This is defined here to ensure it's bundled with http.ts
 * Must be public (not internal) for httpAction to call via api.xxx
 */
export const processPasswordResetAction = action({
  args: {
    email: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    emailSent?: boolean;
    error?: string;
    code?: string;
  }> => {
    const email = args.email.toLowerCase().trim();
    console.log(`[processPasswordResetAction] Processing for: ${email}`);

    // Get user credentials
    const credentials = await ctx.runQuery(
      internal.signupInternal.getUserCredentials,
      { email }
    );

    console.log(
      `[processPasswordResetAction] Credentials: exists=${credentials.exists}, hasPasswordAuth=${credentials.hasPasswordAuth}`
    );

    if (!credentials.exists) {
      console.log(`[processPasswordResetAction] No user found for: ${email}`);
      return { success: true, emailSent: false };
    }

    // Check if user uses OAuth
    if (!credentials.hasPasswordAuth && credentials.hasOAuthAuth) {
      console.log(`[processPasswordResetAction] OAuth-only account: ${email}`);
      return {
        success: false,
        code: "OAUTH_ONLY",
        error:
          "This account uses Google sign-in. Please use the Google sign-in option instead.",
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const now = Date.now();
    const expiresAt = now + OTP_EXPIRY_MS;

    // Delete existing tokens
    try {
      await ctx.runMutation(internal.passwordReset.deleteExistingTokens, {
        email,
      });
    } catch (err) {
      console.error(`[processPasswordResetAction] Delete tokens failed:`, err);
    }

    // Create new token
    try {
      await ctx.runMutation(internal.passwordReset.createToken, {
        email,
        token: otp,
        expiresAt,
      });
    } catch (err) {
      console.error(`[processPasswordResetAction] Create token failed:`, err);
      return { success: false, error: "Failed to create reset token" };
    }

    // Send email
    const emailResult = await ctx.runAction(
      internal.emails.sendPasswordResetEmail,
      { email, otp }
    );

    if (!emailResult.success) {
      console.error(`[processPasswordResetAction] Email failed: ${emailResult.error}`);
      return {
        success: false,
        error: "Failed to send password reset email. Please try again later.",
      };
    }

    console.log(`[processPasswordResetAction] Email sent successfully`);
    return { success: true, emailSent: true };
  },
});

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_KEY;
  if (!secret) {
    throw new Error("JWT_SECRET or ADMIN_KEY environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

const http = httpRouter();

// Convex Auth routes - handles /api/auth/* endpoints
auth.addHttpRoutes(http);

/**
 * Login Endpoint - Inline implementation to bypass bundler caching issues
 */
http.route({
  path: "/login",
  method: "POST",
  handler: httpAction(async (ctx, request): Promise<Response> => {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Api-Version": "14",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
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

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Use ACTION to bypass database caching in httpActions
      // Actions run in a separate Node.js environment with fresh database access
      const loginResult = await ctx.runAction(api.loginHelper.performLogin, {
        email: normalizedEmail,
        password,
      });

      // Check result from the action
      if (!loginResult.success) {
        // Map action error codes to HTTP responses
        switch (loginResult.error) {
          case "USER_NOT_FOUND":
          case "INVALID_PASSWORD":
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid email or password",
              }),
              { status: 401, headers }
            );
          case "OAUTH_ONLY":
            return new Response(
              JSON.stringify({
                success: false,
                error: "This account uses Google sign-in. Please use the Google sign-in option.",
                code: "OAUTH_ONLY",
              }),
              { status: 401, headers }
            );
          case "INCOMPLETE_SIGNUP":
            return new Response(
              JSON.stringify({
                success: false,
                error: "Please complete your account setup by clicking 'Forgot password?'.",
                code: "INCOMPLETE_SIGNUP",
              }),
              { status: 403, headers }
            );
          case "PASSWORD_RESET_REQUIRED":
            return new Response(
              JSON.stringify({
                success: false,
                error: "Please reset your password by clicking 'Forgot password?'.",
                code: "PASSWORD_RESET_REQUIRED",
              }),
              { status: 403, headers }
            );
          default:
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid email or password",
              }),
              { status: 401, headers }
            );
        }
      }

      // Generate JWT token
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + JWT_EXPIRY_SECONDS;

      const token = await new SignJWT({
        sub: loginResult.userId,
        email: loginResult.email,
        entitledApps: loginResult.entitledApps || [],
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(now)
        .setExpirationTime(expiresAt)
        .setIssuer("getsafefamily.com")
        .sign(getJwtSecret());

      return new Response(
        JSON.stringify({
          success: true,
          token,
          expiresAt,
          user: {
            email: loginResult.email,
            name: loginResult.name || null,
            subscriptionStatus: loginResult.subscriptionStatus || "trial",
            entitledApps: loginResult.entitledApps || [],
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
  }),
});

http.route({
  path: "/login",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Verify Token Endpoint - Validate JWT and return user info
 *
 * This endpoint validates a JWT token and returns fresh user data from the database.
 * Apps use this to verify tokens on protected routes and refresh user data.
 *
 * GET /verifyToken?token=xxx
 *
 * Returns:
 * - valid: true/false
 * - user info (id, email, name, subscriptionStatus, entitledApps)
 * - Token expiration timestamp
 */
http.route({
  path: "/verifyToken",
  method: "GET",
  handler: verifyToken,
});

http.route({
  path: "/verifyToken",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Request Password Reset Endpoint - Inline implementation to bypass bundler issues
 *
 * IMPORTANT: This endpoint uses an internal action (processPasswordResetAction)
 * to handle the actual work. Actions run in a separate Node.js environment with
 * fresh database access, bypassing the httpAction database visibility issues.
 *
 * POST /requestPasswordReset
 * Body: { email: string }
 */
http.route({
  path: "/requestPasswordReset",
  method: "POST",
  handler: httpAction(async (ctx, request): Promise<Response> => {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Api-Version": "5",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
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
      // Use action to process password reset
      // Actions run with fresh database access, bypassing httpAction isolation issues
      console.log(`[requestPasswordReset] Calling processPasswordResetAction for: ${normalizedEmail}`);
      let result;
      try {
        result = await ctx.runAction(api.http.processPasswordResetAction, {
          email: normalizedEmail,
        });
      } catch (actionErr) {
        console.error("[requestPasswordReset] Action call failed:", actionErr);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Password reset service temporarily unavailable.",
          }),
          { status: 500, headers }
        );
      }

      console.log(`[requestPasswordReset] Action result:`, result);

      // Handle OAuth-only accounts
      if (!result.success && result.code === "OAUTH_ONLY") {
        return new Response(
          JSON.stringify({
            success: false,
            code: "OAUTH_ONLY",
            error: result.error,
          }),
          { status: 200, headers }
        );
      }

      // Handle errors
      if (!result.success && result.error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error,
          }),
          { status: 500, headers }
        );
      }

      // Success (whether email was sent or not - we don't reveal if user exists)
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
          success: false,
          error: "An error occurred. Please try again later.",
        }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/requestPasswordReset",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Reset Password Endpoint - Verify OTP and set new password
 *
 * This endpoint verifies the OTP and updates the user's password.
 * On success, it returns a JWT token so the user is automatically logged in.
 *
 * POST /resetPassword
 * Body: { email: string, code: string, newPassword: string }
 *
 * Returns:
 * - JWT token on successful reset (auto-login)
 * - User info (email, name, subscriptionStatus, entitledApps)
 */
http.route({
  path: "/resetPassword",
  method: "POST",
  handler: resetPassword,
});

http.route({
  path: "/resetPassword",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Generate OAuth Token Endpoint
 *
 * Generates a JWT for a user who authenticated via Google OAuth.
 * Called by the /oauth page after successful OAuth authentication.
 *
 * POST /generateOAuthToken
 * Header: x-admin-key: ADMIN_KEY
 * Body: { email: string }
 *
 * Returns:
 * - JWT token for the OAuth user
 * - User info (email, name, subscriptionStatus, entitledApps)
 */
http.route({
  path: "/generateOAuthToken",
  method: "POST",
  handler: generateOAuthToken,
});

http.route({
  path: "/generateOAuthToken",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      },
    });
  }),
});

/**
 * Verify Central Credentials Endpoint
 *
 * This is the CENTRAL authentication endpoint for all Safe Family apps.
 * SafeTunes, SafeTube, and SafeReads call this to verify user credentials
 * before creating local sessions.
 *
 * POST /verifyCentralCredentials
 * Headers: x-admin-key: ADMIN_KEY
 * Body: { email: string, password: string }
 */
http.route({
  path: "/verifyCentralCredentials",
  method: "POST",
  handler: verifyCentralCredentials,
});

http.route({
  path: "/verifyCentralCredentials",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      },
    });
  }),
});

/**
 * Verify App Access Endpoint
 *
 * This endpoint is called by individual apps (SafeTunes, SafeTube, SafeReads)
 * to verify if a user has access to their app.
 *
 * GET /verifyAppAccess?email=user@example.com&app=safetunes&key=API_KEY
 *
 * Returns:
 * {
 *   hasAccess: boolean,
 *   reason: string,
 *   subscriptionStatus: string | null,
 *   trialExpiresAt: number | undefined,
 *   userName: string | undefined,
 *   userId: string | undefined,
 *   onboardingCompleted: boolean
 * }
 */
http.route({
  path: "/verifyAppAccess",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const app = url.searchParams.get("app") as "safetunes" | "safetube" | "safereads" | null;
    const key = url.searchParams.get("key");

    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers }
      );
    }

    if (!app || !["safetunes", "safetube", "safereads"].includes(app)) {
      return new Response(
        JSON.stringify({ error: "Valid app parameter required (safetunes, safetube, safereads)" }),
        { status: 400, headers }
      );
    }

    try {
      const result = await ctx.runQuery(api.accounts.verifyAppAccess, { email, app });
      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      console.error("[verifyAppAccess] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

/**
 * Grant Lifetime Access Endpoint
 *
 * Admin endpoint to grant lifetime access to a user.
 *
 * GET /grantLifetime?email=user@example.com&key=API_KEY&apps=safetunes,safetube
 */
http.route({
  path: "/grantLifetime",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const key = url.searchParams.get("key");
    const appsParam = url.searchParams.get("apps"); // Comma-separated list

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers }
      );
    }

    if (!key) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers }
      );
    }

    try {
      // Parse apps if provided
      let apps: ("safetunes" | "safetube" | "safereads")[] | undefined;
      if (appsParam) {
        const validApps = ["safetunes", "safetube", "safereads"];
        apps = appsParam
          .split(",")
          .map((a) => a.trim().toLowerCase())
          .filter((a) => validApps.includes(a)) as typeof apps;
      }

      const result = await ctx.runMutation(api.accounts.grantLifetimeAccess, {
        email,
        adminKey: key,
        apps,
      });

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      const status = message === "Unauthorized" ? 401 : 500;
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers }
      );
    }
  }),
});

/**
 * Update Subscription Endpoint
 *
 * Called by Stripe webhook or admin to update subscription status.
 *
 * POST /updateSubscription
 * Body: { email, subscriptionStatus, stripeCustomerId?, stripeSubscriptionId?, ... }
 * Header: x-admin-key: API_KEY
 */
http.route({
  path: "/updateSubscription",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      "Content-Type": "application/json",
    };

    // Verify API key from header
    const key = request.headers.get("x-admin-key");
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const body = await request.json();

      if (!body.email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers }
        );
      }

      if (!body.subscriptionStatus) {
        return new Response(
          JSON.stringify({ error: "subscriptionStatus is required" }),
          { status: 400, headers }
        );
      }

      // Validate subscription status
      const validStatuses = ["trial", "active", "lifetime", "canceled", "past_due", "incomplete", "expired"];
      if (!validStatuses.includes(body.subscriptionStatus)) {
        return new Response(
          JSON.stringify({ error: `Invalid subscriptionStatus. Must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers }
        );
      }

      // Validate entitled apps if provided
      if (body.entitledApps) {
        const validApps = ["safetunes", "safetube", "safereads"];
        if (!Array.isArray(body.entitledApps) || !body.entitledApps.every((a: string) => validApps.includes(a))) {
          return new Response(
            JSON.stringify({ error: "entitledApps must be an array of valid app names" }),
            { status: 400, headers }
          );
        }
      }

      const result = await ctx.runMutation(api.accounts.updateSubscription, {
        email: body.email,
        subscriptionStatus: body.subscriptionStatus,
        stripeCustomerId: body.stripeCustomerId,
        stripeSubscriptionId: body.stripeSubscriptionId,
        subscriptionEndsAt: body.subscriptionEndsAt,
        billingInterval: body.billingInterval,
        entitledApps: body.entitledApps,
        stripeEventId: body.stripeEventId,
      });

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[updateSubscription] Error:", error);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers }
      );
    }
  }),
});

/**
 * Get Account Endpoint
 *
 * Get account details by email.
 *
 * GET /getAccount?email=user@example.com&key=API_KEY
 */
http.route({
  path: "/getAccount",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers }
      );
    }

    try {
      const result = await ctx.runQuery(api.accounts.getAccountByEmail, { email });

      if (!result) {
        return new Response(
          JSON.stringify({ error: "Account not found" }),
          { status: 404, headers }
        );
      }

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      console.error("[getAccount] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

/**
 * Admin Dashboard Endpoint
 *
 * Get overview of all accounts.
 *
 * GET /adminDashboard?key=API_KEY&format=json
 */
http.route({
  path: "/adminDashboard",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const format = url.searchParams.get("format") || "json";

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      // Get all users
      const users = await ctx.runQuery(api.accounts.getAllAccounts, {});

      type User = (typeof users)[number];
      const stats = {
        totalAccounts: users.length,
        byStatus: {
          trial: users.filter((u: User) => u.subscriptionStatus === "trial").length,
          active: users.filter((u: User) => u.subscriptionStatus === "active").length,
          lifetime: users.filter((u: User) => u.subscriptionStatus === "lifetime").length,
          canceled: users.filter((u: User) => u.subscriptionStatus === "canceled").length,
          expired: users.filter((u: User) => u.subscriptionStatus === "expired").length,
        },
        users: users.map((u: User) => ({
          email: u.email,
          name: u.name,
          status: u.subscriptionStatus,
          entitledApps: u.entitledApps,
          createdAt: u.createdAt,
          trialExpiresAt: u.trialExpiresAt,
        })),
      };

      return new Response(JSON.stringify(stats), { status: 200, headers });
    } catch (error) {
      console.error("[adminDashboard] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

/**
 * Migration Status Endpoint
 *
 * Shows users needing password reset (BetterAuth migration status).
 *
 * GET /migrationStatus?key=API_KEY
 */
http.route({
  path: "/migrationStatus",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const { internal } = await import("./_generated/api");

      const status = await ctx.runQuery(internal.signupInternal.getMigrationStatus, {});

      return new Response(JSON.stringify(status), { status: 200, headers });
    } catch (error) {
      console.error("[migrationStatus] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/migrationStatus",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Delete User Endpoint
 *
 * Admin endpoint to delete a user account.
 *
 * GET /deleteUser?email=user@example.com&key=API_KEY
 */
http.route({
  path: "/deleteUser",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const key = url.searchParams.get("key");
    const reason = url.searchParams.get("reason") || "Admin deletion";

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers }
      );
    }

    try {
      // First get the user to find their ID
      const user = await ctx.runQuery(api.accounts.getAccountByEmail, { email });

      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers }
        );
      }

      // Delete the user
      const result = await ctx.runMutation(api.accounts.deleteAccount, {
        userId: user.id,
        reason,
      });

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[deleteUser] Error:", error);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers }
      );
    }
  }),
});

// Handle CORS preflight requests
http.route({
  path: "/verifyAppAccess",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/grantLifetime",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/updateSubscription",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      },
    });
  }),
});

http.route({
  path: "/getAccount",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/adminDashboard",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/deleteUser",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Run Migration Endpoint
 *
 * Runs the grandfather migration for existing users.
 *
 * GET /runMigration?key=API_KEY&dryRun=true
 */
http.route({
  path: "/runMigration",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const dryRun = url.searchParams.get("dryRun") === "true";

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (!key) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers }
      );
    }

    try {
      const result = await ctx.runAction(api.migrations.runMigration, {
        adminKey: key,
        dryRun,
      });

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[runMigration] Error:", error);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers }
      );
    }
  }),
});

/**
 * Get Migration Report Endpoint
 *
 * Shows migration status and grandfathered users.
 *
 * GET /migrationReport?key=API_KEY
 */
http.route({
  path: "/migrationReport",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (!key) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers }
      );
    }

    try {
      const result = await ctx.runMutation(api.migrations.getMigrationReport, {
        adminKey: key,
      });

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[migrationReport] Error:", error);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/runMigration",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/migrationReport",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Create User with Password Endpoint
 *
 * Creates a new user account with email/password authentication.
 * This creates both the users table entry AND the authAccounts entry
 * so the user can log in with Convex Auth.
 *
 * POST /createUserWithPassword
 * Header: x-admin-key: API_KEY
 * Body: {
 *   email: string,
 *   passwordHash: string,  // Scrypt hash from lucia
 *   name?: string,
 *   selectedApps?: string[],
 *   couponCode?: string
 * }
 */
http.route({
  path: "/createUserWithPassword",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      "Content-Type": "application/json",
    };

    // Verify API key from header
    const key = request.headers.get("x-admin-key");
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const body = await request.json();

      // Validate required fields
      if (!body.email || typeof body.email !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Email is required" }),
          { status: 400, headers }
        );
      }

      if (!body.passwordHash || typeof body.passwordHash !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Password hash is required" }),
          { status: 400, headers }
        );
      }

      // Validate selectedApps if provided
      const validApps = ["safetunes", "safetube", "safereads"];
      if (body.selectedApps) {
        if (!Array.isArray(body.selectedApps)) {
          return new Response(
            JSON.stringify({ success: false, error: "selectedApps must be an array" }),
            { status: 400, headers }
          );
        }
        if (!body.selectedApps.every((a: string) => validApps.includes(a))) {
          return new Response(
            JSON.stringify({ success: false, error: "selectedApps contains invalid app names" }),
            { status: 400, headers }
          );
        }
      }

      // Import the internal mutation dynamically to avoid circular imports
      const { internal } = await import("./_generated/api");

      const result = await ctx.runMutation(internal.signupInternal.createUserWithPassword, {
        email: body.email,
        passwordHash: body.passwordHash,
        name: body.name,
        selectedApps: body.selectedApps,
        couponCode: body.couponCode,
      });

      // Return appropriate status code based on result
      if (!result.success && result.error === "USER_EXISTS") {
        return new Response(JSON.stringify(result), { status: 409, headers });
      }

      return new Response(JSON.stringify(result), {
        status: result.success ? 201 : 400,
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[createUserWithPassword] Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/createUserWithPassword",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      },
    });
  }),
});

/**
 * Check User Exists Endpoint
 *
 * Checks if a user with the given email exists.
 *
 * GET /checkUserExists?email=user@example.com&key=API_KEY
 */
http.route({
  path: "/checkUserExists",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers }
      );
    }

    try {
      const { internal } = await import("./_generated/api");

      const result = await ctx.runQuery(internal.signupInternal.checkUserExists, {
        email,
      });

      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error("[checkUserExists] Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/checkUserExists",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Add Auth Account Endpoint
 *
 * Adds an authAccount to an existing user who doesn't have one.
 * Used to fix users who were migrated without auth credentials.
 *
 * POST /addAuthAccount
 * Header: x-admin-key: API_KEY
 * Body: { email, passwordHash }
 */
http.route({
  path: "/addAuthAccount",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      "Content-Type": "application/json",
    };

    // Verify API key from header
    const key = request.headers.get("x-admin-key");
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const body = await request.json();

      if (!body.email || typeof body.email !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Email is required" }),
          { status: 400, headers }
        );
      }

      if (!body.passwordHash || typeof body.passwordHash !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Password hash is required" }),
          { status: 400, headers }
        );
      }

      const { internal } = await import("./_generated/api");

      const result = await ctx.runMutation(internal.signupInternal.addAuthAccountToExistingUser, {
        email: body.email,
        passwordHash: body.passwordHash,
      });

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[addAuthAccount] Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/addAuthAccount",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      },
    });
  }),
});

/**
 * Get Central User Credentials Endpoint
 *
 * Returns user data including password hash for provisioning to apps.
 * This is used by /api/promo-signup to get the user's credentials
 * after they sign up with a lifetime promo code.
 *
 * GET /getCentralUser?email=user@example.com&key=API_KEY
 */
http.route({
  path: "/getCentralUser",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ exists: false, error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ exists: false, error: "Email is required" }),
        { status: 400, headers }
      );
    }

    try {
      const { internal } = await import("./_generated/api");

      const credentials = await ctx.runQuery(internal.signupInternal.getUserCredentials, {
        email: email.toLowerCase().trim(),
      });

      if (!credentials.exists) {
        return new Response(
          JSON.stringify({ exists: false, email: email.toLowerCase() }),
          { status: 200, headers }
        );
      }

      // Return user data including password hash (needed for app provisioning)
      return new Response(
        JSON.stringify({
          exists: true,
          email: credentials.email,
          name: credentials.name || null,
          passwordHash: credentials.passwordHash || null,
          hasPasswordAuth: credentials.hasPasswordAuth,
          subscriptionStatus: credentials.subscriptionStatus,
          entitledApps: credentials.entitledApps,
          authProvider: credentials.hasPasswordAuth ? "password" : "oauth",
        }),
        { status: 200, headers }
      );
    } catch (error) {
      console.error("[getCentralUser] Error:", error);
      return new Response(
        JSON.stringify({ exists: false, error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/getCentralUser",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Get or Create OAuth User Endpoint
 *
 * Called by apps when a user logs in via Google OAuth.
 * Creates a central user if they don't exist, returns their subscription status.
 *
 * POST /getOrCreateOAuthUser?key=API_KEY
 * Body: { email: string, name?: string }
 *
 * Returns:
 * {
 *   success: boolean,
 *   created: boolean,
 *   email: string,
 *   name?: string,
 *   subscriptionStatus: string,
 *   entitledApps: string[],
 *   trialExpiresAt?: number
 * }
 */
http.route({
  path: "/getOrCreateOAuthUser",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key from query params
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const expectedKey = process.env.ADMIN_KEY;

    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const body = await request.json();

      if (!body.email || typeof body.email !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Email is required" }),
          { status: 400, headers }
        );
      }

      const { internal } = await import("./_generated/api");

      const result = await ctx.runMutation(internal.signupInternal.getOrCreateOAuthUser, {
        email: body.email,
        name: body.name,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[getOrCreateOAuthUser] Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/getOrCreateOAuthUser",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Debug Auth Endpoint
 *
 * Comprehensive auth status for troubleshooting.
 *
 * GET /debugAuth?email=user@example.com&key=API_KEY
 *
 * Returns:
 * - Central user status (exists, auth type, subscription)
 * - App entitlements and provisioning status
 * - Diagnosed issues
 */
http.route({
  path: "/debugAuth",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers }
      );
    }

    try {
      const result = await ctx.runQuery(api.debugAuth.getAuthStatus, { email });
      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      console.error("[debugAuth] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/debugAuth",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Force Provision Endpoint
 *
 * Admin endpoint to force re-provision a user to an app.
 *
 * POST /forceProvision?key=API_KEY
 * Body: { email: string, app: "safetunes" | "safetube" | "safereads" }
 *
 * OR for all apps:
 * POST /forceProvision?key=API_KEY
 * Body: { email: string, app: "all" }
 */
http.route({
  path: "/forceProvision",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const body = await request.json();
      const { email, app } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers }
        );
      }

      if (!app || !["safetunes", "safetube", "safereads", "all"].includes(app)) {
        return new Response(
          JSON.stringify({ error: "App must be safetunes, safetube, safereads, or all" }),
          { status: 400, headers }
        );
      }

      let result;
      if (app === "all") {
        result = await ctx.runAction(api.forceProvision.forceProvisionAll, {
          email,
          adminKey: key,
        });
      } else {
        result = await ctx.runAction(api.forceProvision.forceProvisionUser, {
          email,
          app: app as "safetunes" | "safetube" | "safereads",
          adminKey: key,
        });
      }

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers,
      });
    } catch (error) {
      console.error("[forceProvision] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/forceProvision",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Create Or Update User From Webhook Endpoint
 *
 * Creates or updates a user in the central database when they complete checkout.
 * This is called by the Stripe webhook to ensure users are tracked centrally
 * even when using the legacy flow (direct Stripe checkout without signup form).
 *
 * POST /createOrUpdateUser?key=API_KEY
 * Body: {
 *   email: string,
 *   name?: string,
 *   subscriptionStatus: "trial" | "active" | "lifetime",
 *   entitledApps: string[],
 *   stripeCustomerId?: string,
 *   subscriptionId?: string
 * }
 */
http.route({
  path: "/createOrUpdateUser",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key from query params
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const expectedKey = process.env.ADMIN_KEY;

    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const body = await request.json();

      // Validate required fields
      if (!body.email || typeof body.email !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Email is required" }),
          { status: 400, headers }
        );
      }

      if (!body.subscriptionStatus) {
        return new Response(
          JSON.stringify({ success: false, error: "subscriptionStatus is required" }),
          { status: 400, headers }
        );
      }

      const validStatuses = ["trial", "active", "lifetime"];
      if (!validStatuses.includes(body.subscriptionStatus)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Invalid subscriptionStatus. Must be one of: ${validStatuses.join(", ")}`,
          }),
          { status: 400, headers }
        );
      }

      if (!body.entitledApps || !Array.isArray(body.entitledApps)) {
        return new Response(
          JSON.stringify({ success: false, error: "entitledApps array is required" }),
          { status: 400, headers }
        );
      }

      const validApps = ["safetunes", "safetube", "safereads"];
      if (!body.entitledApps.every((a: string) => validApps.includes(a))) {
        return new Response(
          JSON.stringify({ success: false, error: "entitledApps contains invalid app names" }),
          { status: 400, headers }
        );
      }

      const { internal } = await import("./_generated/api");

      const result = await ctx.runMutation(internal.signupInternal.createOrUpdateUserFromWebhook, {
        email: body.email,
        name: body.name,
        subscriptionStatus: body.subscriptionStatus,
        entitledApps: body.entitledApps,
        stripeCustomerId: body.stripeCustomerId,
        subscriptionId: body.subscriptionId,
      });

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[createOrUpdateUser] Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/createOrUpdateUser",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// Debug endpoint to check env vars - TEMPORARY
http.route({
  path: "/debugEnv",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const expectedKey = process.env.ADMIN_KEY;

    if (!key || key !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // List all env vars (names only, not values for security)
    const envKeys = Object.keys(process.env || {});
    const adminKey = process.env.ADMIN_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const envStatus = {
      ADMIN_KEY_exists: !!adminKey,
      ADMIN_KEY_length: adminKey?.length || 0,
      ADMIN_KEY_prefix: adminKey?.substring(0, 5),
      RESEND_API_KEY_exists: !!resendKey,
      RESEND_API_KEY_length: resendKey?.length || 0,
      RESEND_API_KEY_prefix: resendKey?.substring(0, 5),
      RESEND_KEY: !!process.env.RESEND_KEY,
      SITE_URL: !!process.env.SITE_URL,
      AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
      totalEnvVars: envKeys.length,
    };

    return new Response(JSON.stringify(envStatus), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Incomplete Signups Endpoint
 *
 * Admin endpoint to list users with incomplete signups.
 * These are users who have a 'users' record but no 'authAccounts' record.
 *
 * GET /incompleteSignups?key=API_KEY
 *
 * Returns:
 * {
 *   total: number,
 *   users: Array<{
 *     userId: string,
 *     email: string,
 *     name: string | null,
 *     subscriptionStatus: string,
 *     entitledApps: string[],
 *     createdAt: number
 *   }>
 * }
 */
http.route({
  path: "/incompleteSignups",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const { internal } = await import("./_generated/api");

      const result = await ctx.runQuery(internal.signupInternal.findIncompleteSignups, {});

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      console.error("[incompleteSignups] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/incompleteSignups",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/**
 * Delete User By ID Endpoint
 *
 * Admin endpoint to delete a user by their exact ID.
 * Used to clean up duplicate users.
 *
 * GET /deleteUserById?userId=xxx&key=API_KEY&reason=optional_reason
 */
http.route({
  path: "/deleteUserById",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const key = url.searchParams.get("key");
    const reason = url.searchParams.get("reason") || "Admin deletion by ID";

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Verify API key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers }
      );
    }

    try {
      const result = await ctx.runMutation(api.accounts.deleteUserById, {
        userId: userId as any,
        reason,
      });

      return new Response(JSON.stringify(result), { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[deleteUserById] Error:", error);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers }
      );
    }
  }),
});

export default http;
