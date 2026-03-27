import { internalMutation } from "./_generated/server";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Process trial expirations:
 * - Find expired trials → flip to "expired"
 * - Find trials expiring in ≤2 days → flag for warning email
 * Returns lists of emails for each category.
 */
export const processTrialExpirations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subscriptionStatus"), "trial"))
      .collect();

    const expired: { email: string; name: string }[] = [];
    const expiringSoon: { email: string; name: string }[] = [];
    let skippedAncient = 0;

    for (const user of users) {
      if (!user.email) continue;

      // Compute trial end: subscriptionEndsAt field, or createdAt + 7 days
      const trialEnd = user.subscriptionEndsAt ?? ((user.createdAt ?? user._creationTime) + SEVEN_DAYS_MS);

      if (trialEnd < now) {
        // Trial has expired
        if (trialEnd < now - THIRTY_DAYS_MS) {
          // Ancient trial (30+ days expired) — expire silently, don't email
          await ctx.db.patch(user._id, { subscriptionStatus: "expired" });
          skippedAncient++;
          continue;
        }
        await ctx.db.patch(user._id, { subscriptionStatus: "expired" });
        expired.push({ email: user.email, name: user.name || user.email });
      } else if (trialEnd < now + TWO_DAYS_MS && !user.trialWarningEmailSent) {
        // Trial expiring in ≤2 days — send warning
        await ctx.db.patch(user._id, { trialWarningEmailSent: true });
        expiringSoon.push({ email: user.email, name: user.name || user.email });
      }
    }

    if (skippedAncient > 0) {
      console.log(`[SafeTunes] Expired ${skippedAncient} ancient trials silently (30+ days old)`);
    }

    return { expired, expiringSoon };
  },
});
