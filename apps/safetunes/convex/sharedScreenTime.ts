import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { dayKeyForTimezone } from "./timeControls";
import { requireProfileOwner } from "./identity";

/**
 * Bridge to the FAMILY-WIDE daily screen-time limit held by Marketing Central.
 *
 * Parents choose ONE of two things:
 *   - a per-app limit (SafeTunes' own kidProfiles.dailyTimeLimitMinutes), or
 *   - one overall limit covering all five Safe Family apps.
 * Setting an overall limit is the toggle: while central reports `limitSet`, it
 * REPLACES SafeTunes' limit and the per-app controls grey out. Clear it (0) and
 * the per-app limit governs again.
 *
 * Convex queries cannot make network calls, and the content gates (the kid's
 * approved songs / albums / playlists / Discover feed) are queries. So this
 * action refreshes a local cache row and those queries read the cache — the
 * same pattern SafeTube uses.
 *
 * FAILS OPEN throughout. If central is unreachable, ADMIN_KEY is missing, or
 * the family has no family code, we leave the cache alone and SafeTunes falls
 * back to its own per-app limit. A kid locked out of every app because central
 * had a bad minute is much worse than a kid getting some extra screen time.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";
const APP = "safetunes";

/** Identity + today's locally-observed listening for one kid. */
export const kidSyncContext = internalQuery({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    const parent = await ctx.db.get(profile.userId);
    if (!parent?.familyCode) return null; // can't be matched across apps without it

    const day = dayKeyForTimezone(parent.timezone);

    // Today's listening minutes as THIS app sees them. SafeTunes already stores
    // one pre-summed row per kid per day, so there's nothing to aggregate.
    const record = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid_and_date", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("date", day)
      )
      .first();
    const todayMinutes = record?.totalMinutes || 0;

    const cache = await ctx.db
      .query("sharedScreenTimeCache")
      .withIndex("by_kid_day", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("day", day)
      )
      .first();

    return {
      familyCode: parent.familyCode,
      kidName: profile.name,
      day,
      todayMinutes,
      reportedMinutes: cache?.reportedMinutes ?? 0,
    };
  },
});

/** Write back what central told us. */
export const storeSyncResult = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    day: v.string(),
    limitSet: v.boolean(),
    allowed: v.boolean(),
    usedMinutes: v.number(),
    limitMinutes: v.number(),
    remainingMinutes: v.optional(v.number()),
    reportedMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sharedScreenTimeCache")
      .withIndex("by_kid_day", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("day", args.day)
      )
      .first();
    const row = { ...args, syncedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("sharedScreenTimeCache", row);
  },
});

/**
 * Report this app's new minutes to central and refresh the cached verdict.
 * Called by the kid client on a timer while a profile is active.
 */
