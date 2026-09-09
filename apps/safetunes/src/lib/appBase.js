// Where this app is mounted. SafeTunes is DUAL-HOST: the shipped iPhone/Android
// app loads the ROOT of getsafetunes.com (and refuses any other host), while the
// one-site hub serves the same build at getsafefamily.com/tunes. Vite's `base`
// is fixed at '/tunes/' (assets always come from /tunes/assets on both hosts),
// but the router basename must follow the URL the page was actually opened at,
// so it is decided at runtime from the pathname rather than from BASE_URL.
// Use withBase() for any link that bypasses the router (window.location,
// plain <a href>, public-file src), which the router basename can't rewrite.
export const APP_BASE =
  typeof window !== 'undefined' &&
  (window.location.pathname === '/tunes' || window.location.pathname.startsWith('/tunes/'))
    ? '/tunes'
    : '';
export const withBase = (path) => `${APP_BASE}${path.startsWith('/') ? path : `/${path}`}`;
