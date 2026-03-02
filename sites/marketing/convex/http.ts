import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";
import verifyCentralCredentials from "./verifyCentralCredentials";
import { login, verifyToken, requestPasswordReset, resetPassword } from "./authEndpoints";

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

export default http;
