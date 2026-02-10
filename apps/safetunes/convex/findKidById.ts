import { query } from "./_generated/server";
import { v } from "convex/values";

// Query to find a specific kid profile by ID
export const findKidById = query({
  args: {
    kidId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const kid = await ctx.db.get(args.kidId as any);
      return kid;
    } catch (error) {
      return { error: "Kid not found", kidId: args.kidId };
    }
  },
});

// Query to search for kids by name
export const findKidsByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const allKids = await ctx.db.query("kidProfiles").collect();
    return allKids.filter(kid =>
      kid.name.toLowerCase().includes(args.name.toLowerCase())
    );
  },
});
