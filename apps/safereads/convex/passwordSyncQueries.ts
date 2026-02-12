import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get the password hash for a user.
 * This is used by syncPasswordToOtherApps action.
 *
 * SECURITY NOTE: This should only be called from internal actions, never exposed publicly.
 */
export const getPasswordHash = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    if (!authAccount) {
      return null;
    }

    return {
      passwordHash: authAccount.secret,
    };
  },
});
