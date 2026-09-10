import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createKidProfileWithDefaults } from "./kidProfiles";

/**
 * Mirror the hub's UNIVERSAL family settings into this app.
 *
 * The hub (getsafefamily.com, Marketing Central) owns each family's children
 * and their universal switches: PIN, paused, requests on/off, colour, age.
 * SafeTube keeps its own kidProfiles rows (content, per-app limits, watch
 * history hang off them), so on every parent-dashboard load and every kid
 * profile-picker load we pull the hub's bundle and overlay the universal
 * fields onto the matching local profiles.
 *
 * Matching is by kid NAME (trimmed, case-insensitive) or any of the hub kid's
 * `aliases` (e.g. "isabella" ↔ "bella") — the same key the shared screen-time
 * bridge uses. Local profiles are never deleted; a kid the hub knows but we
 * don't (by name or alias) gets created with the usual defaults.
 *
 * FAILS OPEN. Missing ADMIN_KEY, unknown family, or an unreachable hub leaves
 * the local rows untouched; the app keeps working on whatever it last had.
 *
 * Same wire style as sharedScreenTime.ts: `key` param carries ADMIN_KEY.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";
const APP = "safetube";

// SafeTube's `ageRange` column is a legacy string with no local writer; the
// only values in the fleet are SafeTunes' buckets, so we use those.
const AGE_RANGES = ["3-5", "6-8", "9-12", "13+"] as const;
type AgeRange = (typeof AGE_RANGES)[number];

export function ageToAgeRange(age: number | null | undefined): AgeRange | undefined {
  if (age === null || age === undefined || !Number.isFinite(age)) return undefined;
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 12) return "9-12";
  return "13+";
}

/** Lossy inverse used only for the one-time bootstrap hand-up: bucket midpoint. */
export function ageRangeToAge(range: string | null | undefined): number | undefined {
  switch (range) {
    case "3-5": return 4;
    case "6-8": return 7;
    case "9-12": return 10;
    case "13+": return 13;
    default: return undefined;
  }
}

const normName = (s: string) => s.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Bundle shape (what /family/sync returns). Kept permissive with optional +
// null unions so a hub field we don't know about can't 500 the mutation; the
// action strips unknown keys before handing the bundle over.
// ---------------------------------------------------------------------------
const bundleKidValidator = v.object({
  name: v.string(),
  age: v.optional(v.union(v.number(), v.null())),
  color: v.optional(v.union(v.string(), v.null())),
  pinHash: v.optional(v.union(v.string(), v.null())),
  paused: v.optional(v.boolean()),
  requestsEnabled: v.optional(v.boolean()),
  allowedStartTime: v.optional(v.union(v.string(), v.null())),
  allowedEndTime: v.optional(v.union(v.string(), v.null())),
  aliases: v.optional(v.array(v.string())), // lowercased names for the same child
  updatedAt: v.optional(v.number()),
});

const bundleValidator = v.object({
  familyCode: v.string(),
  timezone: v.optional(v.union(v.string(), v.null())),
  alertEmails: v.optional(v.array(v.string())),
  updatedAt: v.number(),
  kids: v.array(bundleKidValidator),
});

type BundleKid = {
  name: string;
  age?: number | null;
  color?: string | null;
  pinHash?: string | null;
  paused?: boolean;
  requestsEnabled?: boolean;
  allowedStartTime?: string | null;
  allowedEndTime?: string | null;
  aliases?: string[];
  updatedAt?: number;
};
type Bundle = {
  familyCode: string;
  timezone?: string | null;
  alertEmails?: string[];
  updatedAt: number;
  kids: BundleKid[];
};

