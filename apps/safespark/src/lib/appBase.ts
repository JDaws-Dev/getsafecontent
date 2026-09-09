/**
 * One-site mount point. SafeSpark is served at getsafefamily.com/spark behind
 * the hub's rewrite, so the app is built with Next `basePath: '/spark'`
 * (see next.config.ts). Next's <Link>, router.push/replace, redirect() and
 * next/image add the prefix themselves; anything that bypasses Next — plain
 * <a href>, fetch('/api/…'), window.location, hand-built share URLs, files
 * in /public referenced by string — must go through withBase().
 *
 * Must match `basePath` in next.config.ts.
 */
export const APP_BASE = '/spark';

export function withBase(path: string): string {
  if (!path.startsWith('/')) return `${APP_BASE}/${path}`;
  if (path === APP_BASE || path.startsWith(`${APP_BASE}/`)) return path;
  return `${APP_BASE}${path}`;
}
