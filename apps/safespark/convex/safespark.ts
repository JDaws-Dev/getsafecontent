import { mutation, query, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';

const MESSAGE_VALIDATOR = v.object({
  role: v.union(v.literal('user'), v.literal('assistant')),
  content: v.string(),
});

export type SafeSparkCtx = {
  auth: { getUserIdentity: () => Promise<unknown> };
  db: {
    query: (table: string) => {
      withIndex: (
        name: string,
        cb: (q: { eq: (field: string, value: string) => unknown }) => unknown,
      ) => { first: () => Promise<unknown> };
    };
    get: (id: unknown) => Promise<unknown>;
  };
};

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = (await ctx.auth.getUserIdentity()) as
    | { subject: string; email?: string }
    | null;
  if (!identity) throw new Error('Sign in to save projects.');
  if (!identity.subject) throw new Error('Missing identity subject.');
  return { clerkUserId: identity.subject, email: identity.email ?? '' };
}

// SafeSpark identity = either a Clerk parent OR a family-code kid session.
// Kid sessions get a synthetic clerkUserId of `kid:<kidProfileId>` so the
// existing projects schema (keyed on clerkUserId string) works for both.
async function resolveSafeSparkIdentity(
  ctx: SafeSparkCtx,
  sessionToken?: string,
): Promise<{ clerkUserId: string; email: string; kidProfileId?: Id<'kidProfiles'> }> {
  if (sessionToken) {
    const session = (await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', sessionToken))
      .first()) as { kidProfileId: Id<'kidProfiles'> } | null;
    if (session) {
      const profile = (await ctx.db.get(session.kidProfileId)) as
        | { _id: Id<'kidProfiles'>; displayName: string }
        | null;
      if (profile) {
        return {
          clerkUserId: `kid:${profile._id}`,
          email: profile.displayName,
          kidProfileId: profile._id,
        };
      }
    }
  }
  const identity = (await ctx.auth.getUserIdentity()) as
    | { subject: string; email?: string }
    | null;
  if (identity?.subject) {
    return { clerkUserId: identity.subject, email: identity.email ?? '' };
  }
  throw new Error('Sign in or enter a family code to save projects.');
}

// Resolve the SafeSpark `users` row from the current Convex auth identity,
// trying clerkUserId match first (legacy Clerk subjects) then email match
// (Marketing Central JWTs whose subject is a marketing user._id that won't
// match any clerkUserId). Returns null if neither matches — call sites
// should treat that as "no data to show."
//
// Mirrors the dual-path logic in `getActor()` / `resolveSafeSparkIdentity`
// but returns the full row (not just clerkUserId) and never throws. Added
// 2026-05-28 after Clerk retirement: Jace logged in via Marketing JWT and
// /parent showed "0 profiles" because listFamilyForParent (and several
// sibling queries) only did the clerkUserId lookup. His data was intact;
// these queries just couldn't reach his user row from a Marketing JWT.
// Verify a Marketing Central HMAC-SHA256 JWT (issuer "getsafefamily.com")
// using the shared signing secret. Marketing's /login signs tokens with
// HS256 + JWT_SECRET (falling back to ADMIN_KEY); we mirror that secret
// to SafeSpark Convex as MARKETING_JWT_SECRET. Returns the decoded
// {sub, email} claims or null on any failure (bad signature, expired,
// wrong issuer, missing secret, malformed token).
//
// Why this exists: SafeSpark's convex/auth.config.ts only supports JWKS-
// backed providers, so Marketing's HMAC-signed JWTs are silently rejected
// by ctx.auth.getUserIdentity(). Passing the JWT as a query arg and
// verifying it here is the workaround until Marketing migrates to RSA+JWKS.
async function verifyMarketingToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  const secret = process.env.MARKETING_JWT_SECRET;
  if (!secret) return null;
  try {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { issuer: 'getsafefamily.com' },
    );
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!userId || !email) return null;
    return { userId, email: email.toLowerCase() };
  } catch {
    return null;
  }
}

export async function findUserRowByIdentity(
  ctx: SafeSparkCtx,
  userToken?: string,
): Promise<{ row: Doc<'users'>; clerkUserId: string } | null> {
  // Path A — explicit Marketing JWT passed by the client (post-Clerk-
  // retirement parent path). Verified server-side with the shared HMAC
  // secret; we trust the email claim because the signature proves the
  // marketing backend issued it.
  if (userToken) {
    const verified = await verifyMarketingToken(userToken);
    if (verified) {
      const row = (await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', verified.email))
        .first()) as Doc<'users'> | null;
      if (row) return { row, clerkUserId: row.clerkUserId };
    }
  }
  // Path B — Convex auth.getUserIdentity (works for any provider listed
  // in auth.config.ts; in practice this is only the unused JWKS path now,
  // but keeping it so any future RSA/JWKS migration "just works").
  const identity = (await ctx.auth.getUserIdentity()) as
    | { subject: string; email?: string }
    | null;
  if (!identity?.subject) return null;
  let row = (await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
    .first()) as Doc<'users'> | null;
  if (row) return { row, clerkUserId: identity.subject };
  if (identity.email) {
    const normalizedEmail = identity.email.toLowerCase();
    row = (await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
      .first()) as Doc<'users'> | null;
    if (row) return { row, clerkUserId: row.clerkUserId };
  }
  return null;
}

// Temporary diagnostic — returns what the Convex auth layer sees for the
// caller plus what findUserRowByIdentity resolves them to. No PII guard:
// anyone calling this from their own logged-in session only sees their own
// identity (the identity is whatever JWT they passed). Added 2026-05-28
// for the post-Clerk-retirement /parent empty-state debug; remove once
// the resolution path is verified working in prod.
export const debugWhoAmI = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = (await ctx.auth.getUserIdentity()) as
      | { subject?: string; email?: string; [k: string]: unknown }
      | null;
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    let familyByParent: { id: Id<'families'>; code: string } | null = null;
    if (resolved) {
      const family = await ctx.db
        .query('families')
        .withIndex('by_parent', (q) => q.eq('parentUserId', resolved.row._id))
        .first();
      if (family) {
        familyByParent = { id: family._id, code: family.familyCode };
      }
    }
    return {
      identityPresent: Boolean(identity),
      subject: identity?.subject ?? null,
      email: identity?.email ?? null,
      identityKeys: identity ? Object.keys(identity) : [],
      resolvedRowId: resolved?.row._id ?? null,
      resolvedRowEmail: resolved?.row.email ?? null,
      resolvedClerkUserId: resolved?.clerkUserId ?? null,
      familyByParent,
    };
  },
});

export const listMyProjects = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let clerkUserId: string | null = null;
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session) clerkUserId = `kid:${session.kidProfileId}`;
    }
    if (!clerkUserId) {
      const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
      if (identity?.subject) clerkUserId = identity.subject;
    }
    if (!clerkUserId) return [];
    const rows = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId!))
      .order('desc')
      .take(100);
    return rows
      .filter((row) => !row.deletedAt)
      .slice(0, 50)
      .map((row) => ({
        id: row._id,
        title: row.title,
        html: row.html,
        messages: row.messages,
        nextSteps: row.nextSteps ?? [],
        lastPrompt: row.lastPrompt,
        lastReply: row.lastReply,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
  },
});

const RECYCLE_BIN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const listMyDeletedProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
    if (!identity?.subject) return [];
    const rows = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .order('desc')
      .take(200);
    const now = Date.now();
    return rows
      .filter((row) => row.deletedAt && now - row.deletedAt < RECYCLE_BIN_TTL_MS)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
      .slice(0, 50)
      .map((row) => ({
        id: row._id,
        title: row.title,
        html: row.html,
        lastPrompt: row.lastPrompt,
        deletedAt: row.deletedAt as number,
        expiresAt: (row.deletedAt as number) + RECYCLE_BIN_TTL_MS,
      }));
  },
});

export const restoreProject = mutation({
  args: { id: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const { clerkUserId } = await requireIdentity(ctx);
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error('Project not found.');
    if (project.clerkUserId !== clerkUserId) throw new Error('You do not own that project.');
    await ctx.db.patch(args.id, { deletedAt: undefined, updatedAt: Date.now() });
    return args.id;
  },
});

export const purgeProject = mutation({
  args: { id: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const { clerkUserId } = await requireIdentity(ctx);
    const project = await ctx.db.get(args.id);
    if (!project) return;
    if (project.clerkUserId !== clerkUserId) throw new Error('You do not own that project.');
    await ctx.db.delete(args.id);
  },
});

export const saveProject = mutation({
  args: {
    id: v.optional(v.id('safesparkProjects')),
    title: v.string(),
    html: v.string(),
    messages: v.array(MESSAGE_VALIDATOR),
    nextSteps: v.optional(v.array(v.string())),
    lastPrompt: v.optional(v.string()),
    lastReply: v.optional(v.string()),
    versionLabel: v.optional(v.string()),
    versionSummary: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    // Phase 4 — set when Spark's response flagged this build as
    // cross-user communication (chat, message wall, guestbook).
    // Persisted on the project row so the parent dashboard can badge
    // it. Sticky once true: a subsequent edit doesn't un-flag the
    // project unless it explicitly sets the flag to false.
    isCommunication: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { clerkUserId, email } = await resolveSafeSparkIdentity(ctx as SafeSparkCtx, args.sessionToken);
    const now = Date.now();
    const trimmedTitle = args.title.trim().slice(0, 120) || 'Untitled project';
    let projectId = args.id;
    if (projectId) {
      const existing = await ctx.db.get(projectId);
      if (!existing) throw new Error('Project not found.');
      if (existing.clerkUserId !== clerkUserId) throw new Error('You do not own that project.');
      // Sticky: once a project is flagged communication, stay flagged
      // even if the next turn's response omits the flag. Avoids the
      // case where the kid says "remove the chat" → flag clears →
      // parent never reviews the historical data.
      const nextIsComm =
        args.isCommunication === true
          ? true
          : existing.isCommunication === true
            ? true
            : args.isCommunication;
      await ctx.db.patch(projectId, {
        title: trimmedTitle,
        html: args.html,
        messages: args.messages,
        nextSteps: args.nextSteps,
        lastPrompt: args.lastPrompt,
        lastReply: args.lastReply,
        isCommunication: nextIsComm,
        updatedAt: now,
      });
    } else {
      projectId = await ctx.db.insert('safesparkProjects', {
        clerkUserId,
        email,
        title: trimmedTitle,
        html: args.html,
        messages: args.messages,
        nextSteps: args.nextSteps,
        lastPrompt: args.lastPrompt,
        lastReply: args.lastReply,
        isCommunication: args.isCommunication,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert('safesparkVersions', {
      projectId,
      clerkUserId,
      html: args.html,
      label: (args.versionLabel ?? '').trim().slice(0, 80) || trimmedTitle,
      summary: args.versionSummary?.slice(0, 240),
      prompt: args.lastPrompt?.slice(0, 1000),
      // Snapshot the full message thread so revert can roll back both
      // html and chat. Older rows didn't capture this; the restore
      // path falls back to html-only for those.
      messagesSnapshot: args.messages,
      createdAt: now,
    });

    return projectId;
  },
});

// Fork an existing project (a curated template, a publicly shared game, or one
// of your own) into a fresh project owned by the caller. The kid then iterates
// on a polished base instead of paying for a from-scratch build — the single
// biggest cost lever, since ~88% of SafeSpark spend is OUTPUT tokens and a
// blank-canvas build emits 20KB+ of fresh HTML every time.
export const forkProject = mutation({
  args: {
    sourceProjectId: v.id('safesparkProjects'),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clerkUserId, email } = await resolveSafeSparkIdentity(
      ctx as SafeSparkCtx,
      args.sessionToken,
    );
    const source = await ctx.db.get(args.sourceProjectId);
    if (!source) throw new Error('That project no longer exists.');

    // Authorize: remix your own, a curated template, or any publicly shared
    // project (its HTML is already public via /s/, so copying it adds no new
    // exposure). Anything else is off-limits.
    const isOwn = source.clerkUserId === clerkUserId;
    const isTemplate = source.isTemplate === true;
    let isShared = false;
    if (!isOwn && !isTemplate) {
      const share = await ctx.db
        .query('safesparkShares')
        .withIndex('by_project', (q) => q.eq('projectId', args.sourceProjectId))
        .first();
      isShared = share !== null;
    }
    if (!isOwn && !isTemplate && !isShared) {
      throw new Error('That project can’t be remixed.');
    }

    const now = Date.now();
    const base = (source.title || 'Project').trim().slice(0, 100);
    const title = (isOwn ? `Copy of ${base}` : `Remix of ${base}`).slice(0, 120);

    // Fresh, empty chat thread = a clean (and cheaper) context window. The
    // copied HTML is the starting point; the kid's first prompt iterates from
    // there rather than regenerating it.
    const projectId = await ctx.db.insert('safesparkProjects', {
      clerkUserId,
      email,
      title,
      html: source.html,
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    // Seed v1 so "revert to the original" works from the very first edit.
    await ctx.db.insert('safesparkVersions', {
      projectId,
      clerkUserId,
      html: source.html,
      label: title.slice(0, 80),
      messagesSnapshot: [],
      createdAt: now,
    });

    // Carry project memory forward so the remix isn't amnesiac: seed a
    // checkpoint from the source's latest recap (premise, art direction,
    // design decisions). If the source has no recap, the fork starts clean.
    const sourceRecap = await ctx.db
      .query('safesparkCheckpoints')
      .withIndex('by_project_latest', (q) => q.eq('projectId', args.sourceProjectId))
      .order('desc')
      .first();
    if (sourceRecap?.content) {
      await ctx.db.insert('safesparkCheckpoints', {
        projectId,
        clerkUserId,
        content: `(Starting point — remixed from "${base}". The premise and art direction below describe the BASE this project was built on; the kid will set their own new direction from here.)\n\n${sourceRecap.content}`,
        fromTurnCount: 0,
        htmlSize: source.html.length,
        model: sourceRecap.model,
        createdAt: now,
      });
    }

    return projectId;
  },
});

// Curated starter gallery — the projects flagged isTemplate, so the maker can
// offer "start from a template" instead of a blank canvas. Full scan is fine
// at current scale (tens of projects); add an index if the table grows large.
export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('safesparkProjects').collect();
    return all
      .filter((p) => p.isTemplate === true && !p.deletedAt)
      .map((p) => ({ id: p._id, title: p.title, html: p.html }));
  },
});

// Operator-only: flag/unflag a project as a forkable template. Run via
// `npx convex run safespark:adminMarkTemplate '{"projectId":"...","isTemplate":true}'`.
export const adminMarkTemplate = internalMutation({
  args: { projectId: v.id('safesparkProjects'), isTemplate: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { isTemplate: args.isTemplate });
    return { ok: true };
  },
});

