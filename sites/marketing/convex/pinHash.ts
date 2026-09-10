/**
 * Kid PIN hashing — byte-for-byte the same format as every app's vendored
 * safeAuth.ts (`pbkdf2$<iters>$<saltB64url>$<hashB64url>`), so a hash minted
 * here verifies inside SafeTunes, SafeTube, SafeReads, SafeStudy and SafeSpark.
 */
const PIN_ITERATIONS = 100_000;

export async function hashPin(pin: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(pin, salt, PIN_ITERATIONS);
  return `pbkdf2$${PIN_ITERATIONS}$${toBase64url(salt)}$${toBase64url(hash)}`;
}

async function pbkdf2(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

function toBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
