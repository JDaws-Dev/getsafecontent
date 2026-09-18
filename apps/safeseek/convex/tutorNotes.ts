/**
 * What the tutor remembers about a kid.
 *
 * The tutor used to hold its entire memory in React state: a refresh restarted
 * it at the greeting, and the next day it met the kid for the first time
 * again. Sessions were being written to the database the whole time and
 * nothing ever read them back — not the kid, not the parent.
 *
 * Two things fix that. Sessions are now resumable (see `tutorSessions.ts`), and
 * this file holds a short rolling paragraph per kid — what they're working on,
 * what they find hard, what they like — that is injected into every tutor and
 * lesson prompt.
 *
 * The notes are deliberately about LEARNING ONLY. A kid's confidences are not
 * study material: nothing from a concern category is ever written here, and
 * the summarizer is told so explicitly. Parents can read the notes, and the
 * kid is told they can.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireProfileOwner } from "./identity";

/** Update the rolling notes after this many exchanges. */
export const NOTES_REFRESH_EVERY = 6;

/** Keep the paragraph short: it rides in every prompt. */
export const NOTES_MAX_CHARS = 700;

export const getNotesInternal = internalQuery({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tutorNotes")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();
  },
});

/** Parent-visible. The landing page has always promised this; now it exists. */
export const getNotes = query({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Same reasoning as the transcripts: this paragraph is about a specific
    // child and is only ever shown to their parent.
    await requireProfileOwner(ctx, args.userToken, args.kidProfileId, "tutorNotes.getNotes");
    const row = await ctx.db
      .query("tutorNotes")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();
    if (!row) return null;
    return { notes: row.notes, updatedAt: row.updatedAt };
  },
});

export const saveNotes = internalMutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const notes = args.notes.trim().slice(0, NOTES_MAX_CHARS);
    const existing = await ctx.db
      .query("tutorNotes")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        notes,
        turnsSinceUpdate: 0,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("tutorNotes", {
      kidProfileId: args.kidProfileId,
      notes,
      turnsSinceUpdate: 0,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Count one exchange. Returns true when the notes are due a refresh, so the
 * caller can schedule the summarizer without a second round trip.
 */
export const noteTurn = internalMutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tutorNotes")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();

    if (!existing) {
      await ctx.db.insert("tutorNotes", {
        kidProfileId: args.kidProfileId,
        notes: "",
        turnsSinceUpdate: 1,
        updatedAt: Date.now(),
      });
      return false;
    }

    const turns = existing.turnsSinceUpdate + 1;
    await ctx.db.patch(existing._id, { turnsSinceUpdate: turns });
    return turns >= NOTES_REFRESH_EVERY;
  },
});

/**
 * Parent can clear the notes.
 *
 * Worth having for the same reason the search history is clearable: a kid
 * changes, and a stale "finds fractions hard" following them around for a year
 * is worse than no note at all.
 */
export const clearNotes = mutation({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireProfileOwner(ctx, args.userToken, args.kidProfileId, "tutorNotes.clearNotes");
    const existing = await ctx.db
      .query("tutorNotes")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
