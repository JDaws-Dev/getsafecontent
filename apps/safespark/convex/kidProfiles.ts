import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireActor, requireKidProfileAccess, requireUserAccess } from './actors';
import { hashPin } from './safeAuth';

/**
 * Kid profiles — parent-owned, kid-claimed via join code.
 *
 * Flow:
 *  1. Parent signs in (auto-promoted to 'parent' by PARENT_EMAIL match,
 *     or by being the first signup with role detection).
 *  2. Parent fills setup wizard → creates a kidProfile with displayName,
 *     age, pronouns, interests, etc. A 6-digit joinCode is generated.
 *  3. Parent shares the joinCode with the kid.
 *  4. Kid signs in → enters the joinCode → users.linkedKidProfileId set,
 *     kidProfiles.claimed = true.
 *  5. All chat / curriculum / coach settings work reads from that profile.
 */

function generateJoinCode(): string {
  // 6 digits, never starting with 0 to avoid "is it letter O or zero" confusion
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const AVATAR_COLORS = ['violet', 'pink', 'emerald', 'amber', 'sky', 'rose'];

export const create = mutation({
  args: {
    parentUserId: v.id('users'),
    displayName: v.string(),
    age: v.number(),
    sex: v.union(v.literal('boy'), v.literal('girl')),
    interests: v.array(v.string()),
    avoidTopics: v.optional(v.array(v.string())),
    customNote: v.optional(v.string()),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx);
    if (actor.role !== 'parent' || actor.userId !== args.parentUserId) {
      throw new Error('Not authorized to create kid profiles for this parent');
    }
    const now = Date.now();
    // Never store a kid PIN in the clear — hash before it touches the DB.
    const pinToStore = args.pin ? await hashPin(args.pin) : undefined;

    // Resolve/auto-create the parent's family — every parent has one
    let family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', args.parentUserId))
      .first();
    if (!family) {
      // Parent shouldn't normally hit this — families.ensureForParent
      // runs first — but defensively create one here too.
      let code = generateJoinCode();
      // safer 6-digit-numeric in legacy path; families.ts has the
      // letter+digit generator for the new SafeFamily codes.
      for (let i = 0; i < 5; i++) {
        const clash = await ctx.db
          .query('families')
          .withIndex('by_code', (q) => q.eq('familyCode', code))
          .first();
        if (!clash) break;
        code = generateJoinCode();
      }
      const familyId = await ctx.db.insert('families', {
        parentUserId: args.parentUserId,
        familyCode: code,
        createdAt: now,
      });
      family = await ctx.db.get(familyId);
    }

    // Cycle avatar colors so siblings look visually distinct in the picker
    const siblings = family
      ? await ctx.db
          .query('kidProfiles')
          .withIndex('by_family', (q) => q.eq('familyId', family!._id))
          .collect()
      : [];
    const avatarColor = AVATAR_COLORS[siblings.length % AVATAR_COLORS.length];
    const duplicate = siblings.find(
      (sibling) => sibling.displayName.trim().toLowerCase() === args.displayName.trim().toLowerCase(),
    );
    if (duplicate) {
      await ctx.db.patch(duplicate._id, {
        displayName: args.displayName,
        age: args.age,
        sex: args.sex,
        interests: args.interests,
        avoidTopics: args.avoidTopics ?? [],
        customNote: args.customNote,
        pin: pinToStore,
        familyId: family?._id,
        updatedAt: now,
      });
      return { profileId: duplicate._id, familyCode: family?.familyCode ?? null };
    }

    const profileId = await ctx.db.insert('kidProfiles', {
      familyId: family?._id,
      parentUserId: args.parentUserId,
      displayName: args.displayName,
      age: args.age,
      sex: args.sex,
      interests: args.interests,
      avoidTopics: args.avoidTopics ?? [],
      customNote: args.customNote,
      pin: pinToStore,
      avatarColor,
      personalityLayers: [],
      createdAt: now,
      updatedAt: now,
    });
    return { profileId, familyCode: family?.familyCode ?? null };
  },
});

