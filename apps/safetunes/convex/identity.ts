import { GenericDatabaseReader } from "convex/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { DataModel, Id } from "./_generated/dataModel";
import { verifyMarketingToken } from "./safeAuth";

type Db = GenericDatabaseReader<DataModel>;

/**
 * SafeTunes server-side identity — the ONLY trustworthy answer to "who is
 * calling." Every parent-facing mutation/query that touches a user-owned record
 * must resolve identity here and check ownership, NOT trust a client-supplied
 * `userId`/`profileId` (which any caller can forge — the IDOR this fixes).
 *
 * Mirrors SafeReads / SafeStudy (see apps/safereads/convex/identity.ts).
 * Parents authenticate with a Marketing Central JWT (the `safetunes_jwt` the
 * frontend already holds). The KID path (ChildDashboard) authenticates by family
 * code with no parent token — those calls intentionally stay on
 * `requireOwnerSoft` (warn + allow) until kids get their own scoped session
 * token in a later phase.
 */

// Thin wrapper that supplies SafeTunes' mirrored secret.
function verifyToken(token: string | undefined) {
  return verifyMarketingToken(token, process.env.MARKETING_JWT_SECRET);
}

type UserRow = DataModel["users"]["document"];

/**
 * Verify the caller's Marketing JWT and resolve it to the SafeTunes `users` row
 * by email (the verified claim — never a client arg). Returns null when there's
 * no/invalid token or no matching row. Never throws.
 */
export async function resolveTunesIdentity(
  ctx: { db: Db },
  userToken?: string,
): Promise<UserRow | null> {
  if (!userToken) return null;
  const verified = await verifyToken(userToken);
  if (!verified) return null;
  const row = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", verified.email))
    .first();
  return row ?? null;
}

/**
 * Assert the authenticated caller owns `ownerId`; return the caller's verified
 * user id. Hard version — use once the frontend threads tokens everywhere.
 */
export async function requireOwner(
  ctx: { db: Db },
  userToken: string | undefined,
  ownerId: Id<"users">,
  _label?: string, // accepted for call-site parity with requireOwnerSoft
): Promise<Id<"users">> {
  const me = await resolveTunesIdentity(ctx, userToken);
  if (!me) throw new Error("Please sign in again.");
  if (me._id !== ownerId) throw new Error("You don't have access to that.");
  return me._id;
}

/**
 * Additive-migration variant: enforce ownership ONLY when a token is supplied.
 * No token (old frontend build, or the kid-side family-code path) → log + allow,
 * so nothing breaks while the frontend is updated to pass `userToken`. With a
 * token it is fully enforced (an attacker can't downgrade by omitting it), and
 * we get telemetry on remaining tokenless calls before flipping to hard
 * `requireOwner`.
 */
export async function requireOwnerSoft(
  ctx: { db: Db },
  userToken: string | undefined,
  ownerId: Id<"users">,
  label: string,
): Promise<void> {
  if (!userToken) {
    console.warn(`[safetunes auth] UNVERIFIED ${label} for user ${ownerId} (no token; pre-migration)`);
    return;
  }
  await requireOwner(ctx, userToken, ownerId);
}

/**
 * Ownership check keyed by a kid profile: resolves the profile's owning userId
 * then soft-enforces. Returns the profile (or null if it doesn't exist) so the
 * caller can avoid a second db.get. Safe for kid-path callers (no token = allow).
 */
export async function requireProfileOwnerSoft(
  ctx: { db: Db },
  userToken: string | undefined,
  profileId: Id<"kidProfiles">,
  label: string,
): Promise<DataModel["kidProfiles"]["document"] | null> {
  const profile = await ctx.db.get(profileId);
  if (!profile) return null;
  await requireOwnerSoft(ctx, userToken, profile.userId, label);
  return profile;
}

/**
 * Hard variant of requireProfileOwnerSoft — REQUIRES a valid parent token that
 * owns the profile. Use on parent-only endpoints; NOT on kid-path endpoints.
 */
export async function requireProfileOwner(
  ctx: { db: Db },
  userToken: string | undefined,
  profileId: Id<"kidProfiles">,
  label: string,
): Promise<DataModel["kidProfiles"]["document"]> {
  const profile = await ctx.db.get(profileId);
  if (!profile) throw new Error(`That profile doesn't exist (${label}).`);
  await requireOwner(ctx, userToken, profile.userId, label);
  return profile;
}

/**
 * Pull the authoritative family code from the verified login token onto the
 * local `users` row. The frontend calls this on login so SafeTunes always tracks
 * Central's one canonical code (docs/UNIFIED-IDENTITY.md) — replacing the local
 * generators that caused drift. Idempotent; no-op when unchanged. Requires
 * MARKETING_JWT_SECRET to be set, else verification fails closed and this throws
 * (frontend treats as "log in again").
 */
export const syncIdentityFromToken = mutation({
  args: { userToken: v.string() },
  handler: async (ctx, args) => {
    const verified = await verifyToken(args.userToken);
    if (!verified) throw new Error("Please sign in again.");
    const row = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", verified.email))
      .first();
    if (!row) return { synced: false as const };
    if (verified.familyCode && verified.familyCode !== row.familyCode) {
      await ctx.db.patch(row._id, { familyCode: verified.familyCode });
      return { synced: true as const, familyCode: verified.familyCode, changed: true };
    }
    return { synced: true as const, familyCode: row.familyCode ?? null, changed: false };
  },
});
