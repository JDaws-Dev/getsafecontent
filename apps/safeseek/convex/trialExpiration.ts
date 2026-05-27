"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Runs daily trial expiration check:
 * 1. Expires stale trials (trialEndsAt < now)
 * 2. Sends warning emails for trials expiring within 2 days
 */
export const runTrialExpirationCheck = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    // Get all trial users
    const trialUsers = await ctx.runQuery(internal.trialExpirationQueries.getTrialUsers);

    let expired = 0;
    let warned = 0;
    let missingEndDate = 0;

    for (const user of trialUsers) {
      if (!user.trialEndsAt) {
        missingEndDate++;
        console.warn(
          `[TrialExpiration] Trial user ${user._id} (${user.email}) has no trialEndsAt — provisioning bug; trial will never expire`,
        );
        continue;
      }

      if (user.trialEndsAt < now) {
        // Trial has expired — mark as expired and send email
        await ctx.runMutation(internal.trialExpirationQueries.expireUser, {
          userId: user._id,
        });
        await ctx.runAction(internal.emails.sendTrialExpiredEmail, {
          userEmail: user.email!,
          userName: user.name || user.email!.split("@")[0],
        });
        expired++;
      } else if (
        user.trialEndsAt - now <= twoDaysMs &&
        !user.trialWarningEmailSent
      ) {
        // Trial expires within 2 days — send warning
        await ctx.runAction(internal.emails.sendTrialExpiringWarning, {
          userEmail: user.email!,
          userName: user.name || user.email!.split("@")[0],
          trialEndsAt: user.trialEndsAt,
        });
        await ctx.runMutation(internal.trialExpirationQueries.markWarningEmailSent, {
          userId: user._id,
        });
        warned++;
      }
    }

    console.log(
      `[TrialExpiration] Expired: ${expired}, Warned: ${warned}, MissingEndDate: ${missingEndDate}`,
    );
    return { expired, warned, missingEndDate };
  },
});
