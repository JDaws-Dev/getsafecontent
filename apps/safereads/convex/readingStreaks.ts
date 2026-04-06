import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ========================================================================
// Badge Definitions
// ========================================================================

export const BADGE_DEFINITIONS: Record<
  string,
  { name: string; emoji: string; description: string }
> = {
  first_book: {
    name: "First Book",
    emoji: "\uD83D\uDCD6",
    description: "Finished your first book!",
  },
  bookworm_5: {
    name: "Bookworm",
    emoji: "\uD83D\uDC1B",
    description: "Finished 5 books",
  },
  bookworm_10: {
    name: "Super Reader",
    emoji: "\uD83C\uDF1F",
    description: "Finished 10 books",
  },
  streak_3: {
    name: "On a Roll",
    emoji: "\uD83D\uDD25",
    description: "3-day reading streak",
  },
  streak_7: {
    name: "Week Warrior",
    emoji: "\u26A1",
    description: "7-day reading streak",
  },
  streak_30: {
    name: "Reading Machine",
    emoji: "\uD83C\uDFC6",
    description: "30-day reading streak",
  },
  speed_reader: {
    name: "Speed Reader",
    emoji: "\uD83D\uDE80",
    description: "Finished a book in one day",
  },
  explorer: {
    name: "Genre Explorer",
    emoji: "\uD83D\uDDFA\uFE0F",
    description: "Read books from 3+ genres",
  },
};

/** All badge IDs in display order */
export const ALL_BADGE_IDS = [
  "first_book",
  "bookworm_5",
  "bookworm_10",
  "streak_3",
  "streak_7",
  "streak_30",
  "speed_reader",
  "explorer",
];

// ========================================================================
// Helpers
// ========================================================================

/** Get today's date string in YYYY-MM-DD format */
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get a date string N days ago */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ========================================================================
// Mutations
// ========================================================================

/**
 * Record reading time for a kid. Called from BookReader on each progress update.
 * Upserts today's readingStreaks record and increments minutesRead.
 */
export const recordReadingTime = mutation({
  args: {
    kidId: v.id("kids"),
    minutesRead: v.number(), // incremental minutes to add
  },
  handler: async (ctx, args) => {
    if (args.minutesRead <= 0) return;

    const today = todayString();

    // Upsert today's streak record
    const existing = await ctx.db
      .query("readingStreaks")
      .withIndex("by_kid_date", (q) =>
        q.eq("kidId", args.kidId).eq("date", today)
      )
      .first();

    // Get kid's daily goal
    const kid = await ctx.db.get(args.kidId);
    const goalMinutes = kid?.dailyReadingGoalMinutes ?? 20; // default 20 min

    if (existing) {
      const newMinutes = existing.minutesRead + args.minutesRead;
      const goalMet = newMinutes >= goalMinutes;
      await ctx.db.patch(existing._id, {
        minutesRead: newMinutes,
        goalMet,
      });
    } else {
      const goalMet = args.minutesRead >= goalMinutes;
      await ctx.db.insert("readingStreaks", {
        kidId: args.kidId,
        date: today,
        minutesRead: args.minutesRead,
        booksRead: 0,
        goalMet,
      });
    }
  },
});

/**
 * Record that a book was finished today. Called when percentComplete >= 98.
 */
export const recordBookFinished = mutation({
  args: {
    kidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    const today = todayString();

    const existing = await ctx.db
      .query("readingStreaks")
      .withIndex("by_kid_date", (q) =>
        q.eq("kidId", args.kidId).eq("date", today)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        booksRead: existing.booksRead + 1,
      });
    } else {
      await ctx.db.insert("readingStreaks", {
        kidId: args.kidId,
        date: today,
        minutesRead: 0,
        booksRead: 1,
      });
    }
  },
});

/**
 * Check conditions and award badges that haven't been earned yet.
 */
