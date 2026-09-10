import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { isHashedPin } from "./safeAuth";

/**
 * Mirror the hub's UNIVERSAL family settings into SafeReads.
 *
 * Marketing Central (the hub) is the source of truth for the family's kids:
 * name, age, avatar color, PIN, paused, and whether the kid may send requests.
 * `pull` fetches the family bundle and `apply` writes it onto the local
 * `users` / `kids` rows, matching kids by name (trim, case-insensitive).
 *
 * Local kids are NEVER deleted. When the hub knows no kids for the family yet
 * but SafeReads does, `pull` bootstraps the hub with the local kids once and
 * re-fetches so the hub-issued PIN hashes land locally.
 *
 * FAILS OPEN throughout — a missing ADMIN_KEY, unknown family, or unreachable
 * hub leaves the local rows exactly as they were. Same style as
 * convex/sharedScreenTime.ts.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";
const APP = "safereads";

interface HubKid {
  name: string;
  age: number | null;
  color: string | null;
  pinHash: string | null;
  paused: boolean;
  requestsEnabled: boolean;
  allowedStartTime: string | null;
  allowedEndTime: string | null;
  updatedAt: number;
}

interface HubBundle {
  familyCode: string;
  timezone: string | null;
  alertEmails: string[];
  updatedAt: number;
  kids: HubKid[];
}

const hubKidValidator = v.object({
  name: v.string(),
  age: v.union(v.number(), v.null()),
  color: v.union(v.string(), v.null()),
  pinHash: v.union(v.string(), v.null()),
  paused: v.boolean(),
  requestsEnabled: v.boolean(),
  updatedAt: v.number(),
});

const normalizeName = (name: string) => name.trim().toLowerCase();

/** The newest timestamp in a bundle — a kid can change without the family row. */
function bundleVersion(bundle: HubBundle): number {
  return Math.max(bundle.updatedAt ?? 0, ...bundle.kids.map((k) => k.updatedAt ?? 0));
}

/** Local kids for a family (used to decide whether to bootstrap the hub). */
export const localKids = internalQuery({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const parent = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) => q.eq("familyCode", args.familyCode))
      .first();
    if (!parent) return null;
    const kids = await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", parent._id))
      .collect();
    return kids.map((k) => ({
      name: k.name,
      age: k.age ?? null,
      color: k.color ?? null,
      // The hub hashes what we send. Only a legacy plaintext PIN can be
      // adopted — a locally hashed one would be double-hashed and useless.
      pin: k.pin && !isHashedPin(k.pin) ? k.pin : null,
      paused: k.accessPaused === true,
      requestsEnabled: k.requestsEnabled !== false,
    }));
  },
});

/** Write the hub bundle onto local rows. Skips when nothing changed. */
export const apply = internalMutation({
  args: {
    familyCode: v.string(),
    version: v.number(),
    kids: v.array(hubKidValidator),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) => q.eq("familyCode", args.familyCode))
      .first();
    if (!parent) return { applied: false as const, reason: "no_parent" as const };
    if (parent.familySyncAppliedAt === args.version) {
      return { applied: false as const, reason: "unchanged" as const };
    }

    const local = await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", parent._id))
      .collect();
    const byName = new Map(local.map((k) => [normalizeName(k.name), k]));

    let created = 0;
    let patched = 0;
    for (const hubKid of args.kids) {
      const key = normalizeName(hubKid.name);
      if (!key) continue;
      const existing = byName.get(key);

      if (!existing) {
        // Same defaults as kids.create.
        await ctx.db.insert("kids", {
          userId: parent._id,
          name: hubKid.name.trim(),
          age: hubKid.age ?? undefined,
          color: hubKid.color || "purple",
          pin: hubKid.pinHash ?? undefined,
          accessPaused: hubKid.paused,
          requestsEnabled: hubKid.requestsEnabled,
          createdAt: Date.now(),
        });
        created++;
        continue;
      }

      const patch: Record<string, unknown> = {};
      const nextPin = hubKid.pinHash ?? undefined;
      if (existing.pin !== nextPin) patch.pin = nextPin;
      const nextAge = hubKid.age ?? undefined;
      if (existing.age !== nextAge) patch.age = nextAge;
      if (hubKid.color && existing.color !== hubKid.color) patch.color = hubKid.color;
      if ((existing.accessPaused === true) !== hubKid.paused) patch.accessPaused = hubKid.paused;
      if ((existing.requestsEnabled !== false) !== hubKid.requestsEnabled) {
        patch.requestsEnabled = hubKid.requestsEnabled;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
        patched++;
      }
    }

    await ctx.db.patch(parent._id, { familySyncAppliedAt: args.version });
    return { applied: true as const, created, patched };
  },
});

async function fetchBundle(
  familyCode: string,
  adminKey: string
): Promise<HubBundle | null> {
  const url = new URL(`${CENTRAL_URL}/family/sync`);
  url.searchParams.set("familyCode", familyCode);
  url.searchParams.set("key", adminKey);
  const res = await fetch(url.toString());
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`sync_${res.status}`);
  return (await res.json()) as HubBundle;
}

/**
 * Pull the family's universal settings from the hub and apply them locally.
 * Fired (fire-and-forget) from the parent dashboard and the kid entry page.
 * Unauthenticated by design — the kid path has no token — and returns nothing
 * a caller couldn't already learn from the family code itself.
 */
export const pull = action({
  args: { familyCode: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ synced: boolean; reason?: string; created?: number; patched?: number }> => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return { synced: false, reason: "not_configured" };

    const familyCode = args.familyCode.toUpperCase().trim();
    if (!familyCode) return { synced: false, reason: "no_family_code" };

    try {
      let bundle = await fetchBundle(familyCode, adminKey);
      if (!bundle) return { synced: false, reason: "unknown_family" };

      // Hub knows no kids yet but SafeReads does → adopt ours, then re-fetch.
      if (bundle.kids.length === 0) {
        const mine = await ctx.runQuery(internal.familySync.localKids, { familyCode });
        if (mine && mine.length > 0) {
          const res = await fetch(`${CENTRAL_URL}/family/kids/bootstrap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familyCode, app: APP, key: adminKey, kids: mine }),
          });
          if (!res.ok) return { synced: false, reason: `bootstrap_${res.status}` };
          bundle = await fetchBundle(familyCode, adminKey);
          if (!bundle) return { synced: false, reason: "unknown_family" };
        }
      }

      const result = await ctx.runMutation(internal.familySync.apply, {
        familyCode,
        version: bundleVersion(bundle),
        kids: bundle.kids.map((k) => ({
          name: k.name,
          age: k.age ?? null,
          color: k.color ?? null,
          pinHash: k.pinHash ?? null,
          paused: k.paused === true,
          requestsEnabled: k.requestsEnabled !== false,
          updatedAt: k.updatedAt ?? 0,
        })),
      });
      if (!result.applied) return { synced: true, reason: result.reason };
      return { synced: true, created: result.created, patched: result.patched };
    } catch (err) {
      console.error("[familySync.pull] hub unreachable:", err);
      return { synced: false, reason: "central_unreachable" };
    }
  },
});
