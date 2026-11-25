import type { NextConfig } from 'next';

// RETIRED (2026-11-25): SafeSpark is hidden from everyone. While true, every
// page on this app (any host, including getsafespark.com and the hub path
// /spark/*) redirects to the getsafefamily.com home page; only /api routes
// still answer. Code, Convex backend and data are untouched. To bring
// SafeSpark back: set this to false AND remove "safespark" from RETIRED_APPS
// in sites/marketing/src/lib/retiredApps.ts, then deploy both.
const RETIRED = true;

const nextConfig: NextConfig = {
  // One-site: served at getsafefamily.com/spark behind the hub's rewrite, prefix
  // intact. Keep in sync with APP_BASE in src/lib/appBase.ts. Next prefixes the
  // redirect sources/destinations below automatically.
  basePath: '/spark',
  // The hub rewrites /spark to <origin>/spark/ (trailing slash). Next's default
  // 308 back to /spark would loop through the hub, so serve both forms as-is.
  skipTrailingSlashRedirect: true,
  redirects: async () => RETIRED ? [
    { source: '/', destination: 'https://getsafefamily.com/' },
    {
      source: '/:path((?!api(?:/|$)|spark/api(?:/|$)).+)',
      destination: 'https://getsafefamily.com/',
    },
  ].map((r) => ({ ...r, permanent: false, basePath: false as const })) : [
    // Maker-route aliases — the canonical path is /make. /lumi was the
    // original codename, /demo was a guest-mode side door, /spark was
    // the earlier SafeSpark name. All keep working as bookmarks.
    { source: '/lumi', destination: '/make', permanent: false },
    { source: '/demo', destination: '/make', permanent: false },
    { source: '/spark', destination: '/make', permanent: false },
    // Old BELLA trainer paths — code stripped out of this repo (see the
    // archive/pre-trainer-strip git tag for a restore point). Anyone
    // following a stale bookmark lands on the homepage instead of a 404.
    { source: '/chat', destination: '/', permanent: false },
    { source: '/chat/:path*', destination: '/', permanent: false },
    // (formerly /learn and /learn/:path* — those redirected to / when
    // the old BELLA trainer was stripped. We now have a REAL /learn
    // training surface, so the redirects were swallowing it. Removed
    // 2026-05-29 — verified locally by `curl -L http://localhost:3010/learn/talking-to-spark`
    // hitting the lesson viewer instead of bouncing to /.)
    { source: '/literacy', destination: '/', permanent: false },
    { source: '/literacy/:path*', destination: '/', permanent: false },
    { source: '/journey', destination: '/', permanent: false },
    { source: '/studio', destination: '/', permanent: false },
    { source: '/apis', destination: '/', permanent: false },
    { source: '/build', destination: '/', permanent: false },
    { source: '/claim', destination: '/', permanent: false },
    // Old domain: getsafespark.com is retired in favour of
    // getsafefamily.com/spark. basePath:false so these match the raw request
    // path, and the host condition scopes them to the OLD domain only. The hub
    // proxies getsafefamily.com/spark/* here, possibly via this host, so
    // anything under /spark must NEVER redirect (it would loop through the hub)
    // — the negative lookahead below leaves /spark and /spark/* alone.
    ...['getsafespark.com', 'www.getsafespark.com'].flatMap((host) => [
      {
        source: '/',
        has: [{ type: 'host' as const, value: host }],
        destination: 'https://getsafefamily.com/spark',
        basePath: false as const,
        permanent: false,
      },
      {
        // Keep the path so old links (e.g. share pages /s/<id>) land on the
        // same page under the hub.
        source: '/:path((?!spark(?:/|$)).+)',
        has: [{ type: 'host' as const, value: host }],
        destination: 'https://getsafefamily.com/spark/:path',
        basePath: false as const,
        permanent: false,
      },
    ]),
  ],
};

export default nextConfig;
