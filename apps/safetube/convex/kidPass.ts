import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { signKidPass, verifyKidPass } from "./safeAuth";
import { signKidSession, verifyKidSession } from "./kidSession";

/**
 * Cross-app "kid pass" endpoints — the kid-side twin of the parent Marketing
 * JWT. Lets a kid already signed into one Safe Family app tap the header
 * switcher and land straight on their dashboard in a sibling app, skipping the
 * family-code screen AND the PIN. See signKidPass/verifyKidPass in safeAuth.ts
 * (vendored from packages/safe-auth) for the token format + threat model.
 *
 * Both are mutations (not queries) because the pass is time-bound: signing and
 * expiry checks call Date.now(), which Convex only permits outside queries.
 *
 * The ONLY cross-app match keys are familyCode + kid NAME (case-insensitive).
 * Profile ids are per-deployment, so the pass never carries an id.
 */

function secret() {
  return process.env.MARKETING_JWT_SECRET;
}

/**
 * Mint a short-lived pass for the CURRENTLY signed-in kid, so a sibling app
 * can trust "this is Bella" without asking for her PIN again.
 *
 * The caller must prove it IS that kid: for a PIN-protected profile it has to
 * present the kid session token issued when the kid entered their own PIN
 * (attemptKidPin) or redeemed a pass (redeemKidPass) on this device. Before
 * this, anyone with the family code could mint a pass for any sibling's name
 * and skip their PIN via /play?kt=. Profiles without a PIN need no session —
 * there is no PIN to bypass. Returns { token: null } (never throws) when the
 * caller can't prove it, so the switcher falls back to a plain link and the
 * destination app asks for the PIN.
 */
export const mintKidPass = mutation({
  args: {
    familyCode: v.string(),
    kidName: v.string(),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    kidSession: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const none = { token: null as string | null };
    const fc = args.familyCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (fc.length !== 6 || !args.kidName.trim()) return none;

    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", fc))
      .first();
    if (!user) return none;
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const want = args.kidName.trim().toLowerCase();
    const profile = profiles.find((p) => (p.name ?? "").trim().toLowerCase() === want);
    if (!profile) return none;

    if (profile.pin) {
      const session = await verifyKidSession(args.kidSession);
      if (!session || session.pid !== profile._id || session.fc !== fc) return none;
    }

    const token = await signKidPass(
      { fc, kid: profile.name.trim(), av: args.avatar, col: args.color },
      secret(),
    );
    return { token };
  },
});

/**
 * Verify an inbound pass and resolve it to THIS app's local kid profile
 * (family code → user → kid matched by name). Returns the profile with the pin
 * stripped and a hasPin flag, so the client can store it as the selected kid
 * with no further round-trip.
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

    // NB: everything below the pass is only as strong as the app that minted
    // it. SafeTube now requires the kid's own session to mint; sibling apps
    // must do the same, or their passes remain a PIN bypass into SafeTube.
    const { pin, ...rest } = match;
    return {
      ok: true as const,
      familyCode: claims.fc,
      profile: { ...rest, hasPin: Boolean(pin) },
      // The pass proves the kid, so this device gets a kid session too — keeps
      // one-tap switching working onward from SafeTube.
      kidSession: await signKidSession({ fc: claims.fc, pid: match._id }),
    };
  },
});
