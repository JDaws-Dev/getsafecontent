import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

// HTTP endpoint to delete a user and all their associated data
// Usage: curl "https://exuberant-puffin-838.convex.site/deleteUser?email=xxx@gmail.com&key=xxx"
const deleteUserAction = httpAction(async (ctx, request) => {
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

    // Call internal mutation to delete user and all associated data
    const result = await ctx.runMutation(
      internal.admin.deleteUserByEmailInternal,
      {
        email,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        email,
        message: `Deleted user ${email} and all associated data`,
        result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete user error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export default deleteUserAction;
