import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * HTTP endpoint to create a central user.
 *
 * This creates a centralUsers table entry for users signing up on the marketing site.
 * The credentials stored here are later synced to individual apps.
 *
 * Usage: POST /createCentralUser?key=YOUR_KEY
 * Body: {
 *   email: string,
 *   passwordHash: string,  // Scrypt hash from lucia
 *   name?: string,
 *   subscriptionStatus?: string (default: "trial")
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
    subscriptionStatus?: "trial" | "active" | "lifetime" | "cancelled" | "expired";
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
    // Check if user already exists
    const existingUser = await ctx.runQuery(internal.centralUsers.getCentralUserByEmail, {
      email: body.email,
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: "User already exists",
          code: "USER_EXISTS",
        }),
        {
          status: 409, // Conflict
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create the central user
    const result = await ctx.runMutation(internal.centralUsers.createCentralUser, {
      email: body.email,
      passwordHash: body.passwordHash,
      name: body.name,
      entitledApps: [], // Start with no apps - will be updated after payment
      subscriptionStatus: body.subscriptionStatus || "trial",
    });

    return new Response(JSON.stringify(result), {
      status: 201, // Created
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[createCentralUser] Error:", error);
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
