import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { dayKeyForTimezone } from "./timeLimits";
import { requireProfileOwner } from "./identity";

/**
 * Bridge to the FAMILY-WIDE daily screen-time limit held by Marketing Central.
 *
 * Parents choose ONE of two things:
 *   - a per-app limit (SafeStudy's own searches-per-day budget), or
 *   - one overall limit in minutes covering all five Safe Family apps.
 * Setting an overall limit is the toggle: when central reports `limitSet`, it
 * REPLACES this app's limit. Clear it and the per-app limit governs again.
 *
 * Convex queries cannot make network calls, and the gate (timeLimits.canSearch)
 * is a query. So this action refreshes a local cache row and the query reads
 * that — the same pattern SafeTube uses.
 *
 * FAILS OPEN throughout. If central is unreachable, or ADMIN_KEY is missing, we
 * leave the cache alone and the app falls back to its own per-app limit. A kid
 * locked out of every app because central had a bad minute is much worse than a
 * kid getting some extra screen time.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";
const APP = "safestudy";

/* ---------------------------------------------------------------------------
 * What "usage" means in SafeStudy.
 *
 * SafeStudy is a search/tutor product, not a player, so there is no natural
 * "duration" the way a video has one. We measure ENGAGED time: the minutes a
 * kid spends actually asking things and reading answers, reconstructed from the
 * timestamps of their real activity today (searches, blocked search attempts,
 * and tutor exchanges).
 *
 *   - Two activities less than ACTIVE_GAP apart count as continuous time, so a
 *     kid reading, thinking and asking a follow-up is credited for all of it.
 *   - A longer gap means they walked away: we credit only READ_CREDIT for the
 *     earlier activity (time spent reading that answer) and skip the idle span.
 *   - The last activity of the day earns the same READ_CREDIT.
 *
 * Consequence, and the whole point: a SafeStudy tab left open overnight adds
 * ZERO minutes — nothing is recorded unless the kid does something. SafeTube
 * learned this the hard way when a player left running logged 19-hour days.
 *
 * The measure is monotonic (new activity can only ever add time), which is what
 * makes the delta watermark in `sync` safe.
 * ------------------------------------------------------------------------- */
const ACTIVE_GAP_MS = 5 * 60 * 1000;
const READ_CREDIT_MS = 2 * 60 * 1000;

function engagedSecondsFromEvents(timestamps: number[]): number {
  if (timestamps.length === 0) return 0;
  const sorted = [...timestamps].sort((a, b) => a - b);
  let ms = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    ms += gap <= ACTIVE_GAP_MS ? gap : READ_CREDIT_MS;
  }
  ms += READ_CREDIT_MS; // reading time after the final activity
  return Math.floor(ms / 1000);
}

/** Identity + today's locally-observed engaged time for one kid. */
export const kidSyncContext = internalQuery({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    const parent = await ctx.db.get(profile.userId);
    if (!parent?.familyCode) return null; // can't be matched across apps without it

    const tz = parent.timezone;
    const day = dayKeyForTimezone(tz);
    // Coarse lower bound for the scans; the exact day is decided by the
    // timezone-aware key below, so this only has to be generous.
    const since = Date.parse(day + "T00:00:00Z") - 24 * 60 * 60 * 1000;
    const isToday = (at: number) => dayKeyForTimezone(tz, at) === day;

    const searches = await ctx.db
      .query("searchHistory")
      .withIndex("by_kid_recent", (q) =>
        q.eq("kidProfileId", args.kidProfileId).gte("searchedAt", since)
      )
      .collect();

    const blocked = await ctx.db
      .query("blockedSearches")
      .withIndex("by_kid_recent", (q) =>
        q.eq("kidProfileId", args.kidProfileId).gte("searchedAt", since)
      )
      .collect();

    // A blocked attempt is still the kid using the app, so it counts. Recent
    // sessions only — tutor sessions roll over after 30 idle minutes, so a
    // day's worth is a handful of rows.
    const sessions = await ctx.db
      .query("tutorSessions")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(25);

    const events: number[] = [];
    for (const s of searches) if (isToday(s.searchedAt)) events.push(s.searchedAt);
    for (const b of blocked) if (isToday(b.searchedAt)) events.push(b.searchedAt);
    for (const s of sessions) {
      // Sessions written before Aug 2026 have no per-exchange timestamps; fall
      // back to the session's last message so they're not invisible.
      const stamps = s.messageTimestamps ?? [s.lastMessageAt];
      for (const at of stamps) if (isToday(at)) events.push(at);
    }

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
      todaySeconds: engagedSecondsFromEvents(events),
      reportedSeconds: cache?.reportedSeconds ?? 0,
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
    reportedSeconds: v.number(),
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
 *
 * Minutes are reported whether or not the kid is over the cap. Withholding
 * over-cap usage would stop it counting anywhere and make the shared limit
 * EASIER to exceed, not harder — enforcement happens by refusing to serve
 * results (timeLimits.canSearch), never by refusing to record.
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
        kidProfileId: args.kidProfileId,
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
// before anything is read or written — without it these would be an IDOR that
// let anyone read or raise any kid's cross-app cap.
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
