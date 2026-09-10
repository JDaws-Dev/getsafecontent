import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Admin endpoint: push/sync a family code onto a SafeStudy user by email.
 * Part of the unified-identity rotation path (docs/UNIFIED-IDENTITY.md) — lets
 * Central set this app's family code when a parent rotates ("swaps") it.
 *
 * Auth: requires `?key=` to match ADMIN_KEY or SAFESTUDY_ADMIN_KEY (Convex
 * env). The hub only holds ADMIN_KEY, so that is the one that matters in
 * practice; SAFESTUDY_ADMIN_KEY is kept for existing operator scripts.
 * Fails closed — if neither env var is set, every request is rejected (no
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

  const secrets = [process.env.ADMIN_KEY, process.env.SAFESTUDY_ADMIN_KEY].filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
  if (secrets.length === 0 || !key || !secrets.includes(key)) {
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
