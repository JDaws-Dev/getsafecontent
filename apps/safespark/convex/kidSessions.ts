import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

/**
 * Kid-side sessions. No Clerk auth — the session token is the only thing
 * the client passes to identify which kid is signed in on this device.
 *
 * Flow:
 *  1. Kid enters family code → families.lookupByCode returns profile list
 *  2. Kid taps their tile (and enters PIN if set) → kidSessions.start
 *     creates a row + returns the token
 *  3. Client stashes the token in localStorage
 *  4. All kid-side queries take sessionToken as an arg and resolve to
 *     (familyId, kidProfileId) via the by_token index
 *  5. Kid taps "Switch profile" → kidSessions.end deletes the row
 */

function generateToken(): string {
  // 32 bytes base64url = 43 chars. Cryptographically random.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function kidClerkKey(kidProfileId: Id<'kidProfiles'>): string {
  return `kidProfile:${kidProfileId}`;
}

function kidEmail(kidProfileId: Id<'kidProfiles'>): string {
  return `kid-${kidProfileId}@local.bella`;
}

async function ensureKidUser(
  ctx: MutationCtx,
  kidProfileId: Id<'kidProfiles'>,
  displayName: string,
): Promise<Id<'users'>> {
  const clerkUserId = kidClerkKey(kidProfileId);
  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId))
    .first();

  if (existing) {
    const patch: { displayName?: string; linkedKidProfileId?: Id<'kidProfiles'> } = {};
    if (existing.displayName !== displayName) patch.displayName = displayName;
    if (existing.linkedKidProfileId !== kidProfileId) patch.linkedKidProfileId = kidProfileId;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
    return existing._id;
  }

  return await ctx.db.insert('users', {
    clerkUserId,
    email: kidEmail(kidProfileId),
    role: 'learner',
    displayName,
    linkedKidProfileId: kidProfileId,
    createdAt: Date.now(),
  });
}

export const start = mutation({
  args: {
    familyId: v.id('families'),
    kidProfileId: v.id('kidProfiles'),
    pin: v.optional(v.string()),
    deviceLabel: v.optional(v.string()),
  },
  handler: async (ctx, { familyId, kidProfileId, pin, deviceLabel }) => {
    // Verify the profile is in this family (defensive — client could lie)
    const profile = await ctx.db.get(kidProfileId);
    if (!profile || profile.familyId !== familyId) {
      return { ok: false, error: 'Profile not in this family.' as const };
    }
    // PIN check
    if (profile.pin && profile.pin !== pin) {
      return { ok: false, error: 'Wrong PIN.' as const };
    }
    const userId = await ensureKidUser(ctx, kidProfileId, profile.displayName);
    const token = generateToken();
    await ctx.db.insert('kidSessions', {
      sessionToken: token,
      familyId,
      kidProfileId,
      deviceLabel,
      lastSeenAt: Date.now(),
      createdAt: Date.now(),
    });
    return { ok: true as const, token, kidProfileId, userId, displayName: profile.displayName };
  },
});

export const resolveActor = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    if (!sessionToken) return null;
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', sessionToken))
      .first();
    if (!session) return null;
    const profile = await ctx.db.get(session.kidProfileId);
    if (!profile) return null;
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', kidClerkKey(profile._id)))
      .first();
    return {
      sessionId: session._id,
      familyId: session.familyId,
      kidProfileId: session.kidProfileId,
      profile,
      user,
    };
  },
});

export const resolve = resolveActor;

export const ensureUserForSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    if (!sessionToken) return null;
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', sessionToken))
      .first();
    if (!session) return null;
    const profile = await ctx.db.get(session.kidProfileId);
    if (!profile) return null;
    const userId = await ensureKidUser(ctx, profile._id, profile.displayName);
    await ctx.db.patch(session._id, { lastSeenAt: Date.now() });
    return {
      userId,
      familyId: session.familyId,
      kidProfileId: profile._id,
      displayName: profile.displayName,
    };
  },
});

export const touch = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', sessionToken))
      .first();
    if (session) {
      await ctx.db.patch(session._id, { lastSeenAt: Date.now() });
    }
  },
});

export const end = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', sessionToken))
      .first();
    if (session) await ctx.db.delete(session._id);
  },
});
