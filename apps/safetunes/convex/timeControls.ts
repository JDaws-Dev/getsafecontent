import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveTunesIdentity } from "./identity";

/**
 * "YYYY-MM-DD" for a moment, in the family's own timezone.
 *
 * The shared cross-app limit buckets usage by this string, and Marketing
 * Central deliberately does no timezone maths of its own — so every Safe Family
 * app must agree on where the day boundary falls, or a kid gets a fresh
 * allowance when one app rolls over before another.
 *
 * SafeTunes has always bucketed its own listening minutes in UTC, and
 * `timezone` is unset on every users row today, so this is UTC in practice —
 * matching SafeTube, which is also UTC in practice for the same reason.
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

// Helper to get today's date string in YYYY-MM-DD format
const getTodayDateString = () => dayKeyForTimezone(undefined);

/**
 * Today's bucket key for one kid, in that family's timezone.
 *
 * Every read AND write of `dailyListeningTime` goes through this so the key
 * can't drift: if `timezone` is ever populated, minutes recorded and minutes
 * counted still land in the same row. Unset (the case for every row today) is
 * UTC, which is exactly what SafeTunes has always used.
 */
async function dayKeyForKid(
  ctx: { db: any },
  kidProfileId: Id<"kidProfiles">,
): Promise<string> {
  const profile = await ctx.db.get(kidProfileId);
  if (!profile) return getTodayDateString();
  const parent = await ctx.db.get(profile.userId);
  return dayKeyForTimezone(parent?.timezone);
}

/**
 * Read the cached family-wide verdict for use inside queries.
 *
 * Returns null whenever the family-wide limit does NOT apply — no cache yet, a
 * stale cache because central was unreachable, or central saying no combined
 * limit is set — in which case the caller uses SafeTunes' own per-app limit.
 * That is the fail-open path: a kid never loses access because central had a
 * bad minute.
 *
 * Lives here rather than in sharedScreenTime.ts so the dependency runs one way
 * (sharedScreenTime imports from timeControls, never the reverse) — a circular
 * import between the two would break the Convex bundle.
 */
export async function cachedFamilyLimit(
  ctx: { db: any },
  kidProfileId: Id<"kidProfiles">,
  timezone: string | undefined,
) {
  const day = dayKeyForTimezone(timezone);
  const cache = await ctx.db
    .query("sharedScreenTimeCache")
    .withIndex("by_kid_day", (q: any) =>
      q.eq("kidProfileId", kidProfileId).eq("day", day)
    )
    .first();

  if (!cache || !cache.limitSet) return null;

  // Treat a long-stale cache as "unknown" and fall back to the per-app limit,
  // rather than enforcing a number that may be hours out of date.
  const STALE_MS = 15 * 60 * 1000;
  if (Date.now() - cache.syncedAt > STALE_MS) return null;

  return {
    allowed: cache.allowed as boolean,
    usedMinutes: cache.usedMinutes as number,
    limitMinutes: cache.limitMinutes as number,
    remainingMinutes: (cache.remainingMinutes ?? 0) as number,
  };
}

/**
 * The daily-allowance verdict for one kid — THE single source of truth.
 *
 * Parents choose EITHER a per-app limit OR one overall limit across all five
 * Safe Family apps, never both. When the overall limit is in force it REPLACES
 * the per-app one (and the per-app controls grey out in Settings); otherwise
 * SafeTunes' own `dailyTimeLimitMinutes` governs.
 *
 * Time-of-day ("allowed hours") is deliberately NOT part of this — it stays a
 * per-app setting and is checked separately by the callers that care.
 */
export async function evaluateDailyAllowance(
  ctx: { db: any },
  kidProfileId: Id<"kidProfiles">,
): Promise<{
  scope: "family" | "app";
  isEnabled: boolean;
  limitMinutes: number | null;
  usedMinutes: number;
  remainingMinutes: number | null;
  isLimitReached: boolean;
}> {
  const profile = await ctx.db.get(kidProfileId);
  if (!profile) {
    return {
      scope: "app",
      isEnabled: false,
      limitMinutes: null,
      usedMinutes: 0,
      remainingMinutes: null,
      isLimitReached: false,
    };
  }

  // FAMILY-WIDE LIMIT TAKES PRECEDENCE.
  const parent = await ctx.db.get(profile.userId);
  const family = await cachedFamilyLimit(ctx, kidProfileId, parent?.timezone);
  if (family) {
    return {
      scope: "family",
      isEnabled: true,
      limitMinutes: family.limitMinutes,
      usedMinutes: family.usedMinutes,
      remainingMinutes: family.remainingMinutes,
      isLimitReached: !family.allowed,
    };
  }

  // Fall back to SafeTunes' own per-app limit.
  const isEnabled = (profile.timeLimitEnabled ?? false) && !!profile.dailyTimeLimitMinutes;
  const today = dayKeyForTimezone(parent?.timezone);
  const dailyRecord = await ctx.db
    .query("dailyListeningTime")
    .withIndex("by_kid_and_date", (q: any) =>
      q.eq("kidProfileId", kidProfileId).eq("date", today)
    )
    .first();
  const usedMinutes = dailyRecord?.totalMinutes || 0;
  const limitMinutes = isEnabled ? profile.dailyTimeLimitMinutes : null;

  return {
    scope: "app",
    isEnabled,
    limitMinutes: limitMinutes ?? null,
    usedMinutes,
    remainingMinutes: limitMinutes ? Math.max(0, limitMinutes - usedMinutes) : null,
    isLimitReached: limitMinutes ? usedMinutes >= limitMinutes : false,
  };
}

