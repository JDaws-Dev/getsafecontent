import { query } from "./_generated/server";

// Query to get detailed user information
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    return users.map(user => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      familyCode: user.familyCode,
      subscriptionStatus: user.subscriptionStatus,
      couponCode: user.couponCode,
      createdAt: user._creationTime,
      appleMusicAuthorized: user.appleMusicAuthorized,
    }));
  },
});
