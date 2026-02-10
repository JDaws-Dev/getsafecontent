import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Temporary mutation to update subscription end date
export const updateEndDate = mutation({
  args: {
    email: v.string(),
    subscriptionEndsAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      subscriptionEndsAt: args.subscriptionEndsAt,
    });

    console.log(`Updated subscriptionEndsAt for ${args.email} to ${new Date(args.subscriptionEndsAt).toISOString()}`);
    return { success: true };
  },
});