export const checkAndAwardBadges = mutation({
  args: {
    kidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    // Get already-earned badges
    const earnedBadges = await ctx.db
      .query("badges")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    const earnedIds = new Set(earnedBadges.map((b) => b.badgeId));

    const now = Date.now();
    const newBadges: string[] = [];

    // --- Book count badges ---
    const allProgress = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    const finishedBooks = allProgress.filter((p) => p.finishedAt);
    const finishedCount = finishedBooks.length;

    if (finishedCount >= 1 && !earnedIds.has("first_book")) {
      newBadges.push("first_book");
    }
    if (finishedCount >= 5 && !earnedIds.has("bookworm_5")) {
      newBadges.push("bookworm_5");
    }
    if (finishedCount >= 10 && !earnedIds.has("bookworm_10")) {
      newBadges.push("bookworm_10");
    }

    // --- Speed reader: finished a book in one day ---
    if (!earnedIds.has("speed_reader")) {
      for (const p of finishedBooks) {
        if (p.startedAt && p.finishedAt) {
          const diffMs = p.finishedAt - p.startedAt;
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours <= 24) {
            newBadges.push("speed_reader");
            break;
          }
        }
      }
    }

    // --- Streak badges ---
    const streakRecords = await ctx.db
      .query("readingStreaks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    // Build set of dates where goal was met
    const goalMetDates = new Set<string>();
    for (const r of streakRecords) {
      if (r.goalMet) goalMetDates.add(r.date);
    }

    // Calculate current streak (consecutive days going back from today or yesterday)
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const dateStr = daysAgo(i);
      if (goalMetDates.has(dateStr)) {
        currentStreak++;
      } else if (i === 0) {
        // Today doesn't count yet — check from yesterday
        continue;
      } else {
        break;
      }
    }

    if (currentStreak >= 3 && !earnedIds.has("streak_3")) {
      newBadges.push("streak_3");
    }
    if (currentStreak >= 7 && !earnedIds.has("streak_7")) {
      newBadges.push("streak_7");
    }
    if (currentStreak >= 30 && !earnedIds.has("streak_30")) {
      newBadges.push("streak_30");
    }

    // --- Genre explorer: read books from 3+ genres ---
    if (!earnedIds.has("explorer")) {
      const genres = new Set<string>();
      // Check approved books for genre info via categories
      const approvedBooks = await ctx.db
        .query("approvedBooks")
        .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
        .collect();

      // Cross-reference finished books with approved books to find genres
      const finishedBookIds = new Set(finishedBooks.map((p) => p.googleBookId));
      for (const ab of approvedBooks) {
        if (finishedBookIds.has(ab.googleBookId)) {
          // Try to look up the book in books table for categories
          const bookRecord = await ctx.db
            .query("books")
            .withIndex("by_google_books_id", (q) =>
              q.eq("googleBooksId", ab.googleBookId)
            )
            .first();
          if (bookRecord?.categories) {
            for (const cat of bookRecord.categories) {
              genres.add(cat.toLowerCase());
            }
          }
        }
      }

      if (genres.size >= 3) {
        newBadges.push("explorer");
      }
    }

    // Insert new badges
    for (const badgeId of newBadges) {
      await ctx.db.insert("badges", {
        kidId: args.kidId,
        badgeId,
        earnedAt: now,
      });
    }

    return newBadges;
  },
});

// ========================================================================
// Queries
// ========================================================================

/**
 * Get streak info for a kid: currentStreak, todayMinutes, last7Days, etc.
 */
export const getStreak = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const streakRecords = await ctx.db
      .query("readingStreaks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    // Build lookup by date
    const byDate = new Map<
      string,
      { minutesRead: number; goalMet: boolean; booksRead: number }
    >();
    for (const r of streakRecords) {
      byDate.set(r.date, {
        minutesRead: r.minutesRead,
        goalMet: r.goalMet ?? false,
        booksRead: r.booksRead,
      });
    }

    const today = todayString();
    const todayRecord = byDate.get(today);

    // Get kid's daily goal
    const kid = await ctx.db.get(args.kidId);
    const goalMinutes = kid?.dailyReadingGoalMinutes ?? 20;

    // Calculate current streak
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const dateStr = daysAgo(i);
      const record = byDate.get(dateStr);
      if (record?.goalMet) {
        currentStreak++;
      } else if (i === 0) {
        // Today doesn't have to be complete yet — skip
        continue;
      } else {
        break;
      }
    }

    // If today's goal is met, include it in the streak
    if (todayRecord?.goalMet && currentStreak === 0) {
      // Edge case: today is first day of a new streak
      currentStreak = 1;
    }

    // Calculate longest streak
    // Sort all dates
    const allDates = [...byDate.keys()].sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;
    for (const dateStr of allDates) {
      const record = byDate.get(dateStr);
      if (!record?.goalMet) {
        tempStreak = 0;
        prevDate = null;
        continue;
      }
      const d = new Date(dateStr + "T00:00:00");
      if (prevDate) {
        const diffDays = Math.round(
          (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = d;
    }

    // Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = daysAgo(i);
      const record = byDate.get(dateStr);
      last7Days.push({
        date: dateStr,
        minutesRead: record?.minutesRead ?? 0,
        goalMet: record?.goalMet ?? false,
      });
    }

    return {
      currentStreak,
      longestStreak,
      todayMinutes: todayRecord?.minutesRead ?? 0,
      todayGoalMet: todayRecord?.goalMet ?? false,
      goalMinutes,
      last7Days,
    };
  },
});

/**
 * Get all earned badges for a kid, with metadata.
 */
export const getBadges = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const earned = await ctx.db
      .query("badges")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    return earned.map((b) => {
      const def = BADGE_DEFINITIONS[b.badgeId];
      return {
        badgeId: b.badgeId,
        name: def?.name ?? b.badgeId,
        emoji: def?.emoji ?? "\uD83C\uDFC5",
        description: def?.description ?? "",
        earnedAt: b.earnedAt,
      };
    });
  },
});
