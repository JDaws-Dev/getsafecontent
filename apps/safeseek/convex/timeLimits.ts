import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireOwnerSoft, requireProfileOwner } from "./identity";

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
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

// Delete time limit for a kid (removes all restrictions)
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
    const startOfDayLocal = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`);
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
 * one app rolls over before another. Byte-identical to SafeTube's.
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
 * Read the cached family-wide verdict for use inside queries.
 *
 * Returns null when the family-wide limit does not apply — no cache, stale
 * cache, or central says no combined limit is set — in which case the caller
 * uses SafeStudy's own per-app limit. This is the fail-open path: a kid never
 * loses access because central had a bad minute.
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

// Strictness-based default daily query budget.
// Apr 2026: a kid running 48 searches in one day is doom-scrolling, not learning.
// Caps default to a level that's permissive for real curiosity but stops
// synonym-shuffling behavior. Parents can override with explicit
// `kidProfiles.dailyQueryBudget` or a `timeLimits` row.
function strictnessDefaultBudget(strictness: string | undefined): number | null {
  switch (strictness) {
    case "strict":
      return 15;
    case "moderate":
      return 25;
    case "light":
      return 50;
    default:
      return null; // unlimited
  }
}

// Check if a kid can search (based on hours, profile budget, and explicit time-limit row)
export const canSearch = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const kidProfile = await ctx.db.get(args.kidProfileId);
    if (!kidProfile) {
      return { canSearch: true, reason: null, remainingSearches: null };
    }

    // Get parent user to get timezone
    const parentUser = await ctx.db.get(kidProfile.userId);
    const timezone = parentUser?.timezone;

    // FAMILY-WIDE LIMIT TAKES PRECEDENCE.
    //
    // Parents set EITHER a per-app limit OR one overall limit across all five
    // apps — not both. When an overall limit is in force it replaces everything
    // below (including this app's allowed-hours window); the per-app settings
    // are ignored, and greyed out in the parent UI so that's visible.
    //
    // cachedFamilyLimit returns null whenever the overall limit doesn't apply —
    // not set, no cache yet, or the cache is stale because central was
    // unreachable — and we fall through to SafeStudy's own search budget.
    const family = await cachedFamilyLimit(ctx, args.kidProfileId, timezone);
    if (family) {
      return {
        canSearch: family.allowed,
        reason: family.allowed ? null : "family_limit_reached",
        scope: "family" as const,
        limitMinutes: family.limitMinutes,
        usedMinutes: family.usedMinutes,
        remainingMinutes: family.remainingMinutes,
        // SafeStudy's own budget counts searches, and none of it applies while
        // the family limit governs — don't hand the kid UI a stale count.
        remainingSearches: null,
      };
    }

    const limit = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    // Get current time info in the family's timezone
    const { hour: currentHour, dayOfWeek, startOfDay: startOfToday } = getCurrentHourInTimezone(timezone);

    // Check allowed hours (only if a timeLimits row defines them)
    if (limit?.allowedStartHour !== undefined && limit?.allowedEndHour !== undefined) {
      const start = limit.allowedStartHour;
      const end = limit.allowedEndHour;

      if (start <= end) {
        // Normal window (e.g., 8am to 8pm)
        if (currentHour < start || currentHour >= end) {
          return {
            canSearch: false,
            reason: "outside_hours",
            allowedStart: start,
            allowedEnd: end,
            remainingSearches: null,
          };
        }
      } else {
        // Overnight window (e.g., 10pm to 6am)
        if (currentHour >= end && currentHour < start) {
          return {
            canSearch: false,
            reason: "outside_hours",
            allowedStart: start,
            allowedEnd: end,
            remainingSearches: null,
          };
        }
      }
    }

    // Compute effective daily budget.
    // Sources, in priority:
    // 1. timeLimits.dailyLimitMinutes (explicit parent-set, weekend-aware)
    // 2. kidProfile.dailyQueryBudget (explicit parent override on the profile)
    // 3. strictness default (15/25/50)
    // 0 in any source means "unlimited".
    let dailyLimit: number | null = null;
    if (limit) {
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const explicit = isWeekend && limit.weekendLimitMinutes !== undefined
        ? limit.weekendLimitMinutes
        : limit.dailyLimitMinutes;
      if (explicit > 0) dailyLimit = explicit;
    }
    if (dailyLimit === null) {
      const profileBudget = (kidProfile as any).dailyQueryBudget;
      if (typeof profileBudget === "number" && profileBudget > 0) {
        dailyLimit = profileBudget;
      } else if (typeof profileBudget === "number" && profileBudget === 0) {
        dailyLimit = null; // explicit unlimited
      } else {
        dailyLimit = strictnessDefaultBudget(kidProfile.contentStrictness);
      }
    }

    if (dailyLimit === null || dailyLimit === 0) {
      return { canSearch: true, reason: null, remainingSearches: null };
    }

    // Count today's searches (in family timezone)
    const history = await ctx.db
      .query("searchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", args.kidProfileId))
      .filter((q) => q.gte(q.field("searchedAt"), startOfToday))
      .collect();

    const searchCount = history.length;
    const remainingSearches = Math.max(0, dailyLimit - searchCount);

    if (remainingSearches <= 0) {
      return {
        canSearch: false,
        reason: "limit_reached",
        dailyLimit,
        searchCount,
        remainingSearches: 0,
      };
    }

    return {
      canSearch: true,
      reason: null,
      dailyLimit,
      searchCount,
      remainingSearches,
    };
  },
});

// Get all time limits for a user's kids (simple version)
export const getAllTimeLimits = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "timeLimits.getAllTimeLimits");
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
    await requireOwnerSoft(ctx, args.userToken, args.userId, "timeLimits.getTimeLimitsForUser");
    // Get all kid profiles
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get time limits and search counts for each
    const limitsWithKids = await Promise.all(
      profiles.map(async (profile) => {
        const limit = await ctx.db
          .query("timeLimits")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", profile._id))
          .first();

        // Get today's search count
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const history = await ctx.db
          .query("searchHistory")
          .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", profile._id))
          .filter((q) => q.gte(q.field("searchedAt"), startOfToday))
          .collect();

        const searchCountToday = history.length;

        return {
          kidProfileId: profile._id,
          kidName: profile.name,
          kidIcon: profile.icon,
          kidColor: profile.color,
          limit: limit || null,
          searchCountToday,
        };
      })
    );

    return limitsWithKids;
  },
});
