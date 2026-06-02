/**
 * Async build jobs — see `safesparkJobs` in schema.ts for the why.
 *
 * The route (/api/demo) calls these via the internal HTTP client when
 * it runs server-side. The DemoWorkbench client calls the public
 * createJob / getJob / claimJob via Convex react.
 */

import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';

// Anyone can create a pending job — the (sessionToken | clerkUserId)
// pair scopes who can later read it. We don't strictly enforce auth on
// createJob because the route is the only thing that turns a pending
// job into a real OpenAI call; a spammer creating empty rows just
// wastes Convex storage (cleaned daily).
export const createJob = mutation({
  args: {
    prompt: v.string(),
    projectId: v.optional(v.id('safesparkProjects')),
    sessionToken: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = await ctx.db.insert('safesparkJobs', {
      prompt: args.prompt.slice(0, 4000),
      projectId: args.projectId,
      sessionToken: args.sessionToken,
      clerkUserId: args.clerkUserId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    return jobId;
  },
});

export const getJob = query({
  args: {
    jobId: v.id('safesparkJobs'),
    sessionToken: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    // Scope check — only the identity that created the job can read it.
    // A leaked jobId shouldn't expose another kid's build.
    if (job.sessionToken && job.sessionToken !== args.sessionToken) {
      if (!job.clerkUserId || job.clerkUserId !== args.clerkUserId) return null;
    } else if (job.clerkUserId && job.clerkUserId !== args.clerkUserId) {
      if (!job.sessionToken || job.sessionToken !== args.sessionToken) return null;
    }
    return {
      _id: job._id,
      status: job.status,
      prompt: job.prompt,
      projectId: job.projectId,
      resultJson: job.resultJson,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  },
});

// Called by the client AFTER it has consumed the result for the
// current session. Marks the row as 'claimed' so the next page load
// (e.g., kid opens the same project in two tabs) doesn't replay the
// build into the chat. The 24h cleanup cron still wipes it eventually.
export const claimJob = mutation({
  args: {
    jobId: v.id('safesparkJobs'),
    sessionToken: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    if (job.sessionToken && job.sessionToken !== args.sessionToken) {
      if (!job.clerkUserId || job.clerkUserId !== args.clerkUserId) return;
    } else if (job.clerkUserId && job.clerkUserId !== args.clerkUserId) {
      if (!job.sessionToken || job.sessionToken !== args.sessionToken) return;
    }
    if (job.status === 'complete' || job.status === 'failed') {
      await ctx.db.patch(args.jobId, { status: 'claimed', updatedAt: Date.now() });
    }
  },
});

// Server-to-server: called by the /api/demo route on Vercel via
// ConvexHttpClient. The HTTP client can only call PUBLIC mutations,
// so these are `mutation()` not `internalMutation()` — but they're
// admin-key gated so a curious caller can't spoof a result onto
// someone else's pending job. The route already has
// SAFESPARK_ADMIN_KEY in its environment; same trust model as the
// existing `/adminDashboard`-class endpoints.
function checkAdminKey(adminKey: string): boolean {
  const expected = process.env.SAFESPARK_ADMIN_KEY;
  return Boolean(expected) && adminKey === expected;
}

export const markRunning = mutation({
  args: { jobId: v.id('safesparkJobs'), adminKey: v.string() },
  handler: async (ctx, args) => {
    if (!checkAdminKey(args.adminKey)) throw new Error('Unauthorized.');
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== 'pending') return;
    await ctx.db.patch(args.jobId, { status: 'running', updatedAt: Date.now() });
  },
});

export const completeJob = mutation({
  args: {
    jobId: v.id('safesparkJobs'),
    resultJson: v.string(),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!checkAdminKey(args.adminKey)) throw new Error('Unauthorized.');
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    // Don't overwrite a claim — if the client already saw and applied
    // the result, no point flipping the state back.
    if (job.status === 'claimed') return;
    await ctx.db.patch(args.jobId, {
      status: 'complete',
      resultJson: args.resultJson,
      updatedAt: Date.now(),
    });
  },
});

export const failJob = mutation({
  args: {
    jobId: v.id('safesparkJobs'),
    errorMessage: v.string(),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!checkAdminKey(args.adminKey)) throw new Error('Unauthorized.');
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    if (job.status === 'claimed' || job.status === 'complete') return;
    await ctx.db.patch(args.jobId, {
      status: 'failed',
      errorMessage: args.errorMessage.slice(0, 1500),
      updatedAt: Date.now(),
    });
  },
});

// Pending-job lookup by identity. The client calls this on mount so a
// kid who tab-closed mid-build can rehydrate the work. We return the
// MOST RECENT pending/running/complete (not yet claimed) job within
// the last 12 hours — older than that and the kid has probably moved
// on and the row will get cleaned up anyway.
export const findActiveJobForIdentity = query({
  args: {
    sessionToken: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    const statuses = ['pending', 'running', 'complete', 'failed'] as const;
    const matches: Array<{ _id: Id<'safesparkJobs'>; createdAt: number; status: string }> = [];

    if (args.sessionToken) {
      for (const status of statuses) {
        const rows = await ctx.db
          .query('safesparkJobs')
          .withIndex('by_session_pending', (q) =>
            q
              .eq('sessionToken', args.sessionToken)
              .eq('status', status)
              .gte('createdAt', cutoff),
          )
          .order('desc')
          .take(1);
        for (const r of rows) matches.push({ _id: r._id, createdAt: r.createdAt, status: r.status });
      }
    }
    if (args.clerkUserId) {
      for (const status of statuses) {
        const rows = await ctx.db
          .query('safesparkJobs')
          .withIndex('by_clerk_pending', (q) =>
            q
              .eq('clerkUserId', args.clerkUserId)
              .eq('status', status)
              .gte('createdAt', cutoff),
          )
          .order('desc')
          .take(1);
        for (const r of rows) matches.push({ _id: r._id, createdAt: r.createdAt, status: r.status });
      }
    }

    if (matches.length === 0) return null;
    matches.sort((a, b) => b.createdAt - a.createdAt);
    return matches[0]._id;
  },
});

// Internal helper for the cleanup cron. Deletes any job row older than
// 24 hours regardless of status. The result row is just a streaming
// artifact — the canonical project state lives on safesparkProjects.
export const _cleanupOldJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale = await ctx.db
      .query('safesparkJobs')
      .withIndex('by_created', (q) => q.lt('createdAt', cutoff))
      .take(500);
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    return { deleted: stale.length };
  },
});

// Re-export the internal accessor for use in unit-level callers that
// can't go through the public `getJob` API (the HTTP route uses these
// directly via the internal client).
export const _getJobRaw = internalQuery({
  args: { jobId: v.id('safesparkJobs') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

