import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { isHashedPin } from "./safeAuth";

/**
 * Mirror the hub's UNIVERSAL FAMILY SETTINGS into SafeStudy.
 *
 * The hub (Marketing Central, getsafefamily.com) is the source of truth for
 * the things a parent sets once for the whole family: each kid's PIN, age,
 * color, whether they're paused, whether they may send requests, plus the
 * family timezone and concern-alert recipients. Every Safe Family app pulls
 * the same bundle and applies it to its own local tables, so a parent changes
 * a PIN in one place and it works everywhere.
 *
 *   GET  /family/sync?familyCode=&key=      → the bundle (404 = unknown family)
 *   POST /family/kids/bootstrap             → hub adopts kids it doesn't know
 *
 * `pull` is fired (fire-and-forget) from the parent dashboard and from the kid
 * entry screen. It FAILS OPEN: if the hub is down or ADMIN_KEY is missing we
 * leave local data alone — the app keeps working on whatever it last had.
 *
 * Kids are matched across apps by NAME (trimmed, case-insensitive), the same
 * key sharedScreenTime and the kid pass use, because every app has its own
 * kidProfiles table with its own ids. Local profiles are never deleted here.
 */

const CENTRAL_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";
const APP = "safestudy";

// ─── Bundle shape (what the hub sends, trimmed to the fields we use) ─────────
const kidValidator = v.object({
  name: v.string(),
  age: v.union(v.number(), v.null()),
  color: v.union(v.string(), v.null()),
  pinHash: v.union(v.string(), v.null()),
  paused: v.boolean(),
  requestsEnabled: v.boolean(),
  updatedAt: v.number(),
  // Other lowercased names the hub knows this same child by ("isabella" for
  // "Bella"). Used only for matching — the local profile keeps its own name.
  aliases: v.optional(v.array(v.string())),
});

const bundleValidator = v.object({
  familyCode: v.string(),
  timezone: v.union(v.string(), v.null()),
  alertEmails: v.array(v.string()),
  updatedAt: v.number(),
  kids: v.array(kidValidator),
});

type HubKid = {
  name: string;
  age: number | null;
  color: string | null;
  pinHash: string | null;
  paused: boolean;
  requestsEnabled: boolean;
  updatedAt: number;
  aliases: string[];
};
type HubBundle = {
  familyCode: string;
  timezone: string | null;
  alertEmails: string[];
  updatedAt: number;
  kids: HubKid[];
};

/**
 * Convex validators are strict — an unexpected field from the hub would make
 * the whole apply throw. Shape the raw JSON into exactly what `apply` accepts.
 */
function shapeBundle(raw: any): HubBundle | null {
  if (!raw || typeof raw !== "object" || typeof raw.familyCode !== "string") return null;
  const kids: HubKid[] = [];
  for (const k of Array.isArray(raw.kids) ? raw.kids : []) {
    if (!k || typeof k.name !== "string" || !k.name.trim()) continue;
    kids.push({
      name: k.name,
      age: typeof k.age === "number" && Number.isFinite(k.age) ? k.age : null,
      color: typeof k.color === "string" && k.color ? k.color : null,
      pinHash: typeof k.pinHash === "string" && k.pinHash ? k.pinHash : null,
      paused: k.paused === true,
      requestsEnabled: k.requestsEnabled !== false,
      updatedAt: typeof k.updatedAt === "number" ? k.updatedAt : 0,
      aliases: Array.isArray(k.aliases)
        ? k.aliases.filter((a: unknown) => typeof a === "string" && a.trim()).map(nameKey)
        : [],
    });
  }
  return {
    familyCode: raw.familyCode,
    timezone: typeof raw.timezone === "string" && raw.timezone ? raw.timezone : null,
    alertEmails: Array.isArray(raw.alertEmails)
      ? raw.alertEmails.filter((e: unknown) => typeof e === "string")
      : [],
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    kids,
  };
}

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

