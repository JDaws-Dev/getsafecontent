import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// CORS headers for cross-origin API access
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Admin endpoint to view orphaned records
 *
 * Usage:
 *   GET /adminOrphans?key=ADMIN_KEY
 *   GET /adminOrphans?key=ADMIN_KEY&format=json
 *
 * Returns:
 *   - HTML page with orphan details (default)
 *   - JSON response (format=json)
 */
export default httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const secretKey = url.searchParams.get("key");
    const format = url.searchParams.get("format");
    const ADMIN_SECRET = process.env.ADMIN_KEY!;

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

    // Get orphaned records
    const orphanData = await ctx.runQuery(api.orphanDetection.findOrphanedRecords, {});

    // JSON response
    if (format === "json") {
      return new Response(JSON.stringify(orphanData, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // HTML response
    const summaryRows = Object.entries(orphanData.summary)
      .map(
        ([table, count]) =>
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${table}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${
              count > 0 ? "#dc2626" : "#059669"
            };">${count}</td>
          </tr>`
      )
      .join("");

    const recordRows = orphanData.orphanedRecords
      .map(
        (record) =>
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${record.table}</code></td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${record.recordInfo}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><code style="font-size: 12px; color: #6b7280;">${record.recordId}</code></td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><code style="font-size: 12px; color: #dc2626;">${record.missingParentId}</code></td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${
              record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "Unknown"
            }</td>
          </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
  <head>
    <title>SafeTunes - Orphaned Records</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 24px;
        background: #f9fafb;
        color: #111827;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
      }
      h1 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 8px 0;
        color: #111827;
      }
      .subtitle {
        color: #6b7280;
        margin: 0 0 24px 0;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }
      .stat-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .stat-card h3 {
        margin: 0 0 8px 0;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
      }
      .stat-card .value {
        font-size: 32px;
        font-weight: 700;
      }
      .stat-card.danger .value { color: #dc2626; }
      .stat-card.success .value { color: #059669; }
      .card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-bottom: 24px;
        overflow: hidden;
      }
      .card-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }
      .card-header h2 {
        margin: 0;
        font-size: 16px;
        color: #111827;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        text-align: left;
        padding: 12px;
        border-bottom: 2px solid #e5e7eb;
        color: #6b7280;
        font-weight: 600;
        font-size: 14px;
        background: #f9fafb;
      }
      .empty-state {
        padding: 48px;
        text-align: center;
        color: #6b7280;
      }
      .empty-state h3 {
        color: #059669;
        margin: 0 0 8px 0;
      }
      .actions {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 500;
        text-decoration: none;
        font-size: 14px;
      }
      .btn-primary {
        background: #7c3aed;
        color: white;
      }
      .btn-secondary {
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      code {
        font-family: 'SF Mono', Monaco, Consolas, monospace;
      }
      .instructions {
        background: #FEF3C7;
        border-left: 4px solid #F59E0B;
        padding: 16px;
        margin-bottom: 24px;
        border-radius: 0 8px 8px 0;
      }
      .instructions h3 {
        margin: 0 0 8px 0;
        color: #92400E;
      }
      .instructions ol {
        margin: 0;
        padding-left: 20px;
        color: #92400E;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Orphaned Records</h1>
      <p class="subtitle">SafeTunes data integrity check - Records with missing parent references</p>

      <div class="stats">
        <div class="stat-card ${orphanData.totalOrphans > 0 ? "danger" : "success"}">
          <h3>Total Orphans</h3>
          <div class="value">${orphanData.totalOrphans}</div>
        </div>
        <div class="stat-card">
          <h3>Tables Affected</h3>
          <div class="value">${Object.keys(orphanData.summary).length}</div>
        </div>
      </div>

      ${
        orphanData.totalOrphans > 0
          ? `
      <div class="instructions">
        <h3>Cleanup Instructions</h3>
        <ol>
          <li>Review the orphaned records below</li>
          <li>To delete all orphans, run: <code>npx convex run orphanDetection:deleteOrphanedRecords</code></li>
          <li>Or manually delete specific records from the Convex dashboard</li>
        </ol>
      </div>
      `
          : ""
      }

      <div class="actions">
        <a href="?key=${secretKey}&format=json" class="btn btn-secondary">JSON View</a>
        <a href="/adminDashboard?key=${secretKey}" class="btn btn-secondary">Admin Dashboard</a>
      </div>

      ${
        Object.keys(orphanData.summary).length > 0
          ? `
      <div class="card">
        <div class="card-header">
          <h2>Summary by Table</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Table</th>
              <th style="text-align: center;">Orphaned Records</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      <div class="card">
        <div class="card-header">
          <h2>Orphaned Records Detail</h2>
        </div>
        ${
          orphanData.orphanedRecords.length > 0
            ? `
        <table>
          <thead>
            <tr>
              <th>Table</th>
              <th>Record Info</th>
              <th>Record ID</th>
              <th>Missing Parent ID</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${recordRows}
          </tbody>
        </table>
        `
            : `
        <div class="empty-state">
          <h3>No Orphaned Records Found</h3>
          <p>All records have valid parent references. Data integrity is good!</p>
        </div>
        `
        }
      </div>
    </div>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html", ...CORS_HEADERS },
    });
  } catch (error) {
    console.error("Error in adminOrphans:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }
});
