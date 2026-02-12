import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * HTTP endpoint to get a central user's data by email.
 *
 * This is used by the marketing site webhook to look up the user's
 * passwordHash before provisioning to individual apps.
 *
 * Usage: GET /getCentralUser?email=user@example.com&key=YOUR_KEY
 *
 * Returns: {
 *   exists: boolean,
 *   email?: string,
 *   passwordHash?: string,
 *   name?: string,
 *   entitledApps?: string[],
 *   subscriptionStatus?: string,
 *   stripeCustomerId?: string,
 *   subscriptionId?: string
 * }
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const email = url.searchParams.get("email");
  const ADMIN_KEY = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate email parameter
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing required parameter: email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const user = await ctx.runQuery(internal.centralUsers.getCentralUserByEmail, {
      email: email.toLowerCase(),
    });

    if (!user) {
      return new Response(
        JSON.stringify({
          exists: false,
          email: email.toLowerCase(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return user data (including passwordHash for provisioning)
    return new Response(
      JSON.stringify({
        exists: true,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        entitledApps: user.entitledApps,
        subscriptionStatus: user.subscriptionStatus,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionId: user.subscriptionId,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[getCentralUser] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
