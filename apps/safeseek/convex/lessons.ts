"use node";

/**
 * Today's Lesson — generation.
 *
 * The kid's home screen calls `ensureToday` on load. For every active track
 * scheduled for today that hasn't produced a lesson yet, this assigns the
 * track's next topic and writes the lesson body: a short explainer plus five
 * questions.
 *
 * Two things keep this cheap and honest:
 *
 *  - Lesson bodies are cached ACROSS FAMILIES by topic + grade + reading level.
 *    "The water cycle" for a 5th grader is the same lesson for every 5th
 *    grader, so the second family to reach it pays nothing.
 *  - For arithmetic topics the questions and answers are computed in code
 *    (lib/mathProblems.ts), not written by the model. A confidently wrong
 *    answer key marking a right answer wrong is the fastest way to lose a kid.
 */

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { sanitizeQuery, filterResponse } from "./ai/inputFilter";
import { generateMathQuestions, hasMathGenerator } from "./lib/mathProblems";
import { gradeKeyForProfile, lessonCacheKey } from "./lessonQueries";

const QUESTIONS_PER_LESSON = 5;

type LessonQuestion = {
  prompt: string;
  kind: "short" | "choice";
  choices?: string[];
  answer: string;
  explanation: string;
};

type LessonContent = {
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  keyPoints: string[];
};

function ageToGrade(ageMin: number): string {
  if (ageMin <= 5) return "kindergarten";
  if (ageMin <= 6) return "1st grade";
  if (ageMin <= 7) return "2nd grade";
  if (ageMin <= 8) return "3rd grade";
  if (ageMin <= 9) return "4th grade";
  if (ageMin <= 10) return "5th grade";
  if (ageMin <= 11) return "6th grade";
  if (ageMin <= 12) return "7th grade";
  return "8th grade";
}

/**
 * Make sure today's lessons exist for this kid, and return them.
 *
 * Safe to call on every page load: it does nothing when the day's lessons are
 * already there. Never throws at the kid — a generation failure leaves the
 * lesson in place with no body and the screen says so plainly.
 */
export const ensureToday = action({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args): Promise<{ created: number; failed: number }> => {
    const profile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });
    if (!profile) return { created: 0, failed: 0 };

    // A paused kid, an out-of-hours kid or an inactive subscription gets no
    // new work generated — the same gate the rest of the kid path uses.
    const subCheck = await ctx.runQuery(internal.users.checkSubscriptionActive, {
      userId: profile.userId,
    });
    if (!subCheck.allowed) return { created: 0, failed: 0 };

    // The kid screen also checks this before calling, but the check has to be
    // here as well: this action spends money on the model, and a client-side
    // gate is a suggestion. A paused kid or one outside their hours generates
    // nothing.
    const canStudy = await ctx.runQuery(api.timeLimits.canSearch, {
      kidProfileId: args.kidProfileId,
    });
    if (!canStudy.canSearch) return { created: 0, failed: 0 };

    const tracks = await ctx.runQuery(internal.lessonQueries.getActiveTracksInternal, {
      kidProfileId: args.kidProfileId,
    });
    if (tracks.length === 0) return { created: 0, failed: 0 };

    const existing = await ctx.runQuery(api.lessonQueries.getTodayLessons, {
      kidProfileId: args.kidProfileId,
    });
    if (existing.length === 0 && tracks.length === 0) return { created: 0, failed: 0 };

    const day: string = existing[0]?.day ?? (await todayKeyFor(ctx, profile.userId));
    const dayOfWeek = new Date(`${day}T12:00:00Z`).getUTCDay();
    const gradeKey = gradeKeyForProfile(profile);

    let created = 0;
    let failed = 0;

    for (const track of tracks) {
      // Track scheduled for another day of the week.
      if (track.days && track.days.length > 0 && !track.days.includes(dayOfWeek)) continue;
      // Already has today's lesson.
      if (existing.some((l: any) => l.trackId === track._id)) continue;
      // Ran off the end of the topic list — the parent adds more.
      const topic = track.topics[track.currentIndex];
      if (!topic) continue;

      const lessonId = await ctx.runMutation(internal.lessonQueries.createLesson, {
        kidProfileId: args.kidProfileId,
        userId: profile.userId,
        trackId: track._id,
        subject: track.subject,
        topic,
        day,
        gradeKey,
      });

      try {
        await ctx.runAction(internal.lessons.generateBody, {
          lessonId,
          kidProfileId: args.kidProfileId,
          subject: track.subject,
          topic,
          gradeKey,
          seed: `${args.kidProfileId}:${topic}:${day}`,
        });
        created++;
      } catch (err) {
        // The lesson row stays; the kid sees "we couldn't get this ready" and
        // can retry. Better than a half-written lesson or a crashed screen.
        console.error(`[lessons] generation failed for "${topic}":`, err);
        failed++;
      }
    }

    return { created, failed };
  },
});

