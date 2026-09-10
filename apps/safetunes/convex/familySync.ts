import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Mirror the hub's UNIVERSAL family settings into SafeTunes.
 *
 * Marketing Central (the hub) owns the family's children and their per-child
 * switches: PIN, paused, allowed hours, color, age. A parent sets a thing once
 * on the hub and every Safe Family app picks it up. This module is the
 * SafeTunes side of that: `pull` fetches the bundle and `apply` writes it onto
 * the local `users` / `kidProfiles` rows.
 *
 * Matching is by kid NAME (trimmed, case-insensitive) — the same key the
 * shared screen-time bridge uses. Kids the hub knows but SafeTunes doesn't are
 * created with the app's normal defaults. Local profiles are NEVER deleted.
 *
 * First-contact hand-up: when the hub has no children for a family but this
 * app does (the family predates the hub owning kids), we POST our profiles to
 * /family/kids/bootstrap once, then re-pull. From then on the hub is truth.
 *
 * FAILS OPEN like sharedScreenTime.ts: no ADMIN_KEY, hub unreachable, unknown
 * family → leave the local rows alone.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";
const APP = "safetunes";
const FETCH_TIMEOUT_MS = 8000;

// ───────────────────────── mapping helpers ───────────────────────────────────

/** SafeTunes kid color ids (src/constants/avatars.jsx COLORS). */
const LOCAL_COLOR_IDS = new Set([
  "purple", "blue", "green", "yellow", "pink", "red", "indigo", "orange", "teal", "cyan",
]);

/** Hub palette (sites/marketing FamilyTab COLORS) → closest SafeTunes id. */
const HUB_HEX_TO_LOCAL: Record<string, string> = {
  "#F0603A": "orange", // coral
  "#7C4DE0": "purple", // grape
  "#3AA06B": "green",  // leaf
  "#2F6BF0": "blue",   // cobalt
  "#F2A413": "yellow", // amber
  "#E0457B": "pink",
  "#0EA5A4": "teal",
};
const LOCAL_TO_HUB_HEX: Record<string, string> = {
  orange: "#F0603A",
  red: "#F0603A",
  purple: "#7C4DE0",
  indigo: "#7C4DE0",
  green: "#3AA06B",
  blue: "#2F6BF0",
  cyan: "#2F6BF0",
  yellow: "#F2A413",
  pink: "#E0457B",
  teal: "#0EA5A4",
};

/** Hub color (hex or id) → SafeTunes color id, or undefined when unmappable. */
export function hubColorToLocal(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  const c = color.trim();
  if (LOCAL_COLOR_IDS.has(c.toLowerCase())) return c.toLowerCase();
  return HUB_HEX_TO_LOCAL[c.toUpperCase()];
}

/** Age in years → the ageRange strings SafeTunes already uses. */
export function ageToAgeRange(age: number | null | undefined): string | undefined {
  if (typeof age !== "number" || !Number.isFinite(age)) return undefined;
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 12) return "9-12";
  return "13+";
}

const normName = (s: string) => s.trim().toLowerCase();

// ───────────────────────── bundle shape ──────────────────────────────────────

const nullableString = v.union(v.string(), v.null());

const bundleKidValidator = v.object({
  name: v.string(),
  age: v.union(v.number(), v.null()),
  color: nullableString,
  pinHash: nullableString,
  paused: v.boolean(),
  requestsEnabled: v.boolean(),
  allowedStartTime: nullableString,
  allowedEndTime: nullableString,
  updatedAt: v.number(),
});

const bundleValidator = v.object({
  familyCode: v.string(),
  timezone: nullableString,
  alertEmails: v.array(v.string()),
  updatedAt: v.number(),
  kids: v.array(bundleKidValidator),
});

