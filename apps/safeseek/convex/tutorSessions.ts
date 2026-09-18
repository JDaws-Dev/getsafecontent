import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireProfileOwner } from "./identity";

/**
 * Save or update a tutor session for a kid.
 * Called internally from the tutor action after each message exchange.
 */
export const saveTutorSession = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    topic: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Look for a recent session (within last 30 minutes) to append to
    const recentSessions = await ctx.db
      .query("tutorSessions")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(1);

    const recentSession = recentSessions[0];
    const THIRTY_MINUTES = 30 * 60 * 1000;

    if (recentSession && now - recentSession.lastMessageAt < THIRTY_MINUTES) {
      // Append to existing session.
      //
      // `messages` is replaced wholesale by the caller and its timestamps are
      // synthetic (all rewritten to ~now on every save), so we also keep a
      // real, append-only list of when each exchange happened. That's what the
      // shared cross-app screen-time measure reads — without it a 20-message
      // tutor conversation looks like a single instant of activity.
      const stamps = [...(recentSession.messageTimestamps ?? []), now];
      await ctx.db.patch(recentSession._id, {
        messages: args.messages,
        lastMessageAt: now,
        // Bounded so a long-running session row can't grow without limit; only
        // today's tail is ever read.
        messageTimestamps: stamps.slice(-500),
      });
      return recentSession._id;
    }

    // Create new session
    return await ctx.db.insert("tutorSessions", {
      kidProfileId: args.kidProfileId,
      messages: args.messages,
      topic: args.topic,
      startedAt: now,
      lastMessageAt: now,
      messageTimestamps: [now],
    });
  },
});

/**
 * Get tutor sessions for a kid (parent dashboard).
 */
export const getTutorSessions = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("tutorSessions")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(limit);
  },
});

/**
 * The kid's most recent session, so the tutor can pick up where it left off.
 *
 * This is the read that never existed. Sessions have been written since the
 * tutor shipped and nothing ever read them back: a refresh restarted the
 * conversation at the greeting, and the next day the tutor met the kid for the
 * first time again.
 */
export const getLatestSession = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("tutorSessions")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(1);

    const session = sessions[0];
    if (!session) return null;

    // Older than a day and it isn't a conversation to resume, it's a thing to
    // reference: the screen offers "last time we worked on X" instead of
    // dropping the kid back into a stale thread.
    const DAY_MS = 24 * 60 * 60 * 1000;
    const stale = Date.now() - session.lastMessageAt > DAY_MS;

    // `topic` is the kid's opening message, so it is often "hi" or "idk".
    // Offering "Last time we worked on idk" is worse than offering nothing, so
    // anything that doesn't look like a subject is dropped.
    const topic = usableTopic(session.topic);

    return {
      _id: session._id,
      topic,
      lastMessageAt: session.lastMessageAt,
      stale,
      // A resumable session hands back its tail; a stale one hands back only
      // its topic, so a long-dead thread never reappears on screen.
      messages: stale ? [] : session.messages.slice(-30),
    };
  },
});

/** Same read, for the notes summarizer. */
export const getLatestSessionInternal = internalQuery({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("tutorSessions")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(1);
    return sessions[0] ?? null;
  },
});

/**
 * Tutor transcripts for the parent dashboard.
 *
 * The landing page has promised these since the tutor shipped ("Every tutor
 * session is saved so you can see what they're working on"). Nothing in the
 * dashboard ever called the query that returns them, so the claim was false.
 */
export const getSessionsForParent = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    limit: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // HARD check, unlike most reads in this app. A full tutor transcript is the
    // single most sensitive thing SafeStudy stores — it is where a kid says the
    // things they would not type into a search box. This function is new, so
    // there is no legacy caller to break by requiring the token from day one.
    await requireProfileOwner(
      ctx,
      args.userToken,
      args.kidProfileId,
      "tutorSessions.getSessionsForParent",
    );
    const sessions = await ctx.db
      .query("tutorSessions")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(Math.min(args.limit ?? 20, 50));

    return sessions.map((s) => ({
      _id: s._id,
      topic: s.topic ?? null,
      startedAt: s.startedAt,
      lastMessageAt: s.lastMessageAt,
      messageCount: s.messages.length,
      messages: s.messages,
    }));
  },
});

/**
 * Is this session topic worth showing back to the kid?
 *
 * A topic is the first thing they typed, which is frequently a greeting or a
 * shrug. Requiring a couple of real words is a cheap filter that keeps the
 * "pick up where we left off" line from quoting nonsense back at them.
 */
function usableTopic(topic: string | undefined): string | null {
  if (!topic) return null;
  const trimmed = topic.trim();
  if (trimmed.length < 8) return null;

  const words = trimmed.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 2) return null;

  const filler = /^(hi|hey|hello|yo|idk|ok|okay|yes|no|yeah|nah|sup|what|huh|test|asdf)\b/i;
  if (filler.test(trimmed) && words.length < 4) return null;

  return trimmed.slice(0, 80);
}
