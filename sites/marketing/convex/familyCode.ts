import { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
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
