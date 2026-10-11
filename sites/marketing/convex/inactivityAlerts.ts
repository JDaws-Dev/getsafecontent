import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Quiet-days alerts.
 *
 * A real family's daughter had full YouTube on a Family Link Chromebook for
 * weeks. Nothing broke and nothing alerted: she simply stopped opening
 * SafeTube. The hub already sees every minute every kid spends in every app
 * (kidUsage, written by all five apps), so it can notice the one signal that
 * mattered: a kid who used an app most days and then went silent.
 *
 * Rules:
 *   - A kid is a REGULAR user of an app if it had >0 minutes on at least
 *     REGULAR_MIN_DAYS of the WINDOW_DAYS days before the current silence
 *     began.
 *   - We alert once the silence reaches N days, where
 *     N = max(4, 2 x the kid's longest previous gap in that window), capped
 *     at 10. A kid who normally skips three days at a time needs six silent
 *     days before we say anything; a daily user needs four.
 *   - Only complete days count: "today" in the family's timezone is ignored.
 *   - One email per silence. When the app is used again the alert re-arms.
 *   - Skipped when the child is paused or removed, the family's subscription
 *     has lapsed, the family isn't entitled to the app, or the parent paused
 *     these alerts for that child.
 *
 * Everything that runs on the schedule is internal. The only public functions
 * are the parent's own snooze controls, which authenticate the signed-in hub
 * parent and never take a family code or user id from the client.
 */

// Apps we watch. SafeTube first: it's the one with a well-known bypass
// (regular YouTube). SafeTunes is included because a kid who quits approved
// music has usually found unapproved music. The study/reading/building apps
// are naturally sporadic (school breaks, homework weeks), so they are left out
// to keep the alerts meaningful.
const ALERT_APPS = ["safetube", "safetunes"] as const;
const ALL_APPS = ["safetube", "safetunes", "safereads", "safestudy", "safespark"];

const WINDOW_DAYS = 14;
const REGULAR_MIN_DAYS = 4;
const MIN_SILENCE = 4;
const MAX_SILENCE = 10;
const LOOKBACK_DAYS = 60;
const DEFAULT_TZ = "America/New_York";
const SNOOZE_ROW_APP = "all";

const HUB_URL = (process.env.HUB_URL || "https://getsafefamily.com").trim().replace(/\/$/, "");

const APP_LABEL: Record<string, string> = {
  safetube: "SafeTube",
  safetunes: "SafeTunes",
  safereads: "SafeReads",
  safestudy: "SafeStudy",
  safespark: "SafeSpark",
};

// ── Day maths ───────────────────────────────────────────────────────────────
// kidUsage.day is written by each app as YYYY-MM-DD in the family's timezone,
// so we compute "today" the same way and do the rest as calendar arithmetic.

function safeTz(tz: string | undefined | null): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

function localDay(now: number, tz: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function norm(name: string): string {
  return (name || "").trim().toLowerCase();
}

// ── The rule itself (pure, so it can be reasoned about on its own) ─────────

type Analysis = {
  silentDays: number;
  silenceStartDay: string | null;
  regular: boolean;
  activeDaysInWindow: number;
  longestGap: number;
  threshold: number;
  shouldAlert: boolean;
};

/**
 * `days` is oldest -> newest and ends at the last COMPLETE day (yesterday).
 * `minutes(day)` returns that app's minutes for that day (0 when no row).
 */
function analyzeSilence(days: string[], minutes: (day: string) => number): Analysis {
  let silentDays = 0;
  for (let i = days.length - 1; i >= 0 && minutes(days[i]) <= 0; i--) silentDays++;

  const none: Analysis = {
    silentDays,
    silenceStartDay: null,
    regular: false,
    activeDaysInWindow: 0,
    longestGap: 0,
    threshold: MIN_SILENCE,
    shouldAlert: false,
  };
  // Not silent, or never used in the whole lookback.
  if (silentDays === 0 || silentDays >= days.length) return none;

  const start = days.length - silentDays;
  const window = days.slice(Math.max(0, start - WINDOW_DAYS), start);
  const activeIdx: number[] = [];
  window.forEach((d, i) => { if (minutes(d) > 0) activeIdx.push(i); });

  // Longest gap BETWEEN uses. Zero days before the first use in the window are
  // not counted: that's "hadn't started yet", not a habit of skipping days.
  let longestGap = 0;
  for (let i = 1; i < activeIdx.length; i++) {
    longestGap = Math.max(longestGap, activeIdx[i] - activeIdx[i - 1] - 1);
  }
  const threshold = Math.min(MAX_SILENCE, Math.max(MIN_SILENCE, 2 * longestGap));
  const regular = activeIdx.length >= REGULAR_MIN_DAYS;

  return {
    silentDays,
    silenceStartDay: days[start],
    regular,
    activeDaysInWindow: activeIdx.length,
    longestGap,
    threshold,
    shouldAlert: regular && silentDays >= threshold,
  };
}

// ── Subscription gate ───────────────────────────────────────────────────────

function subscriptionLive(u: Doc<"users">, now: number): boolean {
  switch (u.subscriptionStatus) {
    case "active":
    case "lifetime":
      return true;
    case "trial":
      return !u.trialExpiresAt || u.trialExpiresAt > now;
    case "canceled":
      // Canceled but the paid period hasn't run out yet.
      return !!u.subscriptionEndsAt && u.subscriptionEndsAt > now;
    default:
      return false; // expired, past_due, incomplete, unset
  }
}

// ── Scheduled pipeline (internal only) ──────────────────────────────────────

/** Family codes with at least one account whose subscription is live. */
export const listActiveFamilyCodes = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const codes = new Set<string>();
    for (const status of ["active", "lifetime", "trial", "canceled"] as const) {
      const rows = await ctx.db
        .query("users")
        .withIndex("by_subscription_status", (q) => q.eq("subscriptionStatus", status))
        .collect();
      for (const u of rows) {
        if (u.familyCode && subscriptionLive(u, now)) codes.add(u.familyCode);
      }
    }
    return [...codes];
  },
});

