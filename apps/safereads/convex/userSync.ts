import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ownRowForEmail, verifyCallerClaims } from "./identity";

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
  args: { email: v.string(), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Own row only (verified token); see identity.ownRowForEmail.
    return await ownRowForEmail(ctx, args.userToken, args.email);
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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This was a public mutation that created a users row for ANY email with
    // a caller-chosen status — "lifetime" included. Now the row is created
    // for the verified token's email only, and a privileged status is never
    // taken from the client: the row starts as "trial" and the central sync
    // (useSubscriptionSync -> verifyCentralAccess) sets the real status from
    // Marketing Central within moments of the dashboard loading.
    const claims = await verifyCallerClaims(args.userToken);
    if (!claims) throw new Error("Please sign in again.");
    const email = claims.email.toLowerCase();
    if (email !== args.email.toLowerCase()) {
      throw new Error("You don't have access to that.");
    }

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return { userId: existing._id, wasCreated: false };
    }

    // Only non-privileged statuses are accepted from the client. Anything
    // that would grant access ("active", "lifetime") comes from central sync.
    type SubscriptionStatus = "trial" | "inactive";
    const status: SubscriptionStatus = args.subscriptionStatus === "inactive" ? "inactive" : "trial";

    // One family code everywhere: prefer the unified code carried on the
    // verified token; generate a local one only when the token has none.
    let familyCode = claims.familyCode || generateCode();
    if (!claims.familyCode) {
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
