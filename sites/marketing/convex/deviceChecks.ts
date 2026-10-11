import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";
import type { Doc } from "./_generated/dataModel";

/**
 * "Check a kid's device".
 *
 * The parent mints a one-time link on the dashboard and opens it on the kid's
 * device. That page (src/app/check/[token]) tests three things and reports
 * each one here:
 *   1. safeEmbed   — does SafeTube's player (youtube-nocookie.com) work?
 *   2. directEmbed — does a regular www.youtube.com player talk back? It
 *                    shouldn't on a properly locked-down device.
 *   3. manualOpen  — the parent tries to open youtube.com and says what happened.
 * The parent's dashboard watches the result live.
 *
 * Security shape:
 *   - Minting and reading results for the parent are owner-verified from the
 *     signed-in hub session; no family code or user id is taken from the client.
 *   - On the kid side the token is the only credential. It must be opened
 *     within 30 minutes, is claimed by the first browser that starts the check
 *     (a random per-browser nonce), and every token call returns only that one
 *     check's own step results — never names, emails, family codes or ids.
 */

const TOKEN_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 12;
const OPEN_WINDOW_MS = 30 * 60 * 1000;   // must be started within 30 minutes
const RUN_WINDOW_MS = 30 * 60 * 1000;    // and finished within 30 minutes of starting
const MAX_PER_HOUR = 10;
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

const DEVICE_KINDS = ["chromebook", "android", "ios", "windows", "mac", "other"];
const STEP_VALUES: Record<string, string[]> = {
  safeEmbed: ["ok", "failed"],
  directEmbed: ["silent", "talked"],
  manualOpen: ["blocked", "opened"],
};

function newToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return out;
}

function cleanToken(token: string): string {
  return (token || "").trim().toLowerCase().slice(0, 64);
}

function stepResults(c: Doc<"deviceChecks">) {
  return {
    safeEmbed: (c.safeEmbed ?? null) as "ok" | "failed" | null,
    directEmbed: (c.directEmbed ?? null) as "silent" | "talked" | null,
    manualOpen: (c.manualOpen ?? null) as "blocked" | "opened" | null,
    completed: !!c.completedAt,
  };
}

// ── Parent side (owner-verified) ────────────────────────────────────────────

/** Mint a one-time check link for the signed-in parent's family. */
export const start = mutation({
  args: { userAgent: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in again.");
    const user = await ctx.db.get(userId);
    if (!user?.familyCode) throw new Error("Your account has no family code yet.");

    const now = Date.now();
    const recent = await ctx.db
      .query("deviceChecks")
      .withIndex("by_parent", (q) => q.eq("parentUserId", userId).gte("createdAt", now - 60 * 60 * 1000))
      .collect();
    if (recent.length >= MAX_PER_HOUR) throw new Error("That's a lot of checks in one hour. Try again a little later.");

    const token = newToken();
    await ctx.db.insert("deviceChecks", {
      familyCode: user.familyCode,
      parentUserId: userId,
      token,
      createdAt: now,
      expiresAt: now + OPEN_WINDOW_MS,
      parentUserAgent: args.userAgent?.slice(0, 400),
    });
    return { token, expiresAt: now + OPEN_WINDOW_MS };
  },
});

/** The signed-in parent's most recent check, live. */
export const latestMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const c = await ctx.db
      .query("deviceChecks")
      .withIndex("by_parent", (q) => q.eq("parentUserId", userId))
      .order("desc")
      .first();
    if (!c) return null;
    const now = Date.now();
    return {
      token: c.token,
      createdAt: c.createdAt,
      expiresAt: c.expiresAt,
      // Unopened and past its window: the link is dead.
      expired: !c.claimedAt && c.expiresAt < now,
      claimedAt: c.claimedAt ?? null,
      deviceKind: c.deviceKind ?? null,
      looksLikeParentDevice: !!c.looksLikeParentDevice,
      ...stepResults(c),
    };
  },
});

// ── Kid-device side (token-gated, returns only this check's own state) ─────

/**
 * State of one check, for the page on the kid's device. `deviceNonce` is the
 * random id this browser generated; it tells "you already started this" apart
 * from "someone else did".
 */