/** Reduce whatever the hub sent to exactly the fields our validator knows. */
function normalizeBundle(raw: any, familyCode: string): Bundle | null {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.kids)) return null;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
  const strOrNull = (x: unknown) => (typeof x === "string" ? x : x === null ? null : undefined);
  const kids: BundleKid[] = [];
  for (const k of raw.kids) {
    if (!k || typeof k.name !== "string" || !k.name.trim()) continue;
    kids.push({
      name: k.name,
      age: typeof k.age === "number" ? k.age : k.age === null ? null : undefined,
      color: strOrNull(k.color),
      pinHash: strOrNull(k.pinHash),
      paused: typeof k.paused === "boolean" ? k.paused : undefined,
      requestsEnabled: typeof k.requestsEnabled === "boolean" ? k.requestsEnabled : undefined,
      allowedStartTime: strOrNull(k.allowedStartTime),
      allowedEndTime: strOrNull(k.allowedEndTime),
      aliases: Array.isArray(k.aliases)
        ? k.aliases.filter((a: unknown): a is string => typeof a === "string").map(normName)
        : [],
      updatedAt: num(k.updatedAt),
    });
  }
  return {
    familyCode: typeof raw.familyCode === "string" ? raw.familyCode : familyCode,
    timezone: strOrNull(raw.timezone),
    alertEmails: Array.isArray(raw.alertEmails)
      ? raw.alertEmails.filter((e: unknown) => typeof e === "string")
      : undefined,
    updatedAt: num(raw.updatedAt) ?? Date.now(),
    kids,
  };
}

// ---------------------------------------------------------------------------
// Local reads
// ---------------------------------------------------------------------------

/** The parent row + local kid profiles for a family code (for bootstrap). */
export const localFamily = internalQuery({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", args.familyCode.toUpperCase()))
      .first();
    if (!user) return null;
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return {
      userId: user._id,
      familySyncAppliedAt: user.familySyncAppliedAt ?? null,
      familySyncBootstrappedAt: user.familySyncBootstrappedAt ?? null,
      kids: profiles.map((p) => ({
        name: p.name,
        age: ageRangeToAge(p.ageRange),
        color: p.color,
        pin: p.pin ?? null, // stored value: pbkdf2 hash, or legacy plaintext
        paused: Boolean(p.videoPaused),
        requestsEnabled: p.requestsEnabled ?? true,
        allowedStartTime: null,
        allowedEndTime: null,
      })),
    };
  },
});

/** Stamp the one-time hand-up so we don't repeat it on every load. */
export const markBootstrapped = internalMutation({
  args: { userId: v.id("users"), at: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { familySyncBootstrappedAt: args.at });
  },
});

/** Family code for a kid profile — handy for callers that only hold the kid id. */
export const familyCodeForKid = internalQuery({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    const parent = await ctx.db.get(profile.userId);
    return parent?.familyCode ?? null;
  },
});

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * Overlay the hub bundle onto local kid profiles.
 *
 * Field mapping (hub → SafeTube kidProfiles):
 *   pinHash          → pin            (null clears; change also resets lockout)
 *   paused           → videoPaused
 *   requestsEnabled  → requestsEnabled
 *   color            → color          (only when the hub has one)
 *   age              → ageRange       (bucketed: ≤5 "3-5", 6-8 "6-8", 9-12 "9-12", 13+ "13+")
 *   allowedStart/End → (no SafeTube equivalent yet; ignored)
 *
 * Idempotent: skipped entirely when users.familySyncAppliedAt already equals
 * bundle.updatedAt.
 */
export const apply = internalMutation({
  args: { familyCode: v.string(), bundle: bundleValidator },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", args.familyCode.toUpperCase()))
      .first();
    if (!user) return { applied: false, reason: "no_local_family" as const };

    if (user.familySyncAppliedAt === args.bundle.updatedAt) {
      return { applied: false, reason: "up_to_date" as const };
    }

    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const byName = new Map<string, (typeof profiles)[number]>();
    for (const p of profiles) {
      const key = normName(p.name);
      if (!byName.has(key)) byName.set(key, p); // first (oldest) wins on dupes
    }

    let created = 0;
    let patched = 0;
    for (const kid of args.bundle.kids) {
      const key = normName(kid.name);
      // Exact name first, then any alias the hub says means the same child.
      // An alias hit must never spawn a duplicate profile.
      let profile = byName.get(key);
      if (!profile) {
        for (const alias of kid.aliases ?? []) {
          profile = byName.get(normName(alias));
          if (profile) break;
        }
      }
      let profileId: Id<"kidProfiles">;
      if (!profile) {
        profileId = await createKidProfileWithDefaults(ctx, {
          userId: user._id,
          name: kid.name.trim(),
          color: kid.color ?? undefined,
        });
        const fresh = await ctx.db.get(profileId);
        if (!fresh) continue;
        profile = fresh;
        byName.set(key, fresh);
        created++;
      } else {
        profileId = profile._id;
      }

      const patch: Record<string, unknown> = {};

      if (kid.pinHash !== undefined) {
        const nextPin = kid.pinHash ?? undefined;
        if ((profile.pin ?? undefined) !== nextPin) {
          patch.pin = nextPin;
          patch.pinFailedAttempts = undefined;
          patch.pinLockedUntil = undefined;
        }
      }
      if (kid.paused !== undefined && Boolean(profile.videoPaused) !== kid.paused) {
        patch.videoPaused = kid.paused;
      }
      if (
        kid.requestsEnabled !== undefined &&
        (profile.requestsEnabled ?? true) !== kid.requestsEnabled
      ) {
        patch.requestsEnabled = kid.requestsEnabled;
      }
      if (kid.color && profile.color !== kid.color) {
        patch.color = kid.color;
      }
      const range = ageToAgeRange(kid.age);
      if (range && profile.ageRange !== range) {
        patch.ageRange = range;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(profileId, patch);
        patched++;
      }
    }

    await ctx.db.patch(user._id, { familySyncAppliedAt: args.bundle.updatedAt });
    return { applied: true, created, patched, kids: args.bundle.kids.length };
  },
});

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

