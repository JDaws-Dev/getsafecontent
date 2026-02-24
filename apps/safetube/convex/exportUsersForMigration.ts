import { httpAction } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Internal query to get all users with their password hashes
 */
export const getAllUsersWithPasswordHashes = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const allUsers = await ctx.db.query("users").collect();

    const exportedUsers: {
      email: string;
      passwordHash: string | null;
      name: string | null;
      subscriptionStatus: string;
      createdAt: number;
      stripeCustomerId: string | null;
      subscriptionId: string | null;
    }[] = [];

    for (const user of allUsers) {
      if (!user.email) continue;

      // Get password hash from authAccounts
      const authAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", user.email!.toLowerCase())
        )
        .first();

      exportedUsers.push({
        email: user.email.toLowerCase(),
        passwordHash: authAccount?.secret || null,
        name: user.name || null,
        subscriptionStatus: user.subscriptionStatus || "trial",
        createdAt: user.createdAt || user._creationTime || Date.now(),
        stripeCustomerId: user.stripeCustomerId || null,
        subscriptionId: user.stripeSubscriptionId || null,
      });
    }

    return exportedUsers;
  },
});

/**
 * GET /exportUsersForMigration
 *
 * Exports all users with their password hashes for migration to central auth.
 * This is a one-time use endpoint for the migration process.
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const ADMIN_KEY = process.env.ADMIN_KEY!;

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[exportUsersForMigration] Starting export...");

  try {
    const exportedUsers = await ctx.runQuery(
      internal.exportUsersForMigration.getAllUsersWithPasswordHashes
    );

    console.log(`[exportUsersForMigration] Exported ${exportedUsers.length} users`);

    return new Response(
      JSON.stringify({ users: exportedUsers, count: exportedUsers.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[exportUsersForMigration] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
