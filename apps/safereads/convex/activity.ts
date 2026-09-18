import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireKidOwner } from "./identity";

/**
 * Parent-facing ACTIVITY HISTORY for one child.
 *
 * "Full disclosure of activity" — every SafeReads product surfaces what the
 * child did to the parent. SafeReads already RECORDS the activity (reading
 * progress, searches, requests, Bible reading, saved verses) but until now no
 * parent screen rendered any of it. This query is that screen's data source.
 *
 * OWNERSHIP: parent-only. `requireKidOwner` verifies the caller's Marketing
 * JWT and that the caller owns `kidId` before any row is read — a client-
 * supplied kidId alone gets nothing. The existing kid-path readers
 * (readingProgress.getForKid, bible.getProgress, etc.) are deliberately left
 * as-is; this is a NEW, separately-gated parent read, so nothing is loosened.
 *
 * Everything is folded into one reverse-chronological `events` timeline so the
 * parent sees a single honest feed, plus a small `stats` summary and a
 * `dailyMinutes` strip (from the reading-streak ledger) for time-spent.
 */

type ActivityEvent =
  | {
      type: "reading";
      at: number;
      bookTitle: string;
      author?: string;
      coverUrl?: string;
      percentComplete: number;
      finished: boolean;
    }
  | {
      type: "search";
      at: number;
      query: string;
      resultCount: number;
    }
  | {
      type: "request";
      at: number;
      bookTitle: string;
      author?: string;
      coverUrl?: string;
      status: string; // "pending" | "approved" | "denied"
      respondedAt?: number;
      denyReason?: string;
    }
  | {
      type: "bible";
      at: number;
      bookName: string;
      chapter: number;
      translation: string;
    }
  | {
      type: "verse";
      at: number;
      bookName: string;
      chapter: number;
      verse: number;
      verseText: string;
      translation: string;
    };

/**
 * All recorded activity for one child, newest first.
 *
 * `sinceMs` filters to events at/after that wall-clock time (0 or omitted =
 * all time). The frontend passes 7-day / 30-day / all cutoffs.
 */
export const getForKid = query({
  args: {
    kidId: v.id("kids"),
    sinceMs: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireKidOwner(ctx, args.userToken, args.kidId, "activity.getForKid");

    const since = args.sinceMs ?? 0;
    const events: ActivityEvent[] = [];

    // --- Title resolution ---------------------------------------------------
    // readingProgress / bookRequests carry a googleBookId (and requests also a
    // title). For reading rows we resolve a human title from the kid's
    // approvedBooks first (that's why the book is on their shelf), falling back
    // to the shared books catalog, then to a plain label.
    const approved = await ctx.db
      .query("approvedBooks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    const titleByGoogleId = new Map<
      string,
      { title: string; author?: string; coverUrl?: string }
    >();
    for (const b of approved) {
      titleByGoogleId.set(b.googleBookId, {
        title: b.title,
        author: b.author,
        coverUrl: b.coverUrl,
      });
    }

    async function resolveBook(googleBookId: string) {
      const hit = titleByGoogleId.get(googleBookId);
      if (hit) return hit;
      const catalog = await ctx.db
        .query("books")
        .withIndex("by_google_books_id", (q) =>
          q.eq("googleBooksId", googleBookId)
        )
        .first();
      if (catalog) {
        const resolved = {
          title: catalog.title,
          author: catalog.authors?.join(", "),
          coverUrl: catalog.coverUrl ?? undefined,
        };
        titleByGoogleId.set(googleBookId, resolved);
        return resolved;
      }
      // Last resort: a readable label even if we never cached the title.
      const label = googleBookId.startsWith("gutenberg:")
        ? `Book #${googleBookId.replace("gutenberg:", "")}`
        : "A book";
      return { title: label, author: undefined, coverUrl: undefined };
    }

    // --- Reading (readingProgress) -----------------------------------------
    const reading = await ctx.db
      .query("readingProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const r of reading) {
      if (r.lastReadAt < since) continue;
      const book = await resolveBook(r.googleBookId);
      events.push({
        type: "reading",
        at: r.lastReadAt,
        bookTitle: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        percentComplete: r.percentComplete,
        finished: !!r.finishedAt,
      });
    }

    // --- Searches (kidSearchHistory) ---------------------------------------
    const searches = await ctx.db
      .query("kidSearchHistory")
      .withIndex("by_kid_recent", (q) => q.eq("kidId", args.kidId))
      .order("desc")
      .take(200);
    for (const s of searches) {
      if (s.searchedAt < since) continue;
      events.push({
        type: "search",
        at: s.searchedAt,
        query: s.query,
        resultCount: s.resultCount,
      });
    }

    // --- Book requests + decisions (bookRequests) --------------------------
    const requests = await ctx.db
      .query("bookRequests")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const req of requests) {
      // Show a request in range if it was made OR decided within the window.
      const at = req.requestedAt;
      const respondedInRange =
        req.respondedAt !== undefined && req.respondedAt >= since;
      if (at < since && !respondedInRange) continue;
      events.push({
        type: "request",
        at: respondedInRange ? req.respondedAt! : at,
        bookTitle: req.title,
        author: req.author,
        coverUrl: req.coverUrl ?? undefined,
        status: req.status,
        respondedAt: req.respondedAt,
        denyReason: req.denyReason,
      });
    }

    // --- Bible chapters read (bibleProgress) -------------------------------
    const bible = await ctx.db
      .query("bibleProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const b of bible) {
      if (b.lastReadAt < since) continue;
      events.push({
        type: "bible",
        at: b.lastReadAt,
        bookName: b.bookName,
        chapter: b.chapter,
        translation: b.translation,
      });
    }

    // --- Saved verses (savedVerses) ----------------------------------------
    const verses = await ctx.db
      .query("savedVerses")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    for (const sv of verses) {
      if (sv.savedAt < since) continue;
      events.push({
        type: "verse",
        at: sv.savedAt,
        bookName: sv.bookName,
        chapter: sv.chapter,
        verse: sv.verse,
        verseText: sv.verseText,
        translation: sv.translation,
      });
    }

    // Newest first across every kind.
    events.sort((a, b) => b.at - a.at);

    // --- Daily reading minutes (readingStreaks ledger) ---------------------
    // Aggregate, not event-like, so it rides alongside the timeline. Used for
    // the "time spent reading" strip and the minutes stat.
    const sinceDay = since > 0 ? new Date(since).toISOString().slice(0, 10) : "";
    const streaks = await ctx.db
      .query("readingStreaks")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();
    const dailyMinutes = streaks
      .filter((s) => !sinceDay || s.date >= sinceDay)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((s) => ({
        date: s.date,
        minutesRead: Math.round(s.minutesRead),
        booksRead: s.booksRead,
        goalMet: s.goalMet ?? false,
      }));

    // --- Summary stats ------------------------------------------------------
    const stats = {
      minutesRead: dailyMinutes.reduce((sum, d) => sum + d.minutesRead, 0),
      booksFinished: reading.filter(
        (r) => r.finishedAt !== undefined && r.finishedAt >= since
      ).length,
      searches: events.filter((e) => e.type === "search").length,
      requests: events.filter((e) => e.type === "request").length,
      requestsDenied: events.filter(
        (e) => e.type === "request" && e.status === "denied"
      ).length,
      versesSaved: events.filter((e) => e.type === "verse").length,
      chaptersRead: events.filter((e) => e.type === "bible").length,
    };

    return { events, dailyMinutes, stats };
  },
});
