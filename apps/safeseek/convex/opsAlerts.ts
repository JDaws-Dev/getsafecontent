import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";

// Operator alerting for silent safety degradations. First use: the intent
// classifier fails open by design (a classifier outage must never block a
// kid's search), but while it's down the always-escalate ED / self-harm
// parent alerts can't fire from the LLM path — an outage that used to be
// invisible. This makes it visible to the operator within one search.

const OPS_EMAIL = "jeremiah@getsafefamily.com";
const ALERT_DEDUPE_MS = 24 * 60 * 60 * 1000; // max one email per day

// Returns true (and records the marker) if no alert was sent in the last
// 24h. Called from the search action whenever a degraded classification
// happens; the caller schedules sendClassifierDownAlert when true.
export const noteClassifierDegraded = internalMutation({
  args: { rationale: v.string() },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("systemEvents")
      .withIndex("by_kind_time", (q) => q.eq("kind", "classifier_down_alerted"))
      .order("desc")
      .first();

    if (latest && Date.now() - latest.createdAt < ALERT_DEDUPE_MS) {
      return false;
    }

    await ctx.db.insert("systemEvents", {
      kind: "classifier_down_alerted",
      createdAt: Date.now(),
      meta: args.rationale.slice(0, 200),
    });
    return true;
  },
});

export const sendClassifierDownAlert = internalAction({
  args: { rationale: v.string() },
  handler: async (_ctx, args) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error("[opsAlerts] RESEND_API_KEY not set — cannot send classifier-down alert");
      return;
    }

    const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a2e;line-height:1.55">
  <h2 style="color:#dc2626;margin:0 0 16px">SafeStudy: intent classifier is degraded</h2>
  <p>A kid search was screened with the regex pre-filter only — the LLM intent
  classifier was unavailable (<em>${args.rationale}</em>).</p>
  <p><strong>What this means:</strong> searches still work (fail-open by design),
  but the always-escalate eating-disorder / self-harm parent alerts cannot fire
  from the LLM path until OpenAI access is restored. The regex tripwires still
  catch known patterns.</p>
  <p><strong>Check:</strong> OpenAI status / billing, and the
  <code>OPENAI_API_KEY</code> env on strong-scorpion-227.</p>
  <p style="color:#888;font-size:12px;margin-top:32px">
    Sent at most once per 24h while degraded classifications keep happening.
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
          from: "SafeStudy Alerts <alerts@getsafestudy.com>",
          to: OPS_EMAIL,
          subject: "SafeStudy: intent classifier degraded — safety alerts impaired",
          html,
        }),
      });
      if (!res.ok) {
        console.error(`[opsAlerts] Resend error ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      console.error("[opsAlerts] failed to send classifier-down alert:", err);
    }
  },
});
