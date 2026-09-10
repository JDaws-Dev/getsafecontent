import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { hashPin } from "./pinHash";
import { Id } from "./_generated/dataModel";

/**
 * Unified kid profiles — the ONE place a family's children are defined.
 *
 * Every app mirrors these locally (name, age, colour, PIN, pause, requests,
 * allowed hours) through /family/sync, so a parent sets a thing once on the
 * hub and it applies in SafeTunes, SafeTube, SafeReads, SafeStudy and
 * SafeSpark. Parent-facing functions authenticate the signed-in hub parent
 * and never trust a client-supplied parent id.
 */

async function requireParent(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Please sign in again.");
  return userId;
}

async function requireOwnedKid(ctx: MutationCtx, kidId: Id<"kids">) {
  const parentUserId = await requireParent(ctx);
  const kid = await ctx.db.get(kidId);
  if (!kid || kid.parentUserId !== parentUserId) throw new Error("That child isn't on your account.");
  return { parentUserId, kid };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The signed-in parent's active kids, oldest first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const parentUserId = await getAuthUserId(ctx);
    if (!parentUserId) return [];
    const rows = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentUserId", parentUserId))
      .collect();
    return rows
      .filter((k) => !k.archived)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .map(({ pinHash, ...k }) => ({ ...k, hasPin: !!pinHash }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    age: v.optional(v.number()),
    color: v.optional(v.string()),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parentUserId = await requireParent(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Give your child a name.");
    if (args.pin !== undefined && args.pin !== "" && !/^\d{4}$/.test(args.pin)) throw new Error("A PIN is 4 digits.");
    const siblings = await ctx.db.query("kids").withIndex("by_parent", (q) => q.eq("parentUserId", parentUserId)).collect();
    if (siblings.some((k) => !k.archived && k.name.trim().toLowerCase() === name.toLowerCase())) {
      throw new Error(`You already have a child named ${name}.`);
    }
    const now = Date.now();
    const id = await ctx.db.insert("kids", {
      parentUserId,
      name,
      age: args.age,
      color: args.color,
      pinHash: args.pin ? await hashPin(args.pin) : undefined,
      archived: false,
      paused: false,
      requestsEnabled: true,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    kidId: v.id("kids"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    color: v.optional(v.string()),
    paused: v.optional(v.boolean()),
    requestsEnabled: v.optional(v.boolean()),
    allowedStartTime: v.optional(v.union(v.string(), v.null())),
    allowedEndTime: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { kid } = await requireOwnedKid(ctx, args.kidId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Give your child a name.");
      patch.name = name;
    }
    if (args.age !== undefined) patch.age = args.age;
    if (args.color !== undefined) patch.color = args.color;
    if (args.paused !== undefined) patch.paused = args.paused;
    if (args.requestsEnabled !== undefined) patch.requestsEnabled = args.requestsEnabled;
    for (const key of ["allowedStartTime", "allowedEndTime"] as const) {
      const val = args[key];
      if (val === undefined) continue;
      if (val !== null && !TIME_RE.test(val)) throw new Error("Times look like 08:00 or 21:30.");
      patch[key] = val ?? undefined;
    }
    await ctx.db.patch(kid._id, patch);
  },
});

/** Set (4 digits) or clear (empty) a child's PIN. Hashed here; apps verify the same hash. */
export const setPin = mutation({
  args: { kidId: v.id("kids"), pin: v.string() },
  handler: async (ctx, args) => {
    const { kid } = await requireOwnedKid(ctx, args.kidId);
    if (args.pin !== "" && !/^\d{4}$/.test(args.pin)) throw new Error("A PIN is 4 digits.");
    await ctx.db.patch(kid._id, { pinHash: args.pin ? await hashPin(args.pin) : undefined, updatedAt: Date.now() });
  },
});

export const archive = mutation({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    const { kid } = await requireOwnedKid(ctx, args.kidId);
    await ctx.db.patch(kid._id, { archived: true, updatedAt: Date.now() });
  },
});

// ── Internal variants for server-to-server flows ──────────────────────────
export const listByParentInternal = internalQuery({
  args: { parentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentUserId", args.parentUserId))
      .collect();
    return rows.filter((k) => !k.archived);
  },
});

export const upsertByNameInternal = internalMutation({
  args: {
    parentUserId: v.id("users"),
    name: v.string(),
    age: v.optional(v.number()),
    color: v.optional(v.string()),
    avatarIcon: v.optional(v.string()),
    pinHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentUserId", args.parentUserId))
      .collect();
    const match = existing.find(
      (k) => !k.archived && k.name.trim().toLowerCase() === args.name.trim().toLowerCase()
    );
    const now = Date.now();
    if (match) {
      await ctx.db.patch(match._id, {
        age: args.age ?? match.age,
        color: args.color ?? match.color,
        avatarIcon: args.avatarIcon ?? match.avatarIcon,
        pinHash: args.pinHash ?? match.pinHash,
        updatedAt: now,
      });
      return { id: match._id, created: false };
    }
    const id = await ctx.db.insert("kids", {
      parentUserId: args.parentUserId,
      name: args.name.trim(),
      age: args.age,
      color: args.color,
      avatarIcon: args.avatarIcon,
      pinHash: args.pinHash,
      archived: false,
      paused: false,
      requestsEnabled: true,
      createdAt: now,
      updatedAt: now,
    });
    return { id, created: true };
  },
});

/** Operator repair: set universal fields on a child by family code + name (or alias). */
export const adminSetByNameInternal = internalMutation({
  args: {
    familyCode: v.string(),
    name: v.string(),
    age: v.optional(v.number()),
    color: v.optional(v.string()),
    paused: v.optional(v.boolean()),
    requestsEnabled: v.optional(v.boolean()),
    allowedStartTime: v.optional(v.string()),
    allowedEndTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const familyCode = args.familyCode.trim().toUpperCase();
    const parent = await ctx.db.query("users").withIndex("by_familyCode", (q) => q.eq("familyCode", familyCode)).first();
    if (!parent) throw new Error("unknown family code");
    const ids = await ctx.db.query("kidIdentity").withIndex("by_family", (q) => q.eq("familyCode", familyCode)).collect();
    const key = args.name.trim().toLowerCase();
    const hit = ids.find((r) => r.matchKeys.includes(key) || r.canonicalName.trim().toLowerCase() === key);
    const target = (hit?.canonicalName ?? args.name).trim().toLowerCase();
    const kids = await ctx.db.query("kids").withIndex("by_parent", (q) => q.eq("parentUserId", parent._id)).collect();
    const kid = kids.find((k) => !k.archived && k.name.trim().toLowerCase() === target);
    if (!kid) throw new Error(`no hub kid named ${args.name}`);
    const { familyCode: _f, name: _n, ...patch } = args;
    await ctx.db.patch(kid._id, { ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)), updatedAt: Date.now() });
    return { kid: kid.name, patched: Object.keys(patch).filter((k) => (patch as any)[k] !== undefined) };
  },
});
