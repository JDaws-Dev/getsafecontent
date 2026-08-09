import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireOwner, requireProfileOwner } from "./identity";

// Get time limit settings for a kid — parent-only (the kid side reads its own
// status through `canWatch`, which is deliberately open; see the note there).
export const getTimeLimit = query({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireProfileOwner(ctx, args.userToken, args.kidProfileId, "timeLimits.getTimeLimit");
    const limit = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    return limit || null;
  },
});

// Set/update time limit for a kid
export const setTimeLimit = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    dailyLimitMinutes: v.number(), // 0 = unlimited
    weekendLimitMinutes: v.optional(v.number()),
    allowedStartHour: v.optional(v.number()),
    allowedEndHour: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Parent-only. Without this anyone reaching the deployment could raise or
    // remove any kid's cap — which would silently undo the server-side
    // enforcement in videos.getPlayableContent.
    await requireProfileOwner(ctx, args.userToken, args.kidProfileId, "timeLimits.setTimeLimit");

    const existing = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dailyLimitMinutes: args.dailyLimitMinutes,
        weekendLimitMinutes: args.weekendLimitMinutes,
        allowedStartHour: args.allowedStartHour,
        allowedEndHour: args.allowedEndHour,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const limitId = await ctx.db.insert("timeLimits", {
      kidProfileId: args.kidProfileId,
      dailyLimitMinutes: args.dailyLimitMinutes,
      weekendLimitMinutes: args.weekendLimitMinutes,
      allowedStartHour: args.allowedStartHour,
      allowedEndHour: args.allowedEndHour,
      updatedAt: Date.now(),
    });

    return limitId;
  },
});

