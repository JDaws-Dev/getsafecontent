import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * HTTP endpoint to migrate a BetterAuth user to centralUsers.
 *
 * BetterAuth uses a different password hashing algorithm than Convex Auth,
 * so users migrated via this endpoint will need to reset their password
 * using the "Forgot Password" flow.
 *
 * Usage: GET /migrateBetterAuthUser?email=EMAIL&name=NAME&apps=safetunes,safetube&status=active&key=YOUR_KEY
 *
 * Query params:
 * - email: User's email (required)
 * - name: User's display name (optional)
 * - apps: Comma-separated list of entitled apps (required)
 * - status: Subscription status - trial/active/lifetime/cancelled/expired (default: active)
 * - stripeCustomerId: Stripe customer ID (optional)
 * - key: Admin API key (required)
 *
 * Response:
 * {
 *   success: true,
 *   userId: string,
 *   action: "created" | "updated" | "skipped"
 * }
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY;

  // Validate admin key
  if (!ADMIN_KEY) {
    console.error("[migrateBetterAuthUser] ADMIN_KEY not set in environment");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse query params
  const email = url.searchParams.get("email");
  const name = url.searchParams.get("name") || undefined;
  const appsParam = url.searchParams.get("apps");
  const status = url.searchParams.get("status") || "active";
  const stripeCustomerId = url.searchParams.get("stripeCustomerId") || undefined;

  if (!email) {
    return new Response(JSON.stringify({ error: "Missing required param: email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!appsParam) {
    return new Response(JSON.stringify({ error: "Missing required param: apps" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entitledApps = appsParam.split(",").map((s) => s.trim().toLowerCase());

  // Validate status
  const validStatuses = ["trial", "active", "lifetime", "cancelled", "expired"];
  if (!validStatuses.includes(status)) {
    return new Response(
      JSON.stringify({
        error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    console.log(`[migrateBetterAuthUser] Migrating: ${email} → [${entitledApps.join(", ")}]`);

    const result = await ctx.runMutation(internal.migrateCentralUser.createMigrationUser, {
      email: email.toLowerCase(),
      name,
      entitledApps,
      stripeCustomerId,
      subscriptionStatus: status as "trial" | "active" | "lifetime" | "cancelled" | "expired",
      needsPasswordReset: true, // BetterAuth hashes are incompatible
    });

    console.log(`[migrateBetterAuthUser] Result: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      status: result.action === "created" ? 201 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[migrateBetterAuthUser] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
