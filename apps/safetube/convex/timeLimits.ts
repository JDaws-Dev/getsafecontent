import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Get time limit settings for a kid
export const getTimeLimit = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
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

// Delete time limit for a kid (removes all restrictions)
export const deleteTimeLimit = mutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
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

// Check if a kid can watch (based on time limits and current watch time)
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
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
