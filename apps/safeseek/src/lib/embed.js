// Embedded mode: this app's parent screens are shown INSIDE the hub's single
// dashboard (getsafefamily.com/dashboard/study) in an iframe. In that mode the
// app must not draw its own header, switcher or sign-out — the shell has them
// — and anything that leaves the app (Stripe, sign-out) must navigate the top
// window, not the frame. Opened directly under the hub, /study/admin sends the
// parent to the one dashboard instead.
import { APP_BASE } from './appBase';

export const HUB_DASHBOARD = '/dashboard/study';
export const HUB_PLAY = '/play/study';

// Embedded = actually inside a frame (the hub's dashboard/play tabs), or an
// explicit ?embed=1 on this page. Deliberately NOT remembered in storage:
// sessionStorage is shared between the hub page and its same-origin iframes,
// so a remembered flag leaked into top-level navigation and stopped the
// deep-link redirect from firing.
export function isEmbedded() {
  try {
    if (window.self !== window.top) return true;
    return new URLSearchParams(window.location.search).get('embed') === '1';
  } catch {
    return false;
  }
}

/** Under the hub (not the old product domain) the app's own admin is not a destination. */
export function shouldRedirectToHubDashboard() {
  return !isEmbedded() && APP_BASE !== '';
}

export function topNavigate(url) {
  try { (window.top || window).location.href = url; } catch { window.location.href = url; }
}

/** Kid deep link under the hub (not embedded) → the one kid front door, code carried along. */
export function redirectKidToHubPlay(familyCode) {
  if (!shouldRedirectToHubDashboard()) return false;
  const fc = (familyCode || '').toUpperCase();
  window.location.replace(fc ? `${HUB_PLAY}?fc=${encodeURIComponent(fc)}` : '/play');
  return true;
}
