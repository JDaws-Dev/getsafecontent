import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth routes - handles /api/auth/* endpoints
auth.addHttpRoutes(http);

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

      const stats = {
        totalAccounts: users.length,
        byStatus: {
          trial: users.filter((u) => u.subscriptionStatus === "trial").length,
          active: users.filter((u) => u.subscriptionStatus === "active").length,
          lifetime: users.filter((u) => u.subscriptionStatus === "lifetime").length,
          canceled: users.filter((u) => u.subscriptionStatus === "canceled").length,
          expired: users.filter((u) => u.subscriptionStatus === "expired").length,
        },
        users: users.map((u) => ({
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

export default http;
