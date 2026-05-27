import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireActor } from './actors';

/**
 * SafeFamily pattern: one family code per family, all kid profiles
 * belong to the family, kids never authenticate via Clerk. Kids enter
 * the family code on the device → see profile picker → tap their tile
 * → use Lumi as that kid.
 *
 * Family code is 6 characters: 4 letters + 2 digits, easy to read,
 * no ambiguous characters (no 0/O, 1/I/L). E.g. "BRT47A".
 */

// SafeFamily-wide shared alphabet — same as SafeTunes/SafeTube/SafeReads/
// SafeStudy so a kid can use one family code across every Safe Family app.
// Skips ambiguous characters (no I, O, 0, 1).
const SAFE_FAMILY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateFamilyCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += SAFE_FAMILY_ALPHABET[Math.floor(Math.random() * SAFE_FAMILY_ALPHABET.length)];
  }
  return code;
}

/**
 * Idempotent — called on parent first sign-in. Creates the family +
 * code if the parent doesn't already have one.
 */
export const ensureForParent = mutation({
  args: { parentUserId: v.id('users') },
  handler: async (ctx, { parentUserId }) => {
    const actor = await requireActor(ctx);
    if (actor.role !== 'parent' || actor.userId !== parentUserId) {
      throw new Error('Not authorized to manage this family');
    }
    let familyId;

    const existing = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', parentUserId))
      .first();

    if (existing) {
      familyId = existing._id;
    } else {
      // Generate a code, collision-check up to 5 times
      let familyCode = generateFamilyCode();
      for (let i = 0; i < 5; i++) {
        const clash = await ctx.db
          .query('families')
          .withIndex('by_code', (q) => q.eq('familyCode', familyCode))
          .first();
        if (!clash) break;
        familyCode = generateFamilyCode();
      }

      familyId = await ctx.db.insert('families', {
        parentUserId,
        familyCode,
        createdAt: Date.now(),
      });
      // Stash on user for fast lookup
      await ctx.db.patch(parentUserId, { familyId });
    }

    // Migrate orphan kidProfiles — any owned by this parent without a
    // familyId get attached to this family. Idempotent; safe on every call.
    const orphans = await ctx.db
      .query('kidProfiles')
      .withIndex('by_parent', (q) => q.eq('parentUserId', parentUserId))
      .collect();
    for (const p of orphans) {
      if (!p.familyId) {
        await ctx.db.patch(p._id, { familyId, updatedAt: Date.now() });
      }
    }

    return familyId;
  },
});

export const getForParent = query({
  args: { parentUserId: v.id('users') },
  handler: async (ctx, { parentUserId }) => {
    const actor = await requireActor(ctx);
    if (actor.role !== 'parent' || actor.userId !== parentUserId) {
      throw new Error('Not authorized to view this family');
    }
    return await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', parentUserId))
      .first();
  },
});

/**
 * Kid-side: look up a family by code. Returns the profiles list for the
 * picker UI but NOT the parent's user record or anything sensitive.
 */
export const lookupByCode = query({
  args: { familyCode: v.string() },
  handler: async (ctx, { familyCode }) => {
    const normalized = familyCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length !== 6) return null;
    const family = await ctx.db
      .query('families')
      .withIndex('by_code', (q) => q.eq('familyCode', normalized))
      .first();
    if (!family) return null;
    const profiles = await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family._id))
      .collect();
    const newestByName = new Map<string, (typeof profiles)[number]>();
    for (const profile of [...profiles].sort((a, b) => b.createdAt - a.createdAt)) {
      const key = profile.displayName.trim().toLowerCase();
      if (!newestByName.has(key)) {
        newestByName.set(key, profile);
      }
    }
    const visibleProfiles = Array.from(newestByName.values()).sort((a, b) => a.createdAt - b.createdAt);
    return {
      familyId: family._id,
      familyName: family.familyName ?? null,
      profiles: visibleProfiles.map((p) => ({
        _id: p._id,
        displayName: p.displayName,
        sex: p.sex,
        avatarColor: p.avatarColor ?? 'violet',
        hasPin: Boolean(p.pin),
      })),
    };
  },
});