type Pending = {
  kidKey: string;
  kidName: string;
  app: string;
  silenceStartDay: string;
  silentDays: number;
  activeDaysInWindow: number;
  otherApps: { app: string; activeDays: number }[];
};

/**
 * Work out who needs an email for one family. A mutation only because it also
 * records re-arms (activity resumed after an alert); it never sends anything
 * and never marks anything as alerted — the action does that after the email
 * actually goes out, so a failed send is retried the next day.
 */
export const evaluateFamily = internalMutation({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const familyCode = args.familyCode.trim().toUpperCase();

    const users = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode))
      .collect();
    const liveUsers = users.filter((u) => subscriptionLive(u, now));
    if (liveUsers.length === 0) return { recipients: [], pending: [] as Pending[], skipped: "subscription" };

    // Entitlement: union across live accounts. Absent entitledApps = all.
    const entitled = new Set<string>();
    for (const u of liveUsers) (u.entitledApps ?? ALL_APPS).forEach((a) => entitled.add(a));

    const settings = await ctx.db
      .query("familySettings")
      .withIndex("by_family", (q) => q.eq("familyCode", familyCode))
      .first();
    const tz = safeTz(settings?.timezone ?? users.find((u) => u.timezone)?.timezone);
    const today = localDay(now, tz);
    const yesterday = addDays(today, -1);
    const firstDay = addDays(yesterday, -(LOOKBACK_DAYS - 1));
    const days: string[] = [];
    for (let i = 0; i < LOOKBACK_DAYS; i++) days.push(addDays(firstDay, i));

    const recipients = (settings?.alertEmails?.length
      ? settings.alertEmails
      : users.map((u) => u.email).filter((e): e is string => !!e).slice(0, 1)
    ).filter(Boolean);

    // Hub kid records (paused / removed), matched to identities by name.
    const hubKids: Doc<"kids">[] = [];
    for (const u of users) {
      const ks = await ctx.db.query("kids").withIndex("by_parent", (q) => q.eq("parentUserId", u._id)).collect();
      hubKids.push(...ks);
    }

    const identities = await ctx.db
      .query("kidIdentity")
      .withIndex("by_family", (q) => q.eq("familyCode", familyCode))
      .collect();

    const alertRows = await ctx.db
      .query("inactivityAlerts")
      .withIndex("by_family", (q) => q.eq("familyCode", familyCode))
      .collect();

    const pending: Pending[] = [];

    for (const ident of identities) {
      const kidKey = `id:${ident._id}`;

      const matching = hubKids.filter((k) => ident.matchKeys.includes(norm(k.name)));
      // Removed on the hub (and not re-added under the same name) -> leave alone.
      if (matching.length > 0 && matching.every((k) => k.archived)) continue;
      const paused = matching.some((k) => !k.archived && k.paused);

      // Usage rows: the canonical key plus any legacy name-keyed rows written
      // before identities existed.
      const perDay = new Map<string, Record<string, number>>();
      for (const key of [kidKey, ...ident.matchKeys]) {
        const rows = await ctx.db
          .query("kidUsage")
          .withIndex("by_family_kid_day", (q) =>
            q.eq("familyCode", familyCode).eq("kidName", key).gte("day", firstDay)
          )
          .collect();
        for (const r of rows) {
          if (r.day > yesterday) continue;
          const acc = perDay.get(r.day) ?? {};
          for (const [app, m] of Object.entries(r.byApp ?? {})) acc[app] = (acc[app] ?? 0) + (m || 0);
          perDay.set(r.day, acc);
        }
      }

      const kidSnooze = alertRows.find((r) => r.kidKey === kidKey && r.app === SNOOZE_ROW_APP);
      const kidSnoozed = !!kidSnooze?.snoozedUntil && kidSnooze.snoozedUntil > now;

      for (const app of ALERT_APPS) {
        const a = analyzeSilence(days, (d) => perDay.get(d)?.[app] ?? 0);
        const row = alertRows.find((r) => r.kidKey === kidKey && r.app === app);

        // Re-arm: the app was used again after we emailed.
        if (a.silentDays === 0) {
          if (row?.alertedAt && !row.rearmedAt) {
            await ctx.db.patch(row._id, { rearmedAt: now, updatedAt: now });
          }
          continue;
        }

        if (!a.shouldAlert || !a.silenceStartDay) continue;
        if (paused || kidSnoozed || !entitled.has(app)) continue;
        if (row?.snoozedUntil && row.snoozedUntil > now) continue;
        // One email per silence.
        if (row?.alertedAt && row.silenceStartDay === a.silenceStartDay) continue;

        const silenceDays = days.slice(days.length - a.silentDays);
        const otherApps = ALL_APPS.filter((o) => o !== app)
          .map((o) => ({ app: o, activeDays: silenceDays.filter((d) => (perDay.get(d)?.[o] ?? 0) > 0).length }))
          .filter((o) => o.activeDays > 0)
          .sort((x, y) => y.activeDays - x.activeDays);

        pending.push({
          kidKey,
          kidName: ident.canonicalName,
          app,
          silenceStartDay: a.silenceStartDay,
          silentDays: a.silentDays,
          activeDaysInWindow: a.activeDaysInWindow,
          otherApps,
        });
      }
    }

    return { recipients, pending, skipped: null as string | null };
  },
});

