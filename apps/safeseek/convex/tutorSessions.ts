import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

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
