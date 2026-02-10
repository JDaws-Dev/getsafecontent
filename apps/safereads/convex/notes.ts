import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/** Get the current user's note for a specific book (or null). */
export const getByUserAndBook = query({
  args: {
    userId: v.id("users"),
    bookId: v.id("books"),
  },
  handler: async (ctx, { userId, bookId }) => {
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
  },
  handler: async (ctx, { userId, count }) => {
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
  },
  handler: async (ctx, { userId, bookId, content }) => {
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
  },
  handler: async (ctx, { noteId }) => {
    await ctx.db.delete(noteId);
  },
});
