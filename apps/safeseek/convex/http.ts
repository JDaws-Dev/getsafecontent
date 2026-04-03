import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import stripeWebhook from "./stripe";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://getsafestudy.com",
  "https://getsafefamily.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

/**
 * Build CORS headers for a given request.
 * Returns the matching origin in Access-Control-Allow-Origin, or rejects
 * with an empty origin (browser will block the response).
 */
function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...(allowedOrigin ? { "Vary": "Origin" } : {}),
  };
}

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
// Admin key must be set via Convex env vars: npx convex env set ADMIN_KEY "your-key"

// ==================== Admin Dashboard ====================

const adminDashboard = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  try {
    const url = new URL(request.url);
    const secretKey = url.searchParams.get("key");
    const format = url.searchParams.get("format");
    const ADMIN_SECRET = process.env.ADMIN_KEY;
    if (!ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
      });
    }

    if (!secretKey || secretKey !== ADMIN_SECRET) {
      if (format === "json") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
        });
      }
      return new Response(
        `<!DOCTYPE html>
<html>
  <head><title>Access Denied</title>
    <style>
      body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6; }
      .container { background: white; padding: 48px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; }
      h1 { color: #7c3aed; margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Access Denied</h1>
      <p>Invalid or missing admin key.</p>
    </div>
  </body>
</html>`,
        { status: 403, headers: { "Content-Type": "text/html" } }
      );
    }

    // Fetch all users with kid counts
    const users = await ctx.runQuery(api.admin.getAllUsersWithKids);

    // Return JSON for API access (marketing site admin dashboard)
    if (format === "json") {
      const jsonUsers = users.map((user) => ({
        email: user.email,
        name: user.name || null,
        subscriptionStatus: user.subscriptionStatus || "unknown",
        createdAt: user.createdAt || null,
        kidCount: user.kidCount || 0,
        totalSearches: user.totalSearches || 0,
        totalBlockedSearches: user.totalBlockedSearches || 0,
        familyCode: user.familyCode || null,
        trialEndsAt: user.trialEndsAt || null,
        stripeCustomerId: user.stripeCustomerId || null,
      }));

      return new Response(JSON.stringify(jsonUsers), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
      });
    }

    // Calculate metrics for HTML dashboard
    const totalUsers = users.length;
    const activeSubscriptions = users.filter(u => u.subscriptionStatus === 'active').length;
    const trialUsers = users.filter(u => u.subscriptionStatus === 'trial').length;
    const lifetimeUsers = users.filter(u => u.subscriptionStatus === 'lifetime').length;
    const totalKids = users.reduce((sum, u) => sum + (u.kidCount || 0), 0);
    const totalSearches = users.reduce((sum, u) => sum + (u.totalSearches || 0), 0);
    const totalBlocked = users.reduce((sum, u) => sum + (u.totalBlockedSearches || 0), 0);

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeStudy Admin Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; padding: 24px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 32px; font-weight: bold; color: #111827; margin-bottom: 8px; }
    .subtitle { color: #6b7280; margin-bottom: 32px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .metric-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-label { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
    .metric-value { font-size: 36px; font-weight: bold; color: #111827; }
    .metric-sub { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    table { width: 100%; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; }
    thead { background: #f9fafb; }
    th { padding: 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
    td { padding: 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    tr:hover { background: #f9fafb; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-trial { background: #dbeafe; color: #1e40af; }
    .badge-lifetime { background: #e9d5ff; color: #6b21a8; }
    .badge-cancelled { background: #f3f4f6; color: #4b5563; }
    .badge-expired { background: #fee2e2; color: #991b1b; }
    .refresh { position: fixed; bottom: 24px; right: 24px; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .refresh:hover { background: #6d28d9; text-decoration: none; }
    .code { font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SafeStudy Admin Dashboard</h1>
    <p class="subtitle">Real-time overview of all users and search activity</p>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Users</div>
        <div class="metric-value">${totalUsers}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Active Subscriptions</div>
        <div class="metric-value" style="color: #059669;">${activeSubscriptions}</div>
        <div class="metric-sub">${trialUsers} on trial, ${lifetimeUsers} lifetime</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Kids</div>
        <div class="metric-value" style="color: #2563eb;">${totalKids}</div>
        <div class="metric-sub">${(totalKids / totalUsers || 0).toFixed(1)} avg per user</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Searches</div>
        <div class="metric-value" style="color: #7c3aed;">${totalSearches}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Blocked Searches</div>
        <div class="metric-value" style="color: #dc2626;">${totalBlocked}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>User</th>
          <th>Family Code</th>
          <th>Status</th>
          <th>Kids</th>
          <th>Searches</th>
          <th>Blocked</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => {
          const statusClass = user.subscriptionStatus === 'active' ? 'badge-active' :
                             user.subscriptionStatus === 'trial' ? 'badge-trial' :
                             user.subscriptionStatus === 'lifetime' ? 'badge-lifetime' :
                             user.subscriptionStatus === 'cancelled' ? 'badge-cancelled' :
                             'badge-expired';

          return `
            <tr>
              <td>
                <div style="font-weight: 600; color: #111827;">${user.name || 'No name'}</div>
                <div style="color: #6b7280; font-size: 13px;">${user.email}</div>
              </td>
              <td><span class="code">${user.familyCode || '-'}</span></td>
              <td>
                <span class="badge ${statusClass}">${user.subscriptionStatus || 'unknown'}</span>
                ${user.trialEndsAt ? `<div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Trial ends: ${new Date(user.trialEndsAt).toLocaleDateString()}</div>` : ''}
              </td>
              <td>${user.kidCount || 0}</td>
              <td>${user.totalSearches || 0}</td>
              <td>${user.totalBlockedSearches || 0}</td>
              <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <a href="?key=${encodeURIComponent(secretKey || '')}" class="refresh">Refresh</a>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
      }
    );
  }
});

// ==================== Provision User ====================

const provisionUser = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY || "";

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  // Validate required fields
  if (!body.email) {
    return new Response(JSON.stringify({ error: "Missing required field: email" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  try {
    const result = await ctx.runMutation(internal.users.provisionUserInternal, {
      email: body.email,
      passwordHash: body.passwordHash || null,
      name: body.name || null,
      subscriptionStatus: body.subscriptionStatus || "active",
      entitledToThisApp: body.entitledToThisApp !== false,
      stripeCustomerId: body.stripeCustomerId || null,
      subscriptionId: body.subscriptionId || null,
      familyCode: body.familyCode || undefined,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  } catch (error) {
    console.error("[provisionUser] Error provisioning user:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      provisioned: false,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }
});

// ==================== Delete User ====================

const deleteUser = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY || "";

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  // Validate required params
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  try {
    const result = await ctx.runMutation(internal.users.deleteUserInternal, {
      email,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Deleted user ${email} and associated data`,
      result,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }
});

// ==================== Set Subscription Status ====================

const setSubscriptionStatus = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const status = url.searchParams.get("status");
  const key = url.searchParams.get("key");
  const stripeCustomerId = url.searchParams.get("stripeCustomerId");
  const subscriptionId = url.searchParams.get("subscriptionId");
  const ADMIN_KEY = process.env.ADMIN_KEY || "";

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  // Validate required params
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  if (!status) {
    return new Response(JSON.stringify({ error: "Missing status parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  // Valid statuses
  const validStatuses = ["trial", "active", "lifetime", "cancelled", "expired", "past_due"];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  try {
    await ctx.runMutation(internal.users.setSubscriptionStatusByEmailInternal, {
      email,
      status,
      stripeCustomerId: stripeCustomerId || undefined,
      subscriptionId: subscriptionId || undefined,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Set ${email} subscription status to ${status}${stripeCustomerId ? ` (customer: ${stripeCustomerId})` : ''}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  } catch (error) {
    console.error("Error setting subscription status:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }
});

// ==================== Admin Orphans ====================

const adminOrphans = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  try {
    const url = new URL(request.url);
    const secretKey = url.searchParams.get("key");
    const format = url.searchParams.get("format");
    const ADMIN_SECRET = process.env.ADMIN_KEY;

    if (!ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
      });
    }

    if (!secretKey || secretKey !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
      });
    }

    // Run the orphan detection query
    const result = await ctx.runQuery(api.orphanDetection.findOrphanedRecords);

    // JSON format
    if (format === "json") {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
      });
    }

    // HTML format
    const summaryRows = Object.entries(result.summary)
      .map(([table, count]) => `<tr><td>${table}</td><td>${count}</td></tr>`)
      .join("");

    const recordRows = result.orphanedRecords
      .map(
        (r: any) => `<tr>
          <td>${r.table}</td>
          <td><code>${r.recordId}</code></td>
          <td><code>${r.missingParentId}</code></td>
          <td>${r.recordInfo}</td>
          <td>${r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeStudy Orphan Detection</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 8px; }
    .subtitle { color: #6b7280; margin-bottom: 24px; }
    .summary-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }
    .status { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .status.clean { color: #059669; }
    .status.dirty { color: #dc2626; }
    table { width: 100%; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; margin-bottom: 24px; }
    th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
    td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    tr:hover { background: #f9fafb; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .refresh { display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .refresh:hover { background: #6d28d9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SafeStudy Orphan Detection</h1>
    <p class="subtitle">Records referencing non-existent parent records</p>

    <div class="summary-card">
      <div class="status ${result.totalOrphans === 0 ? "clean" : "dirty"}">
        ${result.totalOrphans === 0 ? "All clear - no orphaned records found" : `${result.totalOrphans} orphaned record${result.totalOrphans !== 1 ? "s" : ""} found`}
      </div>
      ${
        summaryRows
          ? `<h3 style="margin-bottom: 8px; color: #374151;">Summary by Table</h3>
             <table><thead><tr><th>Table</th><th>Count</th></tr></thead><tbody>${summaryRows}</tbody></table>`
          : ""
      }
    </div>

    ${
      result.orphanedRecords.length > 0
        ? `<h3 style="margin-bottom: 8px; color: #374151;">Orphaned Records</h3>
           <table>
             <thead><tr><th>Table</th><th>Record ID</th><th>Missing Parent</th><th>Info</th><th>Created</th></tr></thead>
             <tbody>${recordRows}</tbody>
           </table>
           <p style="color: #6b7280; font-size: 13px;">To clean up, run: <code>npx convex run orphanDetection:deleteOrphanedRecords</code></p>`
        : ""
    }

    <a href="?key=${encodeURIComponent(secretKey || "")}" class="refresh">Refresh</a>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Admin orphans error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
      }
    );
  }
});

// ==================== Warm Cache ====================

const warmCache = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY || "";

  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }

  try {
    // Schedule the warm cache action (runs async, don't wait)
    await ctx.runAction(internal.warmCache.warmPopularSearches);

    return new Response(JSON.stringify({ success: true, message: "Cache warming complete" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  } catch (error) {
    console.error("[warmCache] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) },
    });
  }
});

// ==================== Stripe CORS Preflight ====================

const stripeCorsHandler = httpAction(async (ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
});

// ==================== Routes ====================

const http = httpRouter();

// Stripe webhook
http.route({
  path: "/stripe",
  method: "POST",
  handler: stripeWebhook,
});

http.route({
  path: "/stripe",
  method: "OPTIONS",
  handler: stripeCorsHandler,
});

// Admin dashboard
http.route({
  path: "/adminDashboard",
  method: "GET",
  handler: adminDashboard,
});

http.route({
  path: "/adminDashboard",
  method: "OPTIONS",
  handler: adminDashboard,
});

// Provision user (from Marketing site)
http.route({
  path: "/provisionUser",
  method: "POST",
  handler: provisionUser,
});

// Delete user
http.route({
  path: "/deleteUser",
  method: "GET",
  handler: deleteUser,
});

// Set subscription status
http.route({
  path: "/setSubscriptionStatus",
  method: "GET",
  handler: setSubscriptionStatus,
});

// Admin orphan detection
http.route({
  path: "/adminOrphans",
  method: "GET",
  handler: adminOrphans,
});

http.route({
  path: "/adminOrphans",
  method: "OPTIONS",
  handler: adminOrphans,
});

// Warm cache
http.route({
  path: "/warmCache",
  method: "GET",
  handler: warmCache,
});

export default http;
