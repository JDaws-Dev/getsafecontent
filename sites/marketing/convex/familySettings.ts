import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

/** Family-wide settings (timezone, alert recipients) — one record per family code. */

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.familyCode) return null;
    const row = await ctx.db.query("familySettings").withIndex("by_family", (q) => q.eq("familyCode", user.familyCode!)).first();
    return {
      familyCode: user.familyCode,
      timezone: row?.timezone ?? user.timezone ?? null,
      alertEmails: row?.alertEmails ?? [user.email].filter(Boolean),
    };
  },
});

export const updateMine = mutation({
  args: {
    timezone: v.optional(v.string()),
    alertEmails: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in again.");
    const user = await ctx.db.get(userId);
    if (!user?.familyCode) throw new Error("Your account has no family code yet.");
    if (args.timezone !== undefined && !/^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(args.timezone)) throw new Error("That timezone doesn't look right.");
    const emails = args.alertEmails?.map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    const existing = await ctx.db.query("familySettings").withIndex("by_family", (q) => q.eq("familyCode", user.familyCode!)).first();
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.timezone !== undefined) patch.timezone = args.timezone;
    if (emails !== undefined) patch.alertEmails = emails;
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("familySettings", { familyCode: user.familyCode, timezone: args.timezone, alertEmails: emails, updatedAt: Date.now() });
    if (args.timezone && user.timezone !== args.timezone) await ctx.db.patch(userId, { timezone: args.timezone });
  },
});
