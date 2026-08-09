import { GenericDatabaseReader } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { requireOwner, requireKidOwner } from "./identity";

/** Read-only DB handle — the only thing the shared helpers below need. */
type Ctx = { db: GenericDatabaseReader<DataModel> };
type KidDoc = DataModel["kids"]["document"];

/**
 * SafeReads daily screen-time limits.
 *
 * WHAT COUNTS AS USAGE
 * Active reading time only — seconds where a book, Bible chapter, or audiobook
 * is actually open AND the child is either interacting with it (scroll, tap,
 * key) or the audio is playing. Idle time with the app parked on a page does
 * NOT count. SafeTube learned this the expensive way: a player left open
 * overnight logged 19-hour "watch" days and made every limit meaningless.
 * The accrual rules live client-side in src/hooks/useReadingTime.ts; this
 * module is the ledger and the judge.
 *
 * TWO KINDS OF LIMIT, NEVER BOTH
 * Parents set EITHER a per-app SafeReads limit (the `timeLimits` table here) OR
 * one overall limit across all five Safe Family apps (held by Marketing Central,
 * mirrored into `sharedScreenTimeCache` by convex/sharedScreenTime.ts). While
 * central reports `limitSet`, the overall limit REPLACES this app's own and the
 * per-app controls grey out.
 *
 * FAIL OPEN
 * Every unknown resolves to "allowed": no cache, stale cache, missing family
 * code, central unreachable, no local limit. A child locked out of their books
 * because a server had a bad minute is far worse than a few extra minutes read.
 */

// ---------------------------------------------------------------------------
// Day/time helpers
// ---------------------------------------------------------------------------

/**
 * "YYYY-MM-DD" for a moment, in the family's own timezone.
 *
 * The shared cross-app limit buckets usage by this string and Marketing Central
 * does no timezone maths of its own, so every app must agree on where the day
 * boundary falls — otherwise a kid gets a fresh allowance each time one app
 * rolls over before another.
 */
export function dayKeyForTimezone(timezone: string | undefined, at?: number): string {
  const when = new Date(at ?? Date.now());
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the key we want.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(when);
  } catch {
    return when.toISOString().slice(0, 10);
  }
}

/** Current hour (0-23) and day-of-week (0 = Sunday) in the family's timezone. */
function localHourAndDay(timezone: string | undefined): { hour: number; dayOfWeek: number } {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      hour12: false,
      weekday: "short",
    }).formatToParts(now);
    const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
    // Intl can render midnight as "24" in some locales/engines.
    const hour = parseInt(hourStr, 10) % 24;
    const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return { hour, dayOfWeek: weekdayMap[weekdayStr] ?? now.getUTCDay() };
  } catch {
    return { hour: now.getUTCHours(), dayOfWeek: now.getUTCDay() };
  }
}

/** The parent's timezone for a kid, or undefined when it can't be resolved. */
async function timezoneForKid(
  ctx: Ctx,
  kidId: Id<"kids">,
): Promise<{ timezone: string | undefined; kid: KidDoc | null }> {
  const kid = await ctx.db.get(kidId);
  if (!kid) return { timezone: undefined, kid: null };
  const parent = await ctx.db.get(kid.userId);
  return { timezone: parent?.timezone, kid };
}

// ---------------------------------------------------------------------------
// Evaluation — the single source of truth
// ---------------------------------------------------------------------------

/**
 * Read the cached family-wide verdict for use inside a query.
 *
 * Returns null whenever the overall limit does not apply — no cache row, a
 * stale one, or central saying no overall limit is set — in which case the
 * caller falls back to SafeReads' own per-app limit.
 */
export async function cachedFamilyLimit(
  ctx: Ctx,
  kidId: Id<"kids">,
  timezone: string | undefined,
) {
  const day = dayKeyForTimezone(timezone);
  const cache = await ctx.db
    .query("sharedScreenTimeCache")
    .withIndex("by_kid_day", (q) => q.eq("kidId", kidId).eq("day", day))
    .first();

  if (!cache || !cache.limitSet) return null;

  // A long-stale verdict is treated as "unknown" rather than enforced — the
  // number could be hours out of date, and over-enforcing is the worse error.
  const STALE_MS = 15 * 60 * 1000;
  if (Date.now() - cache.syncedAt > STALE_MS) return null;

  return {
    allowed: cache.allowed,
    usedMinutes: cache.usedMinutes,
    limitMinutes: cache.limitMinutes,
    remainingMinutes: cache.remainingMinutes ?? 0,
  };
}

