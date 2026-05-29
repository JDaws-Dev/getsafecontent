import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getActor } from './actors';

export const upsertFromClerk = mutation({
  args: {
    // displayName is the only client-supplied value we still accept.
    // clerkUserId + email are derived server-side from ctx.auth so a
    // hostile client can't submit `email: jedaws@gmail.com` and
    // auto-promote to parent. (Codex flagged this 2026-05-24.)
    displayName: v.string(),
  },
  handler: async (ctx, { displayName }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('upsertFromClerk requires an authenticated Clerk session');
    }
    const clerkUserId = identity.subject;
    const email = (identity.email ?? '').toLowerCase();
    if (!email) {
      throw new Error('Clerk identity has no email — refusing to upsert');
    }

    // SafeSpark: every Clerk signup is the parent of their own family.
    // The legacy PARENT_EMAIL gate (BELLA-era, one operator + learner kids)
    // is no longer authoritative — kids in SafeSpark log in via family code,
    // not Clerk, so anyone with a Clerk session is by definition a parent.
    const expectedRole: 'parent' | 'learner' = 'parent';

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId))
      .first();

    if (existing) {
      const patch: Record<string, unknown> = {};
      if (existing.email !== email) patch.email = email;
      if (existing.displayName !== displayName) patch.displayName = displayName;
      // Promote any legacy 'learner' Clerk users to 'parent' on next sign-in.
      if (existing.role === 'learner') patch.role = 'parent';
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    return await ctx.db.insert('users', {
      clerkUserId,
      email,
      displayName,
      role: expectedRole,
      createdAt: Date.now(),
    });
  },
});

/**
 * Diagnostic — returns the current user's status info so the UI can
 * tell the parent why the dashboard isn't showing. Used when a user
 * with PARENT_EMAIL is somehow not on the parent role.
 */
export const debugMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { signedIn: false, parentEmail: process.env.PARENT_EMAIL ?? null };
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
    return {
      signedIn: true,
      clerkSubject: identity.subject,
      clerkEmail: identity.email ?? null,
      hasUserRow: Boolean(user),
      role: user?.role ?? null,
      configuredParentEmail: process.env.PARENT_EMAIL ?? null,
      emailMatches:
        identity.email && process.env.PARENT_EMAIL
          ? identity.email.toLowerCase() === process.env.PARENT_EMAIL.toLowerCase()
          : null,
    };
  },
});

export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== clerkUserId) return null;
    return await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId))
      .first();
  },
});

export const getCurrent = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Path A — explicit Marketing JWT passed by the client and verified
    // server-side with the shared HMAC secret. This is the working parent
    // path post-Clerk-retirement (the auth.config.ts JWKS provider can't
    // verify Marketing's HS256-signed tokens, so ctx.auth.getUserIdentity()
    // returns null for them).
    if (args.userToken) {
      const { verifyMarketingToken } = await import('./actors');
      const verified = await verifyMarketingToken(args.userToken);
      if (verified) {
        const row = await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', verified.email))
          .first();
        if (row) return row;
      }
    }

    // Path B — Convex auth (kept for any provider in auth.config.ts that
    // CAN be verified via JWKS; in practice this no longer fires after
    // Clerk retirement, but a future RSA migration would re-enable it).
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const byClerk = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
    if (byClerk) return byClerk;
    if (identity.email) {
      return await ctx.db
        .query('users')
        .withIndex('by_email', (q) =>
          q.eq('email', (identity.email as string).toLowerCase()),
        )
        .first();
    }
    return null;
  },
});

export const listLearners = query({
  args: {},
  handler: async (ctx) => {
    const actor = await getActor(ctx);
    if (!actor || actor.role !== 'parent') return [];
    const learners = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'learner'))
      .collect();
    const visible = [];
    for (const learner of learners) {
      if (!learner.linkedKidProfileId) continue;
      const profile = await ctx.db.get(learner.linkedKidProfileId);
      if (profile?.parentUserId === actor.userId) {
        visible.push(learner);
      }
    }
    return visible;
  },
});
