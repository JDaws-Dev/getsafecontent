import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { signKidPass, verifyKidPass } from "./safeAuth";

/**
 * Cross-app "kid pass" endpoints — the kid-side twin of the parent Marketing
 * JWT. Lets a kid already signed into one Safe Family app tap the header
 * switcher and land straight on their SafeReads dashboard, skipping the
 * family-code screen AND the PIN. See signKidPass/verifyKidPass in safeAuth.ts
 * (vendored from packages/safe-auth) for the token format + threat model.
 *
 * Both are mutations (not queries) because the pass is time-bound: signing and
 * expiry checks call Date.now(), which Convex only permits outside queries.
 *
 * SafeReads note: kid profiles live in the `kids` table (not `kidProfiles`),
 * resolved family code → user (users.familyCode) → `kids` row matched by NAME
 * (case-insensitive). Profile ids are never portable across apps, so the pass
 * only ever carries the familyCode + kid display name.
 */

function secret() {
  return process.env.MARKETING_JWT_SECRET;
}

/**
 * Mint a short-lived pass for the CURRENTLY signed-in kid. The caller (the kid
 * dashboard) already knows its own family code + profile from localStorage —
 * the server just signs those claims so a sibling app can trust them. No PIN is
 * re-checked here: the kid is already authenticated in this app, and the pass
 * only carries them sideways as the same kid.
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
 * (family code → user → `kids` row matched by name). Returns the profile in the
 * SAME shape the reads login stores as the kid session ({ _id, name, age, color,
 * userId }), with the PIN stripped and a hasPin flag, so the client can store it
 * with no further round-trip.
 */
export const redeemKidPass = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyKidPass(args.token, secret());
    if (!claims) return { ok: false as const, reason: "invalid" as const };

    const user = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) => q.eq("familyCode", claims.fc))
      .first();
    if (!user) return { ok: false as const, reason: "no-family" as const, familyCode: claims.fc };

    const kids = await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const want = claims.kid.trim().toLowerCase();
    const match = kids.find((k) => (k.name ?? "").trim().toLowerCase() === want);
    if (!match) {
      // Family is known but this app has no kid by that name — let the client
      // fall back to the profile picker with the family code pre-filled.
      return { ok: false as const, reason: "no-profile" as const, familyCode: claims.fc };
    }

    return {
      ok: true as const,
      familyCode: claims.fc,
      profile: {
        _id: match._id,
        name: match.name,
        age: match.age,
        color: match.color || "purple",
        userId: user._id,
        onboardingCompleted: match.onboardingCompleted === true,
        hasPin: Boolean(match.pin),
      },
    };
  },
});
