import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * One-off admin HTTP endpoint for email/family-code maintenance.
 * Auth: requires `?key=` to match SAFETUNES_ADMIN_KEY (set in Convex env).
 * Fails closed — if the env var is unset, every request is rejected (no
 * hardcoded fallback secret).
 *
 *   curl ".../normalizeEmails?key=xxx"                         # normalize all emails
 *   curl ".../normalizeEmails?key=xxx&action=assignFamilyCodes[&email=a@b.com]"
 *   curl ".../normalizeEmails?key=xxx&action=updateEmail&oldEmail=a@b.com&newEmail=c@d.com"
 */
export default httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const secretKey = url.searchParams.get("key");
  const ADMIN_SECRET = process.env.SAFETUNES_ADMIN_KEY;

  if (!ADMIN_SECRET || !secretKey || secretKey !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const action = url.searchParams.get("action");

    if (action === "assignFamilyCodes") {
      const email = url.searchParams.get("email") || undefined;
      const result = await ctx.runMutation(api.userSync.assignMissingFamilyCodes, { email });
      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "updateEmail") {
      const oldEmail = url.searchParams.get("oldEmail");
      const newEmail = url.searchParams.get("newEmail");
      if (!oldEmail || !newEmail) {
        return new Response(JSON.stringify({ error: "oldEmail and newEmail required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const result = await ctx.runMutation(api.userSync.updateUserEmail, { oldEmail, newEmail });
      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default: normalize all emails
    const result = await ctx.runMutation(api.userSync.normalizeEmailCase);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
