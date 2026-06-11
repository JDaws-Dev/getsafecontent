import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const syncFamilyCode = httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const email = url.searchParams.get("email");
  const code = url.searchParams.get("code");

  const ADMIN_SECRET = process.env.ADMIN_KEY;
  if (!key || key !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await ctx.runMutation(internal.users.syncFamilyCodeByEmailInternal, {
    email: email.toLowerCase(),
    code: code ? code.toUpperCase() : undefined,
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export default syncFamilyCode;
