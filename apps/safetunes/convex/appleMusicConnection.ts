import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { resolveTunesIdentity } from "./identity";
import { checkKidPinWithLockout } from "./kidProfiles";

/**
 * Parent connects Apple Music once; every kid device borrows that sign-in.
 *
 * A kid's device used to need its own Apple sign-in, which opens a popup. In an
 * iPhone home-screen web app that popup can't open, so the kid screen spun on
 * "Connecting..." forever. Now the parent's device saves its Apple Music user
 * token here, and a kid device fetches it after proving it's that kid (family
 * code, plus the PIN when the profile has one).
 *
 * Trade-off, accepted deliberately: whoever passes that check can play music
 * on, and read the library of, the parent's Apple Music account. The token is
 * only ever returned by `claimForKid`, never by any other query.
 */

// Apple Music user tokens are long opaque strings; reject obvious junk.
const looksLikeToken = (t: string) => t.length >= 50 && t.length <= 4096 && !/\s/.test(t);

/** Parent-only: save (or refresh) this parent's Apple Music sign-in. */
export const saveForFamily = mutation({
  args: { userToken: v.string(), musicUserToken: v.string() },
  handler: async (ctx, args) => {
    const me = await resolveTunesIdentity(ctx, args.userToken);
    if (!me) throw new Error("Please sign in again.");
    if (!looksLikeToken(args.musicUserToken)) throw new Error("That Apple Music sign-in didn't look right.");

    const existing = await ctx.db
      .query("appleMusicConnections")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .first();
    if (existing) {
      if (existing.musicUserToken !== args.musicUserToken) {
        await ctx.db.patch(existing._id, { musicUserToken: args.musicUserToken, savedAt: Date.now() });
      }
    } else {
      await ctx.db.insert("appleMusicConnections", {
        userId: me._id,
        musicUserToken: args.musicUserToken,
        savedAt: Date.now(),
      });
    }
    return { saved: true };
  },
});

/** Parent-only: forget the saved sign-in (parent disconnected Apple Music). */
export const clearForFamily = mutation({
  args: { userToken: v.string() },
  handler: async (ctx, args) => {
    const me = await resolveTunesIdentity(ctx, args.userToken);
    if (!me) throw new Error("Please sign in again.");
    const rows = await ctx.db
      .query("appleMusicConnections")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return { cleared: rows.length };
  },
});

/**
 * Kid device: borrow the parent's Apple Music sign-in. A mutation, not a
 * query, because a wrong PIN counts toward the same lockout as kid login.
 */
export const claimForKid = mutation({
  args: {
    profileId: v.id("kidProfiles"),
    familyCode: v.string(),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return { status: "denied" as const };
    const parent = await ctx.db.get(profile.userId);
    const code = args.familyCode.trim().toUpperCase();
    if (!parent?.familyCode || parent.familyCode.trim().toUpperCase() !== code) {
      return { status: "denied" as const };
    }

    const connection = await ctx.db
      .query("appleMusicConnections")
      .withIndex("by_user", (q) => q.eq("userId", parent._id))
      .first();
    if (!connection) return { status: "notConnected" as const };

    if (profile.pin) {
      if (!args.pin) return { status: "pinRequired" as const };
      const result = await checkKidPinWithLockout(ctx, profile, args.pin);
      if (!result.valid) {
        return {
          status: "wrongPin" as const,
          locked: result.locked,
          retryAfterSeconds: result.retryAfterSeconds,
        };
      }
    }

    return { status: "ok" as const, musicUserToken: connection.musicUserToken };
  },
});
