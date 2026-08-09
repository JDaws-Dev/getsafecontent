import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { findUserRowByIdentity, type SafeSparkCtx } from './safespark';

/** Read-only slice of a Convex ctx — everything in here only needs the db. */
type ReadCtx = { db: QueryCtx['db'] };
type WriteCtx = { db: MutationCtx['db'] };

/**
 * SafeSpark daily SCREEN-TIME limits.
 *
 * Two things are being capped in this app and they are deliberately separate:
 *
 *   - COST  — `kidProfiles.dailyQueryBudget` + the system default budget in
 *             /api/demo. Caps how much OpenAI money a kid can spend. Fails
 *             CLOSED (unknown session → refuse), because it protects real
 *             dollars. Nothing in this file loosens it.
 *   - TIME  — this file. Caps how long a kid can spend building. Fails OPEN
 *             everywhere: a kid locked out of every Safe Family app because
 *             central had a bad minute is much worse than a kid getting some
 *             extra minutes.
 *
 * A kid must satisfy BOTH to keep building.
 *
 * Parents choose EITHER a per-app limit (sparkTimeLimits) OR one overall
 * limit across all five Safe Family apps (held by Marketing Central and
 * mirrored into sharedScreenTimeCache). Setting the overall limit IS the
 * toggle: while central reports `limitSet` it REPLACES this app's limit and
 * the per-app controls grey out.
 */

// ---------------------------------------------------------------------------
// Day keys
// ---------------------------------------------------------------------------

/**
 * "YYYY-MM-DD" for a moment, in the family's own timezone.
 *
 * The shared cross-app counter buckets usage by this string and Marketing
 * Central does no timezone maths of its own — so every app has to agree on
 * where the day boundary falls, or a kid gets a fresh allowance when one app
 * rolls over before another.
 */
export function dayKeyForTimezone(timezone: string | undefined, at?: number): string {
  const when = new Date(at ?? Date.now());
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the key we want.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(when);
  } catch {
    return when.toISOString().slice(0, 10);
  }
}

