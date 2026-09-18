/**
 * The progress record — what a kid actually did, per day.
 *
 * This is the half of SafeStudy that was missing. The parent dashboard used to
 * show counts of searches and a scrolling list of query strings: a log, not a
 * record. A homeschool parent needs to answer "what did she study this week",
 * and needs it in a form they can print for a co-op or a portfolio.
 *
 * One row per kid per day (`kidProgress`), a roll-up per kid (`kidStreaks`),
 * and a week query that stitches them together with the lessons and tutor
 * sessions for the same range.
 */

import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { dayKeyForTimezone } from "./timeLimits";
import { requireOwnerSoft, requireProfileOwnerSoft } from "./identity";
import { answersMatch, bumpProgress, previousDay, touchStreak } from "./lessonQueries";

// ---------------------------------------------------------------------------
// Day helpers
// ---------------------------------------------------------------------------

/** The family's current day key ("YYYY-MM-DD" in their timezone). */
export const familyToday = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return dayKeyForTimezone(user?.timezone);
  },
});

/** Public version for the kid screen, which knows a profile rather than a user. */
export const todayForKid = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return dayKeyForTimezone(undefined);
    const user = await ctx.db.get(profile.userId);
    return dayKeyForTimezone(user?.timezone);
  },
});

/** The N day keys ending today, oldest first. */
function lastNDays(today: string, n: number): string[] {
  const days = [today];
  for (let i = 1; i < n; i++) days.unshift(previousDay(days[0]));
  return days;
}

// ---------------------------------------------------------------------------
// Kid-facing reads
// ---------------------------------------------------------------------------

/**
 * Everything the kid home screen needs above the fold: today's counts, the
 * streak, and how many review cards are waiting.
 */
export const getKidToday = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    const user = await ctx.db.get(profile.userId);
    const day = dayKeyForTimezone(user?.timezone);

    const [today, streak, dueCards] = await Promise.all([
      ctx.db
        .query("kidProgress")
        .withIndex("by_kid_day", (q) => q.eq("kidProfileId", args.kidProfileId).eq("day", day))
        .first(),
      ctx.db
        .query("kidStreaks")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
        .first(),
      ctx.db
        .query("reviewCards")
        .withIndex("by_kid_due", (q) =>
          q.eq("kidProfileId", args.kidProfileId).eq("retired", false).lte("dueAt", Date.now()),
        )
        .take(50),
    ]);

    // A streak whose last active day is neither today nor yesterday has already
    // been broken; show 0 rather than a number the kid hasn't earned.
    const rawStreak = streak?.currentStreak ?? 0;
    const stillAlive =
      streak?.lastActiveDay === day || streak?.lastActiveDay === previousDay(day);

    return {
      day,
      lessonsCompleted: today?.lessonsCompleted ?? 0,
      cardsReviewed: today?.cardsReviewed ?? 0,
      cardsCorrect: today?.cardsCorrect ?? 0,
      quizzesTaken: today?.quizzesTaken ?? 0,
      currentStreak: stillAlive ? rawStreak : 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalLessons: streak?.totalLessons ?? 0,
      dueCardCount: dueCards.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Parent-facing reads
// ---------------------------------------------------------------------------

/**
 * The week view: one row per day with what happened, plus the topics covered
 * and the lessons finished. This is the homeschool log.
 */
export const getWeek = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    days: v.optional(v.number()),
    endingOn: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProfileOwnerSoft(ctx, args.userToken, args.kidProfileId, "progress.getWeek");
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    const user = await ctx.db.get(profile.userId);

    const span = Math.min(Math.max(args.days ?? 7, 1), 62);
    const today = args.endingOn || dayKeyForTimezone(user?.timezone);
    const days = lastNDays(today, span);
    const first = days[0];

    const rows = await ctx.db
      .query("kidProgress")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
    const byDay = new Map(rows.filter((r) => r.day >= first && r.day <= today).map((r) => [r.day, r]));

    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_kid_created", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(200);
    const inRange = lessons.filter((l) => l.day >= first && l.day <= today);

    const daily = days.map((day) => {
      const row = byDay.get(day);
      const dayLessons = inRange.filter((l) => l.day === day);
      return {
        day,
        lessonsCompleted: row?.lessonsCompleted ?? 0,
        lessonsAssigned: dayLessons.length,
        topics: dayLessons.map((l) => ({
          topic: l.topic,
          subject: l.subject,
          status: l.status,
          score: l.score ?? null,
          total: l.questions ? safeCount(l.questions) : null,
        })),
        cardsReviewed: row?.cardsReviewed ?? 0,
        cardsCorrect: row?.cardsCorrect ?? 0,
        quizzesTaken: row?.quizzesTaken ?? 0,
        tutorMessages: row?.tutorMessages ?? 0,
        searches: row?.searches ?? 0,
      };
    });

    const totals = daily.reduce(
      (acc, d) => ({
        lessonsCompleted: acc.lessonsCompleted + d.lessonsCompleted,
        lessonsAssigned: acc.lessonsAssigned + d.lessonsAssigned,
        cardsReviewed: acc.cardsReviewed + d.cardsReviewed,
        cardsCorrect: acc.cardsCorrect + d.cardsCorrect,
        quizzesTaken: acc.quizzesTaken + d.quizzesTaken,
        tutorMessages: acc.tutorMessages + d.tutorMessages,
        searches: acc.searches + d.searches,
      }),
      {
        lessonsCompleted: 0,
        lessonsAssigned: 0,
        cardsReviewed: 0,
        cardsCorrect: 0,
        quizzesTaken: 0,
        tutorMessages: 0,
        searches: 0,
      },
    );

    // Subject breakdown over the range — the "what did she actually cover" line.
    const bySubject = new Map<string, { lessons: number; topics: string[] }>();
    for (const l of inRange) {
      if (l.status !== "complete") continue;
      const entry = bySubject.get(l.subject) || { lessons: 0, topics: [] };
      entry.lessons += 1;
      if (!entry.topics.includes(l.topic)) entry.topics.push(l.topic);
      bySubject.set(l.subject, entry);
    }

    const streak = await ctx.db
      .query("kidStreaks")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    return {
      kidName: profile.name,
      from: first,
      to: today,
      daily,
      totals,
      reviewAccuracy:
        totals.cardsReviewed > 0
          ? Math.round((totals.cardsCorrect / totals.cardsReviewed) * 100)
          : null,
      subjects: Array.from(bySubject.entries()).map(([subject, v2]) => ({ subject, ...v2 })),
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
    };
  },
});

