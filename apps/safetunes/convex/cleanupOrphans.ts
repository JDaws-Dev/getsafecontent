import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Admin endpoint to delete orphaned records (one-click cleanup).
 *
 *   GET /cleanupOrphans?key=ADMIN_KEY
 *
 * Returns JSON with deletedCount and per-table breakdown.
 */
export default httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const secretKey = url.searchParams.get("key");
  const ADMIN_SECRET = process.env.ADMIN_KEY!;

  if (!secretKey || secretKey !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const result = await ctx.runMutation(internal.orphanDetection.deleteOrphanedRecords, {});

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
});
