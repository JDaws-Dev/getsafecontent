import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { components } from "./_generated/api";

/**
 * Delete Better Auth user by email (internal - called from main delete function)
 */
export const deleteBetterAuthUser = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Use Better Auth component's deleteMany adapter
    const result = await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "user",
        where: [
          {
            field: "email",
            operator: "eq",
            value: args.email,
          },
        ],
      },
    });

    console.log(`Deleted Better Auth user(s) for ${args.email}:`, result);
    return result;
  },
});

/**
 * Delete a user from both SafeTunes and Better Auth
 * FOR TESTING ONLY - Use with caution!
 */
export const deleteUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    let deleted = [];

    // Delete from SafeTunes users table
    const safeTunesUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (safeTunesUser) {
      await ctx.db.delete(safeTunesUser._id);
      console.log(`Deleted SafeTunes user: ${args.email}`);
      deleted.push("SafeTunes user");
    }

    // Delete from Better Auth component using adapter
    try {
      const authResult = await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "user",
          where: [
            {
              field: "email",
              operator: "eq",
              value: args.email,
            },
          ],
        },
        paginationOpts: {
          cursor: null,
          numItems: 100, // Delete up to 100 matching users (should only be 1)
        },
      });

      console.log(`Deleted Better Auth user for ${args.email}:`, authResult);
      deleted.push("Better Auth user");
    } catch (error) {
      console.error(`Error deleting Better Auth user:`, error);
    }

    if (deleted.length > 0) {
      return { success: true, message: `Deleted: ${deleted.join(", ")}` };
    } else {
      return { success: false, message: `No user found for: ${args.email}` };
    }
  },
});

/**
 * Delete all users matching a pattern (for cleaning up test accounts)
 */
export const deleteUsersByPattern = mutation({
  args: { emailPattern: v.string() },
  handler: async (ctx, args) => {
    // Get ALL users and filter
    const allUsers = await ctx.db.query("users").collect();
    const matchingUsers = allUsers.filter(u => u.email.includes(args.emailPattern));

    console.log(`Found ${matchingUsers.length} users matching "${args.emailPattern}"`);

    const deleted = [];
    for (const user of matchingUsers) {
      await ctx.db.delete(user._id);
      deleted.push(user.email);
      console.log(`Deleted: ${user.email}`);
    }

    return {
      success: true,
      count: deleted.length,
      deleted
    };
  },
});
