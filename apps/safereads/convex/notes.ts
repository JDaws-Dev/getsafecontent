import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireOwner } from "./identity";

/** Get the current user's note for a specific book (or null). */
export const getByUserAndBook = query({
  args: {
    userId: v.id("users"),
    bookId: v.id("books"),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, { userId, bookId, userToken }) => {
    await requireOwner(ctx, userToken, userId, "notes.getByUserAndBook");
    return await ctx.db
      .query("notes")
      .withIndex("by_user_and_book", (q) =>
        q.eq("userId", userId).eq("bookId", bookId)
      )
      .first();
  },
});

/** List all notes for a user, newest first, with book data. */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    count: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, { userId, count, userToken }) => {
    await requireOwner(ctx, userToken, userId, "notes.listByUser");
    const limit = count ?? 50;
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    const withBooks = await Promise.all(
      notes.map(async (note) => {
        const book = await ctx.db.get(note.bookId);
        return { ...note, book };
      })
    );

    return withBooks.filter((n) => n.book !== null);
  },
});

/** Create or update a note for a book. */
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    bookId: v.id("books"),
    content: v.string(),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, { userId, bookId, content, userToken }) => {
    await requireOwner(ctx, userToken, userId, "notes.upsert");
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_and_book", (q) =>
        q.eq("userId", userId).eq("bookId", bookId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { content });
      return existing._id;
    }

    return await ctx.db.insert("notes", { userId, bookId, content });
  },
});

/** Delete a note. */
export const remove = mutation({
  args: {
    noteId: v.id("notes"),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, { noteId, userToken }) => {
    const note = await ctx.db.get(noteId);
    if (!note) throw new Error("That note could not be found.");
    await requireOwner(ctx, userToken, note.userId, "notes.remove");
    await ctx.db.delete(noteId);
  },
});
