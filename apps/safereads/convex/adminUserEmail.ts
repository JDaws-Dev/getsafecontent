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
      .withIndex("email", (q) => q.eq("email", newEmail))
      .first();
    const target = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", oldEmail))
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

    // SafeReads mirrors central's user list locally; it joins on email too.
    for (const row of await ctx.db.query("centralUsers").collect()) {
      if ((row.email ?? "").trim().toLowerCase() === oldEmail) {
        if (!args.dryRun) await ctx.db.patch(row._id, { email: newEmail });
        changes.push(`centralUsers/${row._id}`);
      }
    }

    return { migrated: true, dryRun: !!args.dryRun, changes };
  },
});
