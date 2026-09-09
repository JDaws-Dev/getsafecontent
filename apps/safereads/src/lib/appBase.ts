/**
 * One-site mount point. SafeReads is served at getsafefamily.com/reads (the hub
 * proxies /reads/* here with the prefix intact), so Next runs with
 * `basePath: '/reads'`. <Link>, router.push, redirect() and next/image add the
 * prefix themselves; anything that bypasses the router (plain <a>, fetch to
 * /api, window.location, /public asset URLs, Stripe return URLs) must go
 * through withBase().
 */
export const APP_BASE = "/reads";

export function withBase(path: string): string {
  if (!path.startsWith("/")) return `${APP_BASE}/${path}`;
  return `${APP_BASE}${path}`;
}