type PullResult = {
  synced: boolean;
  reason?: string;
  bootstrapped?: boolean;
  applied?: boolean;
  created?: number;
  patched?: number;
  kids?: number;
};

async function fetchBundle(
  familyCode: string,
  adminKey: string
): Promise<{ status: number; bundle: Bundle | null }> {
  const url = new URL(`${CENTRAL_URL}/family/sync`);
  url.searchParams.set("familyCode", familyCode);
  url.searchParams.set("key", adminKey);
  const res = await fetch(url.toString());
  if (!res.ok) return { status: res.status, bundle: null };
  const raw = await res.json().catch(() => null);
  return { status: res.status, bundle: normalizeBundle(raw, familyCode) };
}

/**
 * Fetch the hub's family bundle and apply it locally. Fire-and-forget from the
 * parent dashboard and the kid profile picker.
 *
 * Every app hands its kids up ONCE via /family/kids/bootstrap (the hub fills
 * gaps on kids it already knows and never overwrites), then re-fetches. We
 * also hand up whenever the hub reports zero kids, so a wiped hub recovers.
 */
export const pull = action({
  args: { familyCode: v.string() },
  handler: async (ctx, args): Promise<PullResult> => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return { synced: false, reason: "not_configured" };

    const familyCode = args.familyCode.trim().toUpperCase();
    if (!familyCode) return { synced: false, reason: "no_family_code" };

    try {
      let { status, bundle } = await fetchBundle(familyCode, adminKey);
      if (status === 404) return { synced: false, reason: "unknown_family" };
      if (!bundle) return { synced: false, reason: `sync_${status}` };

      let bootstrapped = false;
      const local = await ctx.runQuery(internal.familySync.localFamily, { familyCode });
      const needsHandUp =
        local !== null && (bundle.kids.length === 0 || local.familySyncBootstrappedAt === null);
      if (needsHandUp && local) {
        if (local.kids.length > 0) {
          const res = await fetch(`${CENTRAL_URL}/family/kids/bootstrap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              familyCode,
              app: APP,
              key: adminKey,
              kids: local.kids,
            }),
          });
          if (!res.ok) {
            console.warn(`[familySync.pull] bootstrap ${res.status} for ${familyCode}`);
            return { synced: false, reason: `bootstrap_${res.status}` };
          }
          bootstrapped = true;
          // Stamp only after a successful hand-up. With no local kids yet we
          // leave it unset so the first pull after the parent adds one hands
          // it up.
          await ctx.runMutation(internal.familySync.markBootstrapped, {
            userId: local.userId,
            at: Date.now(),
          });
          ({ status, bundle } = await fetchBundle(familyCode, adminKey));
          if (!bundle) return { synced: false, reason: `sync_${status}`, bootstrapped };
        }
      }

      const result = await ctx.runMutation(internal.familySync.apply, { familyCode, bundle });
      return {
        synced: true,
        bootstrapped,
        applied: result.applied,
        reason: result.applied ? undefined : result.reason,
        created: "created" in result ? result.created : undefined,
        patched: "patched" in result ? result.patched : undefined,
        kids: "kids" in result ? result.kids : undefined,
      };
    } catch (err) {
      console.error("[familySync.pull] hub unreachable:", err);
      return { synced: false, reason: "central_unreachable" };
    }
  },
});