/**
 * Content-gate helper: true when the kid has used up today's allowance.
 *
 * The queries that hand playable songs to the kid call this and return nothing
 * when it's true — the enforcement a tampered or buggy client can't talk its
 * way past. Recording minutes is NEVER gated (see `addListeningTime`): refusing
 * to record over-cap listening would under-count the day and make the limit
 * easier to exceed, not harder. Record everything, serve nothing.
 */
export async function isOverDailyAllowance(
  ctx: { db: any },
  kidProfileId: Id<"kidProfiles">,
  userToken?: string,
): Promise<boolean> {
  // Parents aren't time-limited. A verified owner token means this is the admin
  // side reading a kid's library (e.g. the playlist exporter), so serve it
  // normally — otherwise the parent's own tools would go blank whenever their
  // kid happened to be over cap. Kid-side calls carry no token and are gated.
  if (userToken) {
    const owner = await resolveTunesIdentity(ctx, userToken);
    if (owner) {
      const profile = await ctx.db.get(kidProfileId);
      if (profile && profile.userId === owner._id) return false;
    }
  }
  const status = await evaluateDailyAllowance(ctx, kidProfileId);
  return status.isEnabled && status.isLimitReached;
}

// Get daily listening time for a kid profile
export const getDailyListeningTime = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const today = await dayKeyForKid(ctx, args.kidProfileId);

    const record = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid_and_date", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("date", today)
      )
      .first();

    return {
      date: today,
      totalMinutes: record?.totalMinutes || 0,
      lastUpdatedAt: record?.lastUpdatedAt || null,
    };
  },
});

// Get time limit settings for a kid profile (includes both daily limit and time-of-day)
export const getTimeLimitSettings = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;

    // Daily allowance — the family-wide limit when one is in force, otherwise
    // SafeTunes' own. The kid UI reads these fields to show "Xm left" and to
    // pop the "time's up" modal, so it must agree with what the content gates
    // enforce; both go through evaluateDailyAllowance.
    const allowance = await evaluateDailyAllowance(ctx, args.kidProfileId);

    // Check time-of-day restrictions
    let isOutsideAllowedHours = false;
    let timeOfDayMessage = null;
    if (profile.timeOfDayEnabled && profile.allowedStartTime && profile.allowedEndTime) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMin] = profile.allowedStartTime.split(':').map(Number);
      const [endHour, endMin] = profile.allowedEndTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMin;
      const endTotalMinutes = endHour * 60 + endMin;

      // Check if outside allowed hours
      if (startTotalMinutes > endTotalMinutes) {
        // Overnight range - blocked if BETWEEN end and start
        isOutsideAllowedHours = currentTotalMinutes >= endTotalMinutes && currentTotalMinutes < startTotalMinutes;
      } else {
        // Normal range - blocked if OUTSIDE start-end
        isOutsideAllowedHours = currentTotalMinutes < startTotalMinutes || currentTotalMinutes >= endTotalMinutes;
      }

      if (isOutsideAllowedHours) {
        const formatTime = (h: number, m: number) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h % 12 || 12;
          return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
        };
        timeOfDayMessage = `Music is available from ${formatTime(startHour, startMin)} to ${formatTime(endHour, endMin)}`;
      }
    }

    return {
      // Daily limit settings
      isEnabled: allowance.isEnabled,
      limitMinutes: allowance.limitMinutes,
      usedMinutes: allowance.usedMinutes,
      remainingMinutes: allowance.remainingMinutes,
      isLimitReached: allowance.isLimitReached,
      // "family" = one limit across all five apps; "app" = SafeTunes' own.
      scope: allowance.scope,
      // Time-of-day settings
      timeOfDayEnabled: profile.timeOfDayEnabled ?? false,
      allowedStartTime: profile.allowedStartTime,
      allowedEndTime: profile.allowedEndTime,
      isOutsideAllowedHours,
      timeOfDayMessage,
    };
  },
});