export type LimitVerdict = {
  canRead: boolean;
  reason: null | "family_limit_reached" | "limit_reached" | "outside_hours";
  scope: "family" | "app" | "none";
  dailyLimitMinutes: number | null;
  minutesUsed: number;
  minutesRemaining: number | null;
  allowedStartHour?: number;
  allowedEndHour?: number;
};

const ALLOWED: LimitVerdict = {
  canRead: true,
  reason: null,
  scope: "none",
  dailyLimitMinutes: null,
  minutesUsed: 0,
  minutesRemaining: null,
};

/**
 * Decide whether a kid may be served readable content right now.
 *
 * Called by the kid-facing `canRead` query AND by every content gate
 * (freeBooks.getFreeBookContent, bible.getChapter, librivox.getLibriVoxChapters)
 * so what the child is told can never drift from what the server enforces.
 */
export async function evaluateTimeLimit(
  ctx: Ctx,
  kidId: Id<"kids">,
): Promise<LimitVerdict> {
  const { timezone, kid } = await timezoneForKid(ctx, kidId);
  if (!kid) return ALLOWED; // unknown kid — not our place to lock anything

  // 1. THE FAMILY-WIDE LIMIT WINS when it's in force. It replaces the per-app
  //    limit entirely; the settings below are ignored (and greyed out in the
  //    parent UI). cachedFamilyLimit returns null on every uncertainty, which
  //    is the fail-open path down to the per-app limit.
  const family = await cachedFamilyLimit(ctx, kidId, timezone);
  if (family) {
    return {
      canRead: family.allowed,
      reason: family.allowed ? null : "family_limit_reached",
      scope: "family",
      dailyLimitMinutes: family.limitMinutes,
      minutesUsed: family.usedMinutes,
      minutesRemaining: family.remainingMinutes,
    };
  }

  // 2. SafeReads' own per-app limit.
  const limit = await ctx.db
    .query("timeLimits")
    .withIndex("by_kid", (q) => q.eq("kidId", kidId))
    .first();

  if (!limit) return ALLOWED;

  const { hour, dayOfWeek } = localHourAndDay(timezone);

  if (limit.allowedStartHour !== undefined && limit.allowedEndHour !== undefined) {
    const start = limit.allowedStartHour;
    const end = limit.allowedEndHour;
    // A window that wraps past midnight (e.g. 20 → 7) is inverted.
    const outside =
      start <= end ? hour < start || hour >= end : hour >= end && hour < start;
    if (outside) {
      return {
        canRead: false,
        reason: "outside_hours",
        scope: "app",
        dailyLimitMinutes: limit.dailyLimitMinutes || null,
        minutesUsed: 0,
        minutesRemaining: null,
        allowedStartHour: start,
        allowedEndHour: end,
      };
    }
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dailyLimit =
    isWeekend && limit.weekendLimitMinutes !== undefined
      ? limit.weekendLimitMinutes
      : limit.dailyLimitMinutes;

  if (!dailyLimit || dailyLimit <= 0) return ALLOWED; // 0 = unlimited

  const minutesUsed = await minutesUsedToday(ctx, kidId, timezone);
  const minutesRemaining = Math.max(0, dailyLimit - minutesUsed);

  return {
    canRead: minutesRemaining > 0,
    reason: minutesRemaining > 0 ? null : "limit_reached",
    scope: "app",
    dailyLimitMinutes: dailyLimit,
    minutesUsed,
    minutesRemaining,
  };
}

/** Whole minutes of active reading recorded for this kid today. */
async function minutesUsedToday(
  ctx: Ctx,
  kidId: Id<"kids">,
  timezone: string | undefined,
): Promise<number> {
  const day = dayKeyForTimezone(timezone);
  const row = await ctx.db
    .query("readingUsage")
    .withIndex("by_kid_day", (q) => q.eq("kidId", kidId).eq("day", day))
    .first();
  return Math.floor((row?.seconds ?? 0) / 60);
}

// ---------------------------------------------------------------------------
// Kid-side API
// ---------------------------------------------------------------------------

/**
 * Record active reading seconds.
 *
 * DELIBERATELY UNAUTHENTICATED, and deliberately records even when the cap is
 * already blown. Kids hold no parent JWT, and refusing to record over-cap
 * minutes would stop them counting — which makes a limit EASIER to exceed, not
 * harder. Enforcement is done by refusing to serve content, never by refusing
 * to write the ledger.
 *
 * The per-call cap keeps a wedged or tampered client from inflating the day in
 * one shot; the honest client sends ~30s at a time.
 */
export const recordUsage = mutation({
  args: {
    kidId: v.id("kids"),
    seconds: v.number(),
  },
  handler: async (ctx, args) => {
    const seconds = Math.floor(args.seconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const capped = Math.min(seconds, 15 * 60);

    const { timezone, kid } = await timezoneForKid(ctx, args.kidId);
    if (!kid) return null;

    const day = dayKeyForTimezone(timezone);
    const existing = await ctx.db
      .query("readingUsage")
      .withIndex("by_kid_day", (q) => q.eq("kidId", args.kidId).eq("day", day))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        seconds: existing.seconds + capped,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("readingUsage", {
        kidId: args.kidId,
        day,
        seconds: capped,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Can this kid read right now?
 *
 * DELIBERATELY UNAUTHENTICATED — do not "fix" this by adding requireOwner. The
 * kid signs in with a family code and holds no parent token, so an owner check
 * would break every child's bookshelf. It's read-only, returns only that
 * child's own remaining-time status (no PII, nothing cross-family), and knowing
 * your own remaining minutes grants no extra access: the real gates are the
 * content actions, which refuse to serve once the cap is hit.
 */
export const canRead = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args): Promise<LimitVerdict> => {
    return await evaluateTimeLimit(ctx, args.kidId);
  },
});

// ---------------------------------------------------------------------------
// Parent-side API — every one of these is ownership-checked
// ---------------------------------------------------------------------------

/** This kid's per-app SafeReads limit, or null when none is set. */
export const getTimeLimit = query({
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "timeLimits.getTimeLimit");
    return await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();
  },
});

/**
 * Set or update the per-app limit. Parent-only: without the ownership check
 * anyone reaching the deployment URL could raise or erase any child's cap and
 * silently undo the server-side gates.
 */
export const setTimeLimit = mutation({
  args: {
    kidId: v.id("kids"),
    dailyLimitMinutes: v.number(), // 0 = unlimited
    weekendLimitMinutes: v.optional(v.number()),
    allowedStartHour: v.optional(v.number()),
    allowedEndHour: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "timeLimits.setTimeLimit");

    const existing = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    const fields = {
      dailyLimitMinutes: args.dailyLimitMinutes,
      weekendLimitMinutes: args.weekendLimitMinutes,
      allowedStartHour: args.allowedStartHour,
      allowedEndHour: args.allowedEndHour,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("timeLimits", { kidId: args.kidId, ...fields });
  },
});

/** Remove the per-app limit entirely. The most abusable call here — hence the check. */
export const deleteTimeLimit = mutation({
  args: { kidId: v.id("kids"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "timeLimits.deleteTimeLimit");
    const existing = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/**
 * Every kid's limit plus today's usage, for the parent dashboard.
 * Note `minutesUsedToday` here is SafeReads' own number; the combined
 * cross-app total comes from sharedScreenTime.getFamilyLimit.
 */
export const getTimeLimitsForUser = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userToken, args.userId, "timeLimits.getTimeLimitsForUser");
    const parent = await ctx.db.get(args.userId);
    const kids = await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return await Promise.all(
      kids.map(async (kid) => ({
        kidId: kid._id,
        kidName: kid.name,
        limit:
          (await ctx.db
            .query("timeLimits")
            .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
            .first()) ?? null,
        minutesUsedToday: await minutesUsedToday(ctx, kid._id, parent?.timezone),
      }))
    );
  },
});
