import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { resolveTubeIdentity } from "./identity";

// Module-scoped so this file typechecks with or without @types/node.
declare const process: { env: Record<string, string | undefined> };

/**
 * Playback-failure alerts.
 *
 * When the kid player can't reach the video player at all (no word from the
 * youtube-nocookie.com iframe after 15s), the device is almost always on a
 * Family Link / Screen Time allow-list that's missing youtube-nocookie.com.
 * The old screen told the KID to get a grown-up to "check YouTube", and a real
 * family ended up approving youtube.com, which unlocks all of YouTube. Now the
 * PARENT hears about it directly, with the right fix.
 *
 * The kid path has no parent token (family code + PIN only), so
 * reportPlaybackFailure is deliberately callable without auth. It is safe
 * because it trusts nothing from the client except a kid id that must exist:
 * the parent and their email are resolved server-side, the device label is
 * coerced to a fixed word list, and writes are bounded to one row per
 * kid/device/day with at most one email per kid per day.
 */

export const SETUP_HELP_URL = "https://getsafefamily.com/guides/lock-down";

const DEVICE_LABELS = ["Chromebook", "iPad", "iPhone", "Android", "Mac", "Windows", "device"] as const;
const DEFAULT_TIMEZONE = "America/New_York";
const MAX_COUNT = 10_000;

function normalizeDeviceLabel(raw: string): string {
  const trimmed = raw.slice(0, 32).trim().toLowerCase();
  return DEVICE_LABELS.find((d) => d.toLowerCase() === trimmed) ?? "device";
}

// "YYYY-MM-DD" in the family's timezone. Falls back to Eastern (the same
// fallback the allowed-hours fix uses) rather than UTC, which would roll the
// day over mid-evening for US families.
function familyDayKey(timezone: string | undefined, at: number): string {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(at));
  try {
    return fmt(timezone || DEFAULT_TIMEZONE);
  } catch {
    return fmt(DEFAULT_TIMEZONE);
  }
}

/**
 * Kid player → "videos can't load on this device." Unauthenticated by design
 * (see header). Returns nothing that identifies the family.
 */
export const reportPlaybackFailure = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    deviceLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidProfileId);
    if (!kid) return { recorded: false };
    const parent = await ctx.db.get(kid.userId);
    if (!parent) return { recorded: false };

    const now = Date.now();
    const day = familyDayKey(parent.timezone, now);
    const deviceLabel = normalizeDeviceLabel(args.deviceLabel);

    // At most one row per device label (7 possible) per kid per day.
    const todays = await ctx.db
      .query("playbackFailures")
      .withIndex("by_kid_day", (q) => q.eq("kidProfileId", kid._id).eq("day", day))
      .take(DEVICE_LABELS.length + 1);

    const alreadyEmailed = todays.some((r) => r.emailedAt !== undefined);
    const existing = todays.find((r) => r.deviceLabel === deviceLabel);

    let failureId;
    if (existing) {
      failureId = existing._id;
      await ctx.db.patch(existing._id, {
        count: Math.min(existing.count + 1, MAX_COUNT),
        lastAt: now,
      });
    } else {
      failureId = await ctx.db.insert("playbackFailures", {
        kidProfileId: kid._id,
        userId: parent._id,
        day,
        deviceLabel,
        count: 1,
        firstAt: now,
        lastAt: now,
      });
    }

    if (!alreadyEmailed && parent.email) {
      // Mark first so a burst of reports can't schedule several emails.
      await ctx.db.patch(failureId, { emailedAt: now });
      await ctx.scheduler.runAfter(0, internal.playbackAlerts.sendPlaybackFailureEmail, {
        to: parent.email,
        parentName: parent.name ?? undefined,
        kidName: kid.name,
        deviceLabel,
      });
    }

    return { recorded: true };
  },
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The parent email. Default (non-Node) runtime + Resend's REST API, so this
 * module doesn't need "use node" alongside its mutation and query.
 */
