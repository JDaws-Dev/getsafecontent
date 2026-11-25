import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { identityKey, readStatus } from "./sharedScreenTime";

/**
 * Daily screen time for the hub's Family tab — one limit per child that counts
 * across SafeTunes, SafeTube and SafeStudy together. Same rows the apps' own
 * "One limit for all apps" switch reads and writes (kidDailyLimits, keyed on
 * the child's canonical identity), so setting it here or in an app is the same
 * setting. Parent-facing: authenticates the signed-in hub parent and only
 * touches that parent's own children.
 */

function dayKey(timezone: string | undefined): string {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Each of the signed-in parent's children: today's minutes and the all-apps cap (0 = none). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const parentUserId = await getAuthUserId(ctx);
    if (!parentUserId) return [];
    const parent = await ctx.db.get(parentUserId);
    const familyCode = parent?.familyCode?.trim().toUpperCase();
    if (!familyCode) return [];
    const settings = await ctx.db
      .query("familySettings")
      .withIndex("by_family", (q) => q.eq("familyCode", familyCode))
      .first();
    const day = dayKey(settings?.timezone);
    const kids = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentUserId", parentUserId))
      .collect();
    const out: { kidId: typeof kids[number]["_id"]; limitMinutes: number; usedMinutes: number }[] = [];
    for (const kid of kids) {
      if (kid.archived) continue;
      const key = await identityKey(ctx, familyCode, kid.name);
      const status = await readStatus(ctx, familyCode, key, day);
      out.push({ kidId: kid._id, limitMinutes: status.limitMinutes, usedMinutes: status.usedMinutes });
    }
    return out;
  },
});

/** Set one child's all-apps daily cap in minutes. 0 turns it off. */
export const setMine = mutation({
  args: { kidId: v.id("kids"), dailyLimitMinutes: v.number() },
  handler: async (ctx, args) => {
    const parentUserId = await getAuthUserId(ctx);
    if (!parentUserId) throw new Error("Please sign in again.");
    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentUserId !== parentUserId) throw new Error("That child isn't on your account.");
    const parent = await ctx.db.get(parentUserId);
    const familyCode = parent?.familyCode?.trim().toUpperCase();
    if (!familyCode) throw new Error("Your family code isn't set up yet.");
    const dailyLimitMinutes = Math.max(0, Math.min(Math.round(args.dailyLimitMinutes), 24 * 60));
    const kidName = await identityKey(ctx, familyCode, kid.name);
    const existing = await ctx.db
      .query("kidDailyLimits")
      .withIndex("by_family_kid", (q) => q.eq("familyCode", familyCode).eq("kidName", kidName))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { dailyLimitMinutes, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("kidDailyLimits", { familyCode, kidName, dailyLimitMinutes, updatedAt: Date.now() });
    }
    return { dailyLimitMinutes };
  },
});
