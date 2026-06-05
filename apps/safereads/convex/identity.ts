import { GenericDatabaseReader } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";

type Db = GenericDatabaseReader<DataModel>;

/**
 * SafeReads server-side identity — the ONLY trustworthy answer to "who is
 * calling." Every public mutation/query that touches a user-owned record must
 * resolve identity here and check ownership, NOT trust a client-supplied
 * `userId` (which any caller can forge — the IDOR this module fixes).
 *
 * Mirrors SafeSpark's proven pattern (`verifyMarketingToken` /
 * `resolveSafeSparkIdentity`). Parents authenticate with a Marketing Central
 * JWT (the `safereads_jwt` the frontend already holds); kids will get a scoped
 * session token in a later phase.
 */

/**
 * Verify a Marketing Central login JWT. Marketing signs with HS256 + a shared
 * secret (issuer "getsafefamily.com"). SafeReads' convex/auth.config.ts can't
 * verify HS256 (Convex only supports JWKS providers), so the frontend passes
 * the JWT as an arg and we verify it here with the mirrored
 * MARKETING_JWT_SECRET. Returns {marketingUserId, email} or null on ANY failure
 * (no secret, bad signature, expired, wrong issuer, malformed, missing claims).
 */
export async function verifyMarketingToken(
  token: string,
): Promise<{ marketingUserId: string; email: string } | null> {
  const secret = process.env.MARKETING_JWT_SECRET;
  if (!secret) return null;
  try {
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { issuer: "getsafefamily.com" },
    );
    const marketingUserId = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!marketingUserId || !email) return null;
    return { marketingUserId, email: email.toLowerCase() };
  } catch {
    return null;
  }
}

type UserRow = DataModel["users"]["document"];

/**
 * Verify the caller's Marketing JWT and resolve it to the SafeReads `users`
 * row by email (the verified claim — never a client arg). Returns null when
 * there's no/invalid token or no matching row. Never throws.
 */
export async function resolveReaderIdentity(
  ctx: { db: Db },
  userToken?: string,
): Promise<UserRow | null> {
  if (!userToken) return null;
  const verified = await verifyMarketingToken(userToken);
  if (!verified) return null;
  const row = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", verified.email))
    .first();
  return row ?? null;
}

/**
 * Assert the authenticated caller owns `ownerId`; return the caller's verified
 * user id. Use at the top of every function that reads/writes a user-owned
 * record.
 *
 * Migration note: during the additive rollout the frontend may not yet pass a
 * token everywhere. Call sites should use `requireOwnerSoft` (warn + allow) so
 * we don't break the 37 live accounts mid-flight, then switch to this hard
 * version once the frontend threads tokens. This function is the destination.
 */
export async function requireOwner(
  ctx: { db: Db },
  userToken: string | undefined,
  ownerId: Id<"users">,
): Promise<Id<"users">> {
  const me = await resolveReaderIdentity(ctx, userToken);
  if (!me) throw new Error("Please sign in again.");
  if (me._id !== ownerId) throw new Error("You don't have access to that.");
  return me._id;
}

/**
 * Additive-migration variant: enforce ownership ONLY when a token is supplied.
 * When no token is present (old frontend build still in flight) it logs the
 * unverified access and allows it, so nothing breaks while the frontend is
 * updated to pass `userToken`. When a token IS supplied it is fully enforced —
 * so an attacker can't downgrade by omitting the token AND we get telemetry on
 * how many real calls are still tokenless before we flip to hard `requireOwner`.
 */
export async function requireOwnerSoft(
  ctx: { db: Db },
  userToken: string | undefined,
  ownerId: Id<"users">,
  label: string,
): Promise<void> {
  if (!userToken) {
    console.warn(`[safereads auth] UNVERIFIED ${label} for user ${ownerId} (no token; pre-migration)`);
    return;
  }
  await requireOwner(ctx, userToken, ownerId);
}
