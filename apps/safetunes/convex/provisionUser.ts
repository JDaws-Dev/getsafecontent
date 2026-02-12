import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * HTTP endpoint to provision a user with authentication credentials.
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to log in with their central password.
 *
 * Called by the marketing site webhook after user signup + payment.
 *
 * Usage:
 *   POST https://formal-chihuahua-623.convex.site/provisionUser?key=xxx
 *   Body: {
 *     email: string,
 *     passwordHash: string,       // Scrypt hash from central auth
 *     name?: string,
 *     subscriptionStatus: string, // "trial" | "active" | "lifetime" | "inactive"
 *     entitledToThisApp?: boolean, // Whether user paid for THIS app (default true)
 *     stripeCustomerId?: string,
 *     subscriptionId?: string
 *   }
 */
export default httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    // Validate admin key from query params
    const url = new URL(request.url);
    const secretKey = url.searchParams.get("key");
    const ADMIN_SECRET = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

    if (!secretKey || secretKey !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Parse request body
    let body: {
      email?: string;
      passwordHash?: string;
      name?: string | null;
      subscriptionStatus?: string;
      entitledToThisApp?: boolean;
      stripeCustomerId?: string | null;
      subscriptionId?: string | null;
    };

    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Validate required fields
    if (!body.email) {
      return new Response(JSON.stringify({ error: "Missing required field: email" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (!body.passwordHash) {
      return new Response(JSON.stringify({ error: "Missing required field: passwordHash" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Validate subscription status if provided
    const validStatuses = ["trial", "active", "lifetime", "inactive", "cancelled", "expired"];
    const subscriptionStatus = body.subscriptionStatus || "active";
    if (!validStatuses.includes(subscriptionStatus)) {
      return new Response(
        JSON.stringify({
          error: `Invalid subscriptionStatus. Must be one of: ${validStatuses.join(", ")}`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Call internal mutation to provision user
    const result = await ctx.runMutation(internal.users.provisionUserInternal, {
      email: body.email,
      passwordHash: body.passwordHash,
      name: body.name || null,
      subscriptionStatus: subscriptionStatus,
      entitledToThisApp: body.entitledToThisApp !== false, // Default to true
      stripeCustomerId: body.stripeCustomerId || null,
      subscriptionId: body.subscriptionId || null,
    });

    console.log(`[provisionUser HTTP] Successfully provisioned: ${body.email}`, result);

    return new Response(
      JSON.stringify({
        success: true,
        email: body.email,
        ...result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("[provisionUser HTTP] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        provisioned: false,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
