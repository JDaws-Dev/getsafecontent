import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Set the extra recipients for a parent account's concern alerts.
 *
 * Concern alerts (eating-disorder / self-harm) had been going to exactly one
 * inbox — whichever parent happened to own this app's login. Five fired on one
 * account between May and August 2026 and none was ever acknowledged. A second
 * parent on the thread is the cheapest fix available.
 *
 * internalMutation: this decides who gets told a child is in trouble, so it is
 * not something a deployment URL should be able to rewrite.
 */
export const setAlertEmails = internalMutation({
  args: {
    email: v.string(),
    alertEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error(`no user with ${email}`);

    const clean = Array.from(
      new Set(
        args.alertEmails
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes("@") && e !== email)
      )
    );
    await ctx.db.patch(user._id, { alertEmails: clean });
    return { userId: user._id, email, alertEmails: clean };
  },
});
