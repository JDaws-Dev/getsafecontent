/**
 * Today's Lesson — the data layer.
 *
 * Queries and mutations live here; the OpenAI generation lives in `lessons.ts`
 * (a "use node" module, which can only export actions). Same split as
 * search.ts / searchQueries.ts.
 *
 * The shape of the thing: a parent puts a kid on one or more SUBJECT TRACKS,
 * each an ordered list of topics. Every day, each active track hands the kid
 * its next topic as a LESSON — a short explainer plus five questions. Finishing
 * the lesson advances the track, writes the day's progress row, extends the
 * streak, and drops review cards into the deck.
 *
 * Ownership: parent-facing writes verify the caller owns the kid profile.
 * Kid-facing reads take a kidProfileId with no token — the same deliberate
 * position the rest of the kid path holds (see identity.ts).
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireProfileOwner, requireProfileOwnerSoft } from "./identity";
import { dayKeyForTimezone } from "./timeLimits";

/** Subjects the parent can put a kid on. `bible` is opt-in, never a default. */
export const SUBJECTS = [
  "math",
  "science",
  "history",
  "reading",
  "writing",
  "bible",
  "custom",
] as const;

/** How long a generated lesson body stays in the cross-family cache. */
const LESSON_CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The family's own "today". Never UTC — a lesson must not roll over at 7pm. */
async function familyDayKey(
  ctx: { db: any },
  userId: Id<"users">,
  at?: number,
): Promise<string> {
  const user = await ctx.db.get(userId);
  return dayKeyForTimezone(user?.timezone, at);
}

/**
 * Cache key for a generated lesson body. Deliberately excludes anything
 * kid-specific: the same topic at the same grade and reading level is the same
 * lesson for every family, so the second family to reach it pays nothing.
 */
export function lessonCacheKey(topic: string, subject: string, gradeKey: string): string {
  return `${subject}::${gradeKey}::${topic.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 120)}`;
}

/** Grade + reading level, the two things that change how a lesson is written. */
export function gradeKeyForProfile(profile: {
  ageRange: { min: number; max: number };
  lexileLevel?: string;
}): string {
  const lex = profile.lexileLevel && profile.lexileLevel !== "auto" ? profile.lexileLevel : "auto";
  return `${profile.ageRange.min}-${profile.ageRange.max}:${lex}`;
}

// ---------------------------------------------------------------------------
// Subject tracks — parent side
// ---------------------------------------------------------------------------

export const getTracks = query({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Soft: the kid home screen reads tracks indirectly through ensureToday,
    // and the kid path carries no token. The parent dashboard passes one.
    await requireProfileOwnerSoft(ctx, args.userToken, args.kidProfileId, "lessonQueries.getTracks");
    return await ctx.db
      .query("subjectTracks")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
  },
});

export const createTrack = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    subject: v.string(),
    title: v.string(),
    topics: v.array(v.string()),
    days: v.optional(v.array(v.number())),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProfileOwner(ctx, args.userToken, args.kidProfileId, "lessonQueries.createTrack");
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) throw new Error("Kid profile not found");

    const topics = args.topics.map((t) => t.trim()).filter((t) => t.length > 0);
    if (topics.length === 0) throw new Error("A track needs at least one topic");

    const now = Date.now();
    return await ctx.db.insert("subjectTracks", {
      userId: profile.userId,
      kidProfileId: args.kidProfileId,
      subject: args.subject,
      title: args.title.trim() || args.subject,
      topics,
      currentIndex: 0,
      active: true,
      days: args.days,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTrack = mutation({
  args: {
    trackId: v.id("subjectTracks"),
    title: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    currentIndex: v.optional(v.number()),
    active: v.optional(v.boolean()),
    days: v.optional(v.array(v.number())),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");
    await requireProfileOwner(ctx, args.userToken, track.kidProfileId, "lessonQueries.updateTrack");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title.trim();
    if (args.topics !== undefined) {
      patch.topics = args.topics.map((t) => t.trim()).filter((t) => t.length > 0);
    }
    if (args.currentIndex !== undefined) {
      // Clamp both ends. A shrinking topic list used to be able to leave the
      // pointer past the end, which silently stops the track producing lessons
      // with nothing on screen to explain why.
      const topics = (patch.topics as string[] | undefined) ?? track.topics;
      patch.currentIndex = Math.min(Math.max(0, args.currentIndex), topics.length);
    }
    if (args.active !== undefined) patch.active = args.active;
    if (args.days !== undefined) patch.days = args.days;

    await ctx.db.patch(args.trackId, patch);
    return args.trackId;
  },
});

export const deleteTrack = mutation({
  args: { trackId: v.id("subjectTracks"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) return;
    await requireProfileOwner(ctx, args.userToken, track.kidProfileId, "lessonQueries.deleteTrack");
    // Lessons already assigned from this track stay — they are the kid's
    // record of work done, and deleting a subject should not erase the week.
    await ctx.db.delete(args.trackId);
  },
});

// ---------------------------------------------------------------------------
// Lessons — reads
// ---------------------------------------------------------------------------

/**
 * Everything the kid's home screen needs for "today": the lessons assigned for
 * the family's current day and whether each is finished.
 */
export const getTodayLessons = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return [];
    const day = await familyDayKey(ctx, profile.userId);
    return await ctx.db
      .query("lessons")
      .withIndex("by_kid_day", (q) => q.eq("kidProfileId", args.kidProfileId).eq("day", day))
      .collect();
  },
});

