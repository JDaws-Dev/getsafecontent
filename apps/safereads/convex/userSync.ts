import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get SafeReads user data by email.
 * Used by JWT-based auth to get local user data after central auth verification.
 */
export const getSafeReadsUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});
