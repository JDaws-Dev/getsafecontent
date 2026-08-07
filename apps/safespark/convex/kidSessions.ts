import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { hashPin, verifyPin, isHashedPin, KID_SESSION_TTL_MS } from './safeAuth';

// Kid PIN brute-force lockout: 5 wrong tries → 5-minute cooldown.
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000;

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

/**
 * Provision the kid user + create a kidSessions row and return the same
 * success payload `start` hands back. This is the ONE canonical "the kid is
 * now signed in on this device" path — factored out so the cross-app kid
 * pass (kidPass.redeemKidPass) establishes an identical session WITHOUT
 * re-checking the PIN. Callers that need a PIN gate (kidSessions.start) run
 * that check first, then call this on success.
 */
export async function establishKidSession(
  ctx: MutationCtx,
  familyId: Id<'families'>,
  profile: Doc<'kidProfiles'>,
  deviceLabel?: string,
) {
  const now = Date.now();
  const userId = await ensureKidUser(ctx, profile._id, profile.displayName);
  const token = generateToken();
  await ctx.db.insert('kidSessions', {
    sessionToken: token,
    familyId,
    kidProfileId: profile._id,
    deviceLabel,
    lastSeenAt: now,
    createdAt: now,
    expiresAt: now + KID_SESSION_TTL_MS,
  });
  return {
    ok: true as const,
    token,
    kidProfileId: profile._id,
    userId,
    displayName: profile.displayName,
  };
}

export const start = mutation({
  args: {
    familyId: v.id('families'),
    kidProfileId: v.id('kidProfiles'),
    pin: v.optional(v.string()),
    deviceLabel: v.optional(v.string()),
  },
  handler: async (ctx, { familyId, kidProfileId, pin, deviceLabel }) => {
    const now = Date.now();
    // Verify the profile is in this family (defensive — client could lie)
    const profile = await ctx.db.get(kidProfileId);
    if (!profile || profile.familyId !== familyId) {
      return { ok: false as const, error: 'Profile not in this family.' as const };
    }
    // PIN check — hashed at rest, with brute-force lockout. Legacy plaintext
    // PINs are verified directly then lazy-upgraded to a hash on success.
    if (profile.pin) {
      if (profile.pinLockedUntil && profile.pinLockedUntil > now) {
        return { ok: false as const, error: 'Too many tries. Ask a grown-up to wait a few minutes.' as const };
      }
      const supplied = pin ?? '';
      const matches = isHashedPin(profile.pin)
        ? await verifyPin(supplied, profile.pin)
        : profile.pin === supplied;
      if (!matches) {
        const attempts = (profile.failedPinAttempts ?? 0) + 1;
        await ctx.db.patch(profile._id, {
          failedPinAttempts: attempts,
          ...(attempts >= MAX_PIN_ATTEMPTS ? { pinLockedUntil: now + PIN_LOCKOUT_MS } : {}),
        });
        return { ok: false as const, error: 'Wrong PIN.' as const };
      }
      // Success — clear the lockout counter; upgrade a legacy plaintext PIN.
      await ctx.db.patch(profile._id, {
        failedPinAttempts: 0,
        pinLockedUntil: undefined,
        ...(isHashedPin(profile.pin) ? {} : { pin: await hashPin(supplied) }),
      });
    }
    return await establishKidSession(ctx, familyId, profile, deviceLabel);
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
    if (session.expiresAt && session.expiresAt < Date.now()) return null;
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
    if (session.expiresAt && session.expiresAt < Date.now()) return null;
    const profile = await ctx.db.get(session.kidProfileId);
    if (!profile) return null;
    const userId = await ensureKidUser(ctx, profile._id, profile.displayName);
    await ctx.db.patch(session._id, {
      lastSeenAt: Date.now(),
      expiresAt: Date.now() + KID_SESSION_TTL_MS,
    });
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
      // Roll the session TTL forward on activity so active kids stay signed in.
      await ctx.db.patch(session._id, {
        lastSeenAt: Date.now(),
        expiresAt: Date.now() + KID_SESSION_TTL_MS,
      });
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