export const getLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lessonId);
  },
});

/** Recent lessons for the parent's week view and the kid's "My Stuff". */
export const getRecentLessons = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    limit: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProfileOwnerSoft(
      ctx,
      args.userToken,
      args.kidProfileId,
      "lessonQueries.getRecentLessons",
    );
    return await ctx.db
      .query("lessons")
      .withIndex("by_kid_created", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(Math.min(args.limit ?? 30, 100));
  },
});

// ---------------------------------------------------------------------------
// Lessons — internal writes (called from the generation action)
// ---------------------------------------------------------------------------

export const getActiveTracksInternal = internalQuery({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subjectTracks")
      .withIndex("by_kid_active", (q) => q.eq("kidProfileId", args.kidProfileId).eq("active", true))
      .collect();
  },
});

export const getLessonForTrackToday = internalQuery({
  args: { kidProfileId: v.id("kidProfiles"), day: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_kid_day", (q) => q.eq("kidProfileId", args.kidProfileId).eq("day", args.day))
      .collect();
  },
});

export const createLesson = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    trackId: v.optional(v.id("subjectTracks")),
    subject: v.string(),
    topic: v.string(),
    day: v.string(),
    gradeKey: v.string(),
    content: v.optional(v.string()),
    questions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("lessons", {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      trackId: args.trackId,
      subject: args.subject,
      topic: args.topic,
      day: args.day,
      gradeKey: args.gradeKey,
      status: "assigned",
      content: args.content,
      questions: args.questions,
      generatedAt: args.content ? now : undefined,
      createdAt: now,
    });
  },
});

export const attachLessonBody = internalMutation({
  args: {
    lessonId: v.id("lessons"),
    content: v.string(),
    questions: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lessonId, {
      content: args.content,
      questions: args.questions,
      generatedAt: Date.now(),
    });
  },
});

/** Kid tapped into the lesson. Records the start so "started but not finished" is visible. */
export const markLessonStarted = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson || lesson.status === "complete") return;
    if (lesson.status === "started") return;
    await ctx.db.patch(args.lessonId, { status: "started", startedAt: Date.now() });
  },
});

/**
 * The kid finished the questions.
 *
 * Grading happens here, in a mutation, NOT in the model: every question ships
 * with its answer, so a wrong-but-confident model can't mark a right answer
 * wrong. Free-text answers are matched leniently (case, punctuation, and
 * leading articles ignored); anything the model needs to judge is generated as
 * multiple choice in the first place.
 */