// ─── SafeStudy's own profile defaults (mirror the parent UI) ─────────────────
// Same age → strictness rule as OnboardingWizard / KidProfileEditor.
function strictnessFromAge(age: number): string {
  if (age <= 7) return "strict";
  if (age <= 12) return "moderate";
  return "light";
}
// KidProfileEditor's DEFAULT_BLOCKED list.
const DEFAULT_BLOCKED_TOPICS = [
  "violence", "drugs", "sexual", "profanity", "self-harm", "weapons",
  "aesthetic-browsing", "self-image",
];
const DEFAULT_AGE = 8;
const DEFAULT_COLOR = "blue";

type BootstrapKid = {
  name: string;
  age: number | null;
  color: string | null;
  pin: string | null;
  paused: boolean;
  requestsEnabled: boolean;
};

type ApplyResult =
  | { applied: false; reason: "no_user" | "unchanged" }
  | { applied: true; created: number; patched: number; appliedAt: number };

/** Local kids in the shape the hub's bootstrap endpoint wants. */
export const localKidsForBootstrap = internalQuery({
  args: { familyCode: v.string() },
  // Explicit return types on both internal functions: `pull` below references
  // them through `internal.familySync`, and without annotations that cycle
  // (this file → _generated/api → this file) makes TS give up on `internal`
  // for every file checked afterwards.
  handler: async (ctx, args): Promise<{ kids: BootstrapKid[] } | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", args.familyCode))
      .first();
    if (!user) return null;
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return {
      kids: profiles.map((p) => ({
        name: p.name,
        age: p.ageRange?.min ?? null,
        color: p.color ?? null,
        // The hub hashes whatever we send. A PIN this app has ALREADY hashed
        // (see kidProfiles.updateProfile) must not be hashed twice — the hub
        // simply won't learn it, and the parent re-sets it there.
        pin: p.pin && !isHashedPin(p.pin) ? p.pin : null,
        paused: p.accessPaused === true,
        requestsEnabled: p.allowTopicRequests !== false,
      })),
    };
  },
});

/** Write the hub bundle onto this app's users + kidProfiles rows. */
export const apply = internalMutation({
  args: { bundle: bundleValidator },
  handler: async (ctx, { bundle }): Promise<ApplyResult> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", bundle.familyCode))
      .first();
    if (!user) return { applied: false, reason: "no_user" };

    // Newest timestamp anywhere in the bundle — the hub's top-level updatedAt
    // may or may not move when a single kid changes, so take the max.
    const latest = Math.max(bundle.updatedAt, ...bundle.kids.map((k) => k.updatedAt));
    if (user.familySyncAppliedAt !== undefined && latest <= user.familySyncAppliedAt) {
      return { applied: false, reason: "unchanged" };
    }

    // ── Parent-level fields ──
    const userUpdates: Record<string, any> = { familySyncAppliedAt: latest };
    if (bundle.timezone && bundle.timezone !== user.timezone) {
      userUpdates.timezone = bundle.timezone;
    }
    // Same cleanup as adminAlertEmails.setAlertEmails: lowercase, dedupe, and
    // never list the account's own address (it always gets the alert anyway).
    const ownEmail = (user.email ?? "").toLowerCase();
    const alertEmails = Array.from(
      new Set(
        bundle.alertEmails
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes("@") && e !== ownEmail)
      )
    );
    const currentAlerts = user.alertEmails ?? [];
    if (
      alertEmails.length !== currentAlerts.length ||
      alertEmails.some((e, i) => e !== currentAlerts[i])
    ) {
      userUpdates.alertEmails = alertEmails;
    }
    await ctx.db.patch(user._id, userUpdates);

    // ── Kids ──
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const byName = new Map(profiles.map((p) => [nameKey(p.name), p]));

    let created = 0;
    let patched = 0;
    for (const kid of bundle.kids) {
      // Match on the hub's name OR any alias — "Bella" here and "Isabella" in
      // another app are one child, and an alias hit must never spawn a second
      // profile for her.
      let local = byName.get(nameKey(kid.name));
      if (!local) {
        for (const alias of kid.aliases ?? []) {
          local = byName.get(alias);
          if (local) break;
        }
      }

      if (!local) {
        const age = kid.age ?? DEFAULT_AGE;
        const data: Record<string, any> = {
          userId: user._id,
          name: kid.name.trim(),
          color: kid.color ?? DEFAULT_COLOR,
          ageRange: { min: age, max: age },
          contentStrictness: strictnessFromAge(age),
          blockedTopics: DEFAULT_BLOCKED_TOPICS,
          allowImageSearch: false, // default OFF, same as onboarding
          allowFollowUp: true,
          allowTopicRequests: kid.requestsEnabled,
          accessPaused: kid.paused,
          createdAt: Date.now(),
        };
        if (kid.pinHash) data.pin = kid.pinHash;
        await ctx.db.insert("kidProfiles", data as any);
        created++;
        continue;
      }

      const updates: Record<string, any> = {};
      // PIN: the hub's hash replaces whatever we had (plaintext or hash); a
      // null hash means the parent removed the PIN there, so clear it here.
      const nextPin = kid.pinHash ?? undefined;
      if ((local.pin ?? undefined) !== nextPin) {
        updates.pin = nextPin;
        updates.pinFailedAttempts = 0;
        updates.pinLockedUntil = undefined;
      }
      if ((local.allowTopicRequests ?? true) !== kid.requestsEnabled) {
        updates.allowTopicRequests = kid.requestsEnabled;
      }
      if (kid.color && kid.color !== local.color) {
        updates.color = kid.color;
      }
      if (
        kid.age !== null &&
        (local.ageRange?.min !== kid.age || local.ageRange?.max !== kid.age)
      ) {
        updates.ageRange = { min: kid.age, max: kid.age };
      }
      if ((local.accessPaused === true) !== kid.paused) {
        updates.accessPaused = kid.paused;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(local._id, updates);
        patched++;
      }
    }

    return { applied: true, created, patched, appliedAt: latest };
  },
});