export const sync = action({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args): Promise<{
    synced: boolean;
    reason?: string;
    // Echoed back for operator debugging — a mismatch here is almost always a
    // kid-name difference between apps, which is silent otherwise.
    central?: { allowed: boolean; limitSet: boolean; usedMinutes: number; limitMinutes: number };
    familyCode?: string;
    kidName?: string;
    day?: string;
  }> => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
      // Fail open — never block a kid because we're misconfigured.
      return { synced: false, reason: "not_configured" };
    }

    const info = await ctx.runQuery(internal.sharedScreenTime.kidSyncContext, {
      kidProfileId: args.kidProfileId,
    });
    if (!info) return { synced: false, reason: "no_family_code" };

    // Only send what hasn't been sent yet, so repeated syncs can't double-count.
    const deltaMinutes = Math.max(0, info.todayMinutes - info.reportedMinutes);

    try {
      let status: {
        allowed: boolean; limitSet: boolean; usedMinutes: number;
        limitMinutes: number; remainingMinutes: number | null;
      };

      if (deltaMinutes > 0) {
        const res = await fetch(`${CENTRAL_URL}/sharedScreenTime/record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyCode: info.familyCode,
            kidName: info.kidName,
            day: info.day,
            minutes: deltaMinutes,
            app: APP,
            key: adminKey,
          }),
        });
        if (!res.ok) return { synced: false, reason: `record_${res.status}` };
        status = await res.json();
      } else {
        const url = new URL(`${CENTRAL_URL}/sharedScreenTime/check`);
        url.searchParams.set("familyCode", info.familyCode);
        url.searchParams.set("kidName", info.kidName);
        url.searchParams.set("day", info.day);
        url.searchParams.set("key", adminKey);
        const res = await fetch(url.toString());
        if (!res.ok) return { synced: false, reason: `check_${res.status}` };
        status = await res.json();
      }

      await ctx.runMutation(internal.sharedScreenTime.storeSyncResult, {
        kidProfileId: args.kidProfileId,
        day: info.day,
        limitSet: status.limitSet,
        allowed: status.allowed,
        usedMinutes: status.usedMinutes,
        limitMinutes: status.limitMinutes,
        remainingMinutes: status.remainingMinutes ?? undefined,
        // Advance the watermark only by what we actually sent.
        reportedMinutes: info.reportedMinutes + deltaMinutes,
      });
      return {
        synced: true,
        central: {
          allowed: status.allowed,
          limitSet: status.limitSet,
          usedMinutes: status.usedMinutes,
          limitMinutes: status.limitMinutes,
        },
        familyCode: info.familyCode,
        kidName: info.kidName,
        day: info.day,
      };
    } catch (err) {
      console.error("[sharedScreenTime.sync] central unreachable:", err);
      return { synced: false, reason: "central_unreachable" };
    }
  },
});

// ---------------------------------------------------------------------------
// Parent-facing controls for the family-wide limit.
//
// These are ACTIONS because they talk to Marketing Central over HTTP, which a
// query or mutation cannot do. Ownership is enforced through an internal query
// before anything is read or written — an unauthenticated version of these
// would let anyone reaching the deployment read a family's usage or lift any
// kid's cap across all five apps.
// ---------------------------------------------------------------------------

/** Verify the caller owns this kid, and return the identity central needs. */
export const ownerContext = internalQuery({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfileOwner(
      ctx,
      args.userToken,
      args.kidProfileId,
      "sharedScreenTime.ownerContext"
    );
    const parent = await ctx.db.get(profile.userId);
    if (!parent?.familyCode) return null;
    return {
      familyCode: parent.familyCode,
      kidName: profile.name,
      day: dayKeyForTimezone(parent.timezone),
    };
  },
});

/** Read the family-wide limit + today's combined usage for one kid. */
export const getFamilyLimit = action({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args): Promise<any> => {
    const adminKey = process.env.ADMIN_KEY;
    const info = await ctx.runQuery(internal.sharedScreenTime.ownerContext, args);
    if (!adminKey || !info) return { available: false };
    try {
      const url = new URL(`${CENTRAL_URL}/sharedScreenTime/check`);
      url.searchParams.set("familyCode", info.familyCode);
      url.searchParams.set("kidName", info.kidName);
      url.searchParams.set("day", info.day);
      url.searchParams.set("key", adminKey);
      const res = await fetch(url.toString());
      if (!res.ok) return { available: false };
      const status = await res.json();
      return { available: true, ...status };
    } catch {
      // Central down — tell the UI so it can say "couldn't load" rather than
      // showing "off" and tempting the parent to re-enable something already on.
      return { available: false };
    }
  },
});

/** Set (minutes > 0) or clear (0) the family-wide limit for one kid. */
export const setFamilyLimit = action({
  args: {
    kidProfileId: v.id("kidProfiles"),
    dailyLimitMinutes: v.number(),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const adminKey = process.env.ADMIN_KEY;
    const info = await ctx.runQuery(internal.sharedScreenTime.ownerContext, {
      kidProfileId: args.kidProfileId,
      userToken: args.userToken,
    });
    if (!adminKey) return { ok: false, error: "not_configured" };
    if (!info) return { ok: false, error: "no_family_code" };
    try {
      const res = await fetch(`${CENTRAL_URL}/sharedScreenTime/setLimit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCode: info.familyCode,
          kidName: info.kidName,
          dailyLimitMinutes: args.dailyLimitMinutes,
          key: adminKey,
        }),
      });
      if (!res.ok) return { ok: false, error: `central_${res.status}` };
      return { ok: true };
    } catch {
      return { ok: false, error: "central_unreachable" };
    }
  },
});
