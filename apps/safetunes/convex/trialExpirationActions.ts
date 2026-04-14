"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Run the full trial expiration check:
 * 1. Process expirations (mutation) — updates local user statuses
 * 2. Report results to Marketing Central — it handles ALL customer emails
 *    (consolidated per-user with bundle upsell) and admin digest
 */
export const runTrialExpirationCheck = internalAction({
  args: {},
  handler: async (ctx) => {
    const result = await ctx.runMutation(internal.trialExpiration.processTrialExpirations, {});

    const { expired, expiringSoon } = result;

    // Report to Marketing Central — it sends customer emails + admin digest
    try {
      const adminKey = process.env.ADMIN_KEY;
      if (adminKey) {
        await fetch("https://adamant-crow-705.convex.site/reportTrialSummary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({
            app: "safetunes",
            expiredCount: expired.length,
            expiredEmails: expired.map((u: { email: string }) => u.email),
            warningCount: expiringSoon.length,
            warningEmails: expiringSoon.map((u: { email: string }) => u.email),
          }),
        });
      }
    } catch (e) {
      console.error("[SafeTunes] Failed to report trial summary to Marketing Central:", e);
    }

    console.log(
      `[SafeTunes] Trial check complete: ${expired.length} expired, ${expiringSoon.length} warnings sent`
    );
  },
});