/**
 * Generate one lesson on demand — used by the "pick a topic myself" path and
 * by a retry after a failed generation.
 */
export const generateOneOff = action({
  args: {
    kidProfileId: v.id("kidProfiles"),
    subject: v.string(),
    topic: v.string(),
  },
  handler: async (ctx, args): Promise<{ lessonId: string | null; error?: string }> => {
    const profile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });
    if (!profile) return { lessonId: null, error: "no_profile" };

    const canStudy = await ctx.runQuery(api.timeLimits.canSearch, {
      kidProfileId: args.kidProfileId,
    });
    if (!canStudy.canSearch) return { lessonId: null, error: canStudy.reason };

    const topic = sanitizeQuery(args.topic).slice(0, 120).trim();
    if (topic.length < 2) return { lessonId: null, error: "topic_too_short" };

    const gradeKey = gradeKeyForProfile(profile);
    const day = await todayKeyFor(ctx, profile.userId);

    const lessonId = await ctx.runMutation(internal.lessonQueries.createLesson, {
      kidProfileId: args.kidProfileId,
      userId: profile.userId,
      subject: args.subject,
      topic,
      day,
      gradeKey,
    });

    try {
      await ctx.runAction(internal.lessons.generateBody, {
        lessonId,
        kidProfileId: args.kidProfileId,
        subject: args.subject,
        topic,
        gradeKey,
        seed: `${args.kidProfileId}:${topic}:${day}`,
      });
    } catch (err) {
      console.error("[lessons] one-off generation failed:", err);
      return { lessonId, error: "generation_failed" };
    }

    return { lessonId };
  },
});

/**
 * Retry a lesson whose body failed to generate.
 *
 * Fills the EXISTING row rather than creating a second one. `generateOneOff`
 * used to be the only retry path, and because it inserts a new lesson while
 * `ensureToday` skips tracks that already have a row, a single failed
 * generation left an empty lesson behind forever — invisible to the kid, but
 * counted as "assigned" in the parent's week view, so their record showed work
 * that was never set.
 */
export const regenerate = action({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const lesson = await ctx.runQuery(api.lessonQueries.getLesson, {
      lessonId: args.lessonId,
    });
    if (!lesson) return { ok: false, error: "not_found" };
    if (lesson.status === "complete") return { ok: false, error: "already_complete" };

    const canStudy = await ctx.runQuery(api.timeLimits.canSearch, {
      kidProfileId: lesson.kidProfileId,
    });
    if (!canStudy.canSearch) return { ok: false, error: canStudy.reason ?? "not_now" };

    try {
      await ctx.runAction(internal.lessons.generateBody, {
        lessonId: args.lessonId,
        kidProfileId: lesson.kidProfileId,
        subject: lesson.subject,
        topic: lesson.topic,
        gradeKey: lesson.gradeKey,
        // A new seed so a retry doesn't reproduce the identical five sums.
        seed: `${lesson.kidProfileId}:${lesson.topic}:${lesson.day}:${Date.now()}`,
      });
      return { ok: true };
    } catch (err) {
      console.error("[lessons] regenerate failed:", err);
      return { ok: false, error: "generation_failed" };
    }
  },
});