/** Record that the email for this silence went out. */
export const markAlerted = internalMutation({
  args: {
    familyCode: v.string(),
    kidKey: v.string(),
    app: v.string(),
    silenceStartDay: v.string(),
    silentDays: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("inactivityAlerts")
      .withIndex("by_family_kid_app", (q) =>
        q.eq("familyCode", args.familyCode).eq("kidKey", args.kidKey).eq("app", args.app)
      )
      .first();
    const patch = {
      silenceStartDay: args.silenceStartDay,
      silentDays: args.silentDays,
      alertedAt: now,
      rearmedAt: undefined,
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("inactivityAlerts", { familyCode: args.familyCode, kidKey: args.kidKey, app: args.app, ...patch });
  },
});

// ── Email ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const USUAL: Record<string, (name: string, how: string) => string> = {
  safetube: (n, how) => `${n} usually watches SafeTube ${how}`,
  safetunes: (n, how) => `${n} usually listens to SafeTunes ${how}`,
};
const NOTHING: Record<string, string> = {
  safetube: "hasn't watched anything",
  safetunes: "hasn't listened to anything",
};
const MAYBE: Record<string, string> = {
  safetube: "Sometimes it means a device can reach regular YouTube directly.",
  safetunes: "Sometimes it means a device can reach another music app or site directly.",
};

