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
 * Re-validate a kid session: check that the family code is still valid,
 * the parent subscription is active, and the kid profile still exists.
 * Used by kid home page to detect stale sessions.
 */
export const revalidateSession = query({
  args: { code: v.string(), kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) =>
        q.eq("familyCode", args.code.toUpperCase().trim())
      )
      .first();

    if (!user) {
      return { valid: false, reason: "invalid_code" as const };
    }

    // Check subscription status
    const status = user.subscriptionStatus;
    const allowedStatuses = ["active", "lifetime", "trial"];
    if (status && !allowedStatuses.includes(status)) {
      return { valid: false, reason: "subscription_expired" as const };
    }
    if (status === "trial" && user.trialExpiresAt && user.trialExpiresAt < Date.now()) {
      return { valid: false, reason: "subscription_expired" as const };
    }

    // Check kid profile still exists
    const kid = await ctx.db.get(args.kidId);
    if (!kid) {
      return { valid: false, reason: "profile_deleted" as const };
    }

    // Return fresh profile data (fixes issue #13 — stale profile data)
    return {
      valid: true,
      kid: {
        _id: kid._id,
        name: kid.name,
        age: kid.age,
        color: kid.color || "purple",
      },
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

    // Check subscription status — expired/cancelled users' kids should not have access
    const status = user.subscriptionStatus;
    const allowedStatuses = ["active", "lifetime", "trial"];
    if (status && !allowedStatuses.includes(status)) {
      return { error: "subscription_expired" as const };
    }
    // For trial users, check if trial has expired
    if (status === "trial" && user.trialExpiresAt && user.trialExpiresAt < Date.now()) {
      return { error: "subscription_expired" as const };
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
        onboardingCompleted: kid.onboardingCompleted === true,
      })),
    };
  },
});
