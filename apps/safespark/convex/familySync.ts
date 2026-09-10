import { v } from 'convex/values';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { isHashedPin } from './safeAuth';
import { isUsableTimezone } from './screenTime';

/**
 * Mirror the hub's UNIVERSAL family settings into SafeSpark.
 *
 * Marketing Central (the hub) is the source of truth for the family-wide
 * things a parent sets once: each kid's name, age, tile color, PIN, and
 * paused flag, plus the family timezone. This module pulls that bundle and
 * applies it to the local `families` / `kidProfiles` rows for the code, so a
 * kid the parent added on the hub shows up at /make?fc=CODE without the
 * parent ever opening SafeSpark's own profile setup.
 *
 * Same shape as sharedScreenTime.ts: an action does the HTTP, an internal
 * mutation does the writes. FAILS OPEN — a missing key, unknown family, or an
 * unreachable hub leaves local state exactly as it was.
 *
 * Never deletes a local profile. Never renames one.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || 'https://adamant-crow-705.convex.site';
const APP = 'safespark';
const HUB_TIMEOUT_MS = 6000;

/** SafeSpark names its shared key SAFESPARK_ADMIN_KEY; accept either name. */
function adminKey(): string | undefined {
  return process.env.SAFESPARK_ADMIN_KEY || process.env.ADMIN_KEY || undefined;
}

function normalizeCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === 6 ? code : null;
}

/** Tile colors the kid picker knows how to paint (see KidLoginGate). */
const AVATAR_COLORS_LIST = ['violet', 'pink', 'emerald', 'amber', 'sky', 'rose'];
const AVATAR_COLORS = new Set(AVATAR_COLORS_LIST);

type HubKid = {
  name: string;
  age: number | null;
  color: string | null;
  pinHash: string | null;
  paused: boolean;
  requestsEnabled: boolean;
  allowedStartTime: string | null;
  allowedEndTime: string | null;
  updatedAt: number;
};

type HubBundle = {
  familyCode: string;
  timezone: string | null;
  alertEmails: string[];
  updatedAt: number;
  kids: HubKid[];
};

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Local state the action needs before talking to the hub.
// ---------------------------------------------------------------------------

/**
 * The family for a code plus its kids, in the shape the hub's bootstrap
 * endpoint accepts. Only PINs already in the shared pbkdf2 format go up —
 * a legacy plaintext PIN is never sent anywhere.
 */
