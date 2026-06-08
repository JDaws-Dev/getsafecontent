import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Admin endpoint: push/sync a family code onto a SafeStudy user by email.
 * Part of the unified-identity rotation path (docs/UNIFIED-IDENTITY.md) — lets
 * Central set this app's family code when a parent rotates ("swaps") it.
 *
 * Auth: requires `?key=` to match SAFESTUDY_ADMIN_KEY (set in Convex env).
 * Fails closed — if the env var is unset, every request is rejected (no
 * hardcoded fallback secret).
 *
 * GET /syncFamilyCode?key=<admin>&email=<email>&code=<CODE>
 *   code omitted → mutation generates/ensures one.
 */
export default httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const email = url.searchParams.get("email");
  const code = url.searchParams.get("code");

  const ADMIN_SECRET = process.env.SAFESTUDY_ADMIN_KEY;
  if (!ADMIN_SECRET || !key || key !== ADMIN_SECRET) {
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
