import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { signKidPass, verifyKidPass } from "./safeAuth";

/**
 * Cross-app "kid pass" endpoints — the kid-side twin of the parent Marketing
 * JWT. Lets a kid already signed into one Safe Family app tap the header
 * switcher and land straight on their dashboard in a sibling app, skipping the
 * family-code screen AND the PIN. See signKidPass/verifyKidPass in safeAuth.ts
 * (vendored from packages/safe-auth) for the token format + threat model.
 *
 * Both are mutations (not queries) because the pass is time-bound: signing and
 * expiry checks call Date.now(), which Convex only permits outside queries.
 */

function secret() {
  return process.env.MARKETING_JWT_SECRET;
}

/**
 * Strip sensitive fields from a kid profile before returning it to the client.
 * Mirrors sanitizeProfile in kidProfiles.ts so a redeemed pass yields a profile
 * in the exact shape getProfiles ships (pin + rate-limit internals removed,
 * hasPin flag added).
 */
function sanitizeProfile(profile: Record<string, any>) {
  const { pin, pinFailedAttempts, pinLockedUntil, ...rest } = profile;
  return { ...rest, hasPin: !!pin };
}

/**
 * Mint a short-lived pass for the CURRENTLY signed-in kid. The caller (the kid
 * dashboard) already knows its own family code + profile — the server just
 * signs those claims so a sibling app can trust them. No PIN is re-checked
 * here: the kid is already authenticated in this app, and the pass only carries
 * them sideways as the same kid. Match key is family code + kid NAME.
 */
export const mintKidPass = mutation({
  args: {
    familyCode: v.string(),
    kidName: v.string(),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const fc = args.familyCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (fc.length !== 6 || !args.kidName.trim()) return { token: null as string | null };
    const token = await signKidPass(
      { fc, kid: args.kidName.trim(), av: args.avatar, col: args.color },
      secret(),
    );
    return { token };
  },
});

/**
 * Verify an inbound pass and resolve it to THIS app's local kid profile
 * (family code → user → kid matched by name, case-insensitive). Returns the
 * profile in the same shape getProfiles ships (pin stripped, hasPin flag) so
 * the client can store it as the kid session with no further round-trip.
 */
export const redeemKidPass = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyKidPass(args.token, secret());
    if (!claims) return { ok: false as const, reason: "invalid" as const };

    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", claims.fc))
      .first();
    if (!user) return { ok: false as const, reason: "no-family" as const, familyCode: claims.fc };

    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const want = claims.kid.trim().toLowerCase();
    const match = profiles.find((p) => (p.name ?? "").trim().toLowerCase() === want);
    if (!match) {
      // Family is known but this app has no kid by that name — let the client
      // fall back to the profile picker with the family code pre-filled.
      return { ok: false as const, reason: "no-profile" as const, familyCode: claims.fc };
    }

    return {
      ok: true as const,
      familyCode: claims.fc,
      profile: sanitizeProfile(match),
    };
  },
});
