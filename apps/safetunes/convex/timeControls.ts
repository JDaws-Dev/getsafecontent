import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Helper to get today's date string in YYYY-MM-DD format
const getTodayDateString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Get daily listening time for a kid profile
export const getDailyListeningTime = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const today = getTodayDateString();

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

    const today = getTodayDateString();
    const dailyRecord = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid_and_date", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("date", today)
      )
      .first();

    const usedMinutes = dailyRecord?.totalMinutes || 0;
    const limitMinutes = profile.dailyTimeLimitMinutes;
    const isEnabled = profile.timeLimitEnabled ?? false;

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
      isEnabled,
      limitMinutes: limitMinutes || null,
      usedMinutes,
      remainingMinutes: isEnabled && limitMinutes ? Math.max(0, limitMinutes - usedMinutes) : null,
      isLimitReached: isEnabled && limitMinutes ? usedMinutes >= limitMinutes : false,
      // Time-of-day settings
      timeOfDayEnabled: profile.timeOfDayEnabled ?? false,
      allowedStartTime: profile.allowedStartTime,
      allowedEndTime: profile.allowedEndTime,
      isOutsideAllowedHours,
      timeOfDayMessage,
    };
  },
});

// Add listening time (called when a song finishes or periodically)
export const addListeningTime = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    minutes: v.number(), // Minutes to add
  },
  handler: async (ctx, args) => {
    const today = getTodayDateString();

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
    const today = getTodayDateString();

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

    // If daily time limit is not enabled, allow (passed time-of-day check above)
    if (!profile.timeLimitEnabled || !profile.dailyTimeLimitMinutes) {
      return { canPlay: true, reason: null };
    }

    const today = getTodayDateString();
    const dailyRecord = await ctx.db
      .query("dailyListeningTime")
      .withIndex("by_kid_and_date", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("date", today)
      )
      .first();

    const usedMinutes = dailyRecord?.totalMinutes || 0;
    const limitMinutes = profile.dailyTimeLimitMinutes;

    if (usedMinutes >= limitMinutes) {
      return {
        canPlay: false,
        reason: `Daily limit of ${limitMinutes} minutes reached`,
        usedMinutes,
        limitMinutes,
      };
    }

    return {
      canPlay: true,
      reason: null,
      usedMinutes,
      limitMinutes,
      remainingMinutes: limitMinutes - usedMinutes,
    };
  },
});

// Get time limit status for all kids (for parent dashboard overview)
export const getAllKidsTimeLimitStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = getTodayDateString();

    // Get all kid profiles for this user
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const statuses = [];

    for (const kid of kidProfiles) {
      const isEnabled = kid.timeLimitEnabled ?? false;
      const limitMinutes = kid.dailyTimeLimitMinutes;

      if (!isEnabled || !limitMinutes) {
        statuses.push({
          kidId: kid._id,
          kidName: kid.name,
          kidAvatar: kid.avatar,
          kidColor: kid.color,
          timeLimitEnabled: false,
          limitMinutes: null,
          usedMinutes: 0,
          remainingMinutes: null,
          isBlocked: false,
        });
        continue;
      }

      // Get today's listening time
      const dailyRecord = await ctx.db
        .query("dailyListeningTime")
        .withIndex("by_kid_and_date", (q) =>
          q.eq("kidProfileId", kid._id).eq("date", today)
        )
        .first();

      const usedMinutes = dailyRecord?.totalMinutes || 0;
      const isBlocked = usedMinutes >= limitMinutes;

      statuses.push({
        kidId: kid._id,
        kidName: kid.name,
        kidAvatar: kid.avatar,
        kidColor: kid.color,
        timeLimitEnabled: true,
        limitMinutes,
        usedMinutes,
        remainingMinutes: Math.max(0, limitMinutes - usedMinutes),
        isBlocked,
      });
    }

    return statuses;
  },
});
