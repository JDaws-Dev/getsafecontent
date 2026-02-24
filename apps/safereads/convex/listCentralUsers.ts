import { internalQuery } from "./_generated/server";

/**
 * List all central users in the centralUsers table.
 * For debugging/migration purposes.
 */
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("centralUsers").collect();

    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      subscriptionStatus: user.subscriptionStatus,
      entitledApps: user.entitledApps,
      hasPasswordHash: !!user.passwordHash,
      createdAt: user.createdAt,
    }));
  },
});
