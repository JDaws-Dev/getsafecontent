import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// HTTP endpoint to toggle album artwork by name
// Usage: curl "https://formal-chihuahua-623.convex.site/toggleArtwork?email=xxx@gmail.com&albumName=xxx&hide=true&key=xxx"
export default httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const albumName = url.searchParams.get("albumName");
    const hide = url.searchParams.get("hide") === "true";
    const secretKey = url.searchParams.get("key");
    const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || "safetunes-admin-2024";

    if (secretKey !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!email || !albumName) {
      return new Response(JSON.stringify({ error: "Email and albumName required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call internal mutation
    const result = await ctx.runMutation(internal.toggleArtworkInternal.toggleByEmailAndName, {
      email,
      albumName,
      hideArtwork: hide,
    });

    return new Response(
      JSON.stringify(result, null, 2),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Toggle artwork error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