// Sprite cache lookup — returns the stored image URL for a prompt hash, or
// null. Public: the /api/demo route checks this (via ConvexHttpClient) before
// paying gpt-image-1, the same way it reads checkpoints. A hit means $0 spend.
export const getSpriteCache = query({
  args: { hash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('safesparkSpriteCache')
      .withIndex('by_hash', (q) => q.eq('hash', args.hash))
      .first();
    return row ? row.url : null;
  },
});

// Sprite cache write — records a freshly generated sprite so identical prompts
// reuse it (across turns and across kids). Idempotent on hash. Hardened: only
// this deployment's Convex storage URLs are cacheable, which blocks
// data:/javascript:/external-URL poisoning of the shared cache.
export const writeSpriteCache = mutation({
  args: { hash: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    if (!/^https:\/\/[a-z0-9-]+\.convex\.cloud\/api\/storage\//i.test(args.url)) {
      return { ok: false, reason: 'not a storage url' };
    }
    if (args.url.length > 2000 || args.hash.length > 128) {
      return { ok: false, reason: 'oversized' };
    }
    const now = Date.now();
    const existing = await ctx.db
      .query('safesparkSpriteCache')
      .withIndex('by_hash', (q) => q.eq('hash', args.hash))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastUsedAt: now, hitCount: existing.hitCount + 1 });
      return { ok: true, deduped: true };
    }
    await ctx.db.insert('safesparkSpriteCache', {
      hash: args.hash,
      url: args.url,
      createdAt: now,
      lastUsedAt: now,
      hitCount: 0,
    });
    return { ok: true };
  },
});

// Session-aware version listing. The original `listVersions` uses
// `ctx.auth.getUserIdentity()` which doesn't work for kid sessions
// (kids have no Convex identity, only `sessionToken`) and doesn't see
// Marketing Central HS256 JWTs either. This variant resolves via
// (sessionToken | userToken) the same way the rest of the project
// endpoints do, so both kids and parents can actually see versions.
// Added 2026-05-29 alongside the revert pill UX.
export const listVersionsForOwner = query({
  args: {
    projectId: v.id('safesparkProjects'),
    sessionToken: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    // Owner resolution mirrors saveProject's identity logic:
    //  - kid session: project.clerkUserId === `kid:<kidProfileId>`
    //  - parent JWT: project.clerkUserId === parent's clerkUserId
    let allowed = false;
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session && project.clerkUserId === `kid:${session.kidProfileId}`) {
        allowed = true;
      }
    }
    if (!allowed && args.userToken) {
      const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
      if (resolved && project.clerkUserId === resolved.clerkUserId) {
        allowed = true;
      }
    }
    if (!allowed) return [];

    const rows = await ctx.db
      .query('safesparkVersions')
      .withIndex('by_project_time', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(50);
    return rows.map((row) => ({
      id: row._id,
      label: row.label,
      summary: row.summary,
      prompt: row.prompt,
      hasMessagesSnapshot: Array.isArray(row.messagesSnapshot),
      createdAt: row.createdAt,
    }));
  },
});

// Session-aware restore. Returns the html + messages snapshot so the
// client can apply both in one shot (no separate fetch + patch dance).
// Also writes a "Restored" version row so the chronology is preserved.
export const restoreVersionForOwner = mutation({
  args: {
    versionId: v.id('safesparkVersions'),
    sessionToken: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error('Version not found.');
    const project = await ctx.db.get(version.projectId);
    if (!project) throw new Error('Project not found.');

    let allowed = false;
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session && project.clerkUserId === `kid:${session.kidProfileId}`) {
        allowed = true;
      }
    }
    if (!allowed && args.userToken) {
      const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
      if (resolved && project.clerkUserId === resolved.clerkUserId) {
        allowed = true;
      }
    }
    if (!allowed) throw new Error('You do not own that project.');

    const now = Date.now();
    // If we have a snapshot, roll back BOTH html and messages so the
    // chat reflects "this is where you were". Otherwise old version
    // row → html only, append a system-style assistant note so the
    // chat doesn't look like a teleport.
    const restoredMessages = version.messagesSnapshot ?? [
      ...project.messages,
      {
        role: 'assistant' as const,
        content: `↻ Restored an earlier version (${version.label}). Keep building from here.`,
      },
    ];
    await ctx.db.patch(version.projectId, {
      html: version.html,
      messages: restoredMessages,
      lastPrompt: `Restored: ${version.label}`,
      lastReply: 'Restored an earlier version. Keep building from here.',
      updatedAt: now,
    });
    // Drop a bookmark version so the chronology stays linear.
    await ctx.db.insert('safesparkVersions', {
      projectId: version.projectId,
      clerkUserId: project.clerkUserId,
      html: version.html,
      label: `↻ Restored: ${version.label}`,
      summary: `Reverted to "${version.label}" from ${new Date(version.createdAt).toLocaleString()}`,
      prompt: undefined,
      messagesSnapshot: restoredMessages,
      createdAt: now,
    });
    return {
      html: version.html,
      messages: restoredMessages,
      label: version.label,
    };
  },
});

export const listVersions = query({
  args: { projectId: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
    if (!identity?.subject) return [];
    const project = await ctx.db.get(args.projectId);
    if (!project || project.clerkUserId !== identity.subject) return [];
    const rows = await ctx.db
      .query('safesparkVersions')
      .withIndex('by_project_time', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(50);
    return rows.map((row) => ({
      id: row._id,
      label: row.label,
      summary: row.summary,
      prompt: row.prompt,
      createdAt: row.createdAt,
    }));
  },
});

export const getVersionHtml = query({
  args: { id: v.id('safesparkVersions') },
  handler: async (ctx, args) => {
    const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
    if (!identity?.subject) return null;
    const row = await ctx.db.get(args.id);
    if (!row || row.clerkUserId !== identity.subject) return null;
    return { html: row.html, label: row.label, prompt: row.prompt, summary: row.summary };
  },
});

export const restoreVersion = mutation({
  args: { id: v.id('safesparkVersions') },
  handler: async (ctx, args) => {
    const { clerkUserId } = await requireIdentity(ctx);
    const version = await ctx.db.get(args.id);
    if (!version) throw new Error('Version not found.');
    if (version.clerkUserId !== clerkUserId) throw new Error('You do not own that version.');
    const project = await ctx.db.get(version.projectId);
    if (!project) throw new Error('Project not found.');
    const now = Date.now();
    await ctx.db.patch(version.projectId, {
      html: version.html,
      lastPrompt: `Restored: ${version.label}`,
      lastReply: 'Restored an earlier version. Keep building from here.',
      updatedAt: now,
    });
    await ctx.db.insert('safesparkVersions', {
      projectId: version.projectId,
      clerkUserId,
      html: version.html,
      label: `Restored: ${version.label}`,
      summary: 'Reverted to an earlier snapshot.',
      prompt: undefined,
      createdAt: now,
    });
    return { html: version.html };
  },
});

const SHARE_ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
function randomShortId(len = 4): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += SHARE_ID_CHARS[Math.floor(Math.random() * SHARE_ID_CHARS.length)];
  }
  return out;
}

function titleSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 32) || 'project'
  );
}

export const createShareLink = mutation({
  args: {
    title: v.string(),
    html: v.string(),
    projectId: v.optional(v.id('safesparkProjects')),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<
    | { shortId: string }
    | { needsParentApproval: true; approvalId: Id<'safesparkShareApprovals'>; status: 'pending' | 'denied' }
  > => {
    if (args.html.length > 600_000) throw new Error('Project too big to share.');
    const identity = (await ctx.auth.getUserIdentity()) as
      | { subject: string; email?: string }
      | null;
    // Kill-switch gate: if a kid session is creating this share link, check
    // the parent hasn't disabled sharing on this kid's profile.
    let kidSession: Doc<'kidSessions'> | null = null;
    if (args.sessionToken) {
      kidSession = (await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first()) as Doc<'kidSessions'> | null;
      if (kidSession) {
        const profile = await ctx.db.get(kidSession.kidProfileId);
        if (profile && profile.allowSharing === false) {
          throw new Error('Sharing is turned off for this profile.');
        }
      }
    }

    // P0 parent-approval gate for chat-shaped projects. When the project
    // is flagged `isCommunication` (chat room, message wall, guestbook —
    // anything that uses spark.db for cross-user state), sharing the
    // link makes that shared store public to anyone who opens the URL.
    // Parent has to opt in before that happens. Other project shapes
    // (single-player games, posters, flashcards) ship as before.
    if (kidSession && args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (project?.isCommunication === true) {
        // Look for an existing approval row for this (kid, project).
        const existing = await ctx.db
          .query('safesparkShareApprovals')
          .withIndex('by_kid_project', (q) =>
            q.eq('kidProfileId', kidSession!.kidProfileId).eq('projectId', args.projectId!),
          )
          .order('desc')
          .first();
        if (existing?.status === 'approved') {
          // Parent already said yes — fall through to normal share-link
          // creation below.
        } else if (existing?.status === 'pending') {
          // Already waiting — don't spam the parent.
          return {
            needsParentApproval: true,
            approvalId: existing._id,
            status: 'pending',
          };
        } else if (existing?.status === 'denied') {
          // Parent said no — let the kid know (resolution sticks unless
          // parent re-approves manually from the dashboard).
          return {
            needsParentApproval: true,
            approvalId: existing._id,
            status: 'denied',
          };
        } else {
          // First share-attempt: open a pending request.
          const profile = await ctx.db.get(kidSession.kidProfileId);
          if (!profile) throw new Error('Profile not found.');
          const approvalId = await ctx.db.insert('safesparkShareApprovals', {
            parentUserId: profile.parentUserId,
            kidProfileId: kidSession.kidProfileId,
            kidName: profile.displayName,
            projectId: args.projectId,
            projectTitle: project.title.slice(0, 120) || 'Untitled project',
            status: 'pending',
            createdAt: Date.now(),
          });
          return { needsParentApproval: true, approvalId, status: 'pending' };
        }
      }
    }
    const now = Date.now();
    const slug = titleSlug(args.title);
    let shortId = `${slug}-${randomShortId()}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await ctx.db
        .query('safesparkShares')
        .withIndex('by_short_id', (q) => q.eq('shortId', shortId))
        .first();
      if (!exists) break;
      shortId = `${slug}-${randomShortId()}`;
    }
    await ctx.db.insert('safesparkShares', {
      shortId,
      title: args.title.slice(0, 120) || 'SafeSpark project',
      html: args.html,
      projectId: args.projectId,
      ownerClerkUserId: identity?.subject,
      ownerEmail: identity?.email,
      views: 0,
      createdAt: now,
    });
    return { shortId };
  },
});

// Admin-only: create a share link for an existing project given just
// the projectId + the shared admin key. Used by operator tooling to
// feature kid projects on the landing page (we want playable "tap to
// play" cards, not "tap to build your own copy"). Skips the kid-
// session auth + parent-approval gate that createShareLink runs —
// you're the operator and you've explicitly chosen which project to
// surface. Returns the existing shortId if a share already exists for
// this projectId, otherwise creates a new one. Idempotent.
export const opsCreateShareForProject = mutation({
  args: {
    projectId: v.id('safesparkProjects'),
    adminKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ shortId: string; reused: boolean }> => {
    const expectedKey = process.env.SAFESPARK_ADMIN_KEY;
    if (!expectedKey || args.adminKey !== expectedKey) {
      throw new Error('Unauthorized.');
    }
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found.');
    // If a share already exists for this project, reuse it. Keeps the
    // mutation idempotent so calling twice doesn't pollute the table.
    const existing = await ctx.db
      .query('safesparkShares')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .first();
    if (existing) {
      return { shortId: existing.shortId, reused: true };
    }
    const slug = titleSlug(project.title || 'project');
    let shortId = `${slug}-${randomShortId()}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const dup = await ctx.db
        .query('safesparkShares')
        .withIndex('by_short_id', (q) => q.eq('shortId', shortId))
        .first();
      if (!dup) break;
      shortId = `${slug}-${randomShortId()}`;
    }
    await ctx.db.insert('safesparkShares', {
      shortId,
      title: (project.title || 'SafeSpark project').slice(0, 120),
      html: project.html,
      projectId: args.projectId,
      ownerClerkUserId: project.clerkUserId,
      ownerEmail: project.email,
      views: 0,
      createdAt: Date.now(),
    });
    return { shortId, reused: false };
  },
});

export const getShare = query({
  args: { shortId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('safesparkShares')
      .withIndex('by_short_id', (q) => q.eq('shortId', args.shortId))
      .first();
    if (!row) return null;
    // Live share model: when the share knows its source project, always
    // serve the project's current HTML + title so the kid's recipients see
    // updates without needing a new link. Snapshot fallback for legacy
    // shares created before we started tracking projectId on shares, or
    // for shares whose source project was deleted (recycle bin).
    if (row.projectId) {
      const project = await ctx.db.get(row.projectId);
      if (project && !project.deletedAt) {
        return { title: project.title, html: project.html, projectId: row.projectId };
      }
    }
    return { title: row.title, html: row.html, projectId: row.projectId ?? null };
  },
});

