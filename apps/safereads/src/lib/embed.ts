// Embedded mode: SafeReads' parent screens are shown INSIDE the hub's single
// dashboard (getsafefamily.com/dashboard/reads) in a same-origin iframe. Not
// remembered in storage: sessionStorage is shared with the hub page itself, so a
// sticky flag would leak into top-level navigation and defeat the hub redirect. In
// that mode the app must not draw its own header, switcher or sign-out — the
// shell has them — and anything that leaves the app (Stripe, OAuth, sign-out)
// must navigate the top window, not the frame. Opened directly, /reads/dashboard
// sends the parent to the one dashboard instead: SafeReads always lives under
// the hub now. Every helper is SSR-safe (no window → not embedded).

import { useSyncExternalStore } from "react";

export const HUB_DASHBOARD = "/dashboard/reads";
export const HUB_PLAY = "/play/reads";

export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.self !== window.top) return true;
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
}

/** The app's own dashboard is not a destination any more — only the hub's is. */
export function shouldRedirectToHubDashboard(): boolean {
  if (typeof window === "undefined") return false;
  return !isEmbedded();
}

/** Navigate the top window (Stripe, Google OAuth and sign-out refuse to run in a frame). */
export function topNavigate(url: string): void {
  if (typeof window === "undefined") return;
  try {
    (window.top || window).location.href = url;
  } catch {
    window.location.href = url;
  }
}

/**
 * Kid deep link opened directly (not inside the hub's /play iframe) → the one
 * kid front door, family code carried along so the kid lands on their profiles.
 * Returns whether it redirected. Never fires when embedded or during SSR.
 */
export function redirectKidToHubPlay(familyCode?: string | null): boolean {
  if (!shouldRedirectToHubDashboard()) return false;
  const fc = (familyCode || "").toUpperCase();
  window.location.replace(fc ? `${HUB_PLAY}?fc=${encodeURIComponent(fc)}` : "/play");
  return true;
}

const noopSubscribe = () => () => {};
const serverSnapshot = () => false;

/** React hook form of isEmbedded(): false during SSR and hydration, then the real value. */
export function useIsEmbedded(): boolean {
  return useSyncExternalStore(noopSubscribe, isEmbedded, serverSnapshot);
}
