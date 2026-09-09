/**
 * One-site app session.
 *
 * The hub signs parents in with Convex Auth (cookie). The five apps trust a
 * signed Marketing JWT kept in localStorage under ONE key, `safefamily_jwt`.
 * Now that every app is served from getsafefamily.com, that storage is shared,
 * so the hub can hand the token straight to the apps after sign-in: one login,
 * everything open. (Before one-site the token had to ride a ?token= redirect
 * to each product domain — see /oauth.)
 */
export const APP_JWT_KEY = "safefamily_jwt";
export const APP_USER_KEY = "safefamily_user";
export const APP_JWT_EXPIRES_KEY = "safefamily_jwt_expires_at";

export function readAppSession(): { token: string; expiresAt: number | null } | null {
  try {
    const token = localStorage.getItem(APP_JWT_KEY);
    if (!token) return null;
    const raw = localStorage.getItem(APP_JWT_EXPIRES_KEY);
    return { token, expiresAt: raw ? Number(raw) : null };
  } catch {
    return null;
  }
}

/** True when a usable token is already stored (with at least a day left). */
export function hasFreshAppSession(): boolean {
  const s = readAppSession();
  if (!s) return false;
  if (!s.expiresAt) return true;
  return s.expiresAt * 1000 - Date.now() > 24 * 60 * 60 * 1000;
}

export function storeAppSession(token: string, expiresAt: number, user?: unknown) {
  try {
    localStorage.setItem(APP_JWT_KEY, token);
    localStorage.setItem(APP_JWT_EXPIRES_KEY, String(expiresAt));
    if (user) localStorage.setItem(APP_USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable (private mode) — apps will ask to sign in */
  }
}

export function clearAppSession() {
  try {
    localStorage.removeItem(APP_JWT_KEY);
    localStorage.removeItem(APP_JWT_EXPIRES_KEY);
    localStorage.removeItem(APP_USER_KEY);
  } catch {
    /* ignore */
  }
}