export const incrementShareView = mutation({
  args: { shortId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('safesparkShares')
      .withIndex('by_short_id', (q) => q.eq('shortId', args.shortId))
      .first();
    if (!row) return;
    await ctx.db.patch(row._id, { views: row.views + 1 });
  },
});

export const generateImageUploadUrl = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Accept either a Clerk parent identity OR a kid session token. The
    // /api/demo sprite-generator path runs server-side and calls this
    // mutation to upload AI-generated PNGs; for kid-session callers
    // there's no Clerk JWT to forward, so the kid sessionToken is what
    // proves the request is legit. Without this fallback, the upload
    // fails, and `generateSpriteSafely` inlines a ~2MB base64 PNG
    // straight into the HTML, which crashes the iframe srcDoc.
    await resolveSafeSparkIdentity(ctx as SafeSparkCtx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeImageUpload = mutation({
  args: { storageId: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await resolveSafeSparkIdentity(ctx as SafeSparkCtx, args.sessionToken);
    const url = await ctx.storage.getUrl(args.storageId as Id<'_storage'>);
    if (!url) throw new Error('Could not resolve uploaded image.');
    return { url };
  },
});

// Public mutation — anyone can write to the error log (no PII beyond
// what the kid typed; helps debugging silent failures).
export const logError = mutation({
  args: {
    prompt: v.string(),
    kind: v.string(),
    message: v.string(),
    contextSize: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let clerkUserId: string | undefined;
    let email: string | undefined;
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session) {
        const profile = await ctx.db.get(session.kidProfileId);
        if (profile) {
          clerkUserId = `kid:${profile._id}`;
          email = profile.displayName;
        }
      }
    }
    if (!clerkUserId) {
      const identity = (await ctx.auth.getUserIdentity()) as
        | { subject: string; email?: string }
        | null;
      if (identity?.subject) {
        clerkUserId = identity.subject;
        email = identity.email;
      }
    }
    await ctx.db.insert('safesparkErrors', {
      clerkUserId,
      email,
      prompt: args.prompt.slice(0, 4000),
      kind: args.kind.slice(0, 60),
      message: args.message.slice(0, 2000),
      contextSize: args.contextSize,
      createdAt: Date.now(),
    });
  },
});

export const recentErrors = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 25, 200);
    const rows = await ctx.db
      .query('safesparkErrors')
      .withIndex('by_time')
      .order('desc')
      .take(limit);
    return rows.map((row) => ({
      id: row._id,
      email: row.email,
      kind: row.kind,
      prompt: row.prompt,
      message: row.message,
      contextSize: row.contextSize,
      whenAgo: humanAgo(Date.now() - row.createdAt),
    }));
  },
});

export const logRequest = mutation({
  args: {
    prompt: v.string(),
    projectId: v.optional(v.id('safesparkProjects')),
    projectTitle: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let clerkUserId: string | null = null;
    let email = '';
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session) {
        const profile = await ctx.db.get(session.kidProfileId);
        if (profile) {
          clerkUserId = `kid:${profile._id}`;
          email = profile.displayName;
        }
      }
    }
    if (!clerkUserId) {
      const identity = (await ctx.auth.getUserIdentity()) as
        | { subject: string; email?: string }
        | null;
      if (identity?.subject) {
        clerkUserId = identity.subject;
        email = identity.email ?? '';
      }
    }
    if (!clerkUserId) return null;
    return await ctx.db.insert('safesparkRequests', {
      clerkUserId,
      email,
      prompt: args.prompt.slice(0, 4000),
      projectId: args.projectId,
      projectTitle: args.projectTitle?.slice(0, 120),
      createdAt: Date.now(),
    });
  },
});

// Patch a safesparkRequests row with the actual reply text from this
// turn. Lets the ops review feed show the per-turn response, not the
// project-level lastReply (which masked canned-reply loops behind a
// display artifact — every prompt in a project showed the same reply).
// Both kid sessions and parent JWTs allowed; ownership verified.
export const setRequestReply = mutation({
  args: {
    requestId: v.id('safesparkRequests'),
    reply: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.requestId);
    if (!row) return;
    // Verify the caller owns this row. Kid sessions resolve to
    // clerkUserId='kid:<id>'; parents resolve via the standard identity.
    let callerId: string | null = null;
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session) callerId = `kid:${session.kidProfileId}`;
    }
    if (!callerId) {
      const identity = (await ctx.auth.getUserIdentity()) as { subject?: string } | null;
      if (identity?.subject) callerId = identity.subject;
    }
    if (!callerId || callerId !== row.clerkUserId) return;
    await ctx.db.patch(args.requestId, { reply: args.reply.slice(0, 4000) });
  },
});

export const listMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
    if (!identity?.subject) return [];
    const rows = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', identity.subject))
      .order('desc')
      .take(100);
    return rows.map((row) => ({
      id: row._id,
      email: row.email,
      prompt: row.prompt,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      createdAt: row.createdAt,
    }));
  },
});

// Operator gate. Resolves the caller via the same userToken path
// everything else uses (Marketing Central HS256 JWT verified with the
// shared secret) — Convex's built-in `ctx.auth.getUserIdentity()` can't
// see HMAC tokens, which is why the old `listAllRequests` was silently
// rejecting jedaws@gmail.com. Returns null when the caller is not the
// operator email.
async function requireOperator(
  ctx: SafeSparkCtx,
  userToken?: string,
): Promise<{ email: string } | null> {
  const operatorEmail = (process.env.PARENT_EMAIL ?? '').toLowerCase();
  if (!operatorEmail) return null;
  const resolved = await findUserRowByIdentity(ctx, userToken);
  if (!resolved) return null;
  if (resolved.row.email.toLowerCase() !== operatorEmail) return null;
  return { email: resolved.row.email.toLowerCase() };
}

// Back-compat: keep listAllRequests but route it through the new
// operator gate so the existing /admin/spark page works once it passes
// userToken. Returns a richer payload — every prompt now comes with
// the reply that came back AND the project title/kind, so the operator
// can review quality without an extra round trip per row.
export const listAllRequests = query({
  args: { limit: v.optional(v.number()), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const op = await requireOperator(ctx as SafeSparkCtx, args.userToken);
    if (!op) return null;
    const limit = Math.min(args.limit ?? 200, 500);
    const rows = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_time')
      .order('desc')
      .take(limit);
    // Join in the project's lastReply so the operator can see what Spark
    // said, not just what the kid asked. One project lookup per row at
    // limit≤500 is fine.
    const out = [];
    for (const row of rows) {
      let lastReply: string | undefined;
      let projectTitle = row.projectTitle ?? undefined;
      if (row.projectId) {
        const project = await ctx.db.get(row.projectId);
        if (project) {
          lastReply = project.lastReply;
          projectTitle = project.title || projectTitle;
        }
      }
      out.push({
        id: row._id,
        clerkUserId: row.clerkUserId,
        email: row.email,
        prompt: row.prompt,
        projectId: row.projectId,
        projectTitle,
        lastReply,
        createdAt: row.createdAt,
      });
    }
    return out;
  },
});

// Operator review feed — combines the three streams of activity the
// operator needs to see when auditing Spark quality + safety:
//   - prompts (with reply, project title)
//   - blocked-topic events
//   - concern alerts (self-harm / ED escalations)
// All cross-family. Most recent first. The page renders them
// interleaved on a timeline; this query just hands back the raw three
// arrays so the UI can filter / tab / search client-side.
export const opsReviewFeed = query({
  args: {
    userToken: v.optional(v.string()),
    promptLimit: v.optional(v.number()),
    blockedLimit: v.optional(v.number()),
    concernLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const op = await requireOperator(ctx as SafeSparkCtx, args.userToken);
    if (!op) return null;

    const promptRows = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_time')
      .order('desc')
      .take(Math.min(args.promptLimit ?? 200, 500));

    const prompts = [];
    for (const row of promptRows) {
      // Prefer the per-row reply (filled in by setRequestReply after each
      // turn). Fall back to project.lastReply only for legacy rows that
      // predate the per-request reply field — otherwise every prompt in
      // a project shows the same reply (display artifact that masked
      // real canned-reply loops).
      let lastReply: string | undefined = row.reply ?? undefined;
      let projectTitle = row.projectTitle ?? undefined;
      let isCommunication = false;
      if (row.projectId) {
        const project = await ctx.db.get(row.projectId);
        if (project) {
          if (!lastReply) lastReply = project.lastReply;
          projectTitle = project.title || projectTitle;
          isCommunication = project.isCommunication === true;
        }
      }
      prompts.push({
        id: row._id,
        clerkUserId: row.clerkUserId,
        email: row.email,
        prompt: row.prompt,
        projectId: row.projectId,
        projectTitle,
        lastReply,
        isCommunication,
        createdAt: row.createdAt,
      });
    }

    const blockedRows = await ctx.db
      .query('safesparkErrors')
      .order('desc')
      .take(Math.min(args.blockedLimit ?? 100, 300));
    const blocked = blockedRows
      .filter((e) => e.kind === 'blocked_topic')
      .map((e) => ({
        id: e._id,
        clerkUserId: e.clerkUserId,
        prompt: e.prompt,
        message: e.message,
        createdAt: e.createdAt,
      }));

    const concernRows = await ctx.db
      .query('safesparkConcernAlerts')
      .order('desc')
      .take(Math.min(args.concernLimit ?? 50, 200));
    const concerns = concernRows.map((c) => ({
      id: c._id,
      kidName: c.kidName,
      kidProfileId: c.kidProfileId,
      parentUserId: c.parentUserId,
      query: c.query,
      category: c.category,
      rationale: c.rationale,
      acknowledged: c.acknowledged,
      createdAt: c.createdAt,
    }));

    return { prompts, blocked, concerns };
  },
});

// Internal variant of opsReviewFeed for HTTP admin endpoints. Same
// data shape; the admin-key check happens in http.ts so the gate is
// uniform with the rest of the SafeFamily ops endpoints.
export const _opsReviewFeedInternal = internalQuery({
  args: {
    promptLimit: v.optional(v.number()),
    blockedLimit: v.optional(v.number()),
    concernLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const promptRows = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_time')
      .order('desc')
      .take(Math.min(args.promptLimit ?? 200, 500));
    const prompts = [];
    for (const row of promptRows) {
      // Prefer the per-row reply (filled in by setRequestReply after each
      // turn). Fall back to project.lastReply only for legacy rows that
      // predate the per-request reply field — otherwise every prompt in
      // a project shows the same reply (display artifact that masked
      // real canned-reply loops).
      let lastReply: string | undefined = row.reply ?? undefined;
      let projectTitle = row.projectTitle ?? undefined;
      let isCommunication = false;
      if (row.projectId) {
        const project = await ctx.db.get(row.projectId);
        if (project) {
          if (!lastReply) lastReply = project.lastReply;
          projectTitle = project.title || projectTitle;
          isCommunication = project.isCommunication === true;
        }
      }
      prompts.push({
        id: row._id,
        clerkUserId: row.clerkUserId,
        email: row.email,
        prompt: row.prompt,
        projectId: row.projectId,
        projectTitle,
        lastReply,
        isCommunication,
        createdAt: row.createdAt,
      });
    }
    const blockedRows = await ctx.db
      .query('safesparkErrors')
      .order('desc')
      .take(Math.min(args.blockedLimit ?? 100, 300));
    const blocked = blockedRows
      .filter((e) => e.kind === 'blocked_topic')
      .map((e) => ({
        id: e._id,
        clerkUserId: e.clerkUserId,
        prompt: e.prompt,
        message: e.message,
        createdAt: e.createdAt,
      }));
    const concernRows = await ctx.db
      .query('safesparkConcernAlerts')
      .order('desc')
      .take(Math.min(args.concernLimit ?? 50, 200));
    const concerns = concernRows.map((c) => ({
      id: c._id,
      kidName: c.kidName,
      query: c.query,
      category: c.category,
      rationale: c.rationale,
      acknowledged: c.acknowledged,
      createdAt: c.createdAt,
    }));
    return { prompts, blocked, concerns };
  },
});

// Search projects by title substring (case-insensitive). Used by the
// operator's HTTP search endpoint ("find the dungeon game"). Returns
// project metadata only — call _opsGetProjectInternal for the full
// thread + HTML.
export const _opsSearchProjectsInternal = internalQuery({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = args.query.trim().toLowerCase();
    const limit = Math.min(args.limit ?? 25, 100);
    if (!q) return [];
    // Project count across all customers is small enough to scan; the
    // shape we need (substring match on title or lastPrompt) doesn't
    // map to an index, so brute force is fine for now.
    const all = await ctx.db
      .query('safesparkProjects')
      .order('desc')
      .take(2000);
    const hits = [];
    for (const p of all) {
      if (p.deletedAt) continue;
      const inTitle = p.title.toLowerCase().includes(q);
      const inPrompt = p.lastPrompt ? p.lastPrompt.toLowerCase().includes(q) : false;
      if (!inTitle && !inPrompt) continue;
      // Resolve owner label.
      let ownerLabel = p.email;
      if (p.clerkUserId.startsWith('kid:')) {
        const kidProfileId = p.clerkUserId.slice(4) as Id<'kidProfiles'>;
        const profile = await ctx.db.get(kidProfileId);
        if (profile) {
          const parent = await ctx.db.get(profile.parentUserId);
          ownerLabel = parent
            ? `${profile.displayName} (kid of ${parent.email})`
            : `${profile.displayName} (orphan)`;
        }
      }
      hits.push({
        id: p._id,
        title: p.title,
        lastPrompt: p.lastPrompt,
        isCommunication: p.isCommunication === true,
        owner: ownerLabel,
        clerkUserId: p.clerkUserId,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        messagesCount: p.messages.length,
      });
      if (hits.length >= limit) break;
    }
    return hits;
  },
});

