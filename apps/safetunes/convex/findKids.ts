import { query } from "./_generated/server";

// Query to find all kid profiles across all users
export const findAllKids = query({
  args: {},
  handler: async (ctx) => {
    const allKids = await ctx.db.query("kidProfiles").collect();
    const allUsers = await ctx.db.query("users").collect();

    return {
      totalKids: allKids.length,
      totalUsers: allUsers.length,
      kids: allKids.map(kid => ({
        _id: kid._id,
        name: kid.name,
        userId: kid.userId,
        pin: kid.pin,
        createdAt: kid._creationTime,
      })),
      users: allUsers.map(user => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        familyCode: user.familyCode,
      })),
    };
  },
});