/** Cheap sanity check before we persist a client-supplied IANA timezone. */
export function isUsableTimezone(tz: string | undefined | null): tz is string {
  if (!tz || tz.length > 64 || !tz.includes('/')) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * The family a kid belongs to, and the timezone/day to bucket their usage by.
 *
 * `familyId` on kidProfiles is optional during migration, so fall back to the
 * parent's family row. Returns UTC when nothing has ever reported a timezone.
 */
export async function kidTimeContext(
  ctx: ReadCtx,
  kidProfileId: Id<'kidProfiles'>,
): Promise<{
  profile: Doc<'kidProfiles'>;
  family: Doc<'families'> | null;
  timezone: string | undefined;
  day: string;
} | null> {
  const profile = await ctx.db.get(kidProfileId);
  if (!profile) return null;
  let family = profile.familyId ? await ctx.db.get(profile.familyId) : null;
  if (!family) {
    family = await ctx.db
      .query('families')
      .withIndex('by_parent', (q) => q.eq('parentUserId', profile.parentUserId))
      .first();
  }
  const timezone = family?.timezone;
  return { profile, family, timezone, day: dayKeyForTimezone(timezone) };
}

// ---------------------------------------------------------------------------
// Recording usage
// ---------------------------------------------------------------------------

/**
 * Longest stretch a single call may credit. Beats arrive every ~60s; 150s
 * absorbs a slow network or a throttled background tab without letting a
 * long gap dump a big block of time in one go.
 */
const MAX_CREDIT_PER_CALL_SECONDS = 150;

/**
 * Add active seconds to today's usage row, clamped so the total can never
 * exceed real elapsed wall-clock time.
 *
 * Every recording path goes through here — the client heartbeat AND the
 * server-side per-build floor in /api/demo. Because the clamp is against a
 * shared `lastCreditedAt` watermark, the two can't double-count each other:
 * a build recorded right after a heartbeat credits ~0 extra seconds.
 *
 * NOTE ON RULE 1 (usage is always recorded, even over cap): this function has
 * no idea what the limit is and never refuses. Enforcement happens elsewhere,
 * by declining to serve. Refusing to record over-cap minutes would stop them
 * counting and make the limit easier to exceed, not harder.
 */
export async function creditActiveSeconds(
  ctx: WriteCtx,
  kidProfileId: Id<'kidProfiles'>,
  day: string,
  claimedSeconds: number,
): Promise<number> {
  const now = Date.now();
  const claimed = Math.max(0, Math.min(MAX_CREDIT_PER_CALL_SECONDS, Math.round(claimedSeconds)));

  const existing = await ctx.db
    .query('sparkTimeUsage')
    .withIndex('by_kid_day', (q) => q.eq('kidProfileId', kidProfileId).eq('day', day))
    .first();

  if (!existing) {
    await ctx.db.insert('sparkTimeUsage', {
      kidProfileId,
      day,
      activeSeconds: claimed,
      lastCreditedAt: now,
      updatedAt: now,
    });
    return claimed;
  }

  // Never credit more than has actually elapsed since the last beat.
  const elapsed = Math.max(0, Math.floor((now - existing.lastCreditedAt) / 1000));
  const credited = Math.min(claimed, elapsed);
  await ctx.db.patch(existing._id, {
    activeSeconds: existing.activeSeconds + credited,
    lastCreditedAt: now,
    updatedAt: now,
  });
  return credited;
}

/** Today's locally-observed active seconds for one kid. */
export async function activeSecondsToday(
  ctx: ReadCtx,
  kidProfileId: Id<'kidProfiles'>,
  day: string,
): Promise<number> {
  const row = await ctx.db
    .query('sparkTimeUsage')
    .withIndex('by_kid_day', (q) => q.eq('kidProfileId', kidProfileId).eq('day', day))
    .first();
  return row?.activeSeconds ?? 0;
}

// ---------------------------------------------------------------------------
// Evaluating the limit
// ---------------------------------------------------------------------------

/**
 * Read the cached family-wide verdict from inside a query.
 *
 * Returns null whenever the overall limit does not apply — never synced, no
 * combined limit set, or the cache has gone stale because central was
 * unreachable — and the caller falls back to this app's own limit. That is
 * the fail-open path.
 */
export async function cachedFamilyLimit(
  ctx: ReadCtx,
  kidProfileId: Id<'kidProfiles'>,
  day: string,
) {
  const cache = await ctx.db
    .query('sharedScreenTimeCache')
    .withIndex('by_kid_day', (q) => q.eq('kidProfileId', kidProfileId).eq('day', day))
    .first();

  if (!cache || !cache.limitSet) return null;

  // A long-stale cache is treated as "unknown" rather than enforced — the
  // number could be hours out of date.
  const STALE_MS = 15 * 60 * 1000;
  if (Date.now() - cache.syncedAt > STALE_MS) return null;

  return {
    allowed: cache.allowed,
    usedMinutes: cache.usedMinutes,
    limitMinutes: cache.limitMinutes,
    remainingMinutes: cache.remainingMinutes ?? 0,
  };
}

export type TimeLimitVerdict = {
  allowed: boolean;
  scope: 'family' | 'app' | 'none';
  limitMinutes: number | null;
  usedMinutes: number;
  remainingMinutes: number | null;
};

/**
 * THE single source of truth for "may this kid keep building right now".
 *
 * The kid-facing status query, the parent dashboard and the /api/demo gate
 * all call this, so what the kid is shown can't drift from what the server
 * enforces.
 */
export async function evaluateTimeLimit(
  ctx: ReadCtx,
  kidProfileId: Id<'kidProfiles'>,
): Promise<TimeLimitVerdict> {
  const openVerdict: TimeLimitVerdict = {
    allowed: true,
    scope: 'none',
    limitMinutes: null,
    usedMinutes: 0,
    remainingMinutes: null,
  };

  const context = await kidTimeContext(ctx, kidProfileId);
  if (!context) return openVerdict; // unknown profile → fail open

  const { day } = context;

  // FAMILY-WIDE LIMIT TAKES PRECEDENCE. While it's in force it replaces the
  // per-app limit entirely (and the per-app controls are greyed out).
  const family = await cachedFamilyLimit(ctx, kidProfileId, day);
  if (family) {
    return {
      allowed: family.allowed,
      scope: 'family',
      limitMinutes: family.limitMinutes,
      usedMinutes: family.usedMinutes,
      remainingMinutes: family.remainingMinutes,
    };
  }

  const limit = await ctx.db
    .query('sparkTimeLimits')
    .withIndex('by_kid', (q) => q.eq('kidProfileId', kidProfileId))
    .first();

  const usedSeconds = await activeSecondsToday(ctx, kidProfileId, day);
  const usedMinutes = Math.floor(usedSeconds / 60);

  if (!limit || limit.dailyLimitMinutes <= 0) {
    return { ...openVerdict, usedMinutes };
  }

  const remaining = Math.max(0, limit.dailyLimitMinutes - usedMinutes);
  return {
    allowed: remaining > 0,
    scope: 'app',
    limitMinutes: limit.dailyLimitMinutes,
    usedMinutes,
    remainingMinutes: remaining,
  };
}

// ---------------------------------------------------------------------------
// Kid-side API
// ---------------------------------------------------------------------------

async function kidFromSession(ctx: ReadCtx, sessionToken: string) {
  const session = await ctx.db
    .query('kidSessions')
    .withIndex('by_token', (q) => q.eq('sessionToken', sessionToken))
    .first();
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < Date.now()) return null;
  const profile = await ctx.db.get(session.kidProfileId);
  if (!profile) return null;
  return { session, profile };
}

