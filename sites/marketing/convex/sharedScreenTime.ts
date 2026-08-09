import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Shared cross-app daily screen time.
 *
 * Every Safe Family app reports the minutes a kid spends in it here, and asks
 * here whether that kid still has time left. One limit therefore covers all
 * five apps instead of each app granting its own separate hour.
 *
 * Two rules carried over from the SafeTube time-limit work, both of which
 * matter more than they look:
 *
 *   1. USAGE IS ALWAYS RECORDED, even once the kid is over their cap. Refusing
 *      to record over-cap minutes would mean those minutes never count toward
 *      the daily total, which makes the limit EASIER to exceed rather than
 *      harder. Record everything; enforce by refusing to serve content.
 *
 *   2. Callers must FAIL OPEN if this service is unreachable. A kid being
 *      locked out of everything because central had a bad minute is far worse
 *      than a kid getting extra screen time. The apps keep their own local
 *      limit as the fallback.
 */

// Kid identity across apps is familyCode + name. Normalise both ends so
// "Bella", "bella " and "BELLA" are one child rather than three.
function norm(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Shared read used by BOTH `check` and `record`, so the two can never disagree
 * about whether a kid is over their cap.
 *
 * Deliberately a plain function, not a runQuery: Convex forbids dynamic
 * `import()` of local modules inside queries/mutations ("dynamic module import
 * unsupported"), and a plain helper avoids needing one at all.
 */
async function readStatus(
  ctx: { db: any },
  familyCode: string,
  kidName: string,
  day: string,
) {
  const limitRow = await ctx.db
    .query("kidDailyLimits")
    .withIndex("by_family_kid", (q: any) =>
      q.eq("familyCode", familyCode).eq("kidName", kidName)
    )
    .first();

  const usageRow = await ctx.db
    .query("kidUsage")
    .withIndex("by_family_kid_day", (q: any) =>
      q.eq("familyCode", familyCode).eq("kidName", kidName).eq("day", day)
    )
    .first();

  const usedMinutes = usageRow?.minutes ?? 0;
  const limitMinutes = limitRow?.dailyLimitMinutes ?? 0;

  // No limit configured (or explicitly 0) means unlimited — same convention the
  // per-app limits already use, so parents aren't surprised by a new default.
  if (!limitMinutes) {
    return {
      allowed: true,
      limitSet: false,
      usedMinutes,
      limitMinutes: 0,
      remainingMinutes: null as number | null,
      byApp: usageRow?.byApp ?? {},
    };
  }

  const remainingMinutes = Math.max(0, limitMinutes - usedMinutes);
  return {
    allowed: remainingMinutes > 0,
    limitSet: true,
    usedMinutes,
    limitMinutes,
    remainingMinutes,
    byApp: usageRow?.byApp ?? {},
  };
}

/** Read today's total and the applicable cap. Never throws for missing rows. */
export const check = internalQuery({
  args: { familyCode: v.string(), kidName: v.string(), day: v.string() },
  handler: async (ctx, args) =>
    await readStatus(ctx, args.familyCode.trim().toUpperCase(), norm(args.kidName), args.day),
});

/**
 * Add minutes for a kid on a given day and return the resulting status.
 *
 * Additive rather than absolute: each app reports what IT observed, so no app
 * can clobber another's minutes by writing a total. Same-day repeat calls
 * accumulate.
 */
export const record = internalMutation({
  args: {
    familyCode: v.string(),
    kidName: v.string(),
    day: v.string(),
    minutes: v.number(),
    app: v.string(),
  },
  handler: async (ctx, args) => {
    const kidName = norm(args.kidName);
    const familyCode = args.familyCode.trim().toUpperCase();
    // Guard against a bad client sending negative or absurd values — a single
    // report should never be more than a day.
    const minutes = Math.max(0, Math.min(args.minutes, 24 * 60));

    const existing = await ctx.db
      .query("kidUsage")
      .withIndex("by_family_kid_day", (q) =>
        q.eq("familyCode", familyCode).eq("kidName", kidName).eq("day", args.day)
      )
      .first();

    if (existing) {
      const byApp = { ...(existing.byApp ?? {}) };
      byApp[args.app] = (byApp[args.app] ?? 0) + minutes;
      await ctx.db.patch(existing._id, {
        minutes: existing.minutes + minutes,
        byApp,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("kidUsage", {
        familyCode,
        kidName,
        day: args.day,
        minutes,
        byApp: { [args.app]: minutes },
        updatedAt: Date.now(),
      });
    }

    // Same read path as `check`, so record and check can never disagree.
    return await readStatus(ctx, familyCode, kidName, args.day);
  },
});

/** Parent sets the combined cap. 0 clears it (unlimited). */
export const setLimit = internalMutation({
  args: {
    familyCode: v.string(),
    kidName: v.string(),
    dailyLimitMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const kidName = norm(args.kidName);
    const familyCode = args.familyCode.trim().toUpperCase();
    const dailyLimitMinutes = Math.max(0, Math.min(args.dailyLimitMinutes, 24 * 60));

    const existing = await ctx.db
      .query("kidDailyLimits")
      .withIndex("by_family_kid", (q) =>
        q.eq("familyCode", familyCode).eq("kidName", kidName)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { dailyLimitMinutes, updatedAt: Date.now() });
      return { updated: true, dailyLimitMinutes };
    }
    await ctx.db.insert("kidDailyLimits", {
      familyCode,
      kidName,
      dailyLimitMinutes,
      updatedAt: Date.now(),
    });
    return { created: true, dailyLimitMinutes };
  },
});

/** Every kid in a family with their cap and today's usage — parent dashboard. */
export const familyOverview = internalQuery({
  args: { familyCode: v.string(), day: v.string() },
  handler: async (ctx, args) => {
    const familyCode = args.familyCode.trim().toUpperCase();

    const limits = await ctx.db
      .query("kidDailyLimits")
      .withIndex("by_family_kid", (q) => q.eq("familyCode", familyCode))
      .collect();
    const usage = await ctx.db
      .query("kidUsage")
      .withIndex("by_family_kid_day", (q) => q.eq("familyCode", familyCode))
      .filter((q) => q.eq(q.field("day"), args.day))
      .collect();

    const byKid: Record<string, {
      kidName: string;
      limitMinutes: number;
      usedMinutes: number;
      remainingMinutes: number | null;
      byApp: Record<string, number>;
    }> = {};

    for (const l of limits) {
      byKid[l.kidName] = {
        kidName: l.kidName,
        limitMinutes: l.dailyLimitMinutes,
        usedMinutes: 0,
        remainingMinutes: l.dailyLimitMinutes ? l.dailyLimitMinutes : null,
        byApp: {},
      };
    }
    for (const u of usage) {
      const row = byKid[u.kidName] ?? {
        kidName: u.kidName,
        limitMinutes: 0,
        usedMinutes: 0,
        remainingMinutes: null,
        byApp: {},
      };
      row.usedMinutes = u.minutes;
      row.byApp = u.byApp ?? {};
      row.remainingMinutes = row.limitMinutes
        ? Math.max(0, row.limitMinutes - u.minutes)
        : null;
      byKid[u.kidName] = row;
    }

    return Object.values(byKid).sort((a, b) => a.kidName.localeCompare(b.kidName));
  },
});
