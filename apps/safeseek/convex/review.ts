/**
 * The review deck — spaced repetition over what the kid has already learned.
 *
 * Every finished lesson and quiz drops its questions in here as cards. Each day
 * the kid gets the cards that are due: five to ten, two minutes, a number that
 * goes up. That is the whole mechanic, and it is the one thing that turns a
 * search box into something with a reason to be opened tomorrow.
 *
 * It also changes what the parent can be told. "She searched volcanoes" becomes
 * "she still knows what magma is three weeks later", which is the difference
 * between exposure and learning.
 *
 * Scheduling is a trimmed SM-2:
 *   - a correct answer multiplies the interval by the card's ease
 *   - a miss sends the card back to tomorrow and lowers ease (floor 1.3)
 *   - a card answered right several times in a row with a long interval retires
 *
 * Grading is done here, against the stored answer. No model call, so a review
 * session costs nothing and cannot be marked wrong by a hallucination.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { answersMatch } from "./lessonQueries";
import { dayKeyForTimezone } from "./timeLimits";
import { bumpProgress, touchStreak } from "./lessonQueries";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
/** A card known this well is retired: it has been right 5+ times and isn't due for months. */
const RETIRE_AFTER_DAYS = 120;
const RETIRE_AFTER_REPS = 5;
/** Never show more than this in one sitting — the point is that it finishes. */
const MAX_SESSION = 10;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Cards due now, oldest-due first, capped at a session's worth.
 *
 * `answer` is deliberately included: grading happens on the client for instant
 * feedback and is re-checked server-side in `gradeCard`, so a kid peeking at
 * the payload gains nothing that the "show answer" button doesn't already give
 * them.
 */
export const getDueCards = query({
  args: { kidProfileId: v.id("kidProfiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("reviewCards")
      .withIndex("by_kid_due", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("retired", false).lte("dueAt", Date.now()),
      )
      .take(Math.min(args.limit ?? MAX_SESSION, MAX_SESSION));

    return cards.map((c) => ({
      _id: c._id,
      question: c.question,
      answer: c.answer,
      subject: c.subject,
      topic: c.topic,
      reps: c.reps,
    }));
  },
});

/** Deck health for the kid home screen and the parent's week view. */
export const getDeckStats = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("reviewCards")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    const now = Date.now();
    const active = all.filter((c) => !c.retired);
    return {
      total: all.length,
      active: active.length,
      due: active.filter((c) => c.dueAt <= now).length,
      learned: all.filter((c) => c.retired).length,
      nextDueAt: active.length
        ? Math.min(...active.filter((c) => c.dueAt > now).map((c) => c.dueAt), Infinity)
        : null,
    };
  },
});

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Answer one card.
 *
 * The response is re-graded here rather than trusting the client's verdict:
 * the progress numbers a parent reads have to mean something.
 */
export const gradeCard = mutation({
  args: {
    cardId: v.id("reviewCards"),
    kidProfileId: v.id("kidProfiles"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    // The kid path carries no token, so ownership is checked against the
    // profile the caller is already acting as.
    if (!card || card.kidProfileId !== args.kidProfileId) {
      throw new Error("Card not found");
    }

    const correct = answersMatch(args.response, card.answer);
    const now = Date.now();

    let { intervalDays, ease, reps, lapses } = card;

    if (correct) {
      reps += 1;
      // First two correct answers are fixed steps; after that the interval
      // grows by the card's ease.
      intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(intervalDays * ease);
      ease = Math.min(2.8, ease + 0.05);
    } else {
      reps = 0;
      lapses += 1;
      intervalDays = 1;
      ease = Math.max(MIN_EASE, ease - 0.2);
    }

    const retired = correct && reps >= RETIRE_AFTER_REPS && intervalDays >= RETIRE_AFTER_DAYS;

    await ctx.db.patch(args.cardId, {
      intervalDays,
      ease,
      reps,
      lapses,
      dueAt: now + intervalDays * DAY_MS,
      lastReviewedAt: now,
      retired,
    });

    return { correct, answer: card.answer, retired, nextInDays: intervalDays };
  },
});

/**
 * Close out a review session: one progress write and one streak bump for the
 * whole sitting rather than one per card.
 */
export const finishSession = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    reviewed: v.number(),
    correct: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.reviewed <= 0) return;
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return;
    const user = await ctx.db.get(profile.userId);
    const day = dayKeyForTimezone(user?.timezone);

    await bumpProgress(ctx, {
      kidProfileId: args.kidProfileId,
      userId: profile.userId,
      day,
      cardsReviewed: args.reviewed,
      cardsCorrect: args.correct,
    });
    await touchStreak(ctx, args.kidProfileId, day, { cards: args.reviewed });
  },
});

/**
 * Add cards by hand — used by "quiz me" and by anything else that produces
 * question/answer pairs worth keeping.
 */
export const addCards = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    cards: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
        subject: v.optional(v.string()),
        topic: v.optional(v.string()),
      }),
    ),
    source: v.string(),
    sourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) throw new Error("Kid profile not found");

    const now = Date.now();
    let added = 0;

    // Cheap duplicate guard: the same question already in the active deck is
    // not added twice. A kid quizzing themselves on volcanoes three times
    // should end up with one set of cards, not three.
    const existing = await ctx.db
      .query("reviewCards")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .take(500);
    const seen = new Set(existing.map((c) => c.question.toLowerCase().trim()));

    for (const card of args.cards.slice(0, 20)) {
      const key = card.question.toLowerCase().trim();
      if (!key || !card.answer.trim() || seen.has(key)) continue;
      seen.add(key);
      await ctx.db.insert("reviewCards", {
        kidProfileId: args.kidProfileId,
        userId: profile.userId,
        question: card.question.trim(),
        answer: card.answer.trim(),
        subject: card.subject,
        topic: card.topic,
        source: args.source,
        sourceId: args.sourceId,
        intervalDays: 1,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        dueAt: now + DAY_MS,
        retired: false,
        createdAt: now,
      });
      added++;
    }

    return { added };
  },
});

/** Parent housekeeping: drop a card that turned out to be a bad question. */
export const deleteCard = mutation({
  args: { cardId: v.id("reviewCards"), kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card || card.kidProfileId !== args.kidProfileId) return;
    await ctx.db.delete(args.cardId);
  },
});