type BundleKid = {
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
type Bundle = {
  familyCode: string;
  timezone: string | null;
  alertEmails: string[];
  updatedAt: number;
  kids: BundleKid[];
};

/** Pick exactly the fields the mutation validator accepts (hub may add more later). */
function normalizeBundle(raw: any): Bundle | null {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.kids)) return null;
  const str = (x: unknown): string | null => (typeof x === "string" ? x : null);
  return {
    familyCode: String(raw.familyCode ?? ""),
    timezone: str(raw.timezone),
    alertEmails: Array.isArray(raw.alertEmails)
      ? raw.alertEmails.filter((e: unknown) => typeof e === "string")
      : [],
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    kids: raw.kids
      .filter((k: any) => k && typeof k.name === "string")
      .map((k: any): BundleKid => ({
        name: k.name,
        age: typeof k.age === "number" ? k.age : null,
        color: str(k.color),
        pinHash: str(k.pinHash),
        paused: Boolean(k.paused),
        requestsEnabled: k.requestsEnabled !== false,
        allowedStartTime: str(k.allowedStartTime),
        allowedEndTime: str(k.allowedEndTime),
        updatedAt: typeof k.updatedAt === "number" ? k.updatedAt : 0,
      })),
  };
}

// ───────────────────────── local snapshot (for bootstrap) ────────────────────

export const localSnapshot = internalQuery({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const parent = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) => q.eq("familyCode", args.familyCode))
      .first();
    if (!parent) return null;
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", parent._id))
      .collect();
    return {
      familySyncAppliedAt: parent.familySyncAppliedAt ?? null,
      kids: profiles.map((p) => ({
        name: p.name,
        color: p.color ? LOCAL_TO_HUB_HEX[p.color] ?? null : null,
        pin: p.pin ?? null,
        paused: Boolean(p.musicPaused),
        requestsEnabled: true,
        allowedStartTime: p.timeOfDayEnabled ? p.allowedStartTime ?? null : null,
        allowedEndTime: p.timeOfDayEnabled ? p.allowedEndTime ?? null : null,
      })),
    };
  },
});

// ───────────────────────── apply ─────────────────────────────────────────────

export const apply = internalMutation({
  args: { familyCode: v.string(), bundle: bundleValidator },
  handler: async (ctx, args) => {
    const { bundle } = args;
    const parent = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) => q.eq("familyCode", args.familyCode))
      .first();
    if (!parent) return { applied: false, reason: "no_local_parent" as const };

    // Unchanged since last apply → nothing to do.
    if (
      bundle.updatedAt > 0 &&
      parent.familySyncAppliedAt !== undefined &&
      parent.familySyncAppliedAt === bundle.updatedAt
    ) {
      return { applied: false, reason: "unchanged" as const };
    }

    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", parent._id))
      .collect();
    const byName = new Map(profiles.map((p) => [normName(p.name), p]));

    let created = 0;
    let updated = 0;

    for (const kid of bundle.kids) {
      const name = kid.name.trim();
      if (!name) continue;

      const bothHours = Boolean(kid.allowedStartTime && kid.allowedEndTime);
      const color = hubColorToLocal(kid.color);
      const ageRange = ageToAgeRange(kid.age);

      const existing = byName.get(normName(name));
      if (!existing) {
        // Same defaults as kidProfiles.createKidProfile / createKidProfileInternal.
        await ctx.db.insert("kidProfiles", {
          userId: parent._id,
          name,
          avatar: "default",
          color: color ?? "purple",
          pin: kid.pinHash ?? undefined,
          createdAt: Date.now(),
          ageRange,
          musicPaused: kid.paused,
          allowedStartTime: kid.allowedStartTime ?? undefined,
          allowedEndTime: kid.allowedEndTime ?? undefined,
          timeOfDayEnabled: bothHours,
        });
        created++;
        continue;
      }

      const patch: Record<string, unknown> = {};

      // PIN: hub hash wins; null clears. A changed PIN also clears any lockout.
      const nextPin = kid.pinHash ?? undefined;
      if ((existing.pin ?? undefined) !== nextPin) {
        patch.pin = nextPin;
        patch.pinFailedAttempts = undefined;
        patch.pinLockedUntil = undefined;
      }

      if (Boolean(existing.musicPaused) !== kid.paused) patch.musicPaused = kid.paused;

      const nextStart = kid.allowedStartTime ?? undefined;
      const nextEnd = kid.allowedEndTime ?? undefined;
      if ((existing.allowedStartTime ?? undefined) !== nextStart) patch.allowedStartTime = nextStart;
      if ((existing.allowedEndTime ?? undefined) !== nextEnd) patch.allowedEndTime = nextEnd;
      if (Boolean(existing.timeOfDayEnabled) !== bothHours) patch.timeOfDayEnabled = bothHours;

      if (color && existing.color !== color) patch.color = color;
      if (ageRange && existing.ageRange !== ageRange) patch.ageRange = ageRange;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
        updated++;
      }
    }

    const parentPatch: Record<string, unknown> = {
      familySyncAppliedAt: bundle.updatedAt > 0 ? bundle.updatedAt : Date.now(),
    };
    if (!parent.timezone && bundle.timezone) parentPatch.timezone = bundle.timezone;
    await ctx.db.patch(parent._id, parentPatch);

    return { applied: true, created, updated };
  },
});

