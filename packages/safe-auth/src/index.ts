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
): Promise<{ marketingUserId: string; email: string } | null> {
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
      fromBase64url(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(textDecode(fromBase64url(payloadB64))) as {
      sub?: string;
      email?: string;
      iss?: string;
      exp?: number;
    };
    if (payload.iss !== "getsafefamily.com") return null;
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
    const marketingUserId = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!marketingUserId || !email) return null;
    return { marketingUserId, email: email.toLowerCase() };
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
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
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
