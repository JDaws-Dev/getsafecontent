import { v } from 'convex/values';
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  internalAction,
} from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { findUserRowByIdentity } from './safespark';
import type { SafeSparkCtx } from './safespark';
import { verifyMarketingToken } from './actors';

/**
 * SafeSpark concern alerts — surfaces always-escalate intent-classifier
 * results to the parent via email + dashboard.
 *
 * Ported 2026-05-29 from `apps/safeseek/convex/{concernAlerts,concernAlertQueries}.ts`.
 * Flow:
 *   /api/demo classifies the kid's prompt → on escalate, calls
 *   `recordConcernBySession` (internal) which inserts a row + schedules
 *   `sendParentEmail` (delayed 0s so it runs after the response goes out).
 *   Parent dashboard polls `listForUser` and surfaces unack'd alerts at
 *   the top. Parent taps "Got it" → `acknowledge` flips the row.
 *
 * Dedupe: a 24h window on (kidProfileId, query, category) prevents the
 * same prompt typed twice from emailing the parent twice.
 */

// --- Public reads (parent dashboard) ---

export const listForUser = query({
  args: { userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Forward declaration is from safespark; can't import findUserRowByIdentity
    // from here without circular import. Re-resolve identity inline.
    const identity = (await ctx.auth.getUserIdentity()) as
      | { subject: string; email?: string }
      | null;
    let userRow: Doc<'users'> | null = null;
    if (args.userToken) {
      const verified = await verifyMarketingToken(args.userToken);
      if (verified) {
        userRow = (await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', verified.email))
          .first()) as Doc<'users'> | null;
      }
    }
    if (!userRow && identity?.subject) {
      userRow = (await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
        .first()) as Doc<'users'> | null;
      if (!userRow && identity.email) {
        userRow = (await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', identity.email!.toLowerCase()))
          .first()) as Doc<'users'> | null;
      }
    }
    if (!userRow) return [];

    const rows = await ctx.db
      .query('safesparkConcernAlerts')
      .withIndex('by_parent_unack', (q) =>
        q.eq('parentUserId', userRow!._id).eq('acknowledged', false),
      )
      .order('desc')
      .take(50);
    return rows.map((r) => ({
      id: r._id,
      kidProfileId: r.kidProfileId,
      kidName: r.kidName,
      query: r.query,
      category: r.category,
      rationale: r.rationale,
      createdAt: r.createdAt,
    }));
  },
});

// --- Public write (parent acks an alert) ---

export const acknowledge = mutation({
  args: {
    id: v.id('safesparkConcernAlerts'),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as SafeSparkCtx, args.userToken);
    if (!resolved) throw new Error('Sign in to acknowledge.');
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error('Alert not found.');
    if (row.parentUserId !== resolved.row._id) {
      throw new Error('Not your alert to acknowledge.');
    }
    if (row.acknowledged) return { ok: true, alreadyAcked: true };
    await ctx.db.patch(args.id, {
      acknowledged: true,
      acknowledgedAt: Date.now(),
      acknowledgedBy: resolved.row.email ?? undefined,
    });
    return { ok: true };
  },
});

// --- Internal: record from /api/demo via session token ---

export const recordConcernBySession = mutation({
  args: {
    sessionToken: v.string(),
    query: v.string(),
    category: v.union(
      v.literal('self_harm_adjacent'),
      v.literal('eating_disorder_adjacent'),
    ),
    rationale: v.string(),
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

    // 24h dedupe on (kidProfileId, query, category) — retries don't spam.
    const sinceCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query('safesparkConcernAlerts')
      .withIndex('by_kid_time', (q) => q.eq('kidProfileId', profile._id))
      .order('desc')
      .take(20);
    const dupe = recent.find(
      (r) =>
        r.createdAt >= sinceCutoff &&
        r.category === args.category &&
        r.query.trim().toLowerCase() === args.query.trim().toLowerCase(),
    );
    if (dupe) return { ok: true, deduped: true };

    const id = await ctx.db.insert('safesparkConcernAlerts', {
      parentUserId,
      kidProfileId: profile._id,
      kidName: profile.displayName,
      query: args.query.slice(0, 1000),
      category: args.category,
      rationale: args.rationale.slice(0, 200),
      acknowledged: false,
      createdAt: Date.now(),
    });

    // Fire-and-forget parent email.
    await ctx.scheduler.runAfter(0, internal.concernAlerts.sendParentEmail, {
      alertId: id,
    });
    return { ok: true, id };
  },
});

