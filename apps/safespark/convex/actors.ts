import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type Ctx = QueryCtx | MutationCtx;

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

export async function getActor(ctx: Ctx, sessionToken?: string): Promise<Actor | null> {
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
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
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

export async function requireActor(ctx: Ctx, sessionToken?: string): Promise<Actor> {
  const actor = await getActor(ctx, sessionToken);
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
