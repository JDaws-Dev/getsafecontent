import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

// HTTP endpoint to grant lifetime subscription
// Usage: curl "https://exuberant-puffin-838.convex.site/grantLifetime?email=xxx@gmail.com&key=xxx"
const grantLifetimeAction = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const secretKey = url.searchParams.get("key");
    const ADMIN_SECRET = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

    if (!secretKey || secretKey !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Optional name parameter for pre-provisioning new users
    const name = url.searchParams.get("name") || undefined;

    // Call internal mutation to update/create user
    const result = await ctx.runMutation(
      internal.subscriptions.grantLifetimeInternal,
      {
        email,
        name,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        email,
        message: `Granted lifetime subscription to ${email}`,
        result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Grant lifetime error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export default grantLifetimeAction;
