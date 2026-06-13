import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';
import { requireActor, verifyMarketingToken } from './actors';

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
  args: {
    parentUserId: v.id('users'),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, { parentUserId, userToken }) => {
    const actor = await requireActor(ctx, undefined, userToken);
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
      // Adopt the UNIFIED family code if the parent already has one (set by
      // Marketing provisioning / carried on the login JWT). Only generate a
      // fresh code for a brand-new family with no upstream code. This is what
      // keeps SafeSpark's code identical to the family's SafeTunes/SafeTube/
      // SafeReads/SafeStudy code instead of minting a divergent one.
      const parentRow = await ctx.db.get(parentUserId);
      let familyCode = parentRow?.familyCode || generateFamilyCode();
      if (!parentRow?.familyCode) {
        // Only collision-check generated codes — a unified code is already unique.
        for (let i = 0; i < 5; i++) {
          const clash = await ctx.db
            .query('families')
            .withIndex('by_code', (q) => q.eq('familyCode', familyCode))
            .first();
          if (!clash) break;
          familyCode = generateFamilyCode();
        }
      }

      familyId = await ctx.db.insert('families', {
        parentUserId,
        familyCode,
        createdAt: Date.now(),
      });
      // Stash on user for fast lookup + keep users.familyCode in sync.
      await ctx.db.patch(parentUserId, { familyId, familyCode });
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

/**
 * Operator-only (CLI): repair a parent's SafeSpark account to use a specific
 * UNIFIED family code. Use when a parent arrived from another Safe Family app
 * and SafeSpark minted (or would mint) a divergent code. Sets role=parent +
 * users.familyCode, then creates-or-fixes the families row to that code, and
 * attaches any orphan kid profiles. Idempotent.
 *
 *   npx convex run families:adminRepairFamilyByEmail \
 *     '{"email":"foo@bar.com","familyCode":"ERLW4U"}'
 */
export const adminRepairFamilyByEmail = internalMutation({
  args: { email: v.string(), familyCode: v.string() },
  handler: async (ctx, { email, familyCode }) => {
    const code = familyCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) throw new Error('familyCode must be 6 chars');

    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email.toLowerCase()))
      .first();
    if (!user) {
      throw new Error('No SafeSpark user for that email — run provisionUserInternal first.');
    }

    // Ensure parent role + unified code on the user row.
    const userPatch: Record<string, unknown> = {};
    if (user.role !== 'parent') userPatch.role = 'parent';
    if (user.familyCode !== code) userPatch.familyCode = code;

    // Create-or-fix the families row (the source kid login resolves against).
    let family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', user._id))
      .first();
    let familyId;
    let action;
    if (family) {
      familyId = family._id;
      if (family.familyCode !== code) {
        await ctx.db.patch(family._id, { familyCode: code });
        action = 'patched';
      } else {
        action = 'already-correct';
      }
    } else {
      familyId = await ctx.db.insert('families', {
        parentUserId: user._id,
        familyCode: code,
        createdAt: Date.now(),
      });
      action = 'created';
    }
    userPatch.familyId = familyId;
    await ctx.db.patch(user._id, userPatch);

    // Attach orphan kid profiles owned by this parent.
    let attached = 0;
    const orphans = await ctx.db
      .query('kidProfiles')
      .withIndex('by_parent', (q) => q.eq('parentUserId', user._id))
      .collect();
    for (const p of orphans) {
      if (p.familyId !== familyId) {
        await ctx.db.patch(p._id, { familyId, updatedAt: Date.now() });
        attached++;
      }
    }

    return { userId: user._id, familyId, code, family: action, role: 'parent', kidsAttached: attached };
  },
});

/**
 * Auto-adopt the unified family code on parent sign-in. Called by the parent
 * UI on load. Verifies the Marketing login JWT (which carries the
 * authoritative familyCode claim — same code across every Safe Family app),
 * then upserts the parent's SafeSpark user row + family row to that exact
 * code. No provisioning, no migration, no per-app drift: every parent gets
 * THE one family code automatically the first time they open SafeSpark.
 * Idempotent.
 */
export const syncParentFromToken = mutation({
  args: { userToken: v.string() },
  handler: async (ctx, { userToken }) => {
    const verified = await verifyMarketingToken(userToken);
    if (!verified) return null;
    const code = verified.familyCode; // already normalized + length-checked

    // Find or create the parent's SafeSpark user row.
    let user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', verified.email))
      .first();
    if (!user) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: `marketing:${verified.email}`,
        email: verified.email,
        displayName: verified.email.split('@')[0],
        role: 'parent',
        subscriptionStatus: 'active',
        subscriptionUpdatedAt: Date.now(),
        familyCode: code,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    } else {
      const patch: Record<string, unknown> = {};
      if (user.role !== 'parent') patch.role = 'parent';
      if (code && user.familyCode !== code) patch.familyCode = code;
      if (Object.keys(patch).length) await ctx.db.patch(user._id, patch);
    }
    if (!user) return null;

    // Ensure the family row carries the unified code. Create or re-point.
    let family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', user._id))
      .first();
    const targetCode = code || user.familyCode;
    if (!targetCode) {
      // No claim and no stored code — nothing to adopt yet; ensureForParent
      // will mint one. (Shouldn't happen: Marketing always ensures a code.)
      return { familyId: family?._id ?? null, familyCode: null };
    }
    let familyId;
    if (family) {
      familyId = family._id;
      if (family.familyCode !== targetCode) {
        await ctx.db.patch(family._id, { familyCode: targetCode });
      }
    } else {
      familyId = await ctx.db.insert('families', {
        parentUserId: user._id,
        familyCode: targetCode,
        createdAt: Date.now(),
      });
    }
    if (user.familyId !== familyId || user.familyCode !== targetCode) {
      await ctx.db.patch(user._id, { familyId, familyCode: targetCode });
    }

    // Attach orphan kid profiles to the family.
    const orphans = await ctx.db
      .query('kidProfiles')
      .withIndex('by_parent', (q) => q.eq('parentUserId', user._id))
      .collect();
    for (const p of orphans) {
      if (p.familyId !== familyId) {
        await ctx.db.patch(p._id, { familyId, updatedAt: Date.now() });
      }
    }

    return { familyId, familyCode: targetCode, role: 'parent' };
  },
});

export const getForParent = query({
  args: {
    parentUserId: v.id('users'),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, { parentUserId, userToken }) => {
    const actor = await requireActor(ctx, undefined, userToken);
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
