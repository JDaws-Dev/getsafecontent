import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { dayKeyForTimezone } from "./timeLimits";
import { requireKidOwner } from "./identity";

/**
 * Bridge to the FAMILY-WIDE daily screen-time limit held by Marketing Central.
 *
 * Parents choose ONE of two things:
 *   - a per-app limit (SafeReads' own `timeLimits` table), or
 *   - one overall limit covering all five Safe Family apps.
 * Setting the overall limit IS the toggle: while central reports `limitSet`, it
 * REPLACES SafeReads' limit. Clear it and the per-app limit governs again.
 *
 * Convex queries cannot make network calls, and the content gates are queries
 * and actions that must answer instantly. So this action pushes SafeReads'
 * minutes to central, refreshes a local cache row, and timeLimits.ts reads that
 * cache — the same pattern SafeTube uses.
 *
 * FAILS OPEN throughout. Missing ADMIN_KEY, missing family code, or central
 * unreachable all leave the cache alone, and SafeReads falls back to its own
 * per-app limit (and to allowing access if there isn't one).
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";
const APP = "safereads";

/** Identity + today's locally-observed usage for one kid. */
export const kidSyncContext = internalQuery({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) return null;
    const parent = await ctx.db.get(kid.userId);
    if (!parent?.familyCode) return null; // can't be matched across apps without it

    const day = dayKeyForTimezone(parent.timezone);

    const usage = await ctx.db
      .query("readingUsage")
      .withIndex("by_kid_day", (q) => q.eq("kidId", args.kidId).eq("day", day))
      .first();

    const cache = await ctx.db
      .query("sharedScreenTimeCache")
      .withIndex("by_kid_day", (q) => q.eq("kidId", args.kidId).eq("day", day))
      .first();

    return {
      familyCode: parent.familyCode,
      kidName: kid.name,
      day,
      todaySeconds: usage?.seconds ?? 0,
      reportedSeconds: cache?.reportedSeconds ?? 0,
    };
  },
});

/** Write back what central told us. */
export const storeSyncResult = internalMutation({
  args: {
    kidId: v.id("kids"),
    day: v.string(),
    limitSet: v.boolean(),
    allowed: v.boolean(),
    usedMinutes: v.number(),
    limitMinutes: v.number(),
    remainingMinutes: v.optional(v.number()),
    reportedSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sharedScreenTimeCache")
      .withIndex("by_kid_day", (q) => q.eq("kidId", args.kidId).eq("day", args.day))
      .first();
    const row = { ...args, syncedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("sharedScreenTimeCache", row);
  },
});

/**
 * Report SafeReads' new minutes to central and refresh the cached verdict.
 * Called by the kid client on a timer while reading.
 */
export const sync = action({
  args: { kidId: v.id("kids") },
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
      kidId: args.kidId,
    });
    if (!info) return { synced: false, reason: "no_family_code" };

    // Only send what hasn't been sent yet, so repeated syncs can't double-count.
    const deltaSeconds = Math.max(0, info.todaySeconds - info.reportedSeconds);
    const deltaMinutes = Math.floor(deltaSeconds / 60);

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
        kidId: args.kidId,
        day: info.day,
        limitSet: status.limitSet,
        allowed: status.allowed,
        usedMinutes: status.usedMinutes,
        limitMinutes: status.limitMinutes,
        remainingMinutes: status.remainingMinutes ?? undefined,
        // Only advance the watermark by whole minutes we actually sent.
        reportedSeconds: info.reportedSeconds + deltaMinutes * 60,
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
// before anything is read or written — an unauthenticated version would let
// anyone reaching the deployment URL read or rewrite any child's cap.
// ---------------------------------------------------------------------------

/** Verify the caller is this kid's parent, and return the identity central needs. */
export const ownerContext = internalQuery({
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const kid = await requireKidOwner(
      ctx,
      args.userToken,
      args.kidId,
      "sharedScreenTime.ownerContext"
    );
    const parent = await ctx.db.get(kid.userId);
    if (!parent?.familyCode) return null;
    return {
      familyCode: parent.familyCode,
      kidName: kid.name,
      day: dayKeyForTimezone(parent.timezone),
    };
  },
});

type FamilyLimitStatus = {
  available: boolean;
  limitSet?: boolean;
  allowed?: boolean;
  usedMinutes?: number;
  limitMinutes?: number;
  remainingMinutes?: number | null;
};

/** Read the family-wide limit + today's combined usage for one kid. */
export const getFamilyLimit = action({
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args): Promise<FamilyLimitStatus> => {
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
    kidId: v.id("kids"),
    dailyLimitMinutes: v.number(),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const adminKey = process.env.ADMIN_KEY;
    const info = await ctx.runQuery(internal.sharedScreenTime.ownerContext, {
      kidId: args.kidId,
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