// Full project + thread by id. Used by the operator's HTTP project
// inspector endpoint.
export const _opsGetProjectInternal = internalQuery({
  args: { projectId: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    let ownerLabel = project.email;
    let kidName: string | undefined;
    let parentEmail: string | undefined;
    if (project.clerkUserId.startsWith('kid:')) {
      const kidProfileId = project.clerkUserId.slice(4) as Id<'kidProfiles'>;
      const profile = await ctx.db.get(kidProfileId);
      if (profile) {
        kidName = profile.displayName;
        const parent = await ctx.db.get(profile.parentUserId);
        if (parent) {
          parentEmail = parent.email;
          ownerLabel = `${profile.displayName} (kid of ${parent.email})`;
        }
      }
    }
    return {
      id: project._id,
      title: project.title,
      html: project.html,
      messages: project.messages,
      lastPrompt: project.lastPrompt,
      lastReply: project.lastReply,
      isCommunication: project.isCommunication === true,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ownerLabel,
      kidName,
      parentEmail,
      rawClerkUserId: project.clerkUserId,
    };
  },
});

// Full conversation thread for a single project — drill-in view from
// the ops review feed. Returns the full messages[] (every kid prompt
// and every Spark reply), the current rendered HTML, owner identity,
// and last-prompt metadata. Operator-gated.
export const opsGetProjectThread = query({
  args: {
    projectId: v.id('safesparkProjects'),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const op = await requireOperator(ctx as SafeSparkCtx, args.userToken);
    if (!op) return null;
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    // Owner lookup. clerkUserId is either a Marketing user clerkUserId
    // or a synthetic "kid:<kidProfileId>" string for kid-built projects.
    let ownerLabel = project.email;
    let kidName: string | undefined;
    let parentEmail: string | undefined;
    if (project.clerkUserId.startsWith('kid:')) {
      const kidProfileId = project.clerkUserId.slice(4) as Id<'kidProfiles'>;
      const profile = await ctx.db.get(kidProfileId);
      if (profile) {
        kidName = profile.displayName;
        const parent = await ctx.db.get(profile.parentUserId);
        if (parent) {
          parentEmail = parent.email;
          ownerLabel = `${profile.displayName} (kid of ${parent.email})`;
        } else {
          ownerLabel = `${profile.displayName} (orphaned kid profile)`;
        }
      }
    }
    return {
      id: project._id,
      title: project.title,
      html: project.html,
      messages: project.messages,
      lastPrompt: project.lastPrompt,
      lastReply: project.lastReply,
      isCommunication: project.isCommunication === true,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ownerLabel,
      kidName,
      parentEmail,
      rawClerkUserId: project.clerkUserId,
    };
  },
});

// SafeFamily-platform admin functions, called from convex/http.ts.

export const adminSnapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    const projects = await ctx.db.query('safesparkProjects').collect();
    const families = await ctx.db.query('families').collect();
    const kidProfiles = await ctx.db.query('kidProfiles').collect();
    const requests = await ctx.db.query('safesparkRequests').collect();
    const yearMonth = (() => {
      const d = new Date();
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    })();
    const usage = (
      await ctx.db.query('safesparkUsage').collect()
    ).filter((r) => r.yearMonth === yearMonth);
    const totalSpendCentsThisMonth = usage.reduce((sum, r) => sum + r.totalCents, 0);
    return {
      app: 'safespark',
      generatedAt: Date.now(),
      counts: {
        users: users.length,
        families: families.length,
        kidProfiles: kidProfiles.length,
        projects: projects.filter((p) => !p.deletedAt).length,
        deletedProjects: projects.filter((p) => p.deletedAt).length,
        promptsLogged: requests.length,
      },
      usageThisMonth: {
        yearMonth,
        totalSpendCents: totalSpendCentsThisMonth,
        chatTurns: usage.reduce((s, r) => s + r.chatTurns, 0),
        imageTransforms: usage.reduce((s, r) => s + r.imageTransforms, 0),
      },
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        subscriptionStatus: u.subscriptionStatus ?? 'lifetime',
        familyCode: u.familyCode ?? null,
        createdAt: u.createdAt,
      })),
    };
  },
});

export const adminSetSubscription = internalMutation({
  args: {
    email: v.string(),
    status: v.union(
      v.literal('trial'),
      v.literal('active'),
      v.literal('lifetime'),
      v.literal('cancelled'),
      v.literal('expired'),
    ),
  },
  handler: async (ctx, args) => {
    const lowered = args.email.toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', lowered))
      .first();
    if (!user) return { ok: false, error: 'user not found' };
    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      subscriptionUpdatedAt: Date.now(),
    });
    return { ok: true, email: lowered, status: args.status };
  },
});

// Operator-only: set the per-kid daily build budget for every kid under a
// parent (by email). Used to bound token cost on comped accounts without
// needing the parent's own auth token (setKidDailyBudget requires it). Pass
// budget=null/omit to clear back to the system default.
export const adminSetKidDailyBudget = internalMutation({
  args: { email: v.string(), budget: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const lowered = args.email.toLowerCase();
    const parent = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', lowered))
      .first();
    if (!parent) return { ok: false, error: 'parent not found' };

    let clamped: number | undefined;
    if (args.budget != null && args.budget > 0) {
      clamped = Math.max(1, Math.min(500, Math.round(args.budget)));
    }

    const kids = await ctx.db
      .query('kidProfiles')
      .withIndex('by_parent', (q) => q.eq('parentUserId', parent._id))
      .collect();

    const updated: string[] = [];
    for (const kid of kids) {
      await ctx.db.patch(kid._id, { dailyQueryBudget: clamped, updatedAt: Date.now() });
      updated.push(kid.displayName ?? kid._id);
    }
    return { ok: true, email: lowered, dailyQueryBudget: clamped, kids: updated };
  },
});

export const adminDeleteUser = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const lowered = args.email.toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', lowered))
      .first();
    if (!user) return { ok: false, error: 'user not found' };
    const clerkUserId = user.clerkUserId;
    // Delete projects, versions, requests, usage, shares created by this user.
    const projects = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const p of projects) {
      const versions = await ctx.db
        .query('safesparkVersions')
        .withIndex('by_project_time', (q) => q.eq('projectId', p._id))
        .collect();
      for (const v of versions) await ctx.db.delete(v._id);
      await ctx.db.delete(p._id);
    }
    const requests = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const r of requests) await ctx.db.delete(r._id);
    const usage = await ctx.db
      .query('safesparkUsage')
      .withIndex('by_clerk_month', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const u of usage) await ctx.db.delete(u._id);
    await ctx.db.delete(user._id);
    return { ok: true, email: lowered, deletedProjects: projects.length };
  },
});

export const adminSyncFamilyCode = internalMutation({
  args: { email: v.string(), code: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const lowered = args.email.toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', lowered))
      .first();
    if (!user) return { ok: false, error: 'user not found' };
    if (args.code) {
      await ctx.db.patch(user._id, { familyCode: args.code });
      return { ok: true, email: lowered, code: args.code, action: 'set' };
    }
    return { ok: true, email: lowered, code: user.familyCode ?? null, action: 'read' };
  },
});

export const debugFindShare = internalQuery({
  args: { shortId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('safesparkShares')
      .withIndex('by_short_id', (q) => q.eq('shortId', args.shortId))
      .first();
    return row ? { shortId: row.shortId, title: row.title, htmlBytes: row.html.length } : null;
  },
});

// CLI-only: create a share link for an existing project by ID. Used to hand
// the operator a copyable URL for a kid's game.
export const adminShareProject = internalMutation({
  args: { projectId: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found.');
    const slug = titleSlug(project.title);
    let shortId = `${slug}-${randomShortId()}`;
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('safesparkShares')
        .withIndex('by_short_id', (q) => q.eq('shortId', shortId))
        .first();
      if (!clash) break;
      shortId = `${slug}-${randomShortId()}`;
    }
    await ctx.db.insert('safesparkShares', {
      shortId,
      title: project.title,
      html: project.html,
      ownerClerkUserId: project.clerkUserId,
      ownerEmail: project.email,
      views: 0,
      createdAt: Date.now(),
    });
    return { shortId, url: `https://getsafespark.com/s/${shortId}` };
  },
});

// CLI-only: dump every SafeSpark + family table for migration between
// Convex deployments. Returns plain JSON, no auth needed (internal-only).
export const exportAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    const families = await ctx.db.query('families').collect();
    const kidProfiles = await ctx.db.query('kidProfiles').collect();
    const kidSessions = await ctx.db.query('kidSessions').collect();
    const projects = await ctx.db.query('safesparkProjects').collect();
    const versions = await ctx.db.query('safesparkVersions').collect();
    const shares = await ctx.db.query('safesparkShares').collect();
    const requests = await ctx.db.query('safesparkRequests').collect();
    const usage = await ctx.db.query('safesparkUsage').collect();
    const errors = await ctx.db.query('safesparkErrors').collect();
    return {
      counts: {
        users: users.length,
        families: families.length,
        kidProfiles: kidProfiles.length,
        kidSessions: kidSessions.length,
        projects: projects.length,
        versions: versions.length,
        shares: shares.length,
        requests: requests.length,
        usage: usage.length,
        errors: errors.length,
      },
      users,
      families,
      kidProfiles,
      kidSessions,
      projects,
      versions,
      shares,
      requests,
      usage,
      errors,
    };
  },
});