// Add listening time (called when a song finishes or periodically).
//
// DELIBERATELY UNGATED — do not add a "reject when over cap" check here.
// Refusing to record over-cap minutes would stop them counting toward the daily
// total (both SafeTunes' own and the shared cross-app one), making the limit
// EASIER to exceed. Record everything; enforcement lives in the content gates.
export const addListeningTime = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    minutes: v.number(), // Minutes to add
  },
  handler: async (ctx, args) => {
    const today = await dayKeyForKid(ctx, args.kidProfileId);

    // Find existing record for today
    const existing = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid_and_date", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("date", today)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        totalMinutes: existing.totalMinutes + args.minutes,
        lastUpdatedAt: Date.now(),
      });
      return existing.totalMinutes + args.minutes;
    } else {
      // Create new record for today
      await ctx.db.insert("dailyListeningTime", {
        kidProfileId: args.kidProfileId,
        date: today,
        totalMinutes: args.minutes,
        lastUpdatedAt: Date.now(),
      });
      return args.minutes;
    }
  },
});

// Reset daily listening time (for manual reset by parent)
export const resetDailyListeningTime = mutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const today = await dayKeyForKid(ctx, args.kidProfileId);

    const existing = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid_and_date", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("date", today)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalMinutes: 0,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});

// Get listening history for a kid (for parent dashboard)
export const getListeningHistory = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    days: v.optional(v.number()), // Number of days to fetch (default 7)
  },
  handler: async (ctx, args) => {
    const daysToFetch = args.days || 7;

    // Get all records for this kid
    const records = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // Filter to last N days and sort by date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToFetch);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    return records
      .filter(r => r.date >= cutoffString)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Helper to check if current time is within allowed hours
const isWithinAllowedHours = (startTime: string | undefined, endTime: string | undefined): { allowed: boolean; reason?: string } => {
  if (!startTime || !endTime) return { allowed: true };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  // Handle overnight ranges (e.g., 20:00 - 08:00)
  if (startTotalMinutes > endTotalMinutes) {
    // Allowed if AFTER start OR BEFORE end
    if (currentTotalMinutes >= startTotalMinutes || currentTotalMinutes < endTotalMinutes) {
      return { allowed: true };
    }
  } else {
    // Normal range (e.g., 08:00 - 20:00)
    if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
      return { allowed: true };
    }
  }

  // Format times for display
  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return {
    allowed: false,
    reason: `Music is only available from ${formatTime(startHour, startMin)} to ${formatTime(endHour, endMin)}`,
  };
};

// Check if playback is allowed (returns true if can play, false if limit reached or outside hours)
export const canPlay = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return { canPlay: false, reason: "Profile not found" };

    // Check time-of-day restrictions first
    if (profile.timeOfDayEnabled) {
      const timeCheck = isWithinAllowedHours(profile.allowedStartTime, profile.allowedEndTime);
      if (!timeCheck.allowed) {
        return {
          canPlay: false,
          reason: timeCheck.reason,
          blockedByTimeOfDay: true,
          allowedStartTime: profile.allowedStartTime,
          allowedEndTime: profile.allowedEndTime,
        };
      }
    }

    // Daily allowance — family-wide limit first, then SafeTunes' own.
    const allowance = await evaluateDailyAllowance(ctx, args.kidProfileId);

    // If no daily limit applies, allow (passed time-of-day check above)
    if (!allowance.isEnabled || !allowance.limitMinutes) {
      return { canPlay: true, reason: null };
    }

    if (allowance.isLimitReached) {
      return {
        canPlay: false,
        reason:
          allowance.scope === "family"
            ? `Daily limit of ${allowance.limitMinutes} minutes across all apps reached`
            : `Daily limit of ${allowance.limitMinutes} minutes reached`,
        usedMinutes: allowance.usedMinutes,
        limitMinutes: allowance.limitMinutes,
        scope: allowance.scope,
      };
    }

    return {
      canPlay: true,
      reason: null,
      usedMinutes: allowance.usedMinutes,
      limitMinutes: allowance.limitMinutes,
      remainingMinutes: allowance.remainingMinutes,
      scope: allowance.scope,
    };
  },
});

// Get time limit status for all kids (for parent dashboard overview)
export const getAllKidsTimeLimitStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all kid profiles for this user
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const statuses = [];

    for (const kid of kidProfiles) {
      // Same evaluator the kid side uses, so the parent dashboard shows the
      // family-wide numbers whenever the all-apps limit is in force.
      const allowance = await evaluateDailyAllowance(ctx, kid._id);

      statuses.push({
        kidId: kid._id,
        kidName: kid.name,
        kidAvatar: kid.avatar,
        kidColor: kid.color,
        timeLimitEnabled: allowance.isEnabled,
        limitMinutes: allowance.isEnabled ? allowance.limitMinutes : null,
        usedMinutes: allowance.isEnabled ? allowance.usedMinutes : 0,
        remainingMinutes: allowance.remainingMinutes,
        isBlocked: allowance.isEnabled && allowance.isLimitReached,
        scope: allowance.scope,
      });
    }

    return statuses;
  },
});
