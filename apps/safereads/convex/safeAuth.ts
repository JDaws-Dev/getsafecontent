// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth: packages/safe-auth/src/index.ts
// Regenerate: node scripts/sync-safe-auth.mjs
// Vendored per-app (repo is not an npm workspace) so the security-critical
// auth logic stays byte-identical across all Safe Family apps.

/**
 * @safefamily/safe-auth — canonical shared auth primitives for every Safe
 * Family app (parent + kid). PURE: no DB, no Convex imports, Web-Crypto only,
 * ZERO external deps — so the exact same security-critical logic runs
 * byte-identically in all five Convex backends regardless of their Convex
 * version.
 *
 * SOURCE OF TRUTH: packages/safe-auth/src/index.ts
 * Vendored into each app at apps/<app>/convex/safeAuth.ts via
 *   node scripts/sync-safe-auth.mjs
 * DO NOT edit the vendored copies by hand — edit THIS file and re-run sync.
 *
 * Per-app glue (resolveIdentity / requireOwner, which touch each app's own
 * `users` + `kids`/`kidProfiles` + `kidSessions` tables) lives in each app's
 * convex/identity.ts and calls into these primitives.
 */

// ───────────────────────── Parent: Marketing Central JWT ─────────────────────
// Marketing signs login JWTs with HS256 + a shared secret (issuer
// "getsafefamily.com"). Convex's auth.config.ts only supports JWKS providers,
// so the frontend passes the JWT as an arg and we verify it here. Implemented
// directly on Web Crypto (HMAC-SHA256) — no `jose` dependency, so the vendored
// copy drops into any app with nothing to install.
export async function verifyMarketingToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<{
  marketingUserId: string;
  email: string;
  familyCode?: string;
  entitledApps?: string[];
} | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  try {
    const header = JSON.parse(textDecode(fromBase64url(headerB64))) as { alg?: string };
    if (header.alg !== "HS256") return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64url(sigB64) as BufferSource,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(textDecode(fromBase64url(payloadB64))) as {
      sub?: string;
      email?: string;
      iss?: string;
      exp?: number;
      familyCode?: string;
      entitledApps?: string[];
    };
    if (payload.iss !== "getsafefamily.com") return null;
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
    const marketingUserId = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!marketingUserId || !email) return null;
    // familyCode + entitledApps ride the token (see docs/UNIFIED-IDENTITY.md) so
    // apps read the authoritative values straight from the verified login.
    return {
      marketingUserId,
      email: email.toLowerCase(),
      familyCode: typeof payload.familyCode === "string" ? payload.familyCode : undefined,
      entitledApps: Array.isArray(payload.entitledApps) ? payload.entitledApps : undefined,
    };
  } catch {
    return null;
  }
}

// ───────────────────────── Kid: crypto-random session token ──────────────────
export function newSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64url(bytes);
}

/** Default kid-session lifetime: 30 days (refresh on use at the call site). */
export const KID_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ───────────────────────── Kid: cross-app "kid pass" (one-tap switching) ──────
// A short-lived HS256 token minted by the app the kid is ALREADY signed into and
// carried via ?kt= to a sibling app, which verifies it and drops the kid straight
// onto their dashboard — no re-typing the family code, no re-entering the PIN.
//
// Why name-matched, not id-matched: every app has its OWN kidProfiles table in
// its OWN Convex deployment, so profile IDs are not portable. The only keys that
// are stable across all five apps are the Central-synced familyCode and the kid's
// display name — so the pass carries those, and the destination resolves its own
// local profile row (familyCode → user → kid by name).
//
// Threat model = the household. The pass lets a kid already authenticated as
// Bella in one app continue as Bella in a sibling app without re-entering Bella's
// PIN. It does NOT replace the PIN as the cold-start gate: a kid opening a sibling
// app directly still picks a profile and enters the PIN. TTL is deliberately short
// (5 min) so a copied link is not a durable bypass, and the token is signed with
// the shared MARKETING_JWT_SECRET (same secret already on every app), namespaced
// by a distinct issuer so it can never be confused with a parent Marketing JWT.
export interface KidPassClaims {
  fc: string; // family code (6 chars)
  kid: string; // kid display name — the cross-app match key
  av?: string; // avatar hint (optional; lets the destination render the tile)
  col?: string; // color hint (optional)
}

