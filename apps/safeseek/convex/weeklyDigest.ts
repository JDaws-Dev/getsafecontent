"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cron entry: enumerates parents and dispatches one digest email each.
 * Runs every Sunday 23:00 UTC.
 *
 * Why this is one fan-out action: keeps the cron handler simple. Per-parent
 * email assembly happens in `sendForParent` so a single bad parent doesn't
 * block the rest of the run.
 */
export const sendAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.weeklyDigestQueries.listEligibleParents, {});
    let sent = 0;
    let skipped = 0;
    for (const user of users) {
      try {
        const result = await ctx.runAction(internal.weeklyDigest.sendForParent, {
          userId: user._id,
        });
        if (result.sent) sent++;
        else skipped++;
      } catch (err) {
        console.error(`[weeklyDigest] failed for ${user.email}:`, err);
      }
    }
    console.log(`[weeklyDigest] sent=${sent} skipped=${skipped}`);
  },
});

/**
 * Build + send digest for one parent. Skips silently if no kid has any
 * activity in the past week (no point in an empty email).
 */
export const sendForParent = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string }> => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return { sent: false, reason: "no_resend_key" };
    }

    const user = await ctx.runQuery(internal.users.getUserById, { userId: args.userId });
    if (!user?.email) return { sent: false, reason: "no_email" };
    if (user.weeklyDigestOptOut) return { sent: false, reason: "opted_out" };
    // Don't send to expired/cancelled — the email is a value-add, not a dunning notice
    if (user.subscriptionStatus === "cancelled" || user.subscriptionStatus === "expired") {
      return { sent: false, reason: "subscription_inactive" };
    }

    const since = Date.now() - SEVEN_DAYS_MS;
    const summary = await ctx.runQuery(internal.weeklyDigestQueries.summarizeForParent, {
      userId: args.userId,
      since,
    });

    // A week of finished lessons and no searches at all is a GOOD week, and it
    // used to produce no email: the old check only looked at search volume.
    if (
      summary.totalSearches === 0 &&
      summary.totalBlocked === 0 &&
      summary.totalLessons === 0 &&
      summary.totalCards === 0
    ) {
      return { sent: false, reason: "no_activity" };
    }

    const html = renderDigest(user.name || "there", summary);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SafeStudy <jeremiah@getsafefamily.com>",
          to: [user.email],
          subject: `Your SafeStudy weekly digest`,
          html,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`[weeklyDigest] Resend error ${res.status}: ${t}`);
        return { sent: false, reason: `resend_${res.status}` };
      }
      await ctx.runMutation(internal.weeklyDigestQueries.markSent, { userId: args.userId });
      return { sent: true };
    } catch (err) {
      console.error("[weeklyDigest] threw:", err);
      return { sent: false, reason: "threw" };
    }
  },
});

// ===== HTML renderer =====

type KidSummary = {
  kidName: string;
  totalSearches: number;
  totalBlocked: number;
  topCategories: { category: string; count: number }[];
  concerningCount: number;
  budgetHits: number;
  heaviestDay: { date: string; count: number } | null;
  // The daily program (Sep 2026)
  lessonsCompleted: number;
  lessonsAssigned: number;
  cardsReviewed: number;
  cardsCorrect: number;
  reviewAccuracy: number | null;
  tutorMessages: number;
  subjects: { subject: string; topics: string[] }[];
  currentStreak: number;
};

type DigestSummary = {
  totalSearches: number;
  totalBlocked: number;
  totalConcerning: number;
  totalLessons: number;
  totalCards: number;
  perKid: KidSummary[];
};

const PRETTY_SUBJECT: Record<string, string> = {
  math: "Math",
  science: "Science",
  history: "History",
  reading: "Reading",
  writing: "Writing",
  bible: "Bible",
  custom: "Other",
};

const PRETTY_CATEGORY: Record<string, string> = {
  study: "Study",
  curiosity: "Curiosity",
  aesthetic_browsing: "Aesthetic / Pinterest",
  self_image: "Self-image",
  appearance: "Appearance / fashion",
  celebrity_gossip: "Celebrity",
  eating_disorder_adjacent: "ED-adjacent",
  self_harm_adjacent: "Self-harm signals",
  other: "Other",
};