// CLI-only: import a dump into this deployment. Skips duplicates on the
// natural unique key for each table (e.g. clerkUserId, familyCode, shortId).
// IDs from the source deployment are NOT preserved — we generate fresh IDs
// and remap references (familyId, kidProfileId, projectId) accordingly.
export const importAll = internalMutation({
  // payload may include optional `projectsManifest` — a slim list of project
  // identity records used only for FK resolution when projects themselves
  // aren't included in the chunk (keeps version/request chunks small).
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const data = args.payload as {
      users: Array<{
        _id: string; clerkUserId: string; email: string; role: 'learner' | 'parent'; displayName: string;
        linkedKidProfileId?: string; familyId?: string; subscriptionStatus?: 'trial'|'active'|'lifetime'|'cancelled'|'expired';
        subscriptionUpdatedAt?: number; familyCode?: string; createdAt: number;
      }>;
      families: Array<{ _id: string; parentUserId: string; familyCode: string; familyName?: string; createdAt: number }>;
      kidProfiles: Array<{
        _id: string; familyId?: string; parentUserId: string; displayName: string; age: number;
        sex: 'boy'|'girl'; interests: string[]; avoidTopics: string[]; customNote?: string; pin?: string;
        avatarColor?: string; joinCode?: string; claimed?: boolean; personalityLayers: string[];
        catchphrase?: string; opinionTolerance?: 'soft'|'balanced'|'honest'; memorableFacts?: string[];
        createdAt: number; updatedAt: number;
      }>;
      kidSessions: Array<{
        _id: string; sessionToken: string; familyId: string; kidProfileId: string;
        deviceLabel?: string; lastSeenAt: number; createdAt: number;
      }>;
      projects: Array<{
        _id: string; clerkUserId: string; email: string; title: string; html: string;
        messages: Array<{role: 'user'|'assistant'; content: string}>; nextSteps?: string[];
        lastPrompt?: string; lastReply?: string; deletedAt?: number; createdAt: number; updatedAt: number;
      }>;
      versions: Array<{
        _id: string; projectId: string; clerkUserId: string; html: string; label: string;
        summary?: string; prompt?: string; createdAt: number;
      }>;
      shares: Array<{
        _id: string; shortId: string; title: string; html: string;
        ownerClerkUserId?: string; ownerEmail?: string; views: number; createdAt: number;
      }>;
      requests: Array<{
        _id: string; clerkUserId: string; email: string; prompt: string;
        projectId?: string; projectTitle?: string; createdAt: number;
      }>;
      usage: Array<{
        _id: string; clerkUserId: string; email: string; yearMonth: string;
        chatTurns: number; chatInputTokens: number; chatOutputTokens: number;
        imageTransforms: number; totalCents: number; updatedAt: number;
      }>;
      errors: Array<{
        _id: string; clerkUserId?: string; email?: string; prompt: string;
        kind: string; message: string; contextSize?: number; createdAt: number;
      }>;
    };

    const userIdMap = new Map<string, string>();
    const familyIdMap = new Map<string, string>();
    const kidProfileIdMap = new Map<string, string>();
    const projectIdMap = new Map<string, string>();

    const inserted = { users: 0, families: 0, kidProfiles: 0, kidSessions: 0, projects: 0, versions: 0, shares: 0, requests: 0, usage: 0, errors: 0 };
    const skipped = { users: 0, families: 0, kidProfiles: 0, kidSessions: 0, projects: 0, versions: 0, shares: 0, requests: 0, usage: 0, errors: 0 };

    // 1) users — dedupe by clerkUserId
    for (const u of data.users) {
      const existing = await ctx.db.query('users').withIndex('by_clerk_id', (q) => q.eq('clerkUserId', u.clerkUserId)).first();
      if (existing) {
        userIdMap.set(u._id, existing._id);
        skipped.users++;
        continue;
      }
      const newId = await ctx.db.insert('users', {
        clerkUserId: u.clerkUserId,
        email: u.email,
        role: u.role,
        displayName: u.displayName,
        subscriptionStatus: u.subscriptionStatus,
        subscriptionUpdatedAt: u.subscriptionUpdatedAt,
        familyCode: u.familyCode,
        createdAt: u.createdAt,
      });
      userIdMap.set(u._id, newId);
      inserted.users++;
    }

    // 2) families — dedupe by familyCode
    for (const f of data.families) {
      const existing = await ctx.db.query('families').withIndex('by_code', (q) => q.eq('familyCode', f.familyCode)).first();
      if (existing) {
        familyIdMap.set(f._id, existing._id);
        skipped.families++;
        continue;
      }
      const parentNew = userIdMap.get(f.parentUserId);
      if (!parentNew) { skipped.families++; continue; }
      const newId = await ctx.db.insert('families', {
        parentUserId: parentNew as Id<'users'>,
        familyCode: f.familyCode,
        familyName: f.familyName,
        createdAt: f.createdAt,
      });
      familyIdMap.set(f._id, newId);
      inserted.families++;
    }

    // 3) kidProfiles — dedupe by (parentUserId, displayName, age) tuple
    for (const k of data.kidProfiles) {
      const parentNew = userIdMap.get(k.parentUserId);
      if (!parentNew) { skipped.kidProfiles++; continue; }
      const familyNew = k.familyId ? familyIdMap.get(k.familyId) : undefined;
      const candidates = await ctx.db.query('kidProfiles').withIndex('by_parent', (q) => q.eq('parentUserId', parentNew as Id<'users'>)).collect();
      const existing = candidates.find((c) => c.displayName === k.displayName && c.age === k.age);
      if (existing) {
        kidProfileIdMap.set(k._id, existing._id);
        skipped.kidProfiles++;
        continue;
      }
      const newId = await ctx.db.insert('kidProfiles', {
        familyId: familyNew as Id<'families'> | undefined,
        parentUserId: parentNew as Id<'users'>,
        displayName: k.displayName,
        age: k.age,
        sex: k.sex,
        interests: k.interests,
        avoidTopics: k.avoidTopics,
        customNote: k.customNote,
        pin: k.pin,
        avatarColor: k.avatarColor,
        joinCode: k.joinCode,
        claimed: k.claimed,
        personalityLayers: k.personalityLayers,
        catchphrase: k.catchphrase,
        opinionTolerance: k.opinionTolerance,
        memorableFacts: k.memorableFacts,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      });
      kidProfileIdMap.set(k._id, newId);
      inserted.kidProfiles++;
    }

    // 4) kidSessions — dedupe by sessionToken
    for (const s of data.kidSessions) {
      const existing = await ctx.db.query('kidSessions').withIndex('by_token', (q) => q.eq('sessionToken', s.sessionToken)).first();
      if (existing) { skipped.kidSessions++; continue; }
      const familyNew = familyIdMap.get(s.familyId);
      const kidNew = kidProfileIdMap.get(s.kidProfileId);
      if (!familyNew || !kidNew) { skipped.kidSessions++; continue; }
      await ctx.db.insert('kidSessions', {
        sessionToken: s.sessionToken,
        familyId: familyNew as Id<'families'>,
        kidProfileId: kidNew as Id<'kidProfiles'>,
        deviceLabel: s.deviceLabel,
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
      });
      inserted.kidSessions++;
    }

    // 5) projects — dedupe by (clerkUserId, title, createdAt)
    for (const p of data.projects) {
      const candidates = await ctx.db.query('safesparkProjects').withIndex('by_clerk_id', (q) => q.eq('clerkUserId', p.clerkUserId)).collect();
      const existing = candidates.find((c) => c.title === p.title && c.createdAt === p.createdAt);
      if (existing) {
        projectIdMap.set(p._id, existing._id);
        skipped.projects++;
        continue;
      }
      const newId = await ctx.db.insert('safesparkProjects', {
        clerkUserId: p.clerkUserId,
        email: p.email,
        title: p.title,
        html: p.html,
        messages: p.messages,
        nextSteps: p.nextSteps,
        lastPrompt: p.lastPrompt,
        lastReply: p.lastReply,
        deletedAt: p.deletedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      });
      projectIdMap.set(p._id, newId);
      inserted.projects++;
    }

    // 6) versions — dedupe by (projectId, createdAt). If the source project
    // isn't in this chunk's projects array, look it up on prod by natural
    // key (clerkUserId + title + createdAt). The migration sender can pass
    // a lightweight projectsManifest (id + clerkUserId + title + createdAt
    // only — no html) to keep chunk payloads under the CLI args limit.
    const manifestExtra = ((data as unknown as { projectsManifest?: Array<{ _id: string; clerkUserId: string; title: string; createdAt: number }> }).projectsManifest) ?? [];
    const sourceProjectsById = new Map<string, { clerkUserId: string; title: string; createdAt: number }>();
    for (const p of data.projects) sourceProjectsById.set(p._id, { clerkUserId: p.clerkUserId, title: p.title, createdAt: p.createdAt });
    for (const m of manifestExtra) sourceProjectsById.set(m._id, { clerkUserId: m.clerkUserId, title: m.title, createdAt: m.createdAt });
    for (const v of data.versions) {
      let projectNew = projectIdMap.get(v.projectId);
      if (!projectNew) {
        const sourceProject = sourceProjectsById.get(v.projectId);
        if (sourceProject) {
          const candidates = await ctx.db.query('safesparkProjects').withIndex('by_clerk_id', (q) => q.eq('clerkUserId', sourceProject.clerkUserId)).collect();
          const match = candidates.find((c) => c.title === sourceProject.title && c.createdAt === sourceProject.createdAt);
          if (match) projectNew = match._id;
        }
      }
      if (!projectNew) { skipped.versions++; continue; }
      const candidates = await ctx.db.query('safesparkVersions').withIndex('by_project_time', (q) => q.eq('projectId', projectNew as Id<'safesparkProjects'>)).collect();
      const existing = candidates.find((c) => c.createdAt === v.createdAt && c.label === v.label);
      if (existing) { skipped.versions++; continue; }
      await ctx.db.insert('safesparkVersions', {
        projectId: projectNew as Id<'safesparkProjects'>,
        clerkUserId: v.clerkUserId,
        html: v.html,
        label: v.label,
        summary: v.summary,
        prompt: v.prompt,
        createdAt: v.createdAt,
      });
      inserted.versions++;
    }

    // 7) shares — dedupe by shortId
    for (const s of data.shares) {
      const existing = await ctx.db.query('safesparkShares').withIndex('by_short_id', (q) => q.eq('shortId', s.shortId)).first();
      if (existing) { skipped.shares++; continue; }
      await ctx.db.insert('safesparkShares', {
        shortId: s.shortId,
        title: s.title,
        html: s.html,
        ownerClerkUserId: s.ownerClerkUserId,
        ownerEmail: s.ownerEmail,
        views: s.views,
        createdAt: s.createdAt,
      });
      inserted.shares++;
    }

    // 8) requests — dedupe by createdAt + clerkUserId
    for (const r of data.requests) {
      const candidates = await ctx.db.query('safesparkRequests').withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', r.clerkUserId)).collect();
      const existing = candidates.find((c) => c.createdAt === r.createdAt);
      if (existing) { skipped.requests++; continue; }
      let projectNew = r.projectId ? projectIdMap.get(r.projectId) : undefined;
      if (r.projectId && !projectNew) {
        const sourceProject = sourceProjectsById.get(r.projectId);
        if (sourceProject) {
          const candidates2 = await ctx.db.query('safesparkProjects').withIndex('by_clerk_id', (q) => q.eq('clerkUserId', sourceProject.clerkUserId)).collect();
          const match = candidates2.find((c) => c.title === sourceProject.title && c.createdAt === sourceProject.createdAt);
          if (match) projectNew = match._id;
        }
      }
      await ctx.db.insert('safesparkRequests', {
        clerkUserId: r.clerkUserId,
        email: r.email,
        prompt: r.prompt,
        projectId: projectNew as Id<'safesparkProjects'> | undefined,
        projectTitle: r.projectTitle,
        createdAt: r.createdAt,
      });
      inserted.requests++;
    }

    // 9) usage — dedupe by (clerkUserId, yearMonth) since the table is per-month rollups
    for (const u of data.usage) {
      const existing = await ctx.db.query('safesparkUsage').withIndex('by_clerk_month', (q) => q.eq('clerkUserId', u.clerkUserId).eq('yearMonth', u.yearMonth)).first();
      if (existing) {
        // Merge counters (additive) so we don't lose data
        await ctx.db.patch(existing._id, {
          chatTurns: existing.chatTurns + u.chatTurns,
          chatInputTokens: existing.chatInputTokens + u.chatInputTokens,
          chatOutputTokens: existing.chatOutputTokens + u.chatOutputTokens,
          imageTransforms: existing.imageTransforms + u.imageTransforms,
          totalCents: existing.totalCents + u.totalCents,
          updatedAt: Math.max(existing.updatedAt, u.updatedAt),
        });
        skipped.usage++;
        continue;
      }
      await ctx.db.insert('safesparkUsage', {
        clerkUserId: u.clerkUserId,
        email: u.email,
        yearMonth: u.yearMonth,
        chatTurns: u.chatTurns,
        chatInputTokens: u.chatInputTokens,
        chatOutputTokens: u.chatOutputTokens,
        imageTransforms: u.imageTransforms,
        totalCents: u.totalCents,
        updatedAt: u.updatedAt,
      });
      inserted.usage++;
    }

    // 10) errors — best-effort, dedupe by createdAt
    for (const e of data.errors) {
      const recent = await ctx.db.query('safesparkErrors').withIndex('by_time').order('desc').take(500);
      if (recent.some((r) => r.createdAt === e.createdAt && r.prompt === e.prompt)) { skipped.errors++; continue; }
      await ctx.db.insert('safesparkErrors', {
        clerkUserId: e.clerkUserId,
        email: e.email,
        prompt: e.prompt,
        kind: e.kind,
        message: e.message,
        contextSize: e.contextSize,
        createdAt: e.createdAt,
      });
      inserted.errors++;
    }

    return { inserted, skipped };
  },
});

// CLI-only diagnostic: dry-run a reassignment. Returns counts that would
// change, without writing. Useful to confirm scope before committing.
export const adminReassignDryRun = internalQuery({
  args: { fromClerkUserId: v.string(), toClerkUserId: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', args.fromClerkUserId))
      .collect();
    const projectIds = new Set(projects.map((p) => p._id));

    const allVersions = await ctx.db.query('safesparkVersions').collect();
    const versions = allVersions.filter(
      (v) => v.clerkUserId === args.fromClerkUserId || projectIds.has(v.projectId),
    );

    const requests = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', args.fromClerkUserId))
      .collect();

    const usage = await ctx.db
      .query('safesparkUsage')
      .withIndex('by_clerk_month', (q) => q.eq('clerkUserId', args.fromClerkUserId))
      .collect();

    const shares = (await ctx.db.query('safesparkShares').collect()).filter(
      (s) => s.ownerClerkUserId === args.fromClerkUserId,
    );

    return {
      fromClerkUserId: args.fromClerkUserId,
      toClerkUserId: args.toClerkUserId,
      counts: {
        projects: projects.length,
        versions: versions.length,
        requests: requests.length,
        usage: usage.length,
        shares: shares.length,
      },
      projectTitles: projects.map((p) => ({ id: p._id, title: p.title, deleted: !!p.deletedAt })),
    };
  },
});

// CLI-only: do the reassignment. Updates clerkUserId on every project,
// version, request, usage, and share row owned by fromClerkUserId.
// Preserves all row IDs, share shortIds, and HTML payloads exactly.
export const adminReassignProjectsToProfile = internalMutation({
  args: { fromClerkUserId: v.string(), toClerkUserId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projects = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', args.fromClerkUserId))
      .collect();
    const projectIds = new Set(projects.map((p) => p._id));

    let movedProjects = 0;
    for (const p of projects) {
      await ctx.db.patch(p._id, { clerkUserId: args.toClerkUserId, updatedAt: now });
      movedProjects++;
    }

    const allVersions = await ctx.db.query('safesparkVersions').collect();
    let movedVersions = 0;
    for (const v of allVersions) {
      if (v.clerkUserId === args.fromClerkUserId || projectIds.has(v.projectId)) {
        await ctx.db.patch(v._id, { clerkUserId: args.toClerkUserId });
        movedVersions++;
      }
    }

    const requests = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', args.fromClerkUserId))
      .collect();
    let movedRequests = 0;
    for (const r of requests) {
      await ctx.db.patch(r._id, { clerkUserId: args.toClerkUserId });
      movedRequests++;
    }

    const usage = await ctx.db
      .query('safesparkUsage')
      .withIndex('by_clerk_month', (q) => q.eq('clerkUserId', args.fromClerkUserId))
      .collect();
    let movedUsage = 0;
    for (const u of usage) {
      const dest = await ctx.db
        .query('safesparkUsage')
        .withIndex('by_clerk_month', (q) =>
          q.eq('clerkUserId', args.toClerkUserId).eq('yearMonth', u.yearMonth),
        )
        .first();
      if (dest) {
        await ctx.db.patch(dest._id, {
          chatTurns: dest.chatTurns + u.chatTurns,
          chatInputTokens: dest.chatInputTokens + u.chatInputTokens,
          chatOutputTokens: dest.chatOutputTokens + u.chatOutputTokens,
          imageTransforms: dest.imageTransforms + u.imageTransforms,
          totalCents: dest.totalCents + u.totalCents,
          updatedAt: Math.max(dest.updatedAt, u.updatedAt),
        });
        await ctx.db.delete(u._id);
      } else {
        await ctx.db.patch(u._id, { clerkUserId: args.toClerkUserId });
      }
      movedUsage++;
    }

    const shares = (await ctx.db.query('safesparkShares').collect()).filter(
      (s) => s.ownerClerkUserId === args.fromClerkUserId,
    );
    let movedShares = 0;
    for (const s of shares) {
      await ctx.db.patch(s._id, { ownerClerkUserId: args.toClerkUserId });
      movedShares++;
    }

    return {
      from: args.fromClerkUserId,
      to: args.toClerkUserId,
      moved: {
        projects: movedProjects,
        versions: movedVersions,
        requests: movedRequests,
        usage: movedUsage,
        shares: movedShares,
      },
    };
  },
});

