import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

// HTTP endpoint to manually set subscription status
// Usage: /setSubscriptionStatus?email=user@example.com&status=active&key=YOUR_KEY
export default httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const status = url.searchParams.get("status");
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate required params
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!status) {
    return new Response(JSON.stringify({ error: "Missing status parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Valid statuses
  const validStatuses = ["trial", "active", "lifetime", "cancelled", "expired", "past_due"];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await ctx.runMutation(internal.subscriptions.setSubscriptionStatusByEmailInternal, {
      email,
      status,
    });

    return new Response(JSON.stringify({
      ...result,
      message: `Set ${email} subscription status to ${status}`,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error setting subscription status:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
