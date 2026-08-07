import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { signKidPass, verifyKidPass } from './safeAuth';
import { establishKidSession } from './kidSessions';

/**
 * Cross-app "kid pass" endpoints — the kid-side twin of the parent Marketing
 * JWT. Lets a kid already signed into one Safe Family app tap the header
 * switcher and land straight on their SafeSpark dashboard, skipping the
 * family-code screen AND the PIN. See signKidPass/verifyKidPass in safeAuth.ts
 * (vendored from packages/safe-auth) for the token format + threat model.
 *
 * Match key across apps = familyCode + kid display NAME (case-insensitive). A
 * profile id is never put in the pass — ids don't survive across the five
 * separate Convex deployments.
 *
 * Both are mutations (not queries): signing/expiry call Date.now(), and
 * redeem WRITES a kidSessions row (SafeSpark's server-side session model),
 * neither of which Convex permits inside a query.
 */

function secret() {
  return process.env.MARKETING_JWT_SECRET;
}

/**
 * Mint a short-lived pass for the CURRENTLY signed-in kid. The caller (the kid
 * header) already knows its own family code + profile name from the live
 * dashboard query — the server just signs those claims so a sibling app can
 * trust them. No PIN is re-checked: the kid is already authenticated in this
 * app, and the pass only carries them sideways as the same kid.
 */
export const mintKidPass = mutation({
  args: {
    familyCode: v.string(),
    kidName: v.string(),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const fc = args.familyCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (fc.length !== 6 || !args.kidName.trim()) return { token: null as string | null };
    const token = await signKidPass(
      { fc, kid: args.kidName.trim(), av: args.avatar, col: args.color },
      secret(),
    );
    return { token };
  },
});

/**
 * Verify an inbound pass, resolve it to THIS app's local kid profile (family
 * code → family → kid matched by display name), and ESTABLISH a SafeSpark kid
 * session for them — the exact success path kidSessions.start uses, minus the
 * PIN gate (the pass IS the proof of a prior PIN-authenticated login). Returns
 * the same `{ ok, token, ... }` shape as kidSessions.start so the client can
 * stash the token in localStorage (`lumiKidSession`) with no extra round-trip.
 */
export const redeemKidPass = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyKidPass(args.token, secret());
    if (!claims) return { ok: false as const, reason: 'invalid' as const };

    const family = await ctx.db
      .query('families')
      .withIndex('by_code', (q) => q.eq('familyCode', claims.fc))
      .first();
    if (!family) {
      return { ok: false as const, reason: 'no-family' as const, familyCode: claims.fc };
    }

    const profiles = await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family._id))
      .collect();

    const want = claims.kid.trim().toLowerCase();
    // Newest-wins on duplicate display names — mirrors families.lookupByCode's
    // de-dupe so the pass lands on the same profile the picker would show.
    const match = profiles
      .filter((p) => p.displayName.trim().toLowerCase() === want)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!match) {
      // Family is known but this app has no kid by that name — let the client
      // fall back to the family-code picker with the code pre-filled.
      return { ok: false as const, reason: 'no-profile' as const, familyCode: claims.fc };
    }

    const session = await establishKidSession(ctx, family._id, match);
    return { ...session, familyCode: claims.fc };
  },
});