/**
 * Fetch the family's bundle from the hub and apply it. Safe to call often:
 * an unchanged bundle is a no-op, and any failure leaves local data untouched.
 */
export const pull = action({
  args: { familyCode: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ synced: boolean; reason?: string; created?: number; patched?: number }> => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return { synced: false, reason: "not_configured" };

    const familyCode = normalizeCode(args.familyCode);
    if (familyCode.length !== 6) return { synced: false, reason: "bad_code" };

    const fetchBundle = async (): Promise<
      { ok: true; bundle: HubBundle } | { ok: false; reason: string }
    > => {
      const url = new URL(`${CENTRAL_URL}/family/sync`);
      url.searchParams.set("familyCode", familyCode);
      url.searchParams.set("key", adminKey);
      const res = await fetch(url.toString());
      if (res.status === 404) return { ok: false, reason: "unknown_family" };
      if (!res.ok) return { ok: false, reason: `sync_${res.status}` };
      const bundle = shapeBundle(await res.json());
      if (!bundle) return { ok: false, reason: "bad_bundle" };
      return { ok: true, bundle };
    };

    try {
      let got = await fetchBundle();
      if (!got.ok) return { synced: false, reason: got.reason };

      // Hub knows the family but none of its kids yet: hand ours over so it
      // becomes the source of truth, then read back what it now holds.
      if (got.bundle.kids.length === 0) {
        const local = await ctx.runQuery(internal.familySync.localKidsForBootstrap, {
          familyCode,
        });
        if (local && local.kids.length > 0) {
          const res = await fetch(`${CENTRAL_URL}/family/kids/bootstrap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familyCode, app: APP, key: adminKey, kids: local.kids }),
          });
          if (!res.ok) return { synced: false, reason: `bootstrap_${res.status}` };
          got = await fetchBundle();
          if (!got.ok) return { synced: false, reason: got.reason };
        }
      }

      const result = await ctx.runMutation(internal.familySync.apply, { bundle: got.bundle });
      if (!result.applied) return { synced: true, reason: result.reason };
      return { synced: true, created: result.created, patched: result.patched };
    } catch (err) {
      console.error("[familySync.pull] hub unreachable:", err);
      return { synced: false, reason: "central_unreachable" };
    }
  },
});