export const sendPlaybackFailureEmail = internalAction({
  args: {
    to: v.string(),
    parentName: v.optional(v.string()),
    kidName: v.string(),
    deviceLabel: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[playbackAlerts] RESEND_API_KEY not set; email skipped");
      return { success: false };
    }

    const kidName = escapeHtml(args.kidName.slice(0, 60));
    const device = escapeHtml(args.deviceLabel);
    const greeting = args.parentName ? `Hi ${escapeHtml(args.parentName.slice(0, 60))},` : "Hi,";
    const where = `${kidName}&rsquo;s ${device}`;
    const plain = (t: string) => t.replace(/[\r\n]+/g, " ").slice(0, 60);
    const subjectWhere = `${plain(args.kidName)}'s ${args.deviceLabel}`;
    const textGreeting = args.parentName ? `Hi ${plain(args.parentName)},` : "Hi,";

    const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #dc2626; margin: 0; font-size: 26px;">SafeTube</h1>
    </div>
    <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
      <p style="margin: 0 0 16px 0; font-size: 16px;">${greeting}</p>
      <p style="margin: 0 0 16px 0; font-size: 16px;">SafeTube couldn&rsquo;t play videos on <strong>${where}</strong> today.</p>
      <p style="margin: 0 0 16px 0; font-size: 16px;">This usually means the device&rsquo;s parental controls are blocking SafeTube&rsquo;s video player. On a Family Link device, approve <strong>youtube-nocookie.com</strong>. That is only the video player: no search, no browsing.</p>
    </div>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; color: #991b1b;"><strong>Do NOT approve youtube.com</strong> (or m.youtube.com): it unlocks all of YouTube.</p>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${SETUP_HELP_URL}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Open the setup help</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">If this was a one-off on bad Wi-Fi, you can ignore it. We send this at most once a day per child.</p>
    <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Just reply to this email.</p>
  </body>
</html>`;

    const text = [
      textGreeting,
      "",
      `SafeTube couldn't play videos on ${subjectWhere} today.`,
      "On a Family Link device, approve youtube-nocookie.com (the video player only: no search, no browsing).",
      "Do NOT approve youtube.com (or m.youtube.com): it unlocks all of YouTube.",
      "",
      `Setup help: ${SETUP_HELP_URL}`,
    ].join("\n");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SafeTube <notifications@getsafefamily.com>",
          reply_to: "jeremiah@getsafefamily.com",
          to: args.to,
          subject: `SafeTube couldn't play videos on ${subjectWhere}`,
          html,
          text,
        }),
      });
      if (!res.ok) {
        console.error("[playbackAlerts] Resend error", res.status, await res.text());
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      console.error("[playbackAlerts] send failed", err);
      return { success: false };
    }
  },
});

/**
 * Parent dashboard banner: this week's failures the parent hasn't dismissed
 * (or that happened again after dismissing). Identity comes from the parent's
 * verified token only; no token → nothing.
 */
export const getRecentPlaybackFailures = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await resolveTubeIdentity(ctx, args.userToken);
    if (!me) return [];
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("playbackFailures")
      .withIndex("by_user_recent", (q) => q.eq("userId", me._id).gte("lastAt", since))
      .order("desc")
      .take(20);
    const visible = rows.filter((r) => r.dismissedAt === undefined || r.lastAt > r.dismissedAt);
    const out = [];
    for (const r of visible) {
      const kid = await ctx.db.get(r.kidProfileId);
      out.push({
        _id: r._id,
        kidName: kid?.name ?? "Your child",
        deviceLabel: r.deviceLabel,
        lastAt: r.lastAt,
        count: r.count,
      });
    }
    return out;
  },
});

export const dismissPlaybackFailure = mutation({
  args: {
    failureId: v.id("playbackFailures"),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await resolveTubeIdentity(ctx, args.userToken);
    if (!me) throw new Error("Please sign in again.");
    const row = await ctx.db.get(args.failureId);
    if (!row || row.userId !== me._id) throw new Error("You don't have access to that.");
    await ctx.db.patch(row._id, { dismissedAt: Date.now() });
  },
});
