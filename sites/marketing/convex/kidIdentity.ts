import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Canonical cross-app identity for a child.
 *
 * The apps each keep their own kid records with their own ids and whatever the
 * parent typed as a name. Cross-app features (shared screen time, the kid pass)
 * need to know that SafeTube's "Isabella" and SafeReads' "Bella" are one child.
 * Matching on the typed name did that badly — it silently split a real customer's
 * daughter in two while her sister worked fine, which is the worst kind of bug:
 * it looks like it's working.
 *
 * So: one identity row per real child, and every name that child is known by
 * lives in `matchKeys`. Apps resolve once, store the id, and stop caring about
 * names.
 */

function norm(name: string): string {
  return (name || "").trim().toLowerCase();
}

function normFamily(code: string): string {
  return (code || "").trim().toUpperCase();
}

/**
 * Find the identity for a child, creating one if this name is genuinely new.
 *
 * Idempotent — calling it repeatedly for the same child returns the same id,
 * which is what lets every app call it on a timer without coordination.
 */
export const resolve = internalMutation({
  args: {
    familyCode: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const familyCode = normFamily(args.familyCode);
    const key = norm(args.name);
    if (!familyCode || !key) {
      // Without both we cannot safely say who this is; caller falls back to
      // its own local behaviour rather than guessing.
      return null;
    }

    const family = await ctx.db
      .query("kidIdentity")
      .withIndex("by_family", (q) => q.eq("familyCode", familyCode))
      .collect();

    const hit = family.find((row) => row.matchKeys.includes(key));
    if (hit) {
      return { identityId: hit._id, canonicalName: hit.canonicalName, created: false };
    }

    const id = await ctx.db.insert("kidIdentity", {
      familyCode,
      canonicalName: args.name.trim(),
      matchKeys: [key],
      createdAt: Date.now(),
    });
    return { identityId: id, canonicalName: args.name.trim(), created: true };
  },
});

/**
 * Teach an existing identity another name it answers to.
 *
 * This is how "Isabella" gets folded into "Bella" without touching either app's
 * data — the alias is recorded once, centrally, and every app resolves to the
 * same child from then on.
 */
export const addAlias = internalMutation({
  args: {
    identityId: v.id("kidIdentity"),
    alias: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.identityId);
    if (!row) throw new Error("No such child identity");
    const key = norm(args.alias);
    if (!key) throw new Error("Alias cannot be empty");

    // Refuse if this alias already belongs to a DIFFERENT child in the same
    // family — silently stealing a sibling's name would merge two children's
    // screen time, which is far worse than refusing.
    const family = await ctx.db
      .query("kidIdentity")
      .withIndex("by_family", (q) => q.eq("familyCode", row.familyCode))
      .collect();
    const clash = family.find((r) => r._id !== row._id && r.matchKeys.includes(key));
    if (clash) {
      throw new Error(
        `"${args.alias}" already identifies ${clash.canonicalName} in family ${row.familyCode}`
      );
    }

    if (row.matchKeys.includes(key)) return { added: false, matchKeys: row.matchKeys };
    const matchKeys = [...row.matchKeys, key];
    await ctx.db.patch(args.identityId, { matchKeys, updatedAt: Date.now() });
    return { added: true, matchKeys };
  },
});

/** Merge two identities that turned out to be the same child. */
export const merge = internalMutation({
  args: {
    keepId: v.id("kidIdentity"),
    mergeId: v.id("kidIdentity"),
  },
  handler: async (ctx, args) => {
    if (args.keepId === args.mergeId) throw new Error("Cannot merge a child into itself");
    const keep = await ctx.db.get(args.keepId);
    const drop = await ctx.db.get(args.mergeId);
    if (!keep || !drop) throw new Error("Both identities must exist");
    if (keep.familyCode !== drop.familyCode) {
      throw new Error("Refusing to merge children from different families");
    }

    const matchKeys = Array.from(new Set([...keep.matchKeys, ...drop.matchKeys]));
    await ctx.db.patch(args.keepId, { matchKeys, updatedAt: Date.now() });
    await ctx.db.delete(args.mergeId);
    return { matchKeys, canonicalName: keep.canonicalName };
  },
});

/** Everything known about a family's children — for auditing and backfills. */
export const listFamily = internalQuery({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kidIdentity")
      .withIndex("by_family", (q) => q.eq("familyCode", normFamily(args.familyCode)))
      .collect();
  },
});

/** Whole table — small by nature (one row per child), used by the audit script. */
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("kidIdentity").collect(),
});
