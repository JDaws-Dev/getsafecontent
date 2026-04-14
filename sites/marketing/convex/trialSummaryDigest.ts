"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const APP_LABELS: Record<string, string> = {
  safetunes: "SafeTunes",
  safetube: "SafeTube",
  safereads: "SafeReads",
  safestudy: "SafeStudy",
};

const APP_DESCRIPTIONS: Record<string, string> = {
  safetunes: "approved music library and kid profiles",
  safetube: "approved YouTube channels and watch history",
  safereads: "reading library, bookmarks, and reading streaks",
  safestudy: "safe search history and tutor conversations",
};

type Report = {
  app: string;
  expiredCount: number;
  expiredEmails: string[];
  warningCount: number;
  warningEmails: string[];
};

/**
 * Build per-user maps from app reports.
 * Returns { warned: Map<email, apps[]>, expired: Map<email, apps[]> }
 */
function buildUserMaps(reports: Report[]) {
  const warned = new Map<string, string[]>();
  const expired = new Map<string, string[]>();

  for (const report of reports) {
    for (const email of report.warningEmails) {
      const e = email.toLowerCase();
      if (!warned.has(e)) warned.set(e, []);
      warned.get(e)!.push(report.app);
    }
    for (const email of report.expiredEmails) {
      const e = email.toLowerCase();
      if (!expired.has(e)) expired.set(e, []);
      expired.get(e)!.push(report.app);
    }
  }

  return { warned, expired };
}

function getUpsellBlock(appCount: number): string {
  if (appCount === 1) {
    return `
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%); color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Get all 4 apps for $9.99/mo</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.9;">SafeTunes + SafeTube + SafeReads + SafeStudy — save over $10/mo vs individual</p>
        <a href="https://getsafefamily.com/signup" style="display: inline-block; background: white; color: #1a1a2e; padding: 12px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">Subscribe &amp; Save</a>
        <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.7;">Or $99/year — just $2.06/app/month</p>
      </div>
    `;
  }

  if (appCount === 2) {
    return `
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%); color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Add 2 more apps for just 1 penny more</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.9;">You're using 2 apps ($9.98/mo individually). Get all 4 for $9.99/mo.</p>
        <a href="https://getsafefamily.com/signup" style="display: inline-block; background: white; color: #1a1a2e; padding: 12px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">Get the Bundle</a>
        <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.7;">Or $99/year — save even more</p>
      </div>
    `;
  }

  if (appCount === 3) {
    return `
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%); color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Get the 4th app FREE with the bundle</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.9;">You're using 3 apps ($14.97/mo individually). The bundle is $9.99/mo for all 4 — save $4.98/mo.</p>
        <a href="https://getsafefamily.com/signup" style="display: inline-block; background: white; color: #1a1a2e; padding: 12px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">Switch to Bundle</a>
        <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.7;">Or $99/year — that's $2.06/app/month</p>
      </div>
    `;
  }

  // 4 apps
  return `
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%); color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Keep all 4 apps for $9.99/mo</p>
      <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.9;">That's $19.96/mo individually — the bundle saves you $9.97 every month.</p>
      <a href="https://getsafefamily.com/signup" style="display: inline-block; background: white; color: #1a1a2e; padding: 12px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">Subscribe &amp; Save 50%</a>
      <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.7;">Or $99/year — just $8.25/mo for everything</p>
    </div>
  `;
}

function buildWarningEmail(email: string, apps: string[]): string {
  const appList = apps.map((a) => APP_LABELS[a] || a);
  const appDetails = apps
    .map(
      (a) =>
        `<li style="margin-bottom: 8px;"><strong>${APP_LABELS[a] || a}</strong> — your ${APP_DESCRIPTIONS[a] || "data"} will be preserved</li>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1a1a2e; margin: 0 0 4px 0; font-size: 24px;">Safe Family</h1>
        </div>

        <h2 style="font-size: 20px; margin: 0 0 16px 0;">Your free trial expires in 2 days</h2>

        <p style="font-size: 16px; line-height: 1.6;">
          Your Safe Family trial for <strong>${appList.join(", ")}</strong> is ending soon.
          Subscribe now to keep everything you've set up:
        </p>

        <ul style="font-size: 15px; line-height: 1.8; padding-left: 20px;">
          ${appDetails}
        </ul>

        ${getUpsellBlock(apps.length)}

        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px;">
          <strong style="color: #166534;">Your data is safe.</strong> Even if your trial ends, all your settings, profiles, and approved content will be preserved. Subscribe anytime to pick up right where you left off.
        </div>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Questions? Reply to this email or contact <a href="mailto:jeremiah@getsafefamily.com" style="color: #6b7280;">jeremiah@getsafefamily.com</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Safe Family — Keeping kids safe online
        </p>
      </body>
    </html>
  `;
}

function buildExpiredEmail(email: string, apps: string[]): string {
  const appList = apps.map((a) => APP_LABELS[a] || a);
  const appDetails = apps
    .map(
      (a) =>
        `<li style="margin-bottom: 8px;"><strong>${APP_LABELS[a] || a}</strong> — ${APP_DESCRIPTIONS[a] || "data"}</li>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1a1a2e; margin: 0 0 4px 0; font-size: 24px;">Safe Family</h1>
        </div>

        <h2 style="font-size: 20px; margin: 0 0 16px 0;">Your free trial has ended</h2>

        <p style="font-size: 16px; line-height: 1.6;">
          Your Safe Family trial for <strong>${appList.join(", ")}</strong> has ended.
          But don't worry — <strong>all your data is preserved</strong>:
        </p>

        <ul style="font-size: 15px; line-height: 1.8; padding-left: 20px;">
          ${appDetails}
        </ul>

        <p style="font-size: 16px; line-height: 1.6;">
          Subscribe to restore full access instantly. Everything will be exactly as you left it.
        </p>

        ${getUpsellBlock(apps.length)}

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Questions? Reply to this email or contact <a href="mailto:jeremiah@getsafefamily.com" style="color: #6b7280;">jeremiah@getsafefamily.com</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Safe Family — Keeping kids safe online
        </p>
      </body>
    </html>
  `;
}

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Safe Family <noreply@getsafefamily.com>",
        reply_to: "jeremiah@getsafefamily.com",
        to,
        subject,
        html,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error(`[TrialDigest] Resend error for ${to}:`, result);
      return false;
    }
    console.log(`[TrialDigest] Email sent to ${to}: ${result.id}`);
    return true;
  } catch (error) {
    console.error(`[TrialDigest] Failed to send to ${to}:`, error);
    return false;
  }
}

