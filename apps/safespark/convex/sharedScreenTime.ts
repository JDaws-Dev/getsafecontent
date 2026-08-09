import { v } from 'convex/values';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  activeSecondsToday,
  dayKeyForTimezone,
  isUsableTimezone,
  kidTimeContext,
} from './screenTime';
import { findUserRowByIdentity, type SafeSparkCtx } from './safespark';

/**
 * Bridge to the FAMILY-WIDE daily screen-time limit held by Marketing Central.
 *
 * Parents choose ONE of two things:
 *   - a per-app limit (this app's sparkTimeLimits table), or
 *   - one overall limit covering all five Safe Family apps.
 * Setting the overall limit is the toggle: when central reports `limitSet` it
 * REPLACES this app's limit. Clear it and the per-app limit governs again.
 *
 * Convex queries can't make network calls and the enforcement read is a
 * query, so this action refreshes a local cache row and the query reads that.
 *
 * FAILS OPEN throughout. Missing admin key, missing family code, central
 * unreachable, or a stale cache all fall back to the per-app limit, and then
 * to allowing access.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || 'https://adamant-crow-705.convex.site';
const APP = 'safespark';

/** SafeSpark names its shared key SAFESPARK_ADMIN_KEY; accept either name. */
function adminKey(): string | undefined {
  return process.env.SAFESPARK_ADMIN_KEY || process.env.ADMIN_KEY || undefined;
}

type CentralStatus = {
  allowed: boolean;
  limitSet: boolean;
  usedMinutes: number;
  limitMinutes: number;
  remainingMinutes: number | null;
};

/**
 * Identity + today's locally-observed active seconds for one kid, resolved
 * from the kid's own session token.
 *
 * The family code is the cross-app join key. It lives on the parent's user
 * row (adopted verbatim from the Marketing login JWT — the authoritative,
 * same-across-every-app code); the families row is the fallback for accounts
 * provisioned before that sync existed.
 */
export const kidSyncContext = internalQuery({
  args: { sessionToken: v.string(), timezone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return null;
    if (session.expiresAt && session.expiresAt < Date.now()) return null;

    const context = await kidTimeContext(ctx, session.kidProfileId);
    if (!context) return null;

    const parent = await ctx.db.get(context.profile.parentUserId as Id<'users'>);
    const familyCode = parent?.familyCode || context.family?.familyCode;
    // Without a family code this kid can't be matched to their siblings'
    // usage in the other apps, so there is nothing to sync.
    if (!familyCode) return null;

    // Use the device timezone as a hint only when the family has none stored
    // yet — the sync action persists it in the same pass.
    const timezone =
      context.timezone ?? (isUsableTimezone(args.timezone) ? args.timezone : undefined);
    const day = context.timezone ? context.day : dayKeyForTimezone(timezone);

    const todaySeconds = await activeSecondsToday(ctx, session.kidProfileId, day);
    const cache = await ctx.db
      .query('sharedScreenTimeCache')
      .withIndex('by_kid_day', (q) =>
        q.eq('kidProfileId', session.kidProfileId).eq('day', day),
      )
      .first();

    return {
      kidProfileId: session.kidProfileId,
      familyId: context.family?._id ?? null,
      adoptTimezone: context.timezone ? null : (timezone ?? null),
      familyCode: familyCode.toUpperCase(),
      kidName: context.profile.displayName as string,
      day,
      todaySeconds,
      reportedSeconds: cache?.reportedSeconds ?? 0,
    };
  },
});

/** Write back what central told us. */
export const storeSyncResult = internalMutation({
  args: {
    kidProfileId: v.id('kidProfiles'),
    day: v.string(),
    limitSet: v.boolean(),
    allowed: v.boolean(),
    usedMinutes: v.number(),
    limitMinutes: v.number(),
    remainingMinutes: v.optional(v.number()),
    reportedSeconds: v.number(),
    familyId: v.optional(v.id('families')),
    adoptTimezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { familyId, adoptTimezone, ...row } = args;

    // Pin the family's timezone the first time a device tells us what it is,
    // so every later day key (in every code path) agrees.
    if (familyId && isUsableTimezone(adoptTimezone)) {
      const family = await ctx.db.get(familyId);
      if (family && !family.timezone) {
        await ctx.db.patch(familyId, { timezone: adoptTimezone });
      }
    }

    const existing = await ctx.db
      .query('sharedScreenTimeCache')
      .withIndex('by_kid_day', (q) =>
        q.eq('kidProfileId', args.kidProfileId).eq('day', args.day),
      )
      .first();
    const next = { ...row, syncedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, next);
    else await ctx.db.insert('sharedScreenTimeCache', next);
  },
});

/**
 * Report this app's new minutes to central and refresh the cached verdict.
 * Called by the kid workbench on a timer while a profile is active.
 *
 * Only the DELTA since the last sync goes up (reportedSeconds watermark), so
 * repeated syncs can't double-count. Minutes are sent whether or not the kid
 * is already over cap — recording is unconditional; enforcement is a separate
 * decision made by refusing to serve.
 */