// --- Internal action: send the parent email ---

export const sendParentEmail = internalAction({
  args: { alertId: v.id('safesparkConcernAlerts') },
  handler: async (ctx, args): Promise<void> => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.warn('[safespark concernAlerts] RESEND_API_KEY not set — skipping email');
      return;
    }
    const alert = await ctx.runQuery(internal.concernAlerts._getAlertById, {
      id: args.alertId,
    });
    if (!alert) return;
    const parent = await ctx.runQuery(internal.concernAlerts._getUserById, {
      id: alert.parentUserId,
    });
    if (!parent?.email) {
      console.warn('[safespark concernAlerts] no parent email');
      return;
    }

    const isSH = alert.category === 'self_harm_adjacent';
    const isED = alert.category === 'eating_disorder_adjacent';
    const headline = isSH
      ? 'Important: a message from your child needs your attention'
      : isED
        ? 'Heads up: your child built something worth a conversation'
        : 'Concerning prompt from your child';
    const resourceLine = isSH
      ? 'If your child may be in crisis, the 988 Suicide & Crisis Lifeline is available 24/7 (call or text 988).'
      : isED
        ? 'The National Eating Disorders helpline is at 1-800-931-2237 (Mon-Thu 9am-9pm ET, Fri 9am-5pm ET).'
        : 'Talk with your child when you have a calm moment.';

    const safeQuery = escapeHtml(alert.query);
    const safeRationale = escapeHtml(alert.rationale);
    const safeKid = escapeHtml(alert.kidName);
    const safeParentName = escapeHtml(parent.name || parent.email.split('@')[0] || 'there');

    const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a2e;line-height:1.55">
  <h2 style="color:#dc2626;margin:0 0 16px">${headline}</h2>
  <p>Hi ${safeParentName},</p>
  <p>Your child <strong>${safeKid}</strong> asked SafeSpark to build something we think is worth a parent conversation:</p>
  <blockquote style="border-left:3px solid #dc2626;padding:12px 16px;background:#fef2f2;margin:16px 0;font-size:15px">
    "${safeQuery}"
  </blockquote>
  <p style="color:#444"><em>Why we're flagging this:</em> ${safeRationale}</p>
  <p>SafeSpark refused to build this. We showed your child a gentle redirect with helpline information.</p>
  <p style="background:#fffbeb;padding:12px 16px;border-radius:6px;border:1px solid #fcd34d">
    <strong>Resources:</strong> ${resourceLine}
  </p>
  <p>Review your child's activity at <a href="https://getsafespark.com/parent">getsafespark.com/parent</a>.</p>
  <p style="color:#888;font-size:12px;margin-top:32px">
    You're receiving this because SafeSpark detected a prompt category we always escalate to parents (eating-disorder-adjacent or self-harm-adjacent). These alerts cannot be turned off.
  </p>
</body></html>`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SafeSpark <jeremiah@getsafefamily.com>',
          to: [parent.email],
          subject: headline,
          html,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`[safespark concernAlerts] Resend ${res.status}: ${t}`);
        return;
      }
      await ctx.runMutation(internal.concernAlerts._markNotified, { id: args.alertId });
    } catch (err) {
      console.error('[safespark concernAlerts] sendParentEmail threw:', err);
    }
  },
});

// --- Internal helpers (queried by the action) ---

export const _getAlertById = internalQuery({
  args: { id: v.id('safesparkConcernAlerts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const _getUserById = internalQuery({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const _markNotified = internalMutation({
  args: { id: v.id('safesparkConcernAlerts') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { notifiedAt: Date.now() });
  },
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
