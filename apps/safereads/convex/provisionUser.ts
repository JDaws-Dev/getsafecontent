import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * HTTP endpoint to provision a user with authentication credentials from central auth.
 *
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to login with their central password.
 *
 * Usage: POST /provisionUser?key=YOUR_KEY
 * Body: {
 *   email: string,
 *   passwordHash: string,  // Scrypt hash from central auth
 *   name?: string,
 *   subscriptionStatus: string,
 *   subscriptionId?: string,
 *   stripeCustomerId?: string
 * }
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body: {
    email?: string;
    passwordHash?: string;
    name?: string;
    subscriptionStatus?: string;
    subscriptionId?: string;
    stripeCustomerId?: string;
    entitledToThisApp?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate required fields
  if (!body.email) {
    return new Response(JSON.stringify({ error: "Missing required field: email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.passwordHash) {
    return new Response(JSON.stringify({ error: "Missing required field: passwordHash" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await ctx.runMutation(internal.provisionUserInternal.provisionUserInternal, {
      email: body.email,
      passwordHash: body.passwordHash,
      name: body.name || null,
      subscriptionStatus: body.subscriptionStatus || "active",
      entitledToThisApp: body.entitledToThisApp !== false,
      stripeCustomerId: body.stripeCustomerId || null,
      subscriptionId: body.subscriptionId || null,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[provisionUser] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        provisioned: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
