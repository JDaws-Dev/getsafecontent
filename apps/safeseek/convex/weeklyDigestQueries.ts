import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

/**
 * Internal: list parents eligible for the weekly digest.
 * - Has an email
 * - Not opted out
 * - Subscription active/trial/lifetime (not expired/cancelled)
 */
export const listEligibleParents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("users").collect();
    return all.filter((u) => {
      if (!u.email) return false;
      if (u.weeklyDigestOptOut) return false;
      if (u.subscriptionStatus === "cancelled" || u.subscriptionStatus === "expired") return false;
      return true;
    });
  },
});

/**
 * Internal: build the per-parent summary for the past 7 days.
 * Aggregates search history, blocked searches, and concern alerts.
 *
 * Heaviest-day computation is "by calendar day in UTC." Good enough for
 * the digest. If we want family-timezone correctness we can revisit later.
 */
export const summarizeForParent = internalQuery({
  args: { userId: v.id("users"), since: v.number() },
  handler: async (ctx, args) => {
    const kids = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let totalSearches = 0;
    let totalBlocked = 0;
    let totalConcerning = 0;
    const perKid = [] as any[];

    for (const kid of kids) {
      const history = await ctx.db
        .query("searchHistory")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", kid._id))
        .filter((q) => q.gte(q.field("searchedAt"), args.since))
        .collect();

      const blocked = await ctx.db
        .query("blockedSearches")
        .withIndex("by_kid_recent", (q) => q.eq("kidProfileId", kid._id))
        .filter((q) => q.gte(q.field("searchedAt"), args.since))
        .collect();

      // Concerning = either intent flagged ED/self-harm, OR blocked with that reason
      const concerning = blocked.filter(
        (b) =>
          b.intentCategory === "eating_disorder_adjacent" ||
          b.intentCategory === "self_harm_adjacent" ||
          b.blockedReason === "eating_disorder_signal" ||
          b.blockedReason === "self_harm_signal"
      ).length;

      // Top categories across history + blocked
      const counts: Record<string, number> = {};
      for (const r of [...history, ...blocked]) {
        const cat = r.intentCategory || "other";
        counts[cat] = (counts[cat] || 0) + 1;
      }
      const topCategories = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Heaviest day (UTC bucket)
      const dayCounts: Record<string, number> = {};
      for (const r of history) {
        const d = new Date(r.searchedAt);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      }
      const heaviestEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
      const heaviestDay = heaviestEntry ? { date: heaviestEntry[0], count: heaviestEntry[1] } : null;

      // Budget-hit days: count of distinct days where the kid has a
      // "limit_reached" entry in blockedSearches. We don't track a separate
      // limit-hit log, so this is a proxy.
      const budgetHitDays = new Set<string>();
      for (const b of blocked) {
        if (b.blockedReason === "limit_reached") {
          const d = new Date(b.searchedAt);
          const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
          budgetHitDays.add(key);
        }
      }

      totalSearches += history.length;
      totalBlocked += blocked.length;
      totalConcerning += concerning;

      perKid.push({
        kidName: kid.name,
        totalSearches: history.length,
        totalBlocked: blocked.length,
        topCategories,
        concerningCount: concerning,
        budgetHits: budgetHitDays.size,
        heaviestDay,
      });
    }

    return { totalSearches, totalBlocked, totalConcerning, perKid };
  },
});

/**
 * Internal: stamp the user's lastDigestSentAt after a successful send.
 */
export const markSent = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { lastDigestSentAt: Date.now() });
  },
});