// CLI-only: provision a complete family for a Clerk user who's never
// visited /parent. Creates the users row (parent role), family with a
// fresh code, and an initial kid profile. Idempotent.
export const adminProvisionFamily = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    displayName: v.string(),
    kidName: v.string(),
    kidAge: v.number(),
    kidSex: v.union(v.literal('boy'), v.literal('girl')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', args.clerkUserId))
      .first();
    if (!user) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: args.clerkUserId,
        email: args.email,
        displayName: args.displayName,
        role: 'parent',
        createdAt: now,
      });
      user = await ctx.db.get(userId);
    }
    if (!user) throw new Error('User insert failed.');

    let family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', user!._id))
      .first();
    if (!family) {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        code = '';
        for (let i = 0; i < 6; i++) {
          code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        const clash = await ctx.db
          .query('families')
          .withIndex('by_code', (q) => q.eq('familyCode', code))
          .first();
        if (!clash) break;
      }
      const familyId = await ctx.db.insert('families', {
        parentUserId: user._id,
        familyCode: code,
        createdAt: now,
      });
      family = await ctx.db.get(familyId);
    }
    if (!family) throw new Error('Family insert failed.');

    const kidsInFamily = await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family!._id))
      .collect();
    const existingKid = kidsInFamily.find((k) => k.displayName === args.kidName);
    let kidId: Id<'kidProfiles'>;
    if (existingKid) {
      kidId = existingKid._id;
    } else {
      kidId = await ctx.db.insert('kidProfiles', {
        familyId: family._id,
        parentUserId: user._id,
        displayName: args.kidName,
        age: args.kidAge,
        sex: args.kidSex,
        interests: [],
        avoidTopics: [],
        personalityLayers: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      userId: user._id,
      familyId: family._id,
      familyCode: family.familyCode,
      kidProfileId: kidId,
      kidSyntheticClerkId: `kid:${kidId}`,
    };
  },
});

// CLI-only: patch a profile row to mark it as an adult self-profile.
// Clears age and sets sex='adult' so a parent can own their own projects
// alongside their kids without forcing a fake child age/sex.
export const adminMarkProfileAdult = internalMutation({
  args: { profileId: v.id('kidProfiles') },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error('Profile not found.');
    await ctx.db.patch(args.profileId, {
      sex: 'adult',
      age: undefined,
      updatedAt: Date.now(),
    });
    return { profileId: args.profileId, displayName: profile.displayName };
  },
});

// CLI-only one-shot: promote every legacy 'learner' Clerk user to 'parent'.
// SafeSpark treats every signed-up email as a parent; the old learner role
// only made sense in the BELLA trainer (which is tabled).
export const promoteAllLearnersToParents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const learners = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'learner'))
      .collect();
    for (const u of learners) {
      await ctx.db.patch(u._id, { role: 'parent' });
    }
    return { promoted: learners.length };
  },
});

// CLI-only: full export of one user's projects (with HTML + messages),
// for migration between dev and prod deployments.
export const exportUserProjects = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', args.clerkUserId))
      .order('desc')
      .take(100);
    return projects
      .filter((p) => !p.deletedAt)
      .map((p) => ({
        title: p.title,
        html: p.html,
        messages: p.messages,
        nextSteps: p.nextSteps ?? [],
        lastPrompt: p.lastPrompt,
        lastReply: p.lastReply,
        email: p.email,
        updatedAt: p.updatedAt,
      }));
  },
});

// CLI-only: inspect a specific user's most recent projects by email OR
// clerkUserId (Convex users row not required — looks straight at the
// safesparkProjects table).
export const inspectProjects = internalQuery({
  args: { email: v.optional(v.string()), clerkUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let clerkUserId = args.clerkUserId;
    if (!clerkUserId && args.email) {
      const lowered = args.email.toLowerCase();
      // Try users table first
      const user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', lowered))
        .first();
      if (user) clerkUserId = user.clerkUserId;
      // Fall back to looking it up via any project row with this email
      if (!clerkUserId) {
        const anyProject = (await ctx.db.query('safesparkProjects').collect()).find(
          (p) => p.email.toLowerCase() === lowered,
        );
        clerkUserId = anyProject?.clerkUserId;
      }
    }
    if (!clerkUserId) return { error: 'no user' };
    const projects = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId!))
      .order('desc')
      .take(20);
    return projects.map((p) => ({
      id: p._id,
      title: p.title,
      htmlBytes: new TextEncoder().encode(p.html).length,
      messageCount: p.messages.length,
      lastPrompt: p.lastPrompt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt ?? null,
    }));
  },
});

// CLI-only: recent prompts across all users (with content). For diagnosing
// what a user just tried.
export const recentPrompts = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 25, 200);
    const rows = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_time')
      .order('desc')
      .take(limit);
    return rows.map((row) => ({
      id: row._id,
      email: row.email,
      clerkUserId: row.clerkUserId,
      prompt: row.prompt,
      projectTitle: row.projectTitle,
      createdAt: row.createdAt,
      whenAgo: humanAgo(Date.now() - row.createdAt),
    }));
  },
});

function humanAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

// CLI-only: count of prompts in the request log per user (no contents).
export const promptCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query('safesparkRequests').collect();
    const byUser = new Map<string, { email: string; count: number; first: number; last: number }>();
    for (const r of requests) {
      const key = r.clerkUserId;
      const existing = byUser.get(key);
      if (existing) {
        existing.count += 1;
        existing.first = Math.min(existing.first, r.createdAt);
        existing.last = Math.max(existing.last, r.createdAt);
      } else {
        byUser.set(key, { email: r.email, count: 1, first: r.createdAt, last: r.createdAt });
      }
    }
    return [...byUser.entries()].map(([clerkUserId, v]) => ({ clerkUserId, ...v }));
  },
});

// Admin-only via CLI/internal: distinct SafeSpark users (no prompt content).
// Internal functions aren't exposed to the browser; only the CLI deploy key
// (which the operator holds) can call them.
export const listUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query('safesparkProjects').collect();
    const byUser = new Map<string, { clerkUserId: string; email: string; projects: number; lastUpdate: number }>();
    for (const p of projects) {
      const existing = byUser.get(p.clerkUserId);
      if (existing) {
        existing.projects += 1;
        existing.lastUpdate = Math.max(existing.lastUpdate, p.updatedAt);
      } else {
        byUser.set(p.clerkUserId, {
          clerkUserId: p.clerkUserId,
          email: p.email,
          projects: 1,
          lastUpdate: p.updatedAt,
        });
      }
    }
    return [...byUser.values()].sort((a, b) => b.lastUpdate - a.lastUpdate);
  },
});

// Admin-only via CLI/internal: directly seed a project for a target user.
// Used to import an existing HTML artifact (e.g. Knox's Pokemon Quest)
// into a user's account.
export const adminSeedProject = internalMutation({
  args: {
    targetClerkUserId: v.string(),
    targetEmail: v.string(),
    title: v.string(),
    html: v.string(),
    versionLabel: v.string(),
    versionSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert('safesparkProjects', {
      clerkUserId: args.targetClerkUserId,
      email: args.targetEmail,
      title: args.title.slice(0, 120),
      html: args.html,
      messages: [
        {
          role: 'assistant',
          content: `Imported "${args.title}" into your account. Tell me what you want to change.`,
        },
      ],
      nextSteps: [],
      lastPrompt: undefined,
      lastReply: `Imported "${args.title}". Pick up from here.`,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('safesparkVersions', {
      projectId,
      clerkUserId: args.targetClerkUserId,
      html: args.html,
      label: args.versionLabel.slice(0, 80),
      summary: args.versionSummary?.slice(0, 240),
      prompt: undefined,
      createdAt: now,
    });
    return projectId;
  },
});

// Pricing constants in fractional cents per token. Kept here so the cost
// math is reviewable in one place. Update when model prices change.
const PRICE_CENTS_PER_INPUT_TOKEN_GPT55 = 0.000125;   // $1.25 / 1M tokens
const PRICE_CENTS_PER_OUTPUT_TOKEN_GPT55 = 0.001;     // $10 / 1M tokens
const PRICE_CENTS_PER_IMAGE_TRANSFORM = 6;            // $0.06 medium 1024x1024
// gpt-image-1 GENERATION at 1024x1024 by quality (output-image-token pricing).
// 'medium' is the SafeSpark default; 'high' is ~4x. Used so sprite generation
// shows up in safesparkUsage — previously generated on every build but never
// counted, which is why the tracked spend was a fraction of the real bill.
const PRICE_CENTS_PER_SPRITE: Record<string, number> = {
  low: 1.1,
  medium: 4.2,
  high: 16.7,
};

function yearMonthUTC(now: number): string {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Record ONE freshly-generated sprite against the kid's monthly usage so image
// spend stops being invisible. Fired best-effort from generateSpriteSafely on a
// cache MISS only — cache hits and failures cost nothing and aren't recorded.
// quality sets the price (medium default). Aggregates into the same per-(kid,
// month) row as chat usage, so totalCents finally reflects reality.
export const recordSpriteUsage = mutation({
  args: { sessionToken: v.optional(v.string()), quality: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let identity: { clerkUserId: string; email: string };
    try {
      identity = await resolveSafeSparkIdentity(ctx as SafeSparkCtx, args.sessionToken);
    } catch {
      return { ok: false, reason: 'no identity' };
    }
    const { clerkUserId, email } = identity;
    const now = Date.now();
    const yearMonth = yearMonthUTC(now);
    const cents =
      PRICE_CENTS_PER_SPRITE[args.quality ?? 'medium'] ?? PRICE_CENTS_PER_SPRITE.medium;
    const existing = await ctx.db
      .query('safesparkUsage')
      .withIndex('by_clerk_month', (q) =>
        q.eq('clerkUserId', clerkUserId).eq('yearMonth', yearMonth),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        spriteImages: (existing.spriteImages ?? 0) + 1,
        totalCents: existing.totalCents + cents,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('safesparkUsage', {
        clerkUserId,
        email,
        yearMonth,
        chatTurns: 0,
        chatInputTokens: 0,
        chatOutputTokens: 0,
        imageTransforms: 0,
        spriteImages: 1,
        totalCents: cents,
        updatedAt: now,
      });
    }
    return { ok: true };
  },
});

export const recordUsage = mutation({
  args: {
    chatInputTokens: v.optional(v.number()),
    chatOutputTokens: v.optional(v.number()),
    imageTransforms: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clerkUserId, email } = await resolveSafeSparkIdentity(
      ctx as SafeSparkCtx,
      args.sessionToken,
    );
    const now = Date.now();
    const yearMonth = yearMonthUTC(now);
    const chatInputTokens = args.chatInputTokens ?? 0;
    const chatOutputTokens = args.chatOutputTokens ?? 0;
    const imageTransforms = args.imageTransforms ?? 0;
    const turnAdd = chatInputTokens > 0 || chatOutputTokens > 0 ? 1 : 0;
    const cents =
      chatInputTokens * PRICE_CENTS_PER_INPUT_TOKEN_GPT55 +
      chatOutputTokens * PRICE_CENTS_PER_OUTPUT_TOKEN_GPT55 +
      imageTransforms * PRICE_CENTS_PER_IMAGE_TRANSFORM;
    const existing = await ctx.db
      .query('safesparkUsage')
      .withIndex('by_clerk_month', (q) =>
        q.eq('clerkUserId', clerkUserId).eq('yearMonth', yearMonth),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        chatTurns: existing.chatTurns + turnAdd,
        chatInputTokens: existing.chatInputTokens + chatInputTokens,
        chatOutputTokens: existing.chatOutputTokens + chatOutputTokens,
        imageTransforms: existing.imageTransforms + imageTransforms,
        totalCents: existing.totalCents + cents,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('safesparkUsage', {
        clerkUserId,
        email,
        yearMonth,
        chatTurns: turnAdd,
        chatInputTokens,
        chatOutputTokens,
        imageTransforms,
        totalCents: cents,
        updatedAt: now,
      });
    }
  },
});

// Parent's view: this month's total cost across the whole family (the
// parent's Clerk user + every kid:<profileId> in the family).
// Per-family monthly caps. Parents see a progress meter against these, not
// a dollar amount. Cap values live here so /admin and /api/demo can read
// the same source of truth when we wire enforcement.
const FAMILY_MONTHLY_CAPS = {
  chatTurns: 500,
  imageTransforms: 25,
} as const;

export const getFamilyUsageThisMonth = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return null;
    const { row: userRow, clerkUserId } = resolved;
    const yearMonth = yearMonthUTC(Date.now());
    const ids: string[] = [clerkUserId];
    const family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', userRow._id))
      .first();
    if (family) {
      const kids = await ctx.db
        .query('kidProfiles')
        .withIndex('by_family', (q) => q.eq('familyId', family._id))
        .collect();
      for (const k of kids) ids.push(`kid:${k._id}`);
    }
    let totalCents = 0;
    let chatTurns = 0;
    let imageTransforms = 0;
    const perMember: { clerkUserId: string; email: string; cents: number; turns: number; images: number }[] = [];
    for (const id of ids) {
      const row = await ctx.db
        .query('safesparkUsage')
        .withIndex('by_clerk_month', (q) => q.eq('clerkUserId', id).eq('yearMonth', yearMonth))
        .first();
      if (row) {
        totalCents += row.totalCents;
        chatTurns += row.chatTurns;
        imageTransforms += row.imageTransforms;
        perMember.push({
          clerkUserId: row.clerkUserId,
          email: row.email,
          cents: row.totalCents,
          turns: row.chatTurns,
          images: row.imageTransforms,
        });
      }
    }
    const turnsCap = FAMILY_MONTHLY_CAPS.chatTurns;
    const imagesCap = FAMILY_MONTHLY_CAPS.imageTransforms;
    const turnsPct = Math.min(100, Math.round((chatTurns / turnsCap) * 100));
    const imagesPct = Math.min(100, Math.round((imageTransforms / imagesCap) * 100));
    return {
      yearMonth,
      totalCents,
      chatTurns,
      imageTransforms,
      perMember,
      caps: { chatTurns: turnsCap, imageTransforms: imagesCap },
      pct: { chatTurns: turnsPct, imageTransforms: imagesPct },
    };
  },
});

