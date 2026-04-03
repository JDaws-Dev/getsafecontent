import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
 * Get SafeReads user data by email.
 * Used by JWT-based auth to get local user data after central auth verification.
 */
export const getSafeReadsUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

/**
 * Ensure a local SafeReads user record exists for a JWT-authenticated user.
 *
 * When a user logs in via central JWT auth but has no local SafeReads user record
 * (e.g., the provisioning webhook failed, or they are a brand-new user), this
 * mutation creates a minimal local record so the dashboard doesn't spin forever.
 *
 * The subscription status and entitlements come from centralUser (JWT auth), so
 * the local record is created with "trial" status by default. The dashboard layout
 * overrides the local status with the central auth status anyway.
 */
export const ensureSafeReadsUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return { userId: existing._id, wasCreated: false };
    }

    // Map subscription status to valid union type
    const validStatuses = ["trial", "active", "lifetime", "canceled", "past_due", "incomplete", "inactive"] as const;
    type SubscriptionStatus = (typeof validStatuses)[number];
    const status: SubscriptionStatus = validStatuses.includes(args.subscriptionStatus as SubscriptionStatus)
      ? (args.subscriptionStatus as SubscriptionStatus)
      : "trial";

    // Auto-generate a unique family code
    let familyCode = generateCode();
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

    // Create new user with minimal fields
    console.log(`[ensureSafeReadsUser] Creating missing local user: ${email} (familyCode: ${familyCode})`);

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name,
      subscriptionStatus: status,
      trialExpiresAt: status === "trial" ? Date.now() + TRIAL_DURATION_MS : undefined,
      analysisCount: 0,
      onboardingComplete: false,
      familyCode,
    });

    console.log(`[ensureSafeReadsUser] Created local user: ${email} -> ${userId}`);

    return { userId, wasCreated: true };
  },
});