/**
 * Heartbeat from the kid's workbench, plus the per-build floor called
 * server-side by /api/demo.
 *
 * DELIBERATELY UNAUTHENTICATED beyond the kid's own session token — that
 * token IS the kid's credential in SafeSpark, and this only ever writes to
 * the profile that token resolves to. It cannot read or touch another
 * family's data.
 *
 * What counts as usage: ACTIVE building time only. The workbench sends a beat
 * every 60s while the tab is visible AND the kid has interacted (or a build
 * is running) recently. An idle open tab sends nothing, so it costs nothing —
 * SafeTube learned this the hard way when a player left open overnight logged
 * 19-hour days.
 */
export const recordActive = mutation({
  args: {
    sessionToken: v.string(),
    activeSeconds: v.number(),
    // The kid device's IANA timezone. Adopted as the family's timezone only
    // if nothing has set one yet, so the screen-time day rolls over at the
    // family's midnight rather than UTC's.
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await kidFromSession(ctx, args.sessionToken);
    // Fail open and quiet — a stale token must never surface an error to a
    // kid mid-build. Nothing is granted by returning here.
    if (!resolved) return { recorded: false as const };

    const kidProfileId = resolved.profile._id as Id<'kidProfiles'>;
    const context = await kidTimeContext(ctx, kidProfileId);
    if (!context) return { recorded: false as const };

    let day = context.day;
    if (!context.timezone && context.family && isUsableTimezone(args.timezone)) {
      await ctx.db.patch(context.family._id, { timezone: args.timezone });
      day = dayKeyForTimezone(args.timezone);
    }

    const credited = await creditActiveSeconds(ctx, kidProfileId, day, args.activeSeconds);
    const verdict = await evaluateTimeLimit(ctx, kidProfileId);
    return { recorded: true as const, creditedSeconds: credited, ...verdict };
  },
});

/**
 * Kid-facing status — drives the "time's up" screen and the disabled
 * composer. Read-only, returns only this kid's own remaining minutes, and
 * knowing your own remaining time grants no access: the real gate is
 * /api/demo, which refuses to build once the cap is hit.
 */
