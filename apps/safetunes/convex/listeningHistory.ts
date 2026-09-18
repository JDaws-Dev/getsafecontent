import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireProfileOwner } from "./identity";

/**
 * Parent-facing LISTENING HISTORY — full disclosure of a kid's activity.
 *
 * The existing dashboard shows parents AGGREGATE stats (top songs, totals,
 * charts). This module returns the ITEMISED record instead: exactly what was
 * played, what searches were blocked, and what the kid auto-added via
 * discovery — newest first, within an optional day window.
 *
 * These are PARENT-ONLY endpoints. Every query hard-requires a parent token
 * that owns the kid profile via `requireProfileOwner` (see convex/identity.ts).
 * We never trust a client-supplied userId. The kid-path listening queries
 * (recentlyPlayed.getRecentlyPlayed / getMostPlayed) are intentionally left
 * alone — kids call those without a parent token and must keep working.
 *
 * Note on `recentlyPlayed`: rows are DEDUPED per item (one row per song/album
 * with a `playCount` and a last-played `playedAt`), so this is a "what they've
 * been playing" history keyed on last play, not a raw per-play event log. That
 * is the honest shape of the data we store; the UI labels it accordingly.
 */

// Resolve a window start timestamp from an optional `days` filter. Omitted or
// <= 0 means "all time" (returns null → no lower bound).
function windowStart(days?: number): number | null {
  if (!days || days <= 0) return null;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

/**
 * Everything a parent should be able to see for one kid, in one call:
 *   - played:     songs/albums/playlists from `recentlyPlayed`, newest first
 *   - blocked:    searches we blocked from `blockedSearches`, newest first
 *   - discovered: content auto-added via `discoveryHistory`, newest first
 *
 * `days` filters all three sections to the last N days (omit / 0 = all time).
 * Ownership: hard-checked — a valid parent token owning `kidProfileId` is
 * required, else it throws ("Please sign in again." / "You don't have access").
 */
export const getKidActivity = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    days: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const kid = await requireProfileOwner(
      ctx,
      args.userToken,
      args.kidProfileId,
      "listeningHistory.getKidActivity",
    );

    const since = windowStart(args.days);

    // --- Played (recentlyPlayed) ---------------------------------------
    const playedRows = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_and_played", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(200);

    const played = playedRows
      .filter((r) => (since === null ? true : r.playedAt >= since))
      .map((r) => ({
        id: r._id,
        itemType: r.itemType,
        itemName: r.itemName,
        artistName: r.artistName ?? null,
        artworkUrl: r.artworkUrl ?? null,
        playedAt: r.playedAt,
        playCount: r.playCount ?? 1,
        totalListenTimeMs: r.totalListenTimeMs ?? 0,
        durationInMillis: r.durationInMillis ?? null,
      }));

    // --- Blocked searches ----------------------------------------------
    const blockedRows = await ctx.db
      .query("blockedSearches")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    const blocked = blockedRows
      .filter((r) => (since === null ? true : r.searchedAt >= since))
      .sort((a, b) => b.searchedAt - a.searchedAt)
      .map((r) => ({
        id: r._id,
        searchQuery: r.searchQuery,
        blockedReason: r.blockedReason,
        searchedAt: r.searchedAt,
      }));

    // --- Discovery (auto-added) ----------------------------------------
    const discoveredRows = await ctx.db
      .query("discoveryHistory")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .order("desc")
      .take(200);

    const discovered = discoveredRows
      .filter((r) => (since === null ? true : r.discoveredAt >= since))
      .map((r) => ({
        id: r._id,
        albumName: r.albumName,
        artistName: r.artistName,
        artworkUrl: r.artworkUrl ?? null,
        genres: r.genres ?? [],
        discoveryMethod: r.discoveryMethod,
        autoAddedToLibrary: r.autoAddedToLibrary,
        discoveredAt: r.discoveredAt,
      }));

    return {
      kid: {
        _id: kid._id,
        name: kid.name,
        avatar: kid.avatar,
        color: kid.color,
      },
      played,
      blocked,
      discovered,
      counts: {
        played: played.length,
        blocked: blocked.length,
        discovered: discovered.length,
      },
    };
  },
});
