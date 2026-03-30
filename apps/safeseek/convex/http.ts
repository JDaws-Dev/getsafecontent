import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

// CORS headers for cross-origin API access from marketing site
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
// Admin key must be set via Convex env vars: npx convex env set ADMIN_KEY "your-key"

// ==================== Admin Dashboard ====================

const adminDashboard = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const secretKey = url.searchParams.get("key");
    const format = url.searchParams.get("format");
    const ADMIN_SECRET = process.env.ADMIN_KEY || "";

    if (!secretKey || secretKey !== ADMIN_SECRET) {
      if (format === "json") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
  <title>SafeNet Admin Dashboard</title>
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
    <h1>SafeNet Admin Dashboard</h1>
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
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // Validate required fields
  if (!body.email) {
    return new Response(JSON.stringify({ error: "Missing required field: email" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (error) {
    console.error("[provisionUser] Error provisioning user:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      provisioned: false,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // Validate required params
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // Validate required params
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  if (!status) {
    return new Response(JSON.stringify({ error: "Missing status parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  // Valid statuses
  const validStatuses = ["trial", "active", "lifetime", "cancelled", "expired", "past_due"];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
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
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (error) {
    console.error("Error setting subscription status:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});

// ==================== Routes ====================

const http = httpRouter();

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

export default http;
