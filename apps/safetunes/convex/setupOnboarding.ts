import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// TEMPORARY WORKAROUND: Convex has a bug where env vars set via CLI don't propagate
// to HTTP actions. Using a hardcoded key until Convex fixes this.
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * HTTP endpoint to create a kid profile from onboarding
 *
 * Usage: GET /setupOnboarding?email=xxx@gmail.com&key=xxx&kidName=Emma&dailyLimit=60
 *
 * Query params:
 * - email: Parent's email address
 * - key: Admin secret key
 * - kidName: Child's name (required)
 * - dailyLimit: Daily listening limit in minutes (optional, default: 60)
 * - color: Profile color (optional, default: purple)
 */
export default httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const secretKey = url.searchParams.get("key");
    const kidName = url.searchParams.get("kidName");
    const dailyLimitStr = url.searchParams.get("dailyLimit");
    const color = url.searchParams.get("color") || "purple";

    const ADMIN_SECRET = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

    // Validate admin key
    if (!secretKey || secretKey !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate required params
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!kidName || kidName.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Kid name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse daily limit (default to 60 minutes)
    const dailyLimit = dailyLimitStr ? parseInt(dailyLimitStr, 10) : 60;

    // Find user by email
    const user = await ctx.runQuery(internal.users.getUserByEmailInternal, {
      email,
    });

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "User not found",
          message: `No user found with email: ${email}. User must sign up first.`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create kid profile
    const profileId = await ctx.runMutation(
      internal.kidProfiles.createKidProfileInternal,
      {
        userId: user._id,
        name: kidName.trim(),
        color,
        dailyLimitMinutes: dailyLimit,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        email,
        kidName: kidName.trim(),
        profileId,
        dailyLimit,
        message: `Created kid profile "${kidName}" for ${email}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Setup onboarding error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