/** Cheap per-kid summary for the dashboard home tiles. */
export const getFamilyOverview = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "progress.getFamilyOverview");
    const user = await ctx.db.get(args.userId);
    const today = dayKeyForTimezone(user?.timezone);
    const weekStart = lastNDays(today, 7)[0];

    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return await Promise.all(
      kids.map(async (kid) => {
        const rows = await ctx.db
          .query("kidProgress")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
          .collect();
        const week = rows.filter((r) => r.day >= weekStart && r.day <= today);
        const streak = await ctx.db
          .query("kidStreaks")
          .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
          .first();
        const dueCards = await ctx.db
          .query("reviewCards")
          .withIndex("by_kid_due", (q) =>
            q.eq("kidProfileId", kid._id).eq("retired", false).lte("dueAt", Date.now()),
          )
          .take(50);
        const todayLessons = await ctx.db
          .query("lessons")
          .withIndex("by_kid_day", (q) => q.eq("kidProfileId", kid._id).eq("day", today))
          .collect();

        const reviewed = week.reduce((s, r) => s + r.cardsReviewed, 0);
        const correct = week.reduce((s, r) => s + r.cardsCorrect, 0);

        return {
          kidProfileId: kid._id,
          name: kid.name,
          color: kid.color,
          lessonsThisWeek: week.reduce((s, r) => s + r.lessonsCompleted, 0),
          cardsThisWeek: reviewed,
          reviewAccuracy: reviewed > 0 ? Math.round((correct / reviewed) * 100) : null,
          tutorMessagesThisWeek: week.reduce((s, r) => s + r.tutorMessages, 0),
          searchesThisWeek: week.reduce((s, r) => s + r.searches, 0),
          currentStreak: streak?.currentStreak ?? 0,
          dueCardCount: dueCards.length,
          assignedToday: todayLessons.length,
          completedToday: todayLessons.filter((l) => l.status === "complete").length,
        };
      }),
    );
  },
});

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Record activity that isn't a lesson or a review — a search, a tutor turn.
 *
 * Called from the search and tutor actions so the parent's week shows the
 * whole picture rather than only the assigned work.
 */
export const recordActivity = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    searches: v.optional(v.number()),
    tutorMessages: v.optional(v.number()),
    quizzesTaken: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const day = dayKeyForTimezone(user?.timezone);
    await bumpProgress(ctx, {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      day,
      searches: args.searches,
      tutorMessages: args.tutorMessages,
      quizzesTaken: args.quizzesTaken,
    });
  },
});

/** Streak bump for review sessions (lessons handle their own). */
export const recordReviewDay = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    reviewed: v.number(),
    correct: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const day = dayKeyForTimezone(user?.timezone);
    await bumpProgress(ctx, {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      day,
      cardsReviewed: args.reviewed,
      cardsCorrect: args.correct,
    });
    await touchStreak(ctx, args.kidProfileId, day, { cards: args.reviewed });
  },
});

// ---------------------------------------------------------------------------
// "My Stuff"
// ---------------------------------------------------------------------------

/**
 * Things the kid finished. Deliberately NOT a query log: hiding raw search
 * history from the kid screen in April was the right call (it fed the
 * scroll loop), and this is the opposite object — a shelf of completed work.
 */
