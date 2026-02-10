import { internalMutation } from "../_generated/server";

export const fixLegacyFamiliesData = internalMutation({
  handler: async (ctx) => {
    // Delete the legacy families table data that's blocking deployment
    const families = await ctx.db.query("families").collect();

    for (const family of families) {
      await ctx.db.delete(family._id);
    }

    return { deleted: families.length };
  },
});