// ───────────────────────── pull ──────────────────────────────────────────────

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBundle(familyCode: string, adminKey: string) {
  const url = new URL(`${CENTRAL_URL}/family/sync`);
  url.searchParams.set("familyCode", familyCode);
  url.searchParams.set("key", adminKey);
  const res = await fetchWithTimeout(url.toString());
  if (res.status === 404) return { status: "unknown_family" as const, bundle: null };
  if (!res.ok) return { status: `http_${res.status}` as const, bundle: null };
  const bundle = normalizeBundle(await res.json());
  if (!bundle) return { status: "bad_bundle" as const, bundle: null };
  return { status: "ok" as const, bundle };
}

/**
 * Pull the hub's universal settings for one family and apply them locally.
 * Fire-and-forget from the parent dashboard and the kid profile picker.
 * Unauthenticated on purpose: the kid path only has the family code, and the
 * only thing this can do is make SafeTunes agree with the hub.
 */
type PullResult = {
  ok: boolean;
  reason?: string;
  applied?: boolean;
  created?: number;
  updated?: number;
};

export const pull = action({
  args: { familyCode: v.string() },
  // Explicit return type: the action references internal.familySync.* from
  // this same file, and without it TS reports a circular 'any' (TS7022).
  handler: async (ctx, args): Promise<PullResult> => {
    const familyCode = args.familyCode.trim().toUpperCase();
    if (familyCode.length !== 6) return { ok: false, reason: "bad_family_code" };

    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return { ok: false, reason: "no_admin_key" };

    try {
      let { status, bundle } = await fetchBundle(familyCode, adminKey);
      if (!bundle) return { ok: false, reason: status };

      // First contact: the hub has no kids for this family but we do → hand
      // ours up once, then re-pull so the bundle we apply is the hub's copy.
      if (bundle.kids.length === 0) {
        const local = await ctx.runQuery(internal.familySync.localSnapshot, { familyCode });
        if (local && local.kids.length > 0) {
          const res = await fetchWithTimeout(`${CENTRAL_URL}/family/kids/bootstrap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familyCode, app: APP, key: adminKey, kids: local.kids }),
          });
          if (res.ok) {
            const again = await fetchBundle(familyCode, adminKey);
            if (again.bundle) bundle = again.bundle;
          } else {
            console.warn(`[familySync] bootstrap failed for ${familyCode}: HTTP ${res.status}`);
          }
        }
      }

      const result: { applied: boolean; reason?: string; created?: number; updated?: number } =
        await ctx.runMutation(internal.familySync.apply, { familyCode, bundle });
      return { ok: true, ...result };
    } catch (err) {
      console.warn(`[familySync] pull failed for ${familyCode}:`, err);
      return { ok: false, reason: "unreachable" };
    }
  },
});
