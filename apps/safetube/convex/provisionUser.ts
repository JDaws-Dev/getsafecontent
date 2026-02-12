import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * HTTP endpoint to provision a user with BOTH:
 * 1. User record (with subscription status)
 * 2. Auth credentials (password hash in authAccounts table)
 *
 * This is called by the marketing site webhook after user signup + payment.
 *
 * Usage: POST /provisionUser?key=YOUR_KEY
 * Body: {
 *   email: string,           // Required
 *   passwordHash: string,    // Required - Scrypt hash from central auth
 *   name?: string,           // Optional - User's display name
 *   subscriptionStatus?: string, // Optional - defaults to "active"
 *   subscriptionId?: string, // Optional - Stripe subscription ID
 *   stripeCustomerId?: string // Optional - Stripe customer ID
 * }
 */
export default httpAction(async (ctx, request) => {
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
  let body;
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
    const result = await ctx.runMutation(internal.users.provisionUserInternal, {
      email: body.email,
      passwordHash: body.passwordHash,
      name: body.name || null,
      subscriptionStatus: body.subscriptionStatus || "active",
      entitledToThisApp: body.entitledToThisApp !== false, // Default to true
      stripeCustomerId: body.stripeCustomerId || null,
      subscriptionId: body.subscriptionId || null,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[provisionUser] Error provisioning user:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      provisioned: false,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
