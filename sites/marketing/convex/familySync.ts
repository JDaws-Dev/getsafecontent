import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { hashPin } from "./pinHash";

/**
 * The bundle every app pulls to apply universal settings locally:
 * family-wide settings plus every active child with their PIN hash and
 * per-child switches. Served by GET /family/sync (admin-key gated).
 */
export const bundleByFamilyCode = internalQuery({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const familyCode = args.familyCode.trim().toUpperCase();
    const parent = await ctx.db.query("users").withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode)).first();
    if (!parent) return null;
    const settings = await ctx.db.query("familySettings").withIndex("by_family", (q) => q.eq("familyCode", familyCode)).first();
    const kids = await ctx.db.query("kids").withIndex("by_parent", (q) => q.eq("parentUserId", parent._id)).collect();
    return {
      familyCode,
      timezone: settings?.timezone ?? parent.timezone ?? null,
      alertEmails: settings?.alertEmails ?? (parent.email ? [parent.email] : []),
      kids: kids
        .filter((k) => !k.archived)
        .map((k) => ({
          name: k.name,
          age: k.age ?? null,
          color: k.color ?? null,
          pinHash: k.pinHash ?? null,
          paused: k.paused ?? false,
          requestsEnabled: k.requestsEnabled ?? true,
          allowedStartTime: k.allowedStartTime ?? null,
          allowedEndTime: k.allowedEndTime ?? null,
          updatedAt: k.updatedAt ?? k.createdAt,
        })),
      updatedAt: Math.max(settings?.updatedAt ?? 0, ...kids.map((k) => k.updatedAt ?? k.createdAt), 0),
    };
  },
});

/**
 * One-time hand-up from an app: when the hub has no record of a family's
 * children yet (they were created inside the apps before the hub owned them),
 * the app reports its local profiles and the hub adopts them. Never overwrites
 * a child the hub already knows — from then on the hub is the source of truth.
 */
export const bootstrapKids = internalMutation({
  args: {
    familyCode: v.string(),
    app: v.string(),
    kids: v.array(v.object({
      name: v.string(),
      age: v.optional(v.union(v.number(), v.null())),
      color: v.optional(v.union(v.string(), v.null())),
      pin: v.optional(v.union(v.string(), v.null())), // pbkdf2 hash, or legacy plaintext
      paused: v.optional(v.boolean()),
      requestsEnabled: v.optional(v.boolean()),
      allowedStartTime: v.optional(v.union(v.string(), v.null())),
      allowedEndTime: v.optional(v.union(v.string(), v.null())),
    })),
  },
  handler: async (ctx, args) => {
    const familyCode = args.familyCode.trim().toUpperCase();
    const parent = await ctx.db.query("users").withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode)).first();
    if (!parent) return { adopted: 0, reason: "unknown_family" };
    const existing = await ctx.db.query("kids").withIndex("by_parent", (q) => q.eq("parentUserId", parent._id)).collect();
    const known = new Set(existing.map((k) => k.name.trim().toLowerCase()));
    let adopted = 0;
    const now = Date.now();
    for (const kid of args.kids) {
      const name = kid.name.trim();
      if (!name || known.has(name.toLowerCase())) continue;
      let pinHash: string | undefined;
      if (kid.pin) pinHash = kid.pin.startsWith("pbkdf2$") ? kid.pin : (/^\d{4}$/.test(kid.pin) ? await hashPin(kid.pin) : undefined);
      await ctx.db.insert("kids", {
        parentUserId: parent._id,
        name,
        age: kid.age ?? undefined,
        color: kid.color ?? undefined,
        pinHash,
        paused: kid.paused ?? false,
        requestsEnabled: kid.requestsEnabled ?? true,
        allowedStartTime: kid.allowedStartTime ?? undefined,
        allowedEndTime: kid.allowedEndTime ?? undefined,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
      known.add(name.toLowerCase());
      adopted++;
    }
    console.log(`[familySync] ${args.app} handed up ${adopted} kid(s) for ${familyCode}`);
    return { adopted };
  },
});
