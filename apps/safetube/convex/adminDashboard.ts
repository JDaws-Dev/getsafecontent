import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// CORS headers for cross-origin API access from marketing site
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

// Admin-only HTTP endpoint - completely server-side
// Supports both HTML (default) and JSON (format=json) responses
export default httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const secretKey = url.searchParams.get("key");
    const format = url.searchParams.get("format"); // "json" for API access
    const ADMIN_SECRET = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

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
  <head>
    <title>Access Denied</title>
    <style>
      body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6; }
      .container { background: white; padding: 48px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; }
      h1 { color: #dc2626; margin-bottom: 16px; }
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

    // Sort by createdAt descending (newest first)
    users.sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime;
    });

    // Return JSON for API access (marketing site admin dashboard)
    if (format === "json") {
      const jsonUsers = users.map((user) => ({
        email: user.email,
        name: user.name || null,
        subscriptionStatus: user.subscriptionStatus || "unknown",
        createdAt: user.createdAt || null,
        kidCount: user.kidCount || 0,
        channelCount: user.channelCount || 0,
        videoCount: user.videoCount || 0,
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
    const totalChannels = users.reduce((sum, u) => sum + (u.channelCount || 0), 0);
    const totalVideos = users.reduce((sum, u) => sum + (u.videoCount || 0), 0);

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeTube Admin Dashboard</title>
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
    .refresh { position: fixed; bottom: 24px; right: 24px; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .refresh:hover { background: #b91c1c; text-decoration: none; }
    .code { font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SafeTube Admin Dashboard</h1>
    <p class="subtitle">Real-time overview of all users and content</p>

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
        <div class="metric-label">Approved Channels</div>
        <div class="metric-value" style="color: #dc2626;">${totalChannels}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Approved Videos</div>
        <div class="metric-value" style="color: #ea580c;">${totalVideos}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>User</th>
          <th>Family Code</th>
          <th>Status</th>
          <th>Kids</th>
          <th>Channels</th>
          <th>Videos</th>
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
              <td>${user.channelCount || 0}</td>
              <td>${user.videoCount || 0}</td>
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
