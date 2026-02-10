import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List all kids for a user.
 */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get a single kid by ID.
 */
export const getById = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.kidId);
  },
});

/**
 * Create a new kid.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    age: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kids", {
      userId: args.userId,
      name: args.name,
      age: args.age,
    });
  },
});

/**
 * Update a kid's name, age, or linked profile.
 */
export const update = mutation({
  args: {
    kidId: v.id("kids"),
    name: v.string(),
    age: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { kidId, ...fields } = args;
    await ctx.db.patch(kidId, fields);
  },
});

/**
 * Delete a kid and all their wishlist entries.
 */
export const remove = mutation({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const wishlistItems = await ctx.db
      .query("wishlists")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    for (const item of wishlistItems) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.kidId);
  },
});
