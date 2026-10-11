/**
 * Kid session token — short-lived proof that THIS device signed in as a given
 * kid profile (by entering that kid's PIN, or by redeeming a kid pass).
 *
 * Why: kidPass.mintKidPass used to sign a cross-app pass for any family code +
 * kid name, so a sibling who knew the family code could mint a pass for their
 * brother's PIN-protected profile and walk straight in via /play?kt=. Now a
 * PIN-protected kid only gets a pass by presenting the session token issued
 * when they entered their own PIN.
 *
 * HS256 over the shared MARKETING_JWT_SECRET (already on every app), with its
 * own issuer so it can never be confused with a parent Marketing JWT or a
 * cross-app kid pass. Plain helpers — no Convex functions in this module.
 */

declare const process: { env: Record<string, string | undefined> };

const KID_SESSION_ISS = "safetube-kidsession";
/** A kid session lasts a day; the switcher simply stops offering one-tap after. */
export const KID_SESSION_TTL_SEC = 24 * 60 * 60;

export interface KidSessionClaims {
  fc: string; // family code the kid signed in under
  pid: string; // SafeTube kidProfiles id
}

function secret(): string | undefined {
  return process.env.MARKETING_JWT_SECRET;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(key: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

/** Sign a kid session. Returns null (not a throw) when the secret is missing. */
export async function signKidSession(
  claims: KidSessionClaims,
  nowMs: number = Date.now(),
): Promise<string | null> {
  const key = secret();
  if (!key || !claims.fc || !claims.pid) return null;
  const iat = Math.floor(nowMs / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ iss: KID_SESSION_ISS, fc: claims.fc, pid: claims.pid, iat, exp: iat + KID_SESSION_TTL_SEC }),
    ),
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(key, "sign"),
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

/** Verify a kid session. Returns claims or null on any failure. Never throws. */
export async function verifyKidSession(
  token: string | undefined,
  nowMs: number = Date.now(),
): Promise<KidSessionClaims | null> {
  const key = secret();
  if (!token || !key) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  try {
    const h = JSON.parse(new TextDecoder().decode(fromB64url(header))) as { alg?: string };
    if (h.alg !== "HS256") return null;
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(key, "verify"),
      fromB64url(sig) as BufferSource,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      iss?: string;
      fc?: string;
      pid?: string;
      exp?: number;
    };
    if (p.iss !== KID_SESSION_ISS) return null;
    if (typeof p.exp !== "number" || nowMs / 1000 > p.exp) return null;
    if (typeof p.fc !== "string" || typeof p.pid !== "string") return null;
    return { fc: p.fc, pid: p.pid };
  } catch {
    return null;
  }
}
