import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Family codes for SafeReads.
 *
 * Stores the family code on `users.familyCode` (same as SafeTunes/SafeTube/SafeStudy).
 * This ensures kids only need one family code across all Safe Family apps.
 * The provisioning flow passes familyCode when creating users, so it syncs automatically.
 */

/**
 * Generate a 6-character alphanumeric family code.
 * Same algorithm as all other Safe Family apps.
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
 * Generate a new family code for a user (or keep existing one).
 * If user already has a family code (e.g., synced from another app), returns it.
 * Otherwise generates a new unique one.
 */
export const generate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // If user already has a family code (synced from provisioning), return it
    if (user.familyCode) {
      return { code: user.familyCode, synced: true };
    }

    // Generate a unique code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const collision = await ctx.db
        .query("users")
        .withIndex("by_family_code", (q) => q.eq("familyCode", code))
        .first();
      if (!collision) break;
      code = generateCode();
      attempts++;
    }

    await ctx.db.patch(args.userId, { familyCode: code });
    return { code, synced: false };
  },
});

/**
 * Regenerate family code (replaces existing one).
 */
export const regenerate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const collision = await ctx.db
        .query("users")
        .withIndex("by_family_code", (q) => q.eq("familyCode", code))
        .first();
      if (!collision) break;
      code = generateCode();
      attempts++;
    }

    await ctx.db.patch(args.userId, { familyCode: code });
    return { code };
  },
});

/**
 * Get family code for a user.
 */
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.familyCode) return null;
    return {
      _id: user._id,
      userId: user._id,
      code: user.familyCode,
    };
  },
});

/**
 * Validate a family code and return the user info + kid profiles.
 * Used by kid login flow.
 */
export const validateCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) =>
        q.eq("familyCode", args.code.toUpperCase().trim())
      )
      .first();

    if (!user) {
      return null;
    }

    // Get kid profiles for this user
    const kids = await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      userId: user._id,
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