export const sync = action({
  args: { sessionToken: v.string(), timezone: v.optional(v.string()) },
  handler: async (
    ctx,
    args,
  ): Promise<{
    synced: boolean;
    reason?: string;
    // Echoed back for operator debugging — a mismatch here is almost always a
    // kid-name difference between apps, which is silent otherwise.
    central?: { allowed: boolean; limitSet: boolean; usedMinutes: number; limitMinutes: number };
    familyCode?: string;
    kidName?: string;
    day?: string;
  }> => {
    const key = adminKey();
    // Fail open — never block a kid because we're misconfigured.
    if (!key) return { synced: false, reason: 'not_configured' };

    const info = await ctx.runQuery(internal.sharedScreenTime.kidSyncContext, {
      sessionToken: args.sessionToken,
      timezone: args.timezone,
    });
    if (!info) return { synced: false, reason: 'no_family_code' };

    const deltaSeconds = Math.max(0, info.todaySeconds - info.reportedSeconds);
    const deltaMinutes = Math.floor(deltaSeconds / 60);

    try {
      let status: CentralStatus;

      if (deltaMinutes > 0) {
        const res = await fetch(`${CENTRAL_URL}/sharedScreenTime/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyCode: info.familyCode,
            kidName: info.kidName,
            day: info.day,
            minutes: deltaMinutes,
            app: APP,
            key,
          }),
        });
        if (!res.ok) return { synced: false, reason: `record_${res.status}` };
        status = (await res.json()) as CentralStatus;
      } else {
        const url = new URL(`${CENTRAL_URL}/sharedScreenTime/check`);
        url.searchParams.set('familyCode', info.familyCode);
        url.searchParams.set('kidName', info.kidName);
        url.searchParams.set('day', info.day);
        url.searchParams.set('key', key);
        const res = await fetch(url.toString());
        if (!res.ok) return { synced: false, reason: `check_${res.status}` };
        status = (await res.json()) as CentralStatus;
      }

      await ctx.runMutation(internal.sharedScreenTime.storeSyncResult, {
        kidProfileId: info.kidProfileId as Id<'kidProfiles'>,
        day: info.day,
        limitSet: status.limitSet,
        allowed: status.allowed,
        usedMinutes: status.usedMinutes,
        limitMinutes: status.limitMinutes,
        remainingMinutes: status.remainingMinutes ?? undefined,
        // Only advance the watermark by the whole minutes we actually sent.
        reportedSeconds: info.reportedSeconds + deltaMinutes * 60,
        familyId: (info.familyId ?? undefined) as Id<'families'> | undefined,
        adoptTimezone: info.adoptTimezone ?? undefined,
      });

      return {
        synced: true,
        central: {
          allowed: status.allowed,
          limitSet: status.limitSet,
          usedMinutes: status.usedMinutes,
          limitMinutes: status.limitMinutes,
        },
        familyCode: info.familyCode,
        kidName: info.kidName,
        day: info.day,
      };
    } catch (err) {
      console.error('[sharedScreenTime.sync] central unreachable:', err);
      return { synced: false, reason: 'central_unreachable' };
    }
  },
});

// ---------------------------------------------------------------------------
// Parent-facing controls for the family-wide limit.
//
// These are ACTIONS because they talk to Marketing Central over HTTP, which a
// query or mutation cannot do. Ownership is enforced through an internal
// query before anything is read or written — without it these would be an
// unauthenticated way to read or rewrite any family's limit.
// ---------------------------------------------------------------------------

/** Verify the caller owns this kid, and return the identity central needs. */
export const ownerContext = internalQuery({
  args: {
    kidProfileId: v.id('kidProfiles'),
    userToken: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as unknown as SafeSparkCtx, args.userToken);
    if (!resolved) return null;
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile || profile.parentUserId !== resolved.row._id) return null;

    const context = await kidTimeContext(ctx, args.kidProfileId);
    const familyCode = resolved.row.familyCode || context?.family?.familyCode;
    if (!familyCode) return null;

    const timezone =
      context?.timezone ?? (isUsableTimezone(args.timezone) ? args.timezone : undefined);
    return {
      familyCode: familyCode.toUpperCase(),
      kidName: profile.displayName,
      day: context?.timezone ? context.day : dayKeyForTimezone(timezone),
    };
  },
});

/** Read the family-wide limit + today's combined usage for one kid. */
export const getFamilyLimit = action({
  args: {
    kidProfileId: v.id('kidProfiles'),
    userToken: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const key = adminKey();
    const info = await ctx.runQuery(internal.sharedScreenTime.ownerContext, args);
    if (!key || !info) return { available: false };
    try {
      const url = new URL(`${CENTRAL_URL}/sharedScreenTime/check`);
      url.searchParams.set('familyCode', info.familyCode);
      url.searchParams.set('kidName', info.kidName);
      url.searchParams.set('day', info.day);
      url.searchParams.set('key', key);
      const res = await fetch(url.toString());
      if (!res.ok) return { available: false };
      const status = (await res.json()) as CentralStatus;
      return { available: true, ...status };
    } catch {
      // Central down — tell the UI so it can say "couldn't load" rather than
      // showing "off" and tempting the parent to re-enable something that is
      // already on.
      return { available: false };
    }
  },
});

/** Set (minutes > 0) or clear (0) the family-wide limit for one kid. */
export const setFamilyLimit = action({
  args: {
    kidProfileId: v.id('kidProfiles'),
    dailyLimitMinutes: v.number(),
    userToken: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const key = adminKey();
    const info = await ctx.runQuery(internal.sharedScreenTime.ownerContext, {
      kidProfileId: args.kidProfileId,
      userToken: args.userToken,
      timezone: args.timezone,
    });
    if (!key) return { ok: false, error: 'not_configured' };
    if (!info) return { ok: false, error: 'no_family_code' };
    try {
      const res = await fetch(`${CENTRAL_URL}/sharedScreenTime/setLimit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyCode: info.familyCode,
          kidName: info.kidName,
          dailyLimitMinutes: Math.max(0, Math.min(1440, Math.round(args.dailyLimitMinutes))),
          key,
        }),
      });
      if (!res.ok) return { ok: false, error: `central_${res.status}` };
      return { ok: true };
    } catch {
      return { ok: false, error: 'central_unreachable' };
    }
  },
});