export const completeLesson = mutation({
  args: {
    lessonId: v.id("lessons"),
    responses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) throw new Error("Lesson not found");
    if (!lesson.questions) throw new Error("This lesson has no questions yet");

    const questions: Array<{
      prompt: string;
      kind?: string;
      choices?: string[];
      answer: string;
      explanation?: string;
    }> = JSON.parse(lesson.questions);

    const graded = questions.map((q, i) => {
      const response = (args.responses[i] ?? "").toString();
      return {
        index: i,
        response,
        correct: answersMatch(response, q.answer),
      };
    });
    const score = graded.filter((g) => g.correct).length;
    const now = Date.now();

    await ctx.db.patch(args.lessonId, {
      status: "complete",
      answers: JSON.stringify(graded),
      score,
      completedAt: now,
      startedAt: lesson.startedAt ?? now,
    });

    // Advance the track to the next topic.
    if (lesson.trackId) {
      const track = await ctx.db.get(lesson.trackId);
      if (track) {
        const idx = track.topics.findIndex(
          (t) => t.toLowerCase().trim() === lesson.topic.toLowerCase().trim(),
        );
        // Only ever move forward, and only past the topic just finished — a
        // kid redoing an old lesson must not skip the rest of the unit.
        const next = Math.max(track.currentIndex, idx >= 0 ? idx + 1 : track.currentIndex + 1);
        await ctx.db.patch(lesson.trackId, { currentIndex: next, updatedAt: now });
      }
    }

    // Cards for the review deck, one per question the lesson asked.
    //
    // A question they missed comes back tomorrow. One they got right starts two
    // days out, and carries a rep so the scheduler treats it as already known
    // once rather than brand new — otherwise every lesson would dump five
    // same-day cards into the deck and the daily review would stop being the
    // two-minute thing that makes it get done.
    const user = await ctx.db.get(lesson.userId);
    const DAY_MS = 24 * 60 * 60 * 1000;
    for (const [i, q] of questions.entries()) {
      const correct = graded[i]?.correct ?? false;
      const intervalDays = correct ? 2 : 1;
      await ctx.db.insert("reviewCards", {
        kidProfileId: lesson.kidProfileId,
        userId: lesson.userId,
        question: q.prompt,
        answer: q.answer,
        subject: lesson.subject,
        topic: lesson.topic,
        source: "lesson",
        sourceId: args.lessonId,
        intervalDays,
        ease: 2.5,
        reps: correct ? 1 : 0,
        lapses: correct ? 0 : 1,
        dueAt: now + intervalDays * DAY_MS,
        retired: false,
        createdAt: now,
      });
    }

    // Day record + streak.
    const day = dayKeyForTimezone(user?.timezone, now);
    await bumpProgress(ctx, {
      kidProfileId: lesson.kidProfileId,
      userId: lesson.userId,
      day,
      lessonsCompleted: 1,
      lessonTopic: lesson.topic,
    });
    await touchStreak(ctx, lesson.kidProfileId, day, { lessons: 1 });

    // Keep it in "My Stuff" — a shelf of finished work, not a query log.
    await ctx.db.insert("savedItems", {
      kidProfileId: lesson.kidProfileId,
      userId: lesson.userId,
      kind: "lesson",
      title: lesson.topic,
      subject: lesson.subject,
      body: JSON.stringify({ lessonId: args.lessonId, score, total: questions.length }),
      createdAt: now,
    });

    return {
      score,
      total: questions.length,
      graded: graded.map((g, i) => ({
        ...g,
        answer: questions[i].answer,
        explanation: questions[i].explanation ?? "",
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// Lesson body cache
// ---------------------------------------------------------------------------

export const getCachedLesson = internalQuery({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("lessonCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();
    if (!row || row.expiresAt < Date.now()) return null;
    return { content: row.content, questions: row.questions, _id: row._id };
  },
});

export const putCachedLesson = internalMutation({
  args: { cacheKey: v.string(), content: v.string(), questions: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lessonCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        questions: args.questions,
        cachedAt: now,
        expiresAt: now + LESSON_CACHE_TTL_MS,
      });
      return existing._id;
    }
    return await ctx.db.insert("lessonCache", {
      cacheKey: args.cacheKey,
      content: args.content,
      questions: args.questions,
      cachedAt: now,
      expiresAt: now + LESSON_CACHE_TTL_MS,
      timesReused: 0,
    });
  },
});

export const noteCacheReuse = internalMutation({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("lessonCache")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();
    if (row) await ctx.db.patch(row._id, { timesReused: row.timesReused + 1 });
  },
});

export const cleanExpiredLessonCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("lessonCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", Date.now()))
      .take(200);
    for (const row of stale) await ctx.db.delete(row._id);
    return stale.length;
  },
});

// ---------------------------------------------------------------------------
// Shared write helpers (also used by review.ts and quiz grading)
// ---------------------------------------------------------------------------