/**
 * Write the explainer and questions for one lesson.
 *
 * Cache-first. On a miss, one model call for the explainer (+ questions, unless
 * the math generator already supplied them).
 */
export const generateBody = internalAction({
  args: {
    lessonId: v.id("lessons"),
    kidProfileId: v.id("kidProfiles"),
    subject: v.string(),
    topic: v.string(),
    gradeKey: v.string(),
    seed: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const profile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });
    if (!profile) throw new Error("Kid profile not found");

    const cacheKey = lessonCacheKey(args.topic, args.subject, args.gradeKey);

    // --- Cache hit: free, instant, and identical for every family at this grade
    const cached = await ctx.runQuery(internal.lessonQueries.getCachedLesson, { cacheKey });
    if (cached) {
      // Math questions are still regenerated per kid so two siblings don't get
      // the identical five sums — only the explainer is shared.
      const mathQuestions =
        args.subject === "math"
          ? generateMathQuestions(args.topic, profile.ageRange.min, QUESTIONS_PER_LESSON, args.seed)
          : null;
      await ctx.runMutation(internal.lessonQueries.attachLessonBody, {
        lessonId: args.lessonId,
        content: cached.content,
        questions: mathQuestions ? JSON.stringify(mathQuestions) : cached.questions,
      });
      await ctx.runMutation(internal.lessonQueries.noteCacheReuse, { cacheKey });
      return;
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const ageMin = profile.ageRange.min;
    const ageMax = profile.ageRange.max;
    const grade = ageToGrade(ageMin);
    const lexile = profile.lexileLevel && profile.lexileLevel !== "auto" ? profile.lexileLevel : null;
    const accessibility: string[] = profile.accessibilityNeeds || [];

    // Arithmetic: exact answers computed here, never asked of the model.
    const mathQuestions =
      args.subject === "math"
        ? generateMathQuestions(args.topic, ageMin, QUESTIONS_PER_LESSON, args.seed)
        : null;
    const needQuestionsFromModel = !mathQuestions;

    const accessibilityLine = accessibility.length
      ? `\nWrite for a child with: ${accessibility.join(", ")}. Short sentences, common words, no long paragraphs.`
      : "";
    const bibleLine =
      args.subject === "bible"
        ? `\nThis is a family Bible lesson. Explain the passage plainly and stay descriptive: say what the text says and what people have historically understood it to mean. Do not push a denominational position, and leave application questions to the family.`
        : "";

    const systemPrompt = `You write one short lesson for a ${grade} student (age ${ageMin}-${ageMax}) on a single topic. Subject: ${args.subject}.
${lexile ? `Write at a ${lexile} reading level.` : ""}${accessibilityLine}${bibleLine}

Return ONLY valid JSON, no markdown fence, in exactly this shape:
{
  "intro": "2-3 sentences saying what this is and why it matters. Speak to the kid.",
  "sections": [{"heading": "short heading", "body": "2-4 sentences"}],
  "keyPoints": ["one short takeaway", "..."]${
    needQuestionsFromModel
      ? `,
  "questions": [{"prompt":"...","kind":"choice","choices":["a","b","c","d"],"answer":"exact text of the correct choice","explanation":"one sentence"}]`
      : ""
  }
}

RULES:
- 3 or 4 sections. Concrete and specific, with real examples a kid can picture.
- Plain text inside the JSON strings. No markdown, no emoji, no links or URLs.
- Teach the topic properly. Do not pad, do not repeat the intro.${
      needQuestionsFromModel
        ? `
- Exactly ${QUESTIONS_PER_LESSON} questions, all answerable from the lesson above.
- Prefer "choice" questions with 4 options; use "short" only when the answer is a single unambiguous word or number.
- For a "choice" question, "answer" must be the exact text of one of the choices.
- Never write a question whose answer is a matter of opinion.`
        : ""
    }`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic: ${args.topic}` },
        ],
        temperature: 0.4,
        max_tokens: 1400,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[lessons] OpenAI error:", text);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty lesson response");

    let parsed: LessonContent & { questions?: LessonQuestion[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Lesson response was not valid JSON");
    }

    const content: LessonContent = {
      intro: String(parsed.intro || "").trim(),
      sections: Array.isArray(parsed.sections)
        ? parsed.sections
            .slice(0, 5)
            .map((s: any) => ({
              heading: String(s?.heading || "").trim(),
              body: String(s?.body || "").trim(),
            }))
            .filter((s) => s.heading && s.body)
        : [],
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.slice(0, 6).map((k: any) => String(k).trim()).filter(Boolean)
        : [],
    };

    if (!content.intro || content.sections.length === 0) {
      throw new Error("Lesson response was missing its body");
    }

    // The same response filter every other kid-facing model output goes
    // through. A lesson is not exempt because a parent chose the topic.
    const flat = [content.intro, ...content.sections.map((s) => `${s.heading} ${s.body}`)].join(" ");
    const check = filterResponse(flat, profile.blockedTopics || []);
    if (!check.safe) {
      console.warn(`[lessons] generated lesson filtered: ${check.reason}`);
      throw new Error("Lesson content did not pass the safety filter");
    }

    const questions: LessonQuestion[] = mathQuestions
      ? (mathQuestions as LessonQuestion[])
      : normalizeQuestions(parsed.questions);

    if (questions.length === 0) throw new Error("Lesson response had no usable questions");

    await ctx.runMutation(internal.lessonQueries.attachLessonBody, {
      lessonId: args.lessonId,
      content: JSON.stringify(content),
      questions: JSON.stringify(questions),
    });

    // Cache the explainer (and the model's questions, when it wrote them) for
    // every other family at this grade. Nothing kid-specific goes in.
    await ctx.runMutation(internal.lessonQueries.putCachedLesson, {
      cacheKey,
      content: JSON.stringify(content),
      questions: JSON.stringify(mathQuestions ? [] : questions),
    });
  },
});

/**
 * Keep only questions we can actually grade.
 *
 * A choice question whose stated answer isn't one of its own choices is
 * unanswerable, so it is dropped rather than shown to a kid who cannot
 * possibly get it right.
 */
function normalizeQuestions(input: unknown): LessonQuestion[] {
  if (!Array.isArray(input)) return [];
  const out: LessonQuestion[] = [];

  for (const q of input.slice(0, QUESTIONS_PER_LESSON + 3)) {
    const prompt = String((q as any)?.prompt || "").trim();
    const answer = String((q as any)?.answer || "").trim();
    if (!prompt || !answer) continue;

    const rawChoices = Array.isArray((q as any)?.choices)
      ? (q as any).choices.map((c: any) => String(c).trim()).filter(Boolean)
      : [];
    const kind = rawChoices.length >= 2 ? "choice" : "short";

    if (kind === "choice") {
      const match = rawChoices.some(
        (c: string) => c.toLowerCase() === answer.toLowerCase(),
      );
      if (!match) continue;
    }

    out.push({
      prompt,
      kind,
      choices: kind === "choice" ? rawChoices.slice(0, 5) : undefined,
      answer,
      explanation: String((q as any)?.explanation || "").trim(),
    });

    if (out.length === QUESTIONS_PER_LESSON) break;
  }

  return out;
}

/** The family's current day key, resolved server-side. */
async function todayKeyFor(ctx: any, userId: any): Promise<string> {
  return await ctx.runQuery(internal.progress.familyToday, { userId });
}
