import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const bulkDelete = internalMutation({
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

    return {
      pattern: args.emailPattern,
      count: deleted.length,
      deleted
    };
  },
});