// Parent dashboard: every project across every kid in this Clerk user's family,
// plus the family code so the parent can hand it to a kid for /start login.
export const listFamilyForParent = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return null;
    const { row: userRow, clerkUserId } = resolved;
    const family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', userRow._id))
      .first();
    if (!family) {
      return {
        family: null,
        kids: [],
        parentProjects: [],
      };
    }
    const kidProfiles = await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family._id))
      .collect();
    const kids = [];
    for (const profile of kidProfiles) {
      const projects = await ctx.db
        .query('safesparkProjects')
        .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', `kid:${profile._id}`))
        .order('desc')
        .take(30);
      kids.push({
        id: profile._id,
        displayName: profile.displayName,
        age: profile.age,
        avatarColor: profile.avatarColor,
        projects: projects
          .filter((p) => !p.deletedAt)
          .map((p) => ({
            id: p._id,
            title: p.title,
            html: p.html,
            updatedAt: p.updatedAt,
            lastPrompt: p.lastPrompt,
          })),
      });
    }
    const parentProjects = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId))
      .order('desc')
      .take(30);
    return {
      family: { id: family._id, code: family.familyCode, name: family.familyName },
      kids,
      parentProjects: parentProjects
        .filter((p) => !p.deletedAt)
        .map((p) => ({
          id: p._id,
          title: p.title,
          html: p.html,
          updatedAt: p.updatedAt,
          lastPrompt: p.lastPrompt,
        })),
    };
  },
});

// Parent dashboard activity feed — mixed chronological list of recent
// kid events across the whole family. Combines safesparkRequests (every
// kid prompt) + safesparkErrors with kind='blocked_topic' (refused
// prompts that matched the parent's blocklist). One UI row per event,
// tagged with kid name + event type so the dashboard can color/icon
// appropriately. Capped to the last `limit` events (default 30).
//
// Used by /parent home page. Auth via userToken (Marketing JWT) → email
// fallback → SafeSpark user row → family kids.
export const getActivityForFamily = query({
  args: {
    userToken: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return { events: [], kids: [] };
    const family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', resolved.row._id))
      .first();
    if (!family) return { events: [], kids: [] };
    const kidProfiles = (await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family._id))
      .collect()) as Array<{ _id: Id<'kidProfiles'>; displayName: string; avatarColor?: string }>;

    const limit = Math.min(Math.max(args.limit ?? 30, 5), 100);
    type Event = {
      kind: 'prompt' | 'blocked';
      kidProfileId: Id<'kidProfiles'>;
      kidName: string;
      avatarColor: string;
      content: string;
      projectTitle?: string;
      createdAt: number;
    };
    const events: Event[] = [];

    for (const profile of kidProfiles) {
      const ownerKey = `kid:${profile._id}`;
      // Recent prompts
      const prompts = await ctx.db
        .query('safesparkRequests')
        .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerKey))
        .order('desc')
        .take(limit);
      for (const p of prompts) {
        events.push({
          kind: 'prompt',
          kidProfileId: profile._id,
          kidName: profile.displayName,
          avatarColor: profile.avatarColor ?? 'violet',
          content: p.prompt,
          projectTitle: p.projectTitle ?? undefined,
          createdAt: p.createdAt,
        });
      }
      // Recent blocks (subset of safesparkErrors). No index on
      // (clerkUserId, kind) so we collect by clerkUserId then filter —
      // the per-kid error volume is tiny so this is cheap.
      const errors = await ctx.db
        .query('safesparkErrors')
        .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerKey))
        .order('desc')
        .take(limit);
      for (const e of errors) {
        if (e.kind !== 'blocked_topic') continue;
        events.push({
          kind: 'blocked',
          kidProfileId: profile._id,
          kidName: profile.displayName,
          avatarColor: profile.avatarColor ?? 'violet',
          content: e.prompt,
          createdAt: e.createdAt,
        });
      }
    }

    events.sort((a, b) => b.createdAt - a.createdAt);
    return {
      events: events.slice(0, limit),
      kids: kidProfiles.map((p) => ({
        id: p._id,
        displayName: p.displayName,
        avatarColor: p.avatarColor ?? 'violet',
      })),
    };
  },
});

// Per-kid daily stats for the parent dashboard cards. Returns a row per
// kid with: prompts today, blocked-topic hits today, last-active
// timestamp (most recent prompt OR block, whichever is later), and the
// kid's daily query budget for context. Computed off today's UTC day
// boundary — close enough to "today" for the dashboard without dragging
// timezone math through every query.
export const getKidStatsToday = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return [];
    const family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', resolved.row._id))
      .first();
    if (!family) return [];
    const kidProfiles = (await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family._id))
      .collect()) as Array<{
        _id: Id<'kidProfiles'>;
        displayName: string;
        avatarColor?: string;
        dailyQueryBudget?: number;
        accessPaused?: boolean;
      }>;

    const now = Date.now();
    const startOfTodayUtc = Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate(),
    );

    const out: Array<{
      id: Id<'kidProfiles'>;
      displayName: string;
      avatarColor: string;
      promptsToday: number;
      blockedToday: number;
      lastActiveAt: number | null;
      dailyQueryBudget?: number;
      accessPaused: boolean;
    }> = [];
    for (const profile of kidProfiles) {
      const ownerKey = `kid:${profile._id}`;
      // Pull recent prompts (cap at 200 — anything beyond is "old", we
      // only need today's count + last timestamp).
      const recentPrompts = await ctx.db
        .query('safesparkRequests')
        .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerKey))
        .order('desc')
        .take(200);
      const promptsToday = recentPrompts.filter((p) => p.createdAt >= startOfTodayUtc).length;
      const lastPromptAt = recentPrompts[0]?.createdAt ?? null;

      const recentErrors = await ctx.db
        .query('safesparkErrors')
        .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerKey))
        .order('desc')
        .take(50);
      const blockedToday = recentErrors.filter(
        (e) => e.kind === 'blocked_topic' && e.createdAt >= startOfTodayUtc,
      ).length;
      const lastBlockedAt = recentErrors.find((e) => e.kind === 'blocked_topic')?.createdAt ?? null;

      const lastActiveAt = Math.max(lastPromptAt ?? 0, lastBlockedAt ?? 0) || null;

      out.push({
        id: profile._id,
        displayName: profile.displayName,
        avatarColor: profile.avatarColor ?? 'violet',
        promptsToday,
        blockedToday,
        lastActiveAt,
        dailyQueryBudget: profile.dailyQueryBudget,
        accessPaused: profile.accessPaused === true,
      });
    }
    return out;
  },
});

// One-profile drill-down for /parent/profile/[id]. Auth: the signed-in
// parent must own this kidProfile (either as the legacy parentUserId or
// as the family's parent). Returns the profile, every non-deleted project
// owned by it (full list, not capped at 8), recent requests, and the
// usage row for the current month.
export const getProfileDetail = query({
  args: { profileId: v.id('kidProfiles'), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return null;
    const parent = resolved.row;
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;
    if (profile.parentUserId !== parent._id) {
      const family = profile.familyId ? await ctx.db.get(profile.familyId) : null;
      if (!family || family.parentUserId !== parent._id) return null;
    }
    const ownerId = `kid:${profile._id}`;
    const projectsRaw = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', ownerId))
      .order('desc')
      .take(200);
    const projects = projectsRaw
      .filter((p) => !p.deletedAt)
      .map((p) => ({
        id: p._id,
        title: p.title,
        html: p.html,
        updatedAt: p.updatedAt,
        lastPrompt: p.lastPrompt,
        isCommunication: p.isCommunication === true,
      }));
    // Full activity log — bumped from 20 to 200 prompts. Combined
    // with blocked-topic errors and concern alerts for the chronological
    // log section.
    const requests = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerId))
      .order('desc')
      .take(200);
    const blockedRaw = await ctx.db
      .query('safesparkErrors')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerId))
      .order('desc')
      .take(100);
    const blocked = blockedRaw
      .filter((e) => e.kind === 'blocked_topic')
      .slice(0, 50);
    const concerns = await ctx.db
      .query('safesparkConcernAlerts')
      .withIndex('by_kid_time', (q) => q.eq('kidProfileId', profile._id))
      .order('desc')
      .take(20);
    const yearMonth = yearMonthUTC(Date.now());
    const usageRow = await ctx.db
      .query('safesparkUsage')
      .withIndex('by_clerk_month', (q) =>
        q.eq('clerkUserId', ownerId).eq('yearMonth', yearMonth),
      )
      .first();
    return {
      profile: {
        id: profile._id,
        displayName: profile.displayName,
        age: profile.age,
        sex: profile.sex,
        avatarColor: profile.avatarColor,
        interests: profile.interests,
        avoidTopics: profile.avoidTopics,
      },
      projects,
      recentRequests: requests.map((r) => ({
        id: r._id,
        createdAt: r.createdAt,
        prompt: r.prompt,
        projectTitle: r.projectTitle,
      })),
      blockedEvents: blocked.map((e) => ({
        id: e._id,
        createdAt: e.createdAt,
        prompt: e.prompt,
        // `message` is set by logBlockedTopicAsync as "Blocked phrase: <X>"
        message: e.message,
      })),
      concernAlerts: concerns.map((c) => ({
        id: c._id,
        createdAt: c.createdAt,
        query: c.query,
        category: c.category,
        rationale: c.rationale,
        acknowledged: c.acknowledged,
      })),
      usageThisMonth: usageRow
        ? {
            chatTurns: usageRow.chatTurns,
            imageTransforms: usageRow.imageTransforms,
          }
        : { chatTurns: 0, imageTransforms: 0 },
    };
  },
});

export const deleteProject = mutation({
  args: { id: v.id('safesparkProjects'), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { clerkUserId } = await resolveSafeSparkIdentity(ctx as SafeSparkCtx, args.sessionToken);
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (existing.clerkUserId !== clerkUserId) throw new Error('You do not own that project.');
    // Soft delete — stays in the 30-day recycle bin then a cron can purge.
    await ctx.db.patch(args.id, { deletedAt: Date.now() });
  },
});

// -----------------------------------------------------------------------------
// Parent-controlled per-kid kill switches + topic blocklist.
//
// Treat undefined flags as ON. The four boolean toggles let a parent turn off
// a feature for a specific kid; `blockedTopics` is a small list of phrases
// Spark must refuse to build projects about. Enforced server-side in
// /api/demo/route.ts and in createShareLink above.
// -----------------------------------------------------------------------------

async function requireParentOfKid(
  ctx: { auth: { getUserIdentity: () => Promise<unknown> }; db: any },
  kidProfileId: Id<'kidProfiles'>,
  userToken?: string,
): Promise<{ profile: any; parentUserId: Id<'users'> }> {
  const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, userToken);
  if (!resolved) throw new Error('Sign in to manage kid settings.');
  const parent = resolved.row;
  const profile = await ctx.db.get(kidProfileId);
  if (!profile) throw new Error('Kid profile not found.');
  if (profile.parentUserId !== parent._id) {
    throw new Error('You do not own that kid profile.');
  }
  return { profile, parentUserId: parent._id };
}

// Parent-facing: move ONE project from one of their kids to another.
// Re-stamps the project + its versions + its share rows with the
// destination kid's synthetic clerkUserId (kid:<profileId>). Parent must
// own BOTH the source and destination profiles. HTML, title, share
// shortIds and all row IDs are preserved. (The CLI adminReassign* tools
// move ALL of a kid's projects in bulk; this is the per-game version.)
export const moveProjectToKid = mutation({
  args: {
    projectId: v.id('safesparkProjects'),
    toKidProfileId: v.id('kidProfiles'),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Parent must own the destination kid.
    const { parentUserId, profile: destProfile } = await requireParentOfKid(
      ctx as never,
      args.toKidProfileId,
      args.userToken,
    );

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found.');

    // Derive the source kid from the project owner and confirm the parent
    // owns it too — a parent can only shuffle games among their own kids.
    const owner = project.clerkUserId || '';
    if (!owner.startsWith('kid:')) {
      throw new Error("That project isn't owned by a kid profile.");
    }
    const srcProfileId = owner.slice(4) as Id<'kidProfiles'>;
    if (srcProfileId === args.toKidProfileId) {
      return { ok: true, moved: false, title: project.title };
    }
    const srcProfile = await ctx.db.get(srcProfileId);
    if (!srcProfile || srcProfile.parentUserId !== parentUserId) {
      throw new Error('You do not own the source kid profile.');
    }

    const newOwner = `kid:${args.toKidProfileId}`;
    const now = Date.now();

    await ctx.db.patch(project._id, {
      clerkUserId: newOwner,
      email: destProfile.displayName,
      updatedAt: now,
    });

    // Versions are keyed by projectId — re-stamp owner on each.
    const versions = await ctx.db
      .query('safesparkVersions')
      .withIndex('by_project_time', (q) => q.eq('projectId', project._id))
      .collect();
    for (const ver of versions) {
      await ctx.db.patch(ver._id, { clerkUserId: newOwner });
    }

    // Share rows for this project keep their shortId (public URL unchanged).
    const shares = await ctx.db
      .query('safesparkShares')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect();
    for (const sh of shares) {
      if (sh.ownerClerkUserId === owner) {
        await ctx.db.patch(sh._id, { ownerClerkUserId: newOwner });
      }
    }

    return {
      ok: true,
      moved: true,
      title: project.title,
      versions: versions.length,
      to: destProfile.displayName,
    };
  },
});