/**
 * Lenient free-text comparison.
 *
 * A 7-year-old typing "the water cycle" for "water cycle" got it right, and a
 * product that says otherwise teaches them the app is the problem. Case,
 * punctuation, leading articles and surrounding whitespace are all ignored;
 * numbers are compared numerically so "0.5" matches ".50".
 */
export function answersMatch(response: string, answer: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"]/g, "")
      .replace(/^(the|a|an)\s+/, "")
      .replace(/\s+/g, " ");

  const r = norm(response);
  const a = norm(answer);
  if (!r) return false;
  if (r === a) return true;

  const rNum = Number(r.replace(/[$,%\s]/g, ""));
  const aNum = Number(a.replace(/[$,%\s]/g, ""));
  if (!Number.isNaN(rNum) && !Number.isNaN(aNum)) return rNum === aNum;

  return false;
}

export async function bumpProgress(
  ctx: { db: any },
  args: {
    kidProfileId: Id<"kidProfiles">;
    userId: Id<"users">;
    day: string;
    lessonsCompleted?: number;
    cardsReviewed?: number;
    cardsCorrect?: number;
    quizzesTaken?: number;
    tutorMessages?: number;
    searches?: number;
    lessonTopic?: string;
  },
) {
  const existing = await ctx.db
    .query("kidProgress")
    .withIndex("by_kid_day", (q: any) =>
      q.eq("kidProfileId", args.kidProfileId).eq("day", args.day),
    )
    .first();

  const now = Date.now();
  if (!existing) {
    await ctx.db.insert("kidProgress", {
      kidProfileId: args.kidProfileId,
      userId: args.userId,
      day: args.day,
      lessonsCompleted: args.lessonsCompleted ?? 0,
      lessonTopics: args.lessonTopic ? [args.lessonTopic] : [],
      cardsReviewed: args.cardsReviewed ?? 0,
      cardsCorrect: args.cardsCorrect ?? 0,
      quizzesTaken: args.quizzesTaken ?? 0,
      tutorMessages: args.tutorMessages ?? 0,
      searches: args.searches ?? 0,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const topics = existing.lessonTopics ?? [];
  if (args.lessonTopic && !topics.includes(args.lessonTopic)) topics.push(args.lessonTopic);

  await ctx.db.patch(existing._id, {
    lessonsCompleted: existing.lessonsCompleted + (args.lessonsCompleted ?? 0),
    lessonTopics: topics,
    cardsReviewed: existing.cardsReviewed + (args.cardsReviewed ?? 0),
    cardsCorrect: existing.cardsCorrect + (args.cardsCorrect ?? 0),
    quizzesTaken: existing.quizzesTaken + (args.quizzesTaken ?? 0),
    tutorMessages: existing.tutorMessages + (args.tutorMessages ?? 0),
    searches: existing.searches + (args.searches ?? 0),
    updatedAt: now,
  });
}

/**
 * Extend the streak if this is a new day, break it if a day was missed.
 *
 * The day key is the FAMILY's day, so evening work counts for the evening it
 * happened. SafeReads got this wrong with a UTC key and credited tomorrow.
 */
export async function touchStreak(
  ctx: { db: any },
  kidProfileId: Id<"kidProfiles">,
  day: string,
  counts: { lessons?: number; cards?: number },
) {
  const row = await ctx.db
    .query("kidStreaks")
    .withIndex("by_kid", (q: any) => q.eq("kidProfileId", kidProfileId))
    .first();
  const now = Date.now();

  if (!row) {
    await ctx.db.insert("kidStreaks", {
      kidProfileId,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDay: day,
      totalLessons: counts.lessons ?? 0,
      totalCards: counts.cards ?? 0,
      updatedAt: now,
    });
    return;
  }

  let current = row.currentStreak;
  if (row.lastActiveDay !== day) {
    current = row.lastActiveDay === previousDay(day) ? row.currentStreak + 1 : 1;
  }

  await ctx.db.patch(row._id, {
    currentStreak: current,
    longestStreak: Math.max(row.longestStreak, current),
    lastActiveDay: day,
    totalLessons: row.totalLessons + (counts.lessons ?? 0),
    totalCards: row.totalCards + (counts.cards ?? 0),
    updatedAt: now,
  });
}

/** "YYYY-MM-DD" for the day before the given key. */
export function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}