export const getSavedItems = query({
  args: { kidProfileId: v.id("kidProfiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("savedItems")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(Math.min(args.limit ?? 40, 100));
  },
});

/** Kid taps "keep this" on an answer they liked. */
export const saveAnswer = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    title: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) throw new Error("Kid profile not found");

    // One keep per title per day — a kid tapping twice shouldn't stack up
    // duplicates on their own shelf.
    const recent = await ctx.db
      .query("savedItems")
      .withIndex("by_kid_kind", (q) => q.eq("kidProfileId", args.kidProfileId).eq("kind", "answer"))
      .order("desc")
      .take(20);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dup = recent.find(
      (r) => r.createdAt > dayAgo && r.title.toLowerCase() === args.title.toLowerCase().trim(),
    );
    if (dup) return dup._id;

    return await ctx.db.insert("savedItems", {
      kidProfileId: args.kidProfileId,
      userId: profile.userId,
      kind: "answer",
      title: args.title.trim().slice(0, 200),
      body: JSON.stringify({ summary: args.summary.slice(0, 4000) }),
      createdAt: Date.now(),
    });
  },
});

export const removeSavedItem = mutation({
  args: { itemId: v.id("savedItems"), kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    // The kid path has no token, so ownership is checked against the profile
    // the caller is already acting as — a kid can only clear their own shelf.
    if (!item || item.kidProfileId !== args.kidProfileId) return;
    await ctx.db.delete(args.itemId);
  },
});

/** How many questions a stored lesson had, without trusting the JSON blindly. */
function safeCount(questionsJson: string): number | null {
  try {
    const parsed = JSON.parse(questionsJson);
    return Array.isArray(parsed) ? parsed.length : null;
  } catch {
    return null;
  }
}

/** Re-exported so callers don't have to know which module owns the day maths. */
export { previousDay };

export type ProgressDay = {
  kidProfileId: Id<"kidProfiles">;
  day: string;
};

/**
 * The kid finished a quiz.
 *
 * Grading happens here against the answers the quiz shipped with, so the
 * numbers a parent reads are the real ones. Missed questions become review
 * cards — a quiz you got wrong and never saw again taught nothing.
 */
export const completeQuiz = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    topic: v.string(),
    subject: v.optional(v.string()),
    questions: v.array(
      v.object({
        prompt: v.string(),
        answer: v.string(),
        response: v.string(),
        // Optional and ignored. The server re-grades every answer below, so a
        // client verdict is at best duplicated work and at worst a way to
        // inflate a child's score. Kept in the validator only so an older
        // frontend that still sends it doesn't hit a strict-validator 500.
        correct: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) throw new Error("Kid profile not found");
    if (args.questions.length === 0) return { score: 0, total: 0 };

    const user = await ctx.db.get(profile.userId);
    const day = dayKeyForTimezone(user?.timezone);
    const now = Date.now();

    // Re-grade rather than trusting the client's verdict.
    const graded = args.questions.map((q, index) => ({
      index,
      prompt: q.prompt,
      answer: q.answer,
      response: q.response,
      correct: answersMatch(q.response, q.answer),
    }));
    const score = graded.filter((g) => g.correct).length;

    await bumpProgress(ctx, {
      kidProfileId: args.kidProfileId,
      userId: profile.userId,
      day,
      quizzesTaken: 1,
    });
    await touchStreak(ctx, args.kidProfileId, day, {});

    // Only the missed ones become cards. Turning all five into cards would
    // bury the deck in things the kid already knows, and a deck that takes
    // fifteen minutes stops getting opened.
    const existing = await ctx.db
      .query("reviewCards")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .take(500);
    const seen = new Set(existing.map((c) => c.question.toLowerCase().trim()));

    let cardsAdded = 0;
    for (const g of graded) {
      if (g.correct) continue;
      const key = g.prompt.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      await ctx.db.insert("reviewCards", {
        kidProfileId: args.kidProfileId,
        userId: profile.userId,
        question: g.prompt,
        answer: g.answer,
        subject: args.subject,
        topic: args.topic,
        source: "quiz",
        intervalDays: 1,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        dueAt: now + 24 * 60 * 60 * 1000,
        retired: false,
        createdAt: now,
      });
      cardsAdded++;
    }

    await ctx.db.insert("savedItems", {
      kidProfileId: args.kidProfileId,
      userId: profile.userId,
      kind: "quiz",
      title: args.topic.slice(0, 200),
      subject: args.subject,
      body: JSON.stringify({ score, total: graded.length }),
      createdAt: now,
    });

    // Hand back the per-question verdicts so the kid screen shows the SERVER's
    // grading, not its own guess at it. Without this the client had to mirror
    // the matcher, and a drift between the two would show a kid a tick beside
    // an answer the record counts as wrong.
    return { score, total: graded.length, cardsAdded, graded };
  },
});
