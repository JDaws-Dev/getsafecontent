import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// HTTP endpoint to set subscription status for a user
// Usage: curl "https://formal-chihuahua-623.convex.site/setSubscriptionStatus?email=xxx@gmail.com&status=active&key=xxx"
export default httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const status = url.searchParams.get("status");
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

    if (!status) {
      return new Response(JSON.stringify({ error: "Status required (trial, active, lifetime, cancelled)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate status
    const validStatuses = ["trial", "active", "lifetime", "cancelled", "expired"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call internal mutation to update user
    const result = await ctx.runMutation(internal.users.setSubscriptionStatusByEmailInternal, {
      email,
      status,
    });

    return new Response(
      JSON.stringify({
        success: true,
        email,
        status,
        message: `Set subscription status to "${status}" for ${email}`,
        result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Set subscription status error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
