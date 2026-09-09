// Embedded mode: this app's parent screens are shown INSIDE the hub's single
// dashboard (getsafefamily.com/dashboard/study) in an iframe. In that mode the
// app must not draw its own header, switcher or sign-out — the shell has them
// — and anything that leaves the app (Stripe, sign-out) must navigate the top
// window, not the frame. Opened directly under the hub, /study/admin sends the
// parent to the one dashboard instead.
import { APP_BASE } from './appBase';

const KEY = 'safefamily_embed';
export const HUB_DASHBOARD = '/dashboard/study';

export function isEmbedded() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get('embed') === '1') { sessionStorage.setItem(KEY, '1'); return true; }
    if (p.get('embed') === '0') { sessionStorage.removeItem(KEY); return false; }
    if (window.self !== window.top) return true;
    return sessionStorage.getItem(KEY) === '1';
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
