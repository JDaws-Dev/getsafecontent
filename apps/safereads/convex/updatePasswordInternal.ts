import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// PASSWORD SYNC - Update password hash from central sync
// ============================================================================

/**
 * Update a user's password hash in the authAccounts table.
 * Called by the marketing site /api/auth/sync-password endpoint.
 *
 * This allows password changes to propagate across all apps.
 */
export const updatePasswordInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(), // Scrypt hash from central auth
  },
  handler: async (ctx, args) => {
    console.log(`[updatePasswordInternal] Starting for ${args.email}`);

    // Find the authAccount for this email
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    if (!authAccount) {
      console.log(`[updatePasswordInternal] No authAccount found for: ${args.email}`);
      return {
        updated: false,
        reason: "no_auth_account",
        email: args.email,
      };
    }

    // Check if password is already the same
    if (authAccount.secret === args.passwordHash) {
      console.log(`[updatePasswordInternal] Password already matches for: ${args.email}`);
      return {
        updated: false,
        reason: "already_matches",
        email: args.email,
      };
    }

    // Update the password hash
    await ctx.db.patch(authAccount._id, {
      secret: args.passwordHash,
    });

    console.log(`[updatePasswordInternal] Password updated for: ${args.email}`);

    return {
      updated: true,
      email: args.email,
    };
  },
});
