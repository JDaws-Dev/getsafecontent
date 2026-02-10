import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Grant lifetime subscription to a user by email
export const run = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: "lifetime",
      couponCode: "DAWSFRIEND",
      // Note: Don't patch trialEndsAt - leave it as is
    });

    return { success: true, email: args.email, previousStatus: user.subscriptionStatus };
  },
});
