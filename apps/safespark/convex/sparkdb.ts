import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Caps. Kept generous enough for leaderboards / chatrooms but tight enough
// that a runaway loop in a kid's project can't rack up cost.
const MAX_VALUE_BYTES = 4 * 1024;
const MAX_KEYS_PER_PROJECT = 200;
const MAX_KEY_LENGTH = 80;

function validateKey(key: string): void {
  if (!key || typeof key !== 'string') throw new Error('Key required.');
  if (key.length > MAX_KEY_LENGTH) throw new Error(`Key too long (max ${MAX_KEY_LENGTH}).`);
  if (!/^[A-Za-z0-9_.:-]+$/.test(key)) {
    throw new Error('Key may only contain letters, numbers, _ . : -');
  }
}

function validateValue(value: string): void {
  if (typeof value !== 'string') throw new Error('Value must be a JSON string.');
  if (value.length > MAX_VALUE_BYTES) {
    throw new Error(`Value too big (max ${MAX_VALUE_BYTES} bytes).`);
  }
  try {
    JSON.parse(value);
  } catch {
    throw new Error('Value must be valid JSON.');
  }
}

export const dbGet = query({
  args: { projectId: v.id('safesparkProjects'), key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('sparkProjectData')
      .withIndex('by_project_key', (q) => q.eq('projectId', args.projectId).eq('key', args.key))
      .first();
    return row ? { value: row.value, updatedAt: row.updatedAt } : null;
  },
});

export const dbList = query({
  args: { projectId: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('sparkProjectData')
      .withIndex('by_project_key', (q) => q.eq('projectId', args.projectId))
      .take(MAX_KEYS_PER_PROJECT);
    return rows.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updatedAt }));
  },
});

export const dbSet = mutation({
  args: { projectId: v.id('safesparkProjects'), key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    validateKey(args.key);
    validateValue(args.value);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found.');
    if (project.deletedAt) throw new Error('Project is deleted.');
    const existing = await ctx.db
      .query('sparkProjectData')
      .withIndex('by_project_key', (q) => q.eq('projectId', args.projectId).eq('key', args.key))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, updatedAt: now });
      return { updatedAt: now };
    }
    // Hit the per-project key cap before inserting a new key.
    const allKeys = await ctx.db
      .query('sparkProjectData')
      .withIndex('by_project_key', (q) => q.eq('projectId', args.projectId))
      .take(MAX_KEYS_PER_PROJECT + 1);
    if (allKeys.length >= MAX_KEYS_PER_PROJECT) {
      throw new Error(`Project hit the ${MAX_KEYS_PER_PROJECT}-key limit.`);
    }
    await ctx.db.insert('sparkProjectData', {
      projectId: args.projectId,
      key: args.key,
      value: args.value,
      createdAt: now,
      updatedAt: now,
    });
    return { updatedAt: now };
  },
});

export const dbAppend = mutation({
  args: { projectId: v.id('safesparkProjects'), key: v.string(), item: v.string() },
  handler: async (ctx, args) => {
    validateKey(args.key);
    // The item is a JSON-encoded scalar/object; we wrap it into the array.
    let itemParsed: unknown;
    try {
      itemParsed = JSON.parse(args.item);
    } catch {
      throw new Error('Item must be valid JSON.');
    }
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found.');
    if (project.deletedAt) throw new Error('Project is deleted.');
    const existing = await ctx.db
      .query('sparkProjectData')
      .withIndex('by_project_key', (q) => q.eq('projectId', args.projectId).eq('key', args.key))
      .first();
    const now = Date.now();
    let arr: unknown[] = [];
    if (existing) {
      try {
        const parsed = JSON.parse(existing.value);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {
        /* treat as empty */
      }
    }
    arr.push(itemParsed);
    // Cap array length so a kid game can't run away.
    if (arr.length > 500) arr = arr.slice(arr.length - 500);
    const nextValue = JSON.stringify(arr);
    if (nextValue.length > MAX_VALUE_BYTES) {
      // Trim oldest until within cap.
      while (arr.length > 0 && JSON.stringify(arr).length > MAX_VALUE_BYTES) arr.shift();
    }
    const finalValue = JSON.stringify(arr);
    if (existing) {
      await ctx.db.patch(existing._id, { value: finalValue, updatedAt: now });
    } else {
      await ctx.db.insert('sparkProjectData', {
        projectId: args.projectId,
        key: args.key,
        value: finalValue,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { updatedAt: now, length: arr.length };
  },
});

// Owner-only: wipe all data for a project. Called when a parent deletes the
// project or wants to reset the leaderboard. Not exposed via HTTP — only via
// the dashboard / maker.
export const dbWipe = mutation({
  args: {
    projectId: v.id('safesparkProjects'),
    // Owner proof — kid session (most common) OR Marketing JWT for
    // the parent. Without one, dbWipe rejects. Caught 2026-05-29 safety
    // audit: this was a public mutation with no auth check, meaning any
    // party with the Convex URL could wipe any project's shared data.
    sessionToken: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return { deleted: 0 };

    // Resolve caller identity to the project owner key (`kid:<id>` for
    // kid-owned projects, the parent's clerkUserId for parent-owned).
    let callerOwnerKey: string | null = null;
    if (args.sessionToken) {
      const session = await ctx.db
        .query('kidSessions')
        .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken!))
        .first();
      if (session) callerOwnerKey = `kid:${session.kidProfileId}`;
    }
    if (!callerOwnerKey && args.userToken) {
      const { verifyMarketingToken } = await import('./actors');
      const verified = await verifyMarketingToken(args.userToken);
      if (verified) {
        const userRow = await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', verified.email))
          .first();
        if (userRow) callerOwnerKey = userRow.clerkUserId;
      }
    }
    if (!callerOwnerKey || callerOwnerKey !== project.clerkUserId) {
      throw new Error('Not authorized to wipe this project.');
    }

    const rows = await ctx.db
      .query('sparkProjectData')
      .withIndex('by_project_key', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return { deleted: rows.length };
  },
});