function buildInactivityEmail(p: Pending): { subject: string; html: string; text: string } {
  const name = p.kidName.trim() || "Your child";
  const app = APP_LABEL[p.app] ?? p.app;
  const how =
    p.activeDaysInWindow >= 10 ? "most days" : p.activeDaysInWindow >= 7 ? "several times a week" : "a few times a week";
  const usual = (USUAL[p.app] ?? ((n: string, h: string) => `${n} usually uses ${app} ${h}`))(name, how);
  const nothing = NOTHING[p.app] ?? `hasn't used it`;
  const maybe = MAYBE[p.app] ?? "Sometimes it means a device has another way in.";

  const lead = `${usual}, but ${nothing} in ${p.silentDays} days.`;

  let still = "";
  if (p.otherApps.length) {
    const phrase = (o: { app: string; activeDays: number }) => {
      const label = APP_LABEL[o.app] ?? o.app;
      if (o.activeDays >= p.silentDays) return `${label} every day`;
      if (o.activeDays * 2 >= p.silentDays) return `${label} most days`;
      return `${label} some days`;
    };
    still = `${name} is still using ${listJoin(p.otherApps.slice(0, 2).map(phrase))}, just not ${app}.`;
  }

  const checkUrl = `${HUB_URL}/dashboard/family#check-device`;
  const familyUrl = `${HUB_URL}/dashboard/family#quiet-alerts`;
  const isTube = p.app === "safetube";
  const ask = isTube
    ? `Want to check? It takes about two minutes on the device ${name} uses.`
    : `Want to take a look? Your dashboard shows what ${name} has been using.`;
  const ctaLabel = isTube ? "Check a device" : "Open your dashboard";
  const ctaUrl = isTube ? checkUrl : `${HUB_URL}/dashboard`;
  const snoozeLine = `Know why already (a trip, a break, a new routine)? You can pause these emails for ${name} on your Family page.`;
  const onceLine = `We send one of these per quiet stretch, and only for apps ${name} normally uses.`;

  const subject = `${name} hasn't used ${app} in ${p.silentDays} days`;

  const P = (s: string, extra = "") => `<p style="margin: 0 0 16px 0; font-size: 16px;${extra}">${s}</p>`;
  const html = `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #221D2E; max-width: 600px; margin: 0 auto; padding: 20px; background: #FBF6EF;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #221D2E; margin: 0; font-size: 26px;">Safe Family</h1>
    </div>
    <div style="background: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      ${P("Hi,")}
      ${P(esc(lead))}
      ${still ? P(esc(still)) : ""}
      ${P(`It might be nothing. ${esc(maybe)} ${esc(ask)}`)}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${ctaUrl}" style="display: inline-block; background: #221D2E; color: #ffffff; padding: 14px 28px; border-radius: 999px; font-size: 16px; font-weight: bold; text-decoration: none;">${ctaLabel}</a>
      </div>
      ${P(`${esc(snoozeLine)} <a href="${familyUrl}" style="color: #221D2E;">Pause alerts for ${esc(name)}</a>`, " color: #6b7280; font-size: 14px;")}
      ${P(esc(onceLine), " color: #6b7280; font-size: 14px; margin: 0;")}
    </div>
    <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Questions? Just reply, or write to <a href="mailto:jeremiah@getsafefamily.com" style="color: #221D2E;">jeremiah@getsafefamily.com</a></p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">The Safe Family Team</p>
    </div>
  </body>
</html>`;

  const text = [
    "Hi,",
    "",
    lead,
    ...(still ? ["", still] : []),
    "",
    `It might be nothing. ${maybe} ${ask}`,
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    `${snoozeLine} ${familyUrl}`,
    onceLine,
    "",
    "The Safe Family Team",
  ].join("\n");

  return { subject, html, text };
}

