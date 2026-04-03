import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Generate a 6-character alphanumeric family code.
 * Same algorithm as SafeTunes.
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a new family code for a user.
 * Deletes any existing code for this user first.
 */
export const generate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Delete existing code for this user
    const existing = await ctx.db
      .query("familyCodes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Generate a unique code (retry if collision)
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const collision = await ctx.db
        .query("familyCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!collision) break;
      code = generateCode();
      attempts++;
    }

    const id = await ctx.db.insert("familyCodes", {
      userId: args.userId,
      code,
      createdAt: Date.now(),
    });

    return { id, code };
  },
});

/**
 * Get family code for a user.
 */
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("familyCodes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Validate a family code and return the user info + kid profiles.
 * Used by kid login flow.
 */
export const validateCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const codeRecord = await ctx.db
      .query("familyCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase().trim()))
      .first();

    if (!codeRecord) {
      return null;
    }

    const user = await ctx.db.get(codeRecord.userId);
    if (!user) {
      return null;
    }

    // Get kid profiles for this user
    const kids = await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", codeRecord.userId))
      .collect();

    return {
      userId: codeRecord.userId,
      familyName: user.name || "Your Family",
      kids: kids.map((kid) => ({
        _id: kid._id,
        name: kid.name,
        age: kid.age,
        color: kid.color || "purple",
        hasPin: !!kid.pin,
        readingLevel: kid.readingLevel,
      })),
    };
  },
});
