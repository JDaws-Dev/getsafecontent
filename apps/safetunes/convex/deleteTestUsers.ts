import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

export default httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const secretKey = url.searchParams.get("key");
  const pattern = url.searchParams.get("pattern");

  const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || "safetunes-admin-2024";

  if (secretKey !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Invalid key" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!pattern) {
    return new Response(JSON.stringify({ error: "Missing pattern parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const result = await ctx.runMutation(internal.deleteTestUsersInternal.bulkDelete, {
      emailPattern: pattern
    });

    return new Response(JSON.stringify({
      success: true,
      ...result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