export const listByParent = query({
  args: { parentUserId: v.id('users') },
  handler: async (ctx, { parentUserId }) => {
    const actor = await requireActor(ctx);
    if (actor.role !== 'parent' || actor.userId !== parentUserId) {
      throw new Error('Not authorized to list kid profiles for this parent');
    }
    return await ctx.db
      .query('kidProfiles')
      .withIndex('by_parent', (q) => q.eq('parentUserId', parentUserId))
      .collect();
  },
});

export const getForCurrentKid = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    // Same Clerk-first then email-fallback resolution as getActor() —
    // see actors.ts for rationale.
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
    if (!user && identity.email) {
      user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) =>
          q.eq('email', (identity.email as string).toLowerCase()),
        )
        .first();
    }
    if (!user || !user.linkedKidProfileId) return null;
    return await ctx.db.get(user.linkedKidProfileId);
  },
});

export const claimByCode = mutation({
  args: { learnerUserId: v.id('users'), joinCode: v.string() },
  handler: async (ctx, { learnerUserId, joinCode }) => {
    const actor = await requireActor(ctx);
    await requireUserAccess(ctx, actor, learnerUserId);
    const profile = await ctx.db
      .query('kidProfiles')
      .withIndex('by_join_code', (q) => q.eq('joinCode', joinCode))
      .first();
    if (!profile) {
      return { ok: false, error: 'Code not found. Double-check it with your parent.' };
    }
    if (profile.claimed) {
      return { ok: false, error: 'This code was already used.' };
    }
    await ctx.db.patch(profile._id, { claimed: true, updatedAt: Date.now() });
    await ctx.db.patch(learnerUserId, { linkedKidProfileId: profile._id });
    return { ok: true, profileId: profile._id };
  },
});

/**
 * Preview-as-kid: lets the parent link themselves to a profile without
 * marking it claimed. Used for testing the kid experience from the
 * parent's own account.
 *
 * The mutation tolerates being called by a learner too (no-op safety),
 * but is mainly for parent role. Does NOT set kidProfiles.claimed since
 * the real kid still needs to claim it with their own account.
 */
export const previewAs = mutation({
  args: { userId: v.id('users'), profileId: v.id('kidProfiles') },
  handler: async (ctx, { userId, profileId }) => {
    const actor = await requireActor(ctx);
    await requireUserAccess(ctx, actor, userId);
    await requireKidProfileAccess(ctx, actor, profileId);
    await ctx.db.patch(userId, { linkedKidProfileId: profileId });
    return { ok: true };
  },
});

export const exitPreview = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const actor = await requireActor(ctx);
    await requireUserAccess(ctx, actor, userId);
    const user = await ctx.db.get(userId);
    if (!user) return;
    // Only clear if user is a parent — for learners, linkedKidProfileId
    // is their actual claim, don't accidentally undo that.
    if (user.role === 'parent') {
      await ctx.db.patch(userId, { linkedKidProfileId: undefined });
    }
  },
});

export const updatePersonality = mutation({
  args: {
    profileId: v.id('kidProfiles'),
    layer: v.optional(v.string()),           // adds this to personalityLayers if not already there
    catchphrase: v.optional(v.string()),
    opinionTolerance: v.optional(v.union(v.literal('soft'), v.literal('balanced'), v.literal('honest'))),
    memorableFact: v.optional(v.string()),   // appends to memorableFacts
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const profile = await requireKidProfileAccess(ctx, actor, args.profileId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.layer && !profile.personalityLayers.includes(args.layer)) {
      patch.personalityLayers = [...profile.personalityLayers, args.layer];
    }
    if (args.catchphrase !== undefined) patch.catchphrase = args.catchphrase;
    if (args.opinionTolerance) patch.opinionTolerance = args.opinionTolerance;
    if (args.memorableFact) {
      patch.memorableFacts = [...(profile.memorableFacts ?? []), args.memorableFact].slice(-20);
    }
    await ctx.db.patch(args.profileId, patch);
  },
});