/**
 * Sends consolidated customer emails + admin digest.
 * Runs via cron 30 min after the last app's trial check.
 *
 * Customer emails:
 * - One email per user listing ALL their expiring apps
 * - Bundle upsell based on how many apps they have
 *
 * Admin email:
 * - One digest summarizing all activity across all apps
 */
export const sendConsolidatedDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.runQuery(internal.trialSummary.getTodaysReports, {});

    if (reports.length === 0) {
      console.log("[TrialDigest] No reports today — skipping.");
      return;
    }

    const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
    if (!apiKey) {
      console.error("[TrialDigest] No RESEND_API_KEY — cannot send emails.");
      return;
    }

    const { warned, expired } = buildUserMaps(reports);

    // Skip if nothing happened
    if (warned.size === 0 && expired.size === 0) {
      console.log("[TrialDigest] All reports had zero activity — skipping.");
      return;
    }

    // --- CUSTOMER EMAILS ---

    let customerWarningsSent = 0;
    let customerExpiredSent = 0;

    // Send warning emails (one per customer, listing all their expiring apps)
    for (const [email, apps] of warned) {
      const appList = apps.map((a) => APP_LABELS[a] || a).join(", ");
      const subject = `Your Safe Family trial for ${appList} expires in 2 days`;
      const html = buildWarningEmail(email, apps);
      const sent = await sendEmail(apiKey, email, subject, html);
      if (sent) customerWarningsSent++;
    }

    // Send expired emails (one per customer, listing all their expired apps)
    for (const [email, apps] of expired) {
      const appList = apps.map((a) => APP_LABELS[a] || a).join(", ");
      const subject = `Your Safe Family trial has ended — your data is safe`;
      const html = buildExpiredEmail(email, apps);
      const sent = await sendEmail(apiKey, email, subject, html);
      if (sent) customerExpiredSent++;
    }

    console.log(
      `[TrialDigest] Customer emails: ${customerWarningsSent} warnings, ${customerExpiredSent} expired`
    );

    // --- ADMIN DIGEST ---

    const perAppSections: string[] = [];
    for (const report of reports) {
      const label = APP_LABELS[report.app] || report.app;
      const parts: string[] = [];
      if (report.expiredCount > 0) {
        parts.push(
          `<strong>Expired (${report.expiredCount}):</strong> ${report.expiredEmails.join(", ")}`
        );
      }
      if (report.warningCount > 0) {
        parts.push(
          `<strong>Warning (${report.warningCount}):</strong> ${report.warningEmails.join(", ")}`
        );
      }
      if (parts.length > 0) {
        perAppSections.push(
          `<tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; vertical-align: top; white-space: nowrap;">${label}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${parts.join("<br/>")}</td>
          </tr>`
        );
      }
    }

    const adminHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="font-size: 22px; margin: 0 0 8px 0;">Daily Trial Summary</h1>
          <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px;">
            ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div style="background: #f0f4ff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <strong>${expired.size}</strong> expired &nbsp;&bull;&nbsp;
            <strong>${warned.size}</strong> warned &nbsp;&bull;&nbsp;
            <strong>${reports.length}</strong> app${reports.length === 1 ? "" : "s"} reported
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 16px; text-align: left; border-bottom: 2px solid #e5e7eb;">App</th>
                <th style="padding: 8px 16px; text-align: left; border-bottom: 2px solid #e5e7eb;">Activity</th>
              </tr>
            </thead>
            <tbody>${perAppSections.join("")}</tbody>
          </table>

          <div style="margin-top: 20px; padding: 16px; background: #fffbeb; border-radius: 8px; font-size: 13px;">
            <strong>Unique users:</strong><br/>
            ${expired.size > 0 ? `Expired: ${[...expired.keys()].join(", ")}<br/>` : ""}
            ${warned.size > 0 ? `Warned: ${[...warned.keys()].join(", ")}` : ""}
          </div>

          <div style="margin-top: 16px; padding: 12px 16px; background: #f0f4ff; border-radius: 8px; font-size: 13px;">
            <strong>Emails sent:</strong> ${customerWarningsSent} warning${customerWarningsSent === 1 ? "" : "s"}, ${customerExpiredSent} expired
          </div>

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Consolidated daily digest — Safe Family
          </p>
        </body>
      </html>
    `;

    await sendEmail(
      apiKey,
      process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
      `Safe Family Trials: ${expired.size} expired, ${warned.size} warned`,
      adminHtml
    );

    // Clean up old reports
    await ctx.runMutation(internal.trialSummary.cleanupOldReports, {});
  },
});
