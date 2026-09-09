// Embedded mode: this app's parent screens are shown INSIDE the hub's single
// dashboard (getsafefamily.com/dashboard/spark) in an iframe. In that mode the
// app must not draw its own header, switcher or sign-out — the shell has them
// — and anything that leaves the app (Stripe, OAuth, sign-out) must navigate
// the top window, not the frame. Opened directly, /spark/parent sends the
// parent to the one dashboard instead.
//
// Everything here is SSR-safe: on the server there is no window, so the app is
// treated as not embedded and no redirect fires until the client mounts.
import { useEffect, useState } from 'react';

export const HUB_DASHBOARD = '/dashboard/spark';

// Deliberately NOT remembered in sessionStorage: it is shared between the hub
// page and its same-origin iframes, so a remembered flag would leak into
// top-level navigation and defeat the redirect to the hub dashboard.
export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self !== window.top) return true;
    return new URLSearchParams(window.location.search).get('embed') === '1';
  } catch {
    return false;
  }
}

/** Under the hub the app's own parent area is not a destination of its own. */
export function shouldRedirectToHubDashboard(): boolean {
  return !isEmbedded();
}

export function topNavigate(url: string): void {
  if (typeof window === 'undefined') return;
  try { (window.top || window).location.href = url; } catch { window.location.href = url; }
}

/**
 * Client hook: false during SSR and the first client render (so server and
 * client markup match), then the real answer after mount.
 */
export function useEmbedded(): boolean {
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => { setEmbedded(isEmbedded()); }, []);
  return embedded;
}
