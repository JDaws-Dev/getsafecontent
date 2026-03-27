"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Run the full trial expiration check:
 * 1. Process expirations (mutation)
 * 2. Send warning emails
 * 3. Send expired emails
 * 4. Send admin summary
 */
export const runTrialExpirationCheck = internalAction({
  args: {},
  handler: async (ctx) => {
    const result = await ctx.runMutation(internal.trialExpiration.processTrialExpirations, {});

    const { expired, expiringSoon } = result;

    // Send warning emails
    for (const user of expiringSoon) {
      try {
        await ctx.runAction(internal.emails.sendTrialExpiringWarning, {
          email: user.email,
          name: user.name,
        });
      } catch (e) {
        console.error(`[SafeTube] Failed to send warning email to ${user.email}:`, e);
      }
    }

    // Send expired emails
    for (const user of expired) {
      try {
        await ctx.runAction(internal.emails.sendTrialExpiredEmail, {
          email: user.email,
          name: user.name,
        });
      } catch (e) {
        console.error(`[SafeTube] Failed to send expired email to ${user.email}:`, e);
      }
    }

    // Send admin summary if anything happened
    if (expired.length > 0 || expiringSoon.length > 0) {
      try {
        await ctx.runAction(internal.emails.sendAdminTrialExpirationSummary, {
          expiredCount: expired.length,
          expiredEmails: expired.map((u) => u.email),
          warningCount: expiringSoon.length,
          warningEmails: expiringSoon.map((u) => u.email),
        });
      } catch (e) {
        console.error("[SafeTube] Failed to send admin trial summary:", e);
      }
    }

    console.log(
      `[SafeTube] Trial check complete: ${expired.length} expired, ${expiringSoon.length} warnings sent`
    );
  },
});