export const getKidSettings = query({
  args: { kidProfileId: v.id('kidProfiles'), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return null;
    const parent = resolved.row;
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    if (profile.parentUserId !== parent._id) return null;
    return {
      allowImageRestyle: profile.allowImageRestyle !== false,
      allowVoice: profile.allowVoice !== false,
      allowWebData: profile.allowWebData !== false,
      allowSharing: profile.allowSharing !== false,
      blockedTopics: profile.blockedTopics ?? [],
      accessPaused: profile.accessPaused === true,
      dailyQueryBudget: profile.dailyQueryBudget,
    };
  },
});

export const setKidSettings = mutation({
  args: {
    kidProfileId: v.id('kidProfiles'),
    allowImageRestyle: v.optional(v.boolean()),
    allowVoice: v.optional(v.boolean()),
    allowWebData: v.optional(v.boolean()),
    allowSharing: v.optional(v.boolean()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireParentOfKid(ctx as never, args.kidProfileId, args.userToken);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.allowImageRestyle !== undefined) patch.allowImageRestyle = args.allowImageRestyle;
    if (args.allowVoice !== undefined) patch.allowVoice = args.allowVoice;
    if (args.allowWebData !== undefined) patch.allowWebData = args.allowWebData;
    if (args.allowSharing !== undefined) patch.allowSharing = args.allowSharing;
    await ctx.db.patch(args.kidProfileId, patch);
    return { ok: true };
  },
});

export const setBlockedTopics = mutation({
  args: {
    kidProfileId: v.id('kidProfiles'),
    topics: v.array(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireParentOfKid(ctx as never, args.kidProfileId, args.userToken);
    const cleaned = Array.from(
      new Set(
        args.topics
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0 && t.length <= 80),
      ),
    ).slice(0, 50);
    await ctx.db.patch(args.kidProfileId, {
      blockedTopics: cleaned,
      updatedAt: Date.now(),
    });
    return { ok: true, topics: cleaned };
  },
});

// Phase 2 dashboard control — pause / unpause a kid's Spark access.
// When paused, /api/demo refuses new builds for that kid before the
// LLM call so no token is burned. Toggled from the per-kid metric strip
// on /parent.
export const setKidAccessPaused = mutation({
  args: {
    kidProfileId: v.id('kidProfiles'),
    paused: v.boolean(),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireParentOfKid(ctx as never, args.kidProfileId, args.userToken);
    await ctx.db.patch(args.kidProfileId, {
      accessPaused: args.paused,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// Phase 2 dashboard control — set a per-kid daily prompt cap. 0 or
// undefined removes the cap. Range clamped to [1, 500] so a parent
// can't lock the kid out of single prompts or accidentally enter
// thousands. Enforced server-side in /api/demo against today's UTC
// prompt count from safesparkRequests.
export const setKidDailyBudget = mutation({
  args: {
    kidProfileId: v.id('kidProfiles'),
    budget: v.optional(v.number()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireParentOfKid(ctx as never, args.kidProfileId, args.userToken);
    let clamped: number | undefined;
    if (args.budget != null && args.budget > 0) {
      clamped = Math.max(1, Math.min(500, Math.round(args.budget)));
    }
    await ctx.db.patch(args.kidProfileId, {
      dailyQueryBudget: clamped,
      updatedAt: Date.now(),
    });
    return { ok: true, dailyQueryBudget: clamped };
  },
});

// Client-readable lookup for the kid side: given a kidSession token, return
// the four kill-switch flags so the front end can hide UI (e.g. mic) the
// parent has turned off. Returns null for unknown tokens.
export const getKidSettingsBySession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return null;
    const profile = await ctx.db.get(session.kidProfileId);
    if (!profile) return null;
    return {
      allowImageRestyle: profile.allowImageRestyle !== false,
      allowVoice: profile.allowVoice !== false,
      allowWebData: profile.allowWebData !== false,
      allowSharing: profile.allowSharing !== false,
    };
  },
});

// Single-shot data fetch for the kid /dashboard page. Returns profile
// basics + a precomputed slice of projects + lightweight stats so the
// landing render is one round trip, not five. Added 2026-05-29 when we
// stood up the kid dashboard surface.
export const getKidDashboardData = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return null;
    const profile = await ctx.db.get(session.kidProfileId);
    if (!profile) return null;

    const clerkUserId = `kid:${session.kidProfileId}`;
    const family = profile.familyId ? await ctx.db.get(profile.familyId) : null;
    const projects = await ctx.db
      .query('safesparkProjects')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', clerkUserId))
      .order('desc')
      .take(100);
    const active = projects.filter((p) => !p.deletedAt);

    // Stats are bucketed by UTC day boundary. Family timezone isn't
    // tracked on the families table today (could be added later if
    // stats granularity becomes a complaint).
    const now = new Date();
    const startOfDayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const buildsToday = active.filter((p) => p.updatedAt >= startOfDayMs).length;
    const buildsThisWeek = active.filter((p) => p.updatedAt >= weekAgoMs).length;
    const mostRecent = active[0] ?? null;

    return {
      profile: {
        id: profile._id,
        displayName: profile.displayName,
        age: profile.age,
        avatarColor: profile.avatarColor,
        interests: profile.interests,
      },
      // Family code drives cross-app deeplinks (?fc=XXXXXX auto-fills
      // the family code box on SafeTunes / SafeTube / SafeReads /
      // SafeStudy). Null when the kid's profile somehow lost its
      // family link — cross-app launcher will fall back to no-suffix.
      familyCode: family?.familyCode ?? null,
      stats: {
        totalProjects: active.length,
        buildsToday,
        buildsThisWeek,
      },
      mostRecent: mostRecent
        ? {
            id: mostRecent._id,
            title: mostRecent.title,
            updatedAt: mostRecent.updatedAt,
            lastPrompt: mostRecent.lastPrompt,
          }
        : null,
      recentProjects: active.slice(0, 8).map((p) => ({
        id: p._id,
        title: p.title,
        html: p.html,
        updatedAt: p.updatedAt,
        lastPrompt: p.lastPrompt,
        isCommunication: p.isCommunication === true,
      })),
    };
  },
});

// Server-only lookup used by /api/demo to fetch the full kill-switch +
// blocklist state for a kid session. Public because /api/demo runs without
// the kid's Clerk JWT; the sessionToken itself is the bearer secret.
// Phase 3 — kid-side: ask permission for a blocked topic. Called from
// the workbench right after the kid sees the blocked-topic refusal.
// Resolves the kid's parent + kid name from the session so the parent
// dashboard can render the pending request row with no extra joins.
// Dedupes against any pending row for the same (kid, phrase) so a kid
// can't spam Approve by clicking 50 times.
export const requestTopicBySession = mutation({
  args: {
    sessionToken: v.string(),
    matchedPhrase: v.string(),
    originalPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return { ok: false, reason: 'no_session' };
    const profile = await ctx.db.get(session.kidProfileId);
    if (!profile) return { ok: false, reason: 'no_profile' };
    const family = profile.familyId ? await ctx.db.get(profile.familyId) : null;
    const parentUserId = family?.parentUserId ?? profile.parentUserId;
    if (!parentUserId) return { ok: false, reason: 'no_parent' };

    const phrase = args.matchedPhrase.trim().toLowerCase().slice(0, 80);
    if (!phrase) return { ok: false, reason: 'empty_phrase' };

    // Dedupe: if a pending request already exists for this (kid, phrase)
    // pair, bump nothing — return ok so the kid sees confirmation UI.
    const existing = await ctx.db
      .query('safesparkTopicRequests')
      .withIndex('by_kid_time', (q) => q.eq('kidProfileId', profile._id))
      .order('desc')
      .take(50);
    const dupe = existing.find(
      (r) => r.status === 'pending' && r.matchedPhrase === phrase,
    );
    if (dupe) return { ok: true, deduped: true };

    await ctx.db.insert('safesparkTopicRequests', {
      parentUserId,
      kidProfileId: profile._id,
      kidName: profile.displayName,
      matchedPhrase: phrase,
      originalPrompt: args.originalPrompt.slice(0, 1000),
      status: 'pending',
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// Phase 3 — parent-side: list pending topic requests for the dashboard.
// Returns newest first. Empty array if no requests or no family.
export const listPendingTopicRequests = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return [];
    const rows = await ctx.db
      .query('safesparkTopicRequests')
      .withIndex('by_parent_status', (q) =>
        q.eq('parentUserId', resolved.row._id).eq('status', 'pending'),
      )
      .order('desc')
      .take(50);
    return rows.map((r) => ({
      id: r._id,
      kidProfileId: r.kidProfileId,
      kidName: r.kidName,
      matchedPhrase: r.matchedPhrase,
      originalPrompt: r.originalPrompt,
      createdAt: r.createdAt,
    }));
  },
});

// Phase 3 — parent-side: approve or deny a topic request. On approve,
// the matched phrase is removed from the kid's blockedTopics so the
// next attempt at the same prompt goes through. On deny, the row is
// just marked resolved (the kid sees a quiet "your parent said not
// this time" message next time they try). Either way the row stays
// for audit/history.
export const resolveTopicRequest = mutation({
  args: {
    id: v.id('safesparkTopicRequests'),
    action: v.union(v.literal('approve'), v.literal('deny')),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) throw new Error('Sign in to resolve topic requests.');
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error('Request not found.');
    if (request.parentUserId !== resolved.row._id) {
      throw new Error('Not your request to resolve.');
    }
    if (request.status !== 'pending') {
      return { ok: true, alreadyResolved: true };
    }

    if (args.action === 'approve') {
      const profile = await ctx.db.get(request.kidProfileId);
      if (profile) {
        const next = (profile.blockedTopics ?? []).filter(
          (t) => t.toLowerCase() !== request.matchedPhrase.toLowerCase(),
        );
        await ctx.db.patch(profile._id, {
          blockedTopics: next,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.id, {
      status: args.action === 'approve' ? 'approved' : 'denied',
      resolvedAt: Date.now(),
      resolvedBy: resolved.row.email ?? undefined,
    });
    return { ok: true };
  },
});

// P0 share-approval gate: parent-side queries + mutation.
//
// Parent dashboard renders any rows here in `pending` status as
// actionable cards (Approve / Deny). On Approve, the kid can hit
// Share again and the link generates. On Deny, the kid sees "your
// parent said not this time" — they can re-ask the parent in person.
// Status is sticky; row stays for audit/history.

export const listPendingShareApprovals = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) return [];
    const rows = await ctx.db
      .query('safesparkShareApprovals')
      .withIndex('by_parent_status', (q) =>
        q.eq('parentUserId', resolved.row._id).eq('status', 'pending'),
      )
      .order('desc')
      .take(50);
    return rows.map((r) => ({
      id: r._id,
      kidProfileId: r.kidProfileId,
      kidName: r.kidName,
      projectId: r.projectId,
      projectTitle: r.projectTitle,
      createdAt: r.createdAt,
    }));
  },
});

export const resolveShareApproval = mutation({
  args: {
    id: v.id('safesparkShareApprovals'),
    action: v.union(v.literal('approve'), v.literal('deny')),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) throw new Error('Sign in to resolve share requests.');
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error('Request not found.');
    if (request.parentUserId !== resolved.row._id) {
      throw new Error('Not your request to resolve.');
    }
    if (request.status !== 'pending') {
      return { ok: true, alreadyResolved: true };
    }
    await ctx.db.patch(args.id, {
      status: args.action === 'approve' ? 'approved' : 'denied',
      resolvedAt: Date.now(),
      resolvedBy: resolved.row.email ?? undefined,
    });
    return { ok: true };
  },
});

// Kid-side: check status of an existing share-approval request.
// Workbench polls this when in the "waiting on parent" state so the
// share button can flip to "approved! tap again to share" the moment
// the parent resolves.
export const getShareApprovalStatus = query({
  args: {
    id: v.id('safesparkShareApprovals'),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    // Scope check — only the originating kid session can read it
    // (avoid leaking another family's pending requests via a guessed id).
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (!session || session.kidProfileId !== row.kidProfileId) return null;
    }
    return {
      id: row._id,
      status: row.status,
      resolvedAt: row.resolvedAt,
    };
  },
});

// Phase 2 — per-kid daily prompt count for budget enforcement. Called
// from /api/demo before the LLM fires when dailyQueryBudget is set.
// Returns the number of safesparkRequests rows for this kid since the
// start of today UTC. Returns null if the session isn't valid.
export const countPromptsTodayBySession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return null;
    const ownerKey = `kid:${session.kidProfileId}`;
    const now = Date.now();
    const startOfTodayUtc = Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate(),
    );
    // Cap the scan at the most recent 500 prompts — anything beyond that
    // is comfortably "yesterday" by the time today's budget matters.
    const recent = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerKey))
      .order('desc')
      .take(500);
    return recent.filter((r) => r.createdAt >= startOfTodayUtc).length;
  },
});

export const getKidEnforcementBySession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return null;
    const profile = await ctx.db.get(session.kidProfileId);
    if (!profile) return null;
    return {
      kidProfileId: profile._id,
      allowImageRestyle: profile.allowImageRestyle !== false,
      allowVoice: profile.allowVoice !== false,
      allowWebData: profile.allowWebData !== false,
      allowSharing: profile.allowSharing !== false,
      blockedTopics: profile.blockedTopics ?? [],
      accessPaused: profile.accessPaused === true,
      dailyQueryBudget: profile.dailyQueryBudget,
    };
  },
});
