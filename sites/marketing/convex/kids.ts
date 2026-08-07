import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

/**
 * Unified kid profiles (source of truth for all 4 apps).
 *
 * Apps currently each store their own kid records. This module is the foundation
 * for syncing kid metadata centrally — matches the pattern already used for auth
 * (`users.passwordHash` etc.) and familyCode. Each app's provisioning flow will
 * eventually read from here and mirror locally so a family's kids exist once.
 */

// List all active kids for a parent user. Archived kids excluded by default.
export const listByParent = query({
  args: {
    parentUserId: v.id("users"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentUserId", args.parentUserId))
      .collect();
    const includeArchived = args.includeArchived ?? false;
    return rows
      .filter((k) => includeArchived || !k.archived)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  },
});

export const getById = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.kidId);
  },
});

export const create = mutation({
  args: {
    parentUserId: v.id("users"),
    name: v.string(),
    age: v.optional(v.number()),
    color: v.optional(v.string()),
    avatarIcon: v.optional(v.string()),
    pinHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("kids", {
      parentUserId: args.parentUserId,
      name: args.name.trim(),
      age: args.age,
      color: args.color,
      avatarIcon: args.avatarIcon,
      pinHash: args.pinHash,
      archived: false,
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
    avatarIcon: v.optional(v.string()),
    pinHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { kidId, ...rest } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(kidId, patch);
  },
});

export const archive = mutation({
  args: { kidId: v.id("kids") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.kidId, { archived: true, updatedAt: Date.now() });
  },
});

// Internal variants for server-to-server provisioning flows.
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
      createdAt: now,
      updatedAt: now,
    });
    return { id, created: true };
  },
});
