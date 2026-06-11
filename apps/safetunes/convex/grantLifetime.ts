import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// HTTP endpoint to grant lifetime subscription
// Usage: curl "https://formal-chihuahua-623.convex.site/grantLifetime?email=xxx@gmail.com&key=xxx"
export default httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const secretKey = url.searchParams.get("key");
    const ADMIN_SECRET = process.env.ADMIN_KEY;

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

    // Call internal mutation to update user
    const result = await ctx.runMutation(internal.users.grantLifetimeByEmailInternal, {
      email,
    });

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
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