function renderDigest(parentName: string, s: DigestSummary): string {
  const kidBlocks = s.perKid
    .map((k) => {
      // Lead with what she studied. The old digest opened with a search count,
      // which told a parent how much their kid typed, not what they learned.
      const subjectLines = k.subjects
        .map(
          (sub) =>
            `<li><strong>${escapeHtml(PRETTY_SUBJECT[sub.subject] || sub.subject)}</strong>: ${escapeHtml(
              sub.topics.join(", ")
            )}</li>`
        )
        .join("");

      const program = k.lessonsAssigned > 0
        ? `<p style="margin:0 0 10px;color:#1a1a2e;font-size:15px">
             Finished <strong>${k.lessonsCompleted} of ${k.lessonsAssigned}</strong> ${
               k.lessonsAssigned === 1 ? "lesson" : "lessons"
             }${k.currentStreak > 1 ? `, ${k.currentStreak} days in a row` : ""}.
           </p>`
        : `<p style="margin:0 0 10px;color:#666;font-size:15px">No lessons set up yet. You can pick subjects and topics for ${escapeHtml(
            k.kidName
          )} on the dashboard.</p>`;

      const review =
        k.cardsReviewed > 0
          ? `<p style="margin:0 0 10px;color:#1a1a2e;font-size:15px">Reviewed <strong>${k.cardsReviewed}</strong> ${
              k.cardsReviewed === 1 ? "card" : "cards"
            } and remembered <strong>${k.cardsCorrect}</strong>${
              k.reviewAccuracy !== null ? ` (${k.reviewAccuracy}%)` : ""
            }.</p>`
          : "";

      const tutor =
        k.tutorMessages > 0
          ? `<p style="margin:0 0 10px;color:#444;font-size:14px">Asked the tutor ${k.tutorMessages} ${
              k.tutorMessages === 1 ? "question" : "questions"
            }. You can read the conversations on the dashboard.</p>`
          : "";

      const searchLine = `<p style="margin:0 0 6px;color:#666;font-size:13px">${k.totalSearches} ${
        k.totalSearches === 1 ? "search" : "searches"
      }${k.totalBlocked > 0 ? `, ${k.totalBlocked} blocked` : ""}${
        k.heaviestDay ? `. Busiest day ${k.heaviestDay.date} (${k.heaviestDay.count}).` : "."
      }</p>`;

      // Concern line stays factual and does not editorialize about the child.
      const concerning =
        k.concerningCount > 0
          ? `<p style="color:#b91c1c;background:#fef2f2;padding:10px 12px;border-radius:6px;margin:10px 0;font-size:14px">
               ${k.concerningCount} ${
                 k.concerningCount === 1 ? "question" : "questions"
               } worth a conversation ${k.concerningCount === 1 ? "was" : "were"} flagged this week.
               <a href="https://getsafestudy.com/admin" style="color:#b91c1c">See the alerts on your dashboard</a>.
             </p>`
          : "";

      const budget =
        k.budgetHits > 0
          ? `<p style="font-size:13px;color:#92400e;background:#fffbeb;padding:6px 10px;border-radius:4px;margin:8px 0">Ran out of daily time on ${
              k.budgetHits
            } ${k.budgetHits === 1 ? "day" : "days"}.</p>`
          : "";

      const topCat = k.topCategories
        .slice(0, 4)
        .map(
          (c) =>
            `<li>${escapeHtml(PRETTY_CATEGORY[c.category] || c.category)}: <strong>${c.count}</strong></li>`
        )
        .join("");

      return `
<div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0">
  <h3 style="margin:0 0 10px;color:#1a1a2e">${escapeHtml(k.kidName)}</h3>
  ${program}
  ${review}
  ${subjectLines ? `<p style="margin:10px 0 4px;font-size:13px;color:#666">What ${escapeHtml(k.kidName)} covered:</p><ul style="margin:4px 0;padding-left:20px;font-size:14px;color:#1a1a2e">${subjectLines}</ul>` : ""}
  ${tutor}
  ${concerning}
  ${budget}
  <div style="border-top:1px solid #f0f0f0;margin-top:12px;padding-top:10px">
    ${searchLine}
    ${topCat ? `<ul style="margin:4px 0;padding-left:20px;font-size:12px;color:#666">${topCat}</ul>` : ""}
  </div>
</div>`;
    })
    .join("");

  const headline =
    s.totalLessons > 0
      ? `${s.totalLessons} ${s.totalLessons === 1 ? "lesson" : "lessons"} finished${
          s.totalCards > 0 ? ` and ${s.totalCards} review ${s.totalCards === 1 ? "card" : "cards"}` : ""
        } this week.`
      : `${s.totalSearches} ${s.totalSearches === 1 ? "search" : "searches"} this week.`;

  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a2e;line-height:1.55">
  <h2 style="margin:0 0 8px">Hi ${escapeHtml(parentName)},</h2>
  <p>Here's what your kids did on SafeStudy this week.</p>
  <p style="background:#f3f4f6;padding:12px 16px;border-radius:6px;margin:16px 0">
    <strong>${headline}</strong>
    ${s.totalConcerning > 0 ? `<br><span style="color:#b91c1c">${s.totalConcerning} ${s.totalConcerning === 1 ? "question" : "questions"} flagged for a conversation.</span>` : ""}
  </p>
  ${kidBlocks}
  <p style="margin-top:24px"><a href="https://getsafestudy.com/admin" style="color:#3b82f6">Open the parent dashboard</a></p>
  <p style="color:#888;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
    Don't want these? <a href="https://getsafestudy.com/admin/settings" style="color:#888">Turn off weekly digests</a>.
  </p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
