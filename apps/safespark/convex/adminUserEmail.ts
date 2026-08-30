import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * One-off: move a parent account from one email address to another.
 *
 * Why this has to exist and why it must run everywhere at once: the central
 * (Marketing) JWT carries the parent's email, and every app looks its local
 * user up by that email (see userSync). Change central alone and each app
 * stops finding her row — and `ensureUser`-style helpers then happily CREATE a
 * fresh empty account under the new address, orphaning her kids, approvals and
 * lifetime subscription behind an email nobody logs in with any more.
 *
 * internalMutation on purpose: a public mutation would be callable straight at
 * the deployment URL and would be an account-takeover primitive.
 *
 * Idempotent — running it twice is a no-op, and it refuses to clobber an
 * existing account already on the target address.
 */
export const migrateUserEmail = internalMutation({
  args: {
    oldEmail: v.string(),
    newEmail: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const oldEmail = args.oldEmail.trim().toLowerCase();
    const newEmail = args.newEmail.trim().toLowerCase();
    if (!newEmail.includes("@")) throw new Error("newEmail is not an email");
    if (oldEmail === newEmail) return { skipped: "same address" };

    const changes: string[] = [];

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", newEmail))
      .first();
    const target = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", oldEmail))
      .first();

    if (existing && target && existing._id !== target._id) {
      // Two separate accounts would have to be merged; that is not something
      // to do implicitly inside a rename.
      throw new Error(
        `refusing to migrate: ${newEmail} already belongs to a different user (${existing._id})`
      );
    }
    if (!target) {
      return { skipped: `no user with ${oldEmail}`, alreadyMigrated: !!existing };
    }

    if (!args.dryRun) await ctx.db.patch(target._id, { email: newEmail });
    changes.push(`users/${target._id}`);

    return { migrated: true, dryRun: !!args.dryRun, changes };
  },
});

/**
 * SafeSpark keeps a second, email-derived identity key: `clerkUserId` of the
 * form `marketing:<email>` (a leftover shape from when Clerk was the provider).
 * The email migration only rewrote `email`, so this key was left pointing at
 * the old address — an inconsistency that any `by_clerk_id` reconciliation
 * would trip over even though the live provisioning path resolves by email.
 */
export const resyncClerkUserId = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { skipped: `no user with ${email}` };

    const expected = `marketing:${email}`;
    if (user.clerkUserId === expected) {
      return { alreadyCorrect: true, clerkUserId: expected };
    }
    // Only rewrite synthetic marketing keys. A real provider subject must
    // never be clobbered by an email rename.
    if (!user.clerkUserId.startsWith("marketing:")) {
      return { skipped: "clerkUserId is not a synthetic marketing key", clerkUserId: user.clerkUserId };
    }

    const before = user.clerkUserId;
    await ctx.db.patch(user._id, { clerkUserId: expected });
    return { updated: true, before, after: expected };
  },
});
