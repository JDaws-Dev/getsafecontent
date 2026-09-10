import { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";

/**
 * Marketing Central is the single source of truth for the family code (the one
 * code that gets a kid into every app). Apps must never mint their own — they
 * receive central's code via the login JWT claim + provisioning.
 * See docs/UNIFIED-IDENTITY.md.
 */

// 32-char alphabet, no ambiguous chars (0/O/1/I), matching the documented
// family-code alphabet across the suite.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// Crypto-random — NOT Math.random (the security audit flagged Math.random for
// family codes as predictable/guessable).
function generateFamilyCodeString(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

type Ctx = GenericMutationCtx<DataModel>;

async function mintUniqueCode(ctx: Ctx): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateFamilyCodeString();
    const clash = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", code))
      .first();
    if (!clash) return code;
  }
  throw new Error("Could not mint a unique family code after 12 attempts.");
}

/**
 * Guarantee the user has a family code. Idempotent: returns the existing code,
 * or mints a unique one and persists it. Called lazily at login (the chokepoint
 * where the token is minted) so a code always exists by the time any app reads
 * it from the JWT.
 */
export const ensureFamilyCode = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found.");
    if (user.familyCode) return { familyCode: user.familyCode, created: false };
    const code = await mintUniqueCode(ctx);
    await ctx.db.patch(args.userId, { familyCode: code });
    return { familyCode: code, created: true };
  },
});

/**
 * One-time / re-runnable backfill: give every account that lacks a family code
 * one. Run after deploy: npx convex run familyCode:backfillFamilyCodes --prod
 */
export const backfillFamilyCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let created = 0;
    for (const u of users) {
      if (!u.familyCode) {
        const code = await mintUniqueCode(ctx);
        await ctx.db.patch(u._id, { familyCode: code });
        created++;
      }
    }
    return { total: users.length, created };
  },
});


// ── One family code per family, everywhere ─────────────────────────────────
// Central is the only issuer. These push the hub's code onto each app's user
// row (every app exposes GET /syncFamilyCode?key&email&code) so a family can
// never end up with different codes in different apps.
const APP_SYNC_ENDPOINTS: Array<[string, string, string]> = [
  ["safetunes", "https://formal-chihuahua-623.convex.site", "ADMIN_KEY"],
  ["safetube", "https://rightful-rabbit-333.convex.site", "ADMIN_KEY"],
  ["safereads", "https://exuberant-puffin-838.convex.site", "ADMIN_KEY"],
  ["safestudy", "https://strong-scorpion-227.convex.site", "ADMIN_KEY"],
  ["safespark", "https://giddy-peacock-124.convex.site", "SAFESPARK_ADMIN_KEY"],
];

export const pushFamilyCodeToApps = internalAction({
  args: { email: v.string(), familyCode: v.string() },
  handler: async (_ctx, args) => {
    const results: Record<string, string> = {};
    for (const [app, base, keyEnv] of APP_SYNC_ENDPOINTS) {
      const key = process.env[keyEnv];
      if (!key) { results[app] = "no_key"; continue; }
      try {
        const url = new URL(`${base}/syncFamilyCode`);
        url.searchParams.set("key", key);
        url.searchParams.set("email", args.email.toLowerCase());
        url.searchParams.set("code", args.familyCode.toUpperCase());
        const res = await fetch(url.toString());
        const body = await res.text();
        results[app] = res.ok ? `ok ${body.slice(0, 80)}` : `http_${res.status} ${body.slice(0, 80)}`;
      } catch (e) {
        results[app] = `error ${String(e).slice(0, 80)}`;
      }
    }
    return results;
  },
});

/** Push every account's code to every app. Run after deploy; safe to re-run. */
export const reconcileFamilyCodes = internalAction({
  args: { onlyEmail: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Record<string, Record<string, string>>> => {
    const users = await ctx.runQuery(internal.familyCode.listUsersWithCodes, {});
    const out: Record<string, Record<string, string>> = {};
    for (const u of users) {
      if (args.onlyEmail && u.email !== args.onlyEmail.toLowerCase()) continue;
      out[u.email] = await ctx.runAction(internal.familyCode.pushFamilyCodeToApps, { email: u.email, familyCode: u.familyCode });
    }
    return out;
  },
});

export const listUsersWithCodes = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => u.email && u.familyCode).map((u) => ({ email: u.email!.toLowerCase(), familyCode: u.familyCode! }));
  },
});
