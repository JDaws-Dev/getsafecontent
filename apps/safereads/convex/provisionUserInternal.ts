import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a 6-character alphanumeric family code.
 * Same algorithm as familyCodes.ts and all other Safe Family apps.
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
 * Provision a user with authentication credentials from central auth.
 * This creates BOTH the users table entry AND the authAccounts entry,
 * allowing users to login with their central password.
 *
 * For OAuth users (isOAuthUser=true), passwordHash can be null and
 * authAccounts creation is skipped - user logs in via Google OAuth.
 *
 * IMPORTANT: The passwordHash must be a Scrypt hash (from Lucia) matching
 * what Convex Auth Password provider uses.
 */
export const provisionUserInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.union(v.string(), v.null())), // Accepted but ignored (auth handled by Marketing)
    name: v.union(v.string(), v.null()),
    subscriptionStatus: v.string(),
    entitledToThisApp: v.boolean(),
    stripeCustomerId: v.union(v.string(), v.null()),
    subscriptionId: v.union(v.string(), v.null()),
    isOAuthUser: v.optional(v.boolean()), // Accepted but ignored (auth handled by Marketing)
    familyCode: v.optional(v.string()), // Optional: shared family code across apps
  },
  handler: async (ctx, args) => {
    console.log(`[provisionUser] Starting for ${args.email} (OAuth: ${args.isOAuthUser ?? false})`);

    // 1. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    let userId;
    let wasCreated = false;

    // Determine subscription status based on entitlement
    const effectiveStatus = args.entitledToThisApp
      ? args.subscriptionStatus
      : "inactive";

    // Map subscription status to SafeReads typed union
    const validStatuses = ["trial", "active", "lifetime", "canceled", "past_due", "incomplete"] as const;
    type SubscriptionStatus = (typeof validStatuses)[number];

    const mappedStatus = validStatuses.includes(effectiveStatus as SubscriptionStatus)
      ? (effectiveStatus as SubscriptionStatus)
      : "active";

    if (existingUser) {
      userId = existingUser._id;

      const patch: Record<string, unknown> = {
        subscriptionStatus: mappedStatus,
        stripeCustomerId: args.stripeCustomerId ?? existingUser.stripeCustomerId,
        stripeSubscriptionId: args.subscriptionId ?? existingUser.stripeSubscriptionId,
        name: args.name ?? existingUser.name,
      };
      if (args.familyCode && args.familyCode !== existingUser.familyCode) {
        patch.familyCode = args.familyCode;
      }
      await ctx.db.patch(userId, patch);

      console.log(`[provisionUser] Updated existing user: ${args.email}`);
    } else {
      // Auto-generate a family code if none provided
      let familyCode = args.familyCode;
      if (!familyCode) {
        familyCode = generateCode();
        let attempts = 0;
        while (attempts < 10) {
          const collision = await ctx.db
            .query("users")
            .withIndex("by_family_code", (q) => q.eq("familyCode", familyCode))
            .first();
          if (!collision) break;
          familyCode = generateCode();
          attempts++;
        }
      }

      // Create new user
      userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name ?? undefined,
        subscriptionStatus: mappedStatus,
        stripeCustomerId: args.stripeCustomerId ?? undefined,
        stripeSubscriptionId: args.subscriptionId ?? undefined,
        trialExpiresAt: mappedStatus === "trial" ? Date.now() + TRIAL_DURATION_MS : undefined,
        analysisCount: 0,
        onboardingComplete: false,
        familyCode,
      });
      wasCreated = true;

      console.log(`[provisionUser] Created new user: ${args.email} (familyCode: ${familyCode})`);
    }

    // Auth is handled centrally by Marketing (JWT). No local authAccounts needed.

    // Get the user's family code to return (for cross-app sync)
    const updatedUser = await ctx.db.get(userId);
    const familyCode = updatedUser?.familyCode;

    return {
      success: true,
      userId: userId,
      familyCode,
      provisioned: wasCreated,
      updated: !wasCreated,
      authAccountCreated: false,
      authAccountUpdated: false,
      passwordConflict: false,
    };
  },
});