export const byToken = query({
  args: { token: v.string(), deviceNonce: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const c = await ctx.db
      .query("deviceChecks")
      .withIndex("by_token", (q) => q.eq("token", cleanToken(args.token)))
      .first();
    if (!c) return { status: "missing" as const };
    const now = Date.now();

    if (c.claimedAt) {
      if (!args.deviceNonce || c.deviceNonce !== args.deviceNonce) return { status: "taken" as const };
      if (c.completedAt) return { status: "done" as const, ...stepResults(c) };
      if (c.claimedAt + RUN_WINDOW_MS < now) return { status: "expired" as const };
      return { status: "running" as const, ...stepResults(c) };
    }
    if (c.expiresAt < now) return { status: "expired" as const };

    // Best effort "this is the parent's own device": the parent account that
    // made the link is signed in to the hub in this browser.
    const viewer = await getAuthUserId(ctx);
    return { status: "ready" as const, parentSignedInHere: !!viewer && viewer === c.parentUserId };
  },
});

/** Start the check on this device. The first browser to call this owns the token. */
export const claim = mutation({
  args: {
    token: v.string(),
    deviceNonce: v.string(),
    deviceKind: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const c = await ctx.db
      .query("deviceChecks")
      .withIndex("by_token", (q) => q.eq("token", cleanToken(args.token)))
      .first();
    if (!c) throw new Error("This check link isn't valid. Ask for a new one from the dashboard.");
    const nonce = args.deviceNonce.slice(0, 64);
    if (nonce.length < 16) throw new Error("Something went wrong. Reload the page and try again.");
    if (c.claimedAt) {
      if (c.deviceNonce === nonce) return { ok: true };
      throw new Error("This link was already used on another device. Make a new one from the dashboard.");
    }
    const now = Date.now();
    if (c.expiresAt < now) throw new Error("This link has expired. Make a new one from the dashboard.");

    const viewer = await getAuthUserId(ctx);
    const ua = args.userAgent?.slice(0, 400);
    const looksLikeParentDevice =
      (!!viewer && viewer === c.parentUserId) || (!!ua && !!c.parentUserAgent && ua === c.parentUserAgent);

    await ctx.db.patch(c._id, {
      claimedAt: now,
      deviceNonce: nonce,
      deviceKind: DEVICE_KINDS.includes(args.deviceKind) ? args.deviceKind : "other",
      userAgent: ua,
      looksLikeParentDevice,
    });
    return { ok: true };
  },
});

/** Report one step's result from the device that claimed the check. */
export const record = mutation({
  args: {
    token: v.string(),
    deviceNonce: v.string(),
    step: v.union(v.literal("safeEmbed"), v.literal("directEmbed"), v.literal("manualOpen")),
    result: v.string(),
  },
  handler: async (ctx, args) => {
    if (!STEP_VALUES[args.step].includes(args.result)) throw new Error("Unknown result.");
    const c = await ctx.db
      .query("deviceChecks")
      .withIndex("by_token", (q) => q.eq("token", cleanToken(args.token)))
      .first();
    if (!c || !c.claimedAt || c.deviceNonce !== args.deviceNonce) {
      throw new Error("This check isn't running on this device.");
    }
    const now = Date.now();
    if (c.completedAt || c.claimedAt + RUN_WINDOW_MS < now) throw new Error("This check has finished. Make a new one from the dashboard.");

    const next = { ...stepResults(c), [args.step]: args.result };
    const done = !!(next.safeEmbed && next.directEmbed && next.manualOpen);
    const patch: Partial<Doc<"deviceChecks">> = {};
    patch[args.step] = args.result;
    if (done) patch.completedAt = now;
    await ctx.db.patch(c._id, patch);
    return { ok: true, completed: done };
  },
});

// ── Housekeeping (internal) ─────────────────────────────────────────────────

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - KEEP_MS;
    const oldest = await ctx.db.query("deviceChecks").order("asc").take(500);
    let deleted = 0;
    for (const c of oldest) {
      if (c.createdAt >= cutoff) break;
      await ctx.db.delete(c._id);
      deleted++;
    }
    return { deleted };
  },
});