async function sendEmail(to: string[], email: { subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
  if (!apiKey) return { ok: false, error: "Email service not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Safe Family <notifications@getsafefamily.com>",
        reply_to: "jeremiah@getsafefamily.com",
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (body as any)?.message || `HTTP ${res.status}` };
    return { ok: true, id: (body as any)?.id as string | undefined };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * The daily run (crons.ts). `dryRun` logs what WOULD be sent and marks
 * nothing — use it from the dashboard/CLI to sanity-check before trusting it.
 * `familyCode` limits the run to one family.
 */
export const runDaily = internalAction({
  args: { dryRun: v.optional(v.boolean()), familyCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const codes: string[] = args.familyCode
      ? [args.familyCode.trim().toUpperCase()]
      : await ctx.runQuery(internal.inactivityAlerts.listActiveFamilyCodes, {});
    let sent = 0;
    let failed = 0;
    const preview: { familyCode: string; to: string[]; subject: string; text: string }[] = [];

    for (const familyCode of codes) {
      try {
        const res = await ctx.runMutation(internal.inactivityAlerts.evaluateFamily, { familyCode });
        if (!res.pending.length) continue;
        if (!res.recipients.length) {
          console.warn(`[inactivityAlerts] ${familyCode}: ${res.pending.length} alert(s) but no recipient`);
          continue;
        }
        for (const p of res.pending) {
          const email = buildInactivityEmail(p);
          if (args.dryRun) {
            preview.push({ familyCode, to: res.recipients, subject: email.subject, text: email.text });
            continue;
          }
          const out = await sendEmail(res.recipients, email);
          if (!out.ok) {
            failed++;
            console.error(`[inactivityAlerts] send failed for ${familyCode}/${p.app}: ${out.error}`);
            continue;
          }
          await ctx.runMutation(internal.inactivityAlerts.markAlerted, {
            familyCode,
            kidKey: p.kidKey,
            app: p.app,
            silenceStartDay: p.silenceStartDay,
            silentDays: p.silentDays,
          });
          sent++;
        }
      } catch (e) {
        failed++;
        console.error(`[inactivityAlerts] family ${familyCode} failed:`, e);
      }
    }
    console.log(`[inactivityAlerts] families=${codes.length} sent=${sent} failed=${failed}${args.dryRun ? ` dryRun previews=${preview.length}` : ""}`);
    return { families: codes.length, sent, failed, preview };
  },
});

// ── Parent controls (public, owner-verified) ────────────────────────────────

async function requireFamily(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Please sign in again.");
  const user = await ctx.db.get(userId);
  if (!user?.familyCode) throw new Error("Your account has no family code yet.");
  return { userId, familyCode: user.familyCode };
}

async function kidKeyFor(ctx: QueryCtx | MutationCtx, familyCode: string, kidName: string): Promise<string> {
  const key = norm(kidName);
  const family = await ctx.db
    .query("kidIdentity")
    .withIndex("by_family", (q) => q.eq("familyCode", familyCode))
    .collect();
  const hit = family.find((row) => row.matchKeys.includes(key));
  return hit ? `id:${hit._id}` : key;
}

/** Per child: whether quiet-days alerts are paused, and the latest alert sent. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.familyCode) return [];
    const familyCode = user.familyCode;
    const kids = await ctx.db.query("kids").withIndex("by_parent", (q) => q.eq("parentUserId", userId)).collect();
    const rows = await ctx.db
      .query("inactivityAlerts")
      .withIndex("by_family", (q) => q.eq("familyCode", familyCode))
      .collect();
    const now = Date.now();
    const out: {
      kidId: Id<"kids">;
      snoozedUntil: number | null;
      lastAlert: { app: string; silentDays: number; alertedAt: number; resolved: boolean } | null;
    }[] = [];
    for (const k of kids.filter((k) => !k.archived)) {
      const kidKey = await kidKeyFor(ctx, familyCode, k.name);
      const mine = rows.filter((r) => r.kidKey === kidKey);
      const snooze = mine.find((r) => r.app === SNOOZE_ROW_APP)?.snoozedUntil;
      const last = mine
        .filter((r) => r.app !== SNOOZE_ROW_APP && r.alertedAt)
        .sort((a, b) => (b.alertedAt ?? 0) - (a.alertedAt ?? 0))[0];
      out.push({
        kidId: k._id,
        snoozedUntil: snooze && snooze > now ? snooze : null,
        lastAlert: last
          ? { app: APP_LABEL[last.app] ?? last.app, silentDays: last.silentDays ?? 0, alertedAt: last.alertedAt!, resolved: !!last.rearmedAt }
          : null,
      });
    }
    return out;
  },
});

/** Pause (days > 0, up to 90) or resume (days = 0) quiet-days alerts for one child. */
export const setSnooze = mutation({
  args: { kidId: v.id("kids"), days: v.number() },
  handler: async (ctx, args) => {
    const { userId, familyCode } = await requireFamily(ctx);
    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentUserId !== userId) throw new Error("That child isn't on your account.");
    const days = Math.max(0, Math.min(90, Math.floor(args.days)));
    const kidKey = await kidKeyFor(ctx, familyCode, kid.name);
    const now = Date.now();
    const snoozedUntil = days > 0 ? now + days * 86400000 : undefined;
    const existing = await ctx.db
      .query("inactivityAlerts")
      .withIndex("by_family_kid_app", (q) => q.eq("familyCode", familyCode).eq("kidKey", kidKey).eq("app", SNOOZE_ROW_APP))
      .first();
    if (existing) await ctx.db.patch(existing._id, { snoozedUntil, updatedAt: now });
    else await ctx.db.insert("inactivityAlerts", { familyCode, kidKey, app: SNOOZE_ROW_APP, snoozedUntil, updatedAt: now });
    return { snoozedUntil: snoozedUntil ?? null };
  },
});