export const kidStatus = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args): Promise<TimeLimitVerdict & { known: boolean }> => {
    const open = {
      known: false,
      allowed: true,
      scope: 'none' as const,
      limitMinutes: null,
      usedMinutes: 0,
      remainingMinutes: null,
    };
    const resolved = await kidFromSession(ctx, args.sessionToken);
    if (!resolved) return open;
    const verdict = await evaluateTimeLimit(ctx, resolved.profile._id);
    return { known: true, ...verdict };
  },
});

// ---------------------------------------------------------------------------
// Parent-side API — every entry point is ownership-checked.
// ---------------------------------------------------------------------------

async function requireParentOfKid(
  ctx: ReadCtx & { auth: { getUserIdentity: () => Promise<unknown> } },
  kidProfileId: Id<'kidProfiles'>,
  userToken?: string,
) {
  const resolved = await findUserRowByIdentity(ctx as unknown as SafeSparkCtx, userToken);
  if (!resolved) throw new Error('Sign in to manage screen time.');
  const profile = await ctx.db.get(kidProfileId);
  if (!profile) throw new Error('Kid profile not found.');
  if (profile.parentUserId !== resolved.row._id) {
    throw new Error('You do not own that kid profile.');
  }
  return { profile, parentUserId: resolved.row._id };
}

/**
 * Parent view of one kid's screen time: this app's own limit, today's usage,
 * and whether the family-wide limit is currently overriding both.
 *
 * Returns null (rather than throwing) when the caller isn't the owner, so the
 * dashboard renders an empty card instead of an error toast — but it never
 * returns another family's numbers.
 */
export const getTimeLimit = query({
  args: { kidProfileId: v.id('kidProfiles'), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const resolved = await findUserRowByIdentity(ctx as unknown as SafeSparkCtx, args.userToken);
    if (!resolved) return null;
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile || profile.parentUserId !== resolved.row._id) return null;

    const context = await kidTimeContext(ctx, args.kidProfileId);
    const day = context?.day ?? dayKeyForTimezone(undefined);
    const limit = await ctx.db
      .query('sparkTimeLimits')
      .withIndex('by_kid', (q) => q.eq('kidProfileId', args.kidProfileId))
      .first();
    const usedSeconds = await activeSecondsToday(ctx, args.kidProfileId, day);
    const family = await cachedFamilyLimit(ctx, args.kidProfileId, day);

    return {
      dailyLimitMinutes: limit?.dailyLimitMinutes ?? 0,
      // App minutes only — the family view (all five apps combined) comes
      // from sharedScreenTime.getFamilyLimit, which asks central directly.
      usedMinutesInSparkToday: Math.floor(usedSeconds / 60),
      familyLimitActive: family != null,
      familyLimitMinutes: family?.limitMinutes ?? null,
      familyUsedMinutes: family?.usedMinutes ?? null,
      timezone: context?.timezone ?? null,
    };
  },
});

/** Set (minutes > 0) or clear (0) this app's own daily limit for one kid. */
export const setTimeLimit = mutation({
  args: {
    kidProfileId: v.id('kidProfiles'),
    dailyLimitMinutes: v.number(), // 0 = unlimited
    // Parent's browser timezone, adopted if the family has none yet.
    timezone: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Parent-only. Without this, anyone reaching the deployment could raise
    // or remove any kid's cap.
    await requireParentOfKid(ctx as never, args.kidProfileId, args.userToken);

    const minutes = Math.max(0, Math.min(1440, Math.round(args.dailyLimitMinutes)));
    const now = Date.now();

    const context = await kidTimeContext(ctx, args.kidProfileId);
    if (context && !context.timezone && context.family && isUsableTimezone(args.timezone)) {
      await ctx.db.patch(context.family._id, { timezone: args.timezone });
    }

    const existing = await ctx.db
      .query('sparkTimeLimits')
      .withIndex('by_kid', (q) => q.eq('kidProfileId', args.kidProfileId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { dailyLimitMinutes: minutes, updatedAt: now });
    } else {
      await ctx.db.insert('sparkTimeLimits', {
        kidProfileId: args.kidProfileId,
        dailyLimitMinutes: minutes,
        updatedAt: now,
      });
    }
    return { ok: true, dailyLimitMinutes: minutes };
  },
});
