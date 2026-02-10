import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get ALL user data including null/undefined fields
export const debugAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    console.log("Total users found:", users.length);

    return {
      totalCount: users.length,
      users: users.map((user, index) => {
        console.log(`User ${index + 1}:`, {
          _id: user._id,
          email: user.email,
          name: user.name,
          familyCode: user.familyCode,
        });

        return {
          _id: user._id,
          email: user.email || "NO EMAIL",
          name: user.name || "NO NAME",
          familyCode: user.familyCode || "NO CODE",
          subscriptionStatus: user.subscriptionStatus || "NO STATUS",
          couponCode: user.couponCode || "NO COUPON",
          createdAt: user._creationTime,
          onboardingCompleted: user.onboardingCompleted,
          appleMusicAuthorized: user.appleMusicAuthorized,
          // Show ALL fields
          allFields: Object.keys(user),
        };
      }),
    };
  },
});

// Delete all users matching a pattern (for cleaning up test accounts)
export const bulkDeleteUsers = mutation({
  args: { emailPattern: v.string() },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    const matchingUsers = allUsers.filter(u => u.email.includes(args.emailPattern));

    console.log(`Found ${matchingUsers.length} users matching "${args.emailPattern}"`);

    const deleted: string[] = [];
    for (const user of matchingUsers) {
      await ctx.db.delete(user._id);
      deleted.push(user.email);
      console.log(`Deleted: ${user.email}`);
    }

    return { success: true, count: deleted.length, deleted };
  },
});
