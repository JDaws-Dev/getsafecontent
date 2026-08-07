"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Send a parent-alert email when a kid's query trips a concern category
 * (eating-disorder-adjacent, self-harm-adjacent).
 *
 * Why a separate scheduled action: the kid's search response should return
 * immediately. We don't want to block the request on email delivery, and
 * we want retries handled by Convex's scheduler if Resend hiccups.
 */
export const sendParentEmail = internalAction({
  args: {
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    query: v.string(),
    category: v.string(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.warn("[concernAlerts] RESEND_API_KEY not set — skipping email");
      return;
    }

    const user = await ctx.runQuery(internal.users.getUserById, { userId: args.userId });
    const kid = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });

    if (!user?.email || !kid) {
      console.warn("[concernAlerts] missing user.email or kid profile");
      return;
    }

    const isED = args.category === "eating_disorder_adjacent";
    const isSH = args.category === "self_harm_adjacent";
    const headline = isSH
      ? "Important: a question from your child needs your attention"
      : isED
        ? "Heads up: your child searched something worth a conversation"
        : "Concerning search from your child";

    const resourceLine = isSH
      ? "If your child may be in crisis, the 988 Suicide & Crisis Lifeline is available 24/7 (call or text 988)."
      : isED
        ? "The National Eating Disorders helpline is at 1-800-931-2237 (Mon-Thu 9am-9pm ET, Fri 9am-5pm ET)."
        : "Talk with your child when you have a calm moment.";

    const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a2e;line-height:1.55">
  <h2 style="color:#dc2626;margin:0 0 16px">${headline}</h2>
  <p>Hi ${user.name || "there"},</p>
  <p>Your child <strong>${escapeHtml(kid.name)}</strong> searched SafeStudy for something we think is worth a parent conversation:</p>
  <blockquote style="border-left:3px solid #dc2626;padding:12px 16px;background:#fef2f2;margin:16px 0;font-size:15px">
    "${escapeHtml(args.query)}"
  </blockquote>
  <p style="color:#444"><em>Why we're flagging this:</em> ${escapeHtml(args.rationale)}</p>
  <p>SafeStudy did not return results for this query. We blocked it and showed your child a gentle redirect.</p>
  <p style="background:#fffbeb;padding:12px 16px;border-radius:6px;border:1px solid #fcd34d">
    <strong>Resources:</strong> ${resourceLine}
  </p>
  <p>Review your child's search history at <a href="https://getsafestudy.com/admin">getsafestudy.com/admin</a>.</p>
  <p style="color:#888;font-size:12px;margin-top:32px">
    You're receiving this because SafeStudy detected a query category we always escalate to parents (eating-disorder-adjacent or self-harm-adjacent). These alerts can't be turned off.
  </p>
</body></html>`;

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
          subject: headline,
          html,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`[concernAlerts] Resend error ${res.status}: ${t}`);
        return;
      }
      await ctx.runMutation(internal.concernAlertQueries.markNotified, {
        kidProfileId: args.kidProfileId,
        query: args.query,
        category: args.category,
      });
    } catch (err) {
      console.error("[concernAlerts] sendParentEmail threw:", err);
    }
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
