// Where this app is mounted. '/tube' under getsafefamily.com (Vite `base`),
// '' when served from a domain root. Use for any link that bypasses the router
// (window.location, plain <a href>), which the router basename can't rewrite.
export const APP_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
export const withBase = (path) => `${APP_BASE}${path.startsWith('/') ? path : `/${path}`}`;
