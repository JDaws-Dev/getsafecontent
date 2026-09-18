import type { Id } from './_generated/dataModel';
import { verifyMarketingToken as verifyHmacMarketingToken } from './safeAuth';
import type { MutationCtx, QueryCtx } from './_generated/server';

type Ctx = QueryCtx | MutationCtx;

/**
 * Verify a Marketing Central HMAC-SHA256 JWT and return the {userId, email}
 * claims. Marketing's /login signs tokens with HS256 + a shared secret;
 * SafeSpark holds the same secret in MARKETING_JWT_SECRET. Returns null on
 * any failure (bad signature, expired, wrong issuer, missing secret, etc.).
 *
 * Used by the parent-facing queries that can't rely on auth.config.ts JWKS
 * verification (Marketing's HMAC format isn't compatible). Kid sessions
 * still authenticate via sessionToken + the kidSessions table — they don't
 * need this path.
 */
export async function verifyMarketingToken(
  token: string,
): Promise<{
  userId: string;
  email: string;
  familyCode?: string;
  entitledApps: string[];
} | null> {
  // Delegate to the vendored WebCrypto verifier (safeAuth.ts). The previous
  // implementation used `await import('jose')`, but a DYNAMIC import is not
  // supported in Convex's query/mutation runtime — it throws, gets swallowed
  // by the catch, and returns null for EVERY call. That silently broke every
  // parent-facing SafeSpark query (family code, kids, activity, alerts): the
  // parent page couldn't resolve the signed-in user and wrongly offered to
  // "create a family code" instead of showing the unified one. safeAuth's
  // verifier uses crypto.subtle (no import) and is the exact path the other
  // four apps use, so this also makes SafeSpark consistent with them.
  const verified = await verifyHmacMarketingToken(
    token,
    process.env.MARKETING_JWT_SECRET,
  );
  if (!verified) return null;
  const familyCode =
    typeof verified.familyCode === 'string'
      ? verified.familyCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
      : undefined;
  return {
    userId: verified.marketingUserId,
    email: verified.email.toLowerCase(),
    familyCode: familyCode && familyCode.length === 6 ? familyCode : undefined,
    entitledApps: Array.isArray(verified.entitledApps)
      ? (verified.entitledApps.filter((a) => typeof a === 'string') as string[])
      : [],
  };
}

export type Actor = {
  userId: Id<'users'>;
  role: 'learner' | 'parent';
  familyId?: Id<'families'>;
  kidProfileId?: Id<'kidProfiles'>;
  sessionId?: Id<'kidSessions'>;
};

function kidClerkKey(kidProfileId: Id<'kidProfiles'>): string {
  return `kidProfile:${kidProfileId}`;
}

export async function getActor(
  ctx: Ctx,
  sessionToken?: string,
  userToken?: string,
): Promise<Actor | null> {
  // Path 0 — explicit Marketing JWT verified server-side. Added 2026-05-28
  // after Clerk retirement: Marketing's HS256 tokens can't be verified via
  // auth.config.ts JWKS, so we accept the token as an arg and verify with
  // the shared secret. Resolves the user row by email match.
  if (userToken) {
    const verified = await verifyMarketingToken(userToken);
    if (verified) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', verified.email))
        .first();
      if (user) {
        return {
          userId: user._id,
          role: user.role,
          familyId: user.familyId,
          kidProfileId: user.linkedKidProfileId,
        };
      }
    }
  }
  if (sessionToken) {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', sessionToken))
      .first();
    if (session) {
      const profile = await ctx.db.get(session.kidProfileId);
      if (!profile) return null;

      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', kidClerkKey(profile._id)))
        .first();
      if (!user) return null;

      return {
        userId: user._id,
        role: 'learner',
        familyId: session.familyId,
        kidProfileId: profile._id,
        sessionId: session._id,
      };
    }
  }

  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    // Path A — Clerk subject (legacy /sign-in). Subject looks like "user_xxx".
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();

    // Path B — Marketing Central JWT (federated /login). Subject is the
    // user's Convex user._id in marketing, which won't match any
    // clerkUserId here. Fall back to email — Marketing JWTs include the
    // `email` claim, and our users table has a by_email index.
    if (!user && identity.email) {
      user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) =>
          q.eq('email', (identity.email as string).toLowerCase()),
        )
        .first();
    }

    if (!user) return null;
    return {
      userId: user._id,
      role: user.role,
      familyId: user.familyId,
      kidProfileId: user.linkedKidProfileId,
    };
  }

  if (!sessionToken) return null;
  return null;
}

export async function requireActor(
  ctx: Ctx,
  sessionToken?: string,
  userToken?: string,
): Promise<Actor> {
  const actor = await getActor(ctx, sessionToken, userToken);
  if (!actor) throw new Error('Not authorized');
  return actor;
}

export async function canAccessUser(ctx: Ctx, actor: Actor, targetUserId: Id<'users'>): Promise<boolean> {
  if (actor.userId === targetUserId) return true;
  if (actor.role !== 'parent') return false;

  const target = await ctx.db.get(targetUserId);
  if (!target?.linkedKidProfileId) return false;
  const profile = await ctx.db.get(target.linkedKidProfileId);
  if (!profile) return false;
  return profile.parentUserId === actor.userId;
}

export async function requireUserAccess(
  ctx: Ctx,
  actor: Actor,
  targetUserId: Id<'users'>,
): Promise<void> {
  if (!(await canAccessUser(ctx, actor, targetUserId))) {
    throw new Error('Not authorized for this user');
  }
}

export async function requireConversationAccess(
  ctx: Ctx,
  actor: Actor,
  conversationId: Id<'conversations'>,
) {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  await requireUserAccess(ctx, actor, conversation.userId);
  return conversation;
}

export async function requireSpaceAccess(ctx: Ctx, actor: Actor, spaceId: Id<'spaces'>) {
  const space = await ctx.db.get(spaceId);
  if (!space) throw new Error('Space not found');
  await requireUserAccess(ctx, actor, space.userId);
  return space;
}

export async function requireKidProfileAccess(
  ctx: Ctx,
  actor: Actor,
  profileId: Id<'kidProfiles'>,
) {
  const profile = await ctx.db.get(profileId);
  if (!profile) throw new Error('Kid profile not found');
  const allowed =
    actor.kidProfileId === profileId ||
    (actor.role === 'parent' && profile.parentUserId === actor.userId);
  if (!allowed) throw new Error('Not authorized for this kid profile');
  return profile;
}

export async function requireMessageAccess(ctx: Ctx, actor: Actor, messageId: Id<'messages'>) {
  const message = await ctx.db.get(messageId);
  if (!message) throw new Error('Message not found');
  await requireConversationAccess(ctx, actor, message.conversationId);
  return message;
}

export async function requireProjectAccess(ctx: Ctx, actor: Actor, projectId: Id<'projects'>) {
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error('Project not found');
  await requireUserAccess(ctx, actor, project.userId);
  return project;
}
