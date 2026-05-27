import { mutation, query, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

const MESSAGE_VALIDATOR = v.object({
  role: v.union(v.literal('user'), v.literal('assistant')),
  content: v.string(),
});

type SafeSparkCtx = {
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
      await ctx.db.patch(projectId, {
        title: trimmedTitle,
        html: args.html,
        messages: args.messages,
        nextSteps: args.nextSteps,
        lastPrompt: args.lastPrompt,
        lastReply: args.lastReply,
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
      createdAt: now,
    });

    return projectId;
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
  handler: async (ctx, args) => {
    if (args.html.length > 600_000) throw new Error('Project too big to share.');
    const identity = (await ctx.auth.getUserIdentity()) as
      | { subject: string; email?: string }
      | null;
    // Kill-switch gate: if a kid session is creating this share link, check
    // the parent hasn't disabled sharing on this kid's profile.
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session) {
        const profile = await ctx.db.get(session.kidProfileId);
        if (profile && profile.allowSharing === false) {
          throw new Error('Sharing is turned off for this profile.');
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
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeImageUpload = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
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

// Admin-only: every signed-in kid's prompts across all families. Gated on the
// PARENT_EMAIL env var so only the operator sees it.
export const listAllRequests = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = (await ctx.auth.getUserIdentity()) as
      | { subject: string; email?: string }
      | null;
    const operatorEmail = (process.env.PARENT_EMAIL ?? '').toLowerCase();
    if (!identity?.email || !operatorEmail || identity.email.toLowerCase() !== operatorEmail) {
      return null;
    }
    const limit = Math.min(args.limit ?? 200, 500);
    const rows = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_time')
      .order('desc')
      .take(limit);
    return rows.map((row) => ({
      id: row._id,
      clerkUserId: row.clerkUserId,
      email: row.email,
      prompt: row.prompt,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      createdAt: row.createdAt,
    }));
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

function yearMonthUTC(now: number): string {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

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
  args: {},
  handler: async (ctx) => {
    const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
    if (!identity?.subject) return null;
    const yearMonth = yearMonthUTC(Date.now());
    const ids: string[] = [identity.subject];
    const userRow = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
    if (userRow) {
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
  args: {},
  handler: async (ctx) => {
    const identity = (await ctx.auth.getUserIdentity()) as
      | { subject: string; email?: string }
      | null;
    if (!identity?.subject) return null;
    const userRow = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
    if (!userRow) return null;
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
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
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

// One-profile drill-down for /parent/profile/[id]. Auth: the signed-in
// parent must own this kidProfile (either as the legacy parentUserId or
// as the family's parent). Returns the profile, every non-deleted project
// owned by it (full list, not capped at 8), recent requests, and the
// usage row for the current month.
export const getProfileDetail = query({
  args: { profileId: v.id('kidProfiles') },
  handler: async (ctx, args) => {
    const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
    if (!identity?.subject) return null;
    const parent = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
    if (!parent) return null;
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
      }));
    const requests = await ctx.db
      .query('safesparkRequests')
      .withIndex('by_clerk_id_time', (q) => q.eq('clerkUserId', ownerId))
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
): Promise<{ profile: any; parentUserId: Id<'users'> }> {
  const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
  if (!identity?.subject) throw new Error('Sign in to manage kid settings.');
  const parent = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q: any) => q.eq('clerkUserId', identity.subject))
    .first();
  if (!parent) throw new Error('Parent account not found.');
  const profile = await ctx.db.get(kidProfileId);
  if (!profile) throw new Error('Kid profile not found.');
  if (profile.parentUserId !== parent._id) {
    throw new Error('You do not own that kid profile.');
  }
  return { profile, parentUserId: parent._id };
}

export const getKidSettings = query({
  args: { kidProfileId: v.id('kidProfiles') },
  handler: async (ctx, args) => {
    const identity = (await ctx.auth.getUserIdentity()) as { subject: string } | null;
    if (!identity?.subject) return null;
    const parent = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
      .first();
    if (!parent) return null;
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    if (profile.parentUserId !== parent._id) return null;
    return {
      allowImageRestyle: profile.allowImageRestyle !== false,
      allowVoice: profile.allowVoice !== false,
      allowWebData: profile.allowWebData !== false,
      allowSharing: profile.allowSharing !== false,
      blockedTopics: profile.blockedTopics ?? [],
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
  },
  handler: async (ctx, args) => {
    await requireParentOfKid(ctx as never, args.kidProfileId);
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
  },
  handler: async (ctx, args) => {
    await requireParentOfKid(ctx as never, args.kidProfileId);
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

// Server-only lookup used by /api/demo to fetch the full kill-switch +
// blocklist state for a kid session. Public because /api/demo runs without
// the kid's Clerk JWT; the sessionToken itself is the bearer secret.
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
    };
  },
});
