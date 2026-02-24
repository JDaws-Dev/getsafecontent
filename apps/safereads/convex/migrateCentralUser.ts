import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a central user entry for migration purposes.
 *
 * Unlike createCentralUser, this allows creating entries WITHOUT a password hash.
 * Users migrated this way will need to use "Forgot Password" to set their password.
 *
 * This is necessary because:
 * 1. Legacy users may have bcrypt hashes (incompatible with Convex Auth Scrypt)
 * 2. OAuth users don't have password hashes
 * 3. We still want to track their entitlements centrally
 */
export const createMigrationUser = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    entitledApps: v.array(v.string()),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("lifetime"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
    // Original hash for reference (may be bcrypt or Scrypt)
    originalPasswordHash: v.optional(v.string()),
    // Whether this is a bcrypt hash that needs conversion
    needsPasswordReset: v.boolean(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("centralUsers")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (existingUser) {
      // Update entitlements if user exists
      await ctx.db.patch(existingUser._id, {
        name: args.name ?? existingUser.name,
        entitledApps: args.entitledApps,
        stripeCustomerId: args.stripeCustomerId ?? existingUser.stripeCustomerId,
        subscriptionId: args.subscriptionId ?? existingUser.subscriptionId,
        subscriptionStatus: args.subscriptionStatus,
      });

      console.log(`[migrateCentralUser] Updated existing: ${emailLower}`);
      return {
        success: true,
        userId: existingUser._id,
        action: "updated",
      };
    }

    // For new users, we need a placeholder password hash if they need reset
    // Using a known-invalid hash that will fail verification but satisfy schema
    const placeholderHash = args.needsPasswordReset
      ? "NEEDS_PASSWORD_RESET:migration"
      : args.originalPasswordHash;

    if (!placeholderHash) {
      // OAuth users - create without password hash by setting a placeholder
      // They'll login via OAuth, not password
    }

    const now = Date.now();

    const userId = await ctx.db.insert("centralUsers", {
      email: emailLower,
      passwordHash: placeholderHash || "NEEDS_PASSWORD_RESET:oauth",
      name: args.name,
      createdAt: now,
      entitledApps: args.entitledApps,
      stripeCustomerId: args.stripeCustomerId,
      subscriptionId: args.subscriptionId,
      subscriptionStatus: args.subscriptionStatus,
    });

    console.log(`[migrateCentralUser] Created: ${emailLower} (needsReset: ${args.needsPasswordReset})`);

    return {
      success: true,
      userId,
      action: "created",
    };
  },
});
