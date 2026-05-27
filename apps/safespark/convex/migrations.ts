import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * One-shot migration: copy real Clerk subjects (user_xxx) on existing
 * users into a new legacyClerkUserId column for the federated-auth
 * migration. Runs idempotently — repeat invocations are no-ops.
 *
 * After this runs, the federated-auth cutover can safely overwrite
 * `clerkUserId` (e.g., to `marketing:<email>` or a derived stable ID)
 * without losing the original Clerk subject we may need for fallback.
 *
 * Synthetic clerkUserIds (e.g., `marketing:foo@bar.com`, `kid:<id>`)
 * are deliberately skipped — only real Clerk subjects are preserved.
 */
export const backfillLegacyClerkUserId = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const users = await ctx.db.query('users').collect();

    let total = users.length;
    let realClerkSubjects = 0;
    let alreadyMigrated = 0;
    let skippedSynthetic = 0;
    let backfilled = 0;
    const backfilledEmails: string[] = [];

    for (const user of users) {
      const clerk = user.clerkUserId;
      // Real Clerk subjects start with "user_". Synthetics start with
      // "marketing:" or "kid:" or other namespace prefixes we may add later.
      const isRealClerk = clerk.startsWith('user_');
      if (!isRealClerk) {
        skippedSynthetic++;
        continue;
      }
      realClerkSubjects++;
      if (user.legacyClerkUserId === clerk) {
        alreadyMigrated++;
        continue;
      }
      if (!dryRun) {
        await ctx.db.patch(user._id, { legacyClerkUserId: clerk });
      }
      backfilled++;
      backfilledEmails.push(user.email);
    }

    const result = {
      dryRun,
      total,
      realClerkSubjects,
      alreadyMigrated,
      skippedSynthetic,
      backfilled,
      backfilledEmails,
    };
    console.log('[backfillLegacyClerkUserId]', JSON.stringify(result));
    return result;
  },
});
