import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

// HTTP endpoint to delete a user and their associated data
// Usage: /deleteUser?email=user@example.com&key=YOUR_KEY
export default httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
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

  try {
    const result = await ctx.runMutation(internal.admin.deleteUserByEmailInternal, {
      email,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Deleted user ${email} and associated data`,
      result,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
