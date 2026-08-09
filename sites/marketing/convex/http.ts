import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import verifyCentralCredentials from "./verifyCentralCredentials";
import { login, verifyToken, requestPasswordReset, resetPassword, generateOAuthToken } from "./authEndpoints";

const http = httpRouter();

// Convex Auth routes - handles /api/auth/* endpoints
auth.addHttpRoutes(http);

/**
 * Login Endpoint - Public-facing JWT authentication
 *
 * This is the primary authentication endpoint for all Safe Family apps.
 * Users call this endpoint directly (no admin key required).
 *
 * POST /login
 * Body: { email: string, password: string }
 *
 * Returns:
 * - JWT token for authentication
 * - User info (email, name, subscriptionStatus, entitledApps)
 * - Token expiration timestamp
 */
http.route({
  path: "/login",
  method: "POST",
  handler: login,
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
 * Request Password Reset Endpoint - Send OTP via email
 *
 * This endpoint is called by app frontends when a user wants to reset their password.
 * It generates an OTP, stores it, and sends an email.
 *
 * POST /requestPasswordReset
 * Body: { email: string }
 *
 * Returns:
 * - Always success for security (don't reveal if email exists)
 * - OTP email is sent if user exists with password auth
 * - Returns OAUTH_ONLY code if user uses Google sign-in
 */
http.route({
  path: "/requestPasswordReset",
  method: "POST",
  handler: requestPasswordReset,
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
    const app = url.searchParams.get("app") as "safetunes" | "safetube" | "safereads" | "safestudy" | null;
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

    if (!app || !["safetunes", "safetube", "safereads", "safestudy", "safespark"].includes(app)) {
      return new Response(
        JSON.stringify({ error: "Valid app parameter required (safetunes, safetube, safereads, safestudy, safespark)" }),
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
      // Parse apps if provided. safespark IS grantable here (the paid "Family +
      // Spark" tier) — it's just never in the DEFAULT set, so an admin must ask
      // for it explicitly (e.g. apps=...,safespark). Granting it entitles the
      // central account; SafeSpark then auto-provisions on first login.
      let apps:
        | ("safetunes" | "safetube" | "safereads" | "safestudy" | "safespark")[]
        | undefined;
      if (appsParam) {
        const validApps = ["safetunes", "safetube", "safereads", "safestudy", "safespark"];
        apps = appsParam
          .split(",")
          .map((a) => a.trim().toLowerCase())
          .filter((a) => validApps.includes(a)) as typeof apps;
      }

      const result = await ctx.runMutation(internal.accounts.grantLifetimeAccess, {
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

      // Validate entitled apps if provided. safespark is accepted (paid tier)
      // so an account can be entitled to SafeSpark; it's never in any default.
      if (body.entitledApps) {
        const validApps = ["safetunes", "safetube", "safereads", "safestudy", "safespark"];
        if (!Array.isArray(body.entitledApps) || !body.entitledApps.every((a: string) => validApps.includes(a))) {
          return new Response(
            JSON.stringify({ error: "entitledApps must be an array of valid app names" }),
            { status: 400, headers }
          );
        }
      }

      const result = await ctx.runMutation(internal.accounts.updateSubscription, {
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
      const users = await ctx.runQuery(internal.accounts.getAllAccounts, {});

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

      // Delete the user (trusted admin path — this route is key-gated)
      const result = await ctx.runMutation(internal.accounts.deleteAccountInternal, {
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
      const validApps = ["safetunes", "safetube", "safereads", "safestudy", "safespark"];
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
 * Update Central Password Endpoint
 *
 * Updates a user's password in the central auth database.
 * Called by sync-password API route when a user changes password on any app.
 *
 * POST /updateCentralPassword?key=API_KEY
 * Body: { email, passwordHash, sourceApp }
 */
http.route({
  path: "/updateCentralPassword",
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

      if (!body.passwordHash || typeof body.passwordHash !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Password hash is required" }),
          { status: 400, headers }
        );
      }

      console.log(`[updateCentralPassword] Updating for ${body.email} (source: ${body.sourceApp || "unknown"})`);

      const { internal } = await import("./_generated/api");

      const result = await ctx.runMutation(internal.signupInternal.updatePassword, {
        email: body.email,
        passwordHash: body.passwordHash,
      });

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 404,
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("[updateCentralPassword] Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/updateCentralPassword",
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
          familyCode: credentials.familyCode ?? null,
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
 * Body: { email: string, app: "safetunes" | "safetube" | "safereads" | "safestudy" }
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

      if (!app || !["safetunes", "safetube", "safereads", "safestudy", "all"].includes(app)) {
        return new Response(
          JSON.stringify({ error: "App must be safetunes, safetube, safereads, safestudy, or all" }),
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
          app: app as "safetunes" | "safetube" | "safereads" | "safestudy",
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

      const validApps = ["safetunes", "safetube", "safereads", "safestudy", "safespark"];
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

// /debugEnv removed June 22 2026 (Codex P1-f): it returned ADMIN_KEY /
// RESEND_API_KEY prefixes + lengths over a GET URL — secret leakage via
// server/proxy logs, browser history, and the admin key sitting in the
// query string. Use the Convex dashboard to inspect env vars instead.

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
 * Report Trial Summary — receives trial check results from individual apps.
 * Each app POSTs its expired/warned users here instead of sending its own admin email.
 * Marketing Central aggregates all reports and sends one combined daily digest.
 *
 * POST /reportTrialSummary
 * Header: x-admin-key
 * Body: { app, expiredCount, expiredEmails, warningCount, warningEmails }
 */
http.route({
  path: "/reportTrialSummary",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      "Content-Type": "application/json",
    };

    // Verify admin key
    const expectedKey = process.env.ADMIN_KEY;
    const providedKey = request.headers.get("x-admin-key");
    if (!expectedKey || providedKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers }
      );
    }

    try {
      const body = await request.json();
      const { app, expiredCount, expiredEmails, warningCount, warningEmails } = body;

      if (!app || expiredCount === undefined || warningCount === undefined) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: app, expiredCount, warningCount" }),
          { status: 400, headers }
        );
      }

      const validApps = ["safetunes", "safetube", "safereads", "safestudy", "safespark"];
      if (!validApps.includes(app)) {
        return new Response(
          JSON.stringify({ error: `Invalid app: ${app}` }),
          { status: 400, headers }
        );
      }

      await ctx.runMutation(internal.trialSummary.storeReport, {
        app,
        expiredCount,
        expiredEmails: expiredEmails || [],
        warningCount,
        warningEmails: warningEmails || [],
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers }
      );
    } catch (error) {
      console.error("[reportTrialSummary] Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers }
      );
    }
  }),
});

http.route({
  path: "/reportTrialSummary",
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
 * /syncFamilyCode — admin endpoint to read or set the unified familyCode on
 * Marketing Central. Mirrors the same endpoint on each of the 4 apps so all
 * 5 systems expose an identical surface for code sync.
 *
 *   GET /syncFamilyCode?key=ADMIN_KEY&email=user@example.com
 *   GET /syncFamilyCode?key=ADMIN_KEY&email=user@example.com&code=ABC123
 */
http.route({
  path: "/syncFamilyCode",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const email = url.searchParams.get("email");
    const code = url.searchParams.get("code");

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json",
    };

    const ADMIN_SECRET = process.env.ADMIN_KEY;
    if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers,
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers,
      });
    }

    const { internal } = await import("./_generated/api");
    const result = await ctx.runMutation(internal.signupInternal.syncFamilyCodeByEmailInternal, {
      email: email.toLowerCase(),
      code: code ? code.toUpperCase() : undefined,
    });

    return new Response(JSON.stringify(result), { status: 200, headers });
  }),
});

// ---------------------------------------------------------------------------
// Shared cross-app daily screen time.
//
// Server-to-server only: the apps call these from their own Convex backends
// with ADMIN_KEY. They are deliberately NOT user-token gated — the kid side has
// no parent JWT, and the calling app has already established which kid it is
// acting for. Same trust model as /verifyAppAccess.
//
// `day` is supplied by the calling app as "YYYY-MM-DD" in the FAMILY's
// timezone. Central does no timezone maths, so "today" can't drift apart
// between apps.
// ---------------------------------------------------------------------------

const screenTimeHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function screenTimeKeyOk(key: string | null): boolean {
  const expected = process.env.ADMIN_KEY;
  return Boolean(expected && key === expected);
}

// GET /sharedScreenTime/check?familyCode=..&kidName=..&day=..&key=..
http.route({
  path: "/sharedScreenTime/check",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    if (!screenTimeKeyOk(url.searchParams.get("key"))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: screenTimeHeaders });
    }
    const familyCode = url.searchParams.get("familyCode");
    const kidName = url.searchParams.get("kidName");
    const day = url.searchParams.get("day");
    if (!familyCode || !kidName || !day) {
      return new Response(JSON.stringify({ error: "familyCode, kidName and day are required" }), { status: 400, headers: screenTimeHeaders });
    }
    const result = await ctx.runQuery(internal.sharedScreenTime.check, { familyCode, kidName, day });
    return new Response(JSON.stringify(result), { status: 200, headers: screenTimeHeaders });
  }),
});

// POST /sharedScreenTime/record  { familyCode, kidName, day, minutes, app, key }
http.route({
  path: "/sharedScreenTime/record",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { familyCode?: string; kidName?: string; day?: string; minutes?: number; app?: string; key?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: screenTimeHeaders });
    }
    if (!screenTimeKeyOk(body.key ?? null)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: screenTimeHeaders });
    }
    const { familyCode, kidName, day, minutes, app } = body;
    if (!familyCode || !kidName || !day || typeof minutes !== "number" || !app) {
      return new Response(JSON.stringify({ error: "familyCode, kidName, day, minutes and app are required" }), { status: 400, headers: screenTimeHeaders });
    }
    const result = await ctx.runMutation(internal.sharedScreenTime.record, { familyCode, kidName, day, minutes, app });
    return new Response(JSON.stringify(result), { status: 200, headers: screenTimeHeaders });
  }),
});

