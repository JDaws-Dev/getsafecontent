import { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";

type Db = GenericDatabaseReader<DataModel>;

/**
 * "Is this video playable for this kid RIGHT NOW?" — the single answer every
 * kid-facing list and write path must agree on.
 *
 * A video is playable when EITHER
 *   1. the parent approved that exact video for this kid (approvedVideos), OR
 *   2. it belongs to a channel the parent FULLY approved for this kid
 *      (approvedChannels).
 *
 * Channel membership: the server never sees a fully-approved channel's video
 * list (the kid client fetches it straight from YouTube), so membership is
 * known only from the channelId stored on the row. Rows written before
 * channelId was stored (watchHistory, kidPlaylistVideos) fall back to the
 * channelTitle recorded on the row, matched against the kid's approved
 * channels. Anything we can't place fails CLOSED (not playable).
 *
 * Residual: channelId/channelTitle on kid-path rows is client-asserted (the
 * server can't verify membership without calling YouTube), so a tampered
 * client could claim an approved channel for an unrelated video. That needs
 * devtools AND one of this kid's approved channels; it no longer works for
 * arbitrary channels, and revocation now always takes effect.
 */
export type KidApprovals = {
  videoIds: Set<string>;
  channelIds: Set<string>;
  // normalized channel title -> channelId, for legacy rows without channelId
  channelIdByTitle: Map<string, string>;
};

function normTitle(title: string | null | undefined): string {
  return (title ?? "").trim().toLowerCase();
}

export async function loadKidApprovals(
  ctx: { db: Db },
  kidProfileId: Id<"kidProfiles">,
): Promise<KidApprovals> {
  const [videos, channels] = await Promise.all([
    ctx.db
      .query("approvedVideos")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
      .collect(),
    ctx.db
      .query("approvedChannels")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
      .collect(),
  ]);
  const channelIdByTitle = new Map<string, string>();
  for (const c of channels) {
    const t = normTitle(c.channelTitle);
    if (t) channelIdByTitle.set(t, c.channelId);
  }
  return {
    videoIds: new Set(videos.map((v) => v.videoId)),
    channelIds: new Set(channels.map((c) => c.channelId)),
    channelIdByTitle,
  };
}

export type PlayableItem = {
  videoId: string;
  channelId?: string | null;
  channelTitle?: string | null;
};

/**
 * Resolve which approved channel (if any) an item belongs to. A stored
 * channelId is authoritative; the title fallback is only for rows that never
 * recorded one.
 */
export function approvedChannelFor(
  approvals: KidApprovals,
  item: PlayableItem,
): string | null {
  if (item.channelId) {
    return approvals.channelIds.has(item.channelId) ? item.channelId : null;
  }
  return approvals.channelIdByTitle.get(normTitle(item.channelTitle)) ?? null;
}

export function isPlayableWith(approvals: KidApprovals, item: PlayableItem): boolean {
  if (!item.videoId) return false;
  if (approvals.videoIds.has(item.videoId)) return true;
  return approvedChannelFor(approvals, item) !== null;
}

/** One-off check (loads the kid's approvals). Prefer loadKidApprovals for lists. */
export async function isVideoPlayableForKid(
  ctx: { db: Db },
  kidProfileId: Id<"kidProfiles">,
  item: PlayableItem,
): Promise<boolean> {
  return isPlayableWith(await loadKidApprovals(ctx, kidProfileId), item);
}

/**
 * After a parent removes a video or channel: drop playlist entries that are no
 * longer playable and mark approved video requests whose video is gone as
 * "revoked", so nothing the kid saved keeps a revoked video reachable. Watch
 * history is left alone (it counts today's minutes and is filtered on read).
 */
export async function reconcileKidContent(
  ctx: { db: GenericDatabaseWriter<DataModel> },
  kidProfileId: Id<"kidProfiles">,
): Promise<{ playlistRemoved: number; requestsRevoked: number }> {
  const approvals = await loadKidApprovals(ctx, kidProfileId);

  let playlistRemoved = 0;
  const playlistRows = await ctx.db
    .query("kidPlaylistVideos")
    .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
    .collect();
  for (const row of playlistRows) {
    if (!isPlayableWith(approvals, row)) {
      await ctx.db.delete(row._id);
      playlistRemoved++;
    }
  }

  let requestsRevoked = 0;
  const requests = await ctx.db
    .query("videoRequests")
    .withIndex("by_kid", (q) => q.eq("kidProfileId", kidProfileId))
    .filter((q) => q.eq(q.field("status"), "approved"))
    .collect();
  for (const r of requests) {
    if (!isPlayableWith(approvals, r)) {
      await ctx.db.patch(r._id, { status: "revoked" });
      requestsRevoked++;
    }
  }

  return { playlistRemoved, requestsRevoked };
}
