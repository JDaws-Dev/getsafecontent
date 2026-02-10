import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// HTTP endpoint to check user's music library
// Usage: curl "https://formal-chihuahua-623.convex.site/checkUserMusic?email=xxx@gmail.com&key=xxx"
export default httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const secretKey = url.searchParams.get("key");
    const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || "safetunes-admin-2024";

    if (secretKey !== ADMIN_SECRET) {
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

    // Call internal query to get user data
    const result = await ctx.runQuery(internal.checkUserMusicInternal.getUserMusicData, { email });

    return new Response(
      JSON.stringify(result, null, 2),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check user music error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