// POST /sharedScreenTime/setLimit  { familyCode, kidName, dailyLimitMinutes, key }
http.route({
  path: "/sharedScreenTime/setLimit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { familyCode?: string; kidName?: string; dailyLimitMinutes?: number; key?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: screenTimeHeaders });
    }
    if (!screenTimeKeyOk(body.key ?? null)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: screenTimeHeaders });
    }
    const { familyCode, kidName, dailyLimitMinutes } = body;
    if (!familyCode || !kidName || typeof dailyLimitMinutes !== "number") {
      return new Response(JSON.stringify({ error: "familyCode, kidName and dailyLimitMinutes are required" }), { status: 400, headers: screenTimeHeaders });
    }
    const result = await ctx.runMutation(internal.sharedScreenTime.setLimit, { familyCode, kidName, dailyLimitMinutes });
    return new Response(JSON.stringify(result), { status: 200, headers: screenTimeHeaders });
  }),
});

// GET /sharedScreenTime/family?familyCode=..&day=..&key=..
http.route({
  path: "/sharedScreenTime/family",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    if (!screenTimeKeyOk(url.searchParams.get("key"))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: screenTimeHeaders });
    }
    const familyCode = url.searchParams.get("familyCode");
    const day = url.searchParams.get("day");
    if (!familyCode || !day) {
      return new Response(JSON.stringify({ error: "familyCode and day are required" }), { status: 400, headers: screenTimeHeaders });
    }
    const result = await ctx.runQuery(internal.sharedScreenTime.familyOverview, { familyCode, day });
    return new Response(JSON.stringify(result), { status: 200, headers: screenTimeHeaders });
  }),
});

export default http;
