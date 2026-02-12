import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * HTTP endpoint to update a user's password hash.
 * This is called by the marketing site to sync password changes across apps.
 *
 * Usage:
 *   POST https://rightful-rabbit-333.convex.site/updatePassword?key=xxx
 *   Body: {
 *     email: string,
 *     passwordHash: string,  // Scrypt hash from central auth
 *   }
 *
 * Response: { success: boolean, updated: boolean, email: string }
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

    // Call internal mutation to update password
    const result = await ctx.runMutation(internal.users.updatePasswordInternal, {
      email: body.email,
      passwordHash: body.passwordHash,
    });

    console.log(`[updatePassword HTTP] Result for ${body.email}:`, result);

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
    console.error("[updatePassword HTTP] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        updated: false,
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
