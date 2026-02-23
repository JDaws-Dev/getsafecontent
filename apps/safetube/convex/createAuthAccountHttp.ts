import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

/**
 * HTTP endpoint to create authAccount entries for users without passwords.
 * This enables the forgot password flow for legacy users.
 *
 * Usage:
 * curl "https://rightful-rabbit-333.convex.site/createAuthAccount?email=user@example.com&key=ADMIN_KEY"
 *
 * Optional: &dryRun=true to preview without making changes
 */
export default httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const key = url.searchParams.get("key");
  const dryRun = url.searchParams.get("dryRun") === "true";

  // Validate admin key
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!email) {
    return new Response(
      JSON.stringify({ error: "email parameter required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Find user
    const user = await ctx.runQuery(internal.users.getUserByEmailInternal, {
      email,
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: `User not found: ${email}` }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if authAccount already exists
    const hasAuthAccount = await ctx.runQuery(
      internal.users.checkAuthAccountExists,
      { email }
    );

    if (hasAuthAccount.exists) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `User ${email} already has an authAccount. They can use login or forgot password.`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          message: `Would create authAccount for ${email}. User will need to use Forgot Password to set their password.`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create placeholder authAccount
    const placeholderSecret = `NEEDS_PASSWORD_RESET_${Date.now()}_${Math.random().toString(36)}`;

    await ctx.runMutation(api.users.debugInsertAuthAccount, {
      userId: user._id,
      email: email.toLowerCase(),
      passwordHash: placeholderSecret,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created authAccount for ${email}. User must use Forgot Password to set their password.`,
        userId: user._id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[createAuthAccount] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