// Delete time limit for a kid (removes all restrictions) — parent-only.
// This is the single most abusable call in the module: it lifts the cap
// entirely.
export const deleteTimeLimit = mutation({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireProfileOwner(ctx, args.userToken, args.kidProfileId, "timeLimits.deleteTimeLimit");

    const existing = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Helper to get current hour in a timezone
function getCurrentHourInTimezone(timezone: string | undefined): { hour: number; dayOfWeek: number; startOfDay: number } {
  const now = new Date();

  if (!timezone) {
    // Fallback to UTC if no timezone set
    return {
      hour: now.getUTCHours(),
      dayOfWeek: now.getUTCDay(),
      startOfDay: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    };
  }

  try {
    // Get the current time in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '2025', 10);
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);

    // Map weekday string to day number (0 = Sunday)
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = weekdayMap[weekdayStr] ?? now.getDay();

    // Calculate start of day in the user's timezone
    // Create a date at midnight in the user's timezone
    const startOfDayLocal = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`);
    // Get timezone offset for that date
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const tzParts = tzFormatter.formatToParts(startOfDayLocal);
    const offsetStr = tzParts.find(p => p.type === 'timeZoneName')?.value || 'GMT';

    // Parse offset like "GMT-5" or "GMT+5:30"
    let offsetMinutes = 0;
    const offsetMatch = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (offsetMatch) {
      const sign = offsetMatch[1] === '+' ? 1 : -1;
      const hours = parseInt(offsetMatch[2], 10);
      const mins = parseInt(offsetMatch[3] || '0', 10);
      offsetMinutes = sign * (hours * 60 + mins);
    }

    // Start of day in UTC milliseconds
    const startOfDay = Date.UTC(year, month, day) - offsetMinutes * 60 * 1000;

    return { hour, dayOfWeek, startOfDay };
  } catch {
    // If timezone parsing fails, fall back to UTC
    return {
      hour: now.getUTCHours(),
      dayOfWeek: now.getUTCDay(),
      startOfDay: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    };
  }
}

/**
 * "YYYY-MM-DD" for a moment, in the family's own timezone.
 *
 * The shared cross-app limit buckets usage by this string, and Marketing
 * Central deliberately does no timezone maths of its own — so every app must
 * agree on where the day boundary falls, or a kid gets a fresh allowance when
 * one app rolls over before another.
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

/**
 * Shared time-limit evaluation. THE single source of truth — the `canWatch`
 * query, the kid's content feed (videos.getPlayableContent) and watch recording
 * all call this, so an enforcement point can't drift from what the UI shows.
 *
 * Enforcement note: SafeTube embeds the YouTube iframe directly, so the server
 * can never truly stop a frame from rendering. What it CAN do is refuse to hand
 * out watchable content once the cap is hit, which is what
 * getPlayableContent uses this for. Client-side checks alone were bypassable
 * (a tampered client, or the shorts auto-advance bug, just kept playing).
 */
export async function evaluateTimeLimit(
  ctx: { db: any },
  kidProfileId: Id<"kidProfiles">,
) {
  // FAMILY-WIDE LIMIT TAKES PRECEDENCE.
  //
  // Parents set EITHER a per-app limit OR one overall limit across all five
  // apps — not both. When an overall limit is in force, it replaces everything
  // below; the per-app settings are ignored (and greyed out in the UI).
  //
  // cachedFamilyLimit returns null whenever the overall limit doesn't apply —
  // not set, no cache yet, or the cache is stale because central was
  // unreachable — and we fall through to this app's own limit. That's the
  // fail-open path: a kid never loses access because central had a bad minute.
  const profileForShared = await ctx.db.get(kidProfileId);
  if (profileForShared) {
    const parentForShared = await ctx.db.get(profileForShared.userId);
    const family = await cachedFamilyLimit(
      ctx,
      kidProfileId,
      parentForShared?.timezone
    );
    if (family) {
      return {
        canWatch: family.allowed,
        reason: family.allowed ? null : "family_limit_reached",
        scope: "family" as const,
        dailyLimit: family.limitMinutes,
        dailyLimitMinutes: family.limitMinutes,
        watchedMinutes: family.usedMinutes,
        remainingMinutes: family.remainingMinutes,
        minutesRemaining: family.remainingMinutes,
      };
    }
  }

  const limit = await ctx.db
    .query("timeLimits")
    .withIndex("by_kid", (q: any) => q.eq("kidProfileId", kidProfileId))
    .first();

  if (!limit || limit.dailyLimitMinutes === 0) {
    return { canWatch: true, reason: null, remainingMinutes: null };
  }

  const kidProfile = await ctx.db.get(kidProfileId);
  if (!kidProfile) {
    return { canWatch: true, reason: null, remainingMinutes: null };
  }

  const parentUser = await ctx.db.get(kidProfile.userId);
  const { hour: currentHour, dayOfWeek, startOfDay: startOfToday } =
    getCurrentHourInTimezone(parentUser?.timezone);

  if (limit.allowedStartHour !== undefined && limit.allowedEndHour !== undefined) {
    const start = limit.allowedStartHour;
    const end = limit.allowedEndHour;
    const outside =
      start <= end
        ? currentHour < start || currentHour >= end
        : currentHour >= end && currentHour < start;
    if (outside) {
      return {
        canWatch: false,
        reason: "outside_hours",
        allowedStart: start,
        allowedEnd: end,
        allowedStartHour: start,
        allowedEndHour: end,
        remainingMinutes: null,
        minutesRemaining: null,
      };
    }
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dailyLimit =
    isWeekend && limit.weekendLimitMinutes !== undefined
      ? limit.weekendLimitMinutes
      : limit.dailyLimitMinutes;

  if (dailyLimit === 0) {
    return { canWatch: true, reason: null, remainingMinutes: null };
  }

  const history = await ctx.db
    .query("watchHistory")
    .withIndex("by_kid_recent", (q: any) => q.eq("kidProfileId", kidProfileId))
    .filter((q: any) => q.gte(q.field("watchedAt"), startOfToday))
    .collect();

  const watchedMinutes = Math.round(
    history.reduce((sum: number, h: any) => sum + (h.watchDurationSeconds || 0), 0) / 60
  );
  const remainingMinutes = Math.max(0, dailyLimit - watchedMinutes);

  if (remainingMinutes <= 0) {
    return {
      canWatch: false,
      reason: "limit_reached",
      dailyLimit,
      dailyLimitMinutes: dailyLimit,
      watchedMinutes,
      remainingMinutes: 0,
      minutesRemaining: 0,
    };
  }

  return {
    canWatch: true,
    reason: null,
    dailyLimit,
    dailyLimitMinutes: dailyLimit,
    watchedMinutes,
    remainingMinutes,
    minutesRemaining: remainingMinutes,
  };
}

// Check if a kid can watch (based on time limits and current watch time).
//
// DELIBERATELY UNAUTHENTICATED — do not "fix" this by adding requireOwner.
// This is the kid-side path: the kid signs in with a family code and holds no
// parent JWT, so a hard owner check here would break the player for every
// child. It is read-only and returns only that kid's own remaining-time status
// (no PII, nothing cross-family), and knowing your own remaining minutes grants
// no extra access — the actual gate is videos.getPlayableContent, which refuses
// to serve content once the cap is hit.
export const canWatch = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Delegates to the shared evaluator so the UI can never disagree with what
    // the content feed enforces.
    return await evaluateTimeLimit(ctx, args.kidProfileId);
  },
});

// Get all time limits for a user's kids (simple version)
export const getAllTimeLimits = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userToken, args.userId, "timeLimits.getAllTimeLimits");
    // Get all kid profiles
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get time limits for each
    const limits = [];
    for (const profile of profiles) {
      const limit = await ctx.db
        .query("timeLimits")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
        .first();

      if (limit) {
        limits.push(limit);
      }
    }

    return limits;
  },
});

// Get time limits for all kids of a user (for parent dashboard)
export const getTimeLimitsForUser = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userToken, args.userId, "timeLimits.getTimeLimitsForUser");
    // Get all kid profiles
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get time limits for each
    const limitsWithKids = await Promise.all(
      profiles.map(async (profile) => {
        const limit = await ctx.db
          .query("timeLimits")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .first();

        // Get today's watch time
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const history = await ctx.db
          .query("watchHistory")
          .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", profile._id))
          .filter((q) => q.gte(q.field("watchedAt"), startOfToday))
          .collect();

        const watchedMinutesToday = Math.round(
          history.reduce((sum, h) => sum + (h.watchDurationSeconds || 0), 0) / 60
        );

        return {
          kidProfileId: profile._id,
          kidName: profile.name,
          kidIcon: profile.icon,
          kidColor: profile.color,
          limit: limit || null,
          watchedMinutesToday,
        };
      })
    );

    return limitsWithKids;
  },
});

/**
 * Read the cached family-wide verdict for use inside queries.
 *
 * Returns null when the family-wide limit does not apply — no cache, stale
 * cache, or central says no combined limit is set — in which case the caller
 * uses its own per-app limit.
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
    allowed: cache.allowed,
    usedMinutes: cache.usedMinutes,
    limitMinutes: cache.limitMinutes,
    remainingMinutes: cache.remainingMinutes ?? 0,
  };
}