export const localFamily = internalQuery({
  args: { familyCode: v.string() },
  handler: async (ctx, { familyCode }) => {
    const family = await ctx.db
      .query('families')
      .withIndex('by_code', (q) => q.eq('familyCode', familyCode))
      .first();
    if (!family) return null;
    const profiles = await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family._id))
      .collect();
    return {
      familyId: family._id,
      kids: profiles.map((p) => ({
        name: p.displayName,
        age: p.age ?? null,
        color: p.avatarColor ?? null,
        pin: p.pin && isHashedPin(p.pin) ? p.pin : null,
        paused: p.accessPaused === true,
        // SafeSpark has no per-kid switch for "ask my parent" topic requests;
        // they are always on.
        requestsEnabled: true,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// Apply the hub bundle.
// ---------------------------------------------------------------------------

const hubKidValidator = v.object({
  name: v.string(),
  age: v.union(v.number(), v.null()),
  color: v.union(v.string(), v.null()),
  pinHash: v.union(v.string(), v.null()),
  paused: v.boolean(),
  requestsEnabled: v.boolean(),
  allowedStartTime: v.union(v.string(), v.null()),
  allowedEndTime: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});

/**
 * Field mapping (hub → SafeSpark kidProfiles):
 *   name        → matches displayName (trim, case-insensitive); creates when missing; never renames
 *   age         → age (only when the hub has a number)
 *   color       → avatarColor (only when it is one of the picker's palette names)
 *   pinHash     → pin (null clears the PIN)
 *   paused      → accessPaused
 *   requestsEnabled, allowedStartTime, allowedEndTime → no SafeSpark equivalent; ignored
 * Family-level:
 *   timezone    → families.timezone (only when usable)
 *   alertEmails → no per-family recipients field (concern alerts go to the parent's login email); ignored
 *
 * Skips the whole pass when the hub bundle hasn't changed since the last
 * apply AND every hub kid already exists locally.
 */
export const apply = internalMutation({
  args: {
    familyCode: v.string(),
    timezone: v.union(v.string(), v.null()),
    updatedAt: v.number(),
    kids: v.array(hubKidValidator),
  },
  handler: async (ctx, args) => {
    const family = await ctx.db
      .query('families')
      .withIndex('by_code', (q) => q.eq('familyCode', args.familyCode))
      .first();
    if (!family) return { applied: false, reason: 'no_local_family' as const };

    const parent = await ctx.db.get(family.parentUserId);
    if (!parent) return { applied: false, reason: 'no_parent' as const };

    const profiles = await ctx.db
      .query('kidProfiles')
      .withIndex('by_family', (q) => q.eq('familyId', family._id))
      .collect();

    // Newest profile per name wins, mirroring what lookupByCode shows the kid.
    const byName = new Map<string, (typeof profiles)[number]>();
    for (const p of [...profiles].sort((a, b) => b.createdAt - a.createdAt)) {
      const key = nameKey(p.displayName);
      if (!byName.has(key)) byName.set(key, p);
    }

    const hubStamp = args.kids.reduce((max, k) => Math.max(max, k.updatedAt), args.updatedAt);
    const everyKidExists = args.kids.every((k) => byName.has(nameKey(k.name)));
    const appliedAt = parent.familySyncAppliedAt ?? 0;
    if (appliedAt >= hubStamp && everyKidExists) {
      return { applied: false, reason: 'unchanged' as const };
    }

    const now = Date.now();
    let created = 0;
    let updated = 0;

    for (const kid of args.kids) {
      const name = kid.name.trim();
      if (!name) continue;
      const local = byName.get(nameKey(name));
      const color = kid.color && AVATAR_COLORS.has(kid.color) ? kid.color : undefined;

      if (!local) {
        // Same defaults as kidProfiles.create for a profile the parent has
        // not filled in here yet. The hub carries no sex and the schema
        // requires one; it is only ever a display label in SafeSpark.
        const id = await ctx.db.insert('kidProfiles', {
          familyId: family._id,
          parentUserId: family.parentUserId,
          displayName: name,
          age: kid.age ?? undefined,
          sex: 'boy',
          interests: [],
          avoidTopics: [],
          pin: kid.pinHash ?? undefined,
          avatarColor: color ?? AVATAR_COLORS_LIST[(profiles.length + created) % AVATAR_COLORS_LIST.length],
          accessPaused: kid.paused ? true : undefined,
          personalityLayers: [],
          createdAt: now,
          updatedAt: now,
        });
        const inserted = await ctx.db.get(id);
        if (inserted) byName.set(nameKey(name), inserted);
        created++;
        continue;
      }

      const patch: Record<string, unknown> = {};
      if (typeof kid.age === 'number' && local.age !== kid.age) patch.age = kid.age;
      if (color && local.avatarColor !== color) patch.avatarColor = color;
      if ((local.pin ?? null) !== kid.pinHash) patch.pin = kid.pinHash ?? undefined;
      const localPaused = local.accessPaused === true;
      if (localPaused !== kid.paused) patch.accessPaused = kid.paused;
      if (Object.keys(patch).length) {
        await ctx.db.patch(local._id, { ...patch, updatedAt: now });
        updated++;
      }
    }

    if (isUsableTimezone(args.timezone) && family.timezone !== args.timezone) {
      await ctx.db.patch(family._id, { timezone: args.timezone });
    }

    await ctx.db.patch(parent._id, { familySyncAppliedAt: now });
    return { applied: true, created, updated };
  },
});

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

/**
 * Pull the family bundle for a code from the hub and apply it locally.
 * Fire-and-forget from the parent dashboard and the kid gate.
 *
 * Takes only a family code, like the kid gate's lookup: the only thing a
 * caller can make happen is "local state now matches the hub", and the hub
 * only answers a request carrying the server-side admin key. The result
 * carries counts, never PINs or emails.
 *
 * When the hub knows the family but has NO kids yet and this app does, the
 * app hands its profiles up once (bootstrap) and re-pulls, so the hub adopts
 * them instead of SafeSpark wiping the picker.
 */
export const pull = action({
  args: { familyCode: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    synced: boolean;
    reason?: string;
    bootstrapped?: number;
    created?: number;
    updated?: number;
  }> => {
    const key = adminKey();
    if (!key) return { synced: false, reason: 'not_configured' };
    const familyCode = normalizeCode(args.familyCode);
    if (!familyCode) return { synced: false, reason: 'bad_code' };

    const getBundle = async (): Promise<HubBundle | null | 'error'> => {
      const url = new URL(`${CENTRAL_URL}/family/sync`);
      url.searchParams.set('familyCode', familyCode);
      url.searchParams.set('key', key);
      const res = await fetchWithTimeout(url.toString());
      if (res.status === 404) return null;
      if (!res.ok) return 'error';
      return (await res.json()) as HubBundle;
    };

    try {
      let bundle = await getBundle();
      if (bundle === null) return { synced: false, reason: 'unknown_family' };
      if (bundle === 'error') return { synced: false, reason: 'hub_error' };

      let bootstrapped = 0;
      if (bundle.kids.length === 0) {
        const local = await ctx.runQuery(internal.familySync.localFamily, { familyCode });
        if (local && local.kids.length > 0) {
          const res = await fetchWithTimeout(`${CENTRAL_URL}/family/kids/bootstrap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ familyCode, app: APP, key, kids: local.kids }),
          });
          if (res.ok) {
            bootstrapped = local.kids.length;
            const again = await getBundle();
            if (again && again !== 'error') bundle = again;
          }
        }
      }

      const result = await ctx.runMutation(internal.familySync.apply, {
        familyCode,
        timezone: bundle.timezone ?? null,
        updatedAt: bundle.updatedAt,
        kids: bundle.kids.map((k) => ({
          name: k.name,
          age: k.age ?? null,
          color: k.color ?? null,
          pinHash: k.pinHash ?? null,
          paused: k.paused === true,
          requestsEnabled: k.requestsEnabled !== false,
          allowedStartTime: k.allowedStartTime ?? null,
          allowedEndTime: k.allowedEndTime ?? null,
          updatedAt: typeof k.updatedAt === 'number' ? k.updatedAt : bundle.updatedAt,
        })),
      });

      if (!result.applied) return { synced: true, reason: result.reason, bootstrapped };
      return { synced: true, bootstrapped, created: result.created, updated: result.updated };
    } catch (err) {
      console.error('[familySync.pull] hub unreachable:', err);
      return { synced: false, reason: 'central_unreachable' };
    }
  },
});