/** Kid-pass lifetime: short on purpose — it only has to survive one hop. */
export const KID_PASS_TTL_SEC = 5 * 60;
const KID_PASS_ISS = "safefamily-kidpass";

/** Mint a signed kid pass. Server-only (needs the shared secret). Throws if no secret. */
export async function signKidPass(
  claims: KidPassClaims,
  secret: string | undefined,
  nowMs: number = Date.now(),
): Promise<string> {
  if (!secret) throw new Error("kid pass signing requires MARKETING_JWT_SECRET");
  if (!claims.fc || !claims.kid) throw new Error("kid pass requires fc + kid");
  const iat = Math.floor(nowMs / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    iss: KID_PASS_ISS,
    fc: claims.fc,
    kid: claims.kid,
    iat,
    exp: iat + KID_PASS_TTL_SEC,
  };
  if (claims.av) payload.av = claims.av;
  if (claims.col) payload.col = claims.col;
  const headerB64 = toBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = toBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  );
  return `${headerB64}.${payloadB64}.${toBase64url(new Uint8Array(sig))}`;
}

/** Verify a kid pass. Returns the claims, or null on any failure (bad sig, wrong issuer, expired). Never throws. */
export async function verifyKidPass(
  token: string | undefined,
  secret: string | undefined,
  nowMs: number = Date.now(),
): Promise<KidPassClaims | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  try {
    const header = JSON.parse(textDecode(fromBase64url(headerB64))) as { alg?: string };
    if (header.alg !== "HS256") return null;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64url(sigB64) as BufferSource,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;
    const p = JSON.parse(textDecode(fromBase64url(payloadB64))) as {
      iss?: string;
      fc?: string;
      kid?: string;
      av?: string;
      col?: string;
      exp?: number;
    };
    if (p.iss !== KID_PASS_ISS) return null;
    if (typeof p.exp === "number" && nowMs / 1000 > p.exp) return null;
    if (typeof p.fc !== "string" || typeof p.kid !== "string") return null;
    return {
      fc: p.fc,
      kid: p.kid,
      av: typeof p.av === "string" ? p.av : undefined,
      col: typeof p.col === "string" ? p.col : undefined,
    };
  } catch {
    return null;
  }
}

// ───────────────────────── PIN hashing (PBKDF2-SHA256) ───────────────────────
// 4-digit PINs are low-entropy, so the per-kid lockout (pinFailedAttempts /
// pinLockedUntil) is the real defense; hashing removes the at-rest plaintext
// and the cross-tenant read risk. Format: pbkdf2$<iters>$<saltB64url>$<hashB64url>
const PIN_ITERATIONS = 100_000;

export async function hashPin(pin: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(pin, salt, PIN_ITERATIONS);
  return `pbkdf2$${PIN_ITERATIONS}$${toBase64url(salt)}$${toBase64url(hash)}`;
}

/** Constant-time verify. Accepts legacy plaintext PINs (no prefix) for lazy migration. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!isHashedPin(stored)) return constTimeEqualStr(pin, stored);
  const [, itersStr, saltB64, hashB64] = stored.split("$");
  const iterations = Number(itersStr) || PIN_ITERATIONS;
  const actual = await pbkdf2(pin, fromBase64url(saltB64), iterations);
  return constTimeEqualBytes(actual, fromBase64url(hashB64));
}

export function isHashedPin(stored: string): boolean {
  return typeof stored === "string" && stored.startsWith("pbkdf2$");
}

// ───────────────────────── internals ─────────────────────────────────────────
async function pbkdf2(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function constTimeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

function constTimeEqualStr(a: string, b: string): boolean {
  return constTimeEqualBytes(new TextEncoder().encode(a), new TextEncoder().encode(b));
}

function textDecode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function toBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = atob(b);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
