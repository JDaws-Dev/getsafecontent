import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { dayKeyForTimezone } from "./timeLimits";
import { previousDay } from "./lessonQueries";

/**
 * Internal: list parents eligible for the weekly digest.
 * - Has an email
 * - Not opted out
 * - Subscription active/trial/lifetime (not expired/cancelled)
 */
export const listEligibleParents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("users").collect();
    return all.filter((u) => {
      if (!u.email) return false;
      if (u.weeklyDigestOptOut) return false;
      if (u.subscriptionStatus === "cancelled" || u.subscriptionStatus === "expired") return false;
      return true;
    });
  },
});

/**
 * Internal: build the per-parent summary for the past 7 days.
 * Aggregates search history, blocked searches, and concern alerts.
 *
 * Day bucketing uses the FAMILY's timezone, not UTC. A digest that told an
 * Eastern-time parent their kid's heaviest day was Tuesday when the evening
 * sessions all landed on Wednesday's UTC bucket is worse than no digest.
 *
 * Since Sep 2026 this also carries the daily program — lessons finished,
 * review accuracy, subjects covered — because that, not a search count, is
 * what a parent actually wants to be told on a Sunday evening.
 */
export const summarizeForParent = internalQuery({
  args: { userId: v.id("users"), since: v.number() },
  handler: async (ctx, args) => {
    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const parent = await ctx.db.get(args.userId);
    const timezone = parent?.timezone;
    const today = dayKeyForTimezone(timezone);
    let windowStart = today;
    for (let i = 0; i < 6; i++) windowStart = previousDay(windowStart);

    let totalSearches = 0;
    let totalBlocked = 0;
    let totalConcerning = 0;
    let totalLessons = 0;
    let totalCards = 0;
    const perKid = [] as any[];

    for (const kid of kids) {
      const history = await ctx.db
        .query("searchHistory")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", kid._id))
        .filter((q) => q.gte(q.field("searchedAt"), args.since))
        .collect();

      const blocked = await ctx.db
        .query("blockedSearches")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", kid._id))
        .filter((q) => q.gte(q.field("searchedAt"), args.since))
        .collect();

      // Concerning = either intent flagged ED/self-harm, OR blocked with that reason
      const concerning = blocked.filter(
        (b) =>
          b.intentCategory === "eating_disorder_adjacent" ||
          b.intentCategory === "self_harm_adjacent" ||
          b.blockedReason === "eating_disorder_signal" ||
          b.blockedReason === "self_harm_signal"
      ).length;

      // Top categories across history + blocked
      const counts: Record<string, number> = {};
      for (const r of [...history, ...blocked]) {
        const cat = r.intentCategory || "other";
        counts[cat] = (counts[cat] || 0) + 1;
      }
      const topCategories = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Heaviest day (UTC bucket)
      const dayCounts: Record<string, number> = {};
      for (const r of history) {
        const key = dayKeyForTimezone(timezone, r.searchedAt);
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      }
      const heaviestEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
      const heaviestDay = heaviestEntry ? { date: heaviestEntry[0], count: heaviestEntry[1] } : null;

      // Budget-hit days: distinct days with a "ran out" row in blockedSearches.
      // Until Sep 2026 nothing ever wrote one — the gate returned early — so
      // this line reported zero for every family forever. search.ts now records
      // it (deduped to one row per reason per day).
      const budgetHitDays = new Set<string>();
      for (const b of blocked) {
        // Both the per-app cap and the family-wide one mean "ran out today".
        if (b.blockedReason === "limit_reached" || b.blockedReason === "family_limit_reached") {
          budgetHitDays.add(dayKeyForTimezone(timezone, b.searchedAt));
        }
      }

      totalSearches += history.length;
      totalBlocked += blocked.length;
      totalConcerning += concerning;

      // --- The daily program -------------------------------------------------
      const progressRows = await ctx.db
        .query("kidProgress")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
        .collect();
      const inWindow = progressRows.filter((r) => r.day >= windowStart && r.day <= today);

      const lessonsCompleted = inWindow.reduce((n, r) => n + r.lessonsCompleted, 0);
      const cardsReviewed = inWindow.reduce((n, r) => n + r.cardsReviewed, 0);
      const cardsCorrect = inWindow.reduce((n, r) => n + r.cardsCorrect, 0);
      const tutorMessages = inWindow.reduce((n, r) => n + r.tutorMessages, 0);

      const lessonRows = await ctx.db
        .query("lessons")
        .withIndex("by_kid_created", (q) => q.eq("kidProfileId", kid._id))
        .order("desc")
        .take(120);
      const lessonsInWindow = lessonRows.filter(
        (l) => l.day >= windowStart && l.day <= today
      );

      const subjectMap: Record<string, string[]> = {};
      for (const l of lessonsInWindow) {
        if (l.status !== "complete") continue;
        (subjectMap[l.subject] ||= []).push(l.topic);
      }
      const subjects = Object.entries(subjectMap).map(([subject, topics]) => ({
        subject,
        topics: Array.from(new Set(topics)).slice(0, 8),
      }));

      const assigned = lessonsInWindow.length;

      const streakRow = await ctx.db
        .query("kidStreaks")
        .withIndex("by_kid", (q) => q.eq("kidProfileId", kid._id))
        .first();

      totalLessons += lessonsCompleted;
      totalCards += cardsReviewed;

      perKid.push({
        kidName: kid.name,
        totalSearches: history.length,
        totalBlocked: blocked.length,
        topCategories,
        concerningCount: concerning,
        budgetHits: budgetHitDays.size,
        heaviestDay,
        // The program
        lessonsCompleted,
        lessonsAssigned: assigned,
        cardsReviewed,
        cardsCorrect,
        reviewAccuracy:
          cardsReviewed > 0 ? Math.round((cardsCorrect / cardsReviewed) * 100) : null,
        tutorMessages,
        subjects,
        currentStreak: streakRow?.currentStreak ?? 0,
      });
    }

    return {
      totalSearches,
      totalBlocked,
      totalConcerning,
      totalLessons,
      totalCards,
      perKid,
    };
  },
});

/**
 * Internal: stamp the user's lastDigestSentAt after a successful send.
 */
export const markSent = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { lastDigestSentAt: Date.now() });
  },
});
